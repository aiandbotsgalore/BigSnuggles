-- Migration: create_rooms_infrastructure
-- Created at: 1761637430

-- Migration: Create Multi-User Space Rooms Infrastructure
-- Description: Tables and policies for real-time collaborative rooms
-- Date: 2025-10-28

-- ============================================================
-- 1. ROOMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL,
  host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  max_participants INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  current_mode TEXT DEFAULT 'gangster',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT room_code_format CHECK (room_code ~ '^[A-Z0-9]{6}$'),
  CONSTRAINT max_participants_limit CHECK (max_participants > 0 AND max_participants <= 50)
);

-- Create index for fast room code lookups
CREATE INDEX IF NOT EXISTS idx_rooms_room_code ON public.rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_rooms_host_user_id ON public.rooms(host_user_id);
CREATE INDEX IF NOT EXISTS idx_rooms_is_active ON public.rooms(is_active);
CREATE INDEX IF NOT EXISTS idx_rooms_last_activity ON public.rooms(last_activity);

-- ============================================================
-- 2. ROOM PARTICIPANTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  is_online BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(room_id, user_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_room_participants_room_id ON public.room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_user_id ON public.room_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_is_online ON public.room_participants(is_online);

-- ============================================================
-- 3. ROOM MESSAGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message_type TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT message_type_check CHECK (message_type IN ('user_text', 'user_voice', 'ai_response', 'system'))
);

-- Create indexes for message queries
CREATE INDEX IF NOT EXISTS idx_room_messages_room_id ON public.room_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_room_messages_created_at ON public.room_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_room_messages_message_type ON public.room_messages(message_type);

-- ============================================================
-- 4. ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

-- ROOMS POLICIES
-- Users can view rooms they are participants in
CREATE POLICY "Users can view rooms they participate in"
  ON public.rooms
  FOR SELECT
  USING (
    id IN (
      SELECT room_id 
      FROM public.room_participants 
      WHERE user_id = auth.uid()
    )
  );

-- Authenticated users can create rooms
CREATE POLICY "Authenticated users can create rooms"
  ON public.rooms
  FOR INSERT
  WITH CHECK (auth.uid() = host_user_id);

-- Room hosts can update their rooms
CREATE POLICY "Hosts can update their rooms"
  ON public.rooms
  FOR UPDATE
  USING (auth.uid() = host_user_id)
  WITH CHECK (auth.uid() = host_user_id);

-- Room hosts can delete their rooms
CREATE POLICY "Hosts can delete their rooms"
  ON public.rooms
  FOR DELETE
  USING (auth.uid() = host_user_id);

-- ROOM PARTICIPANTS POLICIES
-- Participants can view other participants in their rooms
CREATE POLICY "Participants can view room participants"
  ON public.room_participants
  FOR SELECT
  USING (
    room_id IN (
      SELECT room_id 
      FROM public.room_participants 
      WHERE user_id = auth.uid()
    )
  );

-- Users can join rooms (insert themselves as participants)
CREATE POLICY "Users can join rooms"
  ON public.room_participants
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own participant record
CREATE POLICY "Users can update their own participant record"
  ON public.room_participants
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can leave rooms (delete their own participant record)
CREATE POLICY "Users can leave rooms"
  ON public.room_participants
  FOR DELETE
  USING (auth.uid() = user_id);

-- ROOM MESSAGES POLICIES
-- Participants can view messages in their rooms
CREATE POLICY "Participants can view room messages"
  ON public.room_messages
  FOR SELECT
  USING (
    room_id IN (
      SELECT room_id 
      FROM public.room_participants 
      WHERE user_id = auth.uid()
    )
  );

-- Participants can insert messages in their rooms
CREATE POLICY "Participants can insert messages"
  ON public.room_messages
  FOR INSERT
  WITH CHECK (
    room_id IN (
      SELECT room_id 
      FROM public.room_participants 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 5. HELPER FUNCTIONS
-- ============================================================

-- Function to generate unique room code
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude ambiguous characters (I, O, 0, 1)
  result TEXT := '';
  i INTEGER;
  code_exists BOOLEAN;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.rooms WHERE room_code = result) INTO code_exists;
    
    -- If code doesn't exist, we're done
    IF NOT code_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up inactive rooms (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_inactive_rooms()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM public.rooms
    WHERE is_active = false 
      OR last_activity < NOW() - INTERVAL '24 hours'
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update room last_activity timestamp
CREATE OR REPLACE FUNCTION update_room_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.rooms
  SET last_activity = NOW()
  WHERE id = NEW.room_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_activity when messages are sent
CREATE TRIGGER update_room_activity_on_message
  AFTER INSERT ON public.room_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_room_activity();

-- Function to check if room is full
CREATE OR REPLACE FUNCTION is_room_full(target_room_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  max_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM public.room_participants
  WHERE room_id = target_room_id AND is_online = true;
  
  SELECT max_participants INTO max_count
  FROM public.rooms
  WHERE id = target_room_id;
  
  RETURN current_count >= max_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. GRANT PERMISSIONS
-- ============================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant permissions on tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_participants TO authenticated;
GRANT SELECT, INSERT ON public.room_messages TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION generate_room_code() TO authenticated;
GRANT EXECUTE ON FUNCTION is_room_full(UUID) TO authenticated;

COMMENT ON TABLE public.rooms IS 'Multi-user voice chat rooms for Big Snuggles';
COMMENT ON TABLE public.room_participants IS 'Users participating in rooms with online status';
COMMENT ON TABLE public.room_messages IS 'Message history for rooms (text, voice, AI responses, system messages)';
;