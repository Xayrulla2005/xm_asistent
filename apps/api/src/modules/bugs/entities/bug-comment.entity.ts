import {
  Column, CreateDateColumn, Entity,
  ManyToOne, JoinColumn, PrimaryGeneratedColumn,
} from 'typeorm';
import { Bug } from '../bug.entity';

@Entity('bug_comments')
export class BugComment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  bugId!: string;

  @ManyToOne(() => Bug, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bugId' })
  bug!: Bug;

  @Column({ type: 'varchar', nullable: true })
  authorEmail!: string | null;

  @Column({ type: 'text' })
  body!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
