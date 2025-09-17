import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  detailedSummaryPrompt,
  summaryPrompt,
  emailSnapshotPrompt,
} from './ai-summary.utils';
import { GmailMessageDto } from 'src/dto/email.dto';

/**
 * Structured result for a single email analysis.
 * summary: short text summary of the email
 * priorityScore: numeric urgency/importance score (0-1)
 * keyInsights: list of important points
 * actionItems: suggested follow-up tasks
 */
export interface EmailSummaryResult {
  summary: string;
  priorityScore: number;
  keyInsights: string[];
  actionItems: string[];
}

/**
 * Enhanced structured result for a daily summary aggregation with security and category insights.
 * summary: overall text summary prioritizing authenticated, high-priority emails
 * totalEmails: number of emails processed
 * importantEmails: count of emails marked important
 * keyInsights: categorized insights with security and trust context
 * topSenders: frequent senders with trust indicators
 * actionItems: prioritized follow-ups focusing on authenticated emails
 * securityInsights: security assessment of email authentication status
 * categoryBreakdown: distribution of emails by category (PROMOTIONS, PERSONAL, etc.)
 * aiProcessingTimeMs: time spent on AI processing (for metrics)
 */
export interface DailySummaryResult {
  title: string;
  summary: string;
  totalEmails: number;
  importantEmails: number;
  keyInsights: string;
  topSenders: string[];
  actionItems: string[];
  securityInsights?: string;
  categoryBreakdown?: Record<string, number>;
  aiProcessingTimeMs: number;
}

@Injectable()
/**
 * AiSummaryService - wraps OpenAI calls to produce structured summaries.
 * Methods throw proper errors for the frontend and limit token usage by truncating inputs.
 */
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

  /**
   * Generate a snapshot summary for a single email
   * Returns bullet points in the format: * Point text
   */
  async generateEmailSnapshot(text: string): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }

    if (!text || text.trim().length === 0) {
      return 'No content to summarize';
    }

    try {
      // Truncate text to prevent token limit issues
      const truncatedText = text.substring(0, 2000);

      const prompt = emailSnapshotPrompt(truncatedText);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('OpenAI returned empty response');
      }

      // Clean up the response to ensure proper formatting
      const cleanedContent = content
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) =>
          line.startsWith('*') ? line : `* ${line.replace(/^[•\-*]\s*/, '')}`,
        )
        .join('\n');

      return cleanedContent;
    } catch (error) {
      this.logger.error('Error generating email snapshot:', error);

      // Re-throw the error with proper context for the frontend
      if (error instanceof Error) {
        throw new Error(`Failed to generate email snapshot: ${error.message}`);
      } else {
        throw new Error(
          'Failed to generate email snapshot due to unknown error',
        );
      }
    }
  }

  /**
   * Alias for generateEmailSnapshot for backward compatibility
   * Used by snapshot service
   */
  async generateSummary(text: string): Promise<string> {
    return this.generateEmailSnapshot(text);
  }

  /**
   * Produce an aggregated daily summary from a list of emails.
   * Returns a structured result or throws proper errors for the frontend.
   */
  async generateDailySummary(
    emails: GmailMessageDto[],
  ): Promise<DailySummaryResult> {
    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }

    if (emails.length === 0) {
      return {
        title: 'No new messages',
        summary: 'No emails to summarize today.',
        totalEmails: 0,
        importantEmails: 0,
        keyInsights: 'No email activity today.',
        topSenders: [],
        actionItems: [],
        aiProcessingTimeMs: 0,
      };
    }

    try {
      const emailSummaries = emails.map((email) => ({
        subject: email.subject,
        sender: email.sender,
        senderEmail: email.senderEmail,
        summary:
          email.summary || email.snippet || `Email about: ${email.subject}`,
        body: email.body?.substring(0, 500) || '', // First 500 chars for context
        category: email.category || 'UNKNOWN',
        isImportant: email.isImportant || false,
        isStarred: email.isStarred || false,
        priorityScore: email.priorityScore || 0.5,
        isAuthenticated: email.isAuthenticated || false,
        isFromTrustedDomain: email.isFromTrustedDomain || false,
        hasUnsubscribeOption: email.hasUnsubscribeOption || false,
        sizeEstimate: email.sizeEstimate || 0,
        receivedAt: email.receivedAt,
      }));

      const prompt = summaryPrompt(emailSummaries);

      // Measure AI processing time - start timing right before the OpenAI call
      const aiStartTime = Date.now();

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 800,
      });

      // End timing immediately after the OpenAI call completes
      const aiProcessingTimeMs = Date.now() - aiStartTime;

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('OpenAI returned empty response');
      }

      try {
        const aiResult = JSON.parse(content) as {
          title: string;
          summary: string;
          keyInsights: string;
          topSenders: string[];
          actionItems: string[];
          securityInsights?: string;
          categoryBreakdown?: Record<string, number>;
          notes?: string;
        };

        console.log('Summary -- aiResult :>> ', aiResult);

        return {
          title: aiResult.title,
          summary: aiResult.summary,
          totalEmails: emails.length,
          importantEmails: emails.filter((e) => e.isImportant).length,
          keyInsights: aiResult.keyInsights,
          topSenders: aiResult.topSenders,
          actionItems: aiResult.actionItems,
          securityInsights: aiResult.securityInsights,
          categoryBreakdown: aiResult.categoryBreakdown,
          aiProcessingTimeMs,
        };
      } catch (parseError) {
        this.logger.error('Failed to parse daily summary as JSON:', parseError);
        this.logger.error('AI Response content:', content);
        throw new Error('AI response format is invalid - unable to parse JSON');
      }
    } catch (error) {
      this.logger.error('Error generating daily summary:', error);

      // Re-throw the error with proper context for the frontend
      if (error instanceof Error) {
        throw new Error(`Failed to generate daily summary: ${error.message}`);
      } else {
        throw new Error(
          'Failed to generate daily summary due to unknown error',
        );
      }
    }
  }

  /**
   * Generate a detailed, actionable report from multiple emails.
   * Limits the number and size of emails sent to the model and accepts an optional
   * textual `context` to guide the analysis. Returns parsed JSON or throws proper errors.
   */
  async generateDetailedSummary(
    emails: GmailMessageDto[],
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
      // Truncate emails to prevent token limit issues and include rich metadata
      const emailData = emails.slice(0, 20).map((email) => ({
        summary:
          email.summary || email.snippet || `Email about: ${email.subject}`,
        subject: email.subject,
        sender: email.sender,
        senderEmail: email.senderEmail,
        body: email.body ? email.body.substring(0, 500) : '',
        category: email.category || 'UNKNOWN',
        receivedAt: email.receivedAt,
        isImportant: email.isImportant || false,
        isStarred: email.isStarred || false,
        priorityScore: email.priorityScore || 0.5,
        isAuthenticated: email.isAuthenticated || false,
        isFromTrustedDomain: email.isFromTrustedDomain || false,
        hasUnsubscribeOption: email.hasUnsubscribeOption || false,
        sizeEstimate: email.sizeEstimate || 0,
      }));

      const contextInstruction = context ? `Context: ${context}\n\n` : '';

      const prompt = detailedSummaryPrompt(emailData, contextInstruction);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1200,
      });

      const aiResult = response.choices[0]?.message?.content;
      if (!aiResult) {
        this.logger.warn('No content from OpenAI detailed summary');
        throw new Error('OpenAI returned empty response');
      }
      console.log('DetailedSummary -- aiResult :>> ', aiResult);

      try {
        const parsed = JSON.parse(aiResult) as Record<string, any>;
        return parsed;
      } catch (parseError) {
        this.logger.error('Failed to parse AI response as JSON:', parseError);
        this.logger.error('AI Response content:', aiResult);
        throw new Error('AI response format is invalid - unable to parse JSON');
      }
    } catch (error) {
      this.logger.error('Error generating detailed summary:', error);

      // Re-throw the error with proper context for the frontend
      if (error instanceof Error) {
        throw new Error(
          `Failed to generate detailed summary: ${error.message}`,
        );
      } else {
        throw new Error(
          'Failed to generate detailed summary due to unknown error',
        );
      }
    }
  }
}
