import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Add global prefix to all routes
  app.setGlobalPrefix('api/v1');

  // Enable validation
  app.useGlobalPipes(new ValidationPipe());

  // Enable CORS
  app.enableCors({
    origin: ['http://localhost:3000', 'https://gystify.app'],
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

  // Define the port and host
  const port = process.env.PORT || 8000;
  // If NODE_ENV is 'production' (or if the PORT is set by a hosting provider like Render),
  // bind to '0.0.0.0'. Otherwise, default to 'localhost' (or don't specify the host).
  // const host = process.env.NODE_ENV !== 'development' ? '0.0.0.0' : 'localhost';
  logger.log(`Starting server in ${process.env.NODE_ENV} mode...`);

  // Listen with the conditional host
  await app.listen(port, '0.0.0.0');

  const externalUrl = process.env.RENDER_EXTERNAL_URL;

  if (externalUrl) {
    logger.log(`🚀 Application is running on: ${externalUrl}`);
    logger.log(`🔗 API endpoints available at: ${externalUrl}/api/v1`);
    logger.log(
      `📚 Swagger documentation available at: ${externalUrl}/api/docs`,
    );
  } else {
    // Keep localhost logs for local development
    logger.log(`🚀 Application is running on: http://localhost:${port}`);
    logger.log(
      `🔗 API endpoints available at: http://localhost:${port}/api/v1`,
    );
    logger.log(
      `📚 Swagger documentation available at: http://localhost:${port}/api/docs`,
    );
  }
}

void bootstrap();
