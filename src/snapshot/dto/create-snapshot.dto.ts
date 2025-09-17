import { IsOptional, IsString } from 'class-validator';

export class CreateSnapshotDto {
  @IsOptional()
  @IsString()
  scope?: 'recent' | 'today'; // Default to 'recent' (50 emails)
}
