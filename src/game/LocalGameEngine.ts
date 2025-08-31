import type { GameState, ScoringCategory } from '../types';
import type { GameEngine, GameResult } from './GameEngine';
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
 * Local game engine implementation using in-memory storage
 * Handles local games with session-based history
 */
export class LocalGameEngine implements GameEngine {
  private state: GameState;
  private gameHistory: GameResult[] = [];
  private gameNumber: number = 1;

  constructor() {
    // Initialize with a default state
    this.state = {
      dice: Array.from({ length: 5 }, () => ({ value: 1, isHeld: false })),
      rollsLeft: 3,
      players: [],
      currentPlayerIndex: 0,
      currentTurn: 1,
      gameComplete: false,
      gameStarted: false
    };
  }

  getState(): GameState {
    return this.state;
  }

  updateState(newState: GameState): void {
    this.state = newState;
  }

  startGame(playerCount: number, playerNames: string[]): GameState {
    this.state = initializeGame(playerCount, playerNames);
    return this.state;
  }

  rollDice(): GameState {
    if (this.state.rollsLeft > 0) {
      // Roll unheld dice
      this.state = {
        ...this.state,
        dice: this.state.dice.map(die => 
          die.isHeld ? die : { ...die, value: Math.floor(Math.random() * 6) + 1 }
        ),
        rollsLeft: this.state.rollsLeft - 1
      };
    }
    return this.state;
  }

  toggleDieHold(dieIndex: number): GameState {
    if (this.state.rollsLeft === 3 || this.state.rollsLeft === 0) {
      return this.state; // Can't hold dice before first roll or after final roll
    }

    this.state = {
      ...this.state,
      dice: this.state.dice.map((die, index) => 
        index === dieIndex ? { ...die, isHeld: !die.isHeld } : die
      )
    };
    return this.state;
  }

  scoreCategory(category: ScoringCategory): GameState {
    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    const hasYahtzee = isYahtzee(this.state.dice);
    const yahtzeeAlreadyScored = currentPlayer.scoreCard.yahtzee !== undefined;
    
    let score = calculateScore(this.state.dice, category);
    let yahtzeeBonus = currentPlayer.scoreCard.yahtzeeBonus || 0;
    
    // Handle Yahtzee bonus and joker rules
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
    
    // Update player's score card
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
    
    // Check if game is complete
    const gameComplete = isGameComplete({ ...this.state, players: updatedPlayers });
    
    // Move to next player or end turn
    let nextPlayerIndex = this.state.currentPlayerIndex;
    let nextTurn = this.state.currentTurn;
    
    if (!gameComplete) {
      nextPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
      if (nextPlayerIndex === 0) {
        nextTurn++;
      }
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
    
    // If game is complete, add to history
    if (gameComplete) {
      this.addGameResult({
        gameNumber: this.gameNumber,
        players: this.state.players.map(player => ({
          name: player.name,
          score: getTotalScore(player)
        })),
        winner: getWinner(this.state).name,
        timestamp: new Date()
      });
      this.gameNumber++;
    }
    
    return this.state;
  }

  getGameHistory(): GameResult[] {
    return this.gameHistory;
  }

  addGameResult(result: GameResult): void {
    this.gameHistory.unshift(result); // Add to beginning
    // Keep only last 10 games
    if (this.gameHistory.length > 10) {
      this.gameHistory = this.gameHistory.slice(0, 10);
    }
  }

  async persistState(): Promise<void> {
    // No-op for local mode - state is already in memory
  }

  async loadState(): Promise<GameState | null> {
    // No-op for local mode - return current state
    return this.state;
  }

  /**
   * Reset game history (for "Start From Scratch")
   */
  resetHistory(): void {
    this.gameHistory = [];
    this.gameNumber = 1;
  }
}
