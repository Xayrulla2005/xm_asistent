import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type BeautyAppointmentStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

@Entity('beauty_appointments')
export class BeautyAppointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column()
  clientName: string;

  @Column({ type: 'varchar', nullable: true })
  clientPhone: string | null;

  @Column({ type: 'uuid', nullable: true })
  masterId: string | null;

  @Column({ type: 'varchar', nullable: true })
  masterName: string | null;

  @Column({ type: 'uuid', nullable: true })
  serviceId: string | null;

  @Column({ type: 'varchar', nullable: true })
  serviceName: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  servicePrice: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar' })
  timeSlot: string;

  @Column({ type: 'int', default: 60 })
  duration: number;

  @Column({ default: 'scheduled' })
  status: BeautyAppointmentStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  fee: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
