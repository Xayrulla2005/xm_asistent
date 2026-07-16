import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../employees/entities/employee.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { WizardConfig } from '../wizard/entities/wizard-config.entity';
import { Subscription } from '../billing/entities/subscription.entity';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { RequestTrackingMiddleware } from './analytics.middleware';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, Customer, Tenant, WizardConfig, Subscription]),
  ],
  controllers: [AnalyticsController],
  providers:   [AnalyticsService, RequestTrackingMiddleware],
  exports:     [AnalyticsService],
})
export class AnalyticsModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Track every API request for the requests/minute server metric
    consumer.apply(RequestTrackingMiddleware).forRoutes('*');
  }
}
