import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { User, UserRole } from './entities/user.entity';
import { Employee } from '../employees/entities/employee.entity';
import { ConfigService } from '@nestjs/config';

// ── Repository mock factory ───────────────────────────────────────────────────

function mockRepo<T>(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    findOne:  jest.fn(),
    find:     jest.fn(),
    create:   jest.fn((dto: Partial<T>) => ({ ...dto })),
    save:     jest.fn(async (e: T) => e),
    update:   jest.fn().mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] }),
    ...overrides,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function makeUser(overrides: Partial<User> = {}): Promise<User> {
  const password = await bcrypt.hash('secret123', 10);
  return {
    id:           'user-uuid-1',
    email:        'test@example.com',
    password,
    role:         UserRole.USER,
    tenantId:     'tenant-uuid-1',
    sessionToken: 'old-session',
    refreshToken: null,
    isActive:     true,
    createdAt:    new Date(),
    updatedAt:    new Date(),
    ...overrides,
  } as User;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let userRepo:     ReturnType<typeof mockRepo<User>>;
  let employeeRepo: ReturnType<typeof mockRepo<Employee>>;
  let jwtService:   { signAsync: jest.Mock };

  beforeEach(async () => {
    userRepo     = mockRepo<User>();
    employeeRepo = mockRepo<Employee>();
    jwtService   = { signAsync: jest.fn().mockResolvedValue('mock.jwt.token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User),     useValue: userRepo     },
        { provide: getRepositoryToken(Employee), useValue: employeeRepo },
        { provide: JwtService,                   useValue: jwtService   },
        {
          provide: ConfigService,
          useValue: { get: (key: string) => key === 'JWT_SECRET' ? 'test-secret' : null },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ── register ────────────────────────────────────────────────────────────────

  describe('register', () => {
    it("email allaqachon mavjud bo'lsa ConflictException tashlaydi", async () => {
      userRepo.findOne.mockResolvedValue(await makeUser());
      await expect(
        service.register({ email: 'test@example.com', password: 'abc123', role: UserRole.USER }),
      ).rejects.toThrow(ConflictException);
    });

    it("yangi foydalanuvchi yaratib access/refresh token qaytaradi", async () => {
      userRepo.findOne.mockResolvedValue(null);
      userRepo.save.mockImplementation(async (u: User) => ({ ...u, id: 'new-uuid' }));

      const result = await service.register({
        email:    'new@example.com',
        password: 'abc123',
        role:     UserRole.USER,
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      // save called once for user creation; refreshToken saved via update
      expect(userRepo.save).toHaveBeenCalledTimes(1);
      expect(userRepo.update).toHaveBeenCalled();
    });
  });

  // ── login ───────────────────────────────────────────────────────────────────

  describe('login', () => {
    it("to'g'ri parol bilan token qaytaradi", async () => {
      const user = await makeUser();
      userRepo.findOne.mockResolvedValue(user);
      // update must return UpdateResult shape for saveRefreshToken check

      const result = await service.login({ email: 'test@example.com', password: 'secret123' });
      expect(result.accessToken).toBeDefined();
      expect(userRepo.update).toHaveBeenCalledWith(
        user.id,
        expect.objectContaining({ sessionToken: expect.any(String) }),
      );
    });

    it("noto'g'ri parol bilan UnauthorizedException tashlaydi", async () => {
      const user = await makeUser();
      userRepo.findOne.mockResolvedValue(user);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("mavjud bo'lmagan email bilan UnauthorizedException tashlaydi", async () => {
      userRepo.findOne.mockResolvedValue(null);
      employeeRepo.findOne.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'any' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── logout ──────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it("sessionToken va refreshToken ni null qiladi", async () => {
      // logout first tries findOne — return a user so it goes the user path
      userRepo.findOne.mockResolvedValue({ id: 'user-uuid-1' });
      await service.logout('user-uuid-1');
      expect(userRepo.update).toHaveBeenCalledWith('user-uuid-1', {
        refreshToken: null,
        sessionToken: null,
      });
    });
  });
});
