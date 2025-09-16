import { gmail_v1 } from 'googleapis';
import { htmlToText } from 'html-to-text';

/** Extracts the raw body (prefers text/plain, falls back to text/html) from a Gmail message part */
export function extractEmailBody(payload: gmail_v1.Schema$MessagePart): string {
  let result = '';
  if (payload.body?.data) {
    result = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    return result;
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    }

    // Fallback to HTML if no plain text
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    }
  }

  return 'No content available';
}

/** Convert HTML to cleaned plain text (keeps full URLs, removes style/script blocks and zero-width chars) */
export function htmlToPlainText(html: string): string {
  if (!html) return '';

  // remove style/script blocks and comments before passing to html-to-text
  const cleaned = html
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ');

  let text = htmlToText(cleaned, {
    wordwrap: 130,
    selectors: [{ selector: 'a', options: { hideLinkHrefIfSameAsText: true } }],
  });

  // remove zero-width and common invisible characters
  text = text.replace(/\u{200B}|\u{200C}|\u{200D}|\u{FEFF}|\u{2060}/gu, '');

  // collapse whitespace and return (preserve full URLs)
  return text.replace(/\s+/g, ' ').trim();
}

/** Normalize and truncate a snippet to maxLen characters */
export function normalizeSnippet(text: string, maxLen = 1000): string {
  if (!text) return '';
  const collapsed = text.replace(/\s+/g, ' ').trim();
  return collapsed.slice(0, maxLen);
}

/** Extract category from Gmail labelIds */
export function extractEmailCategory(
  labelIds: string[] = [],
): string | undefined {
  const categoryMap: Record<string, string> = {
    CATEGORY_PROMOTIONS: 'PROMOTIONS',
    CATEGORY_UPDATES: 'UPDATES',
    CATEGORY_SOCIAL: 'SOCIAL',
    CATEGORY_FORUMS: 'FORUMS',
    CATEGORY_PERSONAL: 'PERSONAL',
  };

  for (const labelId of labelIds) {
    if (categoryMap[labelId]) {
      return categoryMap[labelId];
    }
  }

  return undefined;
}

/** Check if email has authentication (SPF, DKIM, DMARC pass) */
export function checkEmailAuthentication(
  headers: gmail_v1.Schema$MessagePartHeader[],
): {
  isAuthenticated: boolean;
  authenticationResults: string;
} {
  const authHeader =
    headers.find((h) => h.name?.toLowerCase() === 'authentication-results')
      ?.value || '';

  const spfPass = authHeader.includes('spf=pass');
  const dkimPass = authHeader.includes('dkim=pass');
  const dmarcPass = authHeader.includes('dmarc=pass');

  return {
    isAuthenticated: spfPass && dkimPass && dmarcPass,
    authenticationResults: authHeader,
  };
}

/** Extract unsubscribe information from headers */
export function extractUnsubscribeInfo(
  headers: gmail_v1.Schema$MessagePartHeader[],
): {
  hasUnsubscribeOption: boolean;
  listUnsubscribeUrl?: string;
} {
  const unsubscribeHeader = headers.find(
    (h) => h.name?.toLowerCase() === 'list-unsubscribe',
  )?.value;

  if (!unsubscribeHeader) {
    return { hasUnsubscribeOption: false };
  }

  // Extract HTTP URL from List-Unsubscribe header (prefer https over mailto)
  const urlMatch = unsubscribeHeader.match(/<(https?:\/\/[^>]+)>/);

  return {
    hasUnsubscribeOption: true,
    listUnsubscribeUrl: urlMatch ? urlMatch[1] : undefined,
  };
}

/** Check if sender is from a trusted domain */
export function isTrustedDomain(senderEmail: string): boolean {
  const trustedDomains = [
    // Major email providers
    'gmail.com',
    'outlook.com',
    'hotmail.com',
    'yahoo.com',
    'icloud.com',
    'protonmail.com',

    // Tech companies
    'google.com',
    'microsoft.com',
    'apple.com',
    'meta.com',
    'facebook.com',
    'instagram.com',
    'twitter.com',
    'x.com',
    'tiktok.com',
    'snapchat.com',

    // Developer/Work platforms
    'github.com',
    'gitlab.com',
    'stackoverflow.com',
    'atlassian.com',
    'slack.com',
    'discord.com',
    'zoom.us',
    'notion.so',
    'figma.com',

    // Professional networks
    'linkedin.com',
    'glassdoor.com',
    'indeed.com',

    // E-commerce & Finance
    'amazon.com',
    'ebay.com',
    'etsy.com',
    'shopify.com',
    'paypal.com',
    'stripe.com',
    'square.com',
    'venmo.com',
    'cashapp.com',

    // News & Media
    'substack.com',
    'medium.com',
    'youtube.com',
    'netflix.com',
    'spotify.com',

    // Banking (major institutions)
    'chase.com',
    'bankofamerica.com',
    'wellsfargo.com',
    'citi.com',
    'americanexpress.com',

    // Airlines & Travel
    'delta.com',
    'united.com',
    'american.com',
    'southwest.com',
    'expedia.com',
    'booking.com',
    'airbnb.com',

    // Government & Education
    'irs.gov',
    'usps.com',
    'fedex.com',
    'ups.com',
    'dhl.com',

    // Cloud & Services
    'aws.amazon.com',
    'azure.microsoft.com',
    'digitalocean.com',
    'heroku.com',
    'vercel.com',
    'netlify.com',
  ];

  const domain = senderEmail.split('@')[1]?.toLowerCase();
  return domain ? trustedDomains.includes(domain) : false;
}

/** Enhanced importance scoring with additional factors */
export function calculateEnhancedImportance(
  labelIds: string[] = [],
  headers: gmail_v1.Schema$MessagePartHeader[] = [],
  senderEmail: string = '',
  sizeEstimate: number = 0,
): { isImportant: boolean; score: number; factors: string[] } {
  const labels = new Set(labelIds.map((s) => s.toUpperCase()));
  const factors: string[] = [];
  let score = 0.5; // base score

  // Gmail labels
  if (labels.has('IMPORTANT')) {
    score = Math.max(score, 1.0);
    factors.push('marked-important');
  }
  if (labels.has('STARRED')) {
    score = Math.max(score, 0.85);
    factors.push('starred');
  }

  // Category adjustments
  if (labels.has('CATEGORY_PROMOTIONS')) {
    score = Math.min(score, 0.3);
    factors.push('promotional');
  } else if (labels.has('CATEGORY_UPDATES')) {
    score = Math.min(score, 0.4);
    factors.push('updates');
  } else if (labels.has('CATEGORY_PERSONAL')) {
    score = Math.max(score, 0.7);
    factors.push('personal');
  }

  // Header-based importance
  const findHeader = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value;

  const importance = findHeader('Importance')?.toLowerCase();
  const priority = findHeader('Priority')?.toLowerCase();
  const xPriority = findHeader('X-Priority');

  if (importance === 'high' || priority === 'urgent') {
    score = Math.max(score, 0.8);
    factors.push('high-priority-header');
  }

  if (xPriority && /^[1-2]/.test(xPriority)) {
    score = Math.max(score, 0.9);
    factors.push('x-priority-high');
  }

  // Trusted domain bonus
  if (isTrustedDomain(senderEmail)) {
    score = Math.min(score + 0.1, 1.0);
    factors.push('trusted-domain');
  }

  // Size consideration (very large emails might be important)
  if (sizeEstimate > 50000) {
    score = Math.min(score + 0.05, 1.0);
    factors.push('large-email');
  }

  return {
    isImportant: score >= 0.6,
    score: Math.round(score * 100) / 100,
    factors,
  };
}
