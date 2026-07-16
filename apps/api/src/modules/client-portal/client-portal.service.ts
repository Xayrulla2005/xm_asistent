import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Repository } from 'typeorm';
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

@Injectable()
export class ClientPortalService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
    @InjectRepository(Debt)
    private readonly debtRepo: Repository<Debt>,
    @InjectRepository(Promotion)
    private readonly promoRepo: Repository<Promotion>,
    @InjectRepository(Announcement)
    private readonly annRepo: Repository<Announcement>,
    @InjectRepository(WizardConfig)
    private readonly wizardRepo: Repository<WizardConfig>,
    @InjectRepository(BeautyAppointment)
    private readonly beautyApptRepo: Repository<BeautyAppointment>,
    @InjectRepository(BeautyCatalog)
    private readonly beautyCatalogRepo: Repository<BeautyCatalog>,
    @InjectRepository(GymMember)
    private readonly gymMemberRepo: Repository<GymMember>,
    @InjectRepository(GymPlan)
    private readonly gymPlanRepo: Repository<GymPlan>,
    @InjectRepository(GymCheckIn)
    private readonly gymCheckinRepo: Repository<GymCheckIn>,
    @InjectRepository(Patient)
    private readonly clinicPatientRepo: Repository<Patient>,
    @InjectRepository(ClinicAppointment)
    private readonly clinicApptRepo: Repository<ClinicAppointment>,
    @InjectRepository(Prescription)
    private readonly prescriptionRepo: Repository<Prescription>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ── Public ────────────────────────────────────────────────────────────────────

  async getPublicPage(slug: string) {
    const tenant = await this.tenantRepo.findOne({ where: { slug, isActive: true } });
    if (!tenant) throw new NotFoundException('Portal topilmadi');

    const [promos, announcements, wizard] = await Promise.all([
      this.promoRepo.find({
        where: { tenantId: tenant.id, isActive: true },
        order: { createdAt: 'DESC' },
      }),
      this.annRepo.find({
        where: { tenantId: tenant.id, isActive: true },
        order: { createdAt: 'DESC' },
      }),
      this.wizardRepo.findOne({ where: { tenantId: tenant.id } }),
    ]);

    return {
      tenant: {
        id:           tenant.id,
        name:         tenant.name,
        slug:         tenant.slug,
        industry:     wizard?.industry ?? null,
        primaryColor: wizard?.theme?.primaryColor ?? null,
        logo:         wizard?.logoUrl ?? wizard?.theme?.logo ?? null,
        phone:        wizard?.companyPhone ?? wizard?.theme?.phone ?? null,
        address:      wizard?.companyAddress ?? null,
      },
      promos,
      announcements,
    };
  }

  // ── Industry-specific public data ─────────────────────────────────────────────

  async getPublicServiceCatalog(slug: string) {
    const tenant = await this.tenantRepo.findOne({ where: { slug, isActive: true } });
    if (!tenant) throw new NotFoundException('Portal topilmadi');
    return this.beautyCatalogRepo.find({
      where: { tenantId: tenant.id, isActive: true },
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  async getGymPublicPlans(slug: string) {
    const tenant = await this.tenantRepo.findOne({ where: { slug, isActive: true } });
    if (!tenant) throw new NotFoundException('Portal topilmadi');
    return this.gymPlanRepo.find({
      where: { tenantId: tenant.id, isActive: true },
      order: { price: 'ASC' },
    });
  }

  // ── Industry-specific account data ────────────────────────────────────────────

  async getBeautyAppointments(customerId: string, tenantId: string) {
    const customer = await this.customerRepo.findOne({ where: { id: customerId, tenantId } });
    if (!customer) throw new NotFoundException('Mijoz topilmadi');
    return this.beautyApptRepo.find({
      where: { tenantId, clientPhone: customer.phone },
      order: { date: 'DESC', timeSlot: 'DESC' },
      take: 50,
    });
  }

  async getGymMembership(customerId: string, tenantId: string) {
    const customer = await this.customerRepo.findOne({ where: { id: customerId, tenantId } });
    if (!customer) throw new NotFoundException('Mijoz topilmadi');

    const member = await this.gymMemberRepo.findOne({
      where: { tenantId, phone: customer.phone },
    });
    if (!member) return { member: null, recentCheckins: [], plan: null };

    const [recentCheckins, plan] = await Promise.all([
      this.gymCheckinRepo.find({
        where: { tenantId, memberId: member.id },
        order: { checkedAt: 'DESC' },
        take: 30,
      }),
      member.planId
        ? this.gymPlanRepo.findOne({ where: { id: member.planId, tenantId } })
        : Promise.resolve(null),
    ]);

    return { member, recentCheckins, plan };
  }

  async getClinicData(customerId: string, tenantId: string) {
    const customer = await this.customerRepo.findOne({ where: { id: customerId, tenantId } });
    if (!customer) throw new NotFoundException('Mijoz topilmadi');

    const patient = await this.clinicPatientRepo.findOne({
      where: { tenantId, phone: customer.phone },
    });
    if (!patient) return { patient: null, appointments: [], prescriptions: [] };

    const [appointments, prescriptions] = await Promise.all([
      this.clinicApptRepo.find({
        where: { tenantId, patientId: patient.id },
        order: { date: 'DESC', time: 'DESC' },
        take: 50,
      }),
      this.prescriptionRepo.find({
        where: { tenantId, patientId: patient.id },
        order: { date: 'DESC' },
        take: 30,
      }),
    ]);

    return { patient, appointments, prescriptions };
  }

  async customerLogin(slug: string, phone: string, password: string) {
    const tenant = await this.tenantRepo.findOne({ where: { slug, isActive: true } });
    if (!tenant) throw new NotFoundException('Portal topilmadi');

    // Explicitly select password (it has select: false)
    const customer = await this.customerRepo
      .createQueryBuilder('c')
      .addSelect('c.password')
      .where('c.tenantId = :tenantId AND c.phone = :phone', {
        tenantId: tenant.id,
        phone,
      })
      .getOne();

    if (!customer || !customer.portalEnabled || !customer.password) {
      throw new UnauthorizedException(
        "Kirish ruxsati yo'q. CRM admin bilan bog'laning.",
      );
    }

    const valid = await bcrypt.compare(password, customer.password);
    if (!valid) throw new UnauthorizedException("Telefon yoki parol noto'g'ri");

    const sessionToken = uuidv4();
    await this.customerRepo.update(customer.id, { sessionToken });

    const payload = {
      sub:      customer.id,
      type:     'customer',
      tenantId: customer.tenantId,
      slug,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accessToken = await this.jwtService.signAsync(payload as any, {
      secret:    this.config.get<string>('JWT_CUSTOMER_SECRET') ?? this.config.get<string>('JWT_SECRET'),
      expiresIn: '30d' as any,
    });

    return {
      accessToken,
      customer: {
        id:        customer.id,
        name:      customer.name,
        phone:     customer.phone,
        address:   customer.address,
        tenantId:  customer.tenantId,
        totalDebt: Number(customer.totalDebt),
      },
    };
  }

  // ── Customer account ─────────────────────────────────────────────────────────

  async getProfile(customerId: string) {
    const c = await this.customerRepo.findOne({ where: { id: customerId } });
    if (!c) throw new NotFoundException('Mijoz topilmadi');
    return {
      id:        c.id,
      name:      c.name,
      phone:     c.phone,
      address:   c.address,
      totalDebt: Number(c.totalDebt),
      createdAt: c.createdAt,
    };
  }

  async updateProfile(customerId: string, dto: { name?: string; address?: string }) {
    const c = await this.customerRepo.findOne({ where: { id: customerId } });
    if (!c) throw new NotFoundException('Mijoz topilmadi');
    if (dto.name)              c.name    = dto.name;
    if (dto.address !== undefined) c.address = dto.address;
    const saved = await this.customerRepo.save(c);
    return {
      id: saved.id, name: saved.name, phone: saved.phone,
      address: saved.address, totalDebt: Number(saved.totalDebt),
    };
  }

  getPurchases(customerId: string, tenantId: string) {
    return this.saleRepo.find({
      where:  { tenantId, customerId },
      order:  { createdAt: 'DESC' },
    });
  }

  getDebts(customerId: string, tenantId: string) {
    return this.debtRepo.find({
      where:  { tenantId, customerId },
      order:  { createdAt: 'DESC' },
    });
  }

  // ── Admin: customer portal access ────────────────────────────────────────────

  async setPortalAccess(customerId: string, tenantId: string, password: string, enabled: boolean) {
    const c = await this.customerRepo.findOne({ where: { id: customerId, tenantId } });
    if (!c) throw new NotFoundException('Mijoz topilmadi');
    const hashed = await bcrypt.hash(password, 10);
    await this.customerRepo.update({ id: customerId, tenantId }, {
      password:      hashed,
      portalEnabled: enabled,
    });
    return { success: true, name: c.name };
  }

  async disablePortalAccess(customerId: string, tenantId: string) {
    const exists = await this.customerRepo.findOne({ where: { id: customerId, tenantId } });
    if (!exists) throw new NotFoundException('Mijoz topilmadi');
    await this.customerRepo.update({ id: customerId, tenantId }, { portalEnabled: false });
    return { success: true };
  }

  // ── Admin: promotions ─────────────────────────────────────────────────────────

  getPromotions(tenantId: string) {
    return this.promoRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  createPromotion(
    tenantId: string,
    dto: { title: string; description?: string; validUntil?: string },
  ) {
    const promo = this.promoRepo.create({
      tenantId,
      title:       dto.title,
      description: dto.description ?? null,
      validUntil:  dto.validUntil ? new Date(dto.validUntil) : null,
    });
    return this.promoRepo.save(promo);
  }

  async updatePromotion(
    id: string,
    tenantId: string,
    dto: Partial<{ title: string; description: string; isActive: boolean; validUntil: string }>,
  ) {
    const promo = await this.promoRepo.findOne({ where: { id, tenantId } });
    if (!promo) throw new NotFoundException('Reklama topilmadi');
    if (dto.title       !== undefined) promo.title       = dto.title;
    if (dto.description !== undefined) promo.description = dto.description;
    if (dto.isActive    !== undefined) promo.isActive    = dto.isActive;
    if (dto.validUntil  !== undefined) {
      promo.validUntil = dto.validUntil ? new Date(dto.validUntil) : null;
    }
    return this.promoRepo.save(promo);
  }

  async deletePromotion(id: string, tenantId: string) {
    const exists = await this.promoRepo.findOne({ where: { id, tenantId } });
    if (!exists) throw new NotFoundException('Reklama topilmadi');
    return this.promoRepo.delete({ id, tenantId });
  }

  // ── Admin: announcements ─────────────────────────────────────────────────────

  getAnnouncements(tenantId: string) {
    return this.annRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  createAnnouncement(tenantId: string, dto: { title: string; body?: string }) {
    const ann = this.annRepo.create({
      tenantId,
      title: dto.title,
      body:  dto.body ?? null,
    });
    return this.annRepo.save(ann);
  }

  async updateAnnouncement(
    id: string,
    tenantId: string,
    dto: Partial<{ title: string; body: string; isActive: boolean }>,
  ) {
    const ann = await this.annRepo.findOne({ where: { id, tenantId } });
    if (!ann) throw new NotFoundException('Yangilik topilmadi');
    Object.assign(ann, dto);
    return this.annRepo.save(ann);
  }

  async deleteAnnouncement(id: string, tenantId: string) {
    const exists = await this.annRepo.findOne({ where: { id, tenantId } });
    if (!exists) throw new NotFoundException('Yangilik topilmadi');
    return this.annRepo.delete({ id, tenantId });
  }
}
