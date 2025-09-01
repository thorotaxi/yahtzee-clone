// Game logic utilities for Yahtzee

/**
 * Create a new die with placeholder value (will be rolled on first roll)
 */
export const createDie = () => ({
  value: 1, // Start with 1, will be rolled on first roll
  isHeld: false
});

/**
 * Create a new player
 */
export const createPlayer = (id, name) => ({
  id,
  name,
  scoreCard: {},
  isActive: true
});

/**
 * Initialize a new game state
 */
export const initializeGame = (playerCount, playerNames) => {
  const state = {
    dice: Array.from({ length: 5 }, createDie),
    rollsLeft: 3,
    players: Array.from({ length: playerCount }, (_, i) => 
      createPlayer(i + 1, playerNames[i] || `Player ${i + 1}`)
    ),
    currentPlayerIndex: 0,
    currentTurn: 1,
    gameComplete: false,
    gameStarted: true
  };
  return state;
};

/**
 * Calculate score for a given category and dice
 */
export const calculateScore = (dice, category) => {
  const values = dice.map(d => d.value);
  const counts = new Array(7).fill(0);
  values.forEach(v => counts[v]++);

  switch (category) {
    // Upper section
    case 'ones': return values.filter(v => v === 1).length * 1;
    case 'twos': return values.filter(v => v === 2).length * 2;
    case 'threes': return values.filter(v => v === 3).length * 3;
    case 'fours': return values.filter(v => v === 4).length * 4;
    case 'fives': return values.filter(v => v === 5).length * 5;
    case 'sixes': return values.filter(v => v === 6).length * 6;
    
    // Lower section
    case 'threeOfAKind': return counts.some(c => c >= 3) ? values.reduce((a, b) => a + b, 0) : 0;
    case 'fourOfAKind': return counts.some(c => c >= 4) ? values.reduce((a, b) => a + b, 0) : 0;
    case 'fullHouse': {
      const hasThree = counts.some(c => c === 3);
      const hasTwo = counts.some(c => c === 2);
      return (hasThree && hasTwo) ? 25 : 0;
    }
    case 'smallStraight': {
      const sorted = [...new Set(values)].sort();
      for (let i = 0; i <= sorted.length - 4; i++) {
        if (sorted[i+3] - sorted[i] === 3) return 30;
      }
      return 0;
    }
    case 'largeStraight': {
      const sorted = [...new Set(values)].sort();
      return (sorted.length === 5 && sorted[4] - sorted[0] === 4) ? 40 : 0;
    }
    case 'yahtzee': return counts.some(c => c === 5) ? 50 : 0;
    case 'chance': return values.reduce((a, b) => a + b, 0);
    default: return 0;
  }
};

/**
 * Check if current dice form a Yahtzee
 */
export const isYahtzee = (dice) => {
  const values = dice.map(d => d.value);
  return values.every(v => v === values[0]);
};

/**
 * Check if a category is available for scoring
 */
export const isCategoryAvailable = (player, category) => {
  return player.scoreCard[category] === undefined;
};

/**
 * Get the dice total for joker scoring
 */
export const getDiceTotal = (dice) => {
  return dice.reduce((sum, die) => sum + die.value, 0);
};

/**
 * Check if Yahtzee bonus should be available
 */
export const shouldShowYahtzeeBonus = (gameState) => {
  if (gameState.rollsLeft === 3) return false;
  
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const hasYahtzee = isYahtzee(gameState.dice);
  const yahtzeeAlreadyScored = currentPlayer.scoreCard.yahtzee !== undefined;
  
  return hasYahtzee && yahtzeeAlreadyScored;
};

/**
 * Get potential score for a category (for display purposes)
 */
export const getPotentialScore = (gameState, category) => {
  if (gameState.rollsLeft === 3) return null;
  
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  
  // If category is already used, no potential score
  if (!isCategoryAvailable(currentPlayer, category)) return null;
  
  // For joker Yahtzee, show appropriate scores
  if (shouldShowYahtzeeBonus(gameState)) {
    const diceValue = gameState.dice[0].value;
    const diceTotal = getDiceTotal(gameState.dice);
    const upperCategory = `${diceValue === 1 ? 'ones' : diceValue === 2 ? 'twos' : diceValue === 3 ? 'threes' : diceValue === 4 ? 'fours' : diceValue === 5 ? 'fives' : 'sixes'}`;
    
    if (category === upperCategory) {
      return diceTotal; // Upper section gets dice total
    } else if (['threeOfAKind', 'fourOfAKind', 'chance'].includes(category)) {
      return diceTotal; // These categories get dice total
    } else if (category === 'fullHouse') {
      return 25; // Full House gets 25
    } else if (category === 'smallStraight') {
      return 30; // Small Straight gets 30
    } else if (category === 'largeStraight') {
      return 40; // Large Straight gets 40
    } else {
      // Upper section fallback gets 0
      return 0;
    }
  }
  
  // Normal scoring
  return calculateScore(gameState.dice, category);
};

/**
 * Calculate upper section total for a player
 */
export const getUpperTotal = (player) => {
  const upperCategories = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
  return upperCategories.reduce((total, cat) => total + (player.scoreCard[cat] || 0), 0);
};

/**
 * Calculate upper section bonus (35 points for 63+ total)
 */
export const getUpperBonus = (player) => {
  return getUpperTotal(player) >= 63 ? 35 : 0;
};

/**
 * Calculate lower section total for a player
 */
export const getLowerTotal = (player) => {
  const lowerCategories = ['threeOfAKind', 'fourOfAKind', 'fullHouse', 'smallStraight', 'largeStraight', 'yahtzee', 'chance'];
  return lowerCategories.reduce((total, cat) => total + (player.scoreCard[cat] || 0), 0);
};

/**
 * Calculate total score for a player
 */
export const getTotalScore = (player) => {
  return getUpperTotal(player) + getUpperBonus(player) + getLowerTotal(player) + (player.scoreCard.yahtzeeBonus || 0);
};

/**
 * Check if a category is used by a player
 */
export const isCategoryUsed = (player, category) => {
  return player.scoreCard[category] !== undefined;
};

/**
 * Check if the game is complete
 */
export const isGameComplete = (gameState) => {
  return gameState.players.every(player => {
    const allCategories = [
      'ones', 'twos', 'threes', 'fours', 'fives', 'sixes',
      'threeOfAKind', 'fourOfAKind', 'fullHouse', 'smallStraight', 'largeStraight', 'yahtzee', 'chance'
    ];
    return allCategories.every(category => player.scoreCard[category] !== undefined);
  });
};

/**
 * Get the winner of the game
 */
export const getWinner = (gameState) => {
  if (!gameState.players || gameState.players.length === 0) {
    return null;
  }
  
  const players = gameState.players;
  const scores = players.map(player => getTotalScore(player));
  const maxScore = Math.max(...scores);
  const winners = players.filter(player => getTotalScore(player) === maxScore);
  
  // Return null if there's a tie (multiple players with the same highest score)
  return winners.length === 1 ? winners[0] : null;
};

/**
 * Check if the game ended in a tie
 */
export const isGameTied = (gameState) => {
  return getWinner(gameState) === null && gameState.gameComplete;
};

/**
 * Get all players with the highest score (for ties)
 */
export const getTiedPlayers = (gameState) => {
  if (!gameState.players || gameState.players.length === 0) {
    return [];
  }
  
  const scores = gameState.players.map(player => getTotalScore(player));
  const maxScore = Math.max(...scores);
  return gameState.players.filter(player => getTotalScore(player) === maxScore);
};
