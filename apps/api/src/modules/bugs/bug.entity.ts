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
  IN_PROGRESS = 'in_progress',
  RESOLVED    = 'resolved',
}

@Entity('bugs')
export class Bug {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

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
}
