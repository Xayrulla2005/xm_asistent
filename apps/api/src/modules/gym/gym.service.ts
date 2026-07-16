import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Between } from 'typeorm';
import { GymMember } from './entities/gym-member.entity';
import { GymPlan } from './entities/gym-plan.entity';
import { GymCheckIn } from './entities/gym-checkin.entity';

@Injectable()
export class GymService {
  constructor(
    @InjectRepository(GymMember)  private memberRepo:  Repository<GymMember>,
    @InjectRepository(GymPlan)    private planRepo:    Repository<GymPlan>,
    @InjectRepository(GymCheckIn) private checkinRepo: Repository<GymCheckIn>,
  ) {}

  // ── Plans ──────────────────────────────────────────────────────────────────

  findPlans(tenantId: string) {
    return this.planRepo.find({ where: { tenantId }, order: { durationDays: 'ASC' } });
  }

  async findPlanById(tenantId: string, id: string) {
    const p = await this.planRepo.findOne({ where: { id, tenantId } });
    if (!p) throw new NotFoundException('Reja topilmadi');
    return p;
  }

  createPlan(tenantId: string, dto: Partial<GymPlan>) {
    return this.planRepo.save(this.planRepo.create({ ...dto, tenantId }));
  }

  async updatePlan(tenantId: string, id: string, dto: Partial<GymPlan>) {
    await this.findPlanById(tenantId, id);
    await this.planRepo.update({ id, tenantId }, dto);
    return this.findPlanById(tenantId, id);
  }

  async removePlan(tenantId: string, id: string) {
    await this.findPlanById(tenantId, id);
    await this.planRepo.delete({ id, tenantId });
    return { success: true };
  }

  // ── Members ────────────────────────────────────────────────────────────────

  findMembers(tenantId: string, search?: string, status?: string) {
    const where: Parameters<typeof this.memberRepo.find>[0]['where'] = search
      ? [
          { tenantId, firstName: ILike(`%${search}%`), ...(status ? { status } : {}) },
          { tenantId, lastName:  ILike(`%${search}%`), ...(status ? { status } : {}) },
          { tenantId, phone:     ILike(`%${search}%`), ...(status ? { status } : {}) },
        ]
      : status
        ? { tenantId, status }
        : { tenantId };
    return this.memberRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findMemberById(tenantId: string, id: string) {
    const m = await this.memberRepo.findOne({ where: { id, tenantId } });
    if (!m) throw new NotFoundException('A\'zo topilmadi');
    return m;
  }

  async createMember(tenantId: string, dto: Partial<GymMember>) {
    const member = this.memberRepo.create({ ...dto, tenantId, totalCheckins: 0 });

    // If planId given, copy plan name+price and compute expiresAt
    if (dto.planId) {
      const plan = await this.planRepo.findOne({ where: { id: dto.planId, tenantId } });
      if (plan) {
        member.planName  = plan.name;
        member.planPrice = plan.price;
        const joined = dto.joinedAt ? new Date(dto.joinedAt) : new Date();
        const exp    = new Date(joined);
        exp.setDate(exp.getDate() + plan.durationDays);
        member.expiresAt = exp.toISOString().slice(0, 10);
      }
    }
    return this.memberRepo.save(member);
  }

  async updateMember(tenantId: string, id: string, dto: Partial<GymMember>) {
    const existing = await this.findMemberById(tenantId, id);

    if (dto.planId && dto.planId !== existing.planId) {
      const plan = await this.planRepo.findOne({ where: { id: dto.planId, tenantId } });
      if (plan) {
        dto.planName  = plan.name;
        dto.planPrice = plan.price;
        const base = dto.joinedAt ? new Date(dto.joinedAt) : new Date();
        const exp  = new Date(base);
        exp.setDate(exp.getDate() + plan.durationDays);
        dto.expiresAt = exp.toISOString().slice(0, 10);
      }
    }

    await this.memberRepo.update({ id, tenantId }, dto);
    return this.findMemberById(tenantId, id);
  }

  async removeMember(tenantId: string, id: string) {
    await this.findMemberById(tenantId, id);
    await this.memberRepo.update({ id, tenantId }, { status: 'cancelled' });
    return { success: true };
  }

  async getMemberStats(tenantId: string) {
    const [all, active, expired, today] = await Promise.all([
      this.memberRepo.count({ where: { tenantId } }),
      this.memberRepo.count({ where: { tenantId, status: 'active' } }),
      this.memberRepo.count({ where: { tenantId, status: 'expired' } }),
      this.checkinRepo.count({
        where: {
          tenantId,
          checkedAt: Between(
            new Date(new Date().setHours(0, 0, 0, 0)),
            new Date(new Date().setHours(23, 59, 59, 999)),
          ),
        },
      }),
    ]);
    return { total: all, active, expired, todayCheckins: today };
  }

  // ── Check-ins ──────────────────────────────────────────────────────────────

  async findCheckins(tenantId: string, memberId?: string, date?: string) {
    const qb = this.checkinRepo.createQueryBuilder('c')
      .where('c.tenantId = :tenantId', { tenantId });

    if (memberId) qb.andWhere('c.memberId = :memberId', { memberId });

    if (date) {
      const start = new Date(date + 'T00:00:00');
      const end   = new Date(date + 'T23:59:59');
      qb.andWhere('c.checkedAt BETWEEN :start AND :end', { start, end });
    }

    return qb.orderBy('c.checkedAt', 'DESC').limit(200).getMany();
  }

  async checkIn(tenantId: string, memberId: string, note?: string) {
    const member = await this.findMemberById(tenantId, memberId);
    const checkin = await this.checkinRepo.save(
      this.checkinRepo.create({
        tenantId,
        memberId,
        memberName: `${member.firstName} ${member.lastName}`,
        note: note ?? null,
      }),
    );
    // Atomic increment — prevents lost update under concurrent check-ins
    await this.memberRepo.increment({ id: memberId, tenantId }, 'totalCheckins', 1);
    return checkin;
  }

  async syncExpiredMembers(tenantId: string) {
    const today = new Date().toISOString().slice(0, 10);
    await this.memberRepo
      .createQueryBuilder()
      .update(GymMember)
      .set({ status: 'expired' })
      .where('tenantId = :tenantId', { tenantId })
      .andWhere('status = :status', { status: 'active' })
      .andWhere('expiresAt < :today', { today })
      .execute();
    return { synced: true };
  }
}
