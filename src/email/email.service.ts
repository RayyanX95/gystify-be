import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { gmail_v1, google } from 'googleapis';
import { htmlToText } from 'html-to-text';
import { EmailMessage, User } from '../entities';
import { CreateEmailMessageDto } from '../dto/email.dto';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @InjectRepository(EmailMessage)
    private emailRepository: Repository<EmailMessage>,
  ) {}

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
      let body = this.extractEmailBody(message.payload);
      // strip html tags if any and truncate to 1000 chars
      body = this.stripHtml(body).trim().slice(0, 1000);

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
        });
        return await this.emailRepository.save(existingEmail);
      }

      // Create new email message
      const emailMessage = this.emailRepository.create({
        ...createEmailDto,
        user,
      });

      return await this.emailRepository.save(emailMessage);
    } catch (error) {
      this.logger.error(`Error processing message ${messageId}:`, error);
      return null;
    }
  }

  private extractEmailBody(payload: gmail_v1.Schema$MessagePart): string {
    let result = '';
    if (payload.body?.data) {
      result = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      return result;
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      }

      // Fallback to HTML if no plain text
      for (const part of payload.parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      }
    }

    return 'No content available';
  }

  private stripHtml(html: string): string {
    if (!html) return '';

    // remove style/script blocks before handing off to html-to-text
    const cleaned = html
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<!--([\s\S]*?)-->/g, ' ');

    let text = htmlToText(cleaned, {
      wordwrap: 130,
      selectors: [
        { selector: 'a', options: { hideLinkHrefIfSameAsText: true } },
      ],
    });

    // remove zero-width and common invisible characters
    text = text.replace(/\u{200B}|\u{200C}|\u{200D}|\u{FEFF}|\u{2060}/gu, '');

    // collapse whitespace and return (preserve full URLs)
    return text.replace(/\s+/g, ' ').trim();
  }

  async findByUserId(userId: string, limit = 50): Promise<EmailMessage[]> {
    return this.emailRepository.find({
      where: { user: { id: userId } },
      order: { receivedAt: 'DESC' },
      take: limit,
    });
  }

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

  async markAsRead(emailId: string): Promise<void> {
    await this.emailRepository.update(emailId, { isRead: true });
  }
}
