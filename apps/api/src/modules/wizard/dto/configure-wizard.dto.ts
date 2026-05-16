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
  @IsString()
  @IsOptional()
  primaryColor?: string;

  @IsString()
  @IsOptional()
  logo?: string;

  @IsString()
  @IsOptional()
  bgType?: string;

  @IsBoolean()
  @IsOptional()
  darkMode?: boolean;
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

  @IsObject()
  @IsOptional()
  theme?: ThemeDto;

  @IsEnum(WizardStatus)
  @IsOptional()
  status?: WizardStatus;
}
