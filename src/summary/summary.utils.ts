import { DailySummaryResult } from '../ai-summary/ai-summary.service';
import { GmailMessageDto } from '../dto/email.dto';

/**
 * Mock data for daily summary to save OpenAI API quota during development
 */
export const getMockDailySummary = (
  emails: GmailMessageDto[],
): DailySummaryResult => {
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

  const importantEmails = emails.filter((e) => e.isImportant).length;

  return {
    summary: `Today you received ${emails.length} emails. ${importantEmails > 0 ? `${importantEmails} were marked as important.` : 'No high-priority emails detected.'} Most emails came from ${topSenders.slice(0, 3).join(', ')}.`,
    totalEmails: emails.length,
    importantEmails,
    keyInsights: `Main senders: ${topSenders.slice(0, 3).join(', ')}. ${importantEmails > 0 ? 'Several important emails require attention.' : 'Regular email activity with no urgent items.'}`,
    topSenders,
    actionItems: [
      ...(importantEmails > 0 ? ['Review important emails'] : []),
      'Check for follow-up responses',
      'Archive processed emails',
    ],
    aiProcessingTimeMs: Math.floor(Math.random() * 100) + 50, // Mock processing time
  };
};

/**
 * Mock data for detailed summary to save OpenAI API quota during development
 */
export const getMockDetailedSummary = (
  emails: GmailMessageDto[],
  context?: string,
): Record<string, any> => {
  const importantEmails = emails.filter((e) => e.isImportant);
  const senders = [...new Set(emails.map((e) => e.sender))];
  const subjects = emails.map((e) => e.subject).slice(0, 5);

  return {
    summary: `Detailed analysis of ${emails.length} emails${context ? ` with context: ${context.substring(0, 50)}...` : ''}`,
    highlights: [
      `Processed ${emails.length} emails from ${senders.length} different senders`,
      ...(importantEmails.length > 0
        ? [`${importantEmails.length} high-priority emails identified`]
        : []),
      'No urgent security alerts detected',
      'Regular communication patterns observed',
    ],
    actionItems: [
      ...(importantEmails.length > 0
        ? ['Review high-priority emails immediately']
        : []),
      'Respond to pending customer inquiries',
      'Follow up on project updates',
      'Archive completed conversations',
    ],
    suggestedReplies: [
      'Thank you for your email. I will review and get back to you shortly.',
      'I have received your message and will address this by end of day.',
      'Let me check on this and provide you with an update.',
    ],
    deadlines: [
      ...(importantEmails.length > 0
        ? ['High-priority items: End of day today']
        : []),
      'Customer responses: Within 24 hours',
      'Internal updates: End of week',
    ],
    mainTopics: subjects.length > 0 ? subjects : ['General correspondence'],
    emailBreakdown: {
      byImportance: {
        high: importantEmails.length,
        medium: Math.floor(emails.length * 0.3),
        low:
          emails.length -
          importantEmails.length -
          Math.floor(emails.length * 0.3),
      },
      bySender: senders.slice(0, 5).map((sender) => ({
        sender,
        count: emails.filter((e) => e.sender === sender).length,
      })),
    },
    sentiment: 'neutral',
    processingTime: Math.floor(Math.random() * 200) + 100,
  };
};
