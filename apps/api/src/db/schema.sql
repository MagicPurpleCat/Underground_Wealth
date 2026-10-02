-- players
CREATE TABLE IF NOT EXISTS players (
  max_user_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT 'Шахтёр',
  level INT NOT NULL DEFAULT 1,
  xp INT NOT NULL DEFAULT 0,
  soft BIGINT NOT NULL DEFAULT 0,
  hard BIGINT NOT NULL DEFAULT 0,
  skill_points INT NOT NULL DEFAULT 0,
  prestige_count INT NOT NULL DEFAULT 0,
  prestige_mult DOUBLE PRECISION NOT NULL DEFAULT 1,
  mine_id INT NOT NULL DEFAULT 1,
  ore DOUBLE PRECISION NOT NULL DEFAULT 0,
  upgrades JSONB NOT NULL DEFAULT '{"pickaxe":0,"speed":0,"capacity":0,"multiplier":0}',
  helpers JSONB NOT NULL DEFAULT '[]',
  skills JSONB NOT NULL DEFAULT '[]',
  seen_tutorials JSONB NOT NULL DEFAULT '[]',
  quest_progress JSONB NOT NULL DEFAULT '{}',
  last_sync_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS boss_raids (
  id UUID PRIMARY KEY,
  slot_hour INT NOT NULL,
  status TEXT NOT NULL,
  max_hp BIGINT NOT NULL,
  hp BIGINT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  settled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boss_raids_starts ON boss_raids (starts_at DESC);

CREATE TABLE IF NOT EXISTS boss_damage (
  raid_id UUID NOT NULL REFERENCES boss_raids(id) ON DELETE CASCADE,
  max_user_id TEXT NOT NULL REFERENCES players(max_user_id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  damage BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (raid_id, max_user_id)
);

CREATE INDEX IF NOT EXISTS idx_boss_damage_raid_dmg ON boss_damage (raid_id, damage DESC);

CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  max_user_id TEXT,
  event_name TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
