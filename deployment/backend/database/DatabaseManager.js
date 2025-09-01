import Database from 'better-sqlite3';

/**
 * Database manager for remote Yahtzee games
 * Maintains consistency with local GameState structure
 */
export class DatabaseManager {
  constructor(dbPath = 'yahtzee_remote.db') {
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  /**
   * Initialize database with schema
   */
  initializeDatabase() {
    const schema = this.readSchemaFile();
    this.db.exec(schema);
    
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');
  }

  /**
   * Read schema from file
   */
  readSchemaFile() {
    // In a real app, you'd read this from a file
    // For now, we'll include the schema inline
    return `
      -- Games table - stores the main game state
      CREATE TABLE IF NOT EXISTS games (
          id TEXT PRIMARY KEY,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
          game_started BOOLEAN DEFAULT FALSE,
          current_turn INTEGER DEFAULT 1,
          current_player_index INTEGER DEFAULT 0,
          rolls_left INTEGER DEFAULT 3,
          game_complete BOOLEAN DEFAULT FALSE,
          dice_values TEXT,
          dice_held TEXT,
          player_count INTEGER DEFAULT 1
      );

      -- Players table - stores player information for each game
      CREATE TABLE IF NOT EXISTS players (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          game_id TEXT NOT NULL,
          player_index INTEGER NOT NULL,
          name TEXT NOT NULL,
          FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
          UNIQUE(game_id, player_index)
      );

      -- Score cards table - stores individual category scores
      CREATE TABLE IF NOT EXISTS score_cards (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          player_id INTEGER NOT NULL,
          category TEXT NOT NULL,
          score INTEGER,
          yahtzee_bonus INTEGER DEFAULT 0,
          FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
          UNIQUE(player_id, category)
      );

      -- Game history table - stores completed games for series
      CREATE TABLE IF NOT EXISTS game_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          game_id TEXT NOT NULL,
          game_number INTEGER NOT NULL,
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
    `;
  }

  /**
   * Convert GameState to database format
   */
  serializeGameState(gameState) {
    return {
      dice_values: JSON.stringify(gameState.dice.map(d => d.value)),
      dice_held: JSON.stringify(gameState.dice.map(d => d.isHeld)),
      player_count: gameState.players.length,
      game_started: gameState.gameStarted ? 1 : 0,
      current_turn: gameState.currentTurn,
      current_player_index: gameState.currentPlayerIndex,
      rolls_left: gameState.rollsLeft,
      game_complete: gameState.gameComplete ? 1 : 0
    };
  }

  /**
   * Convert database format to GameState
   */
  deserializeGameState(dbGame, dbPlayers, dbScoreCards) {
    const diceValues = JSON.parse(dbGame.dice_values || '[1,1,1,1,1]');
    const diceHeld = JSON.parse(dbGame.dice_held || '[false,false,false,false,false]');
    
    const dice = diceValues.map((value, index) => ({
      value,
      isHeld: diceHeld[index] || false
    }));

    const players = dbPlayers.map(dbPlayer => {
      const playerScoreCards = dbScoreCards.filter(sc => sc.player_id === dbPlayer.id);
      const scoreCard = {};
      let yahtzeeBonus = 0;

      playerScoreCards.forEach(sc => {
        if (sc.category === 'yahtzeeBonus') {
          yahtzeeBonus = sc.score;
        } else {
          scoreCard[sc.category] = sc.score;
        }
      });

      return {
        id: dbPlayer.id,
        name: dbPlayer.name,
        scoreCard: { ...scoreCard, yahtzeeBonus },
        isActive: true
      };
    });

    return {
      dice,
      rollsLeft: dbGame.rolls_left,
      players,
      currentPlayerIndex: dbGame.current_player_index,
      currentTurn: dbGame.current_turn,
      gameComplete: dbGame.game_complete === 1,
      gameStarted: dbGame.game_started === 1
    };
  }

  /**
   * Create a new game in the database
   */
  createGame(gameId, gameState) {
    const serialized = this.serializeGameState(gameState);
    
    // Insert game record
    this.db.prepare(`
      INSERT INTO games (id, dice_values, dice_held, player_count, game_started, 
                        current_turn, current_player_index, rolls_left, game_complete)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(gameId, serialized.dice_values, serialized.dice_held, serialized.player_count,
           serialized.game_started, serialized.current_turn, serialized.current_player_index,
           serialized.rolls_left, serialized.game_complete);

    // Insert players
    gameState.players.forEach((player, index) => {
      this.db.prepare(`
        INSERT INTO players (game_id, player_index, name)
        VALUES (?, ?, ?)
      `).run(gameId, index, player.name);

      // Insert score cards
      Object.entries(player.scoreCard).forEach(([category, score]) => {
        if (category !== 'yahtzeeBonus') {
          this.db.prepare(`
            INSERT INTO score_cards (player_id, category, score)
            VALUES (?, ?, ?)
          `).run(player.id, category, score);
        } else {
          this.db.prepare(`
            INSERT INTO score_cards (player_id, category, score, yahtzee_bonus)
            VALUES (?, ?, ?, ?)
          `).run(player.id, 'yahtzeeBonus', score, score);
        }
      });
    });
  }

  /**
   * Load a game from the database
   */
  loadGame(gameId) {
    const dbGame = this.db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
    if (!dbGame) return null;

    const dbPlayers = this.db.prepare('SELECT * FROM players WHERE game_id = ? ORDER BY player_index').all(gameId);
    const dbScoreCards = this.db.prepare(`
      SELECT sc.* FROM score_cards sc
      JOIN players p ON sc.player_id = p.id
      WHERE p.game_id = ?
    `).all(gameId);

    return this.deserializeGameState(dbGame, dbPlayers, dbScoreCards);
  }

  /**
   * Update a game in the database
   */
  updateGame(gameId, gameState) {
    const serialized = this.serializeGameState(gameState);
    
    // Update game record
    this.db.prepare(`
      UPDATE games SET 
        dice_values = ?, dice_held = ?, player_count = ?, game_started = ?,
        current_turn = ?, current_player_index = ?, rolls_left = ?, game_complete = ?,
        updated_at = CURRENT_TIMESTAMP, last_activity = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(serialized.dice_values, serialized.dice_held, serialized.player_count,
           serialized.game_started, serialized.current_turn, serialized.current_player_index,
           serialized.rolls_left, serialized.game_complete, gameId);

    // Update players and score cards
    gameState.players.forEach((player, index) => {
      // Use INSERT OR REPLACE for players (much simpler)
      this.db.prepare(`
        INSERT OR REPLACE INTO players (game_id, player_index, name)
        VALUES (?, ?, ?)
      `).run(gameId, index, player.name);

      // Get the player ID for score cards
      const dbPlayer = this.db.prepare('SELECT id FROM players WHERE game_id = ? AND player_index = ?').get(gameId, index);
      if (!dbPlayer) {
        throw new Error(`Failed to get player ID for game ${gameId}, player index ${index}`);
      }

      // Clear existing score cards for this player
      this.db.prepare(`
        DELETE FROM score_cards WHERE player_id = ?
      `).run(dbPlayer.id);

      // Insert updated score cards
      Object.entries(player.scoreCard).forEach(([category, score]) => {
        if (category !== 'yahtzeeBonus') {
          this.db.prepare(`
            INSERT INTO score_cards (player_id, category, score)
            VALUES (?, ?, ?)
          `).run(dbPlayer.id, category, score);
        } else {
          this.db.prepare(`
            INSERT INTO score_cards (player_id, category, score, yahtzee_bonus)
            VALUES (?, ?, ?, ?)
          `).run(dbPlayer.id, 'yahtzeeBonus', score, score);
        }
      });
    });
  }

  /**
   * Get game history for a game series
   */
  getGameHistory(gameId) {
    const history = this.db.prepare(`
      SELECT * FROM game_history 
      WHERE game_id = ? 
      ORDER BY game_number DESC
    `).all(gameId);

    return history.map(record => {
      const players = this.db.prepare(`
        SELECT player_name, player_score 
        FROM history_player_scores 
        WHERE history_id = ?
      `).all(record.id).map(p => ({
        name: p.player_name,
        score: p.player_score
      }));
      
      // Use the is_tie field from database, with fallback to dynamic detection
      const isTie = record.is_tie || false;
      let tiedPlayers = undefined;
      let tieScore = undefined;
      
      if (isTie) {
        const scores = players.map(p => p.score);
        const maxScore = Math.max(...scores);
        tiedPlayers = players.filter(p => p.score === maxScore);
        tieScore = maxScore;
      }
      
      return {
        gameNumber: record.game_number,
        winner: record.winner_name,
        winnerScore: record.winner_score,
        totalPlayers: record.total_players,
        completedAt: record.completed_at,
        players: players,
        isTie: isTie,
        tiedPlayers: tiedPlayers,
        tieScore: tieScore
      };
    });
  }

  /**
   * Record a completed game in history
   */
  recordGameResult(gameId, gameNumber, winner, winnerScore, players) {
    // Check if this is a tie
    const scores = players.map(p => p.score);
    const maxScore = Math.max(...scores);
    const tiedPlayers = players.filter(p => p.score === maxScore);
    const isTie = tiedPlayers.length > 1;
    
    const historyId = this.db.prepare(`
      INSERT INTO game_history (game_id, game_number, winner_name, winner_score, total_players, is_tie)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(gameId, gameNumber, winner, winnerScore, players.length, isTie ? 1 : 0).lastInsertRowid;

    // Record all player scores
    players.forEach(player => {
      this.db.prepare(`
        INSERT INTO history_player_scores (history_id, player_name, player_score)
        VALUES (?, ?, ?)
      `).run(historyId, player.name, player.score);
    });
  }

  /**
   * Clean up old games (7-day inactivity)
   */
  cleanupOldGames() {
    const result = this.db.prepare(`
      DELETE FROM games 
      WHERE last_activity < datetime('now', '-7 days')
    `).run();
    
    return result.changes;
  }

  /**
   * Clear all games from the database
   */
  clearAllGames() {
    // Delete all data from all tables
    this.db.prepare('DELETE FROM history_player_scores').run();
    this.db.prepare('DELETE FROM game_history').run();
    this.db.prepare('DELETE FROM score_cards').run();
    this.db.prepare('DELETE FROM players').run();
    const result = this.db.prepare('DELETE FROM games').run();
    
    return result.changes;
  }

  /**
   * Close database connection
   */
  close() {
    this.db.close();
  }
}
