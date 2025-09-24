export enum SubscriptionTier {
  FREE = 'free', // New users, no access - must start trial or subscribe
  TRIAL = 'trial',
  STARTER = 'starter',
  PRO = 'pro',
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export interface PlanLimits {
  // Core limits
  maxSnapshotsPerDay: number;
  maxEmailsPerSnapshot: number;
  snapshotRetentionDays: number;

  // Trial specific
  totalSnapshotsAllowed?: number; // Only for trial

  // Feature access
  canUseOutlookIntegration: boolean;
  canExportToProductivityTools: boolean;
  canUseAdvancedCategorization: boolean;
  canUsePriorityScoring: boolean;
  canUseCustomAIProfiles: boolean;
  hasApiAccess: boolean;
  hasPrioritySupport: boolean;
  hasTeamCollaboration: boolean;
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, PlanLimits> = {
  [SubscriptionTier.FREE]: {
    maxSnapshotsPerDay: 0, // No access - must upgrade
    maxEmailsPerSnapshot: 0,
    snapshotRetentionDays: 3,
    canUseOutlookIntegration: false,
    canExportToProductivityTools: false,
    canUseAdvancedCategorization: false,
    canUsePriorityScoring: false,
    canUseCustomAIProfiles: false,
    hasApiAccess: false,
    hasPrioritySupport: false,
    hasTeamCollaboration: false,
  },
  [SubscriptionTier.TRIAL]: {
    maxSnapshotsPerDay: 3, // Limited to encourage upgrade
    maxEmailsPerSnapshot: 15, // More generous than competitor
    snapshotRetentionDays: 3,
    totalSnapshotsAllowed: 21, // 3 per day × 7 days = 21 total
    canUseOutlookIntegration: false,
    canExportToProductivityTools: false,
    canUseAdvancedCategorization: false,
    canUsePriorityScoring: false,
    canUseCustomAIProfiles: false,
    hasApiAccess: false,
    hasPrioritySupport: false,
    hasTeamCollaboration: false,
  },
  [SubscriptionTier.STARTER]: {
    maxSnapshotsPerDay: 999, // Unlimited - only new emails processed
    maxEmailsPerSnapshot: 50,
    snapshotRetentionDays: 3,
    canUseOutlookIntegration: false,
    canExportToProductivityTools: false,
    canUseAdvancedCategorization: true,
    canUsePriorityScoring: true,
    canUseCustomAIProfiles: false,
    hasApiAccess: false,
    hasPrioritySupport: false,
    hasTeamCollaboration: false,
  },
  [SubscriptionTier.PRO]: {
    maxSnapshotsPerDay: 999, // Unlimited
    maxEmailsPerSnapshot: 200,
    snapshotRetentionDays: 3,
    canUseOutlookIntegration: true,
    canExportToProductivityTools: true,
    canUseAdvancedCategorization: true,
    canUsePriorityScoring: true,
    canUseCustomAIProfiles: true,
    hasApiAccess: false,
    hasPrioritySupport: false,
    hasTeamCollaboration: false,
  },
};

export interface PlanPricing {
  tier: SubscriptionTier;
  name: string;
  description: string;
  monthlyPrice: number; // in cents
  yearlyPrice: number; // in cents
  features: string[];
  isPopular?: boolean;
}

export const PRICING_PLANS: PlanPricing[] = [
  {
    tier: SubscriptionTier.TRIAL,
    name: 'Free Trial',
    description: '7-day free trial - No credit card required',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      '3 snapshots per day for 7 days',
      'Up to 25 emails per snapshot',
      'Advanced AI summaries',
      'Gmail integration',
      '3-day snapshot history',
      'No credit card required',
    ],
  },
  {
    tier: SubscriptionTier.STARTER,
    name: 'Starter',
    description: 'Perfect for individuals managing moderate email volume',
    monthlyPrice: 700, // $7.00 - match competitor exactly
    yearlyPrice: 7500, // $75.00 (11% discount - slightly less than competitor)
    features: [
      'Unlimited snapshots',
      'Up to 50 emails per snapshot',
      'Advanced AI summaries',
      'Email categorization',
      'Priority scoring',
      '3-day snapshot history',
    ],
  },
  {
    tier: SubscriptionTier.PRO,
    name: 'Pro',
    description: 'For power users and professionals with high email volume',
    monthlyPrice: 1000, // $10.00 - same as competitor
    yearlyPrice: 10000, // $100.00 (17% discount)
    isPopular: true,
    features: [
      'Unlimited snapshots',
      'Up to 200 emails per snapshot',
      'Priority AI processing',
      'Gmail + Outlook integration',
      'Export to productivity tools',
      'Custom AI profiles',
      '3-day snapshot history',
    ],
  },
];
