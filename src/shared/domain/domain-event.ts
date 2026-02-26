export interface DomainEvent<TPayload = unknown> {
  readonly eventName: string;
  readonly occurredOn: Date;
  readonly payload: TPayload;
  readonly aggregateId?: string | number;
}

export abstract class BaseDomainEvent<TPayload = unknown> implements DomainEvent<TPayload> {
  public readonly occurredOn: Date;

  constructor(
    public readonly eventName: string,
    public readonly payload: TPayload,
    public readonly aggregateId?: string | number,
  ) {
    this.occurredOn = new Date();
  }
}
