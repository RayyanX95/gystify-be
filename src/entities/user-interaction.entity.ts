import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { SnapshotItem } from './snapshot-item.entity';

/**
 * UserInteraction Entity
 *
 * Tracks all user actions on snapshot items for analytics and KPIs.
 * Critical for understanding user behavior and future AI personalization.
 * Retained longer than snapshots for learning patterns.
 */
@Entity('user_interactions')
export class UserInteraction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @Index()
  @Column({ name: 'snapshot_item_id' })
  snapshotItemId: string;

  /**
   * Type of action taken on the snapshot item
   * Phase 1 actions: 'mark_ignored', 'remove_inbox', 'open_email'
   */
  @Column({ name: 'action_type', type: 'varchar', length: 50 })
  actionType: 'mark_ignored' | 'remove_inbox' | 'open_email';

  /**
   * When the action was performed
   * Used for KPI tracking and user behavior analysis
   */
  @CreateDateColumn({ name: 'action_at' })
  actionAt: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => SnapshotItem)
  @JoinColumn({ name: 'snapshot_item_id' })
  snapshotItem: SnapshotItem;
}
