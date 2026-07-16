import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app/app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { BugsService } from './modules/bugs/bugs.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const allowedOrigins = [
    'http://localhost:4200',
    'http://localhost:4300',
    'http://localhost:4301',
    'http://localhost:4302',
  ];
  if (process.env['FRONTEND_URL']) allowedOrigins.push(process.env['FRONTEND_URL']);
  if (process.env['ADMIN_URL'])    allowedOrigins.push(process.env['ADMIN_URL']);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useStaticAssets(join(process.cwd(), 'apps/api/uploads'), {
    prefix: '/uploads/',
  });

  // Global exception filter — auto-captures 500s as bug reports
  const bugsService = app.get(BugsService);
  app.useGlobalFilters(new AllExceptionsFilter(bugsService));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `Application is running on: http://localhost:${port}/${globalPrefix}`,
  );

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
