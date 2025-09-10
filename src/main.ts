import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable validation
  app.useGlobalPipes(new ValidationPipe());

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Email Summarizer API')
    .setDescription(
      'AI-powered email summarization and prioritization SaaS backend',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 8000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(
    `📚 Swagger documentation available at: http://localhost:${port}/api/docs`,
  );
}

void bootstrap();

// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImlicmFoaW0uYWxyYXlhbnlAZ21haWwuY29tIiwic3ViIjoiMDBhOWU4ZjAtZDE5ZC00YmQ0LWFjYzMtZGJmY2NiZDIyZWRkIiwiaWF0IjoxNzU3NTAxNzU1LCJleHAiOjE3NTgxMDY1NTV9.Vtl8gsFUbtiqVfn2k70vRNrvM1vgDyd7NLpah-CkpjU
