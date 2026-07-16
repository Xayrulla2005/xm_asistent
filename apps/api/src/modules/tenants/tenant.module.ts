import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { GeneratedCrm } from '../crm-engine/entities/generated-crm.entity';
import { Customer } from '../customers/entities/customer.entity';
import { OtpModule } from '../otp/otp.module';
import { Product } from '../products/entities/product.entity';
import { Sale } from '../sales/entities/sale.entity';
import { WizardConfig } from '../wizard/entities/wizard-config.entity';
import { Tenant } from './entities/tenant.entity';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, WizardConfig, GeneratedCrm, Sale, Product, Customer]),
    AuthModule,
    OtpModule,
  ],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantModule {}
