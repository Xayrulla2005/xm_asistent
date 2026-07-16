import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('edu_students')
export class Student {
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
  parentPhone: string | null;

  @Column({ nullable: true, type: 'uuid' })
  courseId: string | null;

  @Column({ type: 'varchar', nullable: true })
  courseName: string | null;

  @Column({ type: 'varchar', nullable: true })
  group: string | null;

  @Column({ type: 'varchar', nullable: true })
  level: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  monthlyFee: number;

  @Column({ default: 'active' })
  status: string;

  @Column({ nullable: true, type: 'date' })
  enrolledAt: string | null;

  @Column({ nullable: true, type: 'text' })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
