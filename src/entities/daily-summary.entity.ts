import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';

@Entity('daily_summaries')
@Unique(['user', 'summaryDate']) // Ensure one summary per user per day
export class DailySummary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'summary_date', type: 'date' })
  summaryDate: Date;

  @Column({ name: 'total_emails' })
  totalEmails: number;

  @Column({ name: 'important_emails' })
  importantEmails: number;

  @Column({ type: 'text' })
  summary: string;

  @Column({ name: 'key_insights', type: 'text', nullable: true })
  keyInsights?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
