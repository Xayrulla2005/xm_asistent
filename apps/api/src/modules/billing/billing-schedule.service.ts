import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../auth/entities/user.entity';
import { SubStatus } from './entities/subscription.entity';
import { Subscription } from './entities/subscription.entity';
import { MailService } from './mail.service';

@Injectable()
export class BillingScheduleService {
  private readonly log = new Logger(BillingScheduleService.name);

  constructor(
    @InjectRepository(Subscription) private readonly subRepo:    Repository<Subscription>,
    @InjectRepository(Tenant)       private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(User)         private readonly userRepo:   Repository<User>,
    private readonly mail: MailService,
  ) {}

  // Runs daily at 00:05 — suspend trials that have expired
  @Cron('5 0 * * *')
  async suspendExpiredTrials(): Promise<void> {
    const now = new Date();
    const expired = await this.subRepo.find({
      where: { status: SubStatus.TRIAL, trialEndsAt: LessThan(now) },
    });

    for (const sub of expired) {
      sub.status = SubStatus.SUSPENDED;
      await this.subRepo.save(sub);
      this.log.warn(`Trial expired — suspended tenant ${sub.tenantId}`);

      await this.notifyOwner(sub.tenantId, 'trial_expired');
    }

    if (expired.length) {
      this.log.log(`Suspended ${expired.length} expired trial(s)`);
    }
  }

  // Runs daily at 00:10 — suspend active subscriptions with overdue payment
  @Cron('10 0 * * *')
  async suspendOverduePayments(): Promise<void> {
    const now = new Date();
    const overdue = await this.subRepo.find({
      where: { status: SubStatus.ACTIVE, nextPaymentAt: LessThan(now) },
    });

    // Grace period: suspend only after 7 days past due
    const GRACE_MS = 7 * 86_400_000;
    for (const sub of overdue) {
      if (!sub.nextPaymentAt) continue;
      const pastDue = now.getTime() - new Date(sub.nextPaymentAt).getTime();
      if (pastDue < GRACE_MS) continue;

      sub.status = SubStatus.SUSPENDED;
      await this.subRepo.save(sub);
      this.log.warn(`Payment overdue >7 days — suspended tenant ${sub.tenantId}`);

      await this.notifyOwner(sub.tenantId, 'payment_overdue');
    }
  }

  // Runs daily at 09:00 — warn tenants whose trial ends in 3 days
  @Cron('0 9 * * *')
  async warnTrialEnding(): Promise<void> {
    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 86_400_000);

    const subs = await this.subRepo.find({ where: { status: SubStatus.TRIAL } });
    for (const sub of subs) {
      if (!sub.trialEndsAt) continue;
      const endsAt = new Date(sub.trialEndsAt);
      // Only warn if expiry is within the next 3 days (and not already past)
      if (endsAt > now && endsAt <= in3Days) {
        const daysLeft = Math.ceil((endsAt.getTime() - now.getTime()) / 86_400_000);
        await this.notifyOwner(sub.tenantId, 'trial_ending_soon', { daysLeft });
      }
    }
  }

  // Runs daily at 09:05 — warn tenants whose payment is due in 3 days
  @Cron('5 9 * * *')
  async warnPaymentDue(): Promise<void> {
    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 86_400_000);

    const subs = await this.subRepo.find({ where: { status: SubStatus.ACTIVE } });
    for (const sub of subs) {
      if (!sub.nextPaymentAt) continue;
      const dueAt = new Date(sub.nextPaymentAt);
      if (dueAt > now && dueAt <= in3Days) {
        await this.notifyOwner(sub.tenantId, 'payment_due_soon', { amount: sub.priceUzs });
      }
    }
  }

  private async notifyOwner(
    tenantId: string,
    event: 'trial_expired' | 'trial_ending_soon' | 'payment_overdue' | 'payment_due_soon',
    extra?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
      if (!tenant) return;

      const owner = await this.userRepo.findOne({ where: { id: tenant.ownerId } });
      if (!owner?.email) return;

      await this.mail.sendBillingNotification(owner.email, tenant.name, event, extra);
    } catch (err) {
      this.log.error(`Failed to notify owner of tenant ${tenantId}: ${err}`);
    }
  }
}
