import {
  IsString,
  IsEmail,
  IsBoolean,
  IsOptional,
  IsNumber,
  IsDate,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateEmailMessageDto {
  @ApiProperty()
  @IsString()
  gmailId: string;

  @ApiProperty()
  @IsString()
  threadId: string;

  @ApiProperty()
  @IsString()
  subject: string;

  @ApiProperty()
  @IsString()
  sender: string;

  @ApiProperty()
  @IsEmail()
  senderEmail: string;

  @ApiProperty()
  @IsString()
  // plain-text snippet (up to 1000 chars)
  @IsString()
  body: string;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  receivedAt: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isImportant?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  priorityScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;
}

export class EmailSummaryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  subject: string;

  @ApiProperty()
  sender: string;

  @ApiProperty()
  senderEmail: string;

  @ApiProperty()
  receivedAt: Date;

  @ApiProperty()
  isImportant: boolean;

  @ApiProperty()
  priorityScore: number;

  @ApiProperty()
  summary: string;
}
