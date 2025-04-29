import { type NextRequest, NextResponse } from "next/server"
import type { GameData, ChessComGame } from "@/lib/types"
import { extractFenPositionsFromPgn, extractLastMove, analyzeMovesInGame } from "@/lib/utils"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const username = searchParams.get("username")

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 })
  }

  try {
    // Fetch player profile to verify the user exists
    const profileResponse = await fetch(`https://api.chess.com/pub/player/${username}`)

    if (!profileResponse.ok) {
      return NextResponse.json(
        { error: `Player not found: ${profileResponse.statusText}` },
        { status: profileResponse.status },
      )
    }

    // Fetch archives to get recent games
    const archivesResponse = await fetch(`https://api.chess.com/pub/player/${username}/games/archives`)

    if (!archivesResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch game archives: ${archivesResponse.statusText}` },
        { status: archivesResponse.status },
      )
    }

    const archivesData = await archivesResponse.json()

    // Get the most recent archives (current month and previous month)
    const recentArchives = archivesData.archives.slice(-2)

    // Fetch games from recent archives
    const recentGames: ChessComGame[] = []

    for (const archiveUrl of recentArchives) {
      const gamesResponse = await fetch(archiveUrl)

      if (gamesResponse.ok) {
        const gamesData = await gamesResponse.json()
        recentGames.push(...gamesData.games)
      }
    }

    // Filter games from the current week and only blitz games
    const oneWeekAgo = Date.now() / 1000 - 7 * 24 * 60 * 60
    const blitzGamesThisWeek = recentGames.filter((game) => game.end_time > oneWeekAgo && game.time_class === "blitz")

    // Process games to extract required information
    const processedGames: GameData[] = await Promise.all(
      blitzGamesThisWeek.map(async (game) => {
        // Extract FEN positions for the last 7 moves
        const lastPositions = extractFenPositionsFromPgn(game.pgn)

        // Extract the last move
        const lastMove = extractLastMove(game.pgn)

        // Analyze moves in the game
        const { goodMovesCount, greatMovesCount, lastMoveQuality } = analyzeMovesInGame(game.pgn)

        // In a real implementation, you would call the Stockfish API to evaluate the last position
        // For now, we'll simulate the evaluation
        const evaluation =
          Math.random() > 0.5 ? `+${(Math.random() * 2).toFixed(2)}` : `-${(Math.random() * 2).toFixed(2)}`
        const bestMove = ["Nf3", "e4", "d4", "c4", "Nc3"][Math.floor(Math.random() * 5)]

        return {
          url: game.url,
          time_control: game.time_control,
          end_time: game.end_time,
          white: {
            username: game.white.username,
            rating: game.white.rating,
            result: game.white.result,
          },
          black: {
            username: game.black.username,
            rating: game.black.rating,
            result: game.black.result,
          },
          lastMove,
          lastMoveQuality,
          evaluation,
          bestMove,
          lastPositions,
          goodMovesCount,
          greatMovesCount,
        }
      }),
    )

    // Sort games by end time (most recent first)
    const sortedGames = processedGames.sort((a, b) => b.end_time - a.end_time)

    return NextResponse.json({ games: sortedGames })
  } catch (error) {
    console.error("Error fetching game data:", error)
    return NextResponse.json({ error: "Failed to fetch game data" }, { status: 500 })
  }
}
