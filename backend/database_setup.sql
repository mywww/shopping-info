# Shopping Deal Assistant - Database Setup Script

# Run this in Supabase SQL Editor to create tables and RLS policies

-- Enable RLS
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Requirements table
CREATE TABLE IF NOT EXISTS requirements (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    keyword VARCHAR(100) NOT NULL,
    urgency_type VARCHAR(20) NOT NULL DEFAULT 'urgent',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Push config table
CREATE TABLE IF NOT EXISTS push_configs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    webhook_url VARCHAR(500) NOT NULL,
    merge_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Push records table (with unique constraint for deduplication)
CREATE TABLE IF NOT EXISTS push_records (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    requirement_id INTEGER REFERENCES requirements(id) ON DELETE CASCADE NOT NULL,
    post_id VARCHAR(100) NOT NULL,
    source VARCHAR(20) DEFAULT 'douban',
    post_title TEXT NOT NULL,
    post_url VARCHAR(500) NOT NULL,
    read_status BOOLEAN DEFAULT FALSE,
    pushed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, requirement_id, post_id)
);

-- Crawl logs table
CREATE TABLE IF NOT EXISTS crawl_logs (
    id SERIAL PRIMARY KEY,
    task_type VARCHAR(20),
    trigger_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status VARCHAR(20),
    posts_fetched INTEGER,
    posts_matched INTEGER,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- RLS Policies

-- Requirements: users can only see/edit their own
CREATE POLICY "Users can manage own requirements" ON requirements
    FOR ALL USING (auth.uid() = user_id);

-- Push configs: users can only see/edit their own
CREATE POLICY "Users can manage own push configs" ON push_configs
    FOR ALL USING (auth.uid() = user_id);

-- Push records: users can only see their own
CREATE POLICY "Users can view own push records" ON push_records
    FOR SELECT USING (auth.uid() = user_id);

-- Crawl logs: users can only see their own
CREATE POLICY "Users can view own crawl logs" ON crawl_logs
    FOR SELECT USING (auth.uid() = trigger_user_id);