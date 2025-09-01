import { DatabaseManager } from './DatabaseManager';
import { RemoteGameEngine } from '../game/RemoteGameEngine';
import { LocalGameEngine } from '../game/LocalGameEngine';

/**
 * Test utility to verify database setup and engine consistency
 */
export class DatabaseTester {
  private dbManager: DatabaseManager;

  constructor() {
    this.dbManager = new DatabaseManager('test_yahtzee.db');
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Database Tests...\n');

    try {
      await this.testDatabaseCreation();
      await this.testGameStateConsistency();
      await this.testGameOperations();
      await this.testHistoryTracking();
      
      console.log('✅ All tests passed! Database setup is working correctly.\n');
    } catch (error) {
      console.error('❌ Test failed:', error);
    } finally {
      this.cleanup();
    }
  }

  /**
   * Test basic database creation and schema
   */
  private async testDatabaseCreation(): Promise<void> {
    console.log('📊 Testing database creation...');
    
    // Test that we can create a game
    const testGameId = 'test-game-123';
    const testState = {
      dice: Array.from({ length: 5 }, () => ({ value: 1, isHeld: false })),
      rollsLeft: 3,
      players: [
        { id: 1, name: 'Alice', scoreCard: {}, isActive: true },
        { id: 2, name: 'Bob', scoreCard: {}, isActive: true }
      ],
      currentPlayerIndex: 0,
      currentTurn: 1,
      gameComplete: false,
      gameStarted: true
    };

    this.dbManager.createGame(testGameId, testState);
    
    // Verify game exists
    const exists = this.dbManager.gameExists(testGameId);
    if (!exists) {
      throw new Error('Game was not created successfully');
    }

    // Verify we can load the game
    const loadedState = this.dbManager.loadGame(testGameId);
    if (!loadedState) {
      throw new Error('Could not load created game');
    }

    // Verify state matches
    if (loadedState.players.length !== testState.players.length) {
      throw new Error('Player count mismatch');
    }

    console.log('✅ Database creation test passed');
  }

  /**
   * Test that RemoteGameEngine produces same results as LocalGameEngine
   */
  private async testGameStateConsistency(): Promise<void> {
    console.log('🔄 Testing engine consistency...');
    
    const localEngine = new LocalGameEngine();
    const remoteEngine = new RemoteGameEngine('consistency-test', this.dbManager);
    
    // Start games with same parameters
    const playerCount = 2;
    const playerNames = ['Player 1', 'Player 2'];
    
    const localState = localEngine.startGame(playerCount, playerNames);
    const remoteState = remoteEngine.startGame(playerCount, playerNames);
    
    // Compare key properties
    const compareProperties = ['rollsLeft', 'currentPlayerIndex', 'currentTurn', 'gameComplete', 'gameStarted'];
    
    for (const prop of compareProperties) {
      if (localState[prop as keyof typeof localState] !== remoteState[prop as keyof typeof remoteState]) {
        throw new Error(`State mismatch on property: ${prop}`);
      }
    }
    
    // Compare players
    if (localState.players.length !== remoteState.players.length) {
      throw new Error('Player count mismatch between engines');
    }
    
    for (let i = 0; i < localState.players.length; i++) {
      if (localState.players[i].name !== remoteState.players[i].name) {
        throw new Error(`Player name mismatch at index ${i}`);
      }
    }
    
    console.log('✅ Engine consistency test passed');
  }

  /**
   * Test game operations (roll, hold, score)
   */
  private async testGameOperations(): Promise<void> {
    console.log('🎲 Testing game operations...');
    
    const remoteEngine = new RemoteGameEngine('operations-test', this.dbManager);
    remoteEngine.startGame(1, ['Test Player']);
    
    // Test roll dice
    const stateAfterRoll = remoteEngine.rollDice();
    if (stateAfterRoll.rollsLeft !== 2) {
      throw new Error('Rolls left not decremented correctly');
    }
    
    // Test hold dice
    const stateAfterHold = remoteEngine.toggleDieHold(0);
    if (!stateAfterHold.dice[0].isHeld) {
      throw new Error('Die hold not working');
    }
    
    // Test scoring
    const stateAfterScore = remoteEngine.scoreCategory('ones');
    if (stateAfterScore.players[0].scoreCard.ones === undefined) {
      throw new Error('Score not recorded');
    }
    
    console.log('✅ Game operations test passed');
  }

  /**
   * Test history tracking
   */
  private async testHistoryTracking(): Promise<void> {
    console.log('📚 Testing history tracking...');
    
    const remoteEngine = new RemoteGameEngine('history-test', this.dbManager);
    remoteEngine.startGame(2, ['Alice', 'Bob']);
    
    // Complete a game by scoring all categories
    const categories = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes', 
                       'threeOfAKind', 'fourOfAKind', 'fullHouse', 'smallStraight', 
                       'largeStraight', 'yahtzee', 'chance'];
    
    for (const category of categories) {
      remoteEngine.scoreCategory(category as any);
    }
    
    // Check if game is complete
    const finalState = remoteEngine.getState();
    if (!finalState.gameComplete) {
      throw new Error('Game should be complete after scoring all categories');
    }
    
    // Check history
    const history = remoteEngine.getGameHistory();
    if (history.length === 0) {
      throw new Error('Game history not recorded');
    }
    
    console.log('✅ History tracking test passed');
  }

  /**
   * Clean up test data
   */
  private cleanup(): void {
    try {
      this.dbManager.close();
    } catch (error) {
      console.warn('Warning: Could not close database:', error);
    }
  }
}

// Export a simple test runner
export function runDatabaseTests(): void {
  const tester = new DatabaseTester();
  tester.runAllTests();
}
