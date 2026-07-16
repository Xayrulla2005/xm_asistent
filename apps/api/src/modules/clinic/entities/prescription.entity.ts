import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export interface PrescriptionItem {
  medicineId:   string;
  medicineName: string;
  dosage:       string;
  frequency:    string;
  days:         number;
  notes?:       string;
}

@Entity('clinic_prescriptions')
export class Prescription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  patientId: string | null;

  @Column({ default: '' })
  patientName: string;

  @Column({ type: 'uuid', nullable: true })
  doctorId: string | null;

  @Column({ default: '' })
  doctorName: string;

  @Column({ type: 'varchar' })
  date: string;

  @Column({ type: 'jsonb', default: [] })
  items: PrescriptionItem[];

  @Column({ type: 'varchar', nullable: true })
  diagnosis: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ default: 'active' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}
