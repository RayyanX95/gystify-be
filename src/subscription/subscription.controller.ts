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
  @ApiResponse({ status: 200, description: 'Subscription status retrieved' })
  async getSubscriptionStatus(@Req() req: Request) {
    const user = req.user as User;
    return this.subscriptionService.getSubscriptionStatus(user.id);
  }

  @Get('plans')
  @ApiOperation({ summary: 'Get all available pricing plans' })
  @ApiResponse({ status: 200, description: 'Pricing plans retrieved' })
  getPricingPlans() {
    return {
      plans: this.subscriptionService.getAllPricingPlans(),
    };
  }

  @Get('limits')
  @ApiOperation({ summary: 'Check user limits and usage' })
  @ApiResponse({ status: 200, description: 'Usage limits retrieved' })
  async getUserLimits(@Req() req: Request) {
    const user = req.user as User;
    return this.subscriptionService.checkUsageLimits(user.id);
  }

  @Post('start-trial')
  @ApiOperation({ summary: 'Start free trial for user' })
  @ApiResponse({ status: 200, description: 'Trial started successfully' })
  async startTrial(@Req() req: Request) {
    const user = req.user as User;
    await this.subscriptionService.startFreeTrial(user);
    return { message: 'Trial started successfully' };
  }

  @Post('upgrade/:tier')
  @ApiOperation({ summary: 'Upgrade user to a specific plan' })
  @ApiResponse({ status: 200, description: 'Plan upgraded successfully' })
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

    await this.subscriptionService.upgradeUserPlan(user.id, tier, billingCycle);

    return {
      message: `Upgraded to ${tier} (${billingCycle}) successfully`,
      tier,
      billingCycle,
    };
  }
}
