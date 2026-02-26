import { Logger } from '@nestjs/common';
import { bootstrap } from './app/bootstrap/app.bootstrap';

bootstrap().catch((err) => {
  const logger = new Logger('Bootstrap');
  logger.error('❌ Error during application bootstrap:', err.stack);
  process.exit(1);
});
