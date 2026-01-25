import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('E-Commerce API with Redis Caching')
    .setDescription(
      'A Nest.js e-commerce API demonstrating Redis caching best practices for product management and performance optimization.',
    )
    .setVersion('1.0.0')
    .addTag('products', 'Product management endpoints')
    .addTag('cache', 'Caching management and monitoring')
    .addTag('api', 'General API endpoints')
    .addApiKey({ type: 'apiKey', name: 'X-API-KEY', in: 'header' }, 'api-key')
    .addServer(`http://localhost:${process.env.SERVER_PORT ?? 3000}`, 'Local')
    .addServer('https://dev.yourapp.com', 'Development')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.SERVER_PORT ?? 3000);
}
bootstrap().catch((err) => {
  console.error('Error during application bootstrap:', err);
});
