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
