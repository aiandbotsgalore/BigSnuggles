-- Migration: Create Audience Participation & Voting System
-- Description: Tables and policies for interactive polls and voting
-- Date: 2025-10-28

-- ============================================================
-- 1. POLLS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  creator_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  poll_type TEXT NOT NULL CHECK (poll_type IN ('topic', 'personality', 'question', 'reaction')),
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  closed_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT valid_options CHECK (jsonb_array_length(options) >= 2 AND jsonb_array_length(options) <= 6),
  CONSTRAINT valid_duration CHECK (duration_seconds >= 30 AND duration_seconds <= 600)
);

-- Create indexes for polls
CREATE INDEX IF NOT EXISTS idx_polls_room_id ON public.polls(room_id);
CREATE INDEX IF NOT EXISTS idx_polls_status ON public.polls(status);
CREATE INDEX IF NOT EXISTS idx_polls_expires_at ON public.polls(expires_at);
CREATE INDEX IF NOT EXISTS idx_polls_created_at ON public.polls(created_at DESC);

-- ============================================================
-- 2. POLL VOTES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL,
  voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(poll_id, user_id)
);

-- Create indexes for votes
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON public.poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id ON public.poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_voted_at ON public.poll_votes(voted_at DESC);

-- ============================================================
-- 3. USER ENGAGEMENT STATS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_engagement_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  polls_created INTEGER NOT NULL DEFAULT 0,
  votes_cast INTEGER NOT NULL DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, room_id)
);

-- Create indexes for engagement stats
CREATE INDEX IF NOT EXISTS idx_user_engagement_user_id ON public.user_engagement_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_engagement_room_id ON public.user_engagement_stats(room_id);
CREATE INDEX IF NOT EXISTS idx_user_engagement_votes_cast ON public.user_engagement_stats(votes_cast DESC);

-- ============================================================
-- 4. ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on tables
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_engagement_stats ENABLE ROW LEVEL SECURITY;

-- POLLS POLICIES
-- Users can view polls in rooms they participate in
CREATE POLICY "Users can view polls in their rooms"
  ON public.polls
  FOR SELECT
  USING (
    room_id IN (
      SELECT room_id 
      FROM public.room_participants 
      WHERE user_id = auth.uid()
    )
  );

-- Room participants can create polls
CREATE POLICY "Room participants can create polls"
  ON public.polls
  FOR INSERT
  WITH CHECK (
    auth.uid() = creator_user_id AND
    room_id IN (
      SELECT room_id 
      FROM public.room_participants 
      WHERE user_id = auth.uid()
    )
  );

-- Poll creators can update their polls
CREATE POLICY "Poll creators can update their polls"
  ON public.polls
  FOR UPDATE
  USING (auth.uid() = creator_user_id)
  WITH CHECK (auth.uid() = creator_user_id);

-- POLL VOTES POLICIES
-- Users can view votes in polls from their rooms
CREATE POLICY "Users can view votes in their rooms"
  ON public.poll_votes
  FOR SELECT
  USING (
    poll_id IN (
      SELECT p.id 
      FROM public.polls p
      JOIN public.room_participants rp ON p.room_id = rp.room_id
      WHERE rp.user_id = auth.uid()
    )
  );

-- Users can cast votes in their rooms
CREATE POLICY "Users can cast votes"
  ON public.poll_votes
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    poll_id IN (
      SELECT p.id 
      FROM public.polls p
      JOIN public.room_participants rp ON p.room_id = rp.room_id
      WHERE rp.user_id = auth.uid()
    )
  );

-- USER ENGAGEMENT STATS POLICIES
-- Users can view engagement stats for their rooms
CREATE POLICY "Users can view engagement stats in their rooms"
  ON public.user_engagement_stats
  FOR SELECT
  USING (
    room_id IN (
      SELECT room_id 
      FROM public.room_participants 
      WHERE user_id = auth.uid()
    )
  );

-- System can insert/update engagement stats
CREATE POLICY "Users can manage their own engagement stats"
  ON public.user_engagement_stats
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 5. HELPER FUNCTIONS
-- ============================================================

-- Function to get poll results
CREATE OR REPLACE FUNCTION get_poll_results(target_poll_id UUID)
RETURNS TABLE (
  option_id TEXT,
  option_text TEXT,
  vote_count BIGINT,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH vote_counts AS (
    SELECT 
      pv.option_id,
      COUNT(*) as votes
    FROM public.poll_votes pv
    WHERE pv.poll_id = target_poll_id
    GROUP BY pv.option_id
  ),
  total_votes AS (
    SELECT SUM(votes) as total FROM vote_counts
  ),
  poll_options AS (
    SELECT 
      jsonb_array_elements(p.options) as option
    FROM public.polls p
    WHERE p.id = target_poll_id
  )
  SELECT 
    (po.option->>'id')::TEXT as option_id,
    (po.option->>'text')::TEXT as option_text,
    COALESCE(vc.votes, 0) as vote_count,
    CASE 
      WHEN tv.total = 0 OR tv.total IS NULL THEN 0
      ELSE ROUND((COALESCE(vc.votes, 0)::NUMERIC / tv.total::NUMERIC) * 100, 2)
    END as percentage
  FROM poll_options po
  LEFT JOIN vote_counts vc ON (po.option->>'id') = vc.option_id
  CROSS JOIN total_votes tv
  ORDER BY vote_count DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to close expired polls
CREATE OR REPLACE FUNCTION close_expired_polls()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  WITH updated AS (
    UPDATE public.polls
    SET 
      status = 'expired',
      closed_at = NOW()
    WHERE status = 'active'
      AND expires_at <= NOW()
    RETURNING *
  )
  SELECT COUNT(*) INTO updated_count FROM updated;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update engagement stats on poll creation
CREATE OR REPLACE FUNCTION update_engagement_on_poll_create()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_engagement_stats (user_id, room_id, polls_created, last_activity)
  VALUES (NEW.creator_user_id, NEW.room_id, 1, NOW())
  ON CONFLICT (user_id, room_id)
  DO UPDATE SET
    polls_created = user_engagement_stats.polls_created + 1,
    last_activity = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update engagement stats on vote
CREATE OR REPLACE FUNCTION update_engagement_on_vote()
RETURNS TRIGGER AS $$
DECLARE
  target_room_id UUID;
BEGIN
  -- Get room_id from poll
  SELECT room_id INTO target_room_id
  FROM public.polls
  WHERE id = NEW.poll_id;
  
  -- Update engagement stats
  INSERT INTO public.user_engagement_stats (user_id, room_id, votes_cast, last_activity)
  VALUES (NEW.user_id, target_room_id, 1, NOW())
  ON CONFLICT (user_id, room_id)
  DO UPDATE SET
    votes_cast = user_engagement_stats.votes_cast + 1,
    last_activity = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_update_engagement_on_poll_create
  AFTER INSERT ON public.polls
  FOR EACH ROW
  EXECUTE FUNCTION update_engagement_on_poll_create();

CREATE TRIGGER trigger_update_engagement_on_vote
  AFTER INSERT ON public.poll_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_engagement_on_vote();

-- Function to cleanup old polls (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_polls()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM public.polls
    WHERE status IN ('closed', 'expired')
      AND (closed_at IS NOT NULL AND closed_at < NOW() - INTERVAL '7 days')
      OR (created_at < NOW() - INTERVAL '7 days')
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has voted in poll
CREATE OR REPLACE FUNCTION has_user_voted(target_poll_id UUID, target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.poll_votes 
    WHERE poll_id = target_poll_id 
      AND user_id = target_user_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- 6. GRANT PERMISSIONS
-- ============================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant permissions on tables
GRANT SELECT, INSERT, UPDATE ON public.polls TO authenticated;
GRANT SELECT, INSERT ON public.poll_votes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_engagement_stats TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_poll_results(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_user_voted(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION close_expired_polls() TO authenticated;

-- Comments
COMMENT ON TABLE public.polls IS 'Interactive polls for audience participation';
COMMENT ON TABLE public.poll_votes IS 'User votes on polls';
COMMENT ON TABLE public.user_engagement_stats IS 'User engagement metrics per room';
COMMENT ON FUNCTION get_poll_results(UUID) IS 'Get real-time poll results with percentages';
COMMENT ON FUNCTION close_expired_polls() IS 'Background job to close expired polls';
