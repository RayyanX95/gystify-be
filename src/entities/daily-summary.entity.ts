import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  // Unique,
} from 'typeorm';
import { User } from './user.entity';

@Entity('daily_summaries')
// TODO: Re-enable this constraint after ensuring no duplicates exist
// @Unique(['user', 'summaryDate']) // Ensure one summary per user per day
export class DailySummary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: true })
  title: string;

  @Column({ name: 'summary_date', type: 'date' })
  summaryDate: Date;

  @Column({ name: 'total_emails' })
  totalEmails: number;

  @Column({ name: 'ai_processing_time_ms', type: 'float', nullable: true })
  aiProcessingTimeMs?: number;

  @Column({ name: 'important_emails' })
  importantEmails: number;

  @Column({ type: 'text' })
  summary: string;

  @Column({ name: 'key_insights', type: 'text', nullable: true })
  keyInsights?: string;

  // Essential aggregated metrics for enhanced calculations
  @Column({ name: 'total_size_bytes', type: 'bigint', nullable: true })
  totalSizeBytes?: number;

  @Column({
    name: 'avg_priority_score',
    type: 'decimal',
    precision: 3,
    scale: 2,
    nullable: true,
  })
  avgPriorityScore?: number;

  @Column({ name: 'high_priority_emails', type: 'int', nullable: true })
  highPriorityEmails?: number;

  @Column({ name: 'promotional_emails', type: 'int', nullable: true })
  promotionalEmails?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
