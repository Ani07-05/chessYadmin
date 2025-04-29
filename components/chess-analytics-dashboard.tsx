"use client"

import { useState } from "react"
import { SearchBar } from "@/components/search-bar"
import { StatsCards } from "@/components/stats-cards"
import { MovesAnalysis } from "@/components/moves-analysis"
import { LevelProgress } from "@/components/level-progress"
import { Loader2 } from "lucide-react"
import type { PlayerData } from "@/lib/types"

export function ChessAnalyticsDashboard() {
  const [username, setUsername] = useState<string>("")
  const [playerData, setPlayerData] = useState<PlayerData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (searchUsername: string) => {
    if (!searchUsername) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/player-analysis?username=${searchUsername}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`)
      }

      const data = await response.json()
      setPlayerData(data)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
          Chess.com Analytics Dashboard
        </h1>
        <SearchBar onSearch={handleSearch} />
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {playerData && !isLoading && (
        <div className="space-y-8">
          <StatsCards playerData={playerData} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MovesAnalysis playerData={playerData} />
            <LevelProgress playerData={playerData} />
          </div>
        </div>
      )}
    </div>
  )
}
