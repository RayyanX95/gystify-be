import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, DailySummary } from '../entities';
import { EmailService } from '../email/email.service';
import { AiSummaryService } from '../ai-summary/ai-summary.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(DailySummary)
    private dailySummaryRepository: Repository<DailySummary>,
    private emailService: EmailService,
    private aiSummaryService: AiSummaryService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async syncEmailsForAllUsers() {
    this.logger.log('Starting hourly email sync for all users');

    const users = await this.userRepository.find({
      where: { isActive: true },
    });

    const activeUsers = users.filter((user) => user.gmailRefreshToken);

    for (const user of activeUsers) {
      try {
        await this.emailService.fetchGmailMessagesNoPersist(user, 10);
        this.logger.log(`Synced emails for user ${user.email}`);
      } catch (error) {
        this.logger.error(
          `Error syncing emails for user ${user.email}:`,
          error,
        );
      }
    }

    this.logger.log('Completed hourly email sync');
  }

  @Cron('0 8 * * *') // Daily at 8 AM
  async generateDailySummaries() {
    this.logger.log('Starting daily summary generation');

    const users = await this.userRepository.find({
      where: { isActive: true },
    });

    // const today = new Date();
    // const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    // const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    for (const user of users) {
      try {
        // Get yesterday's emails
        // const emails = await this.emailService.findByUserId(user.id, 100);
        // const yesterdayEmails = emails.filter(
        //   (email) =>
        //     email.receivedAt >= startOfDay && email.receivedAt <= endOfDay,
        // );

        // if (yesterdayEmails.length === 0) {
        //   this.logger.log(`No emails to summarize for user ${user.email}`);
        //   continue;
        // }

        // Generate AI summary
        // const summaryResult =
        //   await this.aiSummaryService.generateDailySummary(yesterdayEmails);

        // // Save daily summary
        // const dailySummary = this.dailySummaryRepository.create({
        //   user,
        //   summaryDate: startOfDay,
        //   totalEmails: summaryResult.totalEmails,
        //   importantEmails: summaryResult.importantEmails,
        //   summary: summaryResult.summary,
        //   keyInsights: summaryResult.keyInsights,
        // });

        // await this.dailySummaryRepository.save(dailySummary);
        this.logger.log(`Generated daily summary for user ${user.email}`);
      } catch (error) {
        this.logger.error(
          `Error generating daily summary for user ${user.email}:`,
          error,
        );
      }
    }

    this.logger.log('Completed daily summary generation');
  }

  @Cron('0 9 * * *') // Daily at 9 AM
  async summarizeNewEmails() {
    this.logger.log('Starting AI email summarization');

    const users = await this.userRepository.find({
      where: { isActive: true },
    });

    for (const user of users) {
      try {
        // // Get unsummarized emails
        // const emails = await this.emailService.findByUserId(user.id, 10);
        // const unsummarizedEmails = emails.filter((email) => !email.summary);
        // for (const email of unsummarizedEmails) {
        //   try {
        //     const summaryResult =
        //       await this.aiSummaryService.summarizeEmail(email);
        //     await this.emailService.updateEmailSummary(
        //       email.id,
        //       summaryResult.summary,
        //       summaryResult.priorityScore,
        //     );
        //     this.logger.debug(`Summarized email ${email.id}`);
        //   } catch (error) {
        //     this.logger.error(`Error summarizing email ${email.id}:`, error);
        //   }
        // }
        // this.logger.log(
        //   `Summarized ${unsummarizedEmails.length} emails for user ${user.email}`,
        // );
      } catch (error) {
        this.logger.error(
          `Error in email summarization for user ${user.email}:`,
          error,
        );
      }
    }

    this.logger.log('Completed AI email summarization');
  }
}
