import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ChevronRight } from "lucide-react"
import type { PlayerData } from "@/lib/types"

interface LevelProgressProps {
  playerData: PlayerData
}

export function LevelProgress({ playerData }: LevelProgressProps) {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">Level Progress</CardTitle>
          <div className="flex space-x-2">
            <div className="bg-gray-800 px-4 py-2 rounded-md">
              <span className="text-sm text-gray-400">Current Level</span>
              <p className="font-bold">{playerData.currentLevel}</p>
            </div>
            <Button variant="outline" size="sm" className="h-full">
              <ChevronRight className="h-4 w-4" />
              <span className="ml-1">Next Level</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-gray-800 p-4 rounded-md mb-4">
          <h4 className="text-sm font-medium text-gray-400 mb-3">Todo for Next Level</h4>
          <p className="text-sm text-gray-300">{playerData.todoForNextLevel}</p>
        </div>

        <div className="space-y-4 mt-6">
          <h4 className="text-sm font-medium text-gray-400">Requirements</h4>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox id="elo" checked={playerData.requirements.elo} />
              <Label htmlFor="elo" className="text-gray-300">
                Elo
              </Label>
            </div>
            <span className="text-sm font-medium">
              {playerData.currentRating} / {playerData.targetRating}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox id="puzzlePoints" checked={playerData.requirements.puzzlePoints} />
              <Label htmlFor="puzzlePoints" className="text-gray-300">
                Puzzle Points
              </Label>
            </div>
            <span className="text-sm font-medium">
              {playerData.puzzlePoints} / {playerData.targetPuzzlePoints}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox id="brilliantMoves" checked={playerData.requirements.brilliantMoves} />
              <Label htmlFor="brilliantMoves" className="text-gray-300">
                Brilliant Moves
              </Label>
            </div>
            <span className="text-sm font-medium">
              {playerData.brilliantMoves} / {playerData.targetBrilliantMoves}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox id="greatMoves" checked={playerData.requirements.greatMoves} />
              <Label htmlFor="greatMoves" className="text-gray-300">
                Great Moves
              </Label>
            </div>
            <span className="text-sm font-medium">
              {playerData.greatMoves} / {playerData.targetGreatMoves}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
