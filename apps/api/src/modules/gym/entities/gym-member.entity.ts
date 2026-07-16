import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('gym_members')
export class GymMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ nullable: true, type: 'uuid' })
  planId: string | null;

  @Column({ type: 'varchar', nullable: true })
  planName: string | null;

  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 2 })
  planPrice: number | null;

  @Column({ nullable: true, type: 'date' })
  joinedAt: string | null;

  @Column({ nullable: true, type: 'date' })
  expiresAt: string | null;

  @Column({ default: 'active' })
  status: string; // active | expired | frozen | cancelled

  @Column({ type: 'int', default: 0 })
  totalCheckins: number;

  @Column({ nullable: true, type: 'text' })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
