import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Request } from 'express';
import { DailySummary, User } from '../entities';

@ApiTags('Daily Summaries')
@ApiBearerAuth()
@Controller('summaries')
@UseGuards(AuthGuard('jwt'))
export class SummaryController {
  constructor(
    @InjectRepository(DailySummary)
    private dailySummaryRepository: Repository<DailySummary>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get daily summaries for user' })
  @ApiResponse({ status: 200, description: 'Daily summaries retrieved' })
  async getDailySummaries(@Req() req: Request, @Query('limit') limit?: string) {
    const user = req.user as User;
    const limitNumber = limit ? parseInt(limit, 10) : 30;

    return this.dailySummaryRepository.find({
      where: { user: { id: user.id } },
      order: { summaryDate: 'DESC' },
      take: limitNumber,
    });
  }
}
