import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { SnapshotItem } from './snapshot-item.entity';

/**
 * Snapshot Entity
 *
 * Represents a daily snapshot containing summaries of unread emails.
 * Business rule: One snapshot per user per day maximum.
 * Privacy: All snapshots are hard-deleted after 72 hours.
 */
@Entity('snapshots')
export class Snapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Owner of this snapshot
   */
  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  /**
   * Date when this snapshot was created (YYYY-MM-DD format)
   * Used to enforce "one snapshot per user per day" business rule
   */
  @Index()
  @Column({ name: 'snapshot_date', type: 'date' })
  snapshotDate: Date;

  /**
   * Total number of snapshot items (emails) in this snapshot
   * Max 50 per BRD, but could be less if user has fewer unread emails
   */
  @Column({ name: 'total_items', type: 'int', default: 0 })
  totalItems: number;

  /**
   * When this snapshot expires and will be hard-deleted for privacy
   * Set to 72 hours from creation time
   */
  @Column({ name: 'retention_expires_at', type: 'timestamp' })
  retentionExpiresAt: Date;

  /**
   * Metadata about snapshot creation process
   * Used for debugging and future optimization
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    processingTimeMs?: number;
    emailProvider?: string;
    scopeType?: 'recent' | 'days';
    scopeValue?: number; // e.g., 50 for "50 most recent"
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => SnapshotItem, (item) => item.snapshot)
  items: SnapshotItem[];
}
