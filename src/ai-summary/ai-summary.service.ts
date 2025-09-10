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

      const aiResult = JSON.parse(content) as {
        summary: string;
        keyInsights: string;
        topSenders: string[];
        actionItems: string[];
      };

      return {
        summary: aiResult.summary,
        totalEmails: emails.length,
        importantEmails: emails.filter((e) => e.isImportant).length,
        keyInsights: aiResult.keyInsights,
        topSenders: aiResult.topSenders,
        actionItems: aiResult.actionItems,
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

  async generateDetailedSummary(
    emails: EmailMessage[],
    context?: string,
  ): Promise<Record<string, any>> {
    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }

    if (emails.length === 0) {
      return {
        error: 'No emails provided for detailed summary',
      };
    }

    try {
      // Truncate emails to prevent token limit issues
      const emailData = emails.slice(0, 20).map((email) => ({
        subject: email.subject,
        sender: email.sender,
        body: email.body ? email.body.substring(0, 500) : '',
        receivedAt: email.receivedAt,
        isImportant: email.isImportant,
      }));

      const contextInstruction = context ? `Context: ${context}\n\n` : '';

      const prompt = `
        ${contextInstruction}Create a detailed, actionable report from these emails:
        
        ${JSON.stringify(emailData, null, 2)}
        
        Please provide a structured detailed summary with:
        1. Key highlights from all emails
        2. Priority action items that need attention
        3. Suggested reply drafts (if applicable)
        4. Important deadlines or dates mentioned
        5. Main topics/themes covered
        6. Risks, blockers, or unresolved questions
        7. Categorize emails by sender or topic
        
        Respond in JSON format:
        {
          "rawSummary": "string",
          "highlights": ["string"],
          "actionItems": ["string"],
          "suggestedReplies": ["string"],
          "deadlines": ["string"],
          "mainTopics": ["string"],
          "risks": ["string"],
          "categories": {"category_name": ["email subjects"]},
          "notes": "optional"
        }
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1200,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        this.logger.warn('No content from OpenAI detailed summary');
        throw new Error('No response content from OpenAI');
      }

      try {
        const parsed = JSON.parse(content) as Record<string, any>;
        return parsed;
      } catch (parseError) {
        this.logger.warn(
          'Failed to parse detailed summary as JSON:',
          parseError,
        );
        // Return raw content as fallback
        return {
          raw: content,
          highlights: [`Generated summary for ${emails.length} emails`],
          actionItems: ['Review the generated summary'],
          suggestedReplies: [],
          deadlines: [],
          mainTopics: [
            `Email analysis from ${emails[0]?.sender || 'various senders'}`,
          ],
        };
      }
    } catch (error) {
      this.logger.error('Error generating detailed summary:', error);
      // Fallback response
      return {
        error: `Failed to generate detailed summary: ${error instanceof Error ? error.message : String(error)}`,
        highlights: [
          `Analysis of ${emails.length} emails from ${new Date().toLocaleDateString()}`,
        ],
        actionItems: ['Review emails manually', 'Check for urgent items'],
        suggestedReplies: [],
        deadlines: [],
        mainTopics: emails.map((e) => e.subject).slice(0, 5),
        fallback: true,
      };
    }
  }
}
