import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('rest_tables')
export class RestTable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column()
  number: string;

  @Column({ type: 'int', default: 4 })
  capacity: number;

  @Column({ type: 'varchar', nullable: true })
  zone: string | null;

  @Column({ default: 'free' })
  status: string;

  @Column({ type: 'varchar', nullable: true })
  currentOrderId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
