import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Snapshot } from './snapshot.entity';
import { Sender } from './sender.entity';

/**
 * SnapshotItem Entity
 *
 * Represents an individual email summary within a snapshot.
 * Contains summary and metadata without storing full email body for privacy.
 * Each item corresponds to one unread email at the time of snapshot creation.
 */
@Entity('snapshot_items')
export class SnapshotItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'snapshot_id' })
  snapshotId: string;

  @Index()
  @Column({ name: 'sender_id' })
  senderId: string;

  /**
   * Email provider (currently "gmail", future: "outlook")
   */
  @Column({ name: 'provider', type: 'varchar', length: 50, default: 'gmail' })
  provider: string;

  /**
   * Gmail message ID for API operations (open, archive, delete)
   */
  @Column({ name: 'message_id', type: 'varchar', length: 255 })
  messageId: string;

  /**
   * Email subject line
   */
  @Column({ type: 'varchar', length: 500 })
  subject: string;

  /**
   * When the original email was sent
   */
  @Column({ name: 'email_date', type: 'timestamp' })
  date: Date;

  /**
   * AI-generated summary of the email content
   * This is the core value - concise summary without storing full body
   */
  @Column({ type: 'text' })
  summary: string;

  /**
   * Optional snippet from Gmail API for additional context
   */
  @Column({ type: 'varchar', length: 1000, nullable: true })
  snippet?: string;

  /**
   * Phase 1 Action: User marks item as "done" on snapshot
   * Non-destructive action - doesn't affect Gmail inbox
   */
  @Column({
    name: 'is_ignored_from_snapshots',
    type: 'boolean',
    default: false,
  })
  isIgnoredFromSnapshots: boolean;

  /**
   * Phase 1 Action: User removes email from Gmail inbox
   * Destructive action - requires confirmation, calls Gmail API
   */
  @Column({ name: 'is_removed_from_inbox', type: 'boolean', default: false })
  isRemovedFromInbox: boolean;

  /**
   * Direct link to open email in Gmail web interface
   */
  @Column({ name: 'open_url', type: 'varchar', length: 1000, nullable: true })
  openUrl?: string;

  /**
   * Attachments metadata (filename, mimeType, size)
   * Stored as JSON array for simplicity in Phase 1
   */
  @Column({ name: 'attachments_meta', type: 'jsonb', nullable: true })
  attachmentsMeta?: Array<{
    filename: string;
    mimeType: string;
    size: number;
  }>;

  /**
   * Phase 2: Smart categorization tags
   * e.g., ["Action Item", "FYI", "Newsletter", "Receipt"]
   */
  @Column({ name: 'category_tags', type: 'jsonb', nullable: true })
  categoryTags?: string[];

  /**
   * Phase 3: Priority scoring (0.00 to 1.00)
   */
  @Column({
    name: 'priority_score',
    type: 'decimal',
    precision: 3,
    scale: 2,
    nullable: true,
  })
  priorityScore?: number;

  /**
   * Phase 3: Human-readable priority label
   */
  @Column({
    name: 'priority_label',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  priorityLabel?: 'urgent' | 'high' | 'medium' | 'low';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Snapshot, (snapshot) => snapshot.items)
  @JoinColumn({ name: 'snapshot_id' })
  snapshot: Snapshot;

  @ManyToOne(() => Sender)
  @JoinColumn({ name: 'sender_id' })
  sender: Sender;
}
