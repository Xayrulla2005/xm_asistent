import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum Industry {
  RETAIL       = 'retail',
  CLINIC       = 'clinic',
  EDUCATION    = 'education',
  RESTAURANT   = 'restaurant',
  BEAUTY       = 'beauty',
  FITNESS      = 'fitness',
  AUTO         = 'auto',
  CONSTRUCTION = 'construction',
  CUSTOM       = 'custom',
}

export enum WizardStatus {
  DRAFT  = 'draft',
  ACTIVE = 'active',
}

export enum Language {
  UZ = 'uz',
  RU = 'ru',
  EN = 'en',
}

export enum Currency {
  UZS = 'uzs',
  USD = 'usd',
  RUB = 'rub',
}

export enum ReceiptSize {
  MM58 = '58mm',
  MM80 = '80mm',
  A4   = 'a4',
}

export enum DiscountMode {
  CLASSIC = 'classic',
  MARKUP  = 'markup',
  MIXED   = 'mixed',
}

@Entity('wizard_configs')
export class WizardConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  tenantId: string;

  @Column({ type: 'enum', enum: Industry })
  industry: Industry;

  @Column({ type: 'jsonb', default: [] })
  modules: string[];

  @Column({ type: 'jsonb', default: [] })
  roles: string[];

  @Column({ type: 'jsonb', default: {} })
  dashboard: { widgets?: string[] };

  @Column({ type: 'jsonb', default: {} })
  receipt: { fields?: string[]; width?: string; thankYouText?: string };

  @Column({ type: 'jsonb', default: {} })
  theme: {
    shopName?:     string;
    address?:      string;
    phone?:        string;
    primaryColor?: string;
    logo?:         string;
    style?:        string;
    darkMode?:     boolean;
  };

  @Column({ type: 'jsonb', default: {} })
  permissions: Record<string, string[]>;

  @Column({ type: 'enum', enum: WizardStatus, default: WizardStatus.DRAFT })
  status: WizardStatus;

  // ── New wizard fields ────────────────────────────────────────────────────────

  @Column({ nullable: true, type: 'varchar' })
  companyName: string | null;

  @Column({ nullable: true, type: 'varchar' })
  companyPhone: string | null;

  @Column({ nullable: true, type: 'varchar' })
  companyAddress: string | null;

  @Column({ nullable: true, type: 'varchar' })
  logoUrl: string | null;

  @Column({ type: 'enum', enum: Language, default: Language.UZ })
  language: Language;

  @Column({ type: 'enum', enum: Currency, default: Currency.UZS })
  currency: Currency;

  @Column({ nullable: true, type: 'varchar' })
  workingHoursStart: string | null;

  @Column({ nullable: true, type: 'varchar' })
  workingHoursEnd: string | null;

  @Column({ type: 'simple-array', nullable: true })
  workingDays: string[] | null;

  @Column({ type: 'enum', enum: ReceiptSize, default: ReceiptSize.MM58 })
  receiptSize: ReceiptSize;

  @Column({ default: true })
  receiptShowLogo: boolean;

  @Column({ default: true })
  receiptShowPhone: boolean;

  @Column({ default: true })
  receiptShowAddress: boolean;

  @Column({ default: false })
  receiptShowQr: boolean;

  @Column({ nullable: true, type: 'text' })
  receiptFooter: string | null;

  @Column({ type: 'enum', enum: DiscountMode, default: DiscountMode.CLASSIC })
  discountMode: DiscountMode;

  @Column({ type: 'simple-array', nullable: true })
  exportFormats: string[] | null;

  @Column({ default: false })
  wizardCompleted: boolean;

  // ── POS configuration ────────────────────────────────────────────────────────

  @Column({ nullable: true, type: 'varchar', default: 'grid_no_photo' })
  posCardStyle: string | null;

  @Column({ default: false })
  posShowCategories: boolean;

  @Column({ default: false })
  posBarcode: boolean;

  @Column({ default: true })
  posCustomer: boolean;

  @Column({ default: true })
  posDiscount: boolean;

  @Column({ type: 'simple-array', nullable: true })
  posPaymentMethods: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  posCurrencies: string[] | null;

  @Column({ default: false })
  posMarkupAllowed: boolean;

  @Column({ type: 'varchar', default: 'credit_only' })
  posCustomerRequired: string;

  // ── Customer levels ──────────────────────────────────────────────────────────

  @Column({ type: 'jsonb', nullable: true })
  customerLevels: { name: string; minAmount: number; color: string }[] | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
