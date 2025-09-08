import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulerService } from './scheduler.service';
import { User, DailySummary } from '../entities';
import { EmailModule } from '../email/email.module';
import { AiSummaryModule } from '../ai-summary/ai-summary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, DailySummary]),
    EmailModule,
    AiSummaryModule,
  ],
  providers: [SchedulerService],
})
export class SchedulerModule {}
