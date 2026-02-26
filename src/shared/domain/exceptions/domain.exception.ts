export class DomainException extends Error {
  constructor(
    message: string,
    public readonly code: string = 'DOMAIN_ERROR',
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'DomainException';
  }
}

export class EntityNotFoundException extends DomainException {
  constructor(entityName: string, identifier: string | number) {
    super(`${entityName} with identifier "${identifier}" not found`, 'NOT_FOUND');
    this.name = 'EntityNotFoundException';
  }
}

export class EntityConflictException extends DomainException {
  constructor(message: string) {
    super(message, 'CONFLICT');
    this.name = 'EntityConflictException';
  }
}

export class ValidationException extends DomainException {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationException';
  }
}

export class UnauthorizedException extends DomainException {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED');
    this.name = 'UnauthorizedException';
  }
}

export class ForbiddenException extends DomainException {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN');
    this.name = 'ForbiddenException';
  }
}
