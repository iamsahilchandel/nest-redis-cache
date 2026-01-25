-- Create users table for role-based authentication
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'seller', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_email_verified BOOLEAN NOT NULL DEFAULT false,
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create index on role for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Create index on is_active for filtering active users
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Create composite index on role and is_active for common queries
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active);

-- Create index on created_at for sorting and analytics
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Insert a default admin user (password: admin123)
-- Password hash for 'admin123' with bcrypt (salt rounds: 12)
INSERT INTO users (email, password, first_name, last_name, role, is_active, is_email_verified)
VALUES (
  'admin@example.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewfLkI0qQcO8f5G2',
  'System',
  'Administrator',
  'admin',
  true,
  true
) ON CONFLICT (email) DO NOTHING;