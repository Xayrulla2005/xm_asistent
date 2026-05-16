import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WarehouseLogType } from '../entities/warehouse-log.entity';

export class CreateWarehouseLogDto {
  @IsUUID()
  tenantId: string;

  @IsUUID()
  productId: string;

  @IsEnum(WarehouseLogType)
  type: WarehouseLogType;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  quantity: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  price: number;

  @IsString()
  @IsOptional()
  reason?: string;
}
