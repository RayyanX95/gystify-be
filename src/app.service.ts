import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'AI Email Summarizer Backend is running! 🚀';
  }
}
