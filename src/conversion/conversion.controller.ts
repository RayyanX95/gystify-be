/**
 * CONVERSION MODULE - FUTURE REFERENCE
 *
 * This module is kept for future implementation but disabled for MVP.
 *
 * Purpose: Provides UX-focused endpoints for conversion optimization:
 * - Contextual upgrade prompts based on user state
 * - User-friendly access checks with marketing messages
 * - A/B testing framework for conversion copy
 *
 * To enable: Uncomment ConversionModule in app.module.ts
 *
 * MVP Alternative: Use /subscription/status for basic upgrade checks
 */

import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { SubscriptionService } from '../subscription/subscription.service';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { User } from '../entities/user.entity';
import { SubscriptionTier } from '../entities/subscription-plan.entity';
import type { Request } from 'express';
import { AUTH_CONSTANTS } from '../auth/auth.constants';

@Controller('conversion')
@ApiTags('Conversion')
@ApiBearerAuth()
@UseGuards(AuthGuard(AUTH_CONSTANTS.PASSPORT.DEFAULT_STRATEGY))
export class ConversionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('check-access')
  @ApiOperation({
    summary: 'Check if user needs to upgrade to access features',
  })
  @ApiResponse({
    status: 200,
    description: 'Access check result',
    schema: {
      properties: {
        hasAccess: { type: 'boolean' },
        needsUpgrade: { type: 'boolean' },
        currentTier: { type: 'string' },
        availableOptions: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  async checkAccess(@Req() req: Request) {
    const user = req.user as User;
    const limits = await this.subscriptionService.checkUsageLimits(user.id);

    const needsUpgrade =
      user.subscriptionTier === SubscriptionTier.FREE ||
      !limits.hasActiveAccess;

    return {
      hasAccess: limits.hasActiveAccess,
      needsUpgrade,
      currentTier: user.subscriptionTier,
      availableOptions: needsUpgrade
        ? [
            'POST /subscription/start-trial',
            'POST /subscription/upgrade/starter',
            'POST /subscription/upgrade/pro',
          ]
        : [],
      message: needsUpgrade
        ? 'You need to start a trial or subscribe to create snapshots'
        : 'Access granted',
    };
  }

  @Get('upgrade-prompt')
  @ApiOperation({
    summary: 'Get contextual upgrade prompt based on user state',
  })
  @ApiResponse({ status: 200, description: 'Upgrade prompt data' })
  async getUpgradePrompt(@Req() req: Request) {
    const user = req.user as User;
    const limits = await this.subscriptionService.checkUsageLimits(user.id);

    let promptType = 'general';
    let message = '';
    let urgency = 'low';

    if (user.subscriptionTier === SubscriptionTier.FREE) {
      promptType = 'first_time';
      message =
        'Create your first AI email snapshot! Start with a free trial or subscribe now.';
      urgency = 'high';
    } else if (limits.isTrialExpired) {
      promptType = 'trial_expired';
      message =
        'Your trial has expired. Subscribe to continue creating snapshots.';
      urgency = 'high';
    } else if (
      user.subscriptionTier === SubscriptionTier.TRIAL &&
      (limits.totalSnapshotsUsed ?? 0) >= 8
    ) {
      promptType = 'trial_ending';
      message = `You've used ${limits.totalSnapshotsUsed ?? 0}/10 trial snapshots. Subscribe now to avoid interruption.`;
      urgency = 'medium';
    }

    return {
      promptType,
      message,
      urgency,
      currentUsage: {
        tier: user.subscriptionTier,
        snapshotsUsed: limits.totalSnapshotsUsed || limits.snapshotsUsedToday,
        emailsSummarized: limits.totalEmailsSummarized,
      },
      availablePlans: this.subscriptionService
        .getAllPricingPlans()
        .filter((plan) => plan.tier !== SubscriptionTier.TRIAL), // Don't show trial in upgrade prompts
    };
  }
}
