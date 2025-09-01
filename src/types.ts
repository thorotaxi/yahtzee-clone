// Define the scoring categories
export type ScoringCategory = 
  | 'ones' | 'twos' | 'threes' | 'fours' | 'fives' | 'sixes'  // Upper section
  | 'threeOfAKind' | 'fourOfAKind' | 'fullHouse' | 'smallStraight' | 'largeStraight' | 'yahtzee' | 'chance'; // Lower section

// Define a single die
export interface Die {
  value: number;  // 1-6
  isHeld: boolean; // Whether the die is held (not re-rolled)
}

// Define the score card
export interface ScoreCard {
  ones?: number;
  twos?: number;
  threes?: number;
  fours?: number;
  fives?: number;
  sixes?: number;
  threeOfAKind?: number;
  fourOfAKind?: number;
  fullHouse?: number;
  smallStraight?: number;
  largeStraight?: number;
  yahtzee?: number;
  chance?: number;
  yahtzeeBonus?: number; // Track Yahtzee bonus points
}

// Define a player
export interface Player {
  id: number;
  name: string;
  scoreCard: ScoreCard;
  isActive: boolean;
}

// Define the game state
export interface GameState {
  dice: Die[];
  rollsLeft: number;
  players: Player[];
  currentPlayerIndex: number;
  currentTurn: number;
  gameComplete: boolean;
  gameStarted: boolean;
  gameNumber?: number; // For remote games
}

// Define game history result
export interface GameHistoryResult {
  gameNumber: number;
  winner: string;
  winnerScore: number;
  totalPlayers: number;
  completedAt: string;
  players: { name: string; score: number; }[];
  isTie?: boolean;
  tiedPlayers?: { name: string; score: number; }[];
  tieScore?: number;
}
