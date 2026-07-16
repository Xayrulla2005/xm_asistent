import * as Sentry from '@sentry/node';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app/app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { BugsService } from './modules/bugs/bugs.service';

async function bootstrap() {
  // Sentry — initialize before anything else so it captures bootstrap errors too
  if (process.env['SENTRY_DSN']) {
    Sentry.init({
      dsn:         process.env['SENTRY_DSN'],
      environment: process.env['NODE_ENV'] ?? 'development',
      tracesSampleRate: 0.2,        // 20% of requests traced for performance
      release:     process.env['APP_VERSION'] ?? 'unknown',
    });
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ── Security headers ───────────────────────────────────────────────────────
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow /uploads images
  }));

  // ── Compression ───────────────────────────────────────────────────────────
  app.use(compression());

  // ── CORS ──────────────────────────────────────────────────────────────────
  const allowedOrigins = [
    'http://localhost:4200',
    'http://localhost:4300',
    'http://localhost:4301',
    'http://localhost:4302',
    'https://xmasistent.uz',
    'https://admin.xmasistent.uz',
  ];
  if (process.env['FRONTEND_URL']) allowedOrigins.push(process.env['FRONTEND_URL']);
  if (process.env['ADMIN_URL'])    allowedOrigins.push(process.env['ADMIN_URL']);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // ── Global prefix & pipes ─────────────────────────────────────────────────
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // ── Static assets ─────────────────────────────────────────────────────────
  const uploadPath = process.env['UPLOAD_PATH']
    ? join(process.cwd(), process.env['UPLOAD_PATH'])
    : join(process.cwd(), 'apps/api/uploads');
  app.useStaticAssets(uploadPath, { prefix: '/uploads/' });

  // ── Global exception filter ───────────────────────────────────────────────
  const bugsService = app.get(BugsService);
  app.useGlobalFilters(new AllExceptionsFilter(bugsService));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`Application is running on: http://localhost:${port}/${globalPrefix}`);

  app.enableShutdownHooks();
}

process.on('unhandledRejection', (reason) => {
  console.error('[UnhandledRejection]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[UncaughtException]', err);
  process.exit(1);
});

bootstrap();
