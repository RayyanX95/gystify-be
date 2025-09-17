import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import {
  extractEmailBody,
  htmlToPlainText,
  normalizeSnippet,
  extractEmailCategory,
  checkEmailAuthentication,
  extractUnsubscribeInfo,
  isTrustedDomain,
  calculateEnhancedImportance,
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
   * Fetch the latest messages for a user from Gmail WITHOUT persisting to DB.
   * Returns GmailMessageDto instances that are NOT saved.
   * Useful for transient processing (summaries) where storing full bodies is undesirable.
   */
  async fetchGmailMessages(
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
        q: 'is:unread', // Fetch only unread emails for snapshot
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

          this.logger.debug(
            `Processing message ${message.id}: ${msg.snippet?.substring(0, 100)}...`,
          );

          const headers = msg.payload.headers || [];
          const subject =
            headers.find((h) => h.name === 'Subject')?.value || 'No Subject';
          const from =
            headers.find((h) => h.name === 'From')?.value || 'Unknown';
          const replyTo = headers.find((h) => h.name === 'Reply-To')?.value;
          const date = headers.find((h) => h.name === 'Date')?.value;
          const returnPath = headers.find(
            (h) => h.name === 'Return-Path',
          )?.value;

          const emailMatch = from.match(/<(.+)>/);
          const senderEmail = emailMatch ? emailMatch[1] : from;
          const senderName = emailMatch
            ? from.replace(/<.+>/, '').trim()
            : from;

          const replyToMatch = replyTo?.match(/<(.+)>/);
          const replyToEmail = replyToMatch ? replyToMatch[1] : replyTo;

          let body = extractEmailBody(msg.payload);
          body = normalizeSnippet(htmlToPlainText(body), 1000);

          // Enhanced metadata extraction
          const labelIds = msg.labelIds || [];
          const category = extractEmailCategory(labelIds);
          const authResult = checkEmailAuthentication(headers);
          const unsubscribeInfo = extractUnsubscribeInfo(headers);
          const isFromTrustedDomain = isTrustedDomain(senderEmail);

          // Enhanced importance calculation
          const importance = calculateEnhancedImportance(
            labelIds,
            headers,
            senderEmail,
            msg.sizeEstimate || 0,
          );

          const emailMsg = new GmailMessageDto();
          emailMsg.gmailId = message.id;
          emailMsg.threadId = msg.threadId || message.id;
          emailMsg.subject = subject;
          emailMsg.sender = senderName;
          emailMsg.senderEmail = senderEmail;
          emailMsg.replyToEmail = replyToEmail || undefined;
          emailMsg.body = body;
          emailMsg.snippet = (msg.snippet || body || subject).substring(
            0,
            1000,
          );
          emailMsg.receivedAt = date ? new Date(date) : new Date();
          emailMsg.internalDate = msg.internalDate
            ? new Date(Number(msg.internalDate))
            : undefined;

          // Labels and categorization
          emailMsg.labelIds = labelIds;
          emailMsg.category = category;
          emailMsg.isRead = !labelIds.includes('UNREAD');
          emailMsg.isStarred = labelIds.includes('STARRED');

          // Importance and priority
          emailMsg.isImportant = importance.isImportant;
          emailMsg.priorityScore = importance.score;

          // Size and metadata
          emailMsg.sizeEstimate = msg.sizeEstimate || undefined;
          emailMsg.historyId = msg.historyId || undefined;

          // Authentication and security
          emailMsg.isAuthenticated = authResult.isAuthenticated;
          emailMsg.authenticationResults = authResult.authenticationResults;
          emailMsg.isFromTrustedDomain = isFromTrustedDomain;
          emailMsg.returnPath = returnPath || undefined;

          // Subscription management
          emailMsg.hasUnsubscribeOption = unsubscribeInfo.hasUnsubscribeOption;
          emailMsg.listUnsubscribeUrl = unsubscribeInfo.listUnsubscribeUrl;

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
}
