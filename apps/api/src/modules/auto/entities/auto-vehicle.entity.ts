import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('auto_vehicles')
export class AutoVehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  customerId: string | null;

  @Column()
  customerName: string;

  @Column({ type: 'varchar', nullable: true })
  customerPhone: string | null;

  @Column()
  brand: string;

  @Column()
  model: string;

  @Column({ type: 'int', nullable: true })
  year: number | null;

  @Column({ type: 'varchar', nullable: true })
  plateNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  color: string | null;

  @Column({ type: 'varchar', nullable: true })
  vin: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
