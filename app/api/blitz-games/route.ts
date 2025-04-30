import { type NextRequest, NextResponse } from "next/server";
import type { ChessComGame } from "@/lib/types"; // Assuming ChessComGame includes pgn

// Define a simple type for the game data we return initially
interface BasicGameData {
  url: string;
  pgn: string;
  time_control: string;
  time_class: string;
  end_time: number;
  rated: boolean;
  white: {
    rating: number;
    result: string;
    username: string;
  };
  black: {
    rating: number;
    result: string;
    username: string;
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  const countParam = searchParams.get("count");
  const count = countParam ? parseInt(countParam, 10) : 5; // Default to 5 games

  if (!username) {
    return NextResponse.json(
      { error: "Username is required" },
      { status: 400 }
    );
  }

  try {
    // Fetch player archives
    const archivesResponse = await fetch(
      `https://api.chess.com/pub/player/${username}/games/archives`
    );
    if (!archivesResponse.ok) {
      if (archivesResponse.status === 404) {
        return NextResponse.json({ error: "Player not found or no archives" }, { status: 404 });
      }
      throw new Error(`Failed to fetch archives: ${archivesResponse.statusText}`);
    }
    const archivesData = await archivesResponse.json();

    if (!archivesData.archives || archivesData.archives.length === 0) {
        return NextResponse.json({ games: [] }); // No archives found
    }

    // Get the most recent archive URL
    const latestArchiveUrl = archivesData.archives[archivesData.archives.length - 1];

    // Fetch games from the latest archive
    const gamesResponse = await fetch(latestArchiveUrl);
    if (!gamesResponse.ok) {
      throw new Error(`Failed to fetch games from archive: ${gamesResponse.statusText}`);
    }
    const gamesData = await gamesResponse.json();
    const allGames: ChessComGame[] = gamesData.games || [];

    // Filter for blitz games and sort by end_time descending
    const blitzGames = allGames
      .filter((game) => game.time_class === "blitz" && game.pgn) // Ensure PGN exists
      .sort((a, b) => b.end_time - a.end_time);

    // Take the latest 'count' games
    const latestBlitzGames = blitzGames.slice(0, count);

    // Process games to extract only necessary initial information
    const processedGames: BasicGameData[] = latestBlitzGames.map((game) => ({
      url: game.url,
      pgn: game.pgn, // Include PGN
      time_control: game.time_control,
      time_class: game.time_class,
      end_time: game.end_time,
      rated: game.rated,
      white: game.white,
      black: game.black,
    }));

    return NextResponse.json({ games: processedGames });

  } catch (error) {
    console.error(`Error fetching games for ${username}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch games", details: errorMessage },
      { status: 500 }
    );
  }
}
