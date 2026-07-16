import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { BugType } from '../bug.entity';

export class CreateBugDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  tenantName?: string;

  @IsOptional()
  @IsEnum(BugType)
  type?: BugType;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  moduleAffected?: string;

  @IsOptional()
  @IsString()
  stack?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  userEmail?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsNumber()
  statusCode?: number;

  @IsOptional()
  @IsString()
  method?: string;
}
