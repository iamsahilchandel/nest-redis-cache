import type { DomainEvent } from '../domain-event';

export type EventHandler<T = unknown> = (event: DomainEvent<T>) => void | Promise<void>;

export interface IEventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventName: string, handler: EventHandler): void;
}

export const EVENT_BUS = Symbol('EVENT_BUS');
