import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Sender Entity
 *
 * Stores unique senders per user for efficient UI filtering and future personalization.
 * Each user has their own set of senders to avoid cross-user data leakage.
 */
@Entity('senders')
@Unique(['userId', 'emailAddress']) // Ensures unique sender per user
export class Sender {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  /**
   * Display name of the sender (e.g., "John Doe", "GitHub", "LinkedIn")
   * Extracted from email's "From" field
   */
  @Column({ name: 'sender_name', type: 'varchar', length: 255 })
  name: string;

  /**
   * Email address of the sender
   * Used for unique constraint and Gmail API operations
   */
  @Column({ name: 'email_address', type: 'varchar', length: 255 })
  emailAddress: string;

  /**
   * Domain extracted from email address (e.g., "gmail.com", "github.com")
   * Used for future categorization and trusted domain detection
   */
  @Column({ name: 'domain', type: 'varchar', length: 255 })
  domain: string;

  /**
   * Track total emails received from this sender
   * Foundation for Phase 6 personalization features
   */
  @Column({ name: 'total_emails', type: 'int', default: 1 })
  totalEmails: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
