import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum MovementType {
  SALE        = 'sale',
  RETURN      = 'return',
  RESTOCK     = 'restock',
  ADJUSTMENT  = 'adjustment',
}

@Entity('inventory_movements')
export class InventoryMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'uuid' })
  productId: string;

  @Column()
  productName: string;

  @Column({ type: 'enum', enum: MovementType })
  type: MovementType;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  quantity: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  stockBefore: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  stockAfter: number;

  @Column({ type: 'uuid', nullable: true })
  referenceId: string | null;

  @Column({ type: 'varchar', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
