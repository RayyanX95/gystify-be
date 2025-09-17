import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnapshotController } from './snapshot.controller';
import { SnapshotService } from './snapshot.service';
import { Snapshot, SnapshotItem, Sender } from '../entities';
import { EmailModule } from '../email/email.module';
import { AiSummaryModule } from '../ai-summary/ai-summary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Snapshot, SnapshotItem, Sender]),
    EmailModule,
    AiSummaryModule,
  ],
  controllers: [SnapshotController],
  providers: [SnapshotService],
  exports: [SnapshotService],
})
export class SnapshotModule {}
