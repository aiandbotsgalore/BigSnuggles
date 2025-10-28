-- Phase 5: Interactive Story Feed Features
-- Transcript table for storing conversation transcripts with metadata

-- Create transcripts table
CREATE TABLE transcripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Core transcript data
  full_conversation TEXT NOT NULL, -- JSON string of all messages
  message_count INTEGER DEFAULT 0,
  
  -- Session metadata
  duration_minutes INTEGER DEFAULT 0,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  
  -- Personality and context
  personality_mode TEXT NOT NULL DEFAULT 'gangster_mode',
  emotional_tone TEXT DEFAULT 'neutral',
  topics JSONB DEFAULT '[]', -- Array of topic keywords
  
  -- Analysis data
  sentiment_score DECIMAL(3,2) DEFAULT 0, -- Range: -1.0 to 1.0
  highlight_moments JSONB DEFAULT '[]', -- Array of highlight objects
  conversation_stats JSONB DEFAULT '{}', -- Statistics object
  
  -- Search and filtering
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', full_conversation)
  ) STORED,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_transcripts_session_id ON transcripts(session_id);
CREATE INDEX idx_transcripts_user_id ON transcripts(user_id);
CREATE INDEX idx_transcripts_created_at ON transcripts(created_at DESC);
CREATE INDEX idx_transcripts_personality_mode ON transcripts(personality_mode);
CREATE INDEX idx_transcripts_sentiment_score ON transcripts(sentiment_score);
CREATE INDEX idx_transcripts_search_vector ON transcripts USING gin(search_vector);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_transcripts_updated_at 
  BEFORE UPDATE ON transcripts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only access their own transcripts
CREATE POLICY "Users can view their own transcripts" ON transcripts
  FOR SELECT USING (
    user_id = auth.uid() OR
    session_id IN (
      SELECT id FROM sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own transcripts" ON transcripts
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    session_id IN (
      SELECT id FROM sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own transcripts" ON transcripts
  FOR UPDATE USING (
    user_id = auth.uid() OR
    session_id IN (
      SELECT id FROM sessions WHERE user_id = auth.uid()
    )
  );

-- Add user_id column to sessions table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'user_id') THEN
    ALTER TABLE sessions ADD COLUMN user_id UUID REFERENCES auth.users(id);
    CREATE INDEX idx_sessions_user_id ON sessions(user_id);
  END IF;
END
$$;

-- Update existing sessions to have user_id
UPDATE sessions 
SET user_id = (
  SELECT user_id 
  FROM session_analytics 
  WHERE session_analytics.session_id = sessions.id 
  LIMIT 1
)
WHERE user_id IS NULL;