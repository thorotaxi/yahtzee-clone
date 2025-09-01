import express from 'express';
import cors from 'cors';
import { DatabaseManager } from './database/DatabaseManager.js';
import { RemoteGameEngine } from './game/RemoteGameEngine.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'],
  credentials: true
}));
app.use(express.json());

// Initialize database manager
const dbManager = new DatabaseManager();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Yahtzee Server is running' });
});



// Create a new remote game
app.post('/api/games', (req, res) => {
  try {
    const { gameId, creatorName } = req.body;
    
    if (!gameId || !creatorName) {
      return res.status(400).json({ error: 'Game ID and creator name are required' });
    }

    // Create initial game state with creator
    const initialGameState = {
      dice: Array.from({ length: 5 }, () => ({ value: 1, isHeld: false })),
      rollsLeft: 3,
      players: [
        { id: 1, name: creatorName.trim(), scoreCard: {}, isActive: true }
      ],
      currentPlayerIndex: 0,
      currentTurn: 1,
      gameComplete: false,
      gameStarted: false
    };

    // Save to database
    dbManager.createGame(gameId, initialGameState);
    
    res.json({ 
      success: true, 
      gameId,
      message: 'Remote game created successfully' 
    });
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// Get game state
app.get('/api/games/:gameId', (req, res) => {
  try {
    const { gameId } = req.params;
    const gameState = dbManager.loadGame(gameId);
    
    if (!gameState) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    res.json({ success: true, gameState });
  } catch (error) {
    console.error('Error loading game:', error);
    res.status(500).json({ error: 'Failed to load game' });
  }
});

// Join a remote game (add friend)
app.post('/api/games/:gameId/join', (req, res) => {
  
  try {
    const { gameId } = req.params;
    const { friendName } = req.body;
    
    if (!friendName) {
      return res.status(400).json({ error: 'Friend name is required' });
    }

    // Load existing game
    const existingGameState = dbManager.loadGame(gameId);
    
    if (!existingGameState) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Add friend to the game - friend should be player 0 (first player)
    const updatedGameState = {
      ...existingGameState,
      players: [
        { id: 1, name: friendName.trim(), scoreCard: {}, isActive: true },
        ...existingGameState.players
      ],
      gameStarted: true,
      currentPlayerIndex: 0, // Friend goes first (as player 0)
      currentTurn: 1 // Start at turn 1
    };

    // Update database
    try {
      dbManager.updateGame(gameId, updatedGameState);
    } catch (dbError) {
      console.error('Database update error:', dbError);
      throw dbError;
    }
    
    res.json({ 
      success: true, 
      gameState: updatedGameState,
      message: 'Friend joined successfully' 
    });
  } catch (error) {
    console.error('Error joining game:', error);
    res.status(500).json({ 
      error: 'Failed to join game',
      details: error.message,
      stack: error.stack
    });
  }
});

// Handle dice roll action
app.post('/api/games/:gameId/roll', (req, res) => {
  
  try {
    const { gameId } = req.params;
    const { unheldDiceIndices, finalDiceValues } = req.body;
    
    // Load current game state
    const currentGameState = dbManager.loadGame(gameId);
    if (!currentGameState) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Update dice values and rolls left
    const updatedGameState = {
      ...currentGameState,
      dice: currentGameState.dice.map((die, index) => ({
        ...die,
        value: finalDiceValues[index] || die.value
      })),
      rollsLeft: currentGameState.rollsLeft - 1
    };
    
    // Update database
    dbManager.updateGame(gameId, updatedGameState);
    
    res.json({ 
      success: true, 
      gameState: updatedGameState,
      message: 'Dice rolled successfully' 
    });
  } catch (error) {
    console.error('Error rolling dice:', error);
    res.status(500).json({ 
      error: 'Failed to roll dice',
      details: error.message,
      stack: error.stack
    });
  }
});

// Handle toggle die hold action
app.post('/api/games/:gameId/toggle-hold', (req, res) => {
  
  try {
    const { gameId } = req.params;
    const { dieIndex } = req.body;
    
    // Load current game state
    const currentGameState = dbManager.loadGame(gameId);
    if (!currentGameState) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Toggle the die hold state
    const updatedGameState = {
      ...currentGameState,
      dice: currentGameState.dice.map((die, index) => 
        index === dieIndex 
          ? { ...die, isHeld: !die.isHeld }
          : die
      )
    };
    
    // Update database
    dbManager.updateGame(gameId, updatedGameState);
    
    res.json({ 
      success: true, 
      gameState: updatedGameState,
      message: 'Die hold toggled successfully' 
    });
  } catch (error) {
    console.error('Error toggling die hold:', error);
    res.status(500).json({ 
      error: 'Failed to toggle die hold',
      details: error.message,
      stack: error.stack
    });
  }
});

// Handle score category action
app.post('/api/games/:gameId/score', (req, res) => {
  try {
    const { gameId } = req.params;
    const { category } = req.body;
    
    console.log(`Scoring category ${category} for game ${gameId}`);
    
    // Load current game state
    const currentGameState = dbManager.loadGame(gameId);
    if (!currentGameState) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    console.log('Current game state:', JSON.stringify(currentGameState, null, 2));
    
    // Use the RemoteGameEngine to handle scoring logic
    const remoteEngine = new RemoteGameEngine(gameId, dbManager);
    
    // Score the category
    const updatedGameState = remoteEngine.scoreCategory(category);
    
    console.log('Updated game state:', JSON.stringify(updatedGameState, null, 2));
    
    // Update database
    dbManager.updateGame(gameId, updatedGameState);
    res.json({ 
      success: true, 
      gameState: updatedGameState,
      message: 'Category scored successfully' 
    });
  } catch (error) {
    console.error('Error scoring category:', error);
    console.error('Error stack:', error.stack);
    console.error('Game ID:', req.params.gameId);
    console.error('Category:', req.body.category);
    res.status(500).json({ 
      error: 'Failed to score category',
      details: error.message,
      stack: error.stack
    });
  }
});

// Handle play again action
app.post('/api/games/:gameId/play-again', (req, res) => {
  
  try {
    const { gameId } = req.params;
    
    // Load current game state
    const currentGameState = dbManager.loadGame(gameId);
    if (!currentGameState) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Get the previous game result before starting new game
    const gameHistory = dbManager.getGameHistory(gameId);
    const previousGameResult = gameHistory.length > 0 ? gameHistory[gameHistory.length - 1] : null;
    
    // Load the existing engine to preserve game number
    const remoteEngine = new RemoteGameEngine(gameId, dbManager);
    
    // Start a new game with the same players (this will increment game number)
    const playerNames = currentGameState.players.map(p => p.name);
    const updatedGameState = remoteEngine.startGame(playerNames.length, playerNames);
    
    // Update database
    dbManager.updateGame(gameId, updatedGameState);
    
    res.json({ 
      success: true, 
      gameState: updatedGameState,
      previousGameResult: previousGameResult ? {
        winner: previousGameResult.winner,
        winnerScore: previousGameResult.winnerScore,
        loser: previousGameResult.players.find(p => p.name !== previousGameResult.winner)?.name || 'Unknown',
        loserScore: previousGameResult.players.find(p => p.name !== previousGameResult.winner)?.score || 0
      } : null,
      message: 'New game started successfully' 
    });
  } catch (error) {
    console.error('Error starting new game:', error);
    res.status(500).json({ 
      error: 'Failed to start new game',
      details: error.message,
      stack: error.stack
    });
  }
});

// Update game state (for game actions)
app.put('/api/games/:gameId', (req, res) => {
  try {
    const { gameId } = req.params;
    const { gameState } = req.body;
    
    if (!gameState) {
      return res.status(400).json({ error: 'Game state is required' });
    }

    // Update database
    dbManager.updateGame(gameId, gameState);
    
    res.json({ 
      success: true, 
      message: 'Game state updated successfully' 
    });
  } catch (error) {
    console.error('Error updating game:', error);
    res.status(500).json({ error: 'Failed to update game' });
  }
});

// Get game history
app.get('/api/games/:gameId/history', (req, res) => {
  try {
    const { gameId } = req.params;
    const history = dbManager.getGameHistory(gameId);
    
    res.json({ success: true, history });
  } catch (error) {
    console.error('Error loading game history:', error);
    res.status(500).json({ error: 'Failed to load game history' });
  }
});

// Clean up old games (5-day inactivity)
app.delete('/api/games/cleanup', (req, res) => {
  try {
    const deletedCount = dbManager.cleanupOldGames();
    res.json({ 
      success: true, 
      deletedCount,
      message: `Cleaned up ${deletedCount} old games` 
    });
  } catch (error) {
    console.error('Error cleaning up games:', error);
    res.status(500).json({ error: 'Failed to clean up games' });
  }
});

// Clear all games from database
app.delete('/api/games/clear-all', (req, res) => {
  try {
    const deletedCount = dbManager.clearAllGames();
    res.json({ 
      success: true, 
      deletedCount,
      message: `Cleared all games: ${deletedCount} games removed` 
    });
  } catch (error) {
    console.error('Error clearing all games:', error);
    res.status(500).json({ error: 'Failed to clear all games' });
  }
});

// Set up file logging (disabled for now)
// import fs from 'fs';
// const logToFile = (message) => {
//   const timestamp = new Date().toISOString();
//   const logMessage = `[${timestamp}] ${message}\n`;
//   fs.appendFileSync('server.log', logMessage);
// };

// Replace console.log with our logging function (disabled for now)
// const originalConsoleLog = console.log;
// console.log = (...args) => {
//   const message = args.join(' ');
//   logToFile(message);
//   originalConsoleLog(...args);
// };

// Set up daily cleanup (runs every 24 hours)
const setupDailyCleanup = () => {
  const cleanup = () => {
    try {
      const deletedCount = dbManager.cleanupOldGames();
      console.log(`🧹 Daily cleanup completed: ${deletedCount} old games removed`);
    } catch (error) {
      console.error('Error during daily cleanup:', error);
    }
  };

  // Run cleanup every 24 hours (24 * 60 * 60 * 1000 milliseconds)
  setInterval(cleanup, 24 * 60 * 60 * 1000);
  
  // Run initial cleanup after 1 hour to avoid running immediately on startup
  setTimeout(cleanup, 60 * 60 * 1000);
  
  console.log('🗓️ Daily cleanup scheduled (runs every 24 hours)');
};

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Yahtzee Server running on port ${PORT}`);
  
  // Set up daily cleanup
  setupDailyCleanup();
});
