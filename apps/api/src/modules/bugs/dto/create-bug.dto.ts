import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BugType } from '../bug.entity';

export class CreateBugDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  tenantName?: string;

  @IsEnum(BugType)
  type!: BugType;

  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  stack?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  userEmail?: string;
}
