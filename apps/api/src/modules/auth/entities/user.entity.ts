import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum UserRole {
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ type: 'varchar', default: UserRole.USER })
  role: UserRole;

  @Column({ nullable: true, type: 'varchar' })
  firstName: string | null;

  @Column({ nullable: true, type: 'varchar' })
  lastName: string | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true, type: 'uuid' })
  createdBy: string | null;

  @Column({ nullable: true, type: 'uuid' })
  tenantId: string | null;

  @Column({ nullable: true, type: 'text' })
  refreshToken: string | null;

  @Column({ nullable: true, type: 'text' })
  sessionToken: string | null;

  @Column({ nullable: true, unique: true, type: 'varchar' })
  googleId!: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
