/**
 * Game Engine Interface
 * Defines the contract for game engines (local and remote)
 */

/**
 * @typedef {Object} GameResult
 * @property {number} gameNumber - Game number in series
 * @property {string} winner - Name of the winner
 * @property {Array<{name: string, score: number}>} players - All players and their scores
 * @property {Date} timestamp - When the game was completed
 */

/**
 * Game Engine Interface
 * All game engines must implement these methods
 */
export class GameEngine {
  /**
   * Get current game state
   */
  getState() {
    throw new Error('getState() must be implemented');
  }

  /**
   * Update game state
   */
  updateState(newState) {
    throw new Error('updateState() must be implemented');
  }

  /**
   * Start a new game
   */
  startGame(playerCount, playerNames) {
    throw new Error('startGame() must be implemented');
  }

  /**
   * Roll the dice
   */
  rollDice() {
    throw new Error('rollDice() must be implemented');
  }

  /**
   * Toggle die hold state
   */
  toggleDieHold(dieIndex) {
    throw new Error('toggleDieHold() must be implemented');
  }

  /**
   * Score a category
   */
  scoreCategory(category) {
    throw new Error('scoreCategory() must be implemented');
  }

  /**
   * Get game history
   */
  getGameHistory() {
    throw new Error('getGameHistory() must be implemented');
  }

  /**
   * Reset game history
   */
  resetHistory() {
    throw new Error('resetHistory() must be implemented');
  }
}

/**
 * Game configuration for starting new games
 */
// Note: GameConfig interface removed for JavaScript compatibility
