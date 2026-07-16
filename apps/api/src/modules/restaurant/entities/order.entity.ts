import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  qty: number;
  notes?: string;
}

@Entity('rest_orders')
export class RestOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'varchar', nullable: true })
  tableId: string | null;

  @Column({ type: 'varchar', nullable: true })
  tableNumber: string | null;

  @Column({ type: 'jsonb', default: [] })
  items: OrderItem[];

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total: number;

  @Column({ default: 'pending' })
  status: string;

  @Column({ type: 'varchar', nullable: true })
  paymentMethod: string | null;

  @Column({ nullable: true, type: 'text' })
  notes: string | null;

  @Column({ type: 'varchar', nullable: true })
  customerName: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
