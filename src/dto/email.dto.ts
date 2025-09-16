import {
  IsString,
  IsEmail,
  IsBoolean,
  IsOptional,
  IsNumber,
  IsDate,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GmailMessageDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  replyToEmail?: string;

  @ApiProperty()
  @IsString()
  // plain-text snippet (up to 1000 chars)
  @IsString()
  body: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  snippet?: string;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  receivedAt: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  internalDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labelIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string; // extracted from labelIds (PROMOTIONS, UPDATES, etc.)

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
  @IsBoolean()
  isStarred?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  priorityScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sizeEstimate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  historyId?: string;

  // Email authentication and security
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAuthenticated?: boolean; // based on SPF, DKIM, DMARC

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authenticationResults?: string;

  // Subscription management
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  listUnsubscribeUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasUnsubscribeOption?: boolean;

  // Sender reputation indicators
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  returnPath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFromTrustedDomain?: boolean;
}

export class SummaryEmailDto {
  @ApiProperty()
  @IsString()
  gmailId: string;

  @ApiProperty()
  @IsString()
  summaryDate: string;

  @ApiProperty()
  @IsNumber()
  totalEmails: number;

  @ApiProperty()
  @IsString()
  summary: string;

  @ApiProperty()
  @IsString()
  keyInsights: string;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  updatedAt: Date;

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
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  topSenders: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  actionItems: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  notes: string[];
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

  @ApiPropertyOptional()
  snippet?: string;
}
