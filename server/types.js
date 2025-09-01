// Type definitions for Yahtzee game
// Note: These are JSDoc comments for documentation, not TypeScript types

/**
 * @typedef {Object} Die
 * @property {number} value - Die value (1-6)
 * @property {boolean} isHeld - Whether the die is held (not re-rolled)
 */

/**
 * @typedef {Object} ScoreCard
 * @property {number} [ones] - Score for ones
 * @property {number} [twos] - Score for twos
 * @property {number} [threes] - Score for threes
 * @property {number} [fours] - Score for fours
 * @property {number} [fives] - Score for fives
 * @property {number} [sixes] - Score for sixes
 * @property {number} [threeOfAKind] - Score for three of a kind
 * @property {number} [fourOfAKind] - Score for four of a kind
 * @property {number} [fullHouse] - Score for full house
 * @property {number} [smallStraight] - Score for small straight
 * @property {number} [largeStraight] - Score for large straight
 * @property {number} [yahtzee] - Score for yahtzee
 * @property {number} [chance] - Score for chance
 * @property {number} [yahtzeeBonus] - Yahtzee bonus points
 */

/**
 * @typedef {Object} Player
 * @property {number} id - Player ID
 * @property {string} name - Player name
 * @property {ScoreCard} scoreCard - Player's score card
 * @property {boolean} isActive - Whether player is active
 */

/**
 * @typedef {Object} GameState
 * @property {Die[]} dice - Array of dice
 * @property {number} rollsLeft - Number of rolls remaining
 * @property {Player[]} players - Array of players
 * @property {number} currentPlayerIndex - Index of current player
 * @property {number} currentTurn - Current turn number
 * @property {boolean} gameComplete - Whether game is complete
 * @property {boolean} gameStarted - Whether game has started
 */

/**
 * @typedef {'ones'|'twos'|'threes'|'fours'|'fives'|'sixes'|'threeOfAKind'|'fourOfAKind'|'fullHouse'|'smallStraight'|'largeStraight'|'yahtzee'|'chance'} ScoringCategory
 */

// Export empty object for module compatibility
export default {};
