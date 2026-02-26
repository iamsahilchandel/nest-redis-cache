# NestJS Redis Cache API

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

A modern, scalable NestJS API built with **Domain-Driven Design (DDD)** and **Clean Architecture** principles. Features PostgreSQL, Drizzle ORM, JWT authentication, Redis caching, and comprehensive security.

## 📋 Table of Contents

- [Architecture Overview](#-architecture-overview)
- [Project Structure](#-project-structure)
  - [Layer-by-Layer Breakdown](#layer-by-layer-breakdown)
  - [Import Aliases](#import-aliases)
- [How to Add a New Feature Module](#-how-to-add-a-new-feature-module)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
- [Database](#-database)
  - [Database Migrations](#database-migrations)
- [Running the Application](#-running-the-application)
- [Available Scripts](#-available-scripts)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Security Features](#-security-features)
- [License](#-license)

---

## 🏗 Architecture Overview

This project follows **Domain-Driven Design (DDD)** with a **Clean / Hexagonal Architecture** layout. Each bounded context (feature module) is self-contained and organized into four layers that enforce a strict dependency rule:

```
Presentation → Application → Domain ← Infrastructure
```

| Layer              | Depends On  | Purpose                                                                 |
| ------------------ | ----------- | ----------------------------------------------------------------------- |
| **Domain**         | Nothing     | Core business logic — entities, value objects, ports (interfaces)       |
| **Application**    | Domain      | Orchestration — use cases, service facades                              |
| **Infrastructure** | Domain      | Technical details — database repos, strategies, mappers, event handlers |
| **Presentation**   | Application | Delivery mechanism — controllers, DTOs, guards, decorators              |

> **Key Principle:** The **Domain** layer has zero external dependencies. Infrastructure and Presentation depend inward toward the Domain, never the other way around. Dependencies are inverted through **Ports** (interfaces defined in Domain) and **Adapters** (implementations in Infrastructure).

---

## 📁 Project Structure

```
src/
├── app/                            → Application bootstrap & cross-cutting HTTP concerns
│   ├── bootstrap/
│   │   ├── app.bootstrap.ts        → Application startup configuration
│   │   ├── guards/                 → Global guards (API key, CSRF)
│   │   ├── middleware/             → Global middleware (CORS, Helmet, rate-limit, compression)
│   │   └── swagger/               → Swagger / OpenAPI configuration
│   └── health/
│       └── health.controller.ts    → Health-check endpoint
│
├── infrastructure/                 → Global infrastructure providers
│   ├── config/
│   │   └── app.config.ts           → Centralized app configuration (env variables)
│   ├── database/
│   │   ├── database.module.ts      → Database module (Drizzle + PostgreSQL)
│   │   ├── database.provider.ts    → Database connection provider
│   │   └── schemas/                → Drizzle table schemas (user, product, refresh-token)
│   └── redis/
│       ├── redis.module.ts         → Redis module
│       └── redis.provider.ts       → Redis connection provider
│
├── modules/                        → Bounded Contexts (feature modules)
│   ├── auth/                       → Authentication & Authorization module
│   │   ├── auth.module.ts          → NestJS module wiring
│   │   ├── domain/
│   │   │   ├── entities/           → Domain entities
│   │   │   ├── value-objects/      → Value objects
│   │   │   ├── ports/              → Repository interfaces (contracts)
│   │   │   └── repositories/       → Repository interfaces (alternative location)
│   │   ├── application/
│   │   │   ├── services/
│   │   │   │   └── auth.service.ts → Thin facade delegating to use cases
│   │   │   └── use-cases/          → One class per business operation
│   │   │       ├── register.use-case.ts
│   │   │       ├── login.use-case.ts
│   │   │       ├── logout.use-case.ts
│   │   │       ├── refresh-tokens.use-case.ts
│   │   │       ├── validate-user.use-case.ts
│   │   │       ├── change-password.use-case.ts
│   │   │       ├── forgot-password.use-case.ts
│   │   │       ├── reset-password.use-case.ts
│   │   │       └── index.ts        → Barrel export
│   │   ├── infrastructure/
│   │   │   ├── repositories/       → Drizzle implementations of domain ports
│   │   │   ├── strategies/         → Passport JWT strategies
│   │   │   └── persistence/        → (optional) additional persistence concerns
│   │   └── presentation/
│   │       ├── controllers/        → HTTP route handlers
│   │       ├── dto/                → Request / response DTOs (Zod schemas)
│   │       ├── guards/             → Auth guards (JWT, refresh, roles)
│   │       └── decorators/         → Custom decorators (@Roles, etc.)
│   │
│   ├── products/                   → Product Catalog module
│   │   ├── products.module.ts
│   │   ├── domain/
│   │   │   ├── entities/           → Product entity
│   │   │   ├── value-objects/      → ProductName, Price, etc.
│   │   │   ├── events/             → Domain events (ProductCreated, etc.)
│   │   │   └── ports/              → Repository port interfaces
│   │   ├── application/
│   │   │   ├── services/           → Products service facade
│   │   │   └── use-cases/          → CRUD use cases
│   │   ├── infrastructure/
│   │   │   ├── repositories/       → Drizzle repository implementations
│   │   │   ├── mappers/            → Domain ↔ persistence mappers
│   │   │   └── event-handlers/     → Domain event handlers
│   │   └── presentation/
│   │       ├── controllers/        → Product route handlers
│   │       └── dto/                → Product DTOs
│   │
│   └── cache/                      → Caching module (Redis)
│       ├── cache.module.ts
│       ├── cache.service.ts        → Cache service (implements ICachePort)
│       ├── cache.keys.ts           → Centralized cache key definitions
│       └── presentation/
│           └── controllers/        → Cache management endpoints
│
├── shared/                         → Shared Domain Kernel & cross-cutting concerns
│   ├── common.module.ts            → Shared module registration
│   ├── domain/
│   │   ├── base.entity.ts          → Base entity class (id, timestamps)
│   │   ├── domain-event.ts         → Domain event base class
│   │   ├── exceptions/             → Custom domain exceptions
│   │   ├── ports/                  → Shared port interfaces (ICachePort, ILogger, etc.)
│   │   └── index.ts               → Barrel export
│   ├── filters/                    → Global exception filters
│   ├── helpers/                    → Utility helpers (API response builder, etc.)
│   ├── interceptors/               → Global interceptors (response transform, logging)
│   ├── infrastructure/             → Shared infrastructure (logger, etc.)
│   ├── middleware/                  → Shared middleware (correlation ID, etc.)
│   └── pipes/                      → Global pipes (Zod validation)
│
├── app.module.ts                   → Root module
├── app.controller.ts               → Root controller
├── app.service.ts                  → Root service
└── main.ts                         → Entry point
```

### Layer-by-Layer Breakdown

#### 🟡 Domain Layer (`domain/`)

The **heart** of your module. Contains pure business logic with **zero framework dependencies**.

| Folder           | What Goes Here                               | Example                            |
| ---------------- | -------------------------------------------- | ---------------------------------- |
| `entities/`      | Core domain objects with identity            | `Product`, `User`                  |
| `value-objects/` | Immutable objects defined by their value     | `ProductName`, `Price`, `Email`    |
| `events/`        | Domain events emitted by entities            | `ProductCreatedEvent`              |
| `ports/`         | Interfaces / contracts (repository, service) | `IProductRepository`, `ICachePort` |
| `exceptions/`    | Domain-specific error types                  | `InsufficientStockException`       |

> **Rule:** Never import from `@nestjs/*`, database libraries, or HTTP here. If you need something external, define a **Port** interface.

#### 🟢 Application Layer (`application/`)

Orchestrates business operations using domain objects. Each **use case** represents one specific action.

| Folder       | What Goes Here                          | Example                                        |
| ------------ | --------------------------------------- | ---------------------------------------------- |
| `use-cases/` | One class per business operation        | `CreateProductUseCase`                         |
| `services/`  | Thin facades that delegate to use cases | `ProductsService`                              |
| `index.ts`   | Barrel exports for all use cases        | `export * from './create-product.use-case.js'` |

> **Pattern:** The service (e.g., `AuthService`) is a thin facade — its methods simply call the appropriate use case. This keeps each use case focused and testable.

```typescript
// application/services/auth.service.ts — Thin Facade Pattern
@Injectable()
export class AuthService {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    // ...
  ) {}

  register(dto: RegisterDto) {
    return this.registerUseCase.execute(dto);
  }
}
```

#### 🔵 Infrastructure Layer (`infrastructure/`)

Implements the ports defined in the Domain layer. This is where frameworks and libraries live.

| Folder            | What Goes Here                                 | Example                    |
| ----------------- | ---------------------------------------------- | -------------------------- |
| `repositories/`   | Concrete repository implementations (Drizzle)  | `DrizzleProductRepository` |
| `mappers/`        | Transform between domain entities & DB records | `ProductMapper`            |
| `strategies/`     | Authentication strategies (Passport)           | `JwtStrategy`              |
| `event-handlers/` | Handlers for domain events                     | `OnProductCreatedHandler`  |
| `persistence/`    | Additional persistence concerns                | Migrations, seeders        |

> **Rule:** Repository classes implement domain port interfaces. Inject them using the port token so the Application layer never knows about Drizzle/SQL.

#### 🔴 Presentation Layer (`presentation/`)

The HTTP delivery mechanism. Translates HTTP requests into application calls and formats responses.

| Folder         | What Goes Here                                      | Example                      |
| -------------- | --------------------------------------------------- | ---------------------------- |
| `controllers/` | NestJS route handlers                               | `ProductsController`         |
| `dto/`         | Request/response validation schemas (Zod + Swagger) | `CreateProductDto`           |
| `guards/`      | Route-level guards                                  | `JwtAuthGuard`, `RolesGuard` |
| `decorators/`  | Custom parameter/method decorators                  | `@Roles('admin')`            |

### Import Aliases

The project uses the `@/` path alias for clean imports:

```typescript
// Instead of fragile relative paths:
import { User } from '../../../../infrastructure/database/schemas/user.schema';

// Use absolute aliases:
import { User } from '@/infrastructure/database/schemas/user.schema';
```

Configured in `tsconfig.json` → `paths: { "@/*": ["src/*"] }`.

---

## 🧩 How to Add a New Feature Module

Follow this step-by-step guide to add a new bounded context (e.g., **Orders**):

### 1. Create the folder structure

```
src/modules/orders/
├── orders.module.ts
├── domain/
│   ├── entities/
│   │   └── order.entity.ts
│   ├── value-objects/
│   │   └── order-status.vo.ts
│   ├── events/
│   │   └── order-placed.event.ts
│   └── ports/
│       └── order-repository.port.ts
├── application/
│   ├── services/
│   │   └── orders.service.ts
│   ├── use-cases/
│   │   ├── place-order.use-case.ts
│   │   ├── cancel-order.use-case.ts
│   │   ├── get-order.use-case.ts
│   │   └── index.ts
├── infrastructure/
│   ├── repositories/
│   │   └── drizzle-order.repository.ts
│   └── mappers/
│       └── order.mapper.ts
└── presentation/
    ├── controllers/
    │   └── orders.controller.ts
    └── dto/
        └── orders.dto.ts
```

### 2. Build inside-out

| Step | Layer            | What to Do                                                               |
| ---- | ---------------- | ------------------------------------------------------------------------ |
| 1    | **Domain**       | Define `OrderEntity`, value objects, `IOrderRepository` port             |
| 2    | **Application**  | Write use-case classes, create barrel `index.ts`, create service facade  |
| 3    | **Infra**        | Add Drizzle schema in `infrastructure/database/schemas/`, implement repo |
| 4    | **Presentation** | Create DTOs, controller, guards/decorators if needed                     |
| 5    | **Module**       | Wire everything in `orders.module.ts`, import into `app.module.ts`       |

### 3. Wire the module

```typescript
// src/modules/orders/orders.module.ts
@Module({
  imports: [DatabaseModule, CacheModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    PlaceOrderUseCase,
    CancelOrderUseCase,
    GetOrderUseCase,
    {
      provide: 'IOrderRepository', // Port token
      useClass: DrizzleOrderRepository, // Adapter
    },
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
```

### 4. Quick reference — what goes where

| You want to...                            | Create it in                                                          |
| ----------------------------------------- | --------------------------------------------------------------------- |
| Add a new business entity                 | `modules/<feature>/domain/entities/`                                  |
| Add a new business operation              | `modules/<feature>/application/use-cases/`                            |
| Add a database table                      | `infrastructure/database/schemas/`                                    |
| Add a repository implementation           | `modules/<feature>/infrastructure/repositories/`                      |
| Add a new HTTP endpoint                   | `modules/<feature>/presentation/controllers/`                         |
| Add request validation                    | `modules/<feature>/presentation/dto/`                                 |
| Add a shared domain concept               | `shared/domain/`                                                      |
| Add a global guard / filter / interceptor | `shared/filters/`, `shared/interceptors/`, or `app/bootstrap/guards/` |
| Add cache key patterns                    | `modules/cache/cache.keys.ts`                                         |
| Add new global middleware                 | `app/bootstrap/middleware/`                                           |

---

## ✨ Features

- **Authentication & Authorization** — JWT-based auth with role-based access control (buyer, seller, admin)
- **Database Management** — PostgreSQL with Drizzle ORM for type-safe database operations
- **Redis Caching** — Centralized caching with typed cache keys and invalidation
- **API Documentation** — Swagger/OpenAPI integration for interactive API docs
- **Rate Limiting** — Built-in request throttling to prevent abuse
- **Security** — Helmet, CORS, CSRF protection, and API key authentication
- **Validation** — Request validation using Zod schemas
- **Product Management** — Full CRUD operations for product catalog
- **DDD Architecture** — Clean separation of concerns with domain-driven module structure

---

## 🛠 Tech Stack

| Technology                                | Purpose           |
| ----------------------------------------- | ----------------- |
| [NestJS](https://nestjs.com/)             | Backend framework |
| [PostgreSQL](https://www.postgresql.org/) | Database          |
| [Drizzle ORM](https://orm.drizzle.team/)  | Type-safe ORM     |
| [Redis / ioredis](https://redis.io/)      | Caching layer     |
| [Zod](https://zod.dev/)                   | Schema validation |
| [Passport](http://www.passportjs.org/)    | Authentication    |
| [JWT](https://jwt.io/)                    | Token-based auth  |
| [Swagger](https://swagger.io/)            | API documentation |

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- **Node.js** (v18 or higher)
- **pnpm** (recommended) or npm/yarn
- **PostgreSQL** (v14 or higher)
- **Redis** (optional, for caching)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd "Nest.js Cache"
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Create environment file**

   ```bash
   cp .env.example .env
   ```

4. **Configure your environment variables** (see [Environment Configuration](#environment-configuration))

5. **Set up the database** (see [Database Migrations](#database-migrations))

6. **Start the application**

   ```bash
   pnpm run start:dev
   ```

### Environment Configuration

Create a `.env` file in the root directory based on `.env.example`:

```env
# Server Configuration
NODE_ENV=development
SERVER_PORT=3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Database & Cache
DATABASE_URL=postgresql://username:password@localhost:5432/redis_cache_nest
REDIS_URL=redis://localhost:6379

# Authentication & Security
JWT_SECRET=your_jwt_secret_here
COOKIE_SECRET=your_cookie_secret_here
API_KEY=your_api_key_here

# Rate Limiting (optional)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```

> **💡 Tip:** Generate secure secrets using:
>
> ```bash
> openssl rand -base64 32
> ```

---

## 🗄 Database

This project uses **PostgreSQL** with **Drizzle ORM** for type-safe database operations.

Database schemas are located in `src/infrastructure/database/schemas/`. Check these files for detailed table structures.

### Database Migrations

Drizzle Kit is used for database migrations. Configuration can be found in `drizzle.config.ts`.

#### Migration Commands

| Command                | Description                                         |
| ---------------------- | --------------------------------------------------- |
| `pnpm run db:generate` | Generate migration files from schema changes        |
| `pnpm run db:migrate`  | Apply pending migrations to the database            |
| `pnpm run db:push`     | Push schema directly to database (development only) |
| `pnpm run db:studio`   | Open Drizzle Studio (visual database browser)       |
| `pnpm run db:drop`     | Drop a migration                                    |

#### Step-by-Step Migration Guide

1. **Make changes to your schema files** in `src/infrastructure/database/schemas/`

2. **Generate migration files**

   ```bash
   pnpm run db:generate --name <migration_name>
   ```

   The `--name` flag gives your migration a meaningful name (e.g., `--name add_orders_table`).

3. **Review the generated migration** (recommended)

4. **Apply the migration**

   ```bash
   pnpm run db:migrate
   ```

5. **Verify changes** using Drizzle Studio

   ```bash
   pnpm run db:studio
   ```

> **⚠️ Warning:** Use `db:push` only in development! For production, always use `db:generate` followed by `db:migrate`.

---

## ▶️ Running the Application

```bash
# Development (with hot-reload)
pnpm run start:dev

# Debug mode
pnpm run start:debug

# Production mode
pnpm run build
pnpm run start:prod
```

The application will be available at `http://localhost:3000` (or your configured `SERVER_PORT`).

---

## 📜 Available Scripts

All scripts can be run using `pnpm run <script-name>`:

### Application Scripts

| Script        | Command                      | Description                          |
| ------------- | ---------------------------- | ------------------------------------ |
| `build`       | `nest build`                 | Build the application for production |
| `start`       | `nest start`                 | Start the application                |
| `start:dev`   | `nest start --watch`         | Start with hot-reload (development)  |
| `start:debug` | `nest start --debug --watch` | Start in debug mode with hot-reload  |
| `start:prod`  | `node dist/main`             | Start production build               |

### Database Scripts

| Script        | Command                | Description                            |
| ------------- | ---------------------- | -------------------------------------- |
| `db:generate` | `drizzle-kit generate` | Generate migration from schema changes |
| `db:migrate`  | `drizzle-kit migrate`  | Apply migrations to database           |
| `db:push`     | `drizzle-kit push`     | Push schema directly to database       |
| `db:studio`   | `drizzle-kit studio`   | Open visual database browser           |
| `db:drop`     | `drizzle-kit drop`     | Drop a migration                       |

### Code Quality Scripts

| Script   | Command                                         | Description               |
| -------- | ----------------------------------------------- | ------------------------- |
| `format` | `prettier --write "src/**/*.ts" "test/**/*.ts"` | Format code with Prettier |
| `lint`   | `eslint "{src,apps,libs,test}/**/*.ts" --fix`   | Lint and fix code         |

### Testing Scripts

| Script       | Command                              | Description                    |
| ------------ | ------------------------------------ | ------------------------------ |
| `test`       | `jest`                               | Run unit tests                 |
| `test:watch` | `jest --watch`                       | Run tests in watch mode        |
| `test:cov`   | `jest --coverage`                    | Run tests with coverage report |
| `test:debug` | `node --inspect-brk...`              | Run tests in debug mode        |
| `test:e2e`   | `jest --config ./test/jest-e2e.json` | Run end-to-end tests           |

---

## 📚 API Documentation

Swagger API documentation is available at:

```
http://localhost:3000/api
```

> **Note:** You may need to provide an API key to access the documentation. See [Security Features](#-security-features).

---

## 🧪 Testing

```bash
# Run unit tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Generate coverage report
pnpm run test:cov

# Run e2e tests
pnpm run test:e2e
```

---

## 🔒 Security Features

This application implements several security measures:

| Feature                | Description                                      |
| ---------------------- | ------------------------------------------------ |
| **JWT Authentication** | Secure token-based authentication                |
| **API Key Guard**      | Global API key validation for all endpoints      |
| **Rate Limiting**      | Request throttling (default: 10 requests/minute) |
| **Helmet**             | Security headers middleware                      |
| **CORS**               | Configurable Cross-Origin Resource Sharing       |
| **CSRF Protection**    | Cross-Site Request Forgery protection            |
| **Password Hashing**   | Bcrypt for secure password storage               |
| **Role-Based Access**  | User roles: `buyer`, `seller`, `admin`           |

---

## 📄 License

This project is [UNLICENSED](LICENSE).

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

<p align="center">Made with ❤️ using NestJS</p>
