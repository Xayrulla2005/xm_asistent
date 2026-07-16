import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../auth/entities/user.entity';
import { BillingController } from './billing.controller';
import { BillingWebhookController } from './billing-webhook.controller';
import { BillingService } from './billing.service';
import { BillingScheduleService } from './billing-schedule.service';
import { MailService } from './mail.service';
import { PaymentHistory } from './entities/payment-history.entity';
import { Subscription } from './entities/subscription.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, PaymentHistory, Tenant, User]),
  ],
  controllers: [BillingController, BillingWebhookController],
  providers:   [BillingService, BillingScheduleService, MailService],
  exports:     [BillingService, MailService],
})
export class BillingModule {}
