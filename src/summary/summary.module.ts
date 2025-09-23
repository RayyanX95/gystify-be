import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SummaryController } from './summary.controller';
import { DailySummary } from '../entities/daily-summary.entity';
import { SummaryService } from './summary.service';
import { AiSummaryModule } from '../ai-summary/ai-summary.module';
import { EmailModule } from '../email/email.module';
import { UserModule } from '../user/user.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DailySummary]),
    AiSummaryModule,
    EmailModule,
    UserModule,
    SubscriptionModule, // Required for SubscriptionGuard
  ],
  controllers: [SummaryController],
  providers: [SummaryService],
})
export class SummaryModule {}
