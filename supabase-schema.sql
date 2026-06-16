-- 复盘工具 Supabase 数据库表结构
-- 在 Supabase SQL Editor 中执行

-- 项目表
CREATE TABLE games (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 标签表
CREATE TABLE tags (
    id BIGSERIAL PRIMARY KEY,
    game_id BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    name TEXT NOT NULL
);

-- 选项表
CREATE TABLE options (
    id BIGSERIAL PRIMARY KEY,
    tag_id BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    name TEXT NOT NULL
);

-- 记录表
CREATE TABLE records (
    id BIGSERIAL PRIMARY KEY,
    game_id BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    tag_name TEXT NOT NULL,
    option_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引（提升查询速度）
CREATE INDEX idx_tags_game_id ON tags(game_id);
CREATE INDEX idx_options_tag_id ON options(tag_id);
CREATE INDEX idx_records_game_id ON records(game_id);
CREATE INDEX idx_records_created_at ON records(created_at DESC);

-- 行级安全策略（可选 - 如果以后加用户系统）
-- ALTER TABLE games ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE options ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE records ENABLE ROW LEVEL SECURITY;
