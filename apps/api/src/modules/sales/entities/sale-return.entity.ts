import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ReturnStatus {
  PENDING  = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface ReturnItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

@Entity('sale_returns')
export class SaleReturn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'uuid' })
  saleId: string;

  @Column({ type: 'jsonb', default: [] })
  items: ReturnItem[];

  @Column({ type: 'varchar', nullable: true })
  reason: string | null;

  @Column({ type: 'enum', enum: ReturnStatus, default: ReturnStatus.PENDING })
  status: ReturnStatus;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalRefund: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
