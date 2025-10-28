-- Migration: enhance_memory_personality_system_fixed
-- Created at: 1761630632

-- Phase 6: Enhanced Memory & Personality System Migration

-- 1. Create enhanced memory types table
CREATE TABLE IF NOT EXISTS memory_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_name TEXT NOT NULL UNIQUE,
  description TEXT,
  retention_days INTEGER DEFAULT 365,
  auto_cleanup BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO memory_types (type_name, description) VALUES 
('episodic', 'Specific events and conversations with temporal context'),
('semantic', 'General knowledge and facts learned over time'),
('procedural', 'Behavioral patterns and interaction preferences'),
('relationship', 'Social dynamics and relationship context'),
('emotional', 'Emotional states and mood patterns'),
('contextual', 'Environmental and situational context')
ON CONFLICT (type_name) DO NOTHING;

-- 2. Create memory associations for interconnected memories
CREATE TABLE IF NOT EXISTS memory_associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id_1 UUID NOT NULL REFERENCES memory(id) ON DELETE CASCADE,
  memory_id_2 UUID NOT NULL REFERENCES memory(id) ON DELETE CASCADE,
  association_type TEXT NOT NULL, -- 'temporal', 'causal', 'emotional', 'semantic'
  strength DECIMAL(3,2) DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(memory_id_1, memory_id_2)
);

-- 3. Enhance memory table with new columns
ALTER TABLE memory 
ADD COLUMN IF NOT EXISTS memory_type TEXT DEFAULT 'episodic' REFERENCES memory_types(type_name),
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS context_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS source_conversation_id UUID REFERENCES conversations(id),
ADD COLUMN IF NOT EXISTS associations_count INTEGER DEFAULT 0;

-- 4. Create user preferences table for granular consent management
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category TEXT NOT NULL, -- 'memory_retention', 'content_filtering', 'personality_adaptation', 'data_sharing'
  preference_key TEXT NOT NULL,
  preference_value JSONB NOT NULL,
  is_consented BOOLEAN DEFAULT false,
  consent_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, category, preference_key)
);

-- 5. Insert default privacy preferences for existing users
INSERT INTO user_preferences (user_id, category, preference_key, preference_value, is_consented, consent_date)
SELECT 
  user_id,
  'memory_retention' as category,
  'default_retention_days' as preference_key,
  '365' as preference_value,
  false as is_consented,
  now() as consent_date
FROM memory
GROUP BY user_id
ON CONFLICT (user_id, category, preference_key) DO NOTHING;

INSERT INTO user_preferences (user_id, category, preference_key, preference_value, is_consented, consent_date)
SELECT 
  user_id,
  'content_filtering' as category,
  'profanity_sensitivity' as preference_key,
  '"medium"' as preference_value,
  false as is_consented,
  now() as consent_date
FROM memory
GROUP BY user_id
ON CONFLICT (user_id, category, preference_key) DO NOTHING;

INSERT INTO user_preferences (user_id, category, preference_key, preference_value, is_consented, consent_date)
SELECT 
  user_id,
  'personality_adaptation' as category,
  'allow_learn_from_conversations' as preference_key,
  'true' as preference_value,
  false as is_consented,
  now() as consent_date
FROM memory
GROUP BY user_id
ON CONFLICT (user_id, category, preference_key) DO NOTHING;

-- 6. Update personality_state to include adaptive learning features
ALTER TABLE personality_state 
ADD COLUMN IF NOT EXISTS learning_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS adaptation_level DECIMAL(3,2) DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS interaction_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS personality_evolution JSONB DEFAULT '{}';

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_memory_type ON memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_memory_tags ON memory USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_memory_associations ON memory_associations(memory_id_1, memory_id_2);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_category ON user_preferences(category);

-- 8. Create RLS policies for new tables
ALTER TABLE memory_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage all memory data
CREATE POLICY "Service role full access to memory" ON memory
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to memory types" ON memory_types
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to memory associations" ON memory_associations
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to user preferences" ON user_preferences
  FOR ALL USING (auth.role() = 'service_role');

-- Users can only access their own preferences
CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can access their own memories
CREATE POLICY "Users can access own memories" ON memory
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access memory associations for own memories" ON memory_associations
  FOR SELECT USING (
    memory_id_1 IN (SELECT id FROM memory WHERE user_id = auth.uid()) OR
    memory_id_2 IN (SELECT id FROM memory WHERE user_id = auth.uid())
  );;