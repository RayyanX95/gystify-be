import { SnapshotItemResponseDto } from './snapshot-item-response.dto';

export class SnapshotResponseDto {
  id: string;
  snapshotDate: string; // YYYY-MM-DD format
  totalItems: number;
  retentionExpiresAt: Date;
  createdAt: Date;
}

export class SnapshotWithItemsResponseDto extends SnapshotResponseDto {
  items: SnapshotItemResponseDto[];
}
