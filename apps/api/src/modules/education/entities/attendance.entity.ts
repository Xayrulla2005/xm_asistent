import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('edu_attendance')
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  studentId: string | null;

  @Column({ type: 'varchar', nullable: true })
  studentName: string | null;

  @Column({ nullable: true, type: 'uuid' })
  courseId: string | null;

  @Column({ type: 'varchar', nullable: true })
  courseName: string | null;

  @Column({ type: 'date' })
  date: string;

  @Column({ default: 'present' })
  status: string;

  @Column({ nullable: true, type: 'text' })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
