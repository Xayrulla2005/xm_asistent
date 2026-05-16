import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentType } from '../entities/sale.entity';

export class SaleItemDto {
  @IsUUID()
  productId: string;

  @IsString()
  name: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  price: number;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}

export class CreateSaleDto {
  @IsUUID()
  tenantId: string;

  @IsString()
  customerName: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @IsEnum(PaymentType)
  @IsOptional()
  paymentType?: PaymentType;
}
