import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateTransferDto {
  /** null means "main warehouse" */
  @IsOptional()
  @IsUUID()
  fromBranchId?: string | null;

  @IsOptional()
  @IsUUID()
  toBranchId?: string | null;

  @IsUUID()
  productId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
