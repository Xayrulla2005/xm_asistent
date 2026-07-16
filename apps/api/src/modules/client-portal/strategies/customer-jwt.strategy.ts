import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';

interface CustomerJwtPayload {
  sub:      string;
  type:     string;
  tenantId: string;
}

@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(Strategy, 'customer-jwt') {
  constructor(
    config: ConfigService,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey:    (config.get<string>('JWT_CUSTOMER_SECRET') ?? config.get<string>('JWT_SECRET')) as string,
    });
  }

  async validate(payload: CustomerJwtPayload): Promise<Customer> {
    if (payload.type !== 'customer') throw new UnauthorizedException();
    const customer = await this.customerRepo.findOne({ where: { id: payload.sub } });
    if (!customer || !customer.portalEnabled) {
      throw new UnauthorizedException("Kirish ruxsati yo'q");
    }
    return customer;
  }
}
