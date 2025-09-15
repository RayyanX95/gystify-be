import { Controller, Get, UseGuards } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsDto } from 'src/dto/metrics.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@Controller('metrics')
@ApiTags('Metrics')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  async getMetrics(): Promise<MetricsDto> {
    return this.metricsService.getMetrics();
  }
}
