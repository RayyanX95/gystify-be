import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { EmailModule } from './email/email.module';
import { AiSummaryModule } from './ai-summary/ai-summary.module';
import { SchedulerModule } from './scheduler/scheduler.module';

import {
  User,
  Sender,
  Snapshot,
  SnapshotItem,
  UserInteraction,
} from './entities';
import { MetricsModule } from './metrics/metrics.module';
import { SnapshotModule } from './snapshot/snapshot.module';
import { SubscriptionModule } from './subscription/subscription.module';
// import { ConversionModule } from './conversion/conversion.module'; // Kept for future reference

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST'),
        port: parseInt(configService.get<string>('DATABASE_PORT') || '5432'),
        username: configService.get<string>('DATABASE_USERNAME'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        entities: [User, Sender, Snapshot, SnapshotItem, UserInteraction],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    UserModule,
    EmailModule,
    AiSummaryModule,
    SchedulerModule,
    MetricsModule,
    SnapshotModule,
    SubscriptionModule,
    // ConversionModule, // Disabled for MVP - kept for future reference
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
