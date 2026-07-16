import {
  Column, CreateDateColumn, Entity,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';

export enum BugType {
  FRONTEND_ERROR = 'frontend_error',
  API_ERROR      = 'api_error',
  USER_REPORT    = 'user_report',
}

export enum BugStatus {
  NEW         = 'new',
  OPEN        = 'open',
  IN_PROGRESS = 'in_progress',
  TESTING     = 'testing',
  RESOLVED    = 'resolved',
  CLOSED      = 'closed',
  REOPENED    = 'reopened',
}

export enum BugPriority {
  P1 = 'P1',
  P2 = 'P2',
  P3 = 'P3',
  P4 = 'P4',
}

@Entity('bugs')
export class Bug {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ── Existing columns (unchanged) ──────────────────────────────────
  @Column({ nullable: true, type: 'varchar' })
  tenantId!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  tenantName!: string | null;

  @Column({ type: 'enum', enum: BugType })
  type!: BugType;

  @Column({ type: 'text' })
  message!: string;

  @Column({ nullable: true, type: 'text' })
  stack!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  url!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  userEmail!: string | null;

  @Column({ type: 'enum', enum: BugStatus, default: BugStatus.NEW })
  status!: BugStatus;

  @Column({ nullable: true, type: 'varchar' })
  assignedTo!: string | null;

  @Column({ nullable: true, type: 'timestamptz' })
  resolvedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // ── Extended columns (new — all nullable for backward compat) ─────
  @Column({ nullable: true, type: 'varchar', length: 255 })
  title!: string | null;

  @Column({ nullable: true, type: 'text' })
  description!: string | null;

  @Column({ type: 'enum', enum: BugPriority, default: BugPriority.P3 })
  priority!: BugPriority;

  /** 'frontend' | 'backend' | 'user_report' — separate from type */
  @Column({ nullable: true, type: 'varchar' })
  source!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  moduleAffected!: string | null;

  @Column({ nullable: true, type: 'timestamptz' })
  slaDeadline!: Date | null;

  @Column({ nullable: true, type: 'text' })
  resolutionNote!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  userAgent!: string | null;

  @Column({ nullable: true, type: 'integer' })
  statusCode!: number | null;

  @Column({ nullable: true, type: 'varchar' })
  method!: string | null;
}
