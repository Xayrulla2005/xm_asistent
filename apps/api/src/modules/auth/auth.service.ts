import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Repository } from 'typeorm';
import { Employee } from '../employees/entities/employee.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User } from './entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.userRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');

    const sessionToken = uuidv4();
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      email: dto.email,
      password: hashed,
      role: dto.role,
      tenantId: dto.tenantId ?? null,
      sessionToken,
    });
    await this.userRepo.save(user);

    const tokens = await this.issueTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    return { ...tokens, sessionToken };
  }

  async login(dto: LoginDto) {
    // Try users table first, then employees
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (user) {
      const valid = await bcrypt.compare(dto.password, user.password);
      if (!valid) throw new UnauthorizedException('Invalid credentials');
      const sessionToken = uuidv4();
      await this.userRepo.update(user.id, { sessionToken });
      user.sessionToken = sessionToken;
      const tokens = await this.issueTokens(user);
      await this.saveRefreshToken(user.id, tokens.refreshToken);
      return { ...tokens, sessionToken };
    }

    const employee = await this.employeeRepo.findOne({ where: { email: dto.email } });
    if (!employee) throw new UnauthorizedException('Invalid credentials');
    if (!employee.isActive) throw new UnauthorizedException('Hisobingiz bloklangan');

    const valid = await bcrypt.compare(dto.password, employee.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const sessionToken = uuidv4();
    await this.employeeRepo.update(employee.id, { sessionToken });
    employee.sessionToken = sessionToken;

    const tokens = await this.issueEmployeeTokens(employee);
    const hashed = await bcrypt.hash(tokens.refreshToken, 10);
    await this.employeeRepo.update(employee.id, { refreshToken: hashed });
    return { ...tokens, sessionToken };
  }

  async refresh(user: User) {
    const tokens = await this.issueTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.userRepo.update(userId, { refreshToken: null, sessionToken: null });
    await this.employeeRepo.update(userId, { refreshToken: null, sessionToken: null });
  }

  private async issueTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId ?? null,
      sessionToken: user.sessionToken ?? null,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('JWT_SECRET'),
        expiresIn: this.config.get<string>('JWT_EXPIRES_IN') ?? '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  private async issueEmployeeTokens(emp: Employee) {
    const payload = {
      sub: emp.id,
      email: emp.email,
      role: emp.role,
      tenantId: emp.tenantId,
      sessionToken: emp.sessionToken ?? null,
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('JWT_SECRET'),
        expiresIn: this.config.get<string>('JWT_EXPIRES_IN') ?? '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d',
      }),
    ]);
    return {
      accessToken, refreshToken,
      user: { id: emp.id, email: emp.email, role: emp.role, tenantId: emp.tenantId },
    };
  }

  private async saveRefreshToken(userId: string, token: string): Promise<void> {
    const hashed = await bcrypt.hash(token, 10);
    await this.userRepo.update(userId, { refreshToken: hashed });
  }
}
