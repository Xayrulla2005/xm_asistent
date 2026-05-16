import { IsEnum } from 'class-validator';
import { PaymentStatus } from '../entities/payment.entity';

export class UpdatePaymentStatusDto {
  @IsEnum(PaymentStatus)
  status: PaymentStatus;
}
