-- Migration: create_clip_system
-- Created at: 1761640583

-- Migration 008: Clip Generator System
-- Creates tables and functions for audio/video clip generation and sharing

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create clips table
CREATE TABLE IF NOT EXISTS public.clips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    
    -- Clip metadata
    title TEXT NOT NULL,
    description TEXT,
    start_time NUMERIC NOT NULL,
    end_time NUMERIC NOT NULL,
    duration NUMERIC GENERATED ALWAYS AS (end_time - start_time) STORED,
    
    -- Highlight detection
    highlight_type TEXT NOT NULL CHECK (highlight_type IN ('auto', 'manual')),
    highlight_reason TEXT,
    sentiment_score NUMERIC,
    
    -- File information
    formats_available JSONB DEFAULT '[]'::jsonb,
    thumbnail_url TEXT,
    clip_urls JSONB DEFAULT '{}'::jsonb,
    file_size_bytes BIGINT DEFAULT 0,
    
    -- Engagement metrics
    view_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    
    -- Processing status
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    processing_progress INTEGER DEFAULT 0 CHECK (processing_progress >= 0 AND processing_progress <= 100),
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT valid_duration CHECK (duration <= 300)
);

CREATE INDEX idx_clips_user_id ON public.clips(user_id);
CREATE INDEX idx_clips_conversation_id ON public.clips(conversation_id);
CREATE INDEX idx_clips_room_id ON public.clips(room_id);
CREATE INDEX idx_clips_status ON public.clips(status);
CREATE INDEX idx_clips_created_at ON public.clips(created_at DESC);
CREATE INDEX idx_clips_highlight_type ON public.clips(highlight_type);

CREATE TABLE IF NOT EXISTS public.clip_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clip_id UUID NOT NULL REFERENCES public.clips(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('twitter', 'facebook', 'whatsapp', 'reddit', 'direct_link', 'embed', 'download')),
    shared_at TIMESTAMPTZ DEFAULT NOW(),
    user_agent TEXT,
    referrer TEXT
);

CREATE INDEX idx_clip_shares_clip_id ON public.clip_shares(clip_id);
CREATE INDEX idx_clip_shares_platform ON public.clip_shares(platform);

CREATE TABLE IF NOT EXISTS public.user_storage_quota (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    total_storage_bytes BIGINT DEFAULT 0,
    clip_count INTEGER DEFAULT 0,
    quota_limit_bytes BIGINT DEFAULT 524288000,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_storage_quota_user_id ON public.user_storage_quota(user_id);

CREATE OR REPLACE FUNCTION update_storage_quota()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_storage_quota (user_id, total_storage_bytes, clip_count)
    VALUES (NEW.user_id, NEW.file_size_bytes, 1)
    ON CONFLICT (user_id)
    DO UPDATE SET
        total_storage_bytes = user_storage_quota.total_storage_bytes + NEW.file_size_bytes,
        clip_count = user_storage_quota.clip_count + 1,
        last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_storage_quota
    AFTER UPDATE OF status ON public.clips
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
    EXECUTE FUNCTION update_storage_quota();

CREATE OR REPLACE FUNCTION decrement_storage_quota()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.user_storage_quota
    SET 
        total_storage_bytes = GREATEST(0, total_storage_bytes - OLD.file_size_bytes),
        clip_count = GREATEST(0, clip_count - 1),
        last_updated = NOW()
    WHERE user_id = OLD.user_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decrement_storage_quota
    BEFORE DELETE ON public.clips
    FOR EACH ROW
    WHEN (OLD.status = 'completed')
    EXECUTE FUNCTION decrement_storage_quota();

CREATE OR REPLACE FUNCTION increment_clip_view(clip_id_param UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.clips SET view_count = view_count + 1 WHERE id = clip_id_param;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_clip_share(clip_id_param UUID, platform_param TEXT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.clip_shares (clip_id, platform) VALUES (clip_id_param, platform_param);
    UPDATE public.clips SET share_count = share_count + 1 WHERE id = clip_id_param;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_clips()
RETURNS INTEGER AS $$
DECLARE deleted_count INTEGER;
BEGIN
    WITH deleted AS (
        DELETE FROM public.clips
        WHERE created_at < NOW() - INTERVAL '30 days' AND status = 'completed'
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE public.clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clip_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_storage_quota ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clips" ON public.clips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own clips" ON public.clips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own clips" ON public.clips FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own clips" ON public.clips FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Clip shares viewable by clip owner" ON public.clip_shares FOR SELECT USING (EXISTS (SELECT 1 FROM public.clips WHERE clips.id = clip_shares.clip_id AND clips.user_id = auth.uid()));
CREATE POLICY "Anyone can record clip shares" ON public.clip_shares FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own storage quota" ON public.user_storage_quota FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can update storage quota" ON public.user_storage_quota FOR UPDATE USING (true);
CREATE POLICY "System can insert storage quota" ON public.user_storage_quota FOR INSERT WITH CHECK (true);

CREATE OR REPLACE FUNCTION check_storage_quota(user_id_param UUID, required_bytes BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    current_usage BIGINT;
    quota_limit BIGINT;
BEGIN
    SELECT COALESCE(total_storage_bytes, 0), COALESCE(quota_limit_bytes, 524288000)
    INTO current_usage, quota_limit FROM public.user_storage_quota WHERE user_id = user_id_param;
    IF NOT FOUND THEN
        INSERT INTO public.user_storage_quota (user_id, total_storage_bytes, clip_count) VALUES (user_id_param, 0, 0);
        RETURN true;
    END IF;
    RETURN (current_usage + required_bytes) <= quota_limit;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_clips_updated_at BEFORE UPDATE ON public.clips FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();;