import { type NextRequest, NextResponse } from "next/server";
import { Chess } from "chess.js";
import type { ChessComGame, AnalyzedGameSummary, StockfishAnalysis } from "@/lib/types"; // Updated import
import { fetchStockfishAnalysis } from "@/lib/stockfish-service";

// Helper function for adding delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Define the evaluation threshold for a "Great Move" (in pawn units)
// Positive for White's advantage, negative for Black's advantage
const GREAT_MOVE_EVAL_THRESHOLD = 2.0; // e.g., 2.0 pawn advantage

// --- Stockfish Analysis Function ---
// Modified to return per-game analysis summaries
async function analyzeGamesWithStockfish(games: ChessComGame[], username: string): Promise<AnalyzedGameSummary[]> {
  const analysisSummaries: AnalyzedGameSummary[] = [];
  const chess = new Chess();
  const STOCKFISH_DELAY_MS = 750; // Delay between API calls

  for (const game of games) {
    let history;
    let greatMovesInGame = 0; // Counter for moves meeting the "Great Move" criteria
    let skipReason: string | null = null; // Reason for skipping analysis

    try {
      chess.reset();

      // --- Check for Custom Start Position (SetUp tag) ---
      if (game.pgn && game.pgn.includes('[SetUp "1"]')) {
          skipReason = "Game started from a custom position (contains [SetUp \"1\"])";
          console.log(`[Analysis Skip] Skipping game ${game.url}: ${skipReason}`);
          // Skip the rest of the try block for this game
          throw new Error(skipReason); // Use error to jump to finally block logic
      }
      // --- End Check ---


      // Attempt to load PGN. If it fails, the catch block handles it.
      console.log(`[PGN Load Attempt] Loading PGN for game ${game.url}`);
      chess.loadPgn(game.pgn); // This line might throw for other PGN errors
      console.log(`[PGN Load Success] Successfully loaded PGN for game ${game.url}`);


      history = chess.history({ verbose: true });
      const isPlayerWhite = game.white.username.toLowerCase() === username.toLowerCase();
      chess.reset(); // Reset before iterating through moves

      console.log(`Analyzing game: ${game.url} (${history.length} moves)`);

      for (let i = 0; i < history.length; i++) {
        const move = history[i];
        const currentPlayerIsTarget = (move.color === 'w' && isPlayerWhite) || (move.color === 'b' && !isPlayerWhite);

        if (currentPlayerIsTarget) {
          const fenBeforeMove = chess.fen();
          await delay(STOCKFISH_DELAY_MS);
          console.log(`[Stockfish Call] User: ${username}, Game: ${game.url}, Move #: ${i + 1}, FEN: ${fenBeforeMove}`);
          // Fetch analysis which includes evaluation *after* the best move
          const analysis: StockfishAnalysis | null = await fetchStockfishAnalysis(fenBeforeMove, 15);

          // --- Added Detailed Logging ---
          console.log(`[Stockfish Raw Resp] FEN: ${fenBeforeMove}, Analysis:`, JSON.stringify(analysis));
          // --- End Added Logging ---

          // --- Debugging: Log type and value right before the check ---
          console.log(`[Debug Check] typeof analysis: ${typeof analysis}, analysis exists: ${!!analysis}`);
          if (analysis) {
            // Corrected: Check analysis.bestmove
            console.log(`[Debug Check] typeof analysis.bestmove: ${typeof analysis.bestmove}, analysis.bestmove value: '${analysis.bestmove}', analysis.bestmove exists: ${!!analysis.bestmove}`);
          }
          // --- End Debugging ---

          // Simplified Check: If analysis exists and has a non-empty bestmove string
          // Corrected: Use analysis.bestmove
          if (analysis && analysis.bestmove) {
            const bestMoveParts = analysis.bestmove.split(' ');
            const stockfishBestMove = bestMoveParts.length > 1 ? bestMoveParts[1] : null; // Extract the actual move
            // --- End Parsing ---

            // --- Detailed Logging Before Comparison ---
            // Corrected: Use analysis.evaluation directly
            console.log(`[Check Great Move Criteria] Player Move: '${move.lan}', Stockfish Best (Parsed): '${stockfishBestMove}', Eval After Best: ${analysis.evaluation ?? 'N/A'}, Mate: ${analysis.mate ?? 'N/A'}`);
            // --- End Detailed Logging ---

            // Check 1: Did the player play the best move?
            if (stockfishBestMove && move.lan === stockfishBestMove) {
              // Check 2: Does the move meet the "Great Move" evaluation criteria?
              let isGreatByEval = false;
              const evaluation = analysis.evaluation; // Eval *after* the best move
              const mate = analysis.mate; // Mate in X moves *after* the best move

              if (mate !== null && mate !== undefined) {
                // Finding a checkmate sequence is always great
                isGreatByEval = true;
                console.log(`   -> GREAT MOVE (Mate Found!): Mate in ${mate}`);
              } else if (evaluation !== null && evaluation !== undefined) {
                // Check evaluation threshold based on player color
                if (move.color === 'w' && evaluation > GREAT_MOVE_EVAL_THRESHOLD) {
                  isGreatByEval = true;
                  console.log(`   -> GREAT MOVE (White Eval Threshold Met): Eval ${evaluation} > ${GREAT_MOVE_EVAL_THRESHOLD}`);
                } else if (move.color === 'b' && evaluation < -GREAT_MOVE_EVAL_THRESHOLD) {
                  isGreatByEval = true;
                  console.log(`   -> GREAT MOVE (Black Eval Threshold Met): Eval ${evaluation} < ${-GREAT_MOVE_EVAL_THRESHOLD}`);
                }
              }

              if (isGreatByEval) {
                greatMovesInGame++; // Increment counter only if both conditions met
                console.log(`   -> GREAT MOVE DETECTED! FEN: ${fenBeforeMove}, Move: ${move.lan}, Eval: ${evaluation ?? 'N/A'}, Mate: ${mate ?? 'N/A'}`);
              } else {
                // Played best move, but didn't meet the evaluation threshold
                console.log(`   -> Best Move Played, but Eval/Mate threshold not met (Eval: ${evaluation ?? 'N/A'}, Mate: ${mate ?? 'N/A'})`);
              }
            } else if (stockfishBestMove) {
              // Player did not play the best move
              console.log(`   -> Not the Best Move (Player: ${move.lan}, Parsed Best: ${stockfishBestMove})`);
            } else {
              // Could not parse Stockfish's best move
              console.log(`   -> Cannot determine Best Move (Parsing failed for analysis.bestmove: '${analysis.bestmove}')`);
            }
          } else {
             // This block now means analysis is null OR analysis.bestmove is null/empty string
             let reason = "Unknown reason";
             if (!analysis) {
                 // fetchStockfishAnalysis should have already logged the failure reason
                 reason = "Stockfish API call failed or returned null";
             } else { // analysis exists, but analysis.bestmove is falsy (null or empty string)
                 // Corrected: Check analysis.bestmove
                 reason = "Stockfish API response missing 'bestmove' string";
             }
             // Log the skip reason determined here
             // Changed log message slightly for clarity
             console.log(`[Stockfish Skip] Analysis skipped for FEN: ${fenBeforeMove}. Reason: ${reason}. Raw Analysis object received:`, JSON.stringify(analysis));
          }
        }
        // Make the move on the board *after* analysis of the position *before* the move
        const moveResult = chess.move(move.san);
        if (!moveResult) {
            console.warn(`[Move Error] Failed to make move ${move.san} in game ${game.url} after PGN load. Current FEN: ${chess.fen()}`);
            // If a move fails, stop processing this game to avoid incorrect FENs
            skipReason = `Internal error processing move ${move.san}`; // Set skip reason
            break; // Exit inner loop
        }
      }
    } catch (error) {
        // If skipReason is already set, it was intentional (like custom FEN)
        if (!skipReason) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            skipReason = `Error processing game: ${errorMessage}`;
            console.error(`[Analysis Error] Game ${game.url}. ${skipReason}`);
        }
        // Ensure greatMovesInGame is 0 if any error occurred during analysis phase
        greatMovesInGame = 0; // Renamed variable back
    } finally {
        chess.reset(); // Ensure reset before next game
    }

    // Add the summary for the processed game
    analysisSummaries.push({
      gameUrl: game.url,
      fen: game.fen, // Final FEN from original game data
      greatMovesCount: greatMovesInGame, // Use renamed field back
      brilliantMovesCount: 0,
      whiteUsername: game.white.username,
      blackUsername: game.black.username,
      whiteResult: game.white.result,
      blackResult: game.black.result,
      endTime: game.end_time
    });

    // Reverted Log Message
    console.log(`Finished analyzing game: ${game.url}. Great Moves (New Criteria): ${greatMovesInGame}, Brilliant: 0. Skipped: ${!!skipReason}${skipReason ? ` (${skipReason})` : ''}`);

  } // End loop through games

  // Updated Log Message
  console.log(`Stockfish analysis complete for ${games.length} games for user ${username}. Returning ${analysisSummaries.length} summaries.`);
  return analysisSummaries; // Return array of summaries
}


export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  try {
    // --- Fetch user's game archives ---
    const archivesResponse = await fetch(`https://api.chess.com/pub/player/${username}/games/archives`);
    if (!archivesResponse.ok) {
      if (archivesResponse.status === 404) {
        throw new Error(`Chess.com profile not found for user: ${username}`);
      }
      throw new Error(`Failed to fetch game archives (${archivesResponse.status})`);
    }
    const archivesData = await archivesResponse.json();
    const archiveUrls: string[] = archivesData.archives;

    if (!archiveUrls || archiveUrls.length === 0) {
      return NextResponse.json([]); // No archives found
    }

    // --- Fetch games from the latest archive ---
    const latestArchiveUrl = archiveUrls[archiveUrls.length - 1];
    const gamesResponse = await fetch(latestArchiveUrl);
    let recentGames: ChessComGame[] = [];

    if (gamesResponse.ok) {
        const gamesData = await gamesResponse.json();
        recentGames = gamesData.games || [];
    } else {
        console.warn(`Failed to fetch games from archive: ${latestArchiveUrl} - Status: ${gamesResponse.status}`);
    }

    // Sort games by end_time descending
    recentGames.sort((a, b) => b.end_time - a.end_time);

    // Get the MOST RECENT game only for analysis
    const gamesToAnalyze = recentGames.slice(0, 1); // Changed from slice(0, 5)

    if (gamesToAnalyze.length === 0) {
        return NextResponse.json([], { status: 200 }); // Return empty if no games found
    }

    // --- Perform Analysis ---
    console.log(`Starting delayed Stockfish analysis for ${gamesToAnalyze.length} game for user ${username}...`); // Updated log text
    // analyzeGamesWithStockfish now returns AnalyzedGameSummary[]
    const analysisResults: AnalyzedGameSummary[] = await analyzeGamesWithStockfish(gamesToAnalyze, username);

    // --- Return Result ---
    // Return the array of analysis summaries (will contain 0 or 1 item)
    return NextResponse.json(analysisResults);

  } catch (error) {
    console.error(`Error analyzing moves for ${username}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during analysis";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
