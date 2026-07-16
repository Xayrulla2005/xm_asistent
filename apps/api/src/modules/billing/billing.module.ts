import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../tenants/entities/tenant.entity';
import { BillingController } from './billing.controller';
import { BillingWebhookController } from './billing-webhook.controller';
import { BillingService } from './billing.service';
import { PaymentHistory } from './entities/payment-history.entity';
import { Subscription } from './entities/subscription.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, PaymentHistory, Tenant]),
  ],
  controllers: [BillingController, BillingWebhookController],
  providers:   [BillingService],
  exports:     [BillingService],
})
export class BillingModule {}
