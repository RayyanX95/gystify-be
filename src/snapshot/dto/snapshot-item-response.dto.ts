import { SenderResponseDto } from './sender-response.dto';

export class SnapshotItemResponseDto {
  id: string;
  messageId: string;
  subject: string;
  summary: string;
  finishReason?: string; // e.g., 'content_filter'
  snippet?: string;
  date: Date;
  openUrl?: string;

  // Actions
  isIgnoredFromSnapshots: boolean;
  isRemovedFromInbox: boolean;

  // Metadata
  attachmentsMeta?: Array<{
    filename: string;
    mimeType: string;
    size: number;
  }>;

  // Future phases (nullable for now)
  categoryTags?: string[];
  priorityScore?: number;
  priorityLabel?: 'urgent' | 'high' | 'medium' | 'low';

  // Sender details for UI
  sender: SenderResponseDto;

  createdAt: Date;
}
