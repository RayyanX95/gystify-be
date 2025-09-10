import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { EmailMessage } from '../entities/email-message.entity';

export interface EmailSummaryResult {
  summary: string;
  priorityScore: number;
  keyInsights: string[];
  actionItems: string[];
}

export interface DailySummaryResult {
  summary: string;
  totalEmails: number;
  importantEmails: number;
  keyInsights: string;
  topSenders: string[];
  actionItems: string[];
}

@Injectable()
export class AiSummaryService {
  private readonly logger = new Logger(AiSummaryService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OpenAI API key not configured');
    } else {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async summarizeEmail(email: EmailMessage): Promise<EmailSummaryResult> {
    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }

    try {
      const prompt = `
        Analyze this email and provide a structured summary:
        
        Subject: ${email.subject}
        From: ${email.sender} (${email.senderEmail})
        Content: ${(email.body ?? '').substring(0, 2000)}
        
        Please provide:
        1. A concise summary (2-3 sentences)
        2. Priority score (0-1, where 1 is most urgent/important)
        3. Key insights (important points or information)
        4. Action items (if any tasks or responses are needed)
        
        Respond in JSON format:
        {
          "summary": "string",
          "priorityScore": number,
          "keyInsights": ["string"],
          "actionItems": ["string"]
        }
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      return JSON.parse(content) as EmailSummaryResult;
    } catch (error) {
      this.logger.error('Error summarizing email:', error);
      // Fallback summary
      return {
        summary: `Email from ${email.sender} about: ${email.subject}`,
        priorityScore: 0.5,
        keyInsights: [`Email received from ${email.senderEmail}`],
        actionItems: [],
      };
    }
  }

  async generateDailySummary(
    emails: EmailMessage[],
  ): Promise<DailySummaryResult> {
    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }

    if (emails.length === 0) {
      return {
        summary: 'No emails to summarize today.',
        totalEmails: 0,
        importantEmails: 0,
        keyInsights: 'No email activity today.',
        topSenders: [],
        actionItems: [],
      };
    }

    try {
      const emailSummaries = emails.map((email) => ({
        subject: email.subject,
        sender: email.sender,
        summary: email.summary || `Email about: ${email.subject}`,
        isImportant: email.isImportant,
      }));

      const prompt = `
        Create a daily email summary based on these emails:
        
        ${JSON.stringify(emailSummaries, null, 2)}
        
        Please provide:
        1. An overall summary of email activity
        2. Key insights from the day's emails
        3. Top senders (most frequent)
        4. Action items that need attention
        
        Respond in JSON format:
        {
          "summary": "string",
          "keyInsights": "string",
          "topSenders": ["string"],
          "actionItems": ["string"]
        }
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 800,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const aiResult = JSON.parse(content) as any;

      return {
        summary: aiResult.summary as string,
        totalEmails: emails.length,
        importantEmails: emails.filter((e) => e.isImportant).length,
        keyInsights: aiResult.keyInsights as string,
        topSenders: aiResult.topSenders as string[],
        actionItems: aiResult.actionItems as string[],
      };
    } catch (error) {
      this.logger.error('Error generating daily summary:', error);
      // Fallback summary
      const senderCounts = emails.reduce(
        (acc, email) => {
          acc[email.sender] = (acc[email.sender] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const topSenders = Object.entries(senderCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([sender]) => sender);

      return {
        summary: `Received ${emails.length} emails today from various senders.`,
        totalEmails: emails.length,
        importantEmails: emails.filter((e) => e.isImportant).length,
        keyInsights: `Most active senders: ${topSenders.slice(0, 3).join(', ')}`,
        topSenders,
        actionItems: ['Review important emails', 'Respond to pending messages'],
      };
    }
  }
}
