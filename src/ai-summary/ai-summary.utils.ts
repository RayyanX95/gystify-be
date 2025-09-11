import { GmailMessageDto } from 'src/dto/email.dto';

export interface EmailSummary {
  subject: GmailMessageDto['subject'];
  sender: GmailMessageDto['sender'];
  summary: GmailMessageDto['summary'];
  isImportant: GmailMessageDto['isImportant'];
}

export const summaryPrompt = (emailSummaries: EmailSummary[]) => `
        Create a daily email summary based on these emails:
        
        ${JSON.stringify(emailSummaries, null, 2)}
        
        Please provide:
        1. An overall summary of email activity
        2. Key insights from the day's emails
        3. Top senders (most frequent)
        4. Action items that need attention
        7. Notes for emergency or follow-up
        
        Respond in JSON format:
        {
          "summary": "string",
          "keyInsights": "string",
          "topSenders": ["string"],
          "actionItems": ["string"],
          "notes": "string"
        }
`;

export interface DetailedSummary extends EmailSummary {
  receivedAt: Date;
  isImportant: boolean;
}

export const detailedSummaryPrompt = (
  emailSummaries: EmailSummary[],
  context?: string,
) => `
        ${context}Create a detailed, actionable report from these emails:
        
        ${JSON.stringify(emailSummaries, null, 2)}
        
        Please provide a structured detailed summary with:
        1. Key highlights from all emails
        2. Priority action items that need attention
        3. Suggested reply drafts (if applicable)
        4. Important deadlines or dates mentioned
        5. Main topics/themes covered
        6. Risks, blockers, or unresolved questions
        7. Notes for emergency or follow-up in some detail
        
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
          "notes": "string"
        }
      `;
