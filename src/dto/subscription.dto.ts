import { ApiProperty } from '@nestjs/swagger';
export class TrialInfoDto {
  @ApiProperty({ type: String, format: 'date-time' }) startedAt: Date;
  @ApiProperty({ type: String, format: 'date-time' }) endsAt: Date;
  @ApiProperty() daysRemaining: number;
}
export class UsageStatsDto {
  @ApiProperty() snapshotsUsedToday: number;
  @ApiProperty() snapshotsRemainingToday: number;
  @ApiProperty() emailsSummarizedToday: number;
  @ApiProperty() totalEmailsSummarized: number;
  @ApiProperty() totalSnapshotsCreated: number;
  @ApiProperty() maxEmailsAllowed: number;
}

export class SubscriptionStatusDto {
  @ApiProperty() tier: string;
  @ApiProperty({ required: false }) name?: string;
  @ApiProperty() isTrialActive: boolean;
  @ApiProperty() isSubscriptionActive: boolean;
  @ApiProperty() hasActiveAccess: boolean;
  @ApiProperty({ required: false, type: String }) trialExpiresAt?: Date;
  @ApiProperty({ required: false, type: String }) subscriptionExpiresAt?: Date;
  @ApiProperty({ type: UsageStatsDto }) usage: UsageStatsDto;
}

// Pricing DTOs
export class PlanPricingDto {
  @ApiProperty() tier: string;
  @ApiProperty() name: string;
  @ApiProperty() description: string;
  @ApiProperty() monthlyPrice: number;
  @ApiProperty() yearlyPrice: number;
  @ApiProperty({ type: [String] }) features: string[];
  @ApiProperty({ required: false }) isPopular?: boolean;
}

export class PricingPlansResponseDto {
  @ApiProperty({ type: [PlanPricingDto] }) plans: PlanPricingDto[];
}

// Usage limits DTO (matches SubscriptionService.UsageLimitsCheck)
export class UsageLimitsDto {
  @ApiProperty() canCreateSnapshot: boolean;
  @ApiProperty() canProcessEmails: boolean;
  @ApiProperty() maxEmailsAllowed: number;
  @ApiProperty() snapshotsUsedToday: number;
  @ApiProperty() snapshotsRemainingToday: number;
  @ApiProperty() emailsSummarizedToday: number;
  @ApiProperty() totalEmailsSummarized: number;
  @ApiProperty({ required: false }) totalSnapshotsUsed?: number;
  @ApiProperty({ required: false }) totalSnapshotsAllowed?: number;
  @ApiProperty() isTrialExpired: boolean;
  @ApiProperty() isSubscriptionExpired: boolean;
  @ApiProperty() hasActiveAccess: boolean;
}

export class StartTrialResponseDto {
  @ApiProperty() message: string;
  @ApiProperty({ type: TrialInfoDto }) trial: TrialInfoDto;
}

export class UpgradeResponseDto {
  @ApiProperty() message: string;
  @ApiProperty() tier: string;
  @ApiProperty() billingCycle: string;
  @ApiProperty({ required: false, type: String }) effectiveAt?: Date;
}
