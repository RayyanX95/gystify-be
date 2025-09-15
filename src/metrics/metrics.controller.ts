import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsDto } from 'src/dto/metrics.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { User } from '../entities/user.entity';
import type { Request } from 'express';

@Controller('metrics')
@ApiTags('Metrics')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  async getMetrics(@Req() req: Request): Promise<MetricsDto> {
    const user = req.user as User;
    return this.metricsService.getMetrics(user.id);
  }
}
