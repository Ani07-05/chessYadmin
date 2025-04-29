import { type NextRequest, NextResponse } from "next/server"
import type { GameData, ChessComGame } from "@/lib/types"
import { extractFenPositions, evaluateLastMove, extractLastMove } from "@/lib/utils"

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

    // Get the most recent archive
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

    // Filter games from the current week
    const oneWeekAgo = Date.now() / 1000 - 7 * 24 * 60 * 60
    const thisWeekGames = recentGames.filter((game) => game.end_time > oneWeekAgo)

    // Process games to extract required information
    const processedGames: GameData[] = thisWeekGames.map((game) => {
      // Extract FEN positions for the last 7 moves
      const lastPositions = extractFenPositions(game.pgn)

      // Extract the last move
      const lastMove = extractLastMove(game.pgn)

      // Evaluate the last move
      const { quality, evaluation, bestMove } = evaluateLastMove(lastPositions[0])

      return {
        url: game.url,
        time_control: game.time_control,
        time_class: game.time_class,
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
        lastMoveQuality: quality,
        evaluation,
        bestMove,
        lastPositions,
      }
    })

    // Sort games by time class (prioritize blitz) and then by end time (most recent first)
    const sortedGames = processedGames.sort((a, b) => {
      // First prioritize by time class
      if (a.time_class === "blitz" && b.time_class !== "blitz") return -1
      if (a.time_class !== "blitz" && b.time_class === "blitz") return 1

      // Then by recency
      return b.end_time - a.end_time
    })

    return NextResponse.json({ games: sortedGames })
  } catch (error) {
    console.error("Error fetching game data:", error)
    return NextResponse.json({ error: "Failed to fetch game data" }, { status: 500 })
  }
}
