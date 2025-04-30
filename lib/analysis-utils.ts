import { Chess, type Move } from "chess.js";
import type { StockfishAnalysis } from "./types";
import { fetchStockfishAnalysis } from "./stockfish-service";

// Placeholder type for parsed PGN data (adjust based on library used)
interface ParsedPgnData {
    headers: Record<string, string | null>; // Allow null values for headers
    moves: any[]; // Replace 'any' with the actual move type from the parser library
}

// Placeholder type for move info used in analyze-game route
interface PlayerMoveInfo {
    moveNumber: number;
    moveNotation: string; // e.g., "e4", "Nf3"
    // Add other relevant info if needed
}

export enum MoveQuality {
    NORMAL = "normal",
    GREAT = "great",
    BRILLIANT = "brilliant",
    // Add other qualities if needed (e.g., MISTAKE, BLUNDER)
}

// Use StockfishAnalysis from types.ts
type StockfishResponse = StockfishAnalysis;

// Placeholder implementation using chess.js
export function parsePgn(pgn: string): ParsedPgnData | null {
    try {
        const chess = new Chess();
        // Use chess.js loadPgn, might need header parsing separately if not included
        // Note: chess.js loadPgn doesn't return headers easily, consider @mliebelt/pgn-parser for full parsing
        // Pass options object without the 'sloppy' flag
        chess.loadPgn(pgn, { newlineChar: '\n' }); // Removed sloppy: true
        const headers = chess.header(); // Get headers
        const history = chess.history({ verbose: true }); // Get moves

        // Basic structure, might need refinement based on actual needs
        return {
            headers: headers,
            moves: history,
        };
    } catch (e) {
        console.error("Failed to parse PGN:", e);
        return null;
    }
}

// Placeholder implementation
export function getPlayerMoves(moves: Move[], playerColor: 'white' | 'black'): PlayerMoveInfo[] {
    const playerMovesInfo: PlayerMoveInfo[] = [];
    let moveNumber = 0;
    const targetColor = playerColor === 'white' ? 'w' : 'b';

    for (let i = 0; i < moves.length; i++) {
        if (moves[i].color === targetColor) {
            // Assuming full move number (1 for white, 1 for black, 2 for white, etc.)
            moveNumber = Math.floor(i / 2) + 1;
            playerMovesInfo.push({
                moveNumber: moveNumber,
                moveNotation: moves[i].lan, // Use LAN (e.g., e2e4) or SAN (e.g., e4) as needed
            });
        }
    }
    return playerMovesInfo;
}


// Placeholder implementation using chess.js
export function getFenForMove(gameData: ParsedPgnData, moveNumber: number, playerColor: 'white' | 'black'): string | null {
     try {
        const chess = new Chess();
        // Reload PGN or apply moves up to the point *before* the target move
        // This is inefficient, better to iterate once and store FENs if performance is critical

        // Find the index in the history array corresponding to the start of the move number
        // Note: moveNumber is 1-based, history index is 0-based
        // White's moveNumber X is at index (X-1)*2
        // Black's moveNumber X is at index (X-1)*2 + 1
        const targetHistoryIndex = playerColor === 'white'
            ? (moveNumber - 1) * 2
            : (moveNumber - 1) * 2 + 1;

        if (targetHistoryIndex < 0 || targetHistoryIndex >= gameData.moves.length) {
             console.warn(`[getFenForMove] Invalid move number ${moveNumber} or history index ${targetHistoryIndex}`);
             return null;
        }

        // Apply moves up to the one *before* the target move
        for (let i = 0; i < targetHistoryIndex; i++) {
            const move = gameData.moves[i];
            // Use the SAN notation which chess.js history provides if verbose=true
            const result = chess.move(move.san);
            if (!result) {
                console.warn(`[getFenForMove] Failed to apply move ${move.san} at index ${i}`);
                return null; // Failed to replay game state
            }
        }
        return chess.fen(); // FEN *before* the player's move
    } catch (e) {
        console.error(`Error getting FEN for move ${moveNumber}:`, e);
        return null;
    }
}


// Wrapper around the existing fetchStockfishAnalysis
export async function callStockfishService(fen: string): Promise<StockfishResponse | null> {
    // Directly use the imported service function
    return fetchStockfishAnalysis(fen); // Add depth if needed, defaults to DEFAULT_DEPTH
}

// Placeholder implementation for move classification logic
export function classifyMove(playerMoveLan: string, analysis: StockfishResponse, playerColor: 'white' | 'black'): MoveQuality {
    // --- Implement your Brilliant/Great move logic here ---
    // This should be similar to the logic in app/api/player-analysis/route.ts analyzeGamesWithStockfish function

    if (!analysis.success || !analysis.bestmove) {
        return MoveQuality.NORMAL; // Cannot classify without successful analysis
    }

    const stockfishBestMoveLan = analysis.bestmove.trim(); // UCI format e.g., "e2e4"

    // Example Criteria (Needs refinement based on player-analysis logic):
    const GREAT_MOVE_EVAL_THRESHOLD = 2.5;
    const BRILLIANT_MOVE_EVAL_THRESHOLD = 5.0;

    let isGreat = false;
    let isBrilliant = false;

    if (playerMoveLan === stockfishBestMoveLan) {
        const currentEval = analysis.evaluation;
        const mateFound = analysis.mate !== null && analysis.mate !== undefined;

        if (mateFound) {
            isGreat = true; // Finding mate is great
             console.log(`   -> [Classify] GREAT MOVE (Mate Found!): Mate in ${analysis.mate}`);
        } else if (currentEval !== null) {
            if (playerColor === 'white') {
                if (currentEval >= BRILLIANT_MOVE_EVAL_THRESHOLD) isBrilliant = true;
                if (currentEval >= GREAT_MOVE_EVAL_THRESHOLD) isGreat = true;
            } else { // Player is black
                if (currentEval <= -BRILLIANT_MOVE_EVAL_THRESHOLD) isBrilliant = true;
                if (currentEval <= -GREAT_MOVE_EVAL_THRESHOLD) isGreat = true;
            }

             if (isBrilliant) {
                 console.log(`   -> [Classify] BRILLIANT MOVE (Eval Threshold Met): Eval ${currentEval}`);
             } else if (isGreat) {
                 console.log(`   -> [Classify] GREAT MOVE (Eval Threshold Met): Eval ${currentEval}`);
             }
        }
    } else {
         console.log(`   -> [Classify] Not the Best Move (Player: ${playerMoveLan}, Best: ${stockfishBestMoveLan})`);
    }

    // Determine final quality (Brilliant implies Great)
    if (isBrilliant) {
        return MoveQuality.BRILLIANT;
    } else if (isGreat) {
        return MoveQuality.GREAT;
    } else {
        return MoveQuality.NORMAL;
    }
}
