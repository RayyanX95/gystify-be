import {
  Controller,
  Get,
  UseGuards,
  Req,
  Query,
  Post,
  Param,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
// InjectRepository removed; we inject the SummaryService directly
import type { Request } from 'express';
import { DailySummary, User } from '../entities';
import type { DailySummaryResult } from '../ai-summary/ai-summary.service';
import { SummaryService } from './summary.service';

@ApiTags('Daily Summaries')
@ApiBearerAuth()
@Controller('summaries')
@UseGuards(AuthGuard('jwt'))
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  @Post('generate')
  @ApiOperation({
    summary: 'Generate and persist a daily summary for the authenticated user',
    description:
      'Runs AI summarization over recent emails and stores a DailySummary record for the user. If a summary already exists for today, it will be updated with fresh data.',
  })
  @ApiResponse({
    status: 201,
    description: 'Daily summary created or updated',
    type: DailySummary,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generateForUser(@Req() req: Request): Promise<DailySummary> {
    const user = req.user as User;
    const result = await this.summaryService.generateAndPersist(user.id);
    return result;
  }

  @Post('preview')
  @ApiOperation({
    summary: 'Preview a short daily summary without persisting',
    description:
      'Runs a lightweight AI summary over a subset of recent emails and returns the generated summary. This does not write anything to the database.',
  })
  @ApiResponse({
    status: 200,
    description: 'Preview summary generated (not persisted)',
    type: DailySummary,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async previewForUser(@Req() req: Request): Promise<DailySummaryResult> {
    const user = req.user as User;
    return this.summaryService.previewSummary(user.id);
  }

  @Post(':id/expand')
  @ApiOperation({
    summary: 'Expand a summary into a detailed, actionable report',
    description:
      'Given a DailySummary ID and optional context, generate a detailed structured summary (highlights, priority actions, suggested reply drafts) using all emails from that summary date.',
  })
  @ApiParam({
    name: 'id',
    description: 'The DailySummary id to expand',
    type: String,
  })
  @ApiBody({
    description: 'Optional context to guide the expansion',
    schema: {
      type: 'object',
      properties: {
        context: { type: 'string' },
      },
      example: {
        context: 'Focus on action items and replies',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed expansion generated using all emails from that date',
    type: Object,
  })
  @ApiResponse({ status: 400, description: 'Invalid request payload' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Summary not found' })
  async expandSummary(
    @Param('id') summaryId: string,
    @Req() req: Request,
  ): Promise<Record<string, any>> {
    const { context } = req.body as { context?: string };

    return this.summaryService.expandSummaryById(summaryId, context);
  }

  @Get()
  @ApiOperation({ summary: 'Get daily summaries for user' })
  @ApiResponse({
    status: 200,
    description: 'Daily summaries retrieved',
    isArray: true,
    type: DailySummary,
  })
  async getDailySummaries(@Req() req: Request, @Query('limit') limit?: string) {
    const user = req.user as User;
    const limitNumber = limit ? parseInt(limit, 10) : 30;
    return this.summaryService.getDailySummaries(user.id, limitNumber);
  }
}
