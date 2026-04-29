-- SCHEMA FOR DEBATE AI
-- Run this in your Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password TEXT, -- Note: In production, use Supabase Auth instead of manual password storage
  name TEXT,
  xp INTEGER DEFAULT 0,
  achievements TEXT[] DEFAULT '{}',
  total_debates INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- DEBATES TABLE
CREATE TABLE IF NOT EXISTS debates (
  id BIGSERIAL PRIMARY KEY,
  user_email TEXT REFERENCES users(email),
  topic TEXT,
  format TEXT,
  argument TEXT,
  score INTEGER,
  logic INTEGER,
  clarity INTEGER,
  persuasion INTEGER,
  evidence INTEGER,
  analysis_json JSONB,
  counter_argument TEXT,
  history JSONB DEFAULT '[]',
  status TEXT DEFAULT 'ongoing',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE debates ENABLE ROW LEVEL SECURITY;

-- Create policies (Wrapped in DO blocks to avoid "already exists" errors)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can view own profile') THEN
        CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.jwt() ->> 'email' = email);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can view own debates') THEN
        CREATE POLICY "Users can view own debates" ON debates FOR SELECT USING (auth.jwt() ->> 'email' = user_email);
    END IF;
END
$$;
