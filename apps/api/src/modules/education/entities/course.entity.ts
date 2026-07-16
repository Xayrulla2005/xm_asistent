import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('edu_courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  @Column({ nullable: true, type: 'uuid' })
  teacherId: string | null;

  @Column({ type: 'varchar', nullable: true })
  teacherName: string | null;

  @Column({ type: 'int', default: 0 })
  durationMonths: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  monthlyFee: number;

  @Column({ type: 'varchar', nullable: true })
  schedule: string | null;

  @Column({ type: 'varchar', nullable: true })
  level: string | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  maxStudents: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
