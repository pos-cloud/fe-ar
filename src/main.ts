import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const appPort = 307;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    methods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization, X-API-Key',
  });

  await app.listen(appPort);
}
bootstrap();
