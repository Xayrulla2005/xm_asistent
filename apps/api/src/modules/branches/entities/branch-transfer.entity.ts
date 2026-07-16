import {
  Column, CreateDateColumn, Entity,
  ManyToOne, JoinColumn, PrimaryGeneratedColumn,
} from 'typeorm';
import { Branch } from './branch.entity';

export enum TransferStatus {
  PENDING   = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('branch_transfers')
export class BranchTransfer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  tenantId!: string;

  /** null = main warehouse (global stock) */
  @Column({ type: 'uuid', nullable: true })
  fromBranchId!: string | null;

  @ManyToOne(() => Branch, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'fromBranchId' })
  fromBranch!: Branch | null;

  @Column({ type: 'uuid', nullable: true })
  toBranchId!: string | null;

  @ManyToOne(() => Branch, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'toBranchId' })
  toBranch!: Branch | null;

  @Column({ type: 'uuid' })
  productId!: string;

  @Column({ type: 'varchar' })
  productName!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  unitCost!: number;

  @Column({ type: 'enum', enum: TransferStatus, default: TransferStatus.COMPLETED })
  status!: TransferStatus;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  /** Who initiated the transfer */
  @Column({ type: 'varchar', nullable: true })
  initiatedBy!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
