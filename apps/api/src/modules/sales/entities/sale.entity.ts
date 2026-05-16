import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PaymentType {
  CASH   = 'cash',
  CARD   = 'card',
  CREDIT = 'credit',
}

export enum SaleStatus {
  PENDING   = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface SaleItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column()
  customerName: string;

  @Column({ type: 'jsonb', default: [] })
  items: SaleItem[];

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  totalAmount: number;

  @Column({ type: 'enum', enum: PaymentType, default: PaymentType.CASH })
  paymentType: PaymentType;

  @Column({ type: 'enum', enum: SaleStatus, default: SaleStatus.PENDING })
  status: SaleStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
