import { Injectable, Logger } from '@nestjs/common';
import { gmail_v1, google } from 'googleapis';
import {
  extractEmailBody,
  htmlToPlainText,
  normalizeSnippet,
} from './email.utils';
import { User } from '../entities';
import { GmailMessageDto } from 'src/dto/email.dto';

@Injectable()
/**
 * Service responsible for fetching emails from Gmail, cleaning content,
 * and persisting email metadata/snippets to the database.
 */
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor() {}

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
   * Fetch the latest messages for a user from Gmail WITHOUT persisting to DB.
   * Returns GmailMessageDto instances that are NOT saved.
   * Useful for transient processing (summaries) where storing full bodies is undesirable.
   */
  async fetchGmailMessagesNoPersist(
    user: User,
    maxResults = 5,
  ): Promise<GmailMessageDto[]> {
    if (!user.gmailRefreshToken) {
      this.logger.warn(`User ${user.id} has no Gmail refresh token`);
      return [];
    }

    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
      );

      oauth2Client.setCredentials({ refresh_token: user.gmailRefreshToken });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults,
      });

      const messages = response.data.messages || [];
      const emailMessages: GmailMessageDto[] = [];

      for (const message of messages) {
        if (!message.id) continue;

        try {
          const messageResponse = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full',
          });

          const msg = messageResponse.data;
          if (!msg?.payload) continue;

          const headers = msg.payload.headers || [];
          const subject =
            headers.find((h) => h.name === 'Subject')?.value || 'No Subject';
          const from =
            headers.find((h) => h.name === 'From')?.value || 'Unknown';
          const date = headers.find((h) => h.name === 'Date')?.value;

          const emailMatch = from.match(/<(.+)>/);
          const senderEmail = emailMatch ? emailMatch[1] : from;
          const senderName = emailMatch
            ? from.replace(/<.+>/, '').trim()
            : from;

          let body = extractEmailBody(msg.payload);
          body = normalizeSnippet(htmlToPlainText(body), 1000);

          const emailMsg = new GmailMessageDto();
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - assigning fields for transient object
          emailMsg.gmailId = message.id;
          emailMsg.threadId = msg.threadId || message.id;
          emailMsg.subject = subject;
          emailMsg.sender = senderName;
          emailMsg.senderEmail = senderEmail;
          emailMsg.body = body;
          // snippet fallback
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          emailMsg.snippet = (msg.snippet || body || subject).substring(
            0,
            1000,
          );
          emailMsg.receivedAt = date ? new Date(date) : new Date();

          const importance = this.parseGmailImportance(msg);
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          emailMsg.priorityScore = importance.score;
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          emailMsg.isImportant = importance.isImportant;

          emailMessages.push(emailMsg);
        } catch (error) {
          this.logger.error(
            `Error fetching message ${message.id} no-persist:`,
            error,
          );
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
   * Fetch messages for a user from Gmail WITHOUT persisting, filtered by receivedAt between start and end.
   * Returns GmailMessageDto instances that are NOT saved.
   */
  async fetchGmailMessagesNoPersistBetween(
    user: User,
    start: Date,
    end: Date,
    maxResults = 50,
  ): Promise<GmailMessageDto[]> {
    if (!user.gmailRefreshToken) {
      this.logger.warn(`User ${user.id} has no Gmail refresh token`);
      return [];
    }

    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
      );

      oauth2Client.setCredentials({ refresh_token: user.gmailRefreshToken });
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Request a larger page to have more messages to filter locally
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults,
      });

      const messages = response.data.messages || [];
      const emailMessages: GmailMessageDto[] = [];

      for (const message of messages) {
        if (!message.id) continue;

        try {
          const messageResponse = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full',
          });

          const msg = messageResponse.data;
          if (!msg?.payload) continue;

          const headers = msg.payload.headers || [];
          const subject =
            headers.find((h) => h.name === 'Subject')?.value || 'No Subject';
          const from =
            headers.find((h) => h.name === 'From')?.value || 'Unknown';
          const date = headers.find((h) => h.name === 'Date')?.value;

          const receivedAt = date ? new Date(date) : new Date();
          if (receivedAt < start || receivedAt >= end) continue;

          const emailMatch = from.match(/<(.+)>/);
          const senderEmail = emailMatch ? emailMatch[1] : from;
          const senderName = emailMatch
            ? from.replace(/<.+>/, '').trim()
            : from;

          let body = extractEmailBody(msg.payload);
          body = normalizeSnippet(htmlToPlainText(body), 1000);

          const emailMsg = new GmailMessageDto();
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - transient object
          emailMsg.gmailId = message.id;
          emailMsg.threadId = msg.threadId || message.id;
          emailMsg.subject = subject;
          emailMsg.sender = senderName;
          emailMsg.senderEmail = senderEmail;
          emailMsg.body = body;
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          emailMsg.snippet = (msg.snippet || body || subject).substring(
            0,
            1000,
          );
          emailMsg.receivedAt = receivedAt;

          const importance = this.parseGmailImportance(msg);
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          emailMsg.priorityScore = importance.score;
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          emailMsg.isImportant = importance.isImportant;

          emailMessages.push(emailMsg);
        } catch (error) {
          this.logger.error(
            `Error fetching message ${message.id} no-persist-between:`,
            error,
          );
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
}
