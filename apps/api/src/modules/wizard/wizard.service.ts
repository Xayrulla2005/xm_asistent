import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigureWizardDto } from './dto/configure-wizard.dto';
import { UpdateWizardDto } from './dto/update-wizard.dto';
import { Industry, WizardConfig, WizardStatus } from './entities/wizard-config.entity';

// ─── Industry default modules and roles ───────────────────────────────────────

export interface IndustryDefaults {
  modules: string[];
  roles:   string[];
}

const INDUSTRY_DEFAULTS: Record<string, IndustryDefaults> = {
  retail:       { modules: ['pos','sales','warehouse','customers','payments','products','employees'],           roles: ['admin','cashier','warehouse_manager','sales_manager','accountant'] },
  clinic:       { modules: ['patients','appointments','doctors','pharmacy','prescriptions','employees'],       roles: ['admin','doctor','nurse','receptionist','pharmacist','accountant'] },
  education:    { modules: ['students','courses','teachers','attendance','edu_payments','employees'],          roles: ['admin','teacher','receptionist','accountant','curator'] },
  restaurant:   { modules: ['menu','orders','kitchen','tables','payments','employees'],                        roles: ['admin','waiter','cook','cashier','delivery_courier'] },
  beauty:       { modules: ['beauty_appointments','beauty_masters','beauty_services_catalog','customers','employees','reports','settings'], roles: ['admin','cashier','receptionist'] },
  fitness:      { modules: ['gym_members','gym_plans','gym_checkin','employees','reports','settings'],                                     roles: ['admin','trainer','receptionist','accountant'] },
  auto:         { modules: ['auto_orders','auto_vehicles','customers','products','warehouse','employees','reports','settings'],             roles: ['admin','mechanic','receptionist','accountant'] },
  construction: { modules: ['customers','payments','employees','warehouse','products'],                        roles: ['admin','accountant'] },
  custom:       { modules: [],                                                                                 roles: ['admin'] },
};

// ─── Public setup DTO (used by wizard onboarding flow) ────────────────────────

export interface WizardEmployeeInput {
  firstName: string;
  lastName:  string;
  email:     string;
  password:  string;
  role:      string;
}

export interface WizardPublicSetupDto {
  tenantId:          string;
  industry:          string;
  modules:           string[];
  roles:             string[];
  companyName:       string;
  companyPhone:      string;
  companyAddress:    string;
  logoUrl:           string;
  language:          string;
  currency:          string;
  workingHoursStart: string;
  workingHoursEnd:   string;
  workingDays:       string[];
  primaryColor:      string;
  themeStyle:        string;
  receiptFooter:     string;
  employees:         WizardEmployeeInput[];
  // POS configuration
  posCardStyle?:          string;
  posShowCategories?:     boolean;
  posBarcode?:            boolean;
  posCustomer?:           boolean;
  posDiscount?:           boolean;
  posPaymentMethods?:     string[];
  posCurrencies?:         string[];
  posMarkupAllowed?:      boolean;
  posCustomerRequired?:   string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class WizardService {
  constructor(
    @InjectRepository(WizardConfig)
    private readonly repo: Repository<WizardConfig>,
  ) {}

  async configure(dto: ConfigureWizardDto): Promise<WizardConfig> {
    const exists = await this.repo.findOne({ where: { tenantId: dto.tenantId } });
    if (exists) {
      throw new ConflictException(
        `Tenant #${dto.tenantId} uchun config allaqachon mavjud`,
      );
    }

    const config = this.repo.create({
      tenantId:    dto.tenantId,
      industry:    dto.industry,
      modules:     dto.modules,
      roles:       dto.roles,
      theme:       dto.theme       ?? {},
      dashboard:   dto.dashboard   ?? {},
      receipt:     dto.receipt     ?? {},
      permissions: dto.permissions ?? {},
      status:      dto.status,
    });
    return this.repo.save(config);
  }

  async findByTenant(tenantId: string): Promise<WizardConfig> {
    const config = await this.repo.findOne({ where: { tenantId } });
    if (!config) {
      throw new NotFoundException(`Tenant #${tenantId} uchun config topilmadi`);
    }
    return config;
  }

  async update(tenantId: string, dto: UpdateWizardDto): Promise<WizardConfig> {
    let config = await this.repo.findOne({ where: { tenantId } });
    if (!config) {
      config = this.repo.create({ tenantId, industry: Industry.RETAIL, modules: [], roles: [] });
    }
    Object.assign(config, dto);
    return this.repo.save(config);
  }

  // ── Industry defaults (public) ─────────────────────────────────────────────

  getIndustryDefaults(industry: string): IndustryDefaults {
    return INDUSTRY_DEFAULTS[industry] ?? INDUSTRY_DEFAULTS['custom'];
  }

  // ── Upsert config (create or update — used by public wizard setup) ─────────

  async upsertConfig(dto: WizardPublicSetupDto): Promise<WizardConfig> {
    const existing = await this.repo.findOne({ where: { tenantId: dto.tenantId } });

    const fields = {
      industry:          (dto.industry as Industry) ?? Industry.CUSTOM,
      modules:           dto.modules,
      roles:             dto.roles,
      companyName:       dto.companyName   || null,
      companyPhone:      dto.companyPhone  || null,
      companyAddress:    dto.companyAddress || null,
      logoUrl:           dto.logoUrl       || null,
      language:          dto.language      as WizardConfig['language']  || 'uz',
      currency:          dto.currency      as WizardConfig['currency']  || 'uzs',
      workingHoursStart: dto.workingHoursStart || null,
      workingHoursEnd:   dto.workingHoursEnd   || null,
      workingDays:       dto.workingDays?.length ? dto.workingDays : null,
      receiptFooter:     dto.receiptFooter || null,
      posCardStyle:      dto.posCardStyle       ?? 'grid_no_photo',
      posShowCategories: dto.posShowCategories  ?? false,
      posBarcode:        dto.posBarcode         ?? false,
      posCustomer:       dto.posCustomer        ?? true,
      posDiscount:       dto.posDiscount        ?? true,
      posPaymentMethods:    dto.posPaymentMethods?.length  ? dto.posPaymentMethods  : null,
      posCurrencies:        dto.posCurrencies?.length      ? dto.posCurrencies      : null,
      posMarkupAllowed:     dto.posMarkupAllowed            ?? false,
      posCustomerRequired:  dto.posCustomerRequired         ?? 'credit_only',
      theme: {
        shopName:     dto.companyName,
        phone:        dto.companyPhone,
        address:      dto.companyAddress,
        logo:         dto.logoUrl,
        primaryColor: dto.primaryColor,
        style:        dto.themeStyle,
      },
      status: WizardStatus.ACTIVE,
    };

    if (existing) {
      Object.assign(existing, fields);
      return this.repo.save(existing);
    }

    const config = this.repo.create({ tenantId: dto.tenantId, ...fields });
    return this.repo.save(config);
  }

  // ── Mark wizard as completed ───────────────────────────────────────────────

  async complete(tenantId: string): Promise<WizardConfig> {
    const config = await this.repo.findOne({ where: { tenantId } });
    if (!config) throw new NotFoundException(`Wizard config not found for tenant ${tenantId}`);
    config.wizardCompleted = true;
    config.status          = WizardStatus.ACTIVE;
    return this.repo.save(config);
  }
}
