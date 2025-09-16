import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DailySummary } from '../entities/daily-summary.entity';
import { MetricsDto } from 'src/dto/metrics.dto';

const DEFAULT_AI_PROCESSING_MS = 1800; // 1.8s fallback for AI processing when not recorded (milliseconds)
const DEFAULT_BE_OVERHEAD_MS = 400; // 0.4s fallback for BE + network overhead (milliseconds)

// Enhanced time savings calculations based on email metadata
const BASE_MINUTES_PER_EMAIL = 2.0; // Base reading time per email (minutes)
const HIGH_PRIORITY_MULTIPLIER = 1.8; // High-priority emails take more time to process (multiplier)
const PROMOTIONAL_TIME_REDUCTION = 0.6; // Promotional emails are quickly skipped (multiplier)
const SIZE_FACTOR = 0.000025; // Additional time per byte: 25ms per KB (seconds per byte)

@Injectable()
export class MetricsService {
  constructor(
    @InjectRepository(DailySummary)
    private readonly summaryRepo: Repository<DailySummary>,
  ) {}

  async getMetrics(userId: string): Promise<MetricsDto> {
    // Sum total_emails across daily summaries for this specific user
    // This avoids counting rows when one row can represent multiple emails for a day
    const sumRaw: { sum: string | null } | undefined = await this.summaryRepo
      .createQueryBuilder('s')
      .select('SUM(s.total_emails)', 'sum')
      .where('s.user_id = :userId', { userId })
      .getRawOne();

    const emailsSummarized = sumRaw && sumRaw.sum ? Number(sumRaw.sum) : 0;

    // Compute average AI processing time per summary for this user using aiProcessingTimeMs stored on DailySummary.
    // DailySummary.aiProcessingTimeMs is the total AI time spent generating that daily summary (ms)
    // We want average processing time per summary, which reflects what users experience when waiting for their summary.
    // SQL: AVG(ai_processing_time_ms) WHERE user_id = userId
    const avgAiPerSummaryRaw: { avgPerSummary: string | null } | undefined =
      await this.summaryRepo
        .createQueryBuilder('s')
        .select('AVG(s.ai_processing_time_ms)', 'avgPerSummary')
        .where('s.user_id = :userId', { userId })
        .getRawOne();

    const avgAiPerSummaryMs =
      avgAiPerSummaryRaw && avgAiPerSummaryRaw.avgPerSummary
        ? Number(parseFloat(avgAiPerSummaryRaw.avgPerSummary))
        : DEFAULT_AI_PROCESSING_MS; // milliseconds

    const avgProcessingSec = Number(
      ((avgAiPerSummaryMs + DEFAULT_BE_OVERHEAD_MS) / 1000).toFixed(2), // convert ms to seconds
    );

    // Enhanced time saved calculation using email metadata
    const enhancedTimeSaved = await this.calculateEnhancedTimeSaved(userId);

    return {
      emailsSummarized,
      avgProcessingSec,
      estimatedTimeSavedHours: Number(enhancedTimeSaved),
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Calculate enhanced time savings using email metadata like size, priority, and categories
   */
  private async calculateEnhancedTimeSaved(userId: string): Promise<string> {
    // Get aggregated metadata from all daily summaries
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const metadataQuery: any = await this.summaryRepo
      .createQueryBuilder('s')
      .select([
        'SUM(s.total_emails) as totalEmails',
        'SUM(s.total_size_bytes) as totalSizeBytes',
        'AVG(s.avg_priority_score) as avgPriorityScore',
        'SUM(s.high_priority_emails) as highPriorityEmails',
        'SUM(s.promotional_emails) as promotionalEmails',
      ])
      .where('s.user_id = :userId', { userId })
      .getRawOne();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!metadataQuery || !metadataQuery.totalEmails) {
      return '0.00';
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const totalEmails = Number(metadataQuery.totalEmails);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const totalSizeBytes = Number(metadataQuery.totalSizeBytes || 0);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const highPriorityEmails = Number(metadataQuery.highPriorityEmails || 0);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const promotionalEmails = Number(metadataQuery.promotionalEmails || 0);

    // Calculate enhanced time per email based on metadata
    let totalTimeSavedMinutes = 0; // minutes

    // High priority emails (save more time when summarized)
    const highPriorityTime =
      highPriorityEmails * BASE_MINUTES_PER_EMAIL * HIGH_PRIORITY_MULTIPLIER; // minutes

    // Regular emails (remaining emails after high priority and promotional)
    const regularEmails = totalEmails - highPriorityEmails - promotionalEmails;
    const regularTime = regularEmails * BASE_MINUTES_PER_EMAIL; // minutes

    // Promotional emails (save less time as they're often skipped anyway)
    const promotionalTime =
      promotionalEmails * BASE_MINUTES_PER_EMAIL * PROMOTIONAL_TIME_REDUCTION; // minutes

    // Size-based adjustment (larger emails take more time to process)
    const avgSizePerEmail = totalEmails > 0 ? totalSizeBytes / totalEmails : 0; // bytes
    const sizeBasedTimeMinutes =
      (avgSizePerEmail * SIZE_FACTOR * totalEmails) / 60; // convert seconds to minutes

    totalTimeSavedMinutes =
      highPriorityTime + regularTime + promotionalTime + sizeBasedTimeMinutes; // minutes

    return (totalTimeSavedMinutes / 60).toFixed(2); // convert minutes to hours
  }
}
