import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransactionalInterceptor } from './common/interceptors/transactional.interceptor';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const reflector = app.get(Reflector);

  app.setGlobalPrefix(config.get<string>('API_PREFIX') || 'api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(app.get(AllExceptionsFilter));
  app.useGlobalInterceptors(app.get(TransactionalInterceptor));
  app.useGlobalGuards(app.get(ThrottlerGuard));

  app.enableCors({
    origin: (config.get<string>('CORS_ORIGINS') || '').split(',').map((s) => s.trim()),
    credentials: true,
  });

  // Security headers (rules.md §4 Network Security Checklist).
  // Helmet is avoided to keep deps minimal; headers set explicitly.
  app.use((_req: unknown, res: import('express').Response, next: import('express').NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'");
    // HSTS only meaningful over HTTPS; included for completeness behind TLS terminator.
    if (config.get<string>('NODE_ENV') === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  const port = config.get<number>('PORT') || 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API running on http://localhost:${port}/${config.get('API_PREFIX')}`);
}
bootstrap();
