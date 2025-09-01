import { GameEngine } from './GameEngine.js';
import { DatabaseManager } from '../database/DatabaseManager.js';
import {
  initializeGame,
  calculateScore,
  isYahtzee,
  getDiceTotal,
  getTotalScore,
  isGameComplete,
  getWinner
} from './gameLogic.js';

/**
 * Remote game engine implementation using database storage
 * Maintains consistency with LocalGameEngine interface and behavior
 */
export class RemoteGameEngine extends GameEngine {
  constructor(gameId, dbManager) {
    super();
    this.gameId = gameId;
    this.dbManager = dbManager;
    
    // Try to load existing game, or initialize with default state
    const existingState = this.dbManager.loadGame(gameId);
    if (existingState) {
      this.state = existingState;
      // Load existing game number from state, or default to 1
      this.gameNumber = existingState.gameNumber || 1;
    } else {
      // Initialize with default state (same as LocalGameEngine)
      this.state = {
        dice: Array.from({ length: 5 }, () => ({ value: 1, isHeld: false })),
        rollsLeft: 3,
        players: [],
        currentPlayerIndex: 0,
        currentTurn: 1,
        gameComplete: false,
        gameStarted: false,
        gameNumber: 1
      };
      this.gameNumber = 1;
    }
  }

  getState() {
    return this.state;
  }

  updateState(newState) {
    this.state = newState;
    this.dbManager.updateGame(this.gameId, this.state);
  }

  startGame(playerCount, playerNames) {
    // Use the same logic as LocalGameEngine, but increment the gameNumber
    const newState = initializeGame(playerCount, playerNames);
    // Increment the gameNumber for the new game
    this.state = {
      ...newState,
      gameNumber: this.gameNumber + 1
    };
    // Update the instance gameNumber as well
    this.gameNumber = this.state.gameNumber;
    this.dbManager.updateGame(this.gameId, this.state);
    return this.state;
  }

  rollDice() {
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

  toggleDieHold(dieIndex) {
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

  scoreCategory(category) {
    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    const hasYahtzee = isYahtzee(this.state.dice);
    const yahtzeeAlreadyScored = currentPlayer.scoreCard.yahtzee !== undefined;
    
    let score = calculateScore(this.state.dice, category);
    let yahtzeeBonus = currentPlayer.scoreCard.yahtzeeBonus || 0;
    
    // Use the same Yahtzee bonus and joker rules as LocalGameEngine
    if (hasYahtzee && yahtzeeAlreadyScored) {
      // This is a subsequent Yahtzee (joker)
      
      // Check if this is a valid category for joker scoring with proper priority
      const upperCategory = `${this.state.dice[0].value === 1 ? 'ones' : this.state.dice[0].value === 2 ? 'twos' : this.state.dice[0].value === 3 ? 'threes' : this.state.dice[0].value === 4 ? 'fours' : this.state.dice[0].value === 5 ? 'fives' : 'sixes'}`;
      
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
      if (winner && winner.name) {
        const result = {
          gameNumber: this.gameNumber,
          players: this.state.players.map(player => ({
            name: player.name,
            score: getTotalScore(player)
          })),
          winner: winner.name,
          timestamp: new Date()
        };
        
        this.dbManager.recordGameResult(this.gameId, this.gameNumber, winner.name, getTotalScore(winner), this.state.players.map(player => ({
          name: player.name,
          score: getTotalScore(player)
        })));
        this.gameNumber++;
        // Store the incremented game number in the state
        this.state.gameNumber = this.gameNumber;
      }
    }
    
    // Persist to database
    this.dbManager.updateGame(this.gameId, this.state);
    return this.state;
  }

  getGameHistory() {
    return this.dbManager.getGameHistory(this.gameId);
  }

  addGameResult(result) {
    this.dbManager.recordGameResult(this.gameId, result.gameNumber, result.winner, result.players.find(p => p.name === result.winner)?.score || 0, result.players);
  }

  async persistState() {
    // State is automatically persisted on every update
    // This method exists for interface compatibility
  }

  async loadState() {
    return this.dbManager.loadGame(this.gameId);
  }

  /**
   * Get the game ID for this remote game
   */
  getGameId() {
    return this.gameId;
  }

  /**
   * Check if this game exists in the database
   */
  gameExists() {
    return this.dbManager.gameExists(this.gameId);
  }
}
