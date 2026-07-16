import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('otp_records')
@Index(['key', 'type'], { unique: true })
export class OtpRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  key: string; // email or phone number

  @Column()
  type: string; // 'email' | 'phone'

  @Column({ nullable: true, type: 'varchar' })
  code: string | null;

  @Column({ nullable: true, type: 'timestamptz' })
  expiresAt: Date | null;

  @Column({ default: 0 })
  attempts: number;

  @Column({ nullable: true, type: 'timestamptz' })
  lockedUntil: Date | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
