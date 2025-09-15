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
          "keyInsights": "1. First insight here. 2. Second insight here. 3. Third insight here.",
          "topSenders": ["string"],
          "actionItems": ["string"],
          "notes": "string"
        }
        
        Note: Format keyInsights as a numbered list within a single string, like: "1. Job alerts for software engineering and frontend development roles were prominent. 2. Substack updates and social media notifications were also received. 3. Promotional emails from Jumia EG and Design.com were included."
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
          "highlights": "1. First highlight here. 2. Second highlight here. 3. Third highlight here.",
          "actionItems": ["string"],
          "suggestedReplies": ["string"],
          "deadlines": ["string"],
          "mainTopics": ["string"],
          "risks": ["string"],
          "categories": {"category_name": ["email subjects"]},
          "notes": "string"
        }
        
        Note: Format highlights as a numbered list within a single string, similar to keyInsights format.
      `;
