import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const appPort = 307s;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(appPort);
}
bootstrap();
