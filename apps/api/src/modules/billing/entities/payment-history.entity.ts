import {
  Column, CreateDateColumn, Entity, PrimaryGeneratedColumn,
} from 'typeorm';

export enum PaymentHistoryStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED  = 'failed',
}

export enum PaymentHistoryMethod {
  CLICK  = 'click',
  PAYME  = 'payme',
  MANUAL = 'manual',
}

@Entity('payment_history')
export class PaymentHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'uuid' })
  subscriptionId: string;

  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'enum', enum: PaymentHistoryMethod })
  method: PaymentHistoryMethod;

  @Column({ type: 'enum', enum: PaymentHistoryStatus, default: PaymentHistoryStatus.PENDING })
  status: PaymentHistoryStatus;

  @Column({ nullable: true, type: 'varchar' })
  transactionId: string | null;

  @Column({ nullable: true, type: 'text' })
  description: string | null;

  @Column({ nullable: true, type: 'timestamptz' })
  paidAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
