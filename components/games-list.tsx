import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GameCard } from "@/components/game-card"
import type { GameData } from "@/lib/types"

interface GamesListProps {
  games: GameData[]
}

export function GamesList({ games }: GamesListProps) {
  // Group games by time class
  const blitzGames = games.filter((game) => game.time_class === "blitz")
  const rapidGames = games.filter((game) => game.time_class === "rapid")
  const bulletGames = games.filter((game) => game.time_class === "bullet")
  const dailyGames = games.filter((game) => game.time_class === "daily")

  // Default to blitz tab if available, otherwise use the first non-empty category
  const defaultTab =
    blitzGames.length > 0 ? "blitz" : rapidGames.length > 0 ? "rapid" : bulletGames.length > 0 ? "bullet" : "daily"

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Recent Games This Week</CardTitle>
          <div className="flex space-x-2">
            <Badge variant="outline" className="bg-purple-900/30 text-purple-300 border-purple-800">
              Total: {games.length}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger
              value="blitz"
              disabled={blitzGames.length === 0}
              className="data-[state=active]:bg-purple-900/30"
            >
              Blitz ({blitzGames.length})
            </TabsTrigger>
            <TabsTrigger
              value="rapid"
              disabled={rapidGames.length === 0}
              className="data-[state=active]:bg-purple-900/30"
            >
              Rapid ({rapidGames.length})
            </TabsTrigger>
            <TabsTrigger
              value="bullet"
              disabled={bulletGames.length === 0}
              className="data-[state=active]:bg-purple-900/30"
            >
              Bullet ({bulletGames.length})
            </TabsTrigger>
            <TabsTrigger
              value="daily"
              disabled={dailyGames.length === 0}
              className="data-[state=active]:bg-purple-900/30"
            >
              Daily ({dailyGames.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="blitz" className="space-y-4">
            {blitzGames.map((game, index) => (
              <GameCard key={index} game={game} />
            ))}
            {blitzGames.length === 0 && (
              <p className="text-center text-gray-400 py-8">No blitz games found this week.</p>
            )}
          </TabsContent>

          <TabsContent value="rapid" className="space-y-4">
            {rapidGames.map((game, index) => (
              <GameCard key={index} game={game} />
            ))}
            {rapidGames.length === 0 && (
              <p className="text-center text-gray-400 py-8">No rapid games found this week.</p>
            )}
          </TabsContent>

          <TabsContent value="bullet" className="space-y-4">
            {bulletGames.map((game, index) => (
              <GameCard key={index} game={game} />
            ))}
            {bulletGames.length === 0 && (
              <p className="text-center text-gray-400 py-8">No bullet games found this week.</p>
            )}
          </TabsContent>

          <TabsContent value="daily" className="space-y-4">
            {dailyGames.map((game, index) => (
              <GameCard key={index} game={game} />
            ))}
            {dailyGames.length === 0 && (
              <p className="text-center text-gray-400 py-8">No daily games found this week.</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
