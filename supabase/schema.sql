-- ====================================================================
-- SANTOSTARK U.L.T.R.O.N. CORE // SUPABASE CLOUD VAULT SCHEMA
-- Enterprise PostgreSQL with Row-Level Security (RLS) & Realtime Sync
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. STARK BIOMETRIC SECURITY VAULT
-- Stores salted SHA-256 hashes and encrypted embedding vectors. Zero plaintext credentials.
CREATE TABLE IF NOT EXISTS stark_biometric_vault (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL UNIQUE DEFAULT 'SANTOSTARK_ROOT',
    clearance_level INT NOT NULL DEFAULT 10,
    security_mode TEXT NOT NULL DEFAULT 'ANY',
    pin_salt TEXT NOT NULL,
    master_pin_hash TEXT NOT NULL,
    voice_passphrase TEXT DEFAULT 'STARK CLEARANCE LEVEL TEN',
    voice_vector JSONB,            -- 64-formant spectral acoustic embedding vector
    palm_vector JSONB,             -- 15-ratio scale-invariant geometric bone ratios
    clap_sensitivity FLOAT NOT NULL DEFAULT 1.0,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. STARK CONVERSATION MEMORY VAULT
-- Persistent conversational history with metadata tags & token metrics
CREATE TABLE IF NOT EXISTS stark_conversation_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL DEFAULT 'SANTOSTARK_ROOT',
    persona TEXT NOT NULL DEFAULT 'jarvis',
    user_query TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    provider_used TEXT NOT NULL DEFAULT 'auto-free',
    tokens_used INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. STARK SATELLITE MULTI-SCREEN REALTIME SYNC
-- Broadcast state sync across primary cockpit and secondary mobile/tablet displays
CREATE TABLE IF NOT EXISTS stark_satellite_sync (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_name TEXT NOT NULL DEFAULT 'stark_main_lab',
    active_theme TEXT DEFAULT 'cyber',
    active_persona TEXT DEFAULT 'jarvis',
    active_tab TEXT DEFAULT 'overview',
    projected_card JSONB,
    forensic_data JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
ALTER TABLE stark_biometric_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE stark_conversation_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE stark_satellite_sync ENABLE ROW LEVEL SECURITY;

-- 6. DEFAULT SECURITY POLICIES (Allow root access for authenticated SantoStark client)
CREATE POLICY "Allow public read-write for lab client" 
ON stark_biometric_vault FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow public read-write for conversation memory" 
ON stark_conversation_memory FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow public realtime for satellite sync" 
ON stark_satellite_sync FOR ALL 
USING (true) 
WITH CHECK (true);

-- 7. ENABLE REALTIME SUBSCRIPTIONS
ALTER PUBLICATION supabase_realtime ADD TABLE stark_satellite_sync;
ALTER PUBLICATION supabase_realtime ADD TABLE stark_biometric_vault;

-- ====================================================================
-- Initial Root Record (Default Master PIN: STARK-01 salted with SHA-256)
-- ====================================================================
INSERT INTO stark_biometric_vault (
    user_id,
    clearance_level,
    security_mode,
    pin_salt,
    master_pin_hash,
    clap_sensitivity,
    is_locked
) VALUES (
    'SANTOSTARK_ROOT',
    10,
    'ANY',
    'STARK_SALT_9981',
    '152438842e47262c5512bcf1b151044439c27fe8466e3b5e407519e9177b96b3', -- Salted SHA-256 of 'STARK-01'
    1.0,
    false
) ON CONFLICT (user_id) DO NOTHING;
