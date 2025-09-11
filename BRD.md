# 📆 Email Summary SaaS — Timeline Plan

---

## **Phase 1: MVP — Basic Digest**

**Features**

- Connect to Gmail (OAuth). (Outlook integration moved to Phase 3)
- Fetch emails (via API).

- Summarize new emails → create **daily digest**.
- Store only **summary + metadata** (subject, sender, date, messageId).
- Deliver digest via **email or web dashboard**.

-**Technical requirements**

- Email integration: Gmail API (Outlook / Microsoft Graph API will be added in Phase 3).
- Summarization: Use LLM (e.g., GPT-4o-mini) with cost optimization.
- DB (Postgres or MongoDB):
  - Store user profile + tokens.
  - Store summaries (not full email content for privacy/security).

- Attachments: Ignore for now (skip).

👉 This keeps infra simple + avoids huge data storage issues.

---

## **Phase 2: Smarter Digest (Categorization)**

**Features**

- Break digest into **Action Items, FYI, Attachments/Links**.
- Detect tasks like _“please reply by…”_, _“deadline”_, etc.

**Technical requirements**

- Add NLP/LLM classification step after summary.
- Extend DB schema:
  - Store summary + **category tags** per email.

- Still: don’t store full email body (just extracted structured data).
- Attachments: Extract only **file metadata** (filename, type, size)

---

## **Phase 3: Priority Ranking (Urgency/Importance)**

**Features**

- Rank emails: 🔴 Urgent, 🟡 Medium, 🟢 Low.
- Show in digest → most important first.
- Add Outlook / Microsoft 365 (Graph API) integration (support Outlook mailboxes and OAuth via Microsoft identity platform).

**Technical requirements**

- Rule-based + AI hybrid:
  - Rule-based: subject includes "urgent", sender is boss → high priority.
  - AI: train/prompt LLM to predict urgency based on patterns.

- DB: add `priority` field to summaries.
- No need to store raw emails — just priority score + tags.

**Outlook / Microsoft Graph notes (Phase 3)**

- Scopes to request (delegated): `Mail.Read`, `offline_access`, `openid`, `profile`.
- Use Microsoft Graph to fetch messages and message metadata; store provider as `outlook` for compatibility.
- Map Outlook messageId to our `messageId` field; deduplicate by provider+messageId.
- Consider incremental sync via Graph delta queries for efficient polling.

---

## **Phase 4: Multi-Mode Summaries (User Preference)**

**Features**

- Let user choose summary style:
  - Bullet digest.
  - Narrative.
  - Nerd/developer-focused.

**Technical requirements**

- Add user preferences in DB (summaryStyle).
- At generation → pass “style” as prompt modifier to LLM.
- Storage: still summary text only, no change in DB design.

---

## **Phase 5: Productivity Integrations**

**Features**

- Export **Action Items** → Notion, Todoist, Trello.
- Push urgent items → Slack/Teams.
- Detect calendar events → Google Calendar API.

**Technical requirements**

- Build lightweight integration services (webhooks or API calls).
- DB: store “linked task IDs” to avoid duplication.
- Security: add OAuth scopes for each integration.

---

## **Phase 6: Personal Digest AI Profile**

**Features**

- AI learns from user behavior:
  - Emails they always archive → lower priority next time.
  - Frequent senders → boosted priority.
  - Custom rules (keywords, topics).

**Technical requirements**

- Tracking layer: store user interactions (clicked, ignored, marked important).
- Add **ML model or rules engine** for personalization.
- DB: add `userSignals` table (interaction logs).
- Summarizer uses this profile to tune output.

---

# 🏗️ Storage Strategy Recap

- **MVP:** store only **summary + metadata** (subject, sender, date, msgId).
- **Attachments:** only save metadata at first; later allow optional storage (S3).
- **Ranking/Categorization:** just tags + priority field in DB, no raw email body needed.
- **Privacy edge:** no permanent email body storage → strong selling point.

---

⚡ By this timeline, you launch in **\~2 months with MVP**, then every \~6–8 weeks add a new phase → each one gives you a fresh **marketing “release milestone.”**
