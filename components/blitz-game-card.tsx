"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Clock, User } from "lucide-react"
import { useState } from "react"
import type { GameData } from "@/lib/types"
import { formatDate } from "@/lib/utils"

interface BlitzGameCardProps {
  game: GameData
}

export function BlitzGameCard({ game }: BlitzGameCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Determine result text and color
  const getResultBadge = (result: string) => {
    switch (result) {
      case "win":
        return <Badge className="bg-green-600">Win</Badge>
      case "lose":
        return <Badge className="bg-red-600">Loss</Badge>
      case "draw":
        return <Badge className="bg-yellow-600">Draw</Badge>
      default:
        return <Badge className="bg-gray-600">{result}</Badge>
    }
  }

  // Get move quality badge
  const getMoveQualityBadge = (quality: string) => {
    switch (quality) {
      case "brilliant":
        return <Badge className="bg-amber-500">Brilliant</Badge>
      case "great":
        return <Badge className="bg-green-500">Great</Badge>
      case "good":
        return <Badge className="bg-blue-500">Good</Badge>
      case "inaccuracy":
        return <Badge className="bg-yellow-500">Inaccuracy</Badge>
      case "mistake":
        return <Badge className="bg-orange-500">Mistake</Badge>
      case "blunder":
        return <Badge className="bg-red-500">Blunder</Badge>
      default:
        return <Badge className="bg-gray-500">{quality}</Badge>
    }
  }

  return (
    <Card className="bg-gray-800 border-gray-700 overflow-hidden">
      <CardContent className="p-0">
        <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="bg-purple-900/30 text-purple-300 border-purple-800">
                {game.time_control}
              </Badge>
              <Badge variant="outline" className="bg-gray-800 text-gray-300 border-gray-700">
                {formatDate(game.end_time)}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-white" />
                <span className="font-medium">{game.white.username}</span>
                <span className="text-gray-400">({game.white.rating})</span>
                {getResultBadge(game.white.result)}
              </div>

              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{game.black.username}</span>
                <span className="text-gray-400">({game.black.rating})</span>
                {getResultBadge(game.black.result)}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">Blitz</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Last move:</span>
              {getMoveQualityBadge(game.lastMoveQuality)}
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-900/20 text-blue-300 border-blue-800">
                Good: {game.goodMovesCount}
              </Badge>
              <Badge variant="outline" className="bg-green-900/20 text-green-300 border-green-800">
                Great: {game.greatMovesCount}
              </Badge>
            </div>
          </div>
        </div>

        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full rounded-none border-t border-gray-700 flex items-center justify-center py-2 h-10"
            >
              {isOpen ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  <span>Hide FEN positions</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  <span>Show FEN positions</span>
                </>
              )}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="p-4 border-t border-gray-700 space-y-3">
              <h4 className="text-sm font-medium text-gray-400 mb-2">Last 7 Positions (FEN)</h4>

              {game.lastPositions.map((position, index) => (
                <div key={index} className="bg-gray-900 p-3 rounded-md">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-400">Position {game.lastPositions.length - index}</span>
                    {index === 0 && (
                      <Badge className="text-xs" variant="outline">
                        Last Position
                      </Badge>
                    )}
                  </div>
                  <code className="text-xs text-gray-300 block overflow-x-auto whitespace-nowrap pb-1">{position}</code>
                </div>
              ))}

              <div className="mt-4 pt-4 border-t border-gray-700">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Last Move Analysis</h4>
                <div className="bg-gray-900 p-3 rounded-md">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-gray-400 block mb-1">Move</span>
                      <span className="font-mono">{game.lastMove}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 block mb-1">Evaluation</span>
                      <span>{game.evaluation}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 block mb-1">Best Move</span>
                      <span className="font-mono">{game.bestMove}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 block mb-1">Quality</span>
                      {getMoveQualityBadge(game.lastMoveQuality)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}
