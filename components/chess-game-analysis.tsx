"use client"

import { useState } from "react"
import { SearchBar } from "@/components/search-bar"
import { BlitzGamesList } from "@/components/blitz-games-list"
import { Loader2 } from "lucide-react"
import type { GameData } from "@/lib/types"

export function ChessGameAnalysis() {
  const [username, setUsername] = useState<string>("")
  const [games, setGames] = useState<GameData[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (searchUsername: string) => {
    if (!searchUsername) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/blitz-games?username=${searchUsername}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`)
      }

      const data = await response.json()
      setGames(data.games)
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
          Chess Blitz Game Analysis
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

      {games.length > 0 && !isLoading && (
        <div className="space-y-8">
          <BlitzGamesList games={games} />
        </div>
      )}

      {games.length === 0 && !isLoading && !error && username && (
        <div className="text-center py-10">
          <p className="text-gray-400">No blitz games found for this player in the current week.</p>
        </div>
      )}
    </div>
  )
}
