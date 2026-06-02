import * as path from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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
        synchronize: true,
        logging: true,
      }),
    }),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}