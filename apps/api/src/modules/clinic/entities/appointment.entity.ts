import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

@Entity('clinic_appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ nullable: true, type: 'uuid' })
  patientId: string | null;

  @Column({ type: 'varchar', nullable: true })
  patientName: string | null;

  @Column({ nullable: true, type: 'uuid' })
  doctorId: string | null;

  @Column({ type: 'varchar', nullable: true })
  doctorName: string | null;

  @Column({ type: 'varchar', nullable: true })
  specialty: string | null;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'time' })
  time: string;

  @Column({ type: 'int', default: 30 })
  duration: number;

  @Column({ type: 'varchar', nullable: true })
  type: string | null;

  @Column({ default: 'scheduled' })
  status: AppointmentStatus;

  @Column({ nullable: true, type: 'text' })
  notes: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  fee: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
