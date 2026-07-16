import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Repository } from 'typeorm';
import { OAuth2Client } from 'google-auth-library';
import { Employee } from '../employees/entities/employee.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User, UserRole } from './entities/user.entity';

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
    if (exists) throw new ConflictException("Bu email allaqachon ro'yxatdan o'tilgan. Iltimos, kirish sahifasiga o'ting.");

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
    await this.employeeRepo.update(employee.id, { sessionToken, lastLoginAt: new Date() });
    employee.sessionToken = sessionToken;

    const tokens = await this.issueEmployeeTokens(employee);
    const hashed = await bcrypt.hash(tokens.refreshToken, 10);
    await this.employeeRepo.update(employee.id, { refreshToken: hashed });
    return { ...tokens, sessionToken };
  }

  async refresh(user: User) {
    if ((user as any)._isEmployee) {
      const emp = user as unknown as Employee;
      const tokens = await this.issueEmployeeTokens(emp);
      const hashed = await bcrypt.hash(tokens.refreshToken, 10);
      await this.employeeRepo.update(emp.id, { refreshToken: hashed });
      return tokens;
    }
    const tokens = await this.issueTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user) {
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) throw new UnauthorizedException("Joriy parol noto'g'ri");
      const hashed = await bcrypt.hash(newPassword, 10);
      await this.userRepo.update(userId, { password: hashed });
      return { success: true };
    }
    const employee = await this.employeeRepo.findOne({ where: { id: userId } });
    if (!employee) throw new UnauthorizedException('Foydalanuvchi topilmadi');
    const valid = await bcrypt.compare(currentPassword, employee.password);
    if (!valid) throw new UnauthorizedException("Joriy parol noto'g'ri");
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.employeeRepo.update(userId, { password: hashed });
    return { success: true };
  }

  async logout(userId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user) {
      await this.userRepo.update(userId, { refreshToken: null, sessionToken: null });
    } else {
      await this.employeeRepo.update(userId, { refreshToken: null, sessionToken: null });
    }
  }

  async googleAuth(accessToken: string, password?: string): Promise<{
    accessToken:  string;
    refreshToken: string;
    user:         { id: string; email: string; role: string };
    googleId:     string;
    email:        string;
    firstName:    string | null;
    lastName:     string | null;
    isNewUser:    boolean;
  }> {
    // Verify access token via Google userinfo endpoint (implicit flow)
    let info: { sub: string; email?: string; given_name?: string; family_name?: string };
    try {
      // Use OAuth2Client.getTokenInfo to validate the token
      const client = new OAuth2Client();
      await client.getTokenInfo(accessToken); // throws if invalid
      const res = await globalThis.fetch(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) throw new Error('userinfo failed');
      info = await res.json() as typeof info;
    } catch {
      throw new UnauthorizedException("Google token noto'g'ri yoki muddati o'tgan");
    }

    const googleId  = info.sub;
    const email     = info.email ?? `google_${googleId}@google.local`;
    const firstName = info.given_name ?? null;
    const lastName  = info.family_name ?? null;

    let user = await this.userRepo.findOne({ where: { googleId } });
    const isNewUser = !user;

    if (!user) {
      // Existing email check
      const byEmail = await this.userRepo.findOne({ where: { email } });
      if (byEmail) {
        // Link Google ID to existing account and optionally set a real password
        byEmail.googleId = googleId;
        if (!byEmail.firstName) byEmail.firstName = firstName;
        if (!byEmail.lastName)  byEmail.lastName  = lastName;
        byEmail.sessionToken = uuidv4();
        if (password) byEmail.password = await bcrypt.hash(password, 10);
        user = await this.userRepo.save(byEmail);
      } else {
        const hashed = await bcrypt.hash(password ?? uuidv4(), 10);
        user = this.userRepo.create({
          email,
          password:  hashed,
          role:      UserRole.USER,
          googleId,
          firstName,
          lastName,
          isActive:  true,
          tenantId:  null,
          sessionToken: uuidv4(),
        });
        user = await this.userRepo.save(user);
      }
    } else {
      // User found by googleId — update sessionToken and password if provided
      const updates: Partial<User> = { sessionToken: uuidv4() };
      if (password) updates.password = await bcrypt.hash(password, 10);
      await this.userRepo.update(user.id, updates);
      Object.assign(user, updates);
    }

    const tokens = await this.issueTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    return { ...tokens, googleId, email, firstName, lastName, isNewUser };
  }

  async googleLoginOnly(accessToken: string): Promise<{
    accessToken: string; refreshToken: string; tenantId: string | null; needsWizard: boolean;
  }> {
    const result = await this.googleAuth(accessToken);
    const user   = await this.userRepo.findOne({ where: { id: result.user.id } });
    return {
      accessToken:  result.accessToken,
      refreshToken: result.refreshToken,
      tenantId:     user?.tenantId ?? null,
      needsWizard:  !user?.tenantId,
    };
  }

  async setUserTenant(userId: string, tenantId: string): Promise<void> {
    await this.userRepo.update(userId, { tenantId });
  }

  async getUserById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async reissueForUser(userId: string): Promise<{ accessToken: string; refreshToken: string; user: { id: string; email: string; role: string } }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Foydalanuvchi topilmadi');
    const sessionToken = uuidv4();
    await this.userRepo.update(userId, { sessionToken });
    user.sessionToken = sessionToken;
    const tokens = await this.issueTokens(user);
    await this.saveRefreshToken(userId, tokens.refreshToken);
    return tokens;
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.jwtService.signAsync(payload as any, {
        secret:    this.config.get<string>('JWT_SECRET'),
        expiresIn: (this.config.get<string>('JWT_EXPIRES_IN') ?? '15m') as any,
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.jwtService.signAsync(payload as any, {
        secret:    this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: (this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d') as any,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.jwtService.signAsync(payload as any, {
        secret:    this.config.get<string>('JWT_SECRET'),
        expiresIn: (this.config.get<string>('JWT_EXPIRES_IN') ?? '15m') as any,
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.jwtService.signAsync(payload as any, {
        secret:    this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: (this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d') as any,
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
