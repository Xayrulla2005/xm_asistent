import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Sale } from '../sales/entities/sale.entity';
import { Debt } from '../debts/entities/debt.entity';
import { Promotion } from './entities/promotion.entity';
import { Announcement } from './entities/announcement.entity';
import { WizardConfig } from '../wizard/entities/wizard-config.entity';
import { BeautyAppointment } from '../beauty/entities/beauty-appointment.entity';
import { BeautyCatalog } from '../beauty/entities/beauty-catalog.entity';
import { GymMember } from '../gym/entities/gym-member.entity';
import { GymPlan } from '../gym/entities/gym-plan.entity';
import { GymCheckIn } from '../gym/entities/gym-checkin.entity';
import { Patient } from '../clinic/entities/patient.entity';
import { Appointment as ClinicAppointment } from '../clinic/entities/appointment.entity';
import { Prescription } from '../clinic/entities/prescription.entity';
import { CustomerJwtStrategy } from './strategies/customer-jwt.strategy';
import { ClientPortalService } from './client-portal.service';
import { ClientPortalPublicController } from './client-portal-public.controller';
import { ClientPortalAccountController } from './client-portal-account.controller';
import { ClientPortalAdminController } from './client-portal-admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer, Tenant, Sale, Debt, Promotion, Announcement,
      WizardConfig, BeautyAppointment, BeautyCatalog, GymMember, GymPlan, GymCheckIn,
      Patient, ClinicAppointment, Prescription,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports:    [ConfigModule],
      inject:     [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret:      config.get<string>('JWT_CUSTOMER_SECRET') ?? config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '30d' },
      }),
    }),
  ],
  providers:   [ClientPortalService, CustomerJwtStrategy],
  controllers: [
    ClientPortalAccountController,  // registered first — static /portal/account/* wins over /:slug
    ClientPortalAdminController,    // static /portal/admin/*
    ClientPortalPublicController,   // parameterized /portal/:slug last
  ],
})
export class ClientPortalModule {}
