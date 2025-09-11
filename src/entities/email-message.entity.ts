import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

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

  /**
   * Full plain-text body (may be truncated when saving to DB).
   */
  @Column({ type: 'text', nullable: true })
  body?: string;

  /**
   * Short preview/snippet taken from Gmail's `message.snippet` or a truncated
   * version of the body. Used for fast list previews.
   */
  @Column({ type: 'varchar', length: 1000, nullable: true })
  snippet?: string;

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
}
