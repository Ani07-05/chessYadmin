import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BlitzGameCard } from "@/components/blitz-game-card"
import type { GameData } from "@/lib/types"

interface BlitzGamesListProps {
  games: GameData[]
}

export function BlitzGamesList({ games }: BlitzGamesListProps) {
  // Calculate total good and great moves across all games
  const totalGoodMoves = games.reduce((sum, game) => sum + game.goodMovesCount, 0)
  const totalGreatMoves = games.reduce((sum, game) => sum + game.greatMovesCount, 0)

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-xl">Blitz Games This Week</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-purple-900/30 text-purple-300 border-purple-800">
              Total Games: {games.length}
            </Badge>
            <Badge variant="outline" className="bg-blue-900/30 text-blue-300 border-blue-800">
              Good Moves: {totalGoodMoves}
            </Badge>
            <Badge variant="outline" className="bg-green-900/30 text-green-300 border-green-800">
              Great Moves: {totalGreatMoves}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {games.map((game, index) => (
            <BlitzGameCard key={index} game={game} />
          ))}
          {games.length === 0 && <p className="text-center text-gray-400 py-8">No blitz games found this week.</p>}
        </div>
      </CardContent>
    </Card>
  )
}
