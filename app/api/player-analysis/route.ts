import { type NextRequest, NextResponse } from "next/server";
import { Chess } from "chess.js";
import type { ChessComGame, PlayerData, AnalyzedGameSummary, StockfishAnalysis, HighlightedMove } from "@/lib/types";
// Removed fetchStockfishPositionEvaluation as it's not exported/implemented
import { fetchStockfishAnalysis, DEFAULT_DEPTH } from "@/lib/stockfish-service";

// Helper function for adding delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Define Constants at Module Scope ---
const MAX_GAMES_TO_ANALYZE = 5;
const STOCKFISH_DELAY_MS = 500;
const BASE_GREAT_MOVE_EVAL_THRESHOLD = 2.0;
const BASE_BRILLIANT_MOVE_EVAL_THRESHOLD = 9.0; // Updated brilliant threshold

// --- Main GET Handler ---
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }
  const encodedUsername = encodeURIComponent(username);

  try {
    // --- Fetch Player Data ---
    const profileResponse = await fetch(`https://api.chess.com/pub/player/${encodedUsername}`);
    // ... existing profile fetch and error handling ...
    const profileData = await profileResponse.json();

    const statsResponse = await fetch(`https://api.chess.com/pub/player/${encodedUsername}/stats`);
    // ... existing stats fetch and error handling ...
    const statsData = await statsResponse.json();
    const blitzRating = statsData.chess_blitz?.last?.rating ?? null; // Use Blitz for rating adjustment

    // --- Fetch Recent Games ---
    const archivesResponse = await fetch(`https://api.chess.com/pub/player/${encodedUsername}/games/archives`);
    // ... existing archives fetch and error handling ...
    const archivesData = await archivesResponse.json();
    const archiveUrls: string[] = archivesData.archives;

    if (!archiveUrls || archiveUrls.length === 0) {
      // Handle case where player has no archives
       return NextResponse.json({
         username: profileData.username,
         blitzRating: blitzRating,
         // ... other stats ...
         totalGames: 0,
         totalWins: 0,
         totalLosses: 0,
         totalDraws: 0,
         totalGreatMoves: 0,
         totalBrilliantMoves: 0,
         recentGamesAnalysis: [],
         // ... other derived stats ...
       });
    }

    const latestArchiveUrl = archiveUrls[archiveUrls.length - 1];
    const gamesResponse = await fetch(latestArchiveUrl);
    let recentGames: ChessComGame[] = [];
    if (gamesResponse.ok) {
      const gamesData = await gamesResponse.json();
      // Filter for Blitz games ONLY before sorting and slicing
      recentGames = (gamesData.games || []).filter(
          (game: ChessComGame) => game.time_class === 'blitz' // Only Blitz
      );
    } else {
      console.warn(`Failed to fetch games from archive: ${latestArchiveUrl} - Status: ${gamesResponse.status}`);
      // Potentially return partial data or error
    }

    // Sort by end time descending and take the most recent N games
    recentGames.sort((a, b) => b.end_time - a.end_time);
    const gamesToAnalyze = recentGames.slice(0, MAX_GAMES_TO_ANALYZE);

    console.log(`Fetched ${recentGames.length} blitz games, analyzing latest ${gamesToAnalyze.length} for ${username}`); // Updated log

    // --- Analyze Games ---
    const analysisSummaries: AnalyzedGameSummary[] = await analyzeGamesWithStockfish(gamesToAnalyze, username, blitzRating);

    // --- Calculate Totals from Analysis ---
    // ... existing total calculations ...
    const totalGreatMoves = analysisSummaries.reduce((sum, game) => sum + game.greatMovesCount, 0);
    const totalBrilliantMoves = analysisSummaries.reduce((sum, game) => sum + game.brilliantMovesCount, 0);


    // --- Calculate derived stats (using Blitz rating) ---
    // ... existing derived stats calculations ...
    const calculatedCurrentLevel = blitzRating ? Math.floor(blitzRating / 100) : 0;
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

// --- Helper: Rating Adjustment Factor ---
function getRatingAdjustmentFactor(rating: number | null): number {
    if (rating === null) return 0;
    // Simple linear adjustment: more generous below 1500, stricter above
    // Max adjustment of +/- 1.0 pawn eval at extremes (e.g., 500 or 2500 rating)
    const clampedRating = Math.max(500, Math.min(2500, rating));
    return (1500 - clampedRating) / 1000; // e.g., rating 1000 -> +0.5; rating 2000 -> -0.5
}


// --- Stockfish Analysis Function (Adapted from analyze-moves) ---
async function analyzeGamesWithStockfish(
    games: ChessComGame[],
    username: string,
    playerRating: number | null // Pass rating for potential future use in criteria
): Promise<AnalyzedGameSummary[]> {
  const analysisSummaries: AnalyzedGameSummary[] = [];
  const chess = new Chess();
  // Calculate adjusted thresholds once
  const ratingFactor = getRatingAdjustmentFactor(playerRating);
  const adjustedGreatThreshold = BASE_GREAT_MOVE_EVAL_THRESHOLD + ratingFactor;
  const adjustedBrilliantThreshold = BASE_BRILLIANT_MOVE_EVAL_THRESHOLD + ratingFactor; // Uses updated base

  console.log(`Analyzing ${games.length} games. Player Rating: ${playerRating ?? 'N/A'}. Adj. Thresholds: Great=${adjustedGreatThreshold.toFixed(2)}, Brilliant=${adjustedBrilliantThreshold.toFixed(2)}`);

  for (const game of games) {
    let history;
    let greatMovesInGame = 0;
    let brilliantMovesInGame = 0;
    let highlightedMovesInGame: HighlightedMove[] = []; // Store highlights for this game
    let skipReason: string | null = null;
    const isPlayerWhite = game.white.username.toLowerCase() === username.toLowerCase();

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
      chess.reset(); // Reset before iterating through moves

      console.log(`Analyzing game: ${game.url} (${history.length} moves)`);

      for (let i = 0; i < history.length; i++) {
        const move = history[i];
        const fenBeforeMove = chess.fen();
        const currentPlayerIsTarget = (move.color === 'w' && isPlayerWhite) || (move.color === 'b' && !isPlayerWhite);

        // Make the move *before* analysis if it's the target player,
        // so we can capture fenAfter easily.
        // We still analyze based on fenBeforeMove.
        let fenAfterMove = fenBeforeMove; // Default if move fails or not target player
        const moveResult = chess.move(move.san); // Apply move to internal board state

        if (!moveResult) {
            console.warn(`[Move Error] Failed to make move ${move.san} in game ${game.url}. Current FEN: ${fenBeforeMove}`);
            skipReason = `Internal error processing move ${move.san}`;
            break; // Stop analyzing this game
        }
        fenAfterMove = chess.fen(); // Capture FEN after successful move

        if (currentPlayerIsTarget) {
          await delay(STOCKFISH_DELAY_MS);
          console.log(`[Stockfish Call] User: ${username}, Game: ${game.url}, Move #: ${i + 1}, FEN: ${fenBeforeMove} (Best Move Analysis)`);
          const analysisBest: StockfishAnalysis | null = await fetchStockfishAnalysis(fenBeforeMove, DEFAULT_DEPTH);
          console.log(`[Stockfish Raw Resp] FEN: ${fenBeforeMove}, Analysis:`, JSON.stringify(analysisBest));

          if (analysisBest && analysisBest.success && analysisBest.bestmove) {
            const stockfishBestMoveLan = analysisBest.bestmove.trim();
            const bestMoveEval = analysisBest.evaluation; // Eval *after* best move
            const bestMoveMate = analysisBest.mate;     // Mate *after* best move

            console.log(`[Check Move Quality] Player Move: '${move.lan}', Stockfish Best: '${stockfishBestMoveLan}', Eval After Best: ${bestMoveEval ?? 'N/A'}, Mate After Best: ${bestMoveMate ?? 'N/A'}`);

            // Check 1: Did the player play the best move?
            if (stockfishBestMoveLan && move.lan === stockfishBestMoveLan) {
              let isGreat = false;
              let isBrilliant = false;
              let quality: "brilliant" | "great" | null = null;

              // Apply thresholds based on eval or mate *after the best move*
              if (bestMoveMate !== null) {
                  isGreat = true; quality = "great";
                  // Optional: Add brilliant logic for quick mates found
                  console.log(`   -> GREAT MOVE (Mate Found!): Mate in ${bestMoveMate}`);
              } else if (bestMoveEval !== null) {
                  if (move.color === 'w') {
                      if (bestMoveEval >= adjustedBrilliantThreshold) { isBrilliant = true; quality = "brilliant"; }
                      else if (bestMoveEval >= adjustedGreatThreshold) { isGreat = true; quality = "great"; }
                  } else { // Player is black
                      if (bestMoveEval <= -adjustedBrilliantThreshold) { isBrilliant = true; quality = "brilliant"; }
                      else if (bestMoveEval <= -adjustedGreatThreshold) { isGreat = true; quality = "great"; }
                  }
                  // ... logging for threshold met ...
              }

              // If it qualifies as great or brilliant
              if (isGreat || isBrilliant) {
                // No need for extra eval calls anymore

                const finalQuality = isBrilliant ? "brilliant" : "great";
                if (isBrilliant) brilliantMovesInGame++;
                if (isGreat) greatMovesInGame++; // Count great even if brilliant

                highlightedMovesInGame.push({
                  gameUrl: game.url,
                  moveIndex: i,
                  moveSan: move.san,
                  fenBefore: fenBeforeMove,
                  fenAfter: fenAfterMove,
                  // Removed evalBefore, mateBefore, evalAfter, mateAfter
                  bestMoveEval: bestMoveEval, // Eval after the *best* move from fenBefore
                  bestMoveMate: bestMoveMate, // Mate after the *best* move from fenBefore
                  quality: finalQuality,
                  whiteUsername: game.white.username,
                  blackUsername: game.black.username,
                });
                 console.log(`   -> ${finalQuality.toUpperCase()} MOVE RECORDED. EvalAfterBest: ${bestMoveEval}`);

              } else {
                 console.log(`   -> Best Move Played, but Eval threshold not met (Eval After Best: ${bestMoveEval})`);
              }

            } else if (stockfishBestMoveLan) {
              console.log(`   -> Not the Best Move (Player: ${move.lan}, Best: ${stockfishBestMoveLan})`);
            } else {
              console.log(`   -> Cannot determine Best Move (Stockfish best move was empty or null)`);
            }
          } else {
             let reason = "Unknown reason";
             if (!analysisBest) reason = "Stockfish API call failed or returned null";
             else if (!analysisBest.success) reason = `Stockfish API returned success=false (Error: ${analysisBest.error || 'N/A'})`; // Include error if available
             else reason = "Stockfish API response missing 'bestmove' string";
             console.log(`[Stockfish Skip] Analysis skipped for FEN: ${fenBeforeMove}. Reason: ${reason}. Raw Response:`, JSON.stringify(analysisBest));
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
        // Ensure counts are 0 and highlights are empty if analysis was skipped or failed mid-game
        greatMovesInGame = 0;
        brilliantMovesInGame = 0;
        highlightedMovesInGame = []; // Clear highlights on error
    } finally {
        chess.reset(); // Ensure reset before next game
    }

    // Add the summary for the processed game
    analysisSummaries.push({
      gameUrl: game.url,
      fen: game.fen, // Use final FEN from original game data if available
      greatMovesCount: greatMovesInGame,
      brilliantMovesCount: brilliantMovesInGame,
      highlightedMoves: highlightedMovesInGame, // Includes detailed eval/mate info
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