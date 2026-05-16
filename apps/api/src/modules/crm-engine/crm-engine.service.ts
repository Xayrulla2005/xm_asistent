import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WizardService } from '../wizard/wizard.service';
import { WizardConfig } from '../wizard/entities/wizard-config.entity';
import { GeneratedCrm, GeneratedCrmStatus } from './entities/generated-crm.entity';

// ─── Nav item definitions per industry ───────────────────────────────────────

const NAV_LABELS: Record<string, string> = {
  sales:           'Sotuv',
  warehouse:       'Sklad',
  customers:       'Mijozlar',
  payments:        "To'lovlar",
  deliveries:      'Yetkazib berish',
  reports:         'Hisobotlar',
  loyalty:         'Sodiqlik dasturi',
  suppliers:       "Ta'minotchilar",
  products:        'Mahsulotlar',
  patients:        'Bemorlar',
  appointments:    'Qabullar',
  doctors:         'Shifokorlar',
  pharmacy:        'Dorixona',
  lab:             'Laboratoriya',
  medical_records: 'Tibbiy kartalar',
  students:        "O'quvchilar",
  courses:         'Kurslar',
  teachers:        "O'qituvchilar",
  attendance:      'Davomat',
  exams:           'Imtihonlar',
  certificates:    'Sertifikatlar',
  schedule:        'Jadval',
  menu:            'Menyu',
  orders:          'Buyurtmalar',
  kitchen:         'Oshxona',
  tables:          'Stollar',
  delivery:        'Yetkazib berish',
  reservations:    'Bronlar',
};

// ─── Role → allowed modules per industry ────────────────────────────────────

type PermissionMap = Record<string, string[]>;

const INDUSTRY_PERMISSIONS: Record<string, PermissionMap> = {
  retail: {
    admin:             ['*'],
    cashier:           ['sales', 'customers', 'payments'],
    warehouse_manager: ['warehouse', 'products', 'suppliers'],
    courier:           ['deliveries'],
    accountant:        ['payments', 'reports'],
    sales_manager:     ['sales', 'customers', 'reports'],
  },
  clinic: {
    admin:           ['*'],
    doctor:          ['patients', 'appointments', 'medical_records'],
    nurse:           ['patients', 'appointments'],
    receptionist:    ['appointments', 'patients'],
    pharmacist:      ['pharmacy'],
    lab_technician:  ['lab'],
    accountant:      ['payments', 'reports'],
  },
  education: {
    admin:        ['*'],
    teacher:      ['students', 'attendance', 'exams', 'courses'],
    receptionist: ['students', 'payments'],
    accountant:   ['payments', 'reports'],
    curator:      ['students', 'attendance', 'courses'],
  },
  restaurant: {
    admin:            ['*'],
    waiter:           ['orders', 'tables', 'menu'],
    cook:             ['orders', 'kitchen', 'menu'],
    cashier:          ['payments', 'orders'],
    delivery_courier: ['deliveries', 'orders'],
    accountant:       ['payments', 'reports'],
  },
};

// ─── Service ─────────────────────────────────────────────────────────────────

export interface CrmConfig {
  tenantId: string;
  slug: string;
  industry: string;
  modules: string[];
  roles: string[];
  theme: {
    primaryColor: string;
    logo: string;
    bgType: string;
    darkMode: boolean;
  };
  navigation: { key: string; label: string; path: string }[];
  permissions: PermissionMap;
  generatedAt: Date;
}

@Injectable()
export class CrmEngineService {
  constructor(
    @InjectRepository(GeneratedCrm)
    private readonly repo: Repository<GeneratedCrm>,
    private readonly wizardService: WizardService,
  ) {}

  generateCRM(wizardConfig: WizardConfig): CrmConfig {
    const { tenantId, industry, modules, roles, theme } = wizardConfig;

    const slug = tenantId.replace(/-/g, '').slice(0, 12);

    const navigation = modules.map((key) => ({
      key,
      label: NAV_LABELS[key] ?? key,
      path: `/${key}`,
    }));

    const industryPerms = INDUSTRY_PERMISSIONS[industry] ?? {};
    const permissions: PermissionMap = {};

    for (const role of roles) {
      const allowed = industryPerms[role];
      if (!allowed) {
        permissions[role] = modules;
        continue;
      }
      if (allowed[0] === '*') {
        permissions[role] = ['*'];
      } else {
        permissions[role] = allowed.filter((m) => modules.includes(m));
      }
    }

    return {
      tenantId,
      slug,
      industry,
      modules,
      roles,
      theme: {
        primaryColor: (theme as Record<string, unknown>)?.primaryColor as string ?? '#2563eb',
        logo:         (theme as Record<string, unknown>)?.logo         as string ?? '',
        bgType:       (theme as Record<string, unknown>)?.bgType       as string ?? 'solid',
        darkMode:     (theme as Record<string, unknown>)?.darkMode     as boolean ?? false,
      },
      navigation,
      permissions,
      generatedAt: new Date(),
    };
  }

  async generate(tenantId: string): Promise<CrmConfig> {
    const wizardConfig = await this.wizardService.findByTenant(tenantId);
    const crmConfig = this.generateCRM(wizardConfig);

    const existing = await this.repo.findOne({ where: { tenantId } });

    if (existing) {
      existing.config = crmConfig as unknown as Record<string, unknown>;
      existing.status = GeneratedCrmStatus.ACTIVE;
      await this.repo.save(existing);
    } else {
      await this.repo.save(
        this.repo.create({
          tenantId,
          config: crmConfig as unknown as Record<string, unknown>,
          status: GeneratedCrmStatus.ACTIVE,
        }),
      );
    }

    return crmConfig;
  }

  async findByTenant(tenantId: string): Promise<CrmConfig> {
    const row = await this.repo.findOne({ where: { tenantId } });
    if (!row) {
      throw new NotFoundException(
        `Tenant #${tenantId} uchun generatsiya qilingan CRM topilmadi`,
      );
    }
    return row.config as unknown as CrmConfig;
  }
}
