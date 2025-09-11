import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { gmail_v1, google } from 'googleapis';
import {
  extractEmailBody,
  htmlToPlainText,
  normalizeSnippet,
} from './email.utils';
import { EmailMessage, User } from '../entities';
import { CreateEmailMessageDto } from '../dto/email.dto';

@Injectable()
/**
 * Service responsible for fetching emails from Gmail, cleaning content,
 * and persisting email metadata/snippets to the database.
 */
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @InjectRepository(EmailMessage)
    private emailRepository: Repository<EmailMessage>,
  ) {}

  /**
   * Fetch the latest messages for a user from Gmail and store them locally.
   * Returns the EmailMessage entities that were fetched/created/updated.
   *
   * @param user - the owning User entity (must include gmailRefreshToken)
   * @param maxResults - maximum number of messages to request from Gmail
   */
  async fetchGmailMessages(
    user: User,
    maxResults = 5,
  ): Promise<EmailMessage[]> {
    if (!user.gmailRefreshToken) {
      this.logger.warn(`User ${user.id} has no Gmail refresh token`);
      return [];
    }

    try {
      console.log(`Fetching Gmail messages for user ${user.id}`);
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
      );

      console.log('Setting refresh token credentials');
      oauth2Client.setCredentials({
        refresh_token: user.gmailRefreshToken,
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      console.log('Created Gmail client');

      // Get list of messages (latest emails regardless of read status)
      console.log('Calling Gmail API to list messages');
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults,
        // Removed 'is:unread' filter to get latest emails regardless of read status
      });

      console.log('Gmail API response:', response.data);
      const messages = response.data.messages || [];
      console.log(`Found ${messages.length} messages`);

      const emailMessages: EmailMessage[] = [];

      for (const message of messages) {
        if (!message.id) continue;

        try {
          const emailData = await this.fetchAndStoreEmail(
            gmail,
            message.id,
            user,
          );
          if (emailData) {
            emailMessages.push(emailData);
          }
        } catch (error) {
          this.logger.error(`Error fetching message ${message.id}:`, error);
        }
      }

      return emailMessages;
    } catch (error) {
      this.logger.error(
        `Error fetching Gmail messages for user ${user.id}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Parse Gmail message metadata to extract importance signals.
   * Uses labelIds and common headers like Importance/Priority/X-Priority.
   */
  private parseGmailImportance(message: gmail_v1.Schema$Message) {
    const labels = new Set(
      (message.labelIds || []).map((s) => s.toUpperCase()),
    );
    console.log('labels :>> ', labels);
    if (labels.has('IMPORTANT')) return { isImportant: true, score: 1.0 };
    if (labels.has('STARRED')) return { isImportant: true, score: 0.85 };

    const headers = message.payload?.headers || [];
    const findHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value;

    const importance = findHeader('Importance')?.toLowerCase();
    const priority = findHeader('Priority')?.toLowerCase();
    const xPriority = findHeader('X-Priority');

    if (importance === 'high' || priority === 'urgent') {
      return { isImportant: true, score: 0.8 };
    }

    if (xPriority && /^[1-2]/.test(xPriority)) {
      return { isImportant: true, score: 0.9 };
    }

    return { isImportant: false, score: 0.5 };
  }

  /**
   * Fetch a single Gmail message by id, extract and normalize the body,
   * then upsert the corresponding EmailMessage row for `user`.
   * Returns the saved EmailMessage or null on error.
   *
   * @param gmail - authenticated Gmail client
   * @param messageId - Gmail message id
   * @param user - owning User entity
   */
  private async fetchAndStoreEmail(
    gmail: gmail_v1.Gmail,
    messageId: string,
    user: User,
  ): Promise<EmailMessage | null> {
    try {
      const messageResponse = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      console.log('messageResponse ----- :>> ', messageResponse.data);

      const message = messageResponse.data;
      if (!message.payload) return null;

      const headers = message.payload.headers || [];
      const subject =
        headers.find((h) => h.name === 'Subject')?.value || 'No Subject';
      const from = headers.find((h) => h.name === 'From')?.value || 'Unknown';
      const date = headers.find((h) => h.name === 'Date')?.value;

      // Extract sender email from "Name <email>" format
      const emailMatch = from.match(/<(.+)>/);
      const senderEmail = emailMatch ? emailMatch[1] : from;
      const senderName = emailMatch ? from.replace(/<.+>/, '').trim() : from;

      // Get email body (plain text preferred)
      let body = extractEmailBody(message.payload);
      // convert html to plain text, normalize and truncate to 1000 chars
      body = normalizeSnippet(htmlToPlainText(body), 1000);

      const createEmailDto: CreateEmailMessageDto = {
        gmailId: messageId,
        threadId: message.threadId || messageId,
        subject,
        sender: senderName,
        senderEmail,
        body,
        receivedAt: date ? new Date(date) : new Date(),
        isRead: false,
      };

      // Use Gmail's snippet when available; otherwise fallback to our normalized body
      // Truncate to 1000 chars to match DB column length
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      createEmailDto.snippet = (message.snippet || body || subject).substring(
        0,
        1000,
      );

      // Parse Gmail importance signals and attach to DTO
      const importance = this.parseGmailImportance(message);
      // attach optional fields if present
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      createEmailDto.priorityScore = importance.score;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      createEmailDto.isImportant = importance.isImportant;

      // Upsert email by gmailId
      const existingEmail = await this.emailRepository.findOne({
        where: { gmailId: messageId },
      });

      if (existingEmail) {
        // update metadata if changed
        this.emailRepository.merge(existingEmail, {
          subject: createEmailDto.subject,
          sender: createEmailDto.sender,
          senderEmail: createEmailDto.senderEmail,
          receivedAt: createEmailDto.receivedAt,
          isRead: createEmailDto.isRead,
          body: createEmailDto.body,
          priorityScore: createEmailDto.priorityScore,
          isImportant: createEmailDto.isImportant,
        });
        return await this.emailRepository.save(existingEmail);
      }

      // Create new email message
      const emailMessage = this.emailRepository.create({
        ...createEmailDto,
        user,
        priorityScore: createEmailDto.priorityScore,
        isImportant: createEmailDto.isImportant,
      });

      return await this.emailRepository.save(emailMessage);
    } catch (error) {
      this.logger.error(`Error processing message ${messageId}:`, error);
      return null;
    }
  }

  /**
   * Return the most recent EmailMessage records for a user.
   *
   * @param userId - the id of the user to query
   * @param limit - maximum number of records to return
   */
  async findByUserId(userId: string, limit = 50): Promise<EmailMessage[]> {
    return this.emailRepository.find({
      where: { user: { id: userId } },
      order: { receivedAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Update an email's AI-generated summary and optional priority score.
   * Also sets `isImportant` when priorityScore exceeds the threshold.
   *
   * @param emailId - id of the EmailMessage entity to update
   * @param summary - generated summary text
   * @param priorityScore - optional numeric importance score (0..1)
   */
  async updateEmailSummary(
    emailId: string,
    summary: string,
    priorityScore?: number,
  ): Promise<void> {
    await this.emailRepository.update(emailId, {
      summary,
      priorityScore,
      isImportant: priorityScore ? priorityScore > 0.7 : undefined,
    });
  }

  /**
   * Mark an email as read in the database.
   *
   * @param emailId - id of the EmailMessage to mark read
   */
  // async markAsRead(emailId: string): Promise<void> {
  //   await this.emailRepository.update(emailId, { isRead: true });
  // }
}
