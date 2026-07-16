import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { BillingCycle, PaymentMethod, PlanType } from '../entities/subscription.entity';

export class ChangePlanDto {
  @IsEnum(PlanType)
  plan: PlanType;

  @IsEnum(BillingCycle)
  cycle: BillingCycle;
}

export class RecordPaymentDto {
  @IsInt()
  @Min(0)
  amount: number;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
