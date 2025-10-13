import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';

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
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        // 1. Get the full connection URL if it exists (for Render/Production)
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const nodeEnv = configService.get<string>('NODE_ENV');

        // 2. Determine SSL requirements based on environment
        const isProduction = nodeEnv === 'testing' || nodeEnv === 'production';
        const sslOptions = isProduction
          ? { rejectUnauthorized: false } // Required for Render public connection
          : false; // Not needed for local development

        // 3. Define the configuration options
        const configOptions: TypeOrmModuleOptions = {
          type: 'postgres',
          entities: [User, Sender, Snapshot, SnapshotItem, UserInteraction],
          synchronize: nodeEnv === 'development',
          logging: nodeEnv === 'development',

          // CRITICAL: Use the URL if available (Render)
          // Otherwise, fall back to separate variables (local .env)
          url: databaseUrl,

          host: databaseUrl
            ? undefined
            : configService.get<string>('DATABASE_HOST'),
          port: databaseUrl
            ? undefined
            : parseInt(configService.get<string>('DATABASE_PORT') || '5432'),
          username: databaseUrl
            ? undefined
            : configService.get<string>('DATABASE_USERNAME'),
          password: databaseUrl
            ? undefined
            : configService.get<string>('DATABASE_PASSWORD'),
          database: databaseUrl
            ? undefined
            : configService.get<string>('DATABASE_NAME'),

          // Render requires SSL for connections
          ssl: sslOptions,
        };

        return configOptions;
      },
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    EmailModule,
    AiSummaryModule,
    SchedulerModule,
    MetricsModule,
    SnapshotModule,
    SubscriptionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
