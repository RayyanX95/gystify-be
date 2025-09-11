import { Injectable, Logger } from '@nestjs/common';
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
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: simplified assign for POC
        user: { id: userId },
      });

      return this.dailySummaryRepository.save(daily);
    }
  }

  /** Expand a daily summary by ID - fetch emails for that date and generate detailed report */
  async expandSummaryById(
    summaryId: string,
    contextSummary?: string,
  ): Promise<Record<string, any>> {
    // Fetch the daily summary
    const summary = await this.dailySummaryRepository.findOne({
      where: { id: summaryId },
      relations: ['user'],
    });

    if (!summary) {
      throw new Error(`Daily summary with ID ${summaryId} not found`);
    }

    // Get all emails for that user on the summary date
    const startOfDay = new Date(summary.summaryDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // Fetch emails from provider for the summary date (no DB persistence)
    const user = summary.user;
    const emails = await this.emailService.fetchGmailMessagesNoPersistBetween(
      user,
      startOfDay,
      endOfDay,
      50,
    );

    if (emails.length === 0) {
      throw new Error(
        `No emails found for summary date ${summary.summaryDate.toISOString()}`,
      );
    }

    return this.aiSummaryService.generateDetailedSummary(
      emails,
      contextSummary,
    );
  }

  async getDailySummary(userId: string, limit: number) {
    return this.dailySummaryRepository.find({
      where: { user: { id: userId } },
      order: { summaryDate: 'DESC' },
      take: limit || 10,
    });
  }
}
