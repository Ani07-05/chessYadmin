import type { StockfishAnalysis } from "./types";

const STOCKFISH_API_URL = "https://stockfish.online/api/s/v2.php";
const DEFAULT_DEPTH = 15; // Default depth, max 15 per API docs

/**
 * Fetches analysis from the external Stockfish API for a given FEN position.
 * @param fen The FEN string of the position to analyze.
 * @param depth The search depth (1-15). Defaults to 15.
 * @returns A Promise resolving to the StockfishAnalysis object or null if an error occurs.
 */
export async function fetchStockfishAnalysis(fen: string, depth: number = DEFAULT_DEPTH): Promise<StockfishAnalysis | null> {
  // Validate depth
  const validDepth = Math.max(1, Math.min(depth, 15)); // Clamp depth between 1 and 15

  // Encode FEN for URL safety
  const encodedFen = encodeURIComponent(fen);
  const apiUrl = `${STOCKFISH_API_URL}?fen=${encodedFen}&depth=${validDepth}`;

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      let errorBody = null;
      try {
        errorBody = await response.json();
      } catch (e) { /* Ignore if response is not JSON */ }
      console.error(`External Stockfish API error (${response.status}) for FEN ${fen}:`, errorBody || response.statusText);
      return null; // Indicate failure
    }

    const data: StockfishAnalysis = await response.json();

    if (!data.success) {
      // Log the full response data when success is false
      console.error(`External Stockfish API returned success=false for FEN ${fen}. Response:`, JSON.stringify(data));
      return null; // Indicate failure
    }

    // Add the requested FEN to the response for context if needed elsewhere
    // (Optional, but can be helpful)
    // data.requestedFen = fen;

    return data; // Return the successful analysis data

  } catch (error) {
    console.error(`Error calling external Stockfish API for FEN ${fen}:`, error);
    return null; // Indicate failure
  }
}
