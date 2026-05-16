import { IsEnum } from 'class-validator';
import { SaleStatus } from '../entities/sale.entity';

export class UpdateSaleStatusDto {
  @IsEnum(SaleStatus)
  status: SaleStatus;
}
