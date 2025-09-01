import Database from 'better-sqlite3';
import type { GameState, Player, Die, ScoringCategory } from '../types';
import type { GameResult } from '../game/GameEngine';

/**
 * Database manager for remote Yahtzee games
 * Maintains consistency with local GameState structure
 */
export class DatabaseManager {
  private db: Database.Database;

  constructor(dbPath: string = 'yahtzee_remote.db') {
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  /**
   * Initialize database with schema
   */
  private initializeDatabase(): void {
    const schema = this.readSchemaFile();
    this.db.exec(schema);
    
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');
  }

  /**
   * Read schema from file
   */
  private readSchemaFile(): string {
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
  private gameStateToDb(gameState: GameState, gameId: string): void {
    const transaction = this.db.transaction(() => {
      // Update or insert game record
      const gameStmt = this.db.prepare(`
        INSERT OR REPLACE INTO games (
          id, game_started, current_turn, current_player_index, 
          rolls_left, game_complete, dice_values, dice_held, player_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const diceValues = JSON.stringify(gameState.dice.map(d => d.value));
      const diceHeld = JSON.stringify(gameState.dice.map(d => d.isHeld));

      gameStmt.run(
        gameId,
        gameState.gameStarted ? 1 : 0,
        gameState.currentTurn,
        gameState.currentPlayerIndex,
        gameState.rollsLeft,
        gameState.gameComplete ? 1 : 0,
        diceValues,
        diceHeld,
        gameState.players.length
      );

      // Clear existing players and scores
      this.db.prepare('DELETE FROM score_cards WHERE player_id IN (SELECT id FROM players WHERE game_id = ?)').run(gameId);
      this.db.prepare('DELETE FROM players WHERE game_id = ?').run(gameId);

      // Insert players
      const playerStmt = this.db.prepare(`
        INSERT INTO players (game_id, player_index, name) VALUES (?, ?, ?)
      `);

      const scoreStmt = this.db.prepare(`
        INSERT INTO score_cards (player_id, category, score, yahtzee_bonus) VALUES (?, ?, ?, ?)
      `);

      gameState.players.forEach((player, index) => {
        const result = playerStmt.run(gameId, index, player.name);
        const playerId = result.lastInsertRowid as number;

        // Insert score card entries
        Object.entries(player.scoreCard).forEach(([category, score]) => {
          if (score !== undefined) {
            const yahtzeeBonus = category === 'yahtzeeBonus' ? score : 0;
            const actualCategory = category === 'yahtzeeBonus' ? 'yahtzee' : category;
            scoreStmt.run(playerId, actualCategory, score, yahtzeeBonus);
          }
        });
      });
    });

    transaction();
  }

  /**
   * Convert database format to GameState
   */
  private dbToGameState(gameId: string): GameState | null {
    const gameStmt = this.db.prepare('SELECT * FROM games WHERE id = ?');
    const game = gameStmt.get(gameId) as any;

    if (!game) return null;

    // Get players
    const playersStmt = this.db.prepare(`
      SELECT p.*, sc.category, sc.score, sc.yahtzee_bonus 
      FROM players p 
      LEFT JOIN score_cards sc ON p.id = sc.player_id 
      WHERE p.game_id = ? 
      ORDER BY p.player_index, sc.category
    `);
    const playerRows = playersStmt.all(gameId) as any[];

    // Reconstruct players and score cards
    const players: Player[] = [];
    const playerMap = new Map<number, Player>();

    playerRows.forEach(row => {
      if (!playerMap.has(row.player_index)) {
        const player: Player = {
          id: row.player_index + 1,
          name: row.name,
          scoreCard: {},
          isActive: true
        };
        playerMap.set(row.player_index, player);
        players.push(player);
      }

      if (row.category) {
        const player = playerMap.get(row.player_index)!;
        if (row.category === 'yahtzee') {
          player.scoreCard.yahtzee = row.score;
          if (row.yahtzee_bonus > 0) {
            player.scoreCard.yahtzeeBonus = row.yahtzee_bonus;
          }
        } else {
          player.scoreCard[row.category as ScoringCategory] = row.score;
        }
      }
    });

    // Reconstruct dice
    const diceValues = JSON.parse(game.dice_values || '[1,1,1,1,1]');
    const diceHeld = JSON.parse(game.dice_held || '[false,false,false,false,false]');
    const dice: Die[] = diceValues.map((value: number, index: number) => ({
      value,
      isHeld: diceHeld[index]
    }));

    return {
      dice,
      rollsLeft: game.rolls_left,
      players,
      currentPlayerIndex: game.current_player_index,
      currentTurn: game.current_turn,
      gameComplete: game.game_complete === 1,
      gameStarted: game.game_started === 1
    };
  }

  /**
   * Create a new game
   */
  createGame(gameId: string, gameState: GameState): void {
    this.gameStateToDb(gameState, gameId);
  }

  /**
   * Load a game by ID
   */
  loadGame(gameId: string): GameState | null {
    return this.dbToGameState(gameId);
  }

  /**
   * Update an existing game
   */
  updateGame(gameId: string, gameState: GameState): void {
    this.gameStateToDb(gameState, gameId);
  }

  /**
   * Delete a game
   */
  deleteGame(gameId: string): void {
    this.db.prepare('DELETE FROM games WHERE id = ?').run(gameId);
  }

  /**
   * Check if game exists
   */
  gameExists(gameId: string): boolean {
    const result = this.db.prepare('SELECT 1 FROM games WHERE id = ?').get(gameId);
    return !!result;
  }

  /**
   * Clean up old inactive games (older than 5 days)
   */
  cleanupInactiveGames(): void {
    this.db.prepare(`
      DELETE FROM games 
      WHERE last_activity < datetime('now', '-5 days')
    `).run();
  }

  /**
   * Add game result to history
   */
  addGameResult(gameId: string, result: GameResult): void {
    const transaction = this.db.transaction(() => {
      // Check if this is a tie
      const scores = result.players.map(p => p.score);
      const maxScore = Math.max(...scores);
      const tiedPlayers = result.players.filter(p => p.score === maxScore);
      const isTie = tiedPlayers.length > 1;
      
      const historyStmt = this.db.prepare(`
        INSERT INTO game_history (game_id, game_number, winner_name, winner_score, total_players, is_tie)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

             const result2 = historyStmt.run(
         gameId,
         result.gameNumber,
         result.winner,
         result.players.find(p => p.name === result.winner)?.score || 0,
         result.players.length,
         isTie ? 1 : 0
       );

      const historyId = result2.lastInsertRowid as number;

      const scoreStmt = this.db.prepare(`
        INSERT INTO history_player_scores (history_id, player_name, player_score)
        VALUES (?, ?, ?)
      `);

      result.players.forEach(player => {
        scoreStmt.run(historyId, player.name, player.score);
      });
    });

    transaction();
  }

  /**
   * Get game history for a game series
   */
  getGameHistory(gameId: string): any[] {
    const history = this.db.prepare(`
      SELECT * FROM game_history 
      WHERE game_id = ? 
      ORDER BY game_number DESC
    `).all(gameId);

    return history.map((record: any) => {
      const players = this.db.prepare(`
        SELECT player_name, player_score 
        FROM history_player_scores 
        WHERE history_id = ?
      `).all(record.id).map((p: any) => ({
        name: p.player_name,
        score: p.player_score
      }));
      
      // Use the is_tie field from database, with fallback to dynamic detection
      const isTie = record.is_tie || false;
      let tiedPlayers = undefined;
      let tieScore = undefined;
      
      if (isTie) {
        const scores = players.map((p: any) => p.score);
        const maxScore = Math.max(...scores);
        tiedPlayers = players.filter((p: any) => p.score === maxScore);
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
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
