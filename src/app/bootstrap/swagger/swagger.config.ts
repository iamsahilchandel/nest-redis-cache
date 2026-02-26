import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function configureSwagger(app: INestApplication, serverPort: string): void {
  const config = new DocumentBuilder()
    .setTitle('E-Commerce API with Redis Caching')
    .setDescription(
      'A Nest.js e-commerce API demonstrating Redis caching best practices for product management and performance optimization.\n\n' +
        '**Security Notes:**\n' +
        '- CSRF protection is enforced for browser-based requests\n' +
        '- API clients can bypass CSRF by providing a valid X-API-KEY header\n' +
        '- All API key comparisons use constant-time algorithms to prevent timing attacks\n' +
        '- Swagger UI is protected in production environments',
    )
    .setVersion('1.0.0')
    .addTag('auth', 'Authentication and user management')
    .addTag('products', 'Product management endpoints')
    .addTag('cache', 'Caching management and monitoring')
    .addTag('api', 'General API endpoints')
    .addTag('hot', 'Hot/Featured endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addApiKey({ type: 'apiKey', name: 'X-API-KEY', in: 'header' }, 'api-key')
    .addServer(`http://localhost:${serverPort}`, 'Local')
    .addServer('https://dev.yourapp.com', 'Development')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
