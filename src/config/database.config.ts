import { ConfigService } from '@nestjs/config';

//! Docker command to run PostgreSQL container:
// docker run --name postgres-nest \
// -p 5432:5432 \
// -e POSTGRES_USER=postgres \
// -e POSTGRES_PASSWORD=password \
// -e POSTGRES_DB=email_summarizer \
// -d postgres

export const databaseConfig = {
  provide: 'DATABASE_CONFIG',
  useFactory: (configService: ConfigService) => ({
    type: 'postgres' as const,
    host: configService.get<string>('DATABASE_HOST'),
    port: parseInt(configService.get<string>('DATABASE_PORT') || '5432'),
    username: configService.get<string>('DATABASE_USERNAME'),
    password: configService.get<string>('DATABASE_PASSWORD'),
    database: configService.get<string>('DATABASE_NAME'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: configService.get('NODE_ENV') === 'development',
    logging: configService.get('NODE_ENV') === 'development',
  }),
  inject: [ConfigService],
};
