import type { StockfishAnalysis } from "./types";

// !!! IMPORTANT: Replace this URL with the actual URL of your hosted Stockfish container API !!!
const STOCKFISH_API_URL = "http://195.35.20.4:5000/analyze"; // Keep the endpoint path
// const STOCKFISH_API_URL = "http://localhost:5000/analyze"; // Changed to localhost
export const DEFAULT_DEPTH = 15; // Default depth, adjust if needed

/**
 * Fetches analysis from the external Stockfish API for a given FEN position.
 * @param fen The FEN string of the position to analyze.
 * @param depth The search depth. Defaults to DEFAULT_DEPTH.
 * @returns A Promise resolving to the StockfishAnalysis object for the single FEN, or null if an error occurs.
 */
export async function fetchStockfishAnalysis(fen: string, depth: number = DEFAULT_DEPTH): Promise<StockfishAnalysis | null> {
  // Validate depth if your container has limits (e.g., max 15 or 20)
  const MAX_SERVICE_DEPTH = 15; // Match the server's MAX_ANALYSIS_DEPTH if needed
  const validDepth = Math.max(1, Math.min(depth, MAX_SERVICE_DEPTH));

  const apiUrl = STOCKFISH_API_URL; // This constant holds the target URL

  try {
    console.log(`[Stockfish Service] Calling POST: ${apiUrl} for FEN: ${fen}, Depth: ${validDepth}`); // Log the call with FEN and depth
    const response = await fetch(apiUrl, { // The fetch call uses this URL
      method: "POST",
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fen: fen, // Send the single FEN string directly
        depth: validDepth
      })
    });

    if (!response.ok) {
      let errorBody = null;
      try {
        errorBody = await response.json();
      } catch (e) { /* Ignore if response is not JSON */ }
      console.error(`Hosted Stockfish API error (${response.status}) for FEN ${fen}:`, errorBody || response.statusText);
      // Return null, but include error details if available in the response body
      // This helps debugging on the client-side API route
      return {
          success: false,
          evaluation: null,
          mate: null,
          bestmove: "", // Provide empty string for consistency
          error: `API Error ${response.status}: ${errorBody?.error || response.statusText}`
      };
    }

    // Expect response like: { "success": true, "evaluation": 0.5, ... }
    const analysisData: StockfishAnalysis = await response.json();

    // Check the success flag within the result object
    if (analysisData.success === false) {
      console.error(`Hosted Stockfish API returned success=false for FEN ${fen}. Result:`, JSON.stringify(analysisData));
      // Optionally log the specific error from the analysis data if available
      if (analysisData.error) {
        console.error(`Stockfish analysis error for FEN ${fen}: ${analysisData.error}`);
      }
      // Return the error object received from the server
      return analysisData;
    }

    // Check if essential data is present (optional but good practice)
    // Note: evaluation can be 0, so check for undefined/null specifically if needed
    if (typeof analysisData.bestmove === 'undefined' /* || typeof analysisData.evaluation === 'undefined' */) {
        console.error(`Hosted Stockfish API result missing essential fields for FEN ${fen}. Result:`, JSON.stringify(analysisData));
        return {
            success: false,
            evaluation: null,
            mate: null,
            bestmove: "",
            error: "API result missing essential fields"
        };
    }


    console.log(`[Stockfish Service] Success for FEN ${fen}. Eval: ${analysisData.evaluation ?? 'N/A'}, Mate: ${analysisData.mate ?? 'N/A'}, Best: ${analysisData.bestmove}`);
    return analysisData; // Return the single analysis object

  } catch (error) {
    console.error(`Error calling hosted Stockfish API for FEN ${fen}:`, error);
    // Return an error object matching the StockfishAnalysis structure
    return {
        success: false,
        evaluation: null,
        mate: null,
        bestmove: "",
        error: error instanceof Error ? error.message : "Unknown network or fetch error"
    };
  }
}
