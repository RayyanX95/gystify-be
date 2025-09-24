import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import {
  SubscriptionTier,
  PlanLimits,
  SUBSCRIPTION_PLANS,
  PRICING_PLANS,
  PlanPricing,
  BillingCycle,
} from '../entities/subscription-plan.entity';
import { SubscriptionStatusDto, UsageStatsDto } from '../dto/subscription.dto';

export interface UsageLimitsCheck {
  canCreateSnapshot: boolean;
  canProcessEmails: boolean;
  maxEmailsAllowed: number;
  snapshotsUsedToday: number;
  snapshotsRemainingToday: number;
  emailsSummarizedToday: number;
  totalEmailsSummarized: number;
  totalSnapshotsUsed?: number; // For trial users
  totalSnapshotsAllowed?: number; // For trial users
  isTrialExpired: boolean;
  isSubscriptionExpired: boolean;
  hasActiveAccess: boolean;
}

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Get plan limits for a user's current subscription tier
   */
  getPlanLimits(tier: SubscriptionTier): PlanLimits {
    return SUBSCRIPTION_PLANS[tier];
  }

  /**
   * Get pricing information for all plans
   */
  getAllPricingPlans(): PlanPricing[] {
    return PRICING_PLANS;
  }

  /**
   * Get pricing information for a specific tier
   */
  getPlanPricing(tier: SubscriptionTier): PlanPricing | undefined {
    return PRICING_PLANS.find((plan) => plan.tier === tier);
  }

  /**
   * Check if user has access to a specific feature
   */
  hasFeatureAccess(user: User, feature: keyof PlanLimits): boolean {
    const limits = this.getPlanLimits(user.subscriptionTier);
    return limits[feature] as boolean;
  }

  /**
   * Start free trial for a new user
   */
  async startFreeTrial(user: User): Promise<User> {
    const trialStartedAt = new Date();
    const trialExpiresAt = new Date();
    trialExpiresAt.setDate(trialStartedAt.getDate() + 7); // 7-day trial

    user.subscriptionTier = SubscriptionTier.TRIAL;
    user.trialStartedAt = trialStartedAt;
    user.trialExpiresAt = trialExpiresAt;
    user.snapshotsCreatedToday = 0;
    user.totalSnapshotsCreated = 0;
    user.emailsSummarizedToday = 0;
    user.totalEmailsSummarized = 0;
    user.lastUsageResetDate = trialStartedAt;

    await this.userRepository.save(user);
    this.logger.log(`Started free trial for user ${user.id}`);
    return user;
  }

  /**
   * Check comprehensive usage limits for a user
   */
  async checkUsageLimits(userId: string): Promise<UsageLimitsCheck> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const limits = this.getPlanLimits(user.subscriptionTier);
    const now = new Date();

    // Reset daily counters if needed
    await this.resetDailyUsageIfNeeded(user);

    // Check if trial/subscription is expired
    const isTrialExpired =
      user.subscriptionTier === SubscriptionTier.TRIAL &&
      !!user.trialExpiresAt &&
      now >= user.trialExpiresAt;

    const isSubscriptionExpired =
      user.subscriptionTier !== SubscriptionTier.TRIAL &&
      !!user.subscriptionExpiresAt &&
      now >= user.subscriptionExpiresAt;

    const hasActiveAccess =
      user.hasActiveAccess && !isTrialExpired && !isSubscriptionExpired;

    // For trial users, check total snapshot limit
    let canCreateSnapshot = hasActiveAccess;
    if (
      user.subscriptionTier === SubscriptionTier.TRIAL &&
      limits.totalSnapshotsAllowed
    ) {
      canCreateSnapshot =
        canCreateSnapshot &&
        user.totalSnapshotsCreated < limits.totalSnapshotsAllowed;
    }

    // Check daily snapshot limits
    if (limits.maxSnapshotsPerDay !== 999) {
      // 999 = unlimited
      canCreateSnapshot =
        canCreateSnapshot &&
        user.snapshotsCreatedToday < limits.maxSnapshotsPerDay;
    }

    return {
      canCreateSnapshot,
      canProcessEmails: hasActiveAccess,
      maxEmailsAllowed: limits.maxEmailsPerSnapshot,
      snapshotsUsedToday: user.snapshotsCreatedToday,
      snapshotsRemainingToday:
        limits.maxSnapshotsPerDay === 999
          ? 999
          : Math.max(0, limits.maxSnapshotsPerDay - user.snapshotsCreatedToday),
      emailsSummarizedToday: user.emailsSummarizedToday,
      totalEmailsSummarized: user.totalEmailsSummarized,
      totalSnapshotsUsed: user.totalSnapshotsCreated,
      totalSnapshotsAllowed: limits.totalSnapshotsAllowed,
      isTrialExpired,
      isSubscriptionExpired,
      hasActiveAccess,
    };
  }

  /**
   * Increment snapshot usage for a user
   */
  async incrementSnapshotUsage(userId: string): Promise<void> {
    const limits = await this.checkUsageLimits(userId);

    if (!limits.canCreateSnapshot) {
      if (limits.isTrialExpired) {
        throw new ForbiddenException(
          'Trial period has expired. Please upgrade to continue.',
        );
      }
      if (limits.isSubscriptionExpired) {
        throw new ForbiddenException(
          'Subscription has expired. Please renew to continue.',
        );
      }
      if (!limits.hasActiveAccess) {
        throw new ForbiddenException('No active subscription found.');
      }
      throw new ForbiddenException(
        'Daily snapshot limit reached. Upgrade your plan for more snapshots.',
      );
    }

    await this.userRepository.increment(
      { id: userId },
      'snapshotsCreatedToday',
      1,
    );
    await this.userRepository.increment(
      { id: userId },
      'totalSnapshotsCreated',
      1,
    );

    // Update last snapshot date
    await this.userRepository.update(
      { id: userId },
      { lastSnapshotDate: new Date() },
    );
  }

  /**
   * Increment email summarization usage for a user
   */
  async incrementEmailSummarization(
    userId: string,
    emailCount: number,
  ): Promise<void> {
    await this.userRepository.increment(
      { id: userId },
      'emailsSummarizedToday',
      emailCount,
    );
    await this.userRepository.increment(
      { id: userId },
      'totalEmailsSummarized',
      emailCount,
    );
  }

  /**
   * Upgrade user to a paid plan
   */
  async upgradeUserPlan(
    userId: string,
    newTier: SubscriptionTier,
    billingCycle: BillingCycle = BillingCycle.MONTHLY,
    stripeCustomerId?: string,
    stripeSubscriptionId?: string,
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const subscriptionStartedAt = new Date();
    const subscriptionExpiresAt = new Date();

    // Calculate expiration based on billing cycle
    if (billingCycle === BillingCycle.YEARLY) {
      subscriptionExpiresAt.setFullYear(
        subscriptionExpiresAt.getFullYear() + 1,
      );
    } else {
      subscriptionExpiresAt.setMonth(subscriptionExpiresAt.getMonth() + 1);
    }

    user.subscriptionTier = newTier;
    user.subscriptionStartedAt = subscriptionStartedAt;
    user.subscriptionExpiresAt = subscriptionExpiresAt;

    if (stripeCustomerId) {
      user.stripeCustomerId = stripeCustomerId;
    }
    if (stripeSubscriptionId) {
      user.stripeSubscriptionId = stripeSubscriptionId;
    }

    await this.userRepository.save(user);
    this.logger.log(`Upgraded user ${user.id} to ${newTier} (${billingCycle})`);
    return user;
  }

  /**
   * Reset daily usage counters if a new day has started
   */
  private async resetDailyUsageIfNeeded(user: User): Promise<void> {
    const now = new Date();
    const today = now.toDateString();
    const lastResetDate = user.lastUsageResetDate?.toDateString();

    if (lastResetDate !== today) {
      await this.userRepository.update(
        { id: user.id },
        {
          snapshotsCreatedToday: 0,
          emailsSummarizedToday: 0,
          lastUsageResetDate: now,
        },
      );
      user.snapshotsCreatedToday = 0;
      user.emailsSummarizedToday = 0;
      user.lastUsageResetDate = now;
    }
  }

  /**
   * Get user's subscription status and usage
   */
  async getSubscriptionStatus(userId: string): Promise<SubscriptionStatusDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const limits = await this.checkUsageLimits(userId);
    const planPricing = this.getPlanPricing(user.subscriptionTier);

    const usage: UsageStatsDto = {
      snapshotsUsedToday: limits.snapshotsUsedToday,
      snapshotsRemainingToday: limits.snapshotsRemainingToday,
      emailsSummarizedToday: limits.emailsSummarizedToday,
      totalEmailsSummarized: limits.totalEmailsSummarized,
      totalSnapshotsCreated: user.totalSnapshotsCreated,
      maxEmailsAllowed: limits.maxEmailsAllowed,
    };

    const status: SubscriptionStatusDto = {
      tier: user.subscriptionTier,
      name: planPricing?.name,
      isTrialActive:
        user.subscriptionTier === SubscriptionTier.TRIAL &&
        !limits.isTrialExpired,
      isSubscriptionActive:
        user.subscriptionTier !== SubscriptionTier.TRIAL &&
        !limits.isSubscriptionExpired,
      hasActiveAccess: limits.hasActiveAccess,
      trialExpiresAt: user.trialExpiresAt,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      usage,
    };

    return status;
  }
}
