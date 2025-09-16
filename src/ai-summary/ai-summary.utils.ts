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

// Key Differences:
// [Daily Summary] | [Detailed Summary]
// 📈 Metrics & patterns | 📋 Email-by-email analysis
// 🚀 Top 3 actions | 📝 Specific reply drafts
// 🔒 Security overview | 🛡️ Detailed security assessment
// 📊 Category counts | 📧 Specific email subjects
// ⚡ Quick insights | 🎯 Comprehensive action plans

export const summaryPrompt = (emailSummaries: EmailSummary[]) => `
        Create an intelligent daily email summary based on these emails with rich metadata:
        
        ${JSON.stringify(emailSummaries, null, 2)}
        
        IMPORTANT: Use the provided metadata to create smarter insights:
        - category: Use to group emails (PROMOTIONS, UPDATES, SOCIAL, PERSONAL, etc.)
        - priorityScore: Higher scores (0.6+) indicate more important emails
        - isAuthenticated: Authenticated emails are more trustworthy
        - isFromTrustedDomain: Major platforms like Gmail, LinkedIn, GitHub, etc.
        - hasUnsubscribeOption: Indicates marketing/newsletter emails
        - sizeEstimate: Large emails might contain important content
        - isStarred/isImportant: User-marked priority indicators
        
        Please provide:
        1. An overall summary prioritizing authenticated, high-priority, and personal emails
        2. Key insights categorized by email types and security status
        3. Top senders with trust indicators (trusted domains vs unknown)
        4. Action items focusing on high-priority, authenticated emails
        5. Security insights (unauthenticated or suspicious emails)
        6. Category breakdown (how many promotional vs personal vs updates)
        
        **DAILY SUMMARY FORMAT** (Concise Overview):
        {
          "summary": "Brief daily overview: X total emails, Y high-priority (authenticated), Z promotional. Key focus: [most important email or pattern]",
          "keyInsights": "1. Priority: X urgent emails need attention. 2. Security: Y% authenticated, Z suspicious. 3. Cleanup: A promotional emails can be unsubscribed.",
          "topSenders": ["Top 3-5 senders with trust indicators"],
          "actionItems": ["Max 3 concise action items, prioritized by importance and authentication"],
          "securityInsights": "Brief security overview: authenticated count, any red flags",
          "categoryBreakdown": {"PROMOTIONS": 0, "UPDATES": 0, "PERSONAL": 0, "SOCIAL": 0, "OTHER": 0},
          "notes": "Quick note on most urgent items or cleanup opportunities"
        }
        
        Keep it CONCISE - this is a daily overview, not detailed analysis. Focus on the most important patterns and immediate actions.
`;

// DetailedSummary now uses EmailSummary directly with all rich metadata
export type DetailedSummary = EmailSummary;

export const detailedSummaryPrompt = (
  emailSummaries: EmailSummary[],
  context?: string,
) => `
        ${context}Create a comprehensive, security-aware detailed report from these emails with rich metadata:
        
        ${JSON.stringify(emailSummaries, null, 2)}
        
        IMPORTANT: Leverage the metadata for intelligent analysis:
        - Prioritize high priorityScore (0.6+), authenticated, and trusted domain emails
        - Group by categories (PROMOTIONS, UPDATES, PERSONAL, SOCIAL)
        - Flag unauthenticated or suspicious emails for security review
        - Identify actionable items from personal/work emails vs promotional noise
        - Use sizeEstimate and isStarred for importance indicators
        
        Please provide a structured detailed summary with:
        1. Executive summary highlighting most important authenticated emails
        2. Priority action items (focus on high-priority, authenticated sources)
        3. Security assessment (authentication status, trusted vs unknown domains)
        4. Category analysis with importance distribution
        5. Suggested reply drafts for high-priority personal emails
        6. Important deadlines or dates from trusted sources
        7. Main topics/themes organized by category and priority
        8. Risk assessment (unauthenticated emails, suspicious patterns)
        9. Subscription management (emails with unsubscribe options)
        
        **DETAILED ANALYSIS FORMAT** (Comprehensive Report):
        {
          "executiveSummary": "Comprehensive analysis with specific email subjects, senders, and detailed priority breakdown",
          "emailByEmail": [
            {
              "subject": "Specific email subject",
              "sender": "Sender name", 
              "priorityLevel": "HIGH/MEDIUM/LOW",
              "requiresAction": true/false,
              "suggestedAction": "Specific action for this email",
              "securityStatus": "authenticated/suspicious/unknown"
            }
          ],
          "priorityActions": {
            "immediate": ["Specific actions needed today with email subjects"],
            "thisWeek": ["Actions needed this week"],
            "cleanup": ["Unsubscribe/archive suggestions with specific emails"]
          },
          "securityAssessment": {
            "authenticatedEmails": 0,
            "trustedDomains": 0,
            "suspiciousEmails": ["Detailed list with reasons"],
            "recommendations": ["Specific security actions to take"]
          },
          "categoryAnalysis": {
            "PERSONAL": {
              "emails": ["List specific personal email subjects"],
              "actionItems": ["Specific responses needed"],
              "deadlines": ["Any mentioned deadlines"]
            },
            "PROMOTIONS": {
              "emails": ["List promotional email subjects"], 
              "unsubscribeRecommendations": ["Which ones to unsubscribe from and why"]
            }
          },
          "suggestedReplies": [
            {
              "emailSubject": "Original email subject",
              "replyDraft": "Suggested reply text",
              "tone": "professional/casual/urgent"
            }
          ],
          "subscriptionManagement": {
            "keepSubscribed": ["Valuable subscriptions to keep"],
            "unsubscribeNow": ["Low-value subscriptions to remove"],
            "filterRecommendations": ["Gmail filter suggestions"]
          }
        }
        
        Note: Always prioritize authenticated emails from trusted domains. Treat unauthenticated emails with caution and flag them in the security assessment.
      `;
