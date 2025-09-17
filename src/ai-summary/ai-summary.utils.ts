// Enhanced AI summary utilities with rich email metadata
import { GmailMessageDto } from '../dto/email.dto';

export interface EmailSummary {
  subject: GmailMessageDto['subject'];
  sender: GmailMessageDto['sender'];
  senderEmail: GmailMessageDto['senderEmail'];
  summary: NonNullable<GmailMessageDto['summary']>;
  body: string; // Truncated version for AI processing
  category: NonNullable<GmailMessageDto['category']>;
  isImportant: NonNullable<GmailMessageDto['isImportant']>;
  isStarred: NonNullable<GmailMessageDto['isStarred']>;
  priorityScore: NonNullable<GmailMessageDto['priorityScore']>;
  isAuthenticated: NonNullable<GmailMessageDto['isAuthenticated']>;
  isFromTrustedDomain: NonNullable<GmailMessageDto['isFromTrustedDomain']>;
  hasUnsubscribeOption: NonNullable<GmailMessageDto['hasUnsubscribeOption']>;
  sizeEstimate: NonNullable<GmailMessageDto['sizeEstimate']>;
  receivedAt: GmailMessageDto['receivedAt'];
}

export const emailSnapshotPrompt = (emailContent: string) => `
        You are an email summarization expert. Analyze the following email content and provide a concise summary in bullet point format.

        Requirements:
        - Extract the key information and main points
        - Format each point as a bullet starting with "*"
        - Keep each point concise and informative
        - Focus on actionable items, important dates, key people, and main topics
        - Maximum 5 bullet points
        - Do not include any additional text, just the bullet points

        Email content:
        ${emailContent}

        Format your response exactly like this example:
        * TEDNext is a conference focused on growth and innovation.
        * The conference will be held in November.
        * Attendees can gain insights from speakers like Sean Bankhead.
        * TED offers games, tech newsletters, and a daily talks subscription.
        * TED encourages membership for exclusive benefits.
`;

export const summaryPrompt = (emailSummaries: EmailSummary[]) => `
        You are a smart, efficient AI assistant. Your goal is to provide a concise, scannable daily email overview.
        Create an intelligent daily email summary based on these emails with their rich metadata:
        
        ${JSON.stringify(emailSummaries, null, 2)}
        
        IMPORTANT: Use the provided metadata to produce data-driven, security-aware insights. Helpful notes:
        - category: Group messages by category (PROMOTIONS, UPDATES, SOCIAL, PERSONAL, OTHER).
        - priorityScore: Numeric importance (0.0-1.0). Treat >= 0.6 as high priority.
        - isAuthenticated: True indicates sender authentication (DKIM/SPF) — more trustworthy.
        - isFromTrustedDomain: True for major platforms (gmail.com, linkedin.com); use this to prioritize trusted notifications.
        - hasUnsubscribeOption: True indicates marketing/newsletters — candidate for cleanup.
        
        Please provide the summary in the following JSON format.
        
        **DAILY SUMMARY FORMAT** (Concise Overview):
        {
          "title": "A short headline for the summary (e.g., '5 New Emails - 2 Urgent Items')",
          "summary": "Daily snapshot: X emails received; Y flagged as high-priority. The main focus is on [mention the most important email's theme or sender].",
          "keyInsights": "A single string containing 3 bullet points. 1) Priority: Name the sender/subject of the highest priority item. 2) Security: State the number of unauthenticated emails and name one if it looks suspicious. 3) Cleanup: Suggest the most impactful cleanup action (e.g., 'Unsubscribe from the noisiest sender').",
          "topSenders": [
            {
              "sender": "GitHub",
              "count": 2,
              "status": "trusted"
            },
            {
              "sender": "Jane Doe",
              "count": 1,
              "status": "personal"
            }
          ],
          "actionItems": [
            "Up to 3 concise actions, ordered by priority (focus on authenticated/high-priority emails)"
          ],
          "securityInsights": "A brief security note: X of Y emails authenticated. Flag any specific red flags or suspicious senders.",
          "categoryBreakdown": {
            "PROMOTIONS": 0,
            "UPDATES": 0,
            "PERSONAL": 0,
            "SOCIAL": 0,
            "OTHER": 0
          }
        }

        Keep the content CONCISE and highly scannable. This is a quick daily overview.
`;

export const detailedSummaryPrompt = (
  emailSummaries: EmailSummary[],
  context?: string,
) => `
        You are an expert executive assistant AI specializing in productivity and cybersecurity. Your task is to create a detailed, comprehensive email report.
        Your thought process should be:
        1. First, analyze each email individually to extract its priority, security status, and key action.
        2. Second, use the provided user context to adjust the priority of relevant emails.
        3. Finally, aggregate these individual analyses into the specified JSON format, ensuring every field is populated accurately.

        ${context ? `USER CONTEXT: The user's current focus is: "${context}". Elevate the priority of emails related to this context.` : ''}
        
        Create a comprehensive, security-aware detailed report from these emails with rich metadata:
        
        ${JSON.stringify(emailSummaries, null, 2)}
        
        IMPORTANT: Leverage the metadata for intelligent analysis:
        - Prioritize high priorityScore (0.6+), authenticated, and trusted domain emails.
        - Group by categories and flag unauthenticated or suspicious emails for security review.
        - Identify actionable items, separating personal/work emails from promotional noise.
        
        Please provide a structured detailed summary in the following JSON format.
        
        **DETAILED ANALYSIS FORMAT** (Comprehensive Report):
        {
          "title": "A short report title (e.g., 'Detailed Analysis: 8 Messages, 3 High-Priority Actions')",
          "executiveSummary": "A comprehensive summary that highlights the most important authenticated messages, mentions any urgent deadlines, and states the overall priorities for the day.",
          "emailByEmail": [
            {
              "subject": "Specific email subject",
              "sender": "Sender name",
              "priorityLevel": "HIGH/MEDIUM/LOW",
              "requiresAction": true,
              "suggestedAction": "Suggested next step for this email",
              "securityStatus": "authenticated/unauthenticated/suspicious"
            }
          ],
          "priorityActions": {
            "immediate": ["Actions to take today (include email subjects). Prioritize based on context and urgency."],
            "thisWeek": ["Actions to take this week."],
            "cleanup": ["Specific unsubscribe/archive/filter suggestions for low-priority mail."]
          },
          "securityAssessment": {
            "authenticatedEmails": 0,
            "trustedDomains": 0,
            "suspiciousEmails": [
              { "subject": "Suspicious email subject", "sender": "Sender", "reason": "Reason for suspicion (e.g., unauthenticated, impersonation attempt)" }
            ],
            "recommendations": ["Security steps to take (e.g., 'Delete suspicious email from sender X without clicking links')."]
          },
          "suggestedReplies": [
            {
              "forEmailSubject": "The original email subject to reply to",
              "goal": "The intended outcome of the reply (e.g., 'Confirm receipt and schedule a meeting for next week').",
              "tone": "professional/casual/urgent",
              "replyDraft": "A concise, well-written suggested reply."
            }
          ],
          "subscriptionManagement": {
            "keepSubscribed": ["Valuable subscriptions to keep (e.g., 'Industry News Weekly')"],
            "unsubscribeNow": ["Low-value or noisy subscriptions to remove (e.g., 'Daily Marketing Blast')"],
            "filterRecommendations": ["Gmail filter suggestions (e.g., 'Create filter for sender: newsletter@example.com -> apply label 'Newsletters' and archive')."]
          }
        }
        
        Note: In the 'emailByEmail' array, include a breakdown for ONLY the top 5-7 most important emails to keep the report focused. Always prioritize authenticated emails from trusted domains and flag any unauthenticated emails in the security assessment.
      `;
