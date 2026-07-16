import {
  Column, CreateDateColumn, Entity,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';

export enum PlanType {
  TRIAL   = 'trial',
  STARTER = 'starter',
  PRO     = 'pro',
}

export enum SubStatus {
  ACTIVE    = 'active',
  TRIAL     = 'trial',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY  = 'yearly',
}

export enum PaymentMethod {
  CLICK  = 'click',
  PAYME  = 'payme',
  MANUAL = 'manual',
}

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'varchar', default: PlanType.TRIAL })
  plan: PlanType;

  @Column({ type: 'enum', enum: SubStatus, default: SubStatus.TRIAL })
  status: SubStatus;

  @Column({ type: 'enum', enum: BillingCycle, default: BillingCycle.MONTHLY })
  billingCycle: BillingCycle;

  @Column({ type: 'int', default: 3 })
  usersLimit: number;

  @Column({ type: 'int', default: 500 })
  storageLimit: number;

  @Column({ type: 'int', default: 500 })
  apiCallsLimit: number;

  @Column({ type: 'int', default: 0 })
  currentApiCalls: number;

  @Column({ type: 'int', default: 0 })
  currentUsers: number;

  /** Stores price in USD (e.g. 10 = $10). Column kept as priceUzs for backwards compat. */
  @Column({ type: 'int', default: 0 })
  priceUzs: number;

  @Column({ nullable: true, type: 'timestamptz' })
  trialEndsAt: Date | null;

  @Column({ type: 'timestamptz' })
  currentPeriodStart: Date;

  @Column({ type: 'timestamptz' })
  currentPeriodEnd: Date;

  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.MANUAL })
  paymentMethod: PaymentMethod;

  @Column({ nullable: true, type: 'timestamptz' })
  lastPaymentAt: Date | null;

  @Column({ nullable: true, type: 'int' })
  lastPaymentAmount: number | null;

  @Column({ nullable: true, type: 'timestamptz' })
  nextPaymentAt: Date | null;

  // ── Pending plan-change request ────────────────────────────────────────────
  @Column({ nullable: true, type: 'varchar' })
  pendingPlan: PlanType | null;

  @Column({ nullable: true, type: 'enum', enum: BillingCycle })
  pendingCycle: BillingCycle | null;

  @Column({ nullable: true, type: 'timestamptz' })
  pendingRequestedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
