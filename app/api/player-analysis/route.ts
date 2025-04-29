import { type NextRequest, NextResponse } from "next/server"
import { Chess } from "chess.js";
import type { ChessComGame, PlayerData, AnalyzedGameSummary } from "@/lib/types"
import { fetchStockfishAnalysis } from "@/lib/stockfish-service"; // Keep import if analyzeGamesWithStockfish stays here

// Helper function for adding delay (keep if analyzeGamesWithStockfish stays here)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const username = searchParams.get("username")?.toLowerCase()

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 })
  }

  const encodedUsername = encodeURIComponent(username);

  try {
    // Fetch player profile to verify the user exists
    const profileResponse = await fetch(`https://api.chess.com/pub/player/${encodedUsername}`)
    if (!profileResponse.ok) {
      console.error(`Chess.com API error for profile (${username}): ${profileResponse.status} ${profileResponse.statusText}`)
      return NextResponse.json(
        { error: `Player not found or Chess.com API error: ${profileResponse.statusText}` },
        { status: profileResponse.status },
      )
    }
    const profileData = await profileResponse.json();
    const playerId = profileData.player_id; // Use player_id if needed later

    // Fetch player stats
    const statsResponse = await fetch(`https://api.chess.com/pub/player/${encodedUsername}/stats`)
    if (!statsResponse.ok) {
      console.error(`Chess.com API error for stats (${username}): ${statsResponse.status} ${statsResponse.statusText}`)
      return NextResponse.json(
        { error: `Failed to fetch stats for player '${username}': ${statsResponse.statusText}` },
        { status: statsResponse.status },
      )
    }
    const statsData = await statsResponse.json()
    const blitzRating = statsData.chess_blitz?.last?.rating ?? null;

    // Fetch archives to get recent games
    const archivesResponse = await fetch(`https://api.chess.com/pub/player/${encodedUsername}/games/archives`)
    if (!archivesResponse.ok) {
      console.error(`Chess.com API error for archives (${username}): ${archivesResponse.status} ${archivesResponse.statusText}`)
      return NextResponse.json(
        { error: `Failed to fetch game archives for player '${username}': ${archivesResponse.statusText}` },
        { status: archivesResponse.status },
      )
    }
    const archivesData = await archivesResponse.json()

    // Get the most recent archive URL
    const latestArchiveUrl = archivesData.archives.pop(); // Get the last one
    if (!latestArchiveUrl) {
        return NextResponse.json({ error: "No game archives found for player." }, { status: 404 });
    }

    // Fetch games from the most recent archive
    let recentGames: ChessComGame[] = [];
    const gamesResponse = await fetch(latestArchiveUrl);
    if (gamesResponse.ok) {
        const gamesData = await gamesResponse.json();
        if (gamesData && Array.isArray(gamesData.games)) {
            recentGames = gamesData.games;
        }
    } else {
        console.warn(`Failed to fetch games from archive: ${latestArchiveUrl} - Status: ${gamesResponse.status}`);
        // Optionally try the second to last archive if the latest failed
    }

    // Sort games by end_time descending to easily get the most recent
    recentGames.sort((a, b) => b.end_time - a.end_time);

    // Get the MOST RECENT game only
    const gamesToAnalyze = recentGames.slice(0, 1); // Changed from slice(0, 5)

    // --- REMOVE Stockfish analysis call from initial load ---
    // console.log(`Starting Stockfish analysis for ${gamesToAnalyze.length} game for user ${username}...`); // Updated log text
    // const analysisResult = await analyzeGamesWithStockfish(gamesToAnalyze, username); // REMOVED
    // console.log(`Finished Stockfish analysis for user ${username}. Great Moves: ${analysisResult.totalGreatMoves}`);

    // --- Create per-game summaries with basic info ---
    const recentGamesAnalysis: AnalyzedGameSummary[] = gamesToAnalyze.map(game => {
        return {
            gameUrl: game.url,
            fen: game.fen, // Final FEN
            greatMovesCount: 0, // Renamed from goodMovesCount - Not calculated yet
            brilliantMovesCount: 0, // Not calculated yet
            whiteUsername: game.white.username, // Added
            blackUsername: game.black.username, // Added
            whiteResult: game.white.result,     // Added
            blackResult: game.black.result,     // Added
            endTime: game.end_time              // Added
        };
    });

    // --- Calculate derived stats (using Blitz rating) ---
    const calculatedCurrentLevel = blitzRating ? Math.floor(blitzRating / 100) : 0;
    // Use a default initial rating for level crossing calculation, or fetch join date + first rating if needed
    const assumedInitialRating = 1200;
    const levelsCrossed = blitzRating ? Math.floor((blitzRating - assumedInitialRating) / 100) : 0;
    const targetRating = blitzRating ? Math.ceil(blitzRating / 100) * 100 : 1200; // Target next 100 marker

    // Build the PlayerData object for the response
    const playerData: PlayerData = {
      username: profileData.username,
      blitzRating: blitzRating,
      levelsCrossed: levelsCrossed,
      totalGreatMoves: null, // Set to null initially
      currentLevel: calculatedCurrentLevel,
      todoForNextLevel: "Win 5 more games with at least one brilliant move",
      puzzlePoints: statsData.puzzle_rush?.best?.score || 0,
      targetRating: targetRating,
      targetPuzzlePoints: 1000,
      targetGreatMoves: 10,
      requirements: {
        elo: blitzRating ? blitzRating >= targetRating : false,
        puzzlePoints: (statsData.puzzle_rush?.best?.score || 0) >= 1000,
        greatMoves: false, // Set to false initially, will be checked after analysis
      },
      recentGamesAnalysis, // Now contains basic game info
    }

    return NextResponse.json(playerData)
  } catch (error) {
    console.error(`Error fetching player analysis for ${username}:`, error)
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: `Failed to fetch player analysis: ${errorMessage}` }, { status: 500 })
  }
}

// --- Stockfish Analysis Function (can stay here or move) ---
// Keep this function as it will be used by the new analyze-moves route
// Note: This function is no longer called directly by this route's GET handler.
// It's kept here for potential future use or if it's moved/refactored elsewhere.
async function analyzeGamesWithStockfish(games: ChessComGame[], username: string): Promise<{ totalGreatMoves: number }> {
  let totalGreatMoves = 0;
  const chess = new Chess();
  const STOCKFISH_DELAY_MS = 750; // Keep delay

  for (const game of games) {
    let history;
    try {
      chess.reset();
      chess.loadPgn(game.pgn); // Throws on error

      history = chess.history({ verbose: true });
      const isPlayerWhite = game.white.username.toLowerCase() === username.toLowerCase();
      chess.reset();

      console.log(`Analyzing game: ${game.url} (${history.length} moves)`);

      for (let i = 0; i < history.length; i++) {
        const move = history[i];
        const currentPlayerIsTarget = (move.color === 'w' && isPlayerWhite) || (move.color === 'b' && !isPlayerWhite);

        if (currentPlayerIsTarget) {
          const fenBeforeMove = chess.fen();
          await delay(STOCKFISH_DELAY_MS);
          console.log(`[Stockfish Call] User: ${username}, Game: ${game.url}, Move #: ${i + 1}, FEN: ${fenBeforeMove}`);
          const analysis = await fetchStockfishAnalysis(fenBeforeMove, 15);

          if (analysis && analysis.success && analysis.best) {
            console.log(`[Stockfish Resp] FEN: ${fenBeforeMove}, Best: ${analysis.best}, Eval: ${analysis.evaluation}, Player Move: ${move.lan}`);
            if (move.lan === analysis.best) {
              totalGreatMoves++;
              console.log(`   -> Great Move! (${move.lan})`);
            }
          } else {
             // Logged in fetchStockfishAnalysis
          }
        }
        const moveResult = chess.move(move.san);
        if (!moveResult) {
            console.warn(`Failed to make move ${move.san} in game ${game.url} after PGN load.`);
            break;
        }
      }
    } catch (pgnError) {
        console.error(`Error processing PGN or move for game ${game.url}:`, pgnError);
    } finally {
        chess.reset();
    }
  }
  return { totalGreatMoves };
}