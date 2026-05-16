import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod, PaymentType } from '../entities/payment.entity';

export class CreatePaymentDto {
  @IsUUID()
  tenantId: string;

  @IsUUID()
  @IsOptional()
  customerId?: string;

  @IsString()
  customerName: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  amount: number;

  @IsEnum(PaymentType)
  type: PaymentType;

  @IsEnum(PaymentMethod)
  @IsOptional()
  method?: PaymentMethod;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  saleId?: string;
}
