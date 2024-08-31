import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const appPort = 307;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*', // Permite todas las peticiones desde cualquier origen
    methods: 'GET,POST,PUT,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
  });

  await app.listen(appPort);
}
bootstrap();
