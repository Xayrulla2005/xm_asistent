import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('edu_payments')
export class EduPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  studentId: string | null;

  @Column({ default: '' })
  studentName: string;

  @Column({ type: 'uuid', nullable: true })
  courseId: string | null;

  @Column({ default: '' })
  courseName: string;

  @Column({ type: 'varchar' })
  month: string; // YYYY-MM

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ default: 'pending' })
  status: string; // pending | paid | partial | overdue

  @Column({ type: 'varchar', nullable: true })
  paidAt: string | null;

  @Column({ type: 'varchar', nullable: true })
  paymentMethod: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
