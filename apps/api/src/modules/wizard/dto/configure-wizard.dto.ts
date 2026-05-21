import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Industry, WizardStatus } from '../entities/wizard-config.entity';

export class ThemeDto {
  @IsString() @IsOptional() shopName?: string;
  @IsString() @IsOptional() address?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() primaryColor?: string;
  @IsString() @IsOptional() logo?: string;
  @IsString() @IsOptional() bgType?: string;
  @IsString() @IsOptional() style?: string;
  @IsBoolean() @IsOptional() darkMode?: boolean;
}

export class DashboardDto {
  @IsArray() @IsString({ each: true }) @IsOptional() widgets?: string[];
}

export class ReceiptDto {
  @IsArray() @IsString({ each: true }) @IsOptional() fields?: string[];
  @IsString() @IsOptional() width?: string;
  @IsString() @IsOptional() thankYouText?: string;
}

export class ConfigureWizardDto {
  @IsUUID()
  tenantId: string;

  @IsEnum(Industry)
  industry: Industry;

  @IsArray()
  @IsString({ each: true })
  modules: string[];

  @IsArray()
  @IsString({ each: true })
  roles: string[];

  @IsObject() @IsOptional() theme?: ThemeDto;
  @IsObject() @IsOptional() dashboard?: DashboardDto;
  @IsObject() @IsOptional() receipt?: ReceiptDto;
  @IsObject() @IsOptional() permissions?: Record<string, string[]>;

  @IsEnum(WizardStatus) @IsOptional() status?: WizardStatus;
}
