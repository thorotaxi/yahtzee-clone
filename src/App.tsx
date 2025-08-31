import { useState } from 'react'
import './App.css'
import type { GameState, Die, ScoringCategory, Player } from './types'

// Initialize a new die
const createDie = (): Die => ({
  value: Math.floor(Math.random() * 6) + 1,
  isHeld: false
});

// Initialize a new player
const createPlayer = (id: number, name: string): Player => ({
  id,
  name,
  scoreCard: {},
  isActive: true
});

// Initialize the game state
const initializeGame = (playerCount: number): GameState => ({
  dice: Array.from({ length: 5 }, createDie),
  rollsLeft: 3,
  players: Array.from({ length: playerCount }, (_, i) => createPlayer(i + 1, `Player ${i + 1}`)),
  currentPlayerIndex: 0,
  currentTurn: 1,
  gameComplete: false,
  gameStarted: false
});

// Scoring functions
const calculateScore = (dice: Die[], category: ScoringCategory): number => {
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

function App() {
  const [gameState, setGameState] = useState<GameState>(initializeGame(1));
  const [playerCount, setPlayerCount] = useState(1);
  const [playerNames, setPlayerNames] = useState(['Player 1']);
  const [isRolling, setIsRolling] = useState(false);
  const [rollingDice, setRollingDice] = useState<number[]>([]);
  const [forceYahtzee] = useState(false);

  // Start the game
  const startGame = () => {
    const players = Array.from({ length: playerCount }, (_, i) => 
      createPlayer(i + 1, playerNames[i] || `Player ${i + 1}`)
    );
    
    setGameState(prev => ({
      ...prev,
      players,
      gameStarted: true,
      currentPlayerIndex: 0,
      currentTurn: 1,
      rollsLeft: 3,
      dice: Array.from({ length: 5 }, () => ({ value: 1, isHeld: false }))
    }));
    
    // Reset rolling state
    setIsRolling(false);
    setRollingDice([]);
  };

  // Roll the dice (only unheld dice)
  const rollDice = () => {
    if (gameState.rollsLeft > 0 && !isRolling) {
      // Start rolling animation
      setIsRolling(true);
      
      // Get indices of unheld dice
      const unheldDiceIndices = gameState.dice
        .map((die, index) => die.isHeld ? -1 : index)
        .filter(index => index !== -1);
      
      setRollingDice(unheldDiceIndices);
      
      // Animate for 0.75 seconds
      const animationDuration = 750;
      const interval = 80; // Change values every 80ms for smoother animation
      const iterations = animationDuration / interval;
      let currentIteration = 0;
      
      const animationInterval = setInterval(() => {
        currentIteration++;
        
        // Update rolling dice with random values (or forced Yahtzee)
        setGameState(prev => ({
          ...prev,
          dice: prev.dice.map((die, index) => 
            unheldDiceIndices.includes(index) 
              ? { ...die, value: forceYahtzee ? 2 : Math.floor(Math.random() * 6) + 1 }
              : die
          )
        }));
        
        // Stop animation and set final values
        if (currentIteration >= iterations) {
          clearInterval(animationInterval);
          setIsRolling(false);
          setRollingDice([]);
          
          // Set final random values (or forced Yahtzee)
          setGameState(prev => ({
            ...prev,
            dice: prev.dice.map(die => 
              die.isHeld ? die : { ...die, value: forceYahtzee ? 2 : Math.floor(Math.random() * 6) + 1 }
            ),
            rollsLeft: prev.rollsLeft - 1
          }));
        }
      }, interval);
    }
  };

  // Toggle whether a die is held
  const toggleDieHold = (index: number) => {
    setGameState(prev => ({
      ...prev,
      dice: prev.dice.map((die, i) => 
        i === index ? { ...die, isHeld: !die.isHeld } : die
      )
    }));
  };

  // Check if current dice form a Yahtzee
  const isYahtzee = (dice: Die[]): boolean => {
    const values = dice.map(d => d.value);
    return values.every(v => v === values[0]);
  };

  // Check if a category is available for scoring
  const isCategoryAvailable = (player: Player, category: ScoringCategory): boolean => {
    return player.scoreCard[category] === undefined;
  };



  // Get the dice total for joker scoring
  const getDiceTotal = (dice: Die[]): number => {
    return dice.reduce((sum, die) => sum + die.value, 0);
  };



  // Check if Yahtzee bonus should be available
  const shouldShowYahtzeeBonus = (): boolean => {
    if (gameState.rollsLeft === 3 || isRolling) return false;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const hasYahtzee = isYahtzee(gameState.dice);
    const yahtzeeAlreadyScored = currentPlayer.scoreCard.yahtzee !== undefined;
    
    // Show bonus if we have a Yahtzee and the Yahtzee category has already been scored (including zero)
    return hasYahtzee && yahtzeeAlreadyScored;
  };

  // Score a category for current player
  const scoreCategory = (category: ScoringCategory) => {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const hasYahtzee = isYahtzee(gameState.dice);
    const yahtzeeAlreadyScored = currentPlayer.scoreCard.yahtzee !== undefined;
    
    let score = calculateScore(gameState.dice, category);
    let yahtzeeBonus = currentPlayer.scoreCard.yahtzeeBonus || 0;
    
    // Handle Yahtzee bonus and joker rules
    if (hasYahtzee && yahtzeeAlreadyScored) {
      // This is a subsequent Yahtzee (joker)
      
      
      // Check if this is a valid category for joker scoring with proper priority
      const upperCategory = `${gameState.dice[0].value === 1 ? 'ones' : gameState.dice[0].value === 2 ? 'twos' : gameState.dice[0].value === 3 ? 'threes' : gameState.dice[0].value === 4 ? 'fours' : gameState.dice[0].value === 5 ? 'fives' : 'sixes'}` as ScoringCategory;
      
      // Priority 1: Upper Section if available
      if (isCategoryAvailable(currentPlayer, upperCategory)) {
        if (category !== upperCategory) {
          console.warn(`Joker Yahtzee must be scored in Upper Section ${upperCategory}, not ${category}`);
          return; // Don't allow scoring in wrong category
        }
      } else {
        // Priority 2: Lower Section categories only if Upper Section is filled
        // First priority: 3-of-a-Kind or 4-of-a-Kind (if either is available)
        const threeOfAKindAvailable = isCategoryAvailable(currentPlayer, 'threeOfAKind');
        const fourOfAKindAvailable = isCategoryAvailable(currentPlayer, 'fourOfAKind');
        
        if (threeOfAKindAvailable || fourOfAKindAvailable) {
          // Only allow 3-of-a-Kind or 4-of-a-Kind
          const isValidJokerCategory = (category === 'threeOfAKind' && threeOfAKindAvailable) || 
                                       (category === 'fourOfAKind' && fourOfAKindAvailable);
          
          if (!isValidJokerCategory) {
            console.warn(`Joker Yahtzee must be scored in 3-of-a-Kind or 4-of-a-Kind when available, not ${category}`);
            return; // Don't allow scoring in wrong category
          }
        } else {
          // If neither 3-of-a-Kind nor 4-of-a-Kind is available, then allow other Lower Section categories
          const validJokerCategories = ['fullHouse', 'smallStraight', 'largeStraight', 'chance'];
          const isValidJokerCategory = validJokerCategories.includes(category) && isCategoryAvailable(currentPlayer, category);
          
          if (!isValidJokerCategory) {
            // If no Lower Section categories are available, allow Upper Section categories (except the dice value category)
            const upperCategories = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
            const isValidUpperCategory = upperCategories.includes(category) && 
                                        isCategoryAvailable(currentPlayer, category) && 
                                        category !== upperCategory;
            
            if (!isValidUpperCategory) {
              console.warn(`Invalid category for joker Yahtzee: ${category}`);
              return; // Don't allow scoring in invalid category
            }
          }
        }
      }
      
      // Score the appropriate value in the chosen category
      if (category === 'fullHouse') {
        score = 25; // Full House is always worth 25
      } else if (category === 'smallStraight') {
        score = 30; // Small Straight is always worth 30
      } else if (category === 'largeStraight') {
        score = 40; // Large Straight is always worth 40
      } else if (category === 'ones' || category === 'twos' || category === 'threes' || category === 'fours' || category === 'fives' || category === 'sixes') {
        // Check if this is the required Upper Section category (priority 1) or fallback (priority 4)
        if (category === upperCategory) {
          score = getDiceTotal(gameState.dice); // Required Upper Section gets dice total
        } else {
          score = 0; // Fallback Upper Section gets zero
        }
      } else {
        score = getDiceTotal(gameState.dice); // 3-of-a-Kind, 4-of-a-Kind, and Chance use dice total
      }
      
      // Add bonus if original Yahtzee was scored with points
      if ((currentPlayer.scoreCard.yahtzee ?? 0) > 0) {
        yahtzeeBonus += 100;
      }
      // Note: If original Yahtzee was scored as zero, no bonus is given
    } else if (category === 'yahtzee') {
      // This is the first Yahtzee being scored
      score = hasYahtzee ? 50 : 0;
    }
    
    // Update player's score card
    const updatedPlayer = {
      ...currentPlayer,
      scoreCard: {
        ...currentPlayer.scoreCard,
        [category]: score,
        yahtzeeBonus: yahtzeeBonus
      }
    };

    // Determine next player
    const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    const nextTurn = nextPlayerIndex === 0 ? gameState.currentTurn + 1 : gameState.currentTurn;
    const gameComplete = nextTurn > 13;

    setGameState(prev => ({
      ...prev,
      players: prev.players.map((player, i) => 
        i === gameState.currentPlayerIndex ? updatedPlayer : player
      ),
      currentPlayerIndex: nextPlayerIndex,
      currentTurn: nextTurn,
      rollsLeft: 3,
      dice: Array.from({ length: 5 }, () => ({ value: 1, isHeld: false })),
      gameComplete
    }));
    
    // Reset rolling state for new turn
    setIsRolling(false);
    setRollingDice([]);
  };

  // Calculate upper section total for a player
  const getUpperTotal = (player: Player) => {
    const upperCategories = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'] as const;
    return upperCategories.reduce((total, cat) => total + (player.scoreCard[cat] || 0), 0);
  };

  // Calculate lower section total for a player
  const getLowerTotal = (player: Player) => {
    const lowerCategories = ['threeOfAKind', 'fourOfAKind', 'fullHouse', 'smallStraight', 'largeStraight', 'yahtzee', 'chance'] as const;
    return lowerCategories.reduce((total, cat) => total + (player.scoreCard[cat] || 0), 0);
  };

  // Check if upper section gets bonus for a player
  const getUpperBonus = (player: Player) => {
    const upperTotal = getUpperTotal(player);
    return upperTotal >= 63 ? 35 : 0;
  };

  // Get total score for a player
  const getTotalScore = (player: Player) => {
    return getUpperTotal(player) + getUpperBonus(player) + getLowerTotal(player) + (player.scoreCard.yahtzeeBonus || 0);
  };

  // Check if category is used for a player
  const isCategoryUsed = (player: Player, category: ScoringCategory) => {
    return player.scoreCard[category] !== undefined;
  };

  // Get potential score for category
  const getPotentialScore = (category: ScoringCategory) => {
    // Don't show potential scores if dice haven't been rolled yet or if dice are currently rolling
    if (gameState.rollsLeft === 3 || isRolling) {
      return null;
    }
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const hasYahtzee = isYahtzee(gameState.dice);
    const yahtzeeAlreadyScored = currentPlayer.scoreCard.yahtzee !== undefined;
    
    // For joker Yahtzee, show potential score for valid categories
    if (hasYahtzee && yahtzeeAlreadyScored) {
      const upperCategory = `${gameState.dice[0].value === 1 ? 'ones' : gameState.dice[0].value === 2 ? 'twos' : gameState.dice[0].value === 3 ? 'threes' : gameState.dice[0].value === 4 ? 'fours' : gameState.dice[0].value === 5 ? 'fives' : 'sixes'}` as ScoringCategory;
      
      // Priority 1: Upper Section if available
      if (isCategoryAvailable(currentPlayer, upperCategory)) {
        return category === upperCategory ? getDiceTotal(gameState.dice) : null;
      }
      
      // Priority 2: Lower Section categories only if Upper Section is filled
      // First priority: 3-of-a-Kind or 4-of-a-Kind (if either is available)
      const threeOfAKindAvailable = isCategoryAvailable(currentPlayer, 'threeOfAKind');
      const fourOfAKindAvailable = isCategoryAvailable(currentPlayer, 'fourOfAKind');
      
      if (threeOfAKindAvailable || fourOfAKindAvailable) {
        // Only allow 3-of-a-Kind or 4-of-a-Kind
        const isValidJokerCategory = (category === 'threeOfAKind' && threeOfAKindAvailable) || 
                                     (category === 'fourOfAKind' && fourOfAKindAvailable);
        if (!isValidJokerCategory) {
          return null; // Don't show potential scores for invalid categories
        }
      } else {
        // If neither 3-of-a-Kind nor 4-of-a-Kind is available, then allow other Lower Section categories
        const validJokerCategories = ['fullHouse', 'smallStraight', 'largeStraight', 'chance'];
        const isValidJokerCategory = validJokerCategories.includes(category) && isCategoryAvailable(currentPlayer, category);
        
        if (!isValidJokerCategory) {
          // If no Lower Section categories are available, allow Upper Section categories (except the dice value category)
          const upperCategories = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
          const isValidUpperCategory = upperCategories.includes(category) && 
                                      isCategoryAvailable(currentPlayer, category) && 
                                      category !== upperCategory;
          
          if (isValidUpperCategory) {
            return 0; // Score as zero in Upper Section fallback
          }
          
          return null; // Don't show potential scores for invalid categories
        }
      }
      
      // For valid Lower Section categories, show appropriate score
      if (category === 'fullHouse') {
        return 25; // Full House is always worth 25
      } else if (category === 'smallStraight') {
        return 30; // Small Straight is always worth 30
      } else if (category === 'largeStraight') {
        return 40; // Large Straight is always worth 40
      } else {
        return getDiceTotal(gameState.dice); // 3-of-a-Kind, 4-of-a-Kind, and Chance use dice total
      }
    }
    
    return calculateScore(gameState.dice, category);
  };

  // Get winner
  const getWinner = () => {
    if (!gameState.gameComplete) return null;
    return gameState.players.reduce((winner, player) => {
      const playerScore = getTotalScore(player);
      const winnerScore = winner ? getTotalScore(winner) : 0;
      return playerScore > winnerScore ? player : winner;
    }, null as Player | null);
  };

  // Handle player count change
  const handlePlayerCountChange = (count: number) => {
    setPlayerCount(count);
    const newNames = Array.from({ length: count }, (_, i) => 
      playerNames[i] || `Player ${i + 1}`
    );
    setPlayerNames(newNames);
  };

  // Handle player name change
  const handlePlayerNameChange = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  // Game setup screen
  if (!gameState.gameStarted) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(to bottom, #15803d, #14532d)', 
        color: 'white', 
        padding: '2rem',
        fontFamily: '"Georgia", "Times New Roman", serif'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ 
            fontSize: '3rem', 
            fontWeight: 'bold', 
            textAlign: 'center', 
            marginBottom: '2rem', 
            color: '#fbbf24',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
            fontFamily: '"Georgia", "Times New Roman", serif'
          }}>
            🎲 Yahtzee Clone 🎲
          </h1>

          <div style={{ 
            backgroundColor: 'rgba(255,255,255,0.1)', 
            padding: '2rem', 
            borderRadius: '0.75rem',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold', 
              marginBottom: '1.5rem', 
              textAlign: 'center',
              color: '#fbbf24',
              fontFamily: '"Georgia", "Times New Roman", serif'
            }}>
              Game Setup
            </h2>

            {/* Player Count Selection */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ 
                fontSize: '1.25rem', 
                fontWeight: 'bold', 
                marginBottom: '1rem',
                fontFamily: '"Georgia", "Times New Roman", serif'
              }}>
                Number of Players:
              </h3>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                {[1, 2, 3, 4].map(count => (
                  <button
                    key={count}
                    onClick={() => handlePlayerCountChange(count)}
                    style={{ 
                      padding: '0.75rem 1.5rem',
                      borderRadius: '0.5rem',
                      fontWeight: '600',
                      fontSize: '1.125rem',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: playerCount === count ? '#fbbf24' : '#6b7280',
                      color: playerCount === count ? '#1f2937' : 'white',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      fontFamily: '"Georgia", "Times New Roman", serif'
                    }}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {/* Player Names */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ 
                fontSize: '1.25rem', 
                fontWeight: 'bold', 
                marginBottom: '1rem',
                fontFamily: '"Georgia", "Times New Roman", serif'
              }}>
                Player Names:
              </h3>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {Array.from({ length: playerCount }, (_, i) => (
                  <div key={i} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem',
                    flexWrap: 'wrap'
                  }}>
                    <label style={{ 
                      fontWeight: '500',
                      minWidth: '80px',
                      fontFamily: '"Georgia", "Times New Roman", serif'
                    }}>
                      Player {i + 1}:
                    </label>
                    <input
                      type="text"
                      value={playerNames[i] || ''}
                      onChange={(e) => handlePlayerNameChange(i, e.target.value)}
                      style={{ 
                        flex: 1,
                        padding: '0.5rem',
                        borderRadius: '0.25rem',
                        border: '1px solid #d1d5db',
                        fontSize: '1rem',
                        fontFamily: '"Georgia", "Times New Roman", serif'
                      }}
                      placeholder={`Player ${i + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Start Game Button */}
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={startGame}
                style={{ 
                  backgroundColor: '#059669',
                  padding: '1rem 2rem',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  fontSize: '1.25rem',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  fontFamily: '"Georgia", "Times New Roman", serif'
                }}
              >
                🎲 Start Game
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Game completion screen
  if (gameState.gameComplete) {
    const winner = getWinner();
    const sortedPlayers = [...gameState.players].sort((a, b) => getTotalScore(b) - getTotalScore(a));
    
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(to bottom, #15803d, #14532d)', 
        color: 'white', 
        padding: '2rem',
        fontFamily: '"Georgia", "Times New Roman", serif'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ 
            fontSize: '3rem', 
            fontWeight: 'bold', 
            textAlign: 'center', 
            marginBottom: '2rem', 
            color: '#fbbf24',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
            fontFamily: '"Georgia", "Times New Roman", serif'
          }}>
            🏆 Game Complete! 🏆
          </h1>

          <div style={{ 
            backgroundColor: 'rgba(255,255,255,0.1)', 
            padding: '2rem', 
            borderRadius: '0.75rem',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold', 
              marginBottom: '1.5rem', 
              textAlign: 'center',
              color: '#fbbf24',
              fontFamily: '"Georgia", "Times New Roman", serif'
            }}>
              🎉 {winner?.name} Wins! 🎉
            </h2>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                marginBottom: '1rem',
                textAlign: 'center',
                fontFamily: '"Georgia", "Times New Roman", serif'
              }}>
                Final Scores:
              </h3>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {sortedPlayers.map((player, index) => (
                  <div key={player.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '1rem',
                    backgroundColor: index === 0 ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255,255,255,0.05)',
                    borderRadius: '0.5rem',
                    border: index === 0 ? '2px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <span style={{ 
                      fontWeight: '600',
                      fontSize: '1.125rem',
                      fontFamily: '"Georgia", "Times New Roman", serif'
                    }}>
                      {index + 1}. {player.name}
                    </span>
                    <span style={{ 
                      fontWeight: 'bold',
                      fontSize: '1.25rem',
                      color: index === 0 ? '#fbbf24' : 'white',
                      fontFamily: '"Georgia", "Times New Roman", serif'
                    }}>
                      {getTotalScore(player)} points
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => setGameState(initializeGame(1))}
                style={{ 
                  backgroundColor: '#059669',
                  padding: '1rem 2rem',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  fontSize: '1.25rem',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  fontFamily: '"Georgia", "Times New Roman", serif'
                }}
              >
                🎲 New Game
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(to bottom, #15803d, #14532d)', 
      color: 'white', 
      padding: '2rem',
      fontFamily: '"Georgia", "Times New Roman", serif'
    }}>
      <div style={{ 
        maxWidth: '1400px', 
        margin: '0 auto',
        padding: '0 1rem'
      }}>
        <h1 style={{ 
          fontSize: '3rem', 
          fontWeight: 'bold', 
          textAlign: 'center', 
          marginBottom: '2rem', 
          color: '#fbbf24',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
          fontFamily: '"Georgia", "Times New Roman", serif'
        }}>
          🎲 Yahtzee Clone 🎲
        </h1>
        


        <div style={{ 
          display: 'flex', 
          flexDirection: 'row',
          gap: '2rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'flex-start'
        }}>
          {/* Dice Display */}
          <div style={{ 
            backgroundColor: 'rgba(255,255,255,0.1)', 
            padding: '2rem', 
            borderRadius: '0.75rem',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            height: 'fit-content',
            flex: '0 0 400px',
            minWidth: '350px'
          }}>
            {/* Game Status */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <div style={{ fontSize: '1rem', fontWeight: '600' }}>Turn: {gameState.currentTurn}/13</div>
              <div style={{ fontSize: '1rem', fontWeight: '600' }}>Rolls: {gameState.rollsLeft}</div>
              <div style={{ 
                fontSize: '1.125rem', 
                fontWeight: 'bold', 
                color: '#fbbf24',
                backgroundColor: 'rgba(251, 191, 36, 0.2)',
                padding: '0.25rem 0.75rem',
                borderRadius: '0.5rem',
                border: '2px solid #fbbf24'
              }}>
                🎯 {currentPlayer.name}
              </div>
            </div>
            
            <h2 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold', 
              marginBottom: '1rem', 
              textAlign: 'center', 
              color: '#fbbf24',
              fontFamily: '"Georgia", "Times New Roman", serif'
            }}>
              🎲 Dice 🎲
            </h2>
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              justifyContent: 'center', 
              marginBottom: '1rem',
              flexWrap: 'nowrap',
              minHeight: '4rem'
            }}>
              {gameState.dice.map((die, index) => (
                <div 
                  key={index}
                  onClick={() => !isRolling && gameState.rollsLeft < 3 && gameState.rollsLeft > 0 && toggleDieHold(index)}
                  style={{
                    width: '3.5rem',
                    height: '3.5rem',
                    backgroundColor: die.isHeld ? '#fef3c7' : 'white',
                    borderRadius: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                    cursor: (isRolling || gameState.rollsLeft === 3 || gameState.rollsLeft === 0) ? 'not-allowed' : 'pointer',
                    border: die.isHeld ? '4px solid #f59e0b' : '2px solid #d1d5db',
                    boxShadow: die.isHeld 
                      ? '0 8px 16px rgba(245, 158, 11, 0.4), inset 0 2px 4px rgba(255,255,255,0.8)' 
                      : '0 4px 6px rgba(0,0,0,0.1)',
                    transform: die.isHeld ? 'scale(1.1)' : 'scale(1)',
                    transition: 'all 0.3s ease',
                    color: die.isHeld ? '#92400e' : 'black',
                    fontFamily: '"Georgia", "Times New Roman", serif',
                    position: 'relative',
                    animation: rollingDice.includes(index) ? 'roll 0.1s ease-in-out infinite' : 'none',
                    minWidth: '3rem',
                    minHeight: '3rem'
                  }}
                >
                  {gameState.rollsLeft === 3 && die.value === 1 ? (
                    <div style={{
                      fontSize: '2rem',
                      color: '#6b7280',
                      opacity: 0.6
                    }}>
                      🎲
                    </div>
                  ) : (
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      color: die.isHeld ? '#92400e' : '#1f2937',
                      animation: rollingDice.includes(index) ? 'shake 0.1s ease-in-out infinite' : 'none'
                    }}>
                      {die.value}
                    </div>
                  )}
                  {die.isHeld && gameState.rollsLeft < 3 && gameState.rollsLeft > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '-0.5rem',
                      right: '-0.5rem',
                      backgroundColor: '#f59e0b',
                      color: 'white',
                      borderRadius: '50%',
                      width: '1.5rem',
                      height: '1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      border: '2px solid white'
                    }}>
                      🔒
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <button 
                onClick={rollDice}
                disabled={gameState.rollsLeft === 0 || isRolling}
                style={{ 
                  backgroundColor: (gameState.rollsLeft === 0 || isRolling) ? '#6b7280' : '#3b82f6',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  fontSize: '1.125rem',
                  border: 'none',
                  cursor: (gameState.rollsLeft === 0 || isRolling) ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  fontFamily: '"Georgia", "Times New Roman", serif',
                  marginBottom: '1rem'
                }}
              >
                {isRolling ? '🎲 Rolling...' : '🎲 Roll Dice'}
              </button>
            </div>
            
            <p style={{ textAlign: 'center', fontSize: '1rem', color: '#e5e7eb', fontFamily: '"Georgia", "Times New Roman", serif' }}>
              {gameState.rollsLeft === 3 ? 'Roll dice to start your turn' : 
               gameState.rollsLeft === 0 ? 'Select a category to score' :
               'Click dice to hold/unhold them • Held dice are highlighted with 🔒'}
            </p>
            
            {/* Temporary Yahtzee Testing Button - Hidden for now
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button
                onClick={() => setForceYahtzee(!forceYahtzee)}
                style={{
                  backgroundColor: forceYahtzee ? '#dc2626' : '#6b7280',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.25rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  fontFamily: '"Georgia", "Times New Roman", serif'
                }}
              >
                {forceYahtzee ? '🎲 Disable Yahtzee Test' : '🎲 Force Yahtzee (All 2s)'}
              </button>
              {forceYahtzee && (
                <p style={{ 
                  fontSize: '0.75rem', 
                  color: '#fbbf24', 
                  marginTop: '0.5rem',
                  fontStyle: 'italic',
                  fontFamily: '"Georgia", "Times New Roman", serif'
                }}>
                  Next roll will result in all 2s (Yahtzee)
                </p>
              )}
            </div>
            */}
          </div>

          {/* Player Score Cards */}
          <div style={{ 
            display: 'grid', 
            gap: '1rem',
            flex: '1 1 400px',
            minWidth: '300px'
          }}>
            {gameState.players.map((player, playerIndex) => {
              // Reorder players so active player is first
              const displayIndex = (playerIndex + gameState.currentPlayerIndex) % gameState.players.length;
              const displayPlayer = gameState.players[displayIndex];
              const isActivePlayer = displayIndex === gameState.currentPlayerIndex;
              
              return (
                              <div key={displayPlayer.id} style={{ 
                  backgroundColor: '#fef3c7', 
                  color: '#1f2937', 
                  padding: '1.5rem', 
                  borderRadius: '0.75rem', 
                  boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                  border: isActivePlayer ? '4px solid #fbbf24' : '4px solid #f59e0b',
                  fontFamily: '"Georgia", "Times New Roman", serif'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '1rem',
                    paddingBottom: '0.5rem',
                    borderBottom: '2px solid #f59e0b'
                  }}>
                    <h3 style={{ 
                      fontSize: '1.5rem', 
                      fontWeight: 'bold', 
                      color: '#92400e',
                      fontFamily: '"Georgia", "Times New Roman", serif'
                    }}>
                      {isActivePlayer ? '🎯 ' : ''}{displayPlayer.name}
                    </h3>
                    <div style={{ 
                      fontSize: '1.25rem', 
                      fontWeight: 'bold', 
                      color: '#059669',
                      fontFamily: '"Georgia", "Times New Roman", serif'
                    }}>
                      Total: {getTotalScore(displayPlayer)}
                    </div>
                  </div>

                {/* Compact Score Display */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                  gap: '1rem' 
                }}>
                  {/* Upper Section */}
                  <div>
                    <h4 style={{ 
                      fontSize: '1rem', 
                      fontWeight: 'bold', 
                      marginBottom: '0.5rem', 
                      color: '#92400e',
                      fontFamily: '"Georgia", "Times New Roman", serif'
                    }}>
                      Upper Section
                    </h4>
                    {(['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'] as const).map(category => (
                      <div key={category} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '0.25rem 0',
                        fontSize: '0.875rem',
                        fontFamily: '"Georgia", "Times New Roman", serif'
                      }}>
                        <span style={{ textTransform: 'capitalize' }}>{category}</span>
                                                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                           {isActivePlayer && !isCategoryUsed(displayPlayer, category) && getPotentialScore(category) !== null && (
                             <span style={{ 
                               fontSize: '0.75rem', 
                               color: '#d97706', 
                               backgroundColor: '#fef3c7', 
                               padding: '0.125rem 0.25rem', 
                               borderRadius: '0.125rem',
                               fontFamily: '"Georgia", "Times New Roman", serif'
                             }}>
                               ({getPotentialScore(category)})
                             </span>
                           )}
                          <button
                            onClick={() => isActivePlayer && scoreCategory(category)}
                                                          disabled={(() => {
                                if (!isActivePlayer || isCategoryUsed(displayPlayer, category) || gameState.rollsLeft === 3) {
                                  return true;
                                }
                                // For joker Yahtzee, enforce priority order
                                if (isActivePlayer && shouldShowYahtzeeBonus()) {
                                const upperCategory = `${gameState.dice[0].value === 1 ? 'ones' : gameState.dice[0].value === 2 ? 'twos' : gameState.dice[0].value === 3 ? 'threes' : gameState.dice[0].value === 4 ? 'fours' : gameState.dice[0].value === 5 ? 'fives' : 'sixes'}` as ScoringCategory;
                                
                                                                  // Priority 1: Upper Section if available
                                  if (isCategoryAvailable(displayPlayer, upperCategory)) {
                                    return category !== upperCategory;
                                  }
                                  
                                  // Priority 2: Lower Section categories only if Upper Section is filled
                                  // First priority: 3-of-a-Kind or 4-of-a-Kind (if either is available)
                                  const threeOfAKindAvailable = isCategoryAvailable(displayPlayer, 'threeOfAKind');
                                  const fourOfAKindAvailable = isCategoryAvailable(displayPlayer, 'fourOfAKind');
                                  
                                  if (threeOfAKindAvailable || fourOfAKindAvailable) {
                                    // Only allow 3-of-a-Kind or 4-of-a-Kind
                                    const isValidJokerCategory = ((category as ScoringCategory) === 'threeOfAKind' && threeOfAKindAvailable) || 
                                                                 ((category as ScoringCategory) === 'fourOfAKind' && fourOfAKindAvailable);
                                    return !isValidJokerCategory;
                                  } else {
                                    // If neither 3-of-a-Kind nor 4-of-a-Kind is available, then allow other Lower Section categories
                                    const validJokerCategories: ScoringCategory[] = ['fullHouse', 'smallStraight', 'largeStraight', 'chance'];
                                    const isValidJokerCategory = validJokerCategories.includes(category as ScoringCategory) && isCategoryAvailable(displayPlayer, category as ScoringCategory);
                                    
                                    if (isValidJokerCategory) {
                                      return false; // Allow scoring
                                    }
                                    
                                    // If no Lower Section categories are available, allow Upper Section categories (except the dice value category)
                                    const upperCategories: ScoringCategory[] = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
                                    const isValidUpperCategory = upperCategories.includes(category as ScoringCategory) && 
                                                                isCategoryAvailable(displayPlayer, category as ScoringCategory) && 
                                                                category !== upperCategory;
                                    
                                    return !isValidUpperCategory;
                                  }
                              }
                              return false;
                            })()}
                            style={{ 
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              fontWeight: '600',
                              minWidth: '40px',
                              border: 'none',
                              cursor: isActivePlayer && !isCategoryUsed(displayPlayer, category) && gameState.rollsLeft !== 3 ? 'pointer' : 'not-allowed',
                                                              backgroundColor: (() => {
                                  if (isCategoryUsed(displayPlayer, category) || !isActivePlayer || gameState.rollsLeft === 3) {
                                    return '#d1d5db';
                                  }
                                  // Highlight valid categories for joker scoring
                                  if (isActivePlayer && shouldShowYahtzeeBonus()) {
                                  const upperCategory = `${gameState.dice[0].value === 1 ? 'ones' : gameState.dice[0].value === 2 ? 'twos' : gameState.dice[0].value === 3 ? 'threes' : gameState.dice[0].value === 4 ? 'fours' : gameState.dice[0].value === 5 ? 'fives' : 'sixes'}` as ScoringCategory;
                                  
                                  // Priority 1: Upper Section if available
                                  if (isCategoryAvailable(displayPlayer, upperCategory)) {
                                    return category === upperCategory ? '#059669' : '#d97706';
                                  }
                                  
                                  // Priority 2: Lower Section categories only if Upper Section is filled
                                  // First priority: 3-of-a-Kind or 4-of-a-Kind (if either is available)
                                  const threeOfAKindAvailable = isCategoryAvailable(displayPlayer, 'threeOfAKind');
                                  const fourOfAKindAvailable = isCategoryAvailable(displayPlayer, 'fourOfAKind');
                                  
                                  if (threeOfAKindAvailable || fourOfAKindAvailable) {
                                    // Only highlight 3-of-a-Kind or 4-of-a-Kind
                                    const isValidJokerCategory = ((category as ScoringCategory) === 'threeOfAKind' && threeOfAKindAvailable) || 
                                                                 ((category as ScoringCategory) === 'fourOfAKind' && fourOfAKindAvailable);
                                    if (isValidJokerCategory) {
                                      return '#059669';
                                    }
                                  } else {
                                    // If neither 3-of-a-Kind nor 4-of-a-Kind is available, then highlight other Lower Section categories
                                    const validJokerCategories: ScoringCategory[] = ['fullHouse', 'smallStraight', 'largeStraight', 'chance'];
                                    const isValidJokerCategory = validJokerCategories.includes(category as ScoringCategory) && isCategoryAvailable(displayPlayer, category);
                                    if (isValidJokerCategory) {
                                      return '#059669';
                                    }
                                    
                                    // If no Lower Section categories are available, highlight Upper Section categories (except the dice value category)
                                    const upperCategories = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
                                    const isValidUpperCategory = upperCategories.includes(category as ScoringCategory) && 
                                                                isCategoryAvailable(player, category) && 
                                                                category !== upperCategory;
                                    if (isValidUpperCategory) {
                                      return '#059669';
                                    }
                                  }
                                }
                                return '#d97706';
                              })(),
                              color: isCategoryUsed(player, category) || playerIndex !== gameState.currentPlayerIndex || gameState.rollsLeft === 3 ? '#6b7280' : 'white',
                              fontSize: '0.75rem',
                              fontFamily: '"Georgia", "Times New Roman", serif'
                            }}
                          >
                            {displayPlayer.scoreCard[category] !== undefined ? displayPlayer.scoreCard[category] : '-'}
                          </button>
                        </div>
                      </div>
                    ))}
                    <div style={{ 
                      borderTop: '1px solid #f59e0b', 
                      marginTop: '0.5rem', 
                      paddingTop: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: 'bold',
                      fontFamily: '"Georgia", "Times New Roman", serif'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Upper Total</span>
                        <span>{getUpperTotal(displayPlayer)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d97706' }}>
                        <span>Bonus (63+)</span>
                        <span>{getUpperBonus(displayPlayer)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Lower Section */}
                  <div>
                    <h4 style={{ 
                      fontSize: '1rem', 
                      fontWeight: 'bold', 
                      marginBottom: '0.5rem', 
                      color: '#92400e',
                      fontFamily: '"Georgia", "Times New Roman", serif'
                    }}>
                      Lower Section
                    </h4>
                    {([
                      { key: 'threeOfAKind' as const, name: '3 of Kind' },
                      { key: 'fourOfAKind' as const, name: '4 of Kind' },
                      { key: 'fullHouse' as const, name: 'Full House' },
                      { key: 'smallStraight' as const, name: 'Sm Straight' },
                      { key: 'largeStraight' as const, name: 'Lg Straight' },
                      { key: 'yahtzee' as const, name: 'Yahtzee' },
                      { key: 'chance' as const, name: 'Chance' }
                    ]).map(({ key, name }) => (
                      <div key={key} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '0.25rem 0',
                        fontSize: '0.875rem',
                        fontFamily: '"Georgia", "Times New Roman", serif'
                      }}>
                        <span>{name}</span>
                                                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                           {isActivePlayer && !isCategoryUsed(displayPlayer, key) && getPotentialScore(key) !== null && (
                             <span style={{ 
                               fontSize: '0.75rem', 
                               color: '#d97706', 
                               backgroundColor: '#fef3c7', 
                               padding: '0.125rem 0.25rem', 
                               borderRadius: '0.125rem',
                               fontFamily: '"Georgia", "Times New Roman", serif'
                             }}>
                               ({getPotentialScore(key)})
                             </span>
                           )}
                          <button
                            onClick={() => isActivePlayer && scoreCategory(key)}
                            disabled={(() => {
                              if (!isActivePlayer || isCategoryUsed(displayPlayer, key) || gameState.rollsLeft === 3) {
                                return true;
                              }
                              // For joker Yahtzee, enforce priority order
                              if (isActivePlayer && shouldShowYahtzeeBonus()) {
                                const upperCategory = `${gameState.dice[0].value === 1 ? 'ones' : gameState.dice[0].value === 2 ? 'twos' : gameState.dice[0].value === 3 ? 'threes' : gameState.dice[0].value === 4 ? 'fours' : gameState.dice[0].value === 5 ? 'fives' : 'sixes'}` as ScoringCategory;
                                
                                // Priority 1: Upper Section if available
                                if (isCategoryAvailable(displayPlayer, upperCategory)) {
                                  return key !== upperCategory;
                                }
                                
                                // Priority 2: Lower Section categories only if Upper Section is filled
                                // First priority: 3-of-a-Kind or 4-of-a-Kind (if either is available)
                                const threeOfAKindAvailable = isCategoryAvailable(displayPlayer, 'threeOfAKind');
                                const fourOfAKindAvailable = isCategoryAvailable(displayPlayer, 'fourOfAKind');
                                
                                if (threeOfAKindAvailable || fourOfAKindAvailable) {
                                  // Only allow 3-of-a-Kind or 4-of-a-Kind
                                  const isValidJokerCategory = (key === 'threeOfAKind' && threeOfAKindAvailable) || 
                                                               (key === 'fourOfAKind' && fourOfAKindAvailable);
                                  return !isValidJokerCategory;
                                } else {
                                  // If neither 3-of-a-Kind nor 4-of-a-Kind is available, then allow other Lower Section categories
                                  const validJokerCategories = ['fullHouse', 'smallStraight', 'largeStraight', 'chance'];
                                  const isValidJokerCategory = validJokerCategories.includes(key) && isCategoryAvailable(displayPlayer, key);
                                  
                                  if (isValidJokerCategory) {
                                    return false; // Allow scoring
                                  }
                                  
                                  // If no Lower Section categories are available, allow Upper Section categories (except the dice value category)
                                  const upperCategories = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
                                  const isValidUpperCategory = upperCategories.includes(key) && 
                                                              isCategoryAvailable(displayPlayer, key) && 
                                                              key !== upperCategory;
                                  
                                  return !isValidUpperCategory;
                                }
                              }
                              return false;
                            })()}
                            style={{ 
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              fontWeight: '600',
                              minWidth: '40px',
                              border: 'none',
                              cursor: isActivePlayer && !isCategoryUsed(displayPlayer, key) && gameState.rollsLeft !== 3 ? 'pointer' : 'not-allowed',
                              backgroundColor: (() => {
                                if (isCategoryUsed(displayPlayer, key) || !isActivePlayer || gameState.rollsLeft === 3) {
                                  return '#d1d5db';
                                }
                                // Highlight valid categories for joker scoring
                                if (isActivePlayer && shouldShowYahtzeeBonus()) {
                                  const upperCategory = `${gameState.dice[0].value === 1 ? 'ones' : gameState.dice[0].value === 2 ? 'twos' : gameState.dice[0].value === 3 ? 'threes' : gameState.dice[0].value === 4 ? 'fours' : gameState.dice[0].value === 5 ? 'fives' : 'sixes'}` as ScoringCategory;
                                  
                                  // Priority 1: Upper Section if available
                                  if (isCategoryAvailable(displayPlayer, upperCategory)) {
                                    return key === upperCategory ? '#059669' : '#d97706';
                                  }
                                  
                                  // Priority 2: Lower Section categories only if Upper Section is filled
                                  // First priority: 3-of-a-Kind or 4-of-a-Kind (if either is available)
                                  const threeOfAKindAvailable = isCategoryAvailable(displayPlayer, 'threeOfAKind');
                                  const fourOfAKindAvailable = isCategoryAvailable(displayPlayer, 'fourOfAKind');
                                  
                                  if (threeOfAKindAvailable || fourOfAKindAvailable) {
                                    // Only highlight 3-of-a-Kind or 4-of-a-Kind
                                    const isValidJokerCategory = (key === 'threeOfAKind' && threeOfAKindAvailable) || 
                                                                 (key === 'fourOfAKind' && fourOfAKindAvailable);
                                    if (isValidJokerCategory) {
                                      return '#059669';
                                    }
                                  } else {
                                    // If neither 3-of-a-Kind nor 4-of-a-Kind is available, then highlight other Lower Section categories
                                    const validJokerCategories = ['fullHouse', 'smallStraight', 'largeStraight', 'chance'];
                                    const isValidJokerCategory = validJokerCategories.includes(key) && isCategoryAvailable(displayPlayer, key);
                                    if (isValidJokerCategory) {
                                      return '#059669';
                                    }
                                    
                                    // If no Lower Section categories are available, highlight Upper Section categories (except the dice value category)
                                    const upperCategories = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
                                    const isValidUpperCategory = upperCategories.includes(key) && 
                                                                isCategoryAvailable(player, key) && 
                                                                key !== upperCategory;
                                    if (isValidUpperCategory) {
                                      return '#059669';
                                    }
                                  }
                                }
                                return '#d97706';
                              })(),
                              color: isCategoryUsed(player, key) || playerIndex !== gameState.currentPlayerIndex || gameState.rollsLeft === 3 ? '#6b7280' : 'white',
                              fontSize: '0.75rem',
                              fontFamily: '"Georgia", "Times New Roman", serif'
                            }}
                                                      >
                              {displayPlayer.scoreCard[key] !== undefined ? displayPlayer.scoreCard[key] : '-'}
                            </button>
                        </div>
                      </div>
                    ))}
                                         <div style={{ 
                       borderTop: '1px solid #f59e0b', 
                       marginTop: '0.5rem', 
                       paddingTop: '0.5rem',
                       fontSize: '0.875rem',
                       fontWeight: 'bold',
                       fontFamily: '"Georgia", "Times New Roman", serif'
                     }}>
                                             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Lower Total</span>
                        <span>{getLowerTotal(displayPlayer)}</span>
                      </div>
                      {(displayPlayer.scoreCard.yahtzeeBonus || 0) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                          <span>Yahtzee Bonus</span>
                          <span>+{displayPlayer.scoreCard.yahtzeeBonus}</span>
                        </div>
                      )}
                     </div>
                   </div>

                   {/* Yahtzee Joker Section */}
                   {isActivePlayer && shouldShowYahtzeeBonus() && (
                     <div style={{ 
                       gridColumn: '1 / -1',
                       marginTop: '1rem',
                       padding: '0.75rem',
                       backgroundColor: '#fef3c7',
                       borderRadius: '0.5rem',
                       border: '2px solid #f59e0b',
                       wordWrap: 'break-word'
                     }}>
                       <div style={{ 
                         display: 'flex', 
                         justifyContent: 'space-between', 
                         alignItems: 'center',
                         marginBottom: '0.5rem',
                         flexWrap: 'wrap',
                         gap: '0.5rem'
                       }}>
                         <h4 style={{ 
                           fontSize: '1rem', 
                           fontWeight: 'bold', 
                           color: '#92400e',
                           fontFamily: '"Georgia", "Times New Roman", serif'
                         }}>
                           🎲 Yahtzee Joker Rules Apply
                         </h4>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                           {(displayPlayer.scoreCard.yahtzee ?? 0) > 0 && (
                             <span style={{ 
                               fontSize: '0.75rem', 
                               color: '#059669', 
                               backgroundColor: '#ecfdf5', 
                               padding: '0.125rem 0.25rem', 
                               borderRadius: '0.125rem',
                               fontFamily: '"Georgia", "Times New Roman", serif'
                             }}>
                               (+100 bonus)
                             </span>
                           )}
                         </div>
                       </div>
                                                <div style={{ 
                           fontSize: '0.75rem', 
                           color: '#92400e', 
                           fontStyle: 'italic',
                           fontFamily: '"Georgia", "Times New Roman", serif'
                         }}>
                           {(() => {
                             const diceValue = gameState.dice[0].value;
                         
                             const upperCategory = `${diceValue === 1 ? 'ones' : diceValue === 2 ? 'twos' : diceValue === 3 ? 'threes' : diceValue === 4 ? 'fours' : diceValue === 5 ? 'fives' : 'sixes'}` as ScoringCategory;
                             
                             // Check what options are available
                             const upperAvailable = isCategoryAvailable(displayPlayer, upperCategory);
                             const threeOfAKindAvailable = isCategoryAvailable(displayPlayer, 'threeOfAKind');
                             const fourOfAKindAvailable = isCategoryAvailable(displayPlayer, 'fourOfAKind');
                             
                             let guidance = '';
                             if (upperAvailable) {
                               const categoryName = diceValue === 1 ? 'Ones' : diceValue === 2 ? 'Twos' : diceValue === 3 ? 'Threes' : diceValue === 4 ? 'Fours' : diceValue === 5 ? 'Fives' : 'Sixes';
                               guidance = `Score ${getDiceTotal(gameState.dice)} points in ${categoryName}.`;
                             } else if (threeOfAKindAvailable && fourOfAKindAvailable) {
                               guidance = `Score ${getDiceTotal(gameState.dice)} points in either Three of a Kind or Four of a Kind.`;
                             } else if (threeOfAKindAvailable) {
                               guidance = `Score ${getDiceTotal(gameState.dice)} points in Three of a Kind.`;
                             } else if (fourOfAKindAvailable) {
                               guidance = `Score ${getDiceTotal(gameState.dice)} points in Four of a Kind.`;
                                                           } else {
                                guidance = `Score in an available Lower Section category (Full House=25, Small Straight=30, Large Straight=40, Chance=dice total) or Upper Section category (scored as zero).`;
                              }
                             
                             return `${guidance} ${(displayPlayer.scoreCard.yahtzee ?? 0) > 0 ? 'You will also receive 100 bonus points!' : 'No bonus points (original Yahtzee was scored as zero).'}`;
                           })()}
                         </div>
                     </div>
                   )}
                 </div>
               </div>
             );
           })}
           </div>
         </div>
       </div>
     </div>
   )
 }

export default App
