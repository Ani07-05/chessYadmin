export interface GameData {
  url: string
  time_control: string
  end_time: number
  white: {
    username: string
    rating: number
    result: string
  }
  black: {
    username: string
    rating: number
    result: string
  }
  lastMove: string
  lastMoveQuality: string
  evaluation: string
  bestMove: string
  lastPositions: string[]
  goodMovesCount: number
  greatMovesCount: number
}

export interface ChessComGame {
  url: string
  pgn: string
  time_control: string
  end_time: number
  rated: boolean
  accuracies?: {
    white: number
    black: number
  }
  fen: string
  time_class: string
  rules: string
  white: {
    rating: number
    result: string
    username: string
  }
  black: {
    rating: number
    result: string
    username: string
  }
}

export interface StockfishAnalysis {
  success: boolean
  evaluation: number
  bestmove: string // Changed from 'best' to 'bestmove'
  mate?: number | null
  continuation: string
}

export interface MoveAnalysis {
  gameUrl: string | URL
  move: string
  quality: string
  fen: string
}

// Update PlayerData to make totalGreatMoves nullable
export interface PlayerData {
  username: string;
  blitzRating: number | null; // Added: Current Blitz rating
  levelsCrossed: number; // Keep for now, maybe base on blitzRating later?
  totalGreatMoves: number | null; // Changed to nullable
  currentLevel: number; // Keep for now, maybe base on blitzRating later?
  todoForNextLevel: string; // Keep example text
  puzzlePoints: number;
  targetRating: number; // Keep for now, maybe base on blitzRating later?
  targetPuzzlePoints: number;
  targetGreatMoves: number; // Keep example target
  requirements: {
    elo: boolean;
    puzzlePoints: boolean;
    greatMoves: boolean; // Keep example check
  };
  // Array to hold analysis summary for recent games
  recentGamesAnalysis: AnalyzedGameSummary[];
}

// Update AnalyzedGameSummary for basic display before analysis
export interface AnalyzedGameSummary {
  gameUrl: string;
  fen: string; // Keep final FEN for potential display
  greatMovesCount: number; // Renamed back from bestMovesCount
  brilliantMovesCount: number; // Keep, will be 0 initially
  // Add basic game info
  whiteUsername: string;
  blackUsername: string;
  whiteResult: string;
  blackResult: string;
  endTime: number; // Unix timestamp
}
