import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DailySummary } from '../entities/daily-summary.entity';
import { MetricsDto } from 'src/dto/metrics.dto';

const DEFAULT_AI_PROCESSING_MS = 1800; // 1.8s fallback for AI processing when not recorded
const DEFAULT_BE_OVERHEAD_MS = 400; // 0.4s fallback for BE + network overhead
const ESTIMATED_MINUTES_SAVED_PER_EMAIL = 2.5; // conservative estimate

@Injectable()
export class MetricsService {
  constructor(
    @InjectRepository(DailySummary)
    private readonly summaryRepo: Repository<DailySummary>,
  ) {}

  async getMetrics(): Promise<MetricsDto> {
    // Sum total_emails across daily summaries to get the true number of emails processed
    // This avoids counting rows when one row can represent multiple emails for a day
    const sumRaw: { sum: string | null } | undefined = await this.summaryRepo
      .createQueryBuilder('s')
      .select('SUM(s.total_emails)', 'sum')
      .getRawOne();

    const emailsSummarized = sumRaw && sumRaw.sum ? Number(sumRaw.sum) : 0;

    // Compute average AI processing time per summary using aiProcessingTimeMs stored on DailySummary.
    // DailySummary.aiProcessingTimeMs is the total AI time spent generating that daily summary (ms)
    // We want average processing time per summary, which reflects what users experience when waiting for their summary.
    // SQL: AVG(ai_processing_time_ms)
    const avgAiPerSummaryRaw: { avgPerSummary: string | null } | undefined =
      await this.summaryRepo
        .createQueryBuilder('s')
        .select('AVG(s.ai_processing_time_ms)', 'avgPerSummary')
        .getRawOne();

    const avgAiPerSummaryMs =
      avgAiPerSummaryRaw && avgAiPerSummaryRaw.avgPerSummary
        ? Number(parseFloat(avgAiPerSummaryRaw.avgPerSummary))
        : DEFAULT_AI_PROCESSING_MS;

    const avgProcessingSec = Number(
      ((avgAiPerSummaryMs + DEFAULT_BE_OVERHEAD_MS) / 1000).toFixed(2),
    );

    const estimatedTimeSavedHours = +(
      emailsSummarized *
      (ESTIMATED_MINUTES_SAVED_PER_EMAIL / 60)
    ).toFixed(2);

    return {
      emailsSummarized,
      avgProcessingSec,
      estimatedTimeSavedHours,
      lastUpdated: new Date().toISOString(),
    };
  }
}
