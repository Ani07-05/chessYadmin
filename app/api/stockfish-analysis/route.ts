import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const fen = searchParams.get("fen")
  const depth = searchParams.get("depth") || "20"

  if (!fen) {
    return NextResponse.json({ error: "FEN position is required" }, { status: 400 })
  }

  try {
    const response = await fetch(`https://stockfish.online/api/v2.php?fen=${encodeURIComponent(fen)}&depth=${depth}`)

    if (!response.ok) {
      return NextResponse.json({ error: `Stockfish API error: ${response.statusText}` }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error analyzing position:", error)
    return NextResponse.json({ error: "Failed to analyze position with Stockfish" }, { status: 500 })
  }
}
