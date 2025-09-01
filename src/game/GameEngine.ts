import type { GameState, ScoringCategory } from '../types';

/**
 * Core game engine interface that handles all game operations
 * This will be implemented by both local (in-memory) and remote (database) modes
 */
export interface GameEngine {
  // Game state management
  getState(): GameState;
  updateState(newState: GameState): void;
  
  // Game operations
  startGame(playerCount: number, playerNames: string[]): GameState;
  rollDice(): GameState;
  toggleDieHold(dieIndex: number): GameState;
  scoreCategory(category: ScoringCategory): GameState;
  
  // Game history (for both local and remote modes)
  getGameHistory(): GameResult[];
  addGameResult(result: GameResult): void;
  
  // Persistence (no-op for local, database for remote)
  persistState(): Promise<void>;
  loadState(): Promise<GameState | null>;
}

/**
 * Game result for history tracking
 */
export interface GameResult {
  gameNumber: number;
  players: {
    name: string;
    score: number;
  }[];
  winner: string;
  timestamp: Date;
  isTie?: boolean;
  tiedPlayers?: {
    name: string;
    score: number;
  }[];
  tieScore?: number;
}

/**
 * Game configuration for starting new games
 */
export interface GameConfig {
  playerCount: number;
  playerNames: string[];
  mode: 'local' | 'remote';
}
