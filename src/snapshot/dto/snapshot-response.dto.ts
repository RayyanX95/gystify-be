import { SnapshotItemResponseDto } from './snapshot-item-response.dto';

export class SnapshotResponseDto {
  id: string;
  snapshotDate: string; // YYYY-MM-DD format
  totalItems: number;
  retentionExpiresAt: Date;
  createdAt: Date;

  // Priority level counts
  priorityCounts?: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
}

export class SnapshotWithItemsResponseDto extends SnapshotResponseDto {
  items: SnapshotItemResponseDto[];
}
