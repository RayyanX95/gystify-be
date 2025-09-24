import { Module } from '@nestjs/common';
import { ConversionController } from './conversion.controller';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [SubscriptionModule],
  controllers: [ConversionController],
})
export class ConversionModule {}
