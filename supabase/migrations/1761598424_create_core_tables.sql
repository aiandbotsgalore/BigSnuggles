-- Migration: create_core_tables
-- Created at: 1761598424

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core memory storage
CREATE TABLE IF NOT EXISTS memory (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid,
  session_id uuid,
  key text NOT NULL,
  value jsonb NOT NULL,
  importance_score integer DEFAULT 1,
  emotional_weight float DEFAULT 0.0,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  expires_at timestamp
);

CREATE INDEX IF NOT EXISTS idx_memory_user_session ON memory(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_memory_key_value ON memory(key, ((value->>'type')));

-- Conversation history
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid,
  session_id uuid NOT NULL,
  message_type text NOT NULL,
  content jsonb NOT NULL,
  audio_url text,
  timestamp timestamp DEFAULT now(),
  emotion_state text,
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_session ON conversations(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp DESC);

-- Personality state
CREATE TABLE IF NOT EXISTS personality_state (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid UNIQUE,
  current_mode text NOT NULL DEFAULT 'gangster_mode',
  mood_state text NOT NULL DEFAULT 'neutral',
  preference_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  relationship_metrics jsonb DEFAULT '{}'::jsonb,
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personality_user ON personality_state(user_id);

-- Performance analytics
CREATE TABLE IF NOT EXISTS session_analytics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id uuid NOT NULL,
  user_id uuid,
  metrics jsonb NOT NULL,
  latency_data jsonb,
  engagement_score float,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_session ON session_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON session_analytics(user_id);

-- Enable Row Level Security
ALTER TABLE memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE personality_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for memory table
CREATE POLICY "Users can view their own memories"
  ON memory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memories"
  ON memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memories"
  ON memory FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories"
  ON memory FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for conversations table
CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for personality_state table
CREATE POLICY "Users can view their own personality state"
  ON personality_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own personality state"
  ON personality_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own personality state"
  ON personality_state FOR UPDATE
  USING (auth.uid() = user_id);

-- Create RLS policies for session_analytics table
CREATE POLICY "Users can view their own analytics"
  ON session_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics"
  ON session_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id);;