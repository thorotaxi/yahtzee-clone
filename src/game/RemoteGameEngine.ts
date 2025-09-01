import type { GameState, ScoringCategory } from '../types';
import type { GameEngine, GameResult } from './GameEngine';
import { DatabaseManager } from '../database/DatabaseManager';
import {
  initializeGame,
  calculateScore,
  isYahtzee,
  getDiceTotal,
  isGameComplete,
  getWinner,
  getTotalScore
} from './gameLogic';

/**
 * Remote game engine implementation using database storage
 * Maintains consistency with LocalGameEngine interface and behavior
 */
export class RemoteGameEngine implements GameEngine {
  private dbManager: DatabaseManager;
  private gameId: string;
  private state: GameState;
  private gameNumber: number = 1;

  constructor(gameId: string, dbManager: DatabaseManager) {
    this.gameId = gameId;
    this.dbManager = dbManager;
    
    // Try to load existing game, or initialize with default state
    const existingState = this.dbManager.loadGame(gameId);
    if (existingState) {
      this.state = existingState;
      // Determine game number based on existing history
      const history = this.dbManager.getGameHistory(gameId);
      this.gameNumber = history.length + 1;
    } else {
      // Initialize with default state (same as LocalGameEngine)
      this.state = {
        dice: Array.from({ length: 5 }, () => ({ value: 1, isHeld: false })),
        rollsLeft: 3,
        players: [],
        currentPlayerIndex: 0,
        currentTurn: 1,
        gameComplete: false,
        gameStarted: false
      };
      this.gameNumber = 1;
    }
  }

  getState(): GameState {
    return this.state;
  }

  updateState(newState: GameState): void {
    this.state = newState;
    this.dbManager.updateGame(this.gameId, this.state);
  }

  startGame(playerCount: number, playerNames: string[]): GameState {
    // Use the same logic as LocalGameEngine, but preserve the current gameNumber
    const newState = initializeGame(playerCount, playerNames);
    // Keep the current gameNumber (don't increment here)
    this.state = {
      ...newState,
      gameNumber: this.gameNumber
    };
    this.dbManager.updateGame(this.gameId, this.state);
    return this.state;
  }

  rollDice(): GameState {
    if (this.state.rollsLeft > 0) {
      // Use the same logic as LocalGameEngine
      this.state = {
        ...this.state,
        dice: this.state.dice.map(die => 
          die.isHeld ? die : { ...die, value: Math.floor(Math.random() * 6) + 1 }
        ),
        rollsLeft: this.state.rollsLeft - 1
      };
      this.dbManager.updateGame(this.gameId, this.state);
    }
    return this.state;
  }

  toggleDieHold(dieIndex: number): GameState {
    if (this.state.rollsLeft === 3 || this.state.rollsLeft === 0) {
      return this.state; // Can't hold dice before first roll or after final roll
    }

    // Use the same logic as LocalGameEngine
    this.state = {
      ...this.state,
      dice: this.state.dice.map((die, index) => 
        index === dieIndex ? { ...die, isHeld: !die.isHeld } : die
      )
    };
    this.dbManager.updateGame(this.gameId, this.state);
    return this.state;
  }

  scoreCategory(category: ScoringCategory): GameState {
    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    const hasYahtzee = isYahtzee(this.state.dice);
    const yahtzeeAlreadyScored = currentPlayer.scoreCard.yahtzee !== undefined;
    
    let score = calculateScore(this.state.dice, category);
    let yahtzeeBonus = currentPlayer.scoreCard.yahtzeeBonus || 0;
    
    // Use the same Yahtzee bonus and joker rules as LocalGameEngine
    if (hasYahtzee && yahtzeeAlreadyScored) {
      // This is a subsequent Yahtzee (joker)
      
      // Check if this is a valid category for joker scoring with proper priority
      const upperCategory = `${this.state.dice[0].value === 1 ? 'ones' : this.state.dice[0].value === 2 ? 'twos' : this.state.dice[0].value === 3 ? 'threes' : this.state.dice[0].value === 4 ? 'fours' : this.state.dice[0].value === 5 ? 'fives' : 'sixes'}` as ScoringCategory;
      
      // Priority 1: Upper Section if available
      if (currentPlayer.scoreCard[upperCategory] === undefined) {
        if (category !== upperCategory) {
          return this.state; // Don't allow scoring in wrong category
        }
        score = getDiceTotal(this.state.dice); // Required Upper Section gets dice total
      } else {
        // Priority 2: Lower Section categories only if Upper Section is filled
        // First priority: 3-of-a-Kind or 4-of-a-Kind (if either is available)
        const threeOfAKindAvailable = currentPlayer.scoreCard.threeOfAKind === undefined;
        const fourOfAKindAvailable = currentPlayer.scoreCard.fourOfAKind === undefined;
        
        if (threeOfAKindAvailable || fourOfAKindAvailable) {
          // Only allow 3-of-a-Kind or 4-of-a-Kind
          const isValidJokerCategory = (category === 'threeOfAKind' && threeOfAKindAvailable) || 
                                       (category === 'fourOfAKind' && fourOfAKindAvailable);
          
          if (!isValidJokerCategory) {
            return this.state; // Don't allow scoring in wrong category
          }
          score = getDiceTotal(this.state.dice); // 3-of-a-Kind, 4-of-a-Kind, and Chance use dice total
        } else {
          // If neither 3-of-a-Kind nor 4-of-a-Kind is available, then allow other Lower Section categories
          const validJokerCategories = ['fullHouse', 'smallStraight', 'largeStraight', 'chance'];
          const isValidJokerCategory = validJokerCategories.includes(category) && currentPlayer.scoreCard[category] === undefined;
          
          if (isValidJokerCategory) {
            if (category === 'fullHouse') score = 25;
            else if (category === 'smallStraight') score = 30;
            else if (category === 'largeStraight') score = 40;
            else if (category === 'chance') score = getDiceTotal(this.state.dice);
          } else {
            // If no Lower Section categories are available, allow Upper Section categories (except the dice value category)
            const upperCategories = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
            const isValidUpperCategory = upperCategories.includes(category) && 
                                        currentPlayer.scoreCard[category] === undefined && 
                                        category !== upperCategory;
            
            if (isValidUpperCategory) {
              score = 0; // Upper section fallback gets zero
            } else {
              return this.state; // Invalid category for joker scoring
            }
          }
        }
      }
      
      // Add Yahtzee bonus if original Yahtzee was scored (not zero)
      if ((currentPlayer.scoreCard.yahtzee ?? 0) > 0) {
        yahtzeeBonus += 100;
      }
    } else if (hasYahtzee && !yahtzeeAlreadyScored) {
      // First Yahtzee - normal scoring
      score = 50;
    }
    
    // Update player's score card (same logic as LocalGameEngine)
    const updatedPlayers = this.state.players.map((player, index) => 
      index === this.state.currentPlayerIndex 
        ? { 
            ...player, 
            scoreCard: { 
              ...player.scoreCard, 
              [category]: score,
              yahtzeeBonus: yahtzeeBonus
            } 
          }
        : player
    );
    
    // Check if game is complete (same logic as LocalGameEngine)
    const gameComplete = isGameComplete({ ...this.state, players: updatedPlayers });
    
    // Move to next player or end turn (same logic as LocalGameEngine)
    let nextPlayerIndex = this.state.currentPlayerIndex;
    let nextTurn = this.state.currentTurn;
    
    if (!gameComplete) {
      nextPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
      if (nextPlayerIndex === 0) {
        nextTurn++;
      }
    } else {
      // Game is complete, don't increment turn further
      nextTurn = 13;
    }
    
    this.state = {
      ...this.state,
      players: updatedPlayers,
      currentPlayerIndex: nextPlayerIndex,
      currentTurn: nextTurn,
      gameComplete,
      rollsLeft: 3,
      dice: Array.from({ length: 5 }, () => ({ value: 1, isHeld: false }))
    };
    
    // If game is complete, add to history (same logic as LocalGameEngine)
    if (gameComplete) {
      const winner = getWinner(this.state);
      const players = this.state.players.map(player => ({
        name: player.name,
        score: getTotalScore(player)
      }));
      
      if (winner && winner.name) {
        // There's a clear winner
        const result: GameResult = {
          gameNumber: this.gameNumber,
          players: players,
          winner: winner.name,
          timestamp: new Date()
        };
        
        this.dbManager.addGameResult(this.gameId, result);
      } else {
        // It's a tie - record the first tied player as "winner" for database compatibility
        // The tie detection will be handled in getGameHistory
        const scores = players.map(p => p.score);
        const maxScore = Math.max(...scores);
        const tiedPlayers = players.filter(p => p.score === maxScore);
        
        const result: GameResult = {
          gameNumber: this.gameNumber,
          players: players,
          winner: tiedPlayers[0].name, // Use first tied player for database
          timestamp: new Date(),
          isTie: true,
          tiedPlayers: tiedPlayers,
          tieScore: maxScore
        };
        
        this.dbManager.addGameResult(this.gameId, result);
      }
      
      this.gameNumber++;
    }
    
    // Persist to database
    this.dbManager.updateGame(this.gameId, this.state);
    return this.state;
  }

  getGameHistory(): GameResult[] {
    return this.dbManager.getGameHistory(this.gameId);
  }

  addGameResult(result: GameResult): void {
    this.dbManager.addGameResult(this.gameId, result);
  }

  async persistState(): Promise<void> {
    // State is automatically persisted on every update
    // This method exists for interface compatibility
  }

  async loadState(): Promise<GameState | null> {
    return this.dbManager.loadGame(this.gameId);
  }

  /**
   * Get the game ID for this remote game
   */
  getGameId(): string {
    return this.gameId;
  }

  /**
   * Check if this game exists in the database
   */
  gameExists(): boolean {
    return this.dbManager.gameExists(this.gameId);
  }
}
