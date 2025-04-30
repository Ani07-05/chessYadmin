import { type NextRequest, NextResponse } from "next/server";
import { Chess } from "chess.js";
import type { ChessComGame, PlayerData, AnalyzedGameSummary, StockfishAnalysis, HighlightedMove } from "@/lib/types";
import { fetchStockfishAnalysis } from "@/lib/stockfish-service"; // Use updated service
import { DEFAULT_DEPTH } from "@/lib/stockfish-service"; // Import DEFAULT_DEPTH if needed here

// Helper function for adding delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Define Constants at Module Scope ---
// Define the evaluation threshold for a "Great Move" (in pawn units)
// Positive for White's advantage, negative for Black's advantage
const GREAT_MOVE_EVAL_THRESHOLD = 2.5; // Example: Slightly stricter
// Define threshold for Brilliant moves (e.g., higher eval gain, or finding a non-obvious best move)
const BRILLIANT_MOVE_EVAL_THRESHOLD = 5.0; // Example: Stricter threshold

// --- Main GET Handler ---
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
    }

    // Sort games by end_time descending
    recentGames.sort((a, b) => b.end_time - a.end_time);

    // Get the last 5 games for analysis
    const gamesToAnalyze = recentGames.slice(0, 5); // Analyze up to 5 games

    // --- Perform Stockfish analysis ---
    let analysisSummaries: AnalyzedGameSummary[] = [];
    if (gamesToAnalyze.length > 0) {
        console.log(`Starting Stockfish analysis for ${gamesToAnalyze.length} games for user ${username}...`);
        analysisSummaries = await analyzeGamesWithStockfish(gamesToAnalyze, username, blitzRating);
        console.log(`Finished Stockfish analysis for user ${username}.`);
    } else {
        console.log(`No recent games found to analyze for ${username}.`);
    }

    // --- Calculate Totals from Analysis ---
    const totalGreatMoves = analysisSummaries.reduce((sum, game) => sum + game.greatMovesCount, 0);
    const totalBrilliantMoves = analysisSummaries.reduce((sum, game) => sum + game.brilliantMovesCount, 0);


    // --- Calculate derived stats (using Blitz rating) ---
    const calculatedCurrentLevel = blitzRating ? Math.floor(blitzRating / 100) : 0;
    // Use a default initial rating for level crossing calculation, or fetch join date + first rating if needed
    const assumedInitialRating = 1200;
    const levelsCrossed = blitzRating ? Math.floor((blitzRating - assumedInitialRating) / 100) : 0;
    const targetRating = blitzRating ? Math.ceil(blitzRating / 100) * 100 : 1200; // Target next 100 marker
    const winRate = statsData.chess_blitz?.record?.win / (statsData.chess_blitz?.record?.win + statsData.chess_blitz?.record?.loss + statsData.chess_blitz?.record?.draw) * 100 || 0;
    const totalGames = statsData.chess_blitz?.record?.win + statsData.chess_blitz?.record?.loss + statsData.chess_blitz?.record?.draw || 0;
    const totalWins = statsData.chess_blitz?.record?.win || 0;
    const totalLosses = statsData.chess_blitz?.record?.loss || 0;
    const totalDraws = statsData.chess_blitz?.record?.draw || 0;


    // Build the PlayerData object for the response
    const playerData: PlayerData = {
      username: profileData.username,
      blitzRating: blitzRating,
      winRate: winRate,
      averageOpponentRating: 0, // Placeholder
      totalGames: totalGames,
      totalWins: totalWins,
      totalLosses: totalLosses,
      totalDraws: totalDraws,
      totalGreatMoves: totalGreatMoves, // Assign calculated total
      totalBrilliantMoves: totalBrilliantMoves, // Assign calculated total
      recentGamesAnalysis: analysisSummaries, // Assign the actual analysis summaries
      currentRating: blitzRating, // Can be null
      levelsCrossed: levelsCrossed, // Add this line
    }

    return NextResponse.json(playerData)
  } catch (error) {
    console.error(`Error fetching player analysis for ${username}:`, error)
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: `Failed to fetch player analysis: ${errorMessage}` }, { status: 500 })
  }
}

// --- Stockfish Analysis Function (Adapted from analyze-moves) ---
async function analyzeGamesWithStockfish(
    games: ChessComGame[],
    username: string,
    playerRating: number | null // Pass rating for potential future use in criteria
): Promise<AnalyzedGameSummary[]> {
  const analysisSummaries: AnalyzedGameSummary[] = [];
  const chess = new Chess();
  const STOCKFISH_DELAY_MS = 500;

  console.log(`Analyzing ${games.length} games. Player Rating: ${playerRating ?? 'N/A'}`);

  for (const game of games) {
    let history;
    let greatMovesInGame = 0;
    let brilliantMovesInGame = 0;
    let highlightedMovesInGame: HighlightedMove[] = []; // Store highlights for this game
    let skipReason: string | null = null;

    try {
      chess.reset();

      // Check for Custom Start Position or invalid PGN
      if (!game.pgn || game.pgn.includes('[SetUp "1"]')) {
          skipReason = !game.pgn ? "Missing PGN data" : "Game started from a custom position";
          console.log(`[Analysis Skip] Skipping game ${game.url}: ${skipReason}`);
          throw new Error(skipReason); // Use error to jump to finally block
      }

      // Attempt to load PGN
      console.log(`[PGN Load Attempt] Loading PGN for game ${game.url}`);
      chess.loadPgn(game.pgn); // This might throw for other PGN errors
      console.log(`[PGN Load Success] Successfully loaded PGN for game ${game.url}`);

      history = chess.history({ verbose: true });
      const isPlayerWhite = game.white.username.toLowerCase() === username.toLowerCase();
      chess.reset(); // Reset before iterating through moves

      console.log(`Analyzing game: ${game.url} (${history.length} moves)`);

      for (let i = 0; i < history.length; i++) {
        const move = history[i];
        const fenBeforeMove = chess.fen();
        const currentPlayerIsTarget = (move.color === 'w' && isPlayerWhite) || (move.color === 'b' && !isPlayerWhite);

        // Always make the move to keep the board state correct
        const moveResult = chess.move(move.san);
        if (!moveResult) {
            console.warn(`[Move Error] Failed to make move ${move.san} in game ${game.url}. Current FEN: ${fenBeforeMove}`);
            skipReason = `Internal error processing move ${move.san}`;
            break; // Stop analyzing this game
        }

        if (currentPlayerIsTarget) {
          await delay(STOCKFISH_DELAY_MS);
          console.log(`[Stockfish Call] User: ${username}, Game: ${game.url}, Move #: ${i + 1}, FEN: ${fenBeforeMove}`);
          const analysis: StockfishAnalysis | null = await fetchStockfishAnalysis(fenBeforeMove, DEFAULT_DEPTH);
          console.log(`[Stockfish Raw Resp] FEN: ${fenBeforeMove}, Analysis:`, JSON.stringify(analysis));

          if (analysis && analysis.success && analysis.bestmove) {
            const stockfishBestMoveLan = analysis.bestmove.trim();
            console.log(`[Check Move Quality] Player Move: '${move.lan}', Stockfish Best: '${stockfishBestMoveLan}', Eval After Best: ${analysis.evaluation ?? 'N/A'}, Mate: ${analysis.mate ?? 'N/A'}`);

            // Check 1: Did the player play the best move?
            if (stockfishBestMoveLan && move.lan === stockfishBestMoveLan) {
              const currentEval = analysis.evaluation;
              const mateFound = analysis.mate !== null && analysis.mate !== undefined;
              let isGreat = false;
              let isBrilliant = false;
              let quality: "brilliant" | "great" | null = null;

              if (mateFound) {
                  isGreat = true;
                  quality = "great"; // Mate found is at least great
                  console.log(`   -> GREAT MOVE (Mate Found!): Mate in ${analysis.mate}`);
              } else if (currentEval !== null) {
                  if (move.color === 'w') {
                      if (currentEval >= BRILLIANT_MOVE_EVAL_THRESHOLD) { isBrilliant = true; quality = "brilliant"; }
                      else if (currentEval >= GREAT_MOVE_EVAL_THRESHOLD) { isGreat = true; quality = "great"; }
                  } else { // Player is black
                      if (currentEval <= -BRILLIANT_MOVE_EVAL_THRESHOLD) { isBrilliant = true; quality = "brilliant"; }
                      else if (currentEval <= -GREAT_MOVE_EVAL_THRESHOLD) { isGreat = true; quality = "great"; }
                  }

                  if (isBrilliant) {
                      console.log(`   -> BRILLIANT MOVE (Eval Threshold Met): Eval ${currentEval}`);
                  } else if (isGreat) {
                      console.log(`   -> GREAT MOVE (Eval Threshold Met): Eval ${currentEval}`);
                  } else {
                      console.log(`   -> Best Move Played, but Eval threshold not met (Eval: ${currentEval})`);
                  }
              }

              if (isBrilliant) {
                brilliantMovesInGame++;
                greatMovesInGame++;
                highlightedMovesInGame.push({ // Add detailed info
                  gameUrl: game.url,
                  moveIndex: i,
                  moveSan: move.san,
                  fenBefore: fenBeforeMove,
                  evaluation: currentEval,
                  mate: analysis.mate,
                  quality: "brilliant",
                });
              } else if (isGreat) {
                greatMovesInGame++;
                 highlightedMovesInGame.push({ // Add detailed info
                  gameUrl: game.url,
                  moveIndex: i,
                  moveSan: move.san,
                  fenBefore: fenBeforeMove,
                  evaluation: currentEval,
                  mate: analysis.mate,
                  quality: "great",
                });
              }

            } else if (stockfishBestMoveLan) {
              console.log(`   -> Not the Best Move (Player: ${move.lan}, Best: ${stockfishBestMoveLan})`);
              // Potentially add logic here to check if a non-best move was still "Great" or "Brilliant" based on eval difference, but keeping it simple for now.
            } else {
              console.log(`   -> Cannot determine Best Move (Stockfish best move was empty or null after trim: '${analysis.bestmove}')`);
            }
          } else {
             let reason = "Unknown reason";
             if (!analysis) reason = "Stockfish API call failed or returned null";
             else if (!analysis.success) reason = `Stockfish API returned success=false (Error: ${analysis.error || 'N/A'})`; // Include error if available
             else reason = "Stockfish API response missing 'bestmove' string";
             console.log(`[Stockfish Skip] Analysis skipped for FEN: ${fenBeforeMove}. Reason: ${reason}. Raw Response:`, JSON.stringify(analysis));
          }
        }
      } // End loop through moves

    } catch (error) {
        // Handle errors during PGN loading or analysis loop
        if (!skipReason) { // If skipReason wasn't set by a specific check
            const errorMessage = error instanceof Error ? error.message : String(error);
            skipReason = `Error processing game: ${errorMessage}`;
            console.error(`[Analysis Error] Game ${game.url}. ${skipReason}`);
        }
        // Ensure counts are 0 if analysis was skipped or failed
        greatMovesInGame = 0;
        brilliantMovesInGame = 0;
        highlightedMovesInGame = []; // Clear highlights on error
    } finally {
        chess.reset(); // Ensure reset before next game
    }

    // Add the summary for the processed game
    analysisSummaries.push({
      gameUrl: game.url,
      fen: game.fen,
      greatMovesCount: greatMovesInGame, // Keep summary counts
      brilliantMovesCount: brilliantMovesInGame, // Keep summary counts
      highlightedMoves: highlightedMovesInGame, // Add the detailed highlights
      whiteUsername: game.white.username,
      blackUsername: game.black.username,
      whiteResult: game.white.result,
      blackResult: game.black.result,
      endTime: game.end_time
    });

    console.log(`Finished analyzing game: ${game.url}. Great: ${greatMovesInGame}, Brilliant: ${brilliantMovesInGame}. Skipped: ${!!skipReason}${skipReason ? ` (${skipReason})` : ''}`);

  } // End loop through games

  console.log(`Stockfish analysis complete for ${games.length} games for user ${username}. Returning ${analysisSummaries.length} summaries.`);
  return analysisSummaries;
}