import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailService } from '../email/email.service';
import { UserService } from '../user/user.service';
import { AiSummaryService } from '../ai-summary/ai-summary.service';
import { DailySummary } from '../entities/daily-summary.entity';
// import {
//   getMockDailySummary,
//   getMockDetailedSummary,
// } from './summary.utils';
import { GmailMessageDto } from '../dto/email.dto';
import { MAX_EMAILS_FOR_SUMMARY } from 'src/configs';

@Injectable()
/**
 * SummaryService handles daily summary generation and retrieval.
 * Currently using mock data to conserve OpenAI API quota during development.
 * TODO: Re-enable AI functionality when ready for production.
 */
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);

  constructor(
    @InjectRepository(DailySummary)
    private dailySummaryRepository: Repository<DailySummary>,
    private emailService: EmailService,
    private userService: UserService,
    private aiSummaryService: AiSummaryService,
  ) {}

  /**
   * Generate a daily summary from recent emails for the given user and persist it.
   * Uses upsert logic - updates existing summary for the date or creates new one.
   */
  async generateDailySumary(userId: string): Promise<DailySummary> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of day for consistent comparison

      // TODO: Re-enable this check to prevent duplicate summaries
      // Check if summary already exists for today
      // const existingSummary = await this.dailySummaryRepository.findOne({
      //   where: {
      //     user: { id: userId },
      //     summaryDate: today,
      //   },
      // });

      // fetch emails for the user from Gmail directly (no DB persistence)
      const user = await this.userService.findById(userId);
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      const emails = await this.emailService.fetchGmailMessagesNoPersist(
        user,
        MAX_EMAILS_FOR_SUMMARY,
      );

      // TODO: Temporarily using mock data to save OpenAI API quota
      // const aiResult = getMockDailySummary(emails);
      const aiResult = await this.aiSummaryService.generateDailySummary(emails);

      console.log('object :>> ', aiResult);

      // Calculate enhanced metrics from email metadata
      const enhancedMetrics = this.calculateEmailMetrics(emails);

      // TODO: Enable this check as it should prevent duplicate summaries when TESTING is DONE
      // eslint-disable-next-line no-constant-condition
      if (false) {
        // Update existing summary
        // this.dailySummaryRepository.merge(existingSummary, {
        //   totalEmails: aiResult.totalEmails,
        //   importantEmails: aiResult.importantEmails,
        //   summary: aiResult.summary,
        //   keyInsights: aiResult.keyInsights,
        //   aiProcessingTimeMs: aiResult.aiProcessingTimeMs,
        //   ...enhancedMetrics,
        // });
        // return this.dailySummaryRepository.save(existingSummary);
      } else {
        // Create new summary
        const daily = this.dailySummaryRepository.create({
          title: aiResult.title,
          summaryDate: today,
          totalEmails: aiResult.totalEmails,
          importantEmails: aiResult.importantEmails,
          summary: aiResult.summary,
          keyInsights: aiResult.keyInsights,
          aiProcessingTimeMs: aiResult.aiProcessingTimeMs,
          user: { id: userId },
          ...enhancedMetrics,
        });

        return this.dailySummaryRepository.save(daily);
      }
    } catch (error) {
      this.logger.error(
        'Error generating and persisting daily summary:',
        error,
      );

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        // Re-throw HTTP exceptions as-is
        throw error;
      }

      // Convert AI service errors or other errors to proper HTTP errors
      if (
        error instanceof Error &&
        error.message.includes('Failed to generate daily summary')
      ) {
        throw new InternalServerErrorException(error.message);
      }

      // Generic fallback for unexpected errors
      throw new InternalServerErrorException(
        'Failed to generate daily summary due to an unexpected error',
      );
    }
  }

  /** Expand a daily summary by ID - fetch emails for that date and generate detailed report */
  async expandSummaryById(
    summaryId: string,
    contextSummary?: string,
  ): Promise<Record<string, any>> {
    try {
      // Fetch the daily summary
      const summary = await this.dailySummaryRepository.findOne({
        where: { id: summaryId },
        relations: ['user'],
      });

      if (!summary) {
        throw new NotFoundException(
          `Daily summary with ID ${summaryId} not found`,
        );
      }

      // Fetch emails from provider for the summary date (no DB persistence)
      const user = summary.user;
      const emails = await this.emailService.fetchGmailMessagesNoPersist(
        user,
        MAX_EMAILS_FOR_SUMMARY,
      );

      if (emails.length === 0) {
        throw new BadRequestException(
          `No emails found for summary date ${new Date(summary.summaryDate).toISOString()}`,
        );
      }

      // TODO: Temporarily using mock data to save OpenAI API quota
      // return getMockDetailedSummary(emails, contextSummary);
      return await this.aiSummaryService.generateDetailedSummary(
        emails,
        contextSummary,
      );
    } catch (error) {
      this.logger.error('Error expanding summary by ID:', error);

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        // Re-throw HTTP exceptions as-is
        throw error;
      }

      // Convert AI service errors or other errors to proper HTTP errors
      if (
        error instanceof Error &&
        error.message.includes('Failed to generate detailed summary')
      ) {
        throw new InternalServerErrorException(error.message);
      }

      // Generic fallback for unexpected errors
      throw new InternalServerErrorException(
        'Failed to expand summary due to an unexpected error',
      );
    }
  }

  async getDailySummary(userId: string, limit: number) {
    try {
      return await this.dailySummaryRepository.find({
        where: { user: { id: userId } },
        order: { summaryDate: 'DESC' },
        take: limit || 10,
      });
    } catch (error) {
      this.logger.error('Error fetching daily summaries:', error);

      throw new InternalServerErrorException('Failed to fetch daily summaries');
    }
  }

  /**
   * Calculate essential metrics from email metadata for enhanced time/efficiency calculations
   */
  private calculateEmailMetrics(emails: GmailMessageDto[]) {
    // Calculate total size for processing time correlation
    const totalSize = emails.reduce((sum, e) => sum + (e.sizeEstimate || 0), 0);

    // Calculate average priority for importance-weighted time savings
    const priorityScores = emails.map((e) => e.priorityScore || 0.5);
    const avgPriority =
      priorityScores.reduce((sum, score) => sum + score, 0) /
      Math.max(priorityScores.length, 1);

    // Count high-priority emails (these save more time when summarized)
    const highPriorityCount = emails.filter(
      (e) => (e.priorityScore || 0.5) > 0.6,
    ).length;

    // Count promotional emails (these save less time as they're often skipped)
    const promotionalCount = emails.filter(
      (e) => e.category === 'PROMOTIONS',
    ).length;

    return {
      totalSizeBytes: totalSize,
      avgPriorityScore: Math.round(avgPriority * 100) / 100,
      highPriorityEmails: highPriorityCount,
      promotionalEmails: promotionalCount,
    };
  }
}
