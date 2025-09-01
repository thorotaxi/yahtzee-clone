import { useState, useEffect } from 'react'
import './App.css'
import type { GameState, Die, ScoringCategory, Player } from './types'
import { LocalGameEngine } from './game/LocalGameEngine'
import { getPotentialScore, getUpperTotal, getUpperBonus, getLowerTotal, getTotalScore, isCategoryUsed } from './game/gameLogic'



function App() {
  const [gameEngine] = useState(() => new LocalGameEngine());
  const [gameState, setGameState] = useState<GameState>(gameEngine.getState());
  const [playerCount, setPlayerCount] = useState(1);
  const [playerNames, setPlayerNames] = useState(['Player 1']);
  const [gameMode, setGameMode] = useState<'local' | 'remote'>('local');
  const [isRolling, setIsRolling] = useState(false);
  const [rollingDice, setRollingDice] = useState<number[]>([]);
  
  // Remote game state
  const [remoteGameId, setRemoteGameId] = useState<string | null>(null);
  const [remotePlayerType, setRemotePlayerType] = useState<'creator' | 'friend' | null>(null);
  const [isJoiningRemoteGame, setIsJoiningRemoteGame] = useState(false);
  // Test features - hidden for production
  // const [forceYahtzee, setForceYahtzee] = useState(false);

  // Join a remote game (for invited friend)
  const joinRemoteGame = (friendName: string) => {
    if (!remoteGameId || !friendName.trim()) {
      alert('Please enter your name to join the game.');
      return;
    }

    // For now, show a placeholder - database integration will be implemented on server side
    alert(`Joining remote game ${remoteGameId} as ${friendName}. Database integration will be implemented when we add the server-side API.`);
    
    // TODO: 
    // 1. Load game from database using remoteGameId
    // 2. Add friend's name to the game
    // 3. Set up RemoteGameEngine
    // 4. Start game with friend going first
  };

  // Start the game
  const startGame = () => {
    if (gameMode === 'local') {
      const newState = gameEngine.startGame(playerCount, playerNames);
      setGameState(newState);
      
      // Reset rolling state
      setIsRolling(false);
      setRollingDice([]);
    } else {
      // Remote game creation
      if (!playerNames[0] || playerNames[0].trim() === '') {
        alert('Please enter your name to create a remote game.');
        return;
      }
      
      // Generate unique game ID
      const gameId = generateGameId();
      
      // Create invite text with both links (database integration will be implemented on server side)
      const creatorName = playerNames[0].trim();
      const baseUrl = window.location.origin;
      const creatorGameId = `${gameId}_creator`;
      const friendGameId = `${gameId}_friend`;
      const creatorLink = `${baseUrl}?game=${creatorGameId}`;
      const friendLink = `${baseUrl}?game=${friendGameId}`;
      
      const inviteText = `${creatorName} has challenged you to a game of Yahtzee.

Your personal link is: ${friendLink}
${creatorName}'s link is: ${creatorLink}

Be sure to click your own link. Either of you can return to this message to resume your game at any time.`;

      // Copy to clipboard and show to user
      navigator.clipboard.writeText(inviteText).then(() => {
        alert(`Remote game created! The invite text has been copied to your clipboard. You can paste it into a text message or email to your friend.

Game ID: ${gameId}
Creator: ${creatorName}

The invite text includes both links - make sure your friend clicks their own link!

Note: Database integration will be implemented when we add the server-side API.`);
      }).catch(() => {
        // Fallback if clipboard API fails
        prompt('Copy this invite text and send it to your friend:', inviteText);
      });
    }
  };

  // Generate a unique game ID
  const generateGameId = (): string => {
    return 'game_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
  };

  // Check for URL parameters on app load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('game');

    if (gameId) {
      // Extract the base game ID and player type from the game ID
      const isCreator = gameId.endsWith('_creator');
      const isFriend = gameId.endsWith('_friend');
      
      if (isCreator || isFriend) {
        const baseGameId = gameId.replace(/_creator$|_friend$/, '');
        const playerType = isCreator ? 'creator' : 'friend';
        
        setRemoteGameId(baseGameId);
        setRemotePlayerType(playerType);
        setIsJoiningRemoteGame(true);
        setGameMode('remote');
      }
    }
  }, []);

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
              ? { ...die, value: Math.floor(Math.random() * 6) + 1 }
              : die
          )
        }));
        
        // Stop animation and set final values
        if (currentIteration >= iterations) {
          clearInterval(animationInterval);
          setIsRolling(false);
          setRollingDice([]);
          
          // Test features - hidden for production
          // if (forceYahtzee) {
          //   // Force Yahtzee mode: manually update state with all 2s
          //   setGameState(prev => ({
          //     ...prev,
          //     dice: prev.dice.map((die, index) => 
          //       unheldDiceIndices.includes(index) 
          //         ? { ...die, value: 2 }
          //         : die
          //     ),
          //     rollsLeft: prev.rollsLeft - 1
          //   }));
          // } else {
            // Normal mode: use the engine to roll dice
            const newState = gameEngine.rollDice();
            setGameState(newState);
          // }
        }
      }, interval);
    }
  };

  // Toggle whether a die is held
  const toggleDieHold = (index: number) => {
    const newState = gameEngine.toggleDieHold(index);
    setGameState(newState);
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
    const newState = gameEngine.scoreCategory(category);
    setGameState(newState);
    
    // Reset rolling state
    setIsRolling(false);
    setRollingDice([]);
  };

  // Get potential score for category (using the shared utility)
  const getPotentialScoreForCategory = (category: ScoringCategory) => {
    return getPotentialScore(gameState, category);
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

  // Handle play again
  const handlePlayAgain = () => {
    const newState = gameEngine.startGame(playerCount, playerNames);
    setGameState(newState);
    setIsRolling(false);
    setRollingDice([]);
  };

  // Handle start from scratch
  const handleStartFromScratch = () => {
    // Reset game history
    gameEngine.resetHistory();
    
    // Reset all local state to initial values
    setPlayerCount(1);
    setPlayerNames(['Player 1']);
    // setForceYahtzee(false);
    setIsRolling(false);
    setRollingDice([]);
    
    // Reset game state to initial setup state
    const initialState = gameEngine.getState();
    const resetState = {
      ...initialState,
      gameStarted: false,
      players: [],
      currentPlayerIndex: 0,
      currentTurn: 1,
      gameComplete: false
    };
    
    gameEngine.updateState(resetState);
    setGameState(resetState);
  };

  // Quick test mode - fill in most categories for testing (hidden for production)
  // const enableQuickTestMode = () => {
  //   // Create a test game state with most categories filled
  //   const testPlayers = gameState.players.map((player) => {
  //     const testScoreCard: Partial<Record<ScoringCategory, number>> & { yahtzeeBonus?: number } = {};
  //     
  //     // Fill in all categories except 'chance' with reasonable test scores
  //     const categories: ScoringCategory[] = [
  //       'ones', 'twos', 'threes', 'fours', 'fives', 'sixes',
  //       'threeOfAKind', 'fourOfAKind', 'fullHouse', 'smallStraight', 'largeStraight', 'yahtzee'
  //     ];
  //     
  //     categories.forEach((category) => {
  //       // Generate varied but realistic scores
  //       let score = 0;
  //       switch (category) {
  //         case 'ones': score = Math.floor(Math.random() * 5) + 1; break;
  //         case 'twos': score = Math.floor(Math.random() * 10) + 2; break;
  //         case 'threes': score = Math.floor(Math.random() * 15) + 3; break;
  //         case 'fours': score = Math.floor(Math.random() * 20) + 4; break;
  //         case 'fives': score = Math.floor(Math.random() * 25) + 5; break;
  //         case 'sixes': score = Math.floor(Math.random() * 30) + 6; break;
  //         case 'threeOfAKind': score = Math.floor(Math.random() * 15) + 15; break;
  //         case 'fourOfAKind': score = Math.floor(Math.random() * 20) + 20; break;
  //         case 'fullHouse': score = 25; break;
  //         case 'smallStraight': score = 30; break;
  //         case 'largeStraight': score = 40; break;
  //         case 'yahtzee': score = Math.random() > 0.5 ? 50 : 0; break;
  //       }
  //       testScoreCard[category] = score;
  //     });
  //     
  //     // Add some Yahtzee bonuses for variety
  //     if ((testScoreCard.yahtzee ?? 0) > 0 && Math.random() > 0.7) {
  //       testScoreCard.yahtzeeBonus = Math.floor(Math.random() * 3) * 100;
  //     }
  //     
  //     return {
  //       ...player,
  //       scoreCard: testScoreCard
  //     };
  //   });
  //   
  //   // Set to final turn with current player having one category left
  //   const newState = {
  //     ...gameState,
  //     players: testPlayers,
  //     currentTurn: 13,
  //     currentPlayerIndex: 0,
  //     rollsLeft: 3,
  //     dice: Array.from({ length: 5 }, () => ({ value: 1, isHeld: false }))
  //   };
  //   
  //   // Update both the local state and the engine state
  //   gameEngine.updateState(newState);
  //   setGameState(newState);
  // };

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

  const handleGameModeChange = (mode: 'local' | 'remote') => {
    setGameMode(mode);
    if (mode === 'remote') {
      // Remote mode: creator enters their name, invited player enters theirs later
      setPlayerCount(1);
      setPlayerNames(['']);
    } else {
      // Local mode can have 1-4 players, default to 1
      setPlayerCount(1);
      setPlayerNames(['Player 1']);
    }
  };



    // Remote game joining screen
  if (isJoiningRemoteGame) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(to bottom, #15803d, #14532d)', 
        color: 'white', 
        padding: '2rem',
        fontFamily: '"Georgia", "Times New Roman", serif'
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 'bold', 
            textAlign: 'center', 
            marginBottom: '2rem', 
            color: '#fbbf24',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
            fontFamily: '"Georgia", "Times New Roman", serif'
          }}>
            🎲 Yahtzee Challenge
          </h1>

          <div style={{ 
            backgroundColor: 'rgba(255,255,255,0.1)', 
            padding: '2rem', 
            borderRadius: '0.75rem',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
          }}>
            {remotePlayerType === 'creator' ? (
              // Creator's view - waiting for friend to join
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 'bold', 
                  marginBottom: '1rem',
                  color: '#fbbf24'
                }}>
                  Waiting for your friend to join...
                </h2>
                <p style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>
                  You've created a remote Yahtzee game.
                </p>
                <p style={{ fontSize: '0.9rem', color: '#d1d5db' }}>
                  Game ID: {remoteGameId}
                </p>
                <div style={{ 
                  marginTop: '2rem', 
                  padding: '1rem', 
                  backgroundColor: 'rgba(251, 191, 36, 0.1)', 
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(251, 191, 36, 0.3)'
                }}>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>
                    Your friend needs to click their invite link to join the game.
                  </p>
                </div>
              </div>
            ) : (
              // Friend's view - enter name to join
              <div>
                <h2 style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 'bold', 
                  marginBottom: '1rem',
                  textAlign: 'center',
                  color: '#fbbf24'
                }}>
                  Join the Game
                </h2>
                <p style={{ marginBottom: '1.5rem', textAlign: 'center', fontSize: '1.1rem' }}>
                  You've been invited to play Yahtzee!
                </p>
                
                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ 
                    display: 'block',
                    fontWeight: '500',
                    marginBottom: '0.5rem',
                    fontSize: '1rem'
                  }}>
                    Your Name:
                  </label>
                  <input
                    type="text"
                    value={playerNames[0] || ''}
                    onChange={(e) => handlePlayerNameChange(0, e.target.value)}
                    style={{ 
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #d1d5db',
                      fontSize: '1rem',
                      fontFamily: '"Georgia", "Times New Roman", serif',
                      backgroundColor: 'white',
                      color: '#1f2937'
                    }}
                    placeholder="Enter your name"
                  />
                </div>

                <div style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => joinRemoteGame(playerNames[0])}
                    style={{ 
                      backgroundColor: '#fbbf24',
                      padding: '1rem 2rem',
                      borderRadius: '0.5rem',
                      fontWeight: '600',
                      fontSize: '1.25rem',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      fontFamily: '"Georgia", "Times New Roman", serif',
                      color: '#1f2937'
                    }}
                  >
                    🎲 Join Game
                  </button>
                </div>

                <div style={{ 
                  marginTop: '1rem', 
                  fontSize: '0.75rem',
                  color: '#9ca3af',
                  textAlign: 'center'
                }}>
                  Game ID: {remoteGameId}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

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

            {/* Game Mode Selection */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button
                  onClick={() => handleGameModeChange('local')}
                  style={{ 
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.5rem',
                    fontWeight: '600',
                    fontSize: '1.125rem',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: gameMode === 'local' ? '#fbbf24' : '#6b7280',
                    color: gameMode === 'local' ? '#1f2937' : 'white',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    fontFamily: '"Georgia", "Times New Roman", serif'
                  }}
                >
                  🏠 Local Game
                </button>
                <button
                  onClick={() => handleGameModeChange('remote')}
                  style={{ 
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.5rem',
                    fontWeight: '600',
                    fontSize: '1.125rem',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: gameMode === 'remote' ? '#fbbf24' : '#6b7280',
                    color: gameMode === 'remote' ? '#1f2937' : 'white',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    fontFamily: '"Georgia", "Times New Roman", serif'
                  }}
                >
                  🌐 Challenge Your Friend
                </button>
              </div>
              {gameMode === 'remote' && (
                <div style={{ 
                  marginTop: '1rem', 
                  fontSize: '0.875rem',
                  color: 'white',
                  textAlign: 'center'
                }}>
                  <strong>Remote Game:</strong> Create a game that can be played with a friend over the internet. 
                  Click "Create & Copy Invite" to copy the invite to your clipboard.
                </div>
              )}
            </div>

            {/* Player Count Selection - Only for Local Mode */}
            {gameMode === 'local' && (
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
            )}

            {/* Player Names */}
            <div style={{ marginBottom: '2rem' }}>
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
                      {gameMode === 'remote' ? 'Your Name:' : `Player ${i + 1}:`}
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
                      placeholder={gameMode === 'remote' ? 'Enter your name' : `Player ${i + 1}`}
                    />
                  </div>
                ))}
              </div>
              {gameMode === 'remote' && (
                <div style={{ 
                  fontSize: '0.75rem',
                  color: '#9ca3af',
                  textAlign: 'center',
                  marginTop: '0.5rem'
                }}>
                  (Your friend will enter their own name when they accept your challenge)
                </div>
              )}

            </div>

            {/* Start Game Button */}
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={startGame}
                style={{ 
                  backgroundColor: '#fbbf24',
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
                {gameMode === 'local' ? '🎲 Start Game' : '🌐 Create & Copy Invite'}
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

            {/* Game History */}
            {gameEngine.getGameHistory().length > 0 && (
              <div style={{ 
                backgroundColor: 'rgba(251, 191, 36, 0.1)', 
                padding: '1.5rem', 
                borderRadius: '0.5rem', 
                marginBottom: '2rem',
                border: '1px solid rgba(251, 191, 36, 0.3)'
              }}>
                <h3 style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: 'bold', 
                  color: '#fbbf24', 
                  marginBottom: '1rem',
                  textAlign: 'center',
                  fontFamily: '"Georgia", "Times New Roman", serif'
                }}>
                  📜 Session History:
                </h3>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {gameEngine.getGameHistory().map((result, index) => (
                    <div key={index} style={{ 
                      fontSize: '0.875rem', 
                      color: 'white', 
                      padding: '0.5rem',
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      borderRadius: '0.25rem',
                      fontFamily: '"Georgia", "Times New Roman", serif'
                    }}>
                      <strong>GAME {result.gameNumber}:</strong> {result.winner} ({result.players.find(p => p.name === result.winner)?.score}) beat {result.players.filter(p => p.name !== result.winner).map(p => `${p.name} (${p.score})`).join(' and ')}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ textAlign: 'center', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={handlePlayAgain}
                style={{ 
                  backgroundColor: '#fbbf24',
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
                🎲 Play Again
              </button>
              <button
                onClick={handleStartFromScratch}
                style={{ 
                  backgroundColor: '#dc2626',
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
                🆕 Start From Scratch
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
                  backgroundColor: (gameState.rollsLeft === 0 || isRolling) ? '#6b7280' : '#fbbf24',
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
            
            {/* Test Features - Hidden for production
            {gameState.gameStarted && !gameState.gameComplete && (
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <button
                    onClick={() => setForceYahtzee(!forceYahtzee)}
                    style={{
                      backgroundColor: forceYahtzee ? '#dc2626' : '#7c3aed',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.25rem',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      fontFamily: '"Georgia", "Times New Roman", serif',
                      marginRight: '0.5rem'
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
                
                <div>
                  <button
                    onClick={enableQuickTestMode}
                    style={{
                      backgroundColor: '#7c3aed',
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
                    🧪 Quick Test Mode
                  </button>
                  <p style={{ 
                    fontSize: '0.75rem', 
                    color: '#fbbf24', 
                    marginTop: '0.5rem',
                    fontStyle: 'italic',
                    fontFamily: '"Georgia", "Times New Roman", serif'
                  }}>
                    Fill most categories to test game completion
                  </p>
                </div>
              </div>
            )}
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
                           {isActivePlayer && !isCategoryUsed(displayPlayer, category) && getPotentialScoreForCategory(category) !== null && (
                             <span style={{ 
                               fontSize: '0.75rem', 
                               color: '#d97706', 
                               backgroundColor: '#fef3c7', 
                               padding: '0.125rem 0.25rem', 
                               borderRadius: '0.125rem',
                               fontFamily: '"Georgia", "Times New Roman", serif'
                             }}>
                               ({getPotentialScoreForCategory(category)})
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
                                    return category === upperCategory ? '#fbbf24' : '#d97706';
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
                                      return '#fbbf24';
                                    }
                                  } else {
                                    // If neither 3-of-a-Kind nor 4-of-a-Kind is available, then highlight other Lower Section categories
                                    const validJokerCategories: ScoringCategory[] = ['fullHouse', 'smallStraight', 'largeStraight', 'chance'];
                                    const isValidJokerCategory = validJokerCategories.includes(category as ScoringCategory) && isCategoryAvailable(displayPlayer, category);
                                    if (isValidJokerCategory) {
                                      return '#fbbf24';
                                    }
                                    
                                    // If no Lower Section categories are available, highlight Upper Section categories (except the dice value category)
                                    const upperCategories = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
                                    const isValidUpperCategory = upperCategories.includes(category as ScoringCategory) && 
                                                                isCategoryAvailable(player, category) && 
                                                                category !== upperCategory;
                                    if (isValidUpperCategory) {
                                      return '#fbbf24';
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
                           {isActivePlayer && !isCategoryUsed(displayPlayer, key) && getPotentialScoreForCategory(key) !== null && (
                             <span style={{ 
                               fontSize: '0.75rem', 
                               color: '#d97706', 
                               backgroundColor: '#fef3c7', 
                               padding: '0.125rem 0.25rem', 
                               borderRadius: '0.125rem',
                               fontFamily: '"Georgia", "Times New Roman", serif'
                             }}>
                               ({getPotentialScoreForCategory(key)})
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
                                      return '#fbbf24';
                                    }
                                  } else {
                                    // If neither 3-of-a-Kind nor 4-of-a-Kind is available, then highlight other Lower Section categories
                                    const validJokerCategories = ['fullHouse', 'smallStraight', 'largeStraight', 'chance'];
                                    const isValidJokerCategory = validJokerCategories.includes(key) && isCategoryAvailable(displayPlayer, key);
                                    if (isValidJokerCategory) {
                                      return '#fbbf24';
                                    }
                                    
                                    // If no Lower Section categories are available, highlight Upper Section categories (except the dice value category)
                                    const upperCategories = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
                                    const isValidUpperCategory = upperCategories.includes(key) && 
                                                                isCategoryAvailable(player, key) && 
                                                                key !== upperCategory;
                                    if (isValidUpperCategory) {
                                      return '#fbbf24';
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fbbf24' }}>
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
                               color: '#fbbf24', 
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
