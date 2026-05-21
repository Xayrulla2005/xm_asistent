import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum Industry {
  RETAIL = 'retail',
  CLINIC = 'clinic',
  EDUCATION = 'education',
  RESTAURANT = 'restaurant',
}

export enum WizardStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
}

@Entity('wizard_configs')
export class WizardConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  tenantId: string;

  @Column({ type: 'enum', enum: Industry })
  industry: Industry;

  @Column({ type: 'jsonb', default: [] })
  modules: string[];

  @Column({ type: 'jsonb', default: [] })
  roles: string[];

  @Column({ type: 'jsonb', default: {} })
  dashboard: { widgets?: string[] };

  @Column({ type: 'jsonb', default: {} })
  receipt: { fields?: string[]; width?: string; thankYouText?: string };

  @Column({ type: 'jsonb', default: {} })
  theme: { shopName?: string; address?: string; phone?: string; primaryColor?: string; logo?: string; style?: string; darkMode?: boolean };

  @Column({ type: 'jsonb', default: {} })
  permissions: Record<string, string[]>;

  @Column({ type: 'enum', enum: WizardStatus, default: WizardStatus.DRAFT })
  status: WizardStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
