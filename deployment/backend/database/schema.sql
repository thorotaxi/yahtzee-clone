-- Yahtzee Clone Database Schema
-- Supports remote multiplayer games with URL-based access

-- Games table - stores the main game state
CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,                    -- Unique game ID (for URLs)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    game_started BOOLEAN DEFAULT FALSE,
    current_turn INTEGER DEFAULT 1,
    current_player_index INTEGER DEFAULT 0,
    rolls_left INTEGER DEFAULT 3,
    game_complete BOOLEAN DEFAULT FALSE,
    dice_values TEXT,                       -- JSON array of dice values
    dice_held TEXT,                         -- JSON array of dice held states
    player_count INTEGER DEFAULT 1
);

-- Players table - stores player information for each game
CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    player_index INTEGER NOT NULL,          -- 0, 1, 2, etc.
    name TEXT NOT NULL,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    UNIQUE(game_id, player_index)
);

-- Score cards table - stores individual category scores
CREATE TABLE IF NOT EXISTS score_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    category TEXT NOT NULL,                 -- 'ones', 'twos', etc.
    score INTEGER,                          -- NULL if not scored yet
    yahtzee_bonus INTEGER DEFAULT 0,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    UNIQUE(player_id, category)
);

-- Game history table - stores completed games for series
CREATE TABLE IF NOT EXISTS game_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    game_number INTEGER NOT NULL,           -- 1, 2, 3, etc. in series
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    winner_name TEXT NOT NULL,
    winner_score INTEGER NOT NULL,
    total_players INTEGER NOT NULL
);

-- Player scores in history
CREATE TABLE IF NOT EXISTS history_player_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    history_id INTEGER NOT NULL,
    player_name TEXT NOT NULL,
    player_score INTEGER NOT NULL,
    FOREIGN KEY (history_id) REFERENCES game_history(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_games_last_activity ON games(last_activity);
CREATE INDEX IF NOT EXISTS idx_players_game_id ON players(game_id);
CREATE INDEX IF NOT EXISTS idx_score_cards_player_id ON score_cards(player_id);
CREATE INDEX IF NOT EXISTS idx_game_history_game_id ON game_history(game_id);

-- Trigger to update last_activity when games table is modified
CREATE TRIGGER IF NOT EXISTS update_games_activity 
    AFTER UPDATE ON games
    FOR EACH ROW
    BEGIN
        UPDATE games SET last_activity = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
