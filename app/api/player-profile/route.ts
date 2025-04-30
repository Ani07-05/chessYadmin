import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json(
      { error: "Username is required" },
      { status: 400 }
    );
  }

  try {
    const statsResponse = await fetch(
      `https://api.chess.com/pub/player/${username}/stats`
    );

    if (!statsResponse.ok) {
      if (statsResponse.status === 404) {
        return NextResponse.json(
          { error: "Player not found" },
          { status: 404 }
        );
      }
      throw new Error(`Failed to fetch player stats: ${statsResponse.statusText}`);
    }

    const statsData = await statsResponse.json();
    const blitzRating = statsData.chess_blitz?.last?.rating ?? null;

    return NextResponse.json({ blitzRating });
  } catch (error) {
    console.error("Error fetching player profile:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch player profile", details: errorMessage },
      { status: 500 }
    );
  }
}
