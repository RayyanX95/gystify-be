import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('email_messages')
export class EmailMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'gmail_id', unique: true })
  gmailId: string;

  @Column({ name: 'thread_id' })
  threadId: string;

  @Column()
  subject: string;

  @Column()
  sender: string;

  @Column({ name: 'sender_email' })
  senderEmail: string;

  @Column({ type: 'text' })
  // store a plain-text snippet (max 1000 chars) instead of full HTML body
  @Column({ type: 'varchar', length: 1000, nullable: true })
  body?: string;

  @Column({ name: 'received_at' })
  receivedAt: Date;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'is_important', default: false })
  isImportant: boolean;

  @Column({
    name: 'priority_score',
    type: 'decimal',
    precision: 3,
    scale: 2,
    nullable: true,
  })
  priorityScore?: number;

  @Column({ type: 'text', nullable: true })
  summary?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.emailMessages)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
