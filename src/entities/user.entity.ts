import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SubscriptionTier, BillingCycle } from './subscription-plan.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'google_id', unique: true })
  googleId: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ name: 'profile_picture', nullable: true })
  profilePicture?: string;

  @Column({ name: 'gmail_refresh_token', nullable: true })
  gmailRefreshToken?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Subscription & billing fields
  @Column({
    name: 'subscription_tier',
    type: 'enum',
    enum: SubscriptionTier,
    default: SubscriptionTier.FREE,
  })
  subscriptionTier: SubscriptionTier;

  @Column({
    name: 'billing_cycle',
    type: 'enum',
    enum: BillingCycle,
    nullable: true,
  })
  billingCycle?: BillingCycle;

  @Column({ name: 'trial_started_at', nullable: true })
  trialStartedAt?: Date;

  @Column({ name: 'trial_expires_at', nullable: true })
  trialExpiresAt?: Date;

  @Column({ name: 'subscription_started_at', nullable: true })
  subscriptionStartedAt?: Date;

  @Column({ name: 'subscription_expires_at', nullable: true })
  subscriptionExpiresAt?: Date;

  @Column({ name: 'stripe_customer_id', nullable: true })
  stripeCustomerId?: string;

  @Column({ name: 'stripe_subscription_id', nullable: true })
  stripeSubscriptionId?: string;

  // Usage tracking
  @Column({ name: 'snapshots_created_today', default: 0 })
  snapshotsCreatedToday: number;

  @Column({ name: 'total_snapshots_created', default: 0 })
  totalSnapshotsCreated: number;

  @Column({ name: 'emails_summarized_today', default: 0 })
  emailsSummarizedToday: number;

  @Column({ name: 'total_emails_summarized', default: 0 })
  totalEmailsSummarized: number;

  @Column({ name: 'last_snapshot_date', nullable: true })
  lastSnapshotDate?: Date;

  @Column({ name: 'last_usage_reset_date', nullable: true })
  lastUsageResetDate?: Date;

  // Computed properties
  get isTrialActive(): boolean {
    return (
      this.subscriptionTier === SubscriptionTier.TRIAL &&
      !!this.trialExpiresAt &&
      new Date() < this.trialExpiresAt
    );
  }

  get isSubscriptionActive(): boolean {
    return (
      this.subscriptionTier !== SubscriptionTier.TRIAL &&
      (!this.subscriptionExpiresAt || new Date() < this.subscriptionExpiresAt)
    );
  }

  get hasActiveAccess(): boolean {
    // FREE tier users have no access - must start trial or subscribe
    return (
      (this.isTrialActive || this.isSubscriptionActive) &&
      this.subscriptionTier !== SubscriptionTier.FREE
    );
  }
}
