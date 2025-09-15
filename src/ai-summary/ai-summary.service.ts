import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { detailedSummaryPrompt, summaryPrompt } from './ai-summary.utils';
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
 * Structured result for a daily summary aggregation.
 * summary: overall text summary for the day
 * totalEmails: number of emails processed
 * importantEmails: count of emails marked important
 * keyInsights: short list/string of insights
 * topSenders: frequent senders for the day
 * actionItems: suggested follow-ups for the user
 * aiProcessingTimeMs: time spent on AI processing (for metrics)
 */
export interface DailySummaryResult {
  summary: string;
  totalEmails: number;
  importantEmails: number;
  keyInsights: string;
  topSenders: string[];
  actionItems: string[];
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
        summary: email.summary || `Email about: ${email.subject}`,
        isImportant: email.isImportant,
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
          summary: string;
          keyInsights: string;
          topSenders: string[];
          actionItems: string[];
        };

        console.log('Summary -- aiResult :>> ', aiResult);

        return {
          summary: aiResult.summary,
          totalEmails: emails.length,
          importantEmails: emails.filter((e) => e.isImportant).length,
          keyInsights: aiResult.keyInsights,
          topSenders: aiResult.topSenders,
          actionItems: aiResult.actionItems,
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
      // Truncate emails to prevent token limit issues
      const emailData = emails.slice(0, 20).map((email) => ({
        summary: email.summary || `Email about: ${email.subject}`,
        subject: email.subject,
        sender: email.sender,
        body: email.body ? email.body.substring(0, 500) : '',
        receivedAt: email.receivedAt,
        isImportant: email.isImportant,
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
      console.log('DeailSummary -- aiResult :>> ', aiResult);

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
