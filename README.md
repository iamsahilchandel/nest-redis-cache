# NestJS Redis Cache API

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

A modern, scalable NestJS API with PostgreSQL database, Drizzle ORM, JWT authentication, and comprehensive security features.

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
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

## ✨ Features

- **Authentication & Authorization** - JWT-based authentication with role-based access control (buyer, seller, admin)
- **Database Management** - PostgreSQL with Drizzle ORM for type-safe database operations
- **API Documentation** - Swagger/OpenAPI integration for interactive API documentation
- **Rate Limiting** - Built-in request throttling to prevent abuse
- **Security** - Helmet, CORS, CSRF protection, and API key authentication
- **Validation** - Request validation using Zod schemas
- **Product Management** - Full CRUD operations for product catalog

---

## 🛠 Tech Stack

| Technology                                | Purpose           |
| ----------------------------------------- | ----------------- |
| [NestJS](https://nestjs.com/)             | Backend framework |
| [PostgreSQL](https://www.postgresql.org/) | Database          |
| [Drizzle ORM](https://orm.drizzle.team/)  | Type-safe ORM     |
| [Zod](https://zod.dev/)                   | Schema validation |
| [Passport](http://www.passportjs.org/)    | Authentication    |
| [JWT](https://jwt.io/)                    | Token-based auth  |
| [Swagger](https://swagger.io/)            | API documentation |

---

## 📁 Project Structure

```
src/
├── bootstrap/       → Add guards, interceptors, filters, and decorators here
├── common/          → Add shared utilities, helpers, and services here
├── database/
│   └── schemas/     → Add Drizzle table schemas here (*.schema.ts)
├── features/        → Add feature modules here (auth, products, orders, etc.)
└── main.ts          → Application entry point
```

**Where to add new code:**

| What you're creating  | Where to add it                                          |
| --------------------- | -------------------------------------------------------- |
| New feature module    | `src/features/<feature-name>/`                           |
| Database schema       | `src/database/schemas/<name>.schema.ts`                  |
| Guards / Interceptors | `src/bootstrap/guards/` or `src/bootstrap/interceptors/` |
| Shared utilities      | `src/common/`                                            |
| DTOs / Validators     | Inside your feature module folder                        |

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

Database schemas are located in `src/database/schemas/`. Check these files for detailed table structures.

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

1. **Make changes to your schema files** in `src/database/schemas/`

2. **Generate migration files**

   ```bash
   pnpm run db:generate --name <migration_name>
   ```

   The `--name` flag gives your migration a meaningful name (e.g., `--name add_orders_table`).

   This will create SQL migration files in `src/database/migrations/`

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
