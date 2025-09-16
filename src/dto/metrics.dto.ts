export class MetricsDto {
  emailsSummarized: number;
  avgProcessingSec: number;
  estimatedTimeSavedHours: number; // Enhanced with size and priority-based calculations
  lastUpdated: string; // ISO timestamp
}
