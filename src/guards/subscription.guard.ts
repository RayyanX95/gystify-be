import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { SubscriptionService } from '../subscription/subscription.service';
import type { Request } from 'express';
import { User } from '../entities/user.entity';

/**
 * Guard to check if user has access to specific subscription features
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private subscriptionService: SubscriptionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as User;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Basic check - just ensure user has active access
    const limits = await this.subscriptionService.checkUsageLimits(user.id);

    if (!limits.hasActiveAccess) {
      // Priority 1: Check if user has an expired paid subscription
      if (limits.isSubscriptionExpired) {
        throw new ForbiddenException(
          'Subscription has expired. Please renew to continue.',
        );
      }
      // Priority 2: Check if user is on trial and it's expired
      if (limits.isTrialExpired) {
        throw new ForbiddenException(
          'Trial period has expired. Please upgrade to continue.',
        );
      }
      // Priority 3: No subscription at all
      throw new ForbiddenException('No active subscription found.');
    }

    return true;
  }
}

/**
 * Guard to check snapshot creation limits before allowing snapshot creation
 */
@Injectable()
export class SnapshotLimitsGuard implements CanActivate {
  constructor(private subscriptionService: SubscriptionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as User;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const limits = await this.subscriptionService.checkUsageLimits(user.id);

    if (!limits.canCreateSnapshot) {
      // Priority 1: Check if user has an expired paid subscription
      if (limits.isSubscriptionExpired) {
        throw new ForbiddenException(
          'Subscription has expired. Please renew to continue.',
        );
      }
      // Priority 2: Check if user is on trial and it's expired
      if (limits.isTrialExpired) {
        throw new ForbiddenException(
          'Trial period has expired. Please upgrade to continue creating snapshots.',
        );
      }
      // Priority 3: Check general access (FREE tier users)
      if (!limits.hasActiveAccess) {
        throw new ForbiddenException('No active subscription found.');
      }
      // Priority 4: Daily limits reached
      throw new ForbiddenException(
        `Daily snapshot limit reached (${limits.snapshotsUsedToday}/${
          limits.snapshotsUsedToday + limits.snapshotsRemainingToday
        }). Upgrade your plan for more snapshots.`,
      );
    }

    return true;
  }
}
