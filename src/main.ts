import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

const appPort = 307;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    methods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization, X-API-Key',
  });

  const config = new DocumentBuilder()
    .setTitle('FE-AR')
    .setDescription(
      [
        'API comercial de facturación electrónica (ARCA).',
        '',
        'Autorizá con **Authorize** y el header `X-API-Key` (la key `fp_live_…` de Administración).',
        '',
        '**Cuidado:** Try it out en `POST /v1/invoices` emite un comprobante real si la key y el CUIT están en producción.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'API key fp_live_… generada en Administración',
      },
      'api-key',
    )
    .addServer('/', 'Este servidor')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'FE-AR API',
    swaggerOptions: {
      persistAuthorization: true,
      tryItOutEnabled: true,
    },
  });

  await app.listen(appPort);
}
bootstrap();
