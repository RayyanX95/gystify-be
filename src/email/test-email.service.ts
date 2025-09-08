import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailMessage, User } from '../entities';
import { CreateEmailMessageDto } from '../dto/email.dto';

@Injectable()
export class TestEmailService {
  constructor(
    @InjectRepository(EmailMessage)
    private emailRepository: Repository<EmailMessage>,
  ) {}

  async createTestEmail(
    user: User,
    testData?: Partial<CreateEmailMessageDto>,
  ): Promise<EmailMessage> {
    const defaultEmailData: CreateEmailMessageDto = {
      gmailId: `test-${Date.now()}-${Math.random()}`,
      threadId: `thread-${Date.now()}`,
      subject: testData?.subject || 'Test Email Subject',
      sender: testData?.sender || 'Test Sender',
      senderEmail: testData?.senderEmail || 'sender@example.com',
      body:
        testData?.body || 'This is a test email body for development purposes.',
      receivedAt: new Date(),
      isRead: false,
      isImportant: false,
    };

    const emailMessage = this.emailRepository.create({
      ...defaultEmailData,
      ...testData,
      user,
    });

    return this.emailRepository.save(emailMessage);
  }

  async createMultipleTestEmails(
    user: User,
    count: number = 5,
  ): Promise<EmailMessage[]> {
    const emails: EmailMessage[] = [];

    for (let i = 0; i < count; i++) {
      const email = await this.createTestEmail(user, {
        subject: `Test Email ${i + 1}`,
        sender: `Sender ${i + 1}`,
        senderEmail: `sender${i + 1}@example.com`,
        body: `This is test email number ${i + 1}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
        isImportant: i % 3 === 0, // Every 3rd email is important
      });
      emails.push(email);
    }

    return emails;
  }
}
