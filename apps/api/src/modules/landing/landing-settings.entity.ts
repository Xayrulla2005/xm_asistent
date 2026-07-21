import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('landing_settings')
export class LandingSettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, default: 'main' })
  key!: string;

  @Column({ type: 'jsonb', nullable: true })
  content!: Record<string, unknown> | null;

  @UpdateDateColumn()
  updatedAt!: Date;
}
