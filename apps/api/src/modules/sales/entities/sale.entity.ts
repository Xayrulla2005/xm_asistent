import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

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
  discount: number;
}

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ default: '' })
  customerName: string;

  @Column({ type: 'jsonb', default: [] })
  items: SaleItem[];

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  totalAmount: number;

  @Column({ type: 'varchar', default: 'cash' })
  paymentType: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  cashReceived: number | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  change: number | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  mixedCash: number | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  mixedCard: number | null;

  @Column({ type: 'enum', enum: SaleStatus, default: SaleStatus.COMPLETED })
  status: SaleStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
