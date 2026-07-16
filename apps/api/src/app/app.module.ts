import * as path from 'path';
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '../modules/auth/auth.module';
import { TenantModule } from '../modules/tenants/tenant.module';
import { WizardModule } from '../modules/wizard/wizard.module';
import { ProductsModule } from '../modules/products/products.module';
import { SalesModule } from '../modules/sales/sales.module';
import { CustomersModule } from '../modules/customers/customers.module';
import { PaymentsModule } from '../modules/payments/payments.module';
import { WarehouseModule } from '../modules/warehouse/warehouse.module';
import { CrmEngineModule } from '../modules/crm-engine/crm-engine.module';
import { DashboardModule } from '../modules/dashboard/dashboard.module';
import { EmployeesModule } from '../modules/employees/employees.module';
import { UploadModule } from '../modules/upload/upload.module';
import { BugsModule } from '../modules/bugs/bugs.module';
import { AnalyticsModule } from '../modules/analytics/analytics.module';
import { BillingModule } from '../modules/billing/billing.module';
import { OtpModule } from '../modules/otp/otp.module';
import { DebtsModule } from '../modules/debts/debts.module';
import { BranchesModule } from '../modules/branches/branches.module';
import { AuditModule } from '../modules/audit/audit.module';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { ClientPortalModule } from '../modules/client-portal/client-portal.module';
import { ClinicModule } from '../modules/clinic/clinic.module';
import { EducationModule } from '../modules/education/education.module';
import { RestaurantModule } from '../modules/restaurant/restaurant.module';
import { GymModule } from '../modules/gym/gym.module';
import { BeautyModule } from '../modules/beauty/beauty.module';
import { AutoModule } from '../modules/auto/auto.module';
import { RedisModule } from '../modules/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.join(process.cwd(), 'apps/api/.env'),
        path.join(__dirname, '../../../.env'),
        '.env',
      ],
    }),

    // Rate limiting: 100 req / 60s per IP globally
    ThrottlerModule.forRoot([{
      ttl:   60_000,
      limit: 100,
    }]),

    // Cron / scheduled tasks
    ScheduleModule.forRoot(),

    // PostgreSQL ulanish
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get('DB_USER'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),
        autoLoadEntities: true,
        synchronize: false,
        logging: false,
        migrations: ['dist/migrations/*.js'],
      }),
    }),
    RedisModule,
    AuthModule,
    TenantModule,
    WizardModule,
    ProductsModule,
    SalesModule,
    CustomersModule,
    PaymentsModule,
    WarehouseModule,
    CrmEngineModule,
    DashboardModule,
    EmployeesModule,
    UploadModule,
    BugsModule,
    AnalyticsModule,
    BillingModule,
    OtpModule,
    DebtsModule,
    BranchesModule,
    AuditModule,
    ClientPortalModule,
    ClinicModule,
    EducationModule,
    RestaurantModule,
    GymModule,
    BeautyModule,
    AutoModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}