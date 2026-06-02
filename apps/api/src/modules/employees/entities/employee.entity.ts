import {
  Column, CreateDateColumn, Entity,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';

export enum EmployeeRole {
  ADMIN     = 'admin',
  MANAGER   = 'manager',
  CASHIER   = 'cashier',
  WAREHOUSE = 'warehouse',
}

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ type: 'enum', enum: EmployeeRole, default: EmployeeRole.CASHIER })
  role: EmployeeRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ nullable: true, type: 'text' })
  sessionToken: string | null;

  @Column({ nullable: true, type: 'text' })
  refreshToken: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
