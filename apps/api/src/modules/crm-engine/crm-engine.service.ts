import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WizardService } from '../wizard/wizard.service';
import { WizardConfig } from '../wizard/entities/wizard-config.entity';
import { GeneratedCrm, GeneratedCrmStatus } from './entities/generated-crm.entity';

// ─── Nav labels ──────────────────────────────────────────────────────────────

const NAV_LABELS: Record<string, string> = {
  pos:             'Sotuv (POS)',
  sales:           'Sotuv tarixi',
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

// ─── Permission types ─────────────────────────────────────────────────────────

export interface RolePermission {
  modules: string[];
  actions: string[];
  denied: string[];
  canAccessSettings: boolean;
  canManageUsers: boolean;
  canViewReports: boolean;
  canDeleteData: boolean;
}

interface RolePermDef {
  modules: string[];
  actions: string[];
  denied?: string[];
}

// ─── Industry → role → permissions ───────────────────────────────────────────

const INDUSTRY_ROLE_PERMS: Record<string, Record<string, RolePermDef>> = {
  retail: {
    admin: {
      modules: ['*'],
      actions: ['read', 'create', 'update', 'delete'],
    },
    cashier: {
      modules: ['pos', 'sales', 'customers', 'payments'],
      actions: ['read', 'create'],
      denied:  ['delete', 'reports', 'settings'],
    },
    warehouse_manager: {
      modules: ['warehouse', 'products', 'suppliers'],
      actions: ['read', 'create', 'update'],
      denied:  ['delete', 'sales', 'payments', 'reports'],
    },
    accountant: {
      modules: ['payments', 'reports', 'sales'],
      actions: ['read'],
      denied:  ['create', 'update', 'delete', 'pos', 'warehouse'],
    },
    sales_manager: {
      modules: ['sales', 'customers', 'reports', 'pos'],
      actions: ['read', 'create', 'update'],
      denied:  ['delete', 'warehouse', 'payments'],
    },
    courier: {
      modules: ['deliveries'],
      actions: ['read', 'update'],
      denied:  ['create', 'delete', 'sales', 'warehouse', 'payments'],
    },
  },

  clinic: {
    admin: {
      modules: ['*'],
      actions: ['read', 'create', 'update', 'delete'],
    },
    doctor: {
      modules: ['patients', 'appointments', 'medical_records'],
      actions: ['read', 'create', 'update'],
      denied:  ['delete', 'payments', 'pharmacy', 'lab'],
    },
    nurse: {
      modules: ['patients', 'appointments'],
      actions: ['read', 'create'],
      denied:  ['delete', 'update', 'medical_records', 'payments'],
    },
    receptionist: {
      modules: ['appointments', 'patients', 'payments'],
      actions: ['read', 'create'],
      denied:  ['delete', 'update', 'medical_records'],
    },
    pharmacist: {
      modules: ['pharmacy'],
      actions: ['read', 'create', 'update'],
      denied:  ['delete', 'patients', 'appointments'],
    },
    lab_technician: {
      modules: ['lab', 'patients'],
      actions: ['read', 'create'],
      denied:  ['delete', 'update', 'payments', 'pharmacy'],
    },
    accountant: {
      modules: ['payments', 'reports'],
      actions: ['read'],
      denied:  ['create', 'update', 'delete'],
    },
  },

  education: {
    admin: {
      modules: ['*'],
      actions: ['read', 'create', 'update', 'delete'],
    },
    teacher: {
      modules: ['students', 'attendance', 'exams', 'courses', 'schedule'],
      actions: ['read', 'create', 'update'],
      denied:  ['delete', 'payments', 'certificates'],
    },
    receptionist: {
      modules: ['students', 'payments', 'schedule'],
      actions: ['read', 'create'],
      denied:  ['delete', 'update', 'exams', 'attendance'],
    },
    accountant: {
      modules: ['payments', 'reports'],
      actions: ['read'],
      denied:  ['create', 'update', 'delete'],
    },
    curator: {
      modules: ['students', 'attendance', 'courses', 'certificates'],
      actions: ['read', 'create', 'update'],
      denied:  ['delete', 'payments', 'exams'],
    },
  },

  restaurant: {
    admin: {
      modules: ['*'],
      actions: ['read', 'create', 'update', 'delete'],
    },
    waiter: {
      modules: ['orders', 'tables', 'menu'],
      actions: ['read', 'create', 'update'],
      denied:  ['delete', 'payments', 'kitchen', 'warehouse'],
    },
    cook: {
      modules: ['orders', 'kitchen', 'menu'],
      actions: ['read', 'update'],
      denied:  ['create', 'delete', 'payments', 'tables'],
    },
    cashier: {
      modules: ['payments', 'orders', 'tables'],
      actions: ['read', 'create'],
      denied:  ['delete', 'update', 'kitchen', 'menu'],
    },
    delivery_courier: {
      modules: ['deliveries', 'orders'],
      actions: ['read', 'update'],
      denied:  ['create', 'delete', 'payments', 'kitchen'],
    },
    accountant: {
      modules: ['payments', 'reports'],
      actions: ['read'],
      denied:  ['create', 'update', 'delete'],
    },
  },
};

// ─── CrmConfig interface ──────────────────────────────────────────────────────

export interface CrmConfig {
  tenantId: string;
  slug: string;
  industry: string;
  modules: string[];
  roles: string[];
  theme: {
    shopName?: string;
    address?: string;
    phone?: string;
    primaryColor: string;
    logo: string;
    bgType: string;
    darkMode: boolean;
  };
  navigation: { key: string; label: string; path: string }[];
  permissions: Record<string, RolePermission>;
  generatedAt: Date;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class CrmEngineService {
  constructor(
    @InjectRepository(GeneratedCrm)
    private readonly repo: Repository<GeneratedCrm>,
    private readonly wizardService: WizardService,
  ) {}

  generateCRM(wizardConfig: WizardConfig): CrmConfig {
    const { tenantId, industry, modules, roles, theme } = wizardConfig;
    const t = (theme ?? {}) as Record<string, unknown>;

    const slug = tenantId.replace(/-/g, '').slice(0, 12);

    const navigation = modules.map((key) => ({
      key,
      label: NAV_LABELS[key] ?? key,
      path:  `/${key}`,
    }));

    const industryPerms = INDUSTRY_ROLE_PERMS[industry] ?? {};
    const permissions: Record<string, RolePermission> = {};

    for (const role of roles) {
      const def     = industryPerms[role] ?? { modules, actions: ['read'] };
      const isAdmin = def.modules[0] === '*';

      const resolvedModules = isAdmin
        ? ['*']
        : def.modules.filter((m) => modules.includes(m));

      permissions[role] = {
        modules:           resolvedModules,
        actions:           def.actions,
        denied:            def.denied ?? [],
        canAccessSettings: isAdmin,
        canManageUsers:    isAdmin,
        canViewReports:    isAdmin || def.modules.includes('reports'),
        canDeleteData:     isAdmin || def.actions.includes('delete'),
      };
    }

    return {
      tenantId,
      slug,
      industry,
      modules,
      roles,
      theme: {
        shopName:     t.shopName     as string  ?? '',
        address:      t.address      as string  ?? '',
        phone:        t.phone        as string  ?? '',
        primaryColor: t.primaryColor as string  ?? '#2563eb',
        logo:         t.logo         as string  ?? '',
        bgType:       t.bgType       as string  ?? 'solid',
        darkMode:     t.darkMode     as boolean ?? false,
      },
      navigation,
      permissions,
      generatedAt: new Date(),
    };
  }

  async generate(tenantId: string): Promise<CrmConfig> {
    const wizardConfig = await this.wizardService.findByTenant(tenantId);
    const crmConfig    = this.generateCRM(wizardConfig);

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
