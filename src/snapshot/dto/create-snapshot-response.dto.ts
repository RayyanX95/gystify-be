export class CreateSnapshotResponseDto {
  success: boolean;
  message: string;
  snapshot?: {
    id: string;
    totalItems: number;
    newEmailsProcessed: number;
  };
}
