# E-Commerce API with User Authentication

This is a Nest.js e-commerce API with role-based authentication system supporting three user types: Buyers, Sellers, and Admins.

## User Roles

### 1. Buyers (`buyer`)
- Can browse and purchase products
- Can view their order history
- Can manage their profile

### 2. Sellers (`seller`)
- Can list and manage their products
- Can view orders for their products
- Can update order status

### 3. Admins (`admin`)
- Can approve/reject seller applications
- Can analyze all orders and seller performance
- Can cancel any order with reason
- Have full access to all platform data

## Authentication Endpoints

### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "buyer", // optional, defaults to "buyer"
  "phone": "+1234567890", // optional
  "address": "123 Main St, City, State" // optional
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Get Profile
```http
GET /auth/profile
Authorization: Bearer <jwt_token>
```

## Role-Based Access Control

Use the `@Roles()` decorator to protect endpoints:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Get('admin-only')
adminOnlyEndpoint() {
  // Only admins can access
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('seller', 'admin')
@Get('seller-admin')
sellerOrAdminEndpoint() {
  // Sellers and admins can access
}
```

## Database Setup

Run the migration to create the users table:

```sql
-- Run the SQL in src/database/migrations/001_create_users_table.sql
```

Or execute the migration file directly in your PostgreSQL database.

## Default Admin Account

A default admin account is created during migration:
- Email: `admin@example.com`
- Password: `admin123`

## Environment Variables

Make sure your `.env` file includes:
```
JWT_SECRET=your_jwt_secret_here
DATABASE_URL=your_postgres_connection_string
```

## API Documentation

Visit `http://localhost:3000/api` for Swagger documentation with all available endpoints.