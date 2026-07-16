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
  // 10-second TTL cache — reduces 1-2 DB queries per request to ~0
  private readonly sessionCache = new Map<string, { entity: User | Employee; exp: number }>();
  private readonly CACHE_TTL = 10_000;

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
    const cacheKey = `${payload.sub}:${payload.sessionToken}`;

    const cached = this.sessionCache.get(cacheKey);
    if (cached && Date.now() < cached.exp) return cached.entity;

    let entity: User | Employee | null = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!entity) {
      entity = await this.employeeRepo.findOne({ where: { id: payload.sub } });
    }

    if (!entity) throw new UnauthorizedException();

    if (entity.sessionToken !== payload.sessionToken) {
      throw new UnauthorizedException('Session expired. Logged in from another device.');
    }

    this.sessionCache.set(cacheKey, { entity, exp: Date.now() + this.CACHE_TTL });

    // Prune stale entries when cache grows large
    if (this.sessionCache.size > 500) {
      const now = Date.now();
      for (const [k, v] of this.sessionCache) {
        if (now > v.exp) this.sessionCache.delete(k);
      }
    }

    return entity;
  }
}
