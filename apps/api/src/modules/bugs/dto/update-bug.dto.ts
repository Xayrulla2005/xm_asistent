import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BugStatus } from '../bug.entity';

export class UpdateBugDto {
  @IsOptional()
  @IsEnum(BugStatus)
  status?: BugStatus;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  resolutionNote?: string;
}
