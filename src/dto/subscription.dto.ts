export class UsageStatsDto {
  snapshotsUsedToday: number;
  snapshotsRemainingToday: number;
  emailsSummarizedToday: number;
  totalEmailsSummarized: number;
  totalSnapshotsCreated: number;
  maxEmailsAllowed: number;
}

export class SubscriptionStatusDto {
  tier: string;
  name?: string;
  isTrialActive: boolean;
  isSubscriptionActive: boolean;
  hasActiveAccess: boolean;
  trialExpiresAt?: Date;
  subscriptionExpiresAt?: Date;
  usage: UsageStatsDto;
}
