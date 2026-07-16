import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: true, type: 'varchar' })
  tenantId!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  tenantName!: string | null;

  /** CREATE | UPDATE | DELETE | LOGIN | LOGOUT | EXPORT | IMPORT | … */
  @Column({ type: 'varchar' })
  action!: string;

  /** sale | product | customer | employee | branch | tenant | auth | … */
  @Column({ nullable: true, type: 'varchar' })
  entity!: string | null;

  /** UUID / PK of the affected record */
  @Column({ nullable: true, type: 'varchar' })
  entityId!: string | null;

  /** Human-readable: receipt number, name, title, etc. */
  @Column({ nullable: true, type: 'varchar' })
  entityLabel!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  actorEmail!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  actorRole!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  ipAddress!: string | null;

  /** State / payload BEFORE the change (request body for UPDATE) */
  @Column({ type: 'jsonb', nullable: true })
  before!: Record<string, unknown> | null;

  /** State / response body AFTER the change */
  @Column({ type: 'jsonb', nullable: true })
  after!: Record<string, unknown> | null;

  /** Extra info: http method, url, etc. */
  @Column({ type: 'jsonb', nullable: true })
  meta!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
