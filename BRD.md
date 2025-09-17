# 📆 Gystify — Snapshot-based Email Summary SaaS (Updated & Enhanced BRD)

This document describes the product direction for Gystify. The product centers on daily "snapshots" that summarize every unread email at a specific moment. Each unread email becomes a snapshot item (card) with a short summary and metadata. Users can act on these items directly from the Gystify interface.

---

## Summary of Core Concept

- **Snapshots**: One snapshot per user per day containing summarized entries for each unread email at snapshot creation time.
- **Snapshot Item**: One summarized entry per unread message — summary text + metadata (subject, sender, date, etc.).
- **Actions**: From the snapshot UI, users can open the original email, remove it from their Gmail inbox, and visually dismiss items on the snapshot.
- **Privacy First**: We only store the summary and metadata for each snapshot item — **no full email bodies are ever persisted** on our servers.

---

## Phase 1: MVP — Daily Snapshots for Unread Email

#### **Features**

- **Gmail OAuth Integration**: Scopes to read metadata and modify messages (for the remove action).
- **Daily Snapshot Creation**: Generate one snapshot per user per day that queries Gmail for unread messages and creates a concise summary for each one.
- **Snapshot Item Fields**: summary (text), subject, sender name & email, date, messageId, provider ("gmail"), snippet (optional), and attachments metadata (filename/type/size).
- **UI Actions**:
  - **Open**: Link directly to the message in the Gmail web view.
  - **Mark as Ignored on Snapshot**: The primary, one-click action. Sets a soft-delete flag, visually dimming the card. This **does not** affect the email in Gmail.
  - **Remove from Inbox**: A secondary action requiring explicit confirmation. Archives or deletes the message in Gmail via API call.
  - Summarize the **50 most recent** unread emails from current day.

#### **Technical Requirements**

- **Email Integration**: Gmail API (using list/unread query).
- **Summarization**: Cost-optimized LLM to create per-email summaries.
- **DB**: Postgres with core entities (see Data Model section). A dedicated `senders` table will be used to efficiently populate the sender filter UI and support future personalization.
- **Privacy**: Full email bodies are processed in-memory and are not persisted.
- **Snapshot Retention**: Snapshots and their items are automatically deleted after 72 hours.

#### **UX Notes**

- The primary action on a card should be the non-destructive "Mark as Done." The "Remove from Inbox" action should be clearly distinct and require a second confirmation step to prevent accidental data loss.

---

## Phase 2: Smarter Snapshot Items (Categorization)

#### **Features**

- Classify each snapshot item into categories (e.g., **Action Item, FYI, Newsletter, Receipt**).
- Detect tasks and deadlines (e.g., "please reply by," "due") and automatically flag items as requiring action.

---

## Phase 3: Priority & Outlook Integration

#### **Features**

- Priority ranking on snapshot items: **Urgent / High / Medium / Low**.
- **Microsoft 365 / Outlook** integration via Microsoft Graph API.

---

## Phase 4: Multi-Mode Summaries & Preferences

#### **Features**

- User preferences for summary style per snapshot (e.g., **bullet points, narrative paragraph, developer-focused**).
- User preference to set the default "Remove from Inbox" behavior (archive vs. delete).

---

## Phase 5: Productivity Integrations

#### **Features**

- Export "Action Items" to tools like **Notion, Todoist, or Trello**.
- Push urgent items or summaries to **Slack or Microsoft Teams**.

---

## Phase 6: Personal Snapshot AI Profile

#### **Features**

- Learn from user actions on snapshot items (e.g., items the user always marks as done immediately).
- Allow users to create custom rules (e.g., "Always mark emails from this sender as low priority").

---

## Data Model (Concise)

- **users**
  - id, email, firstName, lastName, profilePicture, oauthTokens, gmail_refreshtoken,
- **senders**
  - id, userId, name, emailAddress (unique per user), domain
- **snapshots**
  - id, userId, snapshotDate, createdAt, retentionExpiresAt
- **snapshot_items**
  - id, snapshotId, **senderId**, provider, messageId, subject, date, summary, categoryTags[], priorityScore, priorityLabel, attachmentsMeta[], **isIgnoredFromSnapshots** (bool), **isRemovedFromInbox** (bool), openUrl
- **userInteractions**
  - id, userId, snapshotItemId, actionType (e.g., 'mark_ignored', 'remove_inbox'), actionAt

---

## KPIs & Success Metrics

- **Phase 1 (MVP)**
  - **Activation**: Weekly new user sign-ups.
  - **Engagement**: Daily Active Users (DAU), % of users creating a snapshot daily.
  - **Core Value**: Average items actioned (marked ignored or removed) per snapshot.
- **Phase 2 (Categorization)**
  - **Feature Adoption**: % of users who use category filters.
  - **Accuracy**: Rate of manual re-categorization by users (lower is better).

---

## Quick Roadmap (High-Level)

- **MVP (Q1)**: Gmail snapshots, per-email summaries, Open/Mark-Ignored/Remove actions, 72h retention.
- **Next Releases (Q2-Q3)**: Categorization, priority ranking, Outlook integration.
- **Future (Q4+)**: Multi-mode summaries, productivity integrations, and personalization.
