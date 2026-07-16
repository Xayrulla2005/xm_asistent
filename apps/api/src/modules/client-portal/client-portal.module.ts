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
import { CustomerJwtStrategy } from './strategies/customer-jwt.strategy';
import { ClientPortalService } from './client-portal.service';
import { ClientPortalPublicController } from './client-portal-public.controller';
import { ClientPortalAccountController } from './client-portal-account.controller';
import { ClientPortalAdminController } from './client-portal-admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, Tenant, Sale, Debt, Promotion, Announcement]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports:    [ConfigModule],
      inject:     [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret:       config.get<string>('JWT_SECRET'),
        signOptions:  { expiresIn: '30d' },
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
