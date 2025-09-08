import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { EmailService } from './email.service';
import { EmailSummaryResponseDto } from '../dto/email.dto';
import { User } from '../entities/user.entity';

@ApiTags('Emails')
@ApiBearerAuth()
@Controller('emails')
@UseGuards(AuthGuard('jwt'))
export class EmailController {
  constructor(private emailService: EmailService) {}

  @Post('sync')
  @ApiOperation({ summary: 'Sync emails from Gmail' })
  @ApiResponse({ status: 200, description: 'Emails synced successfully' })
  async syncEmails(@Req() req: Request) {
    const user = req.user as User;
    const emails = await this.emailService.fetchGmailMessages(user);
    return {
      message: 'Emails synced successfully',
      count: emails.length,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get user emails' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Emails retrieved successfully',
    type: [EmailSummaryResponseDto],
  })
  async getEmails(@Req() req: Request, @Query('limit') limit?: string) {
    const user = req.user as User;
    const limitNumber = limit ? parseInt(limit, 10) : 50;
    return this.emailService.findByUserId(user.id, limitNumber);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark email as read' })
  @ApiResponse({ status: 200, description: 'Email marked as read' })
  async markAsRead(@Param('id') emailId: string) {
    await this.emailService.markAsRead(emailId);
    return { message: 'Email marked as read' };
  }
}
