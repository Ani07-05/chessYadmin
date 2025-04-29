import type React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, Award, LineChart } from "lucide-react"
import type { PlayerData } from "@/lib/types"

interface StatsCardsProps {
  playerData: PlayerData
}

export function StatsCards({ playerData }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard
        title="Rating on Join Date"
        value={playerData.initialRating.toString()}
        icon={<LineChart className="h-5 w-5 text-purple-500" />}
      />
      <StatCard
        title="Current Rating"
        value={playerData.currentRating.toString()}
        icon={<TrendingUp className="h-5 w-5 text-green-500" />}
      />
      <StatCard
        title="Rating Levels Crossed"
        value={playerData.levelsCrossed.toString()}
        icon={<Award className="h-5 w-5 text-amber-500" />}
      />
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string
  icon: React.ReactNode
}

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400">{title}</p>
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
          </div>
          <div className="p-2 bg-gray-800 rounded-full">{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}
