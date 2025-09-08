import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SummaryController } from './summary.controller';
import { DailySummary } from '../entities/daily-summary.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DailySummary])],
  controllers: [SummaryController],
})
export class SummaryModule {}
