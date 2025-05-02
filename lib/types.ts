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
  lastMove: string // Keep if used
  lastMoveQuality: string // Keep if used
  evaluation: string // Keep if used
  bestMove: string // Keep if used
  lastPositions: string[] // Keep if used
  goodMovesCount: number // Keep if used by simulated analysis
  greatMovesCount: number // Keep if used by simulated analysis
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

/**
 * Represents the analysis result from the Stockfish API.
 * Structure might need adjustment based on the specific API implementation.
 */
export interface StockfishAnalysis {
  success: boolean
  evaluation: number | null // CP score (e.g., 1.23) or large number for mate (e.g., 999)
  mate: number | null // Mate in X moves (e.g., 3 or -2)
  bestmove: string // Best move in UCI format (e.g., "e2e4")
  continuation?: string // Optional: Sequence of moves following best move
  // requestedFen?: string; // Optional: FEN that was requested (added client-side if needed)
  error?: string // Optional: Error message if success is false
}

export interface MoveAnalysis {
  move: string; // SAN format
  evaluation?: number; // Optional evaluation score
  mate?: number; // Optional mate-in-X score
  bestMove?: string; // Best move in SAN format
  quality?: "brilliant" | "great" | "good" | "inaccuracy" | "mistake" | "blunder" | "best";
}

// Add this new interface
export interface HighlightedMove {
  gameUrl: string;
  moveIndex: number; // Index in the game's history array
  moveSan: string; // The move played (e.g., "Nf3")
  fenBefore: string; // FEN string of the board *before* the move
  fenAfter: string; // FEN string of the board *after* the move is made
  // Removed evalBefore, mateBefore, evalAfter, mateAfter
  bestMoveEval: number | null; // Evaluation after the *best* move from fenBefore
  bestMoveMate: number | null; // Mate-in-X after the *best* move from fenBefore
  quality: "brilliant" | "great";
  // Add opponent info for easier access in the frontend
  whiteUsername: string;
  blackUsername: string;
}

// Updated PlayerData
export interface PlayerData {
  username: string;
  blitzRating: number | null; // Add blitz rating (nullable if fetch fails)
  winRate: number; // Keep existing fields
  averageOpponentRating: number;
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  // Replace simulated counts with actual analysis results
  totalGreatMoves: number; // Total across analyzed games
  totalBrilliantMoves: number; // Total across analyzed games
  recentGamesAnalysis: AnalyzedGameSummary[]; // Analysis results for the last 5 games
  initialRating?: number; // Add this line
  currentRating: number | null; // Allow null
  levelsCrossed: number; // Add this line
}

// Updated AnalyzedGameSummary
export interface AnalyzedGameSummary {
  gameUrl: string;
  fen: string; // Final FEN from game data
  greatMovesCount: number; // Kept for backward compatibility or quick summary
  brilliantMovesCount: number; // Kept for backward compatibility or quick summary
  highlightedMoves: HighlightedMove[]; // This now includes fenAfter and opponent info
  whiteUsername: string;
  blackUsername: string;
  whiteResult: string;
  blackResult: string;
  endTime: number; // Unix timestamp
}
