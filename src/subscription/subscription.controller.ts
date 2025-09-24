import {
  Controller,
  Get,
  UseGuards,
  Req,
  Post,
  Param,
  Body,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import {
  SubscriptionStatusDto,
  PricingPlansResponseDto,
  UsageLimitsDto,
  StartTrialResponseDto,
  UpgradeResponseDto,
} from '../dto/subscription.dto';
import { User } from '../entities/user.entity';
import type { Request } from 'express';
import { AUTH_CONSTANTS } from '../auth/auth.constants';
import {
  SubscriptionTier,
  BillingCycle,
} from '../entities/subscription-plan.entity';

@Controller('subscription')
@ApiTags('Subscription')
@ApiBearerAuth()
@UseGuards(AuthGuard(AUTH_CONSTANTS.PASSPORT.DEFAULT_STRATEGY))
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get user subscription status and usage' })
  @ApiResponse({
    status: 200,
    description: 'Subscription status retrieved',
    type: SubscriptionStatusDto,
  })
  async getSubscriptionStatus(@Req() req: Request) {
    const user = req.user as User;
    return this.subscriptionService.getSubscriptionStatus(user.id);
  }

  @Get('plans')
  @ApiOperation({ summary: 'Get all available pricing plans' })
  @ApiResponse({
    status: 200,
    description: 'Pricing plans retrieved',
    type: PricingPlansResponseDto,
  })
  getPricingPlans() {
    return {
      plans: this.subscriptionService.getAllPricingPlans(),
    };
  }

  @Get('limits')
  @ApiOperation({ summary: 'Check user limits and usage' })
  @ApiResponse({
    status: 200,
    description: 'Usage limits retrieved',
    type: UsageLimitsDto,
  })
  async getUserLimits(@Req() req: Request) {
    const user = req.user as User;
    return this.subscriptionService.checkUsageLimits(user.id);
  }

  @Post('start-trial')
  @ApiOperation({ summary: 'Start free trial for user' })
  @ApiResponse({
    status: 200,
    description: 'Trial started successfully',
    type: StartTrialResponseDto,
  })
  async startTrial(@Req() req: Request) {
    const user = req.user as User;
    const savedUser = await this.subscriptionService.startFreeTrial(user);

    const startedAt = savedUser.trialStartedAt;
    const endsAt = savedUser.trialExpiresAt;
    const now = new Date();
    const daysRemaining = endsAt
      ? Math.max(
          0,
          Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        )
      : 0;

    return {
      message: 'Trial started successfully',
      trial: {
        startedAt,
        endsAt,
        daysRemaining,
      },
    };
  }

  @Post('upgrade/:tier')
  @ApiOperation({ summary: 'Upgrade user to a specific plan' })
  @ApiResponse({
    status: 200,
    description: 'Plan upgraded successfully',
    type: UpgradeResponseDto,
  })
  @ApiBody({
    description: 'Billing cycle preference',
    schema: {
      type: 'object',
      properties: {
        billingCycle: {
          type: 'string',
          enum: ['monthly', 'yearly'],
          default: 'monthly',
        },
      },
    },
  })
  async upgradePlan(
    @Req() req: Request,
    @Param('tier') tier: SubscriptionTier,
    @Body() body: { billingCycle?: BillingCycle },
  ) {
    const user = req.user as User;
    const billingCycle = body.billingCycle || BillingCycle.MONTHLY;

    const updatedUser = await this.subscriptionService.upgradeUserPlan(
      user.id,
      tier,
      billingCycle,
    );

    return {
      message: `Upgraded to ${tier} (${billingCycle}) successfully`,
      tier,
      billingCycle,
      effectiveAt: updatedUser.subscriptionStartedAt,
    };
  }
}
