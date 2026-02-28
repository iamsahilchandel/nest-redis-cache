import { Controller, Get, Req, Logger, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { AppService } from './app.service';

@ApiTags('api')
@Controller({ version: VERSION_NEUTRAL, path: '/' })
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get hello message' })
  @ApiResponse({ status: 200, description: 'Returns a hello message' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('csrf-token')
  @ApiOperation({
    summary: 'Get CSRF token',
    description:
      'Get CSRF token for form submissions. Note: CSRF protection is automatically bypassed when a valid X-API-KEY header is provided.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns CSRF token for form submissions',
    schema: {
      type: 'object',
      properties: {
        csrfToken: {
          type: 'string',
          example: 'csrf-token-here',
        },
      },
    },
  })
  getCsrfToken(@Req() req: Request): { csrfToken: string } {
    this.logger.log(`CSRF token requested from IP: ${req.ip}`);
    return { csrfToken: req.headers['csrf-token'] as string };
  }
}
