import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { ClientPortalService } from '../client-portal.service';
import { Customer } from '../../customers/entities/customer.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Sale } from '../../sales/entities/sale.entity';
import { Debt } from '../../debts/entities/debt.entity';
import { Promotion } from '../entities/promotion.entity';
import { Announcement } from '../entities/announcement.entity';
import { WizardConfig } from '../../wizard/entities/wizard-config.entity';
import { BeautyAppointment } from '../../beauty/entities/beauty-appointment.entity';
import { BeautyCatalog } from '../../beauty/entities/beauty-catalog.entity';
import { GymMember } from '../../gym/entities/gym-member.entity';
import { GymPlan } from '../../gym/entities/gym-plan.entity';
import { GymCheckIn } from '../../gym/entities/gym-checkin.entity';
import { Patient } from '../../clinic/entities/patient.entity';
import { Appointment as ClinicAppointment } from '../../clinic/entities/appointment.entity';
import { Prescription } from '../../clinic/entities/prescription.entity';
import { ConfigService } from '@nestjs/config';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockRepo(overrides: Record<string, jest.Mock> = {}): any {
  return {
    findOne:           jest.fn(),
    findBy:            jest.fn(),
    find:              jest.fn(),
    create:            jest.fn((dto: object) => dto),
    save:              jest.fn(async (e: object) => e),
    update:            jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn().mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      where:     jest.fn().mockReturnThis(),
      getOne:    jest.fn().mockResolvedValue(null),
    }),
    ...overrides,
  };
}

const ALL_REPOS = [
  Customer, Tenant, Sale, Debt, Promotion, Announcement, WizardConfig,
  BeautyAppointment, BeautyCatalog, GymMember, GymPlan, GymCheckIn,
  Patient, ClinicAppointment, Prescription,
];

describe('ClientPortalService', () => {
  let service: ClientPortalService;
  const repos: Record<string, ReturnType<typeof mockRepo>> = {};

  beforeEach(async () => {
    ALL_REPOS.forEach((Entity) => {
      repos[Entity.name] = mockRepo();
    });

    const providers = ALL_REPOS.map((Entity) => ({
      provide:  getRepositoryToken(Entity),
      useValue: repos[Entity.name],
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientPortalService,
        ...providers,
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn().mockResolvedValue('portal.jwt') },
        },
        {
          provide: ConfigService,
          useValue: { get: () => 'test-secret' },
        },
      ],
    }).compile();

    service = module.get<ClientPortalService>(ClientPortalService);
  });

  // ── customerLogin ───────────────────────────────────────────────────────────

  describe('customerLogin', () => {
    const makeTenant = () => ({
      id: 'tenant-1', slug: 'my-shop', name: 'Test Shop', isActive: true,
    } as Tenant);

    async function makeCustomer() {
      const password = await bcrypt.hash('portal123', 10);
      return {
        id: 'cust-1', tenantId: 'tenant-1', phone: '+998901234567',
        name: 'Test User', address: null, totalDebt: 0,
        portalEnabled: true, password, sessionToken: null,
      } as unknown as Customer;
    }

    it("slug topilmasa NotFoundException tashlaydi", async () => {
      repos['Tenant'].findOne.mockResolvedValue(null);
      await expect(service.customerLogin('bad-slug', '+998901234567', 'pw'))
        .rejects.toThrow(NotFoundException);
    });

    it("portalEnabled false bo'lsa UnauthorizedException tashlaydi", async () => {
      repos['Tenant'].findOne.mockResolvedValue(makeTenant());
      const cust = await makeCustomer();
      cust.portalEnabled = false;
      repos['Customer'].createQueryBuilder.mockReturnValue({
        addSelect: jest.fn().mockReturnThis(),
        where:     jest.fn().mockReturnThis(),
        getOne:    jest.fn().mockResolvedValue(cust),
      });
      await expect(service.customerLogin('my-shop', '+998901234567', 'portal123'))
        .rejects.toThrow(UnauthorizedException);
    });

    it("to'g'ri ma'lumotlar bilan accessToken va customer qaytaradi", async () => {
      repos['Tenant'].findOne.mockResolvedValue(makeTenant());
      const cust = await makeCustomer();
      repos['Customer'].createQueryBuilder.mockReturnValue({
        addSelect: jest.fn().mockReturnThis(),
        where:     jest.fn().mockReturnThis(),
        getOne:    jest.fn().mockResolvedValue(cust),
      });

      const result = await service.customerLogin('my-shop', '+998901234567', 'portal123');
      expect(result.accessToken).toBeDefined();
      expect(result.customer.id).toBe('cust-1');
    });

    it("noto'g'ri parol bilan UnauthorizedException tashlaydi", async () => {
      repos['Tenant'].findOne.mockResolvedValue(makeTenant());
      const cust = await makeCustomer();
      repos['Customer'].createQueryBuilder.mockReturnValue({
        addSelect: jest.fn().mockReturnThis(),
        where:     jest.fn().mockReturnThis(),
        getOne:    jest.fn().mockResolvedValue(cust),
      });

      await expect(service.customerLogin('my-shop', '+998901234567', 'wrong-pass'))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  // ── Tenant isolation ─────────────────────────────────────────────────────────

  describe('Tenant isolation', () => {
    it("getProfile faqat o'z customerId bilan ishlaydi", async () => {
      repos['Customer'].findOne.mockResolvedValue({
        id: 'cust-1', tenantId: 'tenant-A', name: 'Ali', phone: '901',
        address: null, totalDebt: 0,
      } as unknown as Customer);

      const profile = await service.getProfile('cust-1');
      // repo.findOne called with the customerId — no cross-tenant leakage possible
      // because guard already validates tenant from JWT before reaching service
      expect(repos['Customer'].findOne).toHaveBeenCalledWith({ where: { id: 'cust-1' } });
      expect(profile.id).toBe('cust-1');
    });

    it("getPurchases tenantId'ni where shart sifatida uzatadi", async () => {
      repos['Sale'].find.mockResolvedValue([]);
      await service.getPurchases('cust-1', 'tenant-A');
      expect(repos['Sale'].find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 'tenant-A', customerId: 'cust-1' } }),
      );
    });

    it("getDebts tenantId'ni where shart sifatida uzatadi", async () => {
      repos['Debt'].find.mockResolvedValue([]);
      await service.getDebts('cust-1', 'tenant-B');
      expect(repos['Debt'].find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 'tenant-B', customerId: 'cust-1' } }),
      );
    });
  });

  // ── bookBeautyAppointment ────────────────────────────────────────────────────

  describe('bookBeautyAppointment', () => {
    const tenant = { id: 'tenant-1', slug: 'salon', isActive: true } as Tenant;

    it("vaqt band bo'lsa BadRequestException tashlaydi", async () => {
      repos['Tenant'].findOne.mockResolvedValue(tenant);
      repos['BeautyAppointment'].findOne.mockResolvedValue({ id: 'existing' });

      await expect(service.bookBeautyAppointment('salon', {
        clientName: 'Ali', clientPhone: '901', date: '2026-08-01', timeSlot: '10:00',
      })).rejects.toThrow('Bu vaqt uchun allaqachon navbat bor');
    });

    it("bo'sh vaqtda appointment yaratadi", async () => {
      repos['Tenant'].findOne.mockResolvedValue(tenant);
      repos['BeautyAppointment'].findOne.mockResolvedValue(null);
      repos['BeautyAppointment'].create.mockImplementation((dto: object) => dto);
      repos['BeautyAppointment'].save.mockResolvedValue({ id: 'new-appt', ...{} });

      const result = await service.bookBeautyAppointment('salon', {
        clientName: 'Ali', clientPhone: '901', date: '2026-08-01', timeSlot: '10:00',
      });
      expect(repos['BeautyAppointment'].save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
