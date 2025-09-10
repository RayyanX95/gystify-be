import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AiSummaryService } from '../ai-summary/ai-summary.service';
import { DailySummary } from '../entities/daily-summary.entity';
import { EmailMessage } from '../entities/email-message.entity';

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);

  constructor(
    @InjectRepository(DailySummary)
    private dailySummaryRepository: Repository<DailySummary>,
    @InjectRepository(EmailMessage)
    private emailRepo: Repository<EmailMessage>,
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

    // fetch emails for the user (last 100)
    const emails = await this.emailRepo.find({
      where: { user: { id: userId } },
      order: { receivedAt: 'DESC' },
      take: 100,
    });

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

  /** Preview a summary without persisting */
  async previewSummary(
    userId: string,
  ): Promise<import('../ai-summary/ai-summary.service').DailySummaryResult> {
    const emails = await this.emailRepo.find({
      where: { user: { id: userId } },
      order: { receivedAt: 'DESC' },
      take: 50,
    });

    // Use ai service to create a short summary object
    const short = await this.aiSummaryService.generateDailySummary(emails);
    return short;
  }

  /** Expand a persisted daily summary with detailed AI output */
  async expandSummary(
    detailEmails: EmailMessage[],
    contextSummary?: string,
  ): Promise<Record<string, any>> {
    return this.aiSummaryService.generateDetailedSummary(
      detailEmails,
      contextSummary,
    );
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

    const emails = await this.emailRepo.find({
      where: {
        user: { id: summary.user.id },
        receivedAt: Between(startOfDay, endOfDay),
      },
      order: { receivedAt: 'DESC' },
      take: 10, // <-- Limit to 10 emails
    });

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
}
