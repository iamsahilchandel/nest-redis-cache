export const RABBITMQ_CONNECTION = Symbol('RABBITMQ_CONNECTION');

export const EXCHANGES = { DOMAIN_EVENTS: 'domain_events' } as const;

export const QUEUES = { PRODUCT_NOTIFICATIONS: 'product_notifications' } as const;

export const ROUTING_KEYS = { PRODUCT_ALL: 'product.*' } as const;
