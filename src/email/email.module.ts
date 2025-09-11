import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailService } from './email.service';
import { EmailMessage } from '../entities/email-message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EmailMessage])],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
