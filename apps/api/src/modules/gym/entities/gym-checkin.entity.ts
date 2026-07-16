import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('gym_checkins')
export class GymCheckIn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'uuid' })
  memberId: string;

  @Column()
  memberName: string;

  @Column({ type: 'varchar', nullable: true })
  note: string | null;

  @CreateDateColumn()
  checkedAt: Date;
}
