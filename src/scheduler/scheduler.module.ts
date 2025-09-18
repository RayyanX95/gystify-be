import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulerService } from './scheduler.service';
import { User, DailySummary, Snapshot } from '../entities';
import { EmailModule } from '../email/email.module';
import { AiSummaryModule } from '../ai-summary/ai-summary.module';
import { SnapshotModule } from '../snapshot/snapshot.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, DailySummary, Snapshot]),
    EmailModule,
    AiSummaryModule,
    SnapshotModule,
  ],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
