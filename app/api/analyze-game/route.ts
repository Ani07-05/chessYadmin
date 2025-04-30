import { type NextRequest, NextResponse } from "next/server";
// Assume these helper functions exist and are implemented based on your log's logic
import { parsePgn, getPlayerMoves, getFenForMove, callStockfishService, classifyMove, MoveQuality } from "@/lib/analysis-utils"; // You need to create/define these

interface AnalyzeRequestBody {
    pgn: string;
    username: string; // To identify which player's moves to analyze
    gameUrl?: string; // Optional, for logging
}

export async function POST(request: NextRequest) {
    try {
        const body: AnalyzeRequestBody = await request.json();
        const { pgn, username, gameUrl } = body;

        if (!pgn || !username) {
            return NextResponse.json({ error: "Missing pgn or username" }, { status: 400 });
        }

        console.log(`[API Analyze] Starting analysis for user ${username}, game: ${gameUrl || 'N/A'}`);

        const gameData = parsePgn(pgn); // Parses PGN into structured data (headers, moves)
        if (!gameData) {
            throw new Error("Failed to parse PGN");
        }

        const playerColor = gameData.headers.White?.toLowerCase() === username.toLowerCase() ? 'white' : 'black';
        const playerMoves = getPlayerMoves(gameData.moves, playerColor); // Gets only the moves made by the specified player

        let brilliantMoves = 0;
        let greatMoves = 0;

        for (let i = 0; i < playerMoves.length; i++) {
            const moveInfo = playerMoves[i];
            const fen = getFenForMove(gameData, moveInfo.moveNumber, playerColor); // Gets FEN *before* the move was made

            if (!fen) {
                console.warn(`[API Analyze] Could not get FEN for move ${moveInfo.moveNumber}. Skipping.`);
                continue;
            }

            console.log(`[API Analyze] Stockfish Call - Move #${moveInfo.moveNumber}, FEN: ${fen}`);
            try {
                const analysis = await callStockfishService(fen); // Calls your Stockfish service
                console.log(`[API Analyze] Stockfish Resp - FEN: ${fen}, Analysis: ${JSON.stringify(analysis)}`);

                if (analysis && analysis.success) {
                    const quality = classifyMove(moveInfo.moveNotation, analysis, playerColor); // Classifies move based on your logic/thresholds

                    console.log(`[API Analyze] Check Move Quality - Player: ${moveInfo.moveNotation}, Best: ${analysis.bestmove}, EvalAfterBest: ${analysis.evaluation}, Mate: ${analysis.mate}, Result: ${quality}`);

                    if (quality === MoveQuality.BRILLIANT) {
                        brilliantMoves++;
                    } else if (quality === MoveQuality.GREAT) {
                        greatMoves++;
                    }
                } else {
                     console.warn(`[API Analyze] Stockfish analysis failed or unsuccessful for FEN: ${fen}`);
                }
            } catch (stockfishError) {
                 console.error(`[API Analyze] Stockfish service error for FEN ${fen}:`, stockfishError);
                 // Decide if you want to stop analysis or continue
            }
        }

        console.log(`[API Analyze] Finished analysis for game ${gameUrl || 'N/A'}. Great: ${greatMoves}, Brilliant: ${brilliantMoves}.`);

        return NextResponse.json({ brilliantMoves, greatMoves });

    } catch (error) {
        console.error("[API Analyze] Error analyzing game:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { error: "Failed to analyze game", details: errorMessage },
            { status: 500 }
        );
    }
}

// NOTE: You need to create 'lib/analysis-utils.ts' and implement:
// - parsePgn(pgn: string): Parses PGN string. Use a library like 'chess.js' or '@mliebelt/pgn-parser'.
// - getPlayerMoves(moves: any[], playerColor: 'white' | 'black'): Filters moves for the player.
// - getFenForMove(gameData: any, moveNumber: number, playerColor: 'white' | 'black'): Generates FEN for a specific board state. 'chess.js' can do this.
// - callStockfishService(fen: string): Makes the HTTP POST request to your Stockfish endpoint.
// - classifyMove(playerMove: string, analysis: StockfishResponse, playerColor: 'white' | 'black'): Implements your brilliant/great move logic based on the analysis response.
// - MoveQuality enum/type
// - StockfishResponse type
