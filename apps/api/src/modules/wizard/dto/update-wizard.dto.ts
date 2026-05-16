import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { Industry, WizardStatus } from '../entities/wizard-config.entity';
import { ThemeDto } from './configure-wizard.dto';

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

  @IsObject()
  @IsOptional()
  theme?: ThemeDto;

  @IsEnum(WizardStatus)
  @IsOptional()
  status?: WizardStatus;
}
