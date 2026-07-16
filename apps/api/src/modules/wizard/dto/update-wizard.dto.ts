import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { Industry, WizardStatus } from '../entities/wizard-config.entity';
import { DashboardDto, ReceiptDto, ThemeDto } from './configure-wizard.dto';

export class UpdateWizardDto {
  // ── Core ──────────────────────────────────────────────────────────────────────
  @IsEnum(Industry)   @IsOptional() industry?:    Industry;
  @IsArray() @IsString({ each: true }) @IsOptional() modules?: string[];
  @IsArray() @IsString({ each: true }) @IsOptional() roles?:   string[];
  @IsObject() @IsOptional() theme?:       ThemeDto;
  @IsObject() @IsOptional() dashboard?:   DashboardDto;
  @IsObject() @IsOptional() receipt?:     ReceiptDto;
  @IsObject() @IsOptional() permissions?: Record<string, string[]>;
  @IsEnum(WizardStatus) @IsOptional() status?: WizardStatus;

  // ── Company ───────────────────────────────────────────────────────────────────
  @IsOptional() @IsString() companyName?:    string | null;
  @IsOptional() @IsString() companyPhone?:   string | null;
  @IsOptional() @IsString() companyAddress?: string | null;
  @IsOptional() @IsString() logoUrl?:        string | null;

  // ── Locale ────────────────────────────────────────────────────────────────────
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsString() currency?: string;

  // ── Schedule ──────────────────────────────────────────────────────────────────
  @IsOptional() @IsString() workingHoursStart?: string | null;
  @IsOptional() @IsString() workingHoursEnd?:   string | null;
  @IsOptional() @IsArray() @IsString({ each: true }) workingDays?: string[];

  // ── Receipt ───────────────────────────────────────────────────────────────────
  @IsOptional() @IsString()  receiptSize?:        string;
  @IsOptional() @IsBoolean() receiptShowLogo?:    boolean;
  @IsOptional() @IsBoolean() receiptShowPhone?:   boolean;
  @IsOptional() @IsBoolean() receiptShowAddress?: boolean;
  @IsOptional() @IsBoolean() receiptShowQr?:      boolean;
  @IsOptional() @IsString()  receiptFooter?:      string | null;
  @IsOptional() @IsString()  discountMode?:       string;
  @IsOptional() @IsArray() @IsString({ each: true }) exportFormats?: string[];

  // ── POS ───────────────────────────────────────────────────────────────────────
  @IsOptional() @IsString()  posCardStyle?:        string | null;
  @IsOptional() @IsBoolean() posShowCategories?:   boolean;
  @IsOptional() @IsBoolean() posBarcode?:          boolean;
  @IsOptional() @IsBoolean() posCustomer?:         boolean;
  @IsOptional() @IsBoolean() posDiscount?:         boolean;
  @IsOptional() @IsBoolean() posMarkupAllowed?:    boolean;
  @IsOptional() @IsString()  posCustomerRequired?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) posPaymentMethods?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) posCurrencies?:     string[];

  // ── Customer levels ───────────────────────────────────────────────────────────
  @IsOptional() @IsArray() customerLevels?: { name: string; minAmount: number; color: string }[] | null;

  // ── Misc ──────────────────────────────────────────────────────────────────────
  @IsOptional() @IsString()  subdomain?:       string | null;
  @IsOptional() @IsBoolean() wizardCompleted?: boolean;
}
