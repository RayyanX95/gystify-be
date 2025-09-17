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
import {
  SnapshotResponseDto,
  SnapshotWithItemsResponseDto,
  SnapshotItemResponseDto,
  SenderResponseDto,
  CreateSnapshotResponseDto,
} from './dto';
import { GmailMessageDto } from 'src/dto/email.dto';
import { MAX_EMAILS_FOR_SUMMARY } from 'src/configs';

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
  ) {}

  /**
   * Get all user's snapshots
   */
  async getUserSnapshots(userId: string): Promise<SnapshotResponseDto[]> {
    const snapshots = await this.snapshotRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    return snapshots.map(this.mapToSnapshotDto);
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
      // Get unread emails from EmailService
      const unreadEmails = await this.emailService.fetchGmailMessages(
        user,
        MAX_EMAILS_FOR_SUMMARY,
      );

      if (!unreadEmails || unreadEmails.length === 0) {
        return {
          success: false,
          message: 'No new unread emails found.',
        };
      }

      // Check for existing processed emails to avoid duplicates
      const existingMessageIds = await this.getExistingMessageIds(user.id);
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

      // Update snapshot total items
      snapshot.totalItems = snapshotItems.length;
      await this.snapshotRepository.save(snapshot);

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

      // Create snapshot item
      const snapshotItem = this.snapshotItemRepository.create({
        snapshotId,
        senderId: sender.id,
        messageId: email.messageId,
        subject: email.subject,
        date: email.date,
        summary,
        snippet: email.snippet,
        openUrl: `https://mail.google.com/mail/u/0/#inbox/${email.messageId}`,
        attachmentsMeta: email.attachments || [],
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
    return {
      id: snapshot.id,
      snapshotDate: snapshot.snapshotDate.toString(),
      totalItems: snapshot.totalItems,
      retentionExpiresAt: snapshot.retentionExpiresAt,
      createdAt: snapshot.createdAt,
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
      snippet: item.snippet,
      date: item.date,
      openUrl: item.openUrl,
      isIgnoredFromSnapshots: item.isIgnoredFromSnapshots,
      isRemovedFromInbox: item.isRemovedFromInbox,
      attachmentsMeta: item.attachmentsMeta,
      categoryTags: item.categoryTags,
      priorityScore: item.priorityScore,
      priorityLabel: item.priorityLabel,
      sender: {
        id: item.sender.id,
        name: item.sender.name,
        emailAddress: item.sender.emailAddress,
        domain: item.sender.domain,
      } as SenderResponseDto,
      createdAt: item.createdAt,
    };
  }
}
