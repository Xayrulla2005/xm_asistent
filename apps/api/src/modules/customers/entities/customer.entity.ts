import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalDebt: number;

  // Client portal auth
  @Column({ type: 'varchar', nullable: true, select: false })
  password: string | null;

  @Column({ type: 'varchar', nullable: true })
  sessionToken: string | null;

  @Column({ default: false })
  portalEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
