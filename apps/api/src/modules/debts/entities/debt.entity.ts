import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DebtStatus {
  PENDING   = 'pending',
  PARTIAL   = 'partial',
  PAID      = 'paid',
  CANCELLED = 'cancelled',
}

@Entity('debts')
export class Debt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'uuid' })
  saleId: string;

  @Column({ type: 'uuid', nullable: true })
  customerId: string | null;

  @Column({ default: '' })
  customerName: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  originalAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  remainingAmount: number;

  @Column({ type: 'enum', enum: DebtStatus, default: DebtStatus.PENDING })
  status: DebtStatus;

  @Column({ type: 'varchar', nullable: true })
  dueDate: string | null;

  @Column({ type: 'varchar', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
