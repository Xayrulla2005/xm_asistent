import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum GeneratedCrmStatus {
  ACTIVE = 'active',
  OUTDATED = 'outdated',
}

@Entity('generated_crms')
export class GeneratedCrm {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  tenantId: string;

  @Column({ type: 'jsonb' })
  config: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: GeneratedCrmStatus,
    default: GeneratedCrmStatus.ACTIVE,
  })
  status: GeneratedCrmStatus;

  @CreateDateColumn()
  createdAt: Date;
}
