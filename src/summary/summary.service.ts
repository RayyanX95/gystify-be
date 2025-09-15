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

@Injectable()
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
  async generateAndPersist(userId: string): Promise<DailySummary> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of day for consistent comparison

      // Check if summary already exists for today
      const existingSummary = await this.dailySummaryRepository.findOne({
        where: {
          user: { id: userId },
          summaryDate: today,
        },
      });

      // fetch emails for the user from Gmail directly (no DB persistence)
      const user = await this.userService.findById(userId);
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      const emails = await this.emailService.fetchGmailMessagesNoPersist(
        user,
        10,
      );

      const aiResult = await this.aiSummaryService.generateDailySummary(emails);

      if (existingSummary) {
        // Update existing summary
        this.dailySummaryRepository.merge(existingSummary, {
          totalEmails: aiResult.totalEmails,
          importantEmails: aiResult.importantEmails,
          summary: aiResult.summary,
          keyInsights: aiResult.keyInsights,
          aiProcessingTimeMs: aiResult.aiProcessingTimeMs,
        });
        return this.dailySummaryRepository.save(existingSummary);
      } else {
        // Create new summary
        const daily = this.dailySummaryRepository.create({
          summaryDate: today,
          totalEmails: aiResult.totalEmails,
          importantEmails: aiResult.importantEmails,
          summary: aiResult.summary,
          keyInsights: aiResult.keyInsights,
          aiProcessingTimeMs: aiResult.aiProcessingTimeMs,
          user: { id: userId },
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
        50,
      );

      if (emails.length === 0) {
        throw new BadRequestException(
          `No emails found for summary date ${new Date(summary.summaryDate).toISOString()}`,
        );
      }

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
}
