import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { Industry, WizardStatus } from '../entities/wizard-config.entity';
import { DashboardDto, ReceiptDto, ThemeDto } from './configure-wizard.dto';

export class UpdateWizardDto {
  @IsEnum(Industry)
  @IsOptional()
  industry?: Industry;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  modules?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roles?: string[];

  @IsObject() @IsOptional() theme?: ThemeDto;
  @IsObject() @IsOptional() dashboard?: DashboardDto;
  @IsObject() @IsOptional() receipt?: ReceiptDto;
  @IsObject() @IsOptional() permissions?: Record<string, string[]>;

  @IsEnum(WizardStatus)
  @IsOptional()
  status?: WizardStatus;
}
