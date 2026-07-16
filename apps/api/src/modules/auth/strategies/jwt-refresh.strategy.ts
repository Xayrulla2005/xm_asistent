import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    config: ConfigService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      secretOrKey: config.get<string>('JWT_REFRESH_SECRET') as string,
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<User> {
    const refreshToken = req.body?.refreshToken as string;

    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (user) {
      if (!user.refreshToken) throw new UnauthorizedException();
      const matches = await bcrypt.compare(refreshToken, user.refreshToken);
      if (!matches) throw new UnauthorizedException();
      return user;
    }

    const employee = await this.employeeRepo.findOne({ where: { id: payload.sub } });
    if (employee) {
      if (!employee.refreshToken) throw new UnauthorizedException();
      const matches = await bcrypt.compare(refreshToken, employee.refreshToken);
      if (!matches) throw new UnauthorizedException();
      (employee as any)._isEmployee = true;
      return employee as unknown as User;
    }

    throw new UnauthorizedException();
  }
}
