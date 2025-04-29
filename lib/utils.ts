import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Chess } from "chess.js"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function extractFenPositionsFromPgn(pgn: string): string[] {
  try {
    const chess = new Chess()
    chess.loadPgn(pgn)

    // Get the history of moves
    const history = chess.history({ verbose: true })

    // Reset the board to start position
    chess.reset()

    // We want the last 7 positions, so calculate how many moves to skip
    const totalMoves = history.length
    const startIndex = Math.max(0, totalMoves - 7)

    // Collect FEN positions for the last 7 moves
    const positions: string[] = []

    // Play through the moves up to startIndex
    for (let i = 0; i < startIndex; i++) {
      chess.move(history[i])
    }

    // Now collect the FEN for each of the last 7 positions
    for (let i = startIndex; i < totalMoves; i++) {
      chess.move(history[i])
      positions.push(chess.fen())
    }

    return positions
  } catch (error) {
    console.error("Error extracting FEN positions:", error)
    return []
  }
}

export function extractLastMove(pgn: string): string {
  try {
    const chess = new Chess()
    chess.loadPgn(pgn)

    const history = chess.history()
    return history[history.length - 1] || ""
  } catch (error) {
    console.error("Error extracting last move:", error)
    return ""
  }
}

export function analyzeMovesInGame(pgn: string): {
  goodMovesCount: number
  greatMovesCount: number
  lastMoveQuality: string
} {
  try {
    const chess = new Chess()
    chess.loadPgn(pgn)

    // In a real implementation, you would analyze each position with Stockfish
    // and determine the quality of each move

    // For now, we'll simulate the analysis
    const history = chess.history()
    const totalMoves = history.length

    // Simulate analysis results
    const goodMovesCount = Math.floor(totalMoves * 0.3) // About 30% of moves are "good"
    const greatMovesCount = Math.floor(totalMoves * 0.15) // About 15% of moves are "great"

    // Determine the quality of the last move
    const qualities = ["brilliant", "great", "good", "inaccuracy", "mistake", "blunder"]
    const weights = [0.05, 0.15, 0.4, 0.2, 0.1, 0.1]

    const random = Math.random()
    let sum = 0
    let lastMoveQuality = "good"

    for (let i = 0; i < weights.length; i++) {
      sum += weights[i]
      if (random < sum) {
        lastMoveQuality = qualities[i]
        break
      }
    }

    return {
      goodMovesCount,
      greatMovesCount,
      lastMoveQuality,
    }
  } catch (error) {
    console.error("Error analyzing moves:", error)
    return {
      goodMovesCount: 0,
      greatMovesCount: 0,
      lastMoveQuality: "unknown",
    }
  }
}
