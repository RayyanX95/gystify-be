# 📆 Gystify — Snapshot-based Email Summary SaaS (Updated BRD)

This document describes the product direction for Gystify based on the provided dashboard / snapshot screenshots (Prebox used only as a visual/reference example). The product centers on daily "snapshots" (per-user snapshots created once per day) that summarize every unread email at snapshot time. Each unread email becomes one snapshot item (card) with a short summary and metadata. Users can open the original email in Gmail, remove (archive/delete) the original from their Gmail inbox via the UI, and mark an item as "deleted" on the snapshot UI which visually dims it (soft-delete in the snapshot).

---

## Summary of core concept

- Snapshots: one snapshot per user per day containing summarized entries for each unread email at snapshot creation time.
- Snapshot item: one summarized entry per unread message — summary text + metadata (subject, sender, date, messageId, provider).
- Actions from snapshot UI:
  - Open in Gmail (link to the original email).
  - Remove from inbox (perform action on Gmail: archive/move/delete depending on user preference).
  - Mark as deleted on snapshot (soft-delete / dim the card; doesn't necessarily remove the email from Gmail).
- Privacy: we store only summary + metadata for each snapshot item — no full email bodies persisted.

---

## Phase 1: MVP — Daily Snapshots for Unread Email

Features

- Gmail OAuth integration (scopes to read metadata and modify messages for remove action).
- Create one snapshot per user per day that:
  - Queries Gmail for unread messages at snapshot time.
  - Generates a concise summary for each unread message (one snapshot item per message).
  - Renders snapshot items as cards (see screenshots).
- Snapshot item fields: summary (text), subject, sender, date, messageId, provider ("gmail"), snippet(optional), attachments metadata (filename/type/size) — attachments ignored by default except metadata.
- UI actions exposed in the snapshot:
  - Open (link to Gmail message).
  - Remove (archive/delete message in Gmail; requires appropriate OAuth scope and user confirmation).
  - Mark as deleted on snapshot (soft-delete flag; UI renders card dimmed).
- Delivery: snapshots accessible via web dashboard and optionally emailed to user.

Technical requirements

- Email integration: Gmail API (use incremental sync or list/unread query).
- Summarization: LLM (cost-optimized model) to create per-email summaries.
- DB: Postgres (or MongoDB) with these core entities:
  - users (profile, tokens, preferences)
  - snapshots (userId, date, createdAt, retentionExpiresAt)
  - snapshot_items (snapshotId, messageId, provider, subject, sender, date, summary, categoryTags[], priority?, deletedOnSnapshot boolean, inboxRemoved boolean, attachmentsMeta)
- Keep full email bodies out of persistent storage.
- Snapshot retention: snapshots auto-delete after 72 hours (matches screenshots).
- Attachments: initially only capture attachment metadata; actual files ignored.

UX notes (from screenshots)

- Left column: sender list / filter.
- Main area: per-email cards with summary bullets, "Open" and "Delete" buttons (Delete here is the snapshot-item delete which dims the card). Provide a separate confirmation/action for removing from Gmail.
- Dashboard shows trial usage quota and recent snapshots — include counts and quick-create snapshot button.

Launch target

- Launch MVP within ~2 months with Gmail-only snapshots, per-email summaries, and the snapshot UI actions.

---

## Phase 2: Smarter Snapshot Items (Categorization)

Features

- Classify each snapshot item into categories (Action Items, FYI, Attachments/Links).
- Detect tasks and deadlines (e.g., "please reply by", "due", date mentions) and flag as action items.

Technical requirements

- Add NLP/LLM classification step after summarization.
- DB: extend snapshot_items with category tags and extracted structured fields (dueDate, hasAction boolean).
- UI: group snapshot items within a snapshot by category.

Privacy

- Still avoid storing raw email bodies.

---

## Phase 3: Priority & Outlook Integration

Features

- Priority ranking on snapshot items: Urgent / Medium / Low.
- Outlook / Microsoft 365 integration (Microsoft Graph), mapping provider = "outlook".
- Incremental sync for both providers (Gmail history IDs, Graph delta queries).

Technical requirements

- Hybrid rules + AI for priority.
- DB: add priorityScore, priorityLabel to snapshot_items.
- Deduplicate by provider + messageId.

OAuth/scopes (Phase 3)

- Gmail: scopes for read, modify, offline_access.
- Microsoft Graph: Mail.Read, Mail.ReadWrite (for remove), offline_access, openid, profile.

---

## Phase 4: Multi-Mode Summaries & Preferences

Features

- Allow user preference for summary style per snapshot (bullet, narrative, developer).
- Let user choose whether snapshot "Delete" dims only snapshot or also removes from inbox by default.

Technical requirements

- DB: add user preferences for summaryStyle and defaultInboxAction (none/archive/delete).
- Pass style instruction to LLM at generation time.

---

## Phase 5: Productivity Integrations

Features

- Export Action Items → Notion, Todoist, Trello.
- Push urgent items → Slack/Teams.
- Calendar detection → Google Calendar suggestions.

Technical requirements

- Add lightweight integration connectors, store linked task IDs to avoid duplicates.
- OAuth flows for each integration.

---

## Phase 6: Personal Snapshot AI Profile

Features

- Learn from user actions on snapshot items:
  - Items user always dims/ignores → deprioritize next time.
  - Items user regularly removes from inbox → treat sender or subject patterns preferentially.
- Allow custom rules and boosts.

Technical requirements

- Track userInteractions (clicked, ignored, removedFromInbox, deletedOnSnapshot).
- Build personalization layer to adjust priority and summary focus.

---

## Data model (concise)

- users
  - id, email, oauthTokens, preferences (summaryStyle, defaultInboxAction), createdAt
- snapshots
  - id, userId, snapshotDate, createdAt, retentionExpiresAt
- snapshot_items
  - id, snapshotId, provider, messageId, subject, sender, date, summary, snippet, categoryTags[], priorityScore, priorityLabel, attachmentsMeta[], deletedOnSnapshot (bool), inboxRemoved (bool), openUrl
- userInteractions
  - id, userId, snapshotItemId, actionType, actionAt, metadata

Retention & privacy

- Snapshots auto-expire (default 72h).
- No raw email bodies stored by default — only summaries + minimal metadata.
- User can opt into storing attachments in S3 (future).

---

## Snapshot lifecycle & actions (detailed)

- Creation:
  - Daily scheduled job (or manual "Create Snapshot" button) fetches all unread messages for the user at that moment.
  - For each message, generate a summary + metadata and write snapshot_item.
- UI actions per snapshot item:
  - Open: openUrl → Gmail web view for that message.
  - Remove from inbox: call Gmail API to archive/delete the message. On success set inboxRemoved = true.
  - Mark deleted on snapshot: set deletedOnSnapshot = true (UI dims card). This is purely snapshot-scoped (does not modify Gmail unless user also chooses Remove).
- Sync considerations:
  - When performing inbox actions, reflect result in snapshot_item.inboxRemoved.
  - Deduplicate messages using provider + messageId.

---

## Operational notes

- Cost control: batch LLM calls and prompt-engineer for shorter summaries; consider per-snapshot token budgets.
- Security: store tokens encrypted, request minimum scopes. Surface clear confirmations before performing inbox removals.
- Audit/Logging: track API calls that modify inbox (who requested remove, when, status).

---

## Quick roadmap (high level)

- MVP (Gmail snapshots + per-email summaries + Open/Remove/Mark-deleted on snapshot; 72h retention) — target release in ~2 months.
- Next releases: categorization, priority, Outlook integration, multi-mode summaries, integrations, personalization.

---
