import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';
import { User } from '../entities/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tenantId: string | null;
  sessionToken: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_SECRET') as string,
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload): Promise<User | Employee> {
    // Try users table first
    let entity: User | Employee | null = await this.userRepo.findOne({ where: { id: payload.sub } });

    // Fall back to employees table
    if (!entity) {
      entity = await this.employeeRepo.findOne({ where: { id: payload.sub } });
    }

    if (!entity) throw new UnauthorizedException();

    if (entity.sessionToken !== payload.sessionToken) {
      throw new UnauthorizedException('Session expired. Logged in from another device.');
    }

    return entity;
  }
}
