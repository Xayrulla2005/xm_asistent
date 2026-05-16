import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PaymentType {
  INCOME  = 'income',
  EXPENSE = 'expense',
}

export enum PaymentMethod {
  CASH   = 'cash',
  CARD   = 'card',
  CREDIT = 'credit',
}

export enum PaymentStatus {
  PENDING   = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  customerId: string | null;

  @Column()
  customerName: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: PaymentType })
  type: PaymentType;

  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.CASH })
  method: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  @Column({ type: 'uuid', nullable: true })
  saleId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
