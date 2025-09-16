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
        
        IMPORTANT: Use the provided metadata to produce data-driven, security-aware insights. Helpful notes:
        - category: Group messages by category (PROMOTIONS, UPDATES, SOCIAL, PERSONAL, OTHER).
        - priorityScore: Numeric importance (0.0-1.0). Treat >= 0.6 as high priority.
        - isAuthenticated: True indicates sender authentication (DKIM/SPF) — more trustworthy.
        - isFromTrustedDomain: True for major platforms (gmail.com, linkedin.com, github.com); use this to prioritize trusted notifications.
        - hasUnsubscribeOption: True indicates marketing/newsletters — candidate for cleanup.
        - sizeEstimate: Large messages/files might contain attachments or important content.
        - isStarred/isImportant: User-marked flags that override automatic scoring when present.
        
        Please provide (for the DAILY SUMMARY):
        1. A short headline/title for the summary (one-line, e.g. '3 new messages — 1 urgent').
        2. A concise, human-readable snapshot that states totals and the main focus (use the "summary" field below).
        3. Top 3 senders and whether they are from trusted domains or unknown sources.
        4. Up to 3 prioritized action items (focus on authenticated and high-priority emails).
        5. A brief security note: number authenticated vs unauthenticated and any immediate red flags.
        6. A simple category breakdown (PROMOTIONS, UPDATES, PERSONAL, SOCIAL, OTHER) with counts.
        
        **DAILY SUMMARY FORMAT** (Concise Overview):
        {
          "title": "Short headline for the summary (e.g. '3 new messages — 1 urgent')",
          "summary": "Daily snapshot: X emails received; Y flagged as high-priority (authenticated). Main focus: [most important email or notable pattern].",
          "keyInsights": "1) Priority: X emails require attention. 2) Security: Y% authenticated, Z suspicious. 3) Cleanup: A promotional emails recommended for unsubscribe or archive.",
          "topSenders": ["Top 3–5 senders with trust indicators (trusted/unknown)"],
          "actionItems": ["Up to 3 concise actions, ordered by priority (focus on authenticated/high-priority emails)"],
          "securityInsights": "Short security note: number authenticated, any red flags or suspicious senders",
          "categoryBreakdown": {"PROMOTIONS": 0, "UPDATES": 0, "PERSONAL": 0, "SOCIAL": 0, "OTHER": 0},
          "notes": "One-line note on the most urgent items or cleanup recommendations"
        }

        Keep it CONCISE — this is a short daily overview (headline + snapshot). Focus on immediate actions and any security red flags.
`;

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
        
  Please provide a structured detailed summary including:
  1. A short report title (one-line) and an executive summary that calls out the top authenticated/high-priority items.
  2. Priority action items split into immediate, this week, and cleanup categories (include email subjects where relevant).
  3. A security assessment with counts of authenticated emails, trusted domains, and any suspicious items (with reasons).
  4. Category analysis showing counts and importance distribution across PERSONAL, PROMOTIONS, UPDATES, SOCIAL, OTHER.
  5. Suggested reply drafts for the top high-priority personal/work emails (tone and short draft).
  6. Any important deadlines or dates extracted from trusted sources.
  7. Main topics/themes grouped by category and priority (short bullet list).
  8. Risk assessment with flagged unauthenticated emails and recommended actions.
  9. Subscription management recommendations: keep, unsubscribe, and suggested filters.
        
        **DETAILED ANALYSIS FORMAT** (Comprehensive Report):
        {
          "title": "Short report title (e.g. 'Daily detail — 5 messages, 2 urgent')",
          "executiveSummary": "Comprehensive analysis listing the most important authenticated messages and overall priorities",
          "emailByEmail": [
            {
              "subject": "Specific email subject",
              "sender": "Sender name",
              "priorityLevel": "HIGH/MEDIUM/LOW",
              "requiresAction": true/false,
              "suggestedAction": "Suggested next step for this email",
              "securityStatus": "authenticated/suspicious/unknown"
            }
          ],
          "priorityActions": {
            "immediate": ["Actions to take today (include email subjects)"],
            "thisWeek": ["Actions to take this week"],
            "cleanup": ["Unsubscribe/archive/filter suggestions"]
          },
          "securityAssessment": {
            "authenticatedEmails": 0,
            "trustedDomains": 0,
            "suspiciousEmails": ["List suspicious emails with reasons"],
            "recommendations": ["Security steps to take"]
          },
          "categoryAnalysis": {
            "PERSONAL": {
              "emails": ["Personal email subjects"],
              "actionItems": ["Responses needed"],
              "deadlines": ["Mentioned deadlines, if any"]
            },
            "PROMOTIONS": {
              "emails": ["Promotional email subjects"],
              "unsubscribeRecommendations": ["Which to unsubscribe and why"]
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
            "filterRecommendations": ["Gmail filter suggestions (by sender/subject/label)"]
          }
        }
        
        Note: Always prioritize authenticated emails from trusted domains. Treat unauthenticated emails with caution and flag them in the security assessment.
      `;
