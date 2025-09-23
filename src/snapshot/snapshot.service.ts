import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Snapshot, SnapshotItem, Sender, User } from '../entities';
import { EmailService } from '../email/email.service';
import { AiSummaryService } from '../ai-summary/ai-summary.service';
import { SubscriptionService } from '../subscription/subscription.service';
import {
  SnapshotResponseDto,
  SnapshotWithItemsResponseDto,
  SnapshotItemResponseDto,
  SenderResponseDto,
  CreateSnapshotResponseDto,
} from './dto';
import { GmailMessageDto } from 'src/dto/email.dto';
import { gmail_v1 } from 'googleapis';
import { isTrustedDomain } from 'src/email/email.utils';
import { MAX_EMAILS_FOR_SUMMARY } from 'src/config';

@Injectable()
export class SnapshotService {
  constructor(
    @InjectRepository(Snapshot)
    private snapshotRepository: Repository<Snapshot>,
    @InjectRepository(SnapshotItem)
    private snapshotItemRepository: Repository<SnapshotItem>,
    @InjectRepository(Sender)
    private senderRepository: Repository<Sender>,
    private emailService: EmailService,
    private aiSummaryService: AiSummaryService,
    private subscriptionService: SubscriptionService,
  ) {}

  /**
   * Get all user's snapshots
   */
  async getUserSnapshots(userId: string): Promise<SnapshotResponseDto[]> {
    const snapshots = await this.snapshotRepository.find({
      where: { userId },
      relations: ['items'], // Load items to calculate priority counts
      order: { createdAt: 'DESC' },
    });

    return snapshots.map((snapshot) => this.mapToSnapshotDto(snapshot));
  }

  /**
   * Get specific snapshot with all items and sender details
   */
  async getSnapshotWithItems(
    userId: string,
    snapshotId: string,
  ): Promise<SnapshotWithItemsResponseDto> {
    const snapshot = await this.snapshotRepository.findOne({
      where: { id: snapshotId, userId },
      relations: ['items', 'items.sender'],
    });

    if (!snapshot) {
      throw new NotFoundException('Snapshot not found');
    }

    return {
      ...this.mapToSnapshotDto(snapshot),
      // eslint-disable-next-line @typescript-eslint/unbound-method
      items: snapshot.items.map(this.mapToSnapshotItemDto),
    };
  }

  /**
   * Create new snapshot with unread emails
   */
  async createSnapshot(user: User): Promise<CreateSnapshotResponseDto> {
    try {
      // Check subscription limits and increment usage
      await this.subscriptionService.incrementSnapshotUsage(user.id);

      // Get user's plan limits to know how many emails to process
      const limits = await this.subscriptionService.checkUsageLimits(user.id);
      const emailLimit = Math.min(
        limits.maxEmailsAllowed,
        MAX_EMAILS_FOR_SUMMARY,
      );

      // Get unread emails from EmailService
      const unreadEmails = await this.emailService.fetchGmailMessages(
        user,
        emailLimit,
      );

      if (!unreadEmails || unreadEmails.length === 0) {
        return {
          success: false,
          message: 'No new unread emails found.',
        };
      }

      // Check for existing processed emails to avoid duplicates
      const existingMessageIds = await this.getExistingMessageIds(user.id);
      // Filter out emails that are already processed
      const newEmails = unreadEmails.filter(
        (email) => !existingMessageIds.includes(email.messageId),
      );

      if (newEmails.length === 0) {
        return {
          success: false,
          message:
            'No new unread emails to process. All recent emails are already in existing snapshots.',
        };
      }

      // Create snapshot
      const snapshot = await this.createSnapshotRecord(user.id);

      // Process emails and create snapshot items
      const snapshotItems = await this.processEmailsToItems(
        newEmails,
        snapshot.id,
        user.id,
      );

      if (snapshotItems.length === 0) {
        return {
          success: false,
          message:
            'No new unread emails to process. All recent emails are already in existing snapshots.',
        };
      }

      // Update snapshot total items
      snapshot.totalItems = snapshotItems.length;
      await this.snapshotRepository.save(snapshot);

      // Track email summarization usage
      await this.subscriptionService.incrementEmailSummarization(
        user.id,
        snapshotItems.length,
      );

      return {
        success: true,
        message: `Successfully created snapshot with ${snapshotItems.length} email summaries.`,
        snapshot: {
          id: snapshot.id,
          totalItems: snapshot.totalItems,
          newEmailsProcessed: newEmails.length,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `Failed to create snapshot: ${error.message}`,
      );
    }
  }

  /**
   * Create snapshot record
   */
  private async createSnapshotRecord(userId: string): Promise<Snapshot> {
    const snapshot = this.snapshotRepository.create({
      userId,
      snapshotDate: new Date(),
      totalItems: 0,
      retentionExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours
      metadata: {
        scopeType: 'recent',
        scopeValue: 50,
      },
    });

    return await this.snapshotRepository.save(snapshot);
  }

  /**
   * Process emails into snapshot items
   */
  private async processEmailsToItems(
    emails: GmailMessageDto[],
    snapshotId: string,
    userId: string,
  ): Promise<SnapshotItem[]> {
    const snapshotItems: SnapshotItem[] = [];

    for (const email of emails) {
      // Get or create sender
      const senderData = {
        name: email.sender,
        email: email.senderEmail,
      };
      const sender = await this.getOrCreateSender(userId, senderData);

      const message = (email.body || email.snippet) as string;
      // Generate summary using AI service
      const summary =
        await this.aiSummaryService.generateEmailSnapshot(message);

      if (!summary || summary.content.length === 0) {
        // Skip if summary is empty
        continue;
      }

      // Calculate importance using existing rule-based logic
      const importanceResult = this.calculateEnhancedImportance(
        email.labelIds || [],
        [], // Headers not available in GmailMessageDto, using empty array
        email.senderEmail,
        email.sizeEstimate || 0,
      );

      // Create snapshot item
      const snapshotItem = this.snapshotItemRepository.create({
        snapshotId,
        senderId: sender.id,
        messageId: email.messageId,
        subject: email.subject,
        date: email.date,
        summary: summary.content,
        finishReason: summary.finishReason,
        snippet: email.snippet,
        openUrl: `https://mail.google.com/mail/u/0/#inbox/${email.messageId}`,
        attachmentsMeta: email.attachments || [],

        // Add importance scoring
        priorityScore: importanceResult.score,
        priorityLabel: this.scoreToPriorityLabel(importanceResult.score),
      });

      const savedItem = await this.snapshotItemRepository.save(snapshotItem);
      snapshotItems.push(savedItem);
    }

    return snapshotItems;
  }

  /**
   * Get or create sender record
   */
  private async getOrCreateSender(
    userId: string,
    senderData: { name: string; email: string },
  ): Promise<Sender> {
    let sender = await this.senderRepository.findOne({
      where: { userId, emailAddress: senderData.email },
    });

    if (!sender) {
      const domain = senderData.email.split('@')[1];
      sender = this.senderRepository.create({
        userId,
        name: senderData.name,
        emailAddress: senderData.email,
        domain,
        totalEmails: 1,
      });
    } else {
      sender.totalEmails += 1;
    }

    return await this.senderRepository.save(sender);
  }

  /**
   * Get existing message IDs to avoid duplicates
   */
  private async getExistingMessageIds(userId: string): Promise<string[]> {
    const items = await this.snapshotItemRepository
      .createQueryBuilder('item')
      .innerJoin('item.snapshot', 'snapshot')
      .where('snapshot.userId = :userId', { userId })
      .select('item.messageId')
      .getMany();

    return items.map((item) => item.messageId);
  }

  /**
   * Map snapshot entity to DTO
   */
  private mapToSnapshotDto(snapshot: Snapshot): SnapshotResponseDto {
    // Calculate priority counts if items are loaded
    const priorityCounts = snapshot.items
      ? this.calculatePriorityCounts(snapshot.items)
      : undefined;

    return {
      id: snapshot.id,
      snapshotDate: snapshot.snapshotDate.toString(),
      totalItems: snapshot.totalItems,
      retentionExpiresAt: snapshot.retentionExpiresAt,
      createdAt: snapshot.createdAt,
      priorityCounts,
    };
  }

  /**
   * Map snapshot item entity to DTO
   */
  private mapToSnapshotItemDto(item: SnapshotItem): SnapshotItemResponseDto {
    return {
      id: item.id,
      messageId: item.messageId,
      subject: item.subject,
      summary: item.summary,
      finishReason: item.finishReason,
      snippet: item.snippet,
      date: item.date,
      openUrl: item.openUrl,
      isIgnoredFromSnapshots: item.isIgnoredFromSnapshots,
      isRemovedFromInbox: item.isRemovedFromInbox,
      // Metadata
      attachmentsMeta: item.attachmentsMeta,
      // Importance scoring (now populated)
      categoryTags: item.categoryTags,
      priorityScore: item.priorityScore,
      priorityLabel: item.priorityLabel,
      // Sender details for UI
      sender: {
        id: item.sender.id,
        name: item.sender.name,
        emailAddress: item.sender.emailAddress,
        domain: item.sender.domain,
      } as SenderResponseDto,
      createdAt: item.createdAt,
    };
  }

  private calculateEnhancedImportance(
    labelIds: string[] = [],
    headers: gmail_v1.Schema$MessagePartHeader[] = [],
    senderEmail: string = '',
    sizeEstimate: number = 0,
  ): { isImportant: boolean; score: number; factors: string[] } {
    const labels = new Set(labelIds.map((s) => s.toUpperCase()));
    const factors: string[] = [];
    let score = 0.5; // base score

    // Gmail labels
    if (labels.has('IMPORTANT')) {
      score = Math.max(score, 1.0);
      factors.push('marked-important');
    }
    if (labels.has('STARRED')) {
      score = Math.max(score, 0.85);
      factors.push('starred');
    }

    // Category adjustments
    if (labels.has('CATEGORY_PROMOTIONS')) {
      score = Math.min(score, 0.3);
      factors.push('promotional');
    } else if (labels.has('CATEGORY_UPDATES')) {
      score = Math.min(score, 0.4);
      factors.push('updates');
    } else if (labels.has('CATEGORY_PERSONAL')) {
      score = Math.max(score, 0.7);
      factors.push('personal');
    }

    // Header-based importance
    const findHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value;

    const importance = findHeader('Importance')?.toLowerCase();
    const priority = findHeader('Priority')?.toLowerCase();
    const xPriority = findHeader('X-Priority');

    if (importance === 'high' || priority === 'urgent') {
      score = Math.max(score, 0.8);
      factors.push('high-priority-header');
    }

    if (xPriority && /^[1-2]/.test(xPriority)) {
      score = Math.max(score, 0.9);
      factors.push('x-priority-high');
    }

    // Trusted domain bonus
    if (isTrustedDomain(senderEmail)) {
      score = Math.min(score + 0.1, 1.0);
      factors.push('trusted-domain');
    }

    // Size consideration (very large emails might be important)
    if (sizeEstimate > 50000) {
      score = Math.min(score + 0.05, 1.0);
      factors.push('large-email');
    }

    return {
      isImportant: score >= 0.6,
      score: Math.round(score * 100) / 100,
      factors,
    };
  }

  /**
   * Convert numeric score to priority label (matches SnapshotItem entity enum)
   */
  private scoreToPriorityLabel(
    score: number,
  ): 'urgent' | 'high' | 'medium' | 'low' {
    if (score >= 0.85) return 'urgent';
    if (score >= 0.7) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  /**
   * Calculate priority level counts from snapshot items
   */
  private calculatePriorityCounts(items: SnapshotItem[]): {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  } {
    const counts = { urgent: 0, high: 0, medium: 0, low: 0 };

    items.forEach((item) => {
      const priority = item.priorityLabel || 'low';
      counts[priority]++;
    });

    return counts;
  }
}
