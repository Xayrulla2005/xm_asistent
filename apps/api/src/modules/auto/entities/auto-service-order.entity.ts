import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type AutoServiceOrderStatus =
  | 'received'
  | 'diagnosing'
  | 'in_progress'
  | 'ready'
  | 'delivered';

export interface WorkItem {
  name:  string;
  qty:   number;
  price: number;
  type:  'work' | 'part';
}

@Entity('auto_service_orders')
export class AutoServiceOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  vehicleId: string | null;

  @Column({ type: 'varchar', nullable: true })
  plateNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  vehicleInfo: string | null;

  @Column({ type: 'uuid', nullable: true })
  customerId: string | null;

  @Column()
  customerName: string;

  @Column({ type: 'varchar', nullable: true })
  customerPhone: string | null;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', default: [] })
  mechanics: string[];

  @Column({ default: 'received' })
  status: AutoServiceOrderStatus;

  @Column({ type: 'jsonb', default: [] })
  workItems: WorkItem[];

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalCost: number;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  receivedAt: string;

  @Column({ type: 'date', nullable: true })
  estimatedAt: string | null;

  @Column({ type: 'date', nullable: true })
  completedAt: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
