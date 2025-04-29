"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, ExternalLink, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { PlayerData, AnalyzedGameSummary } from "@/lib/types"

// Helper to format date
const formatDate = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleDateString()
}

// Helper for result badge
const getResultBadge = (result: string) => {
  switch (result) {
    case "win":
      return <Badge variant="outline">Win</Badge>
    case "loss":
      return <Badge variant="outline">Loss</Badge>
    default:
      return <Badge variant="outline">{result}</Badge>
  }
}

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchedUser, setSearchedUser] = useState<string | null>(null)
  const [playerData, setPlayerData] = useState<PlayerData | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalyzedGameSummary[] | null>(null)
  const [currentLevelData, setCurrentLevelData] = useState<{
    elo: number
    puzzlePoints: number
    greatMoves: number
  } | null>({
    elo: 1500,
    puzzlePoints: 1000,
    greatMoves: 10,
  })

  // Initial data fetch effect
  useEffect(() => {
    const fetchUserData = async () => {
      if (!searchedUser) return

      setIsLoading(true)
      setError(null)
      setPlayerData(null)
      setAnalysisResult(null)
      setIsAnalyzing(false)

      try {
        const response = await fetch(`/api/player-analysis?username=${searchedUser}`)
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Failed to fetch user data (${response.status})`)
        }
        const data: PlayerData = await response.json()
        setPlayerData(data)

        if (data.blitzRating) {
          const targetElo = Math.ceil(data.blitzRating / 100) * 100
          setCurrentLevelData((prev) => ({
            ...(prev ?? { elo: 1200, puzzlePoints: 1000, greatMoves: 10 }),
            elo: targetElo,
          }))
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        setError(error instanceof Error ? error.message : "An unknown error occurred")
        setPlayerData(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [searchedUser])

  const handleSearch = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      const query = event.currentTarget.value.trim()
      if (query) {
        setSearchedUser(query)
      }
    }
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value)
  }

  // Function to trigger analysis
  const handleAnalyzeGames = async () => {
    if (!searchedUser || isAnalyzing || isLoading) return

    setIsAnalyzing(true)
    setError(null)
    setAnalysisResult(null)

    try {
      console.log(`Requesting analysis for ${searchedUser}...`)
      const response = await fetch(`/api/analyze-moves?username=${searchedUser}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to analyze moves (${response.status})`)
      }
      const data: AnalyzedGameSummary[] = await response.json()
      console.log(`Analysis complete for ${searchedUser}:`, data)
      setAnalysisResult(data)
    } catch (error) {
      console.error("Error analyzing games:", error)
      setError(error instanceof Error ? error.message : "An unknown error occurred during analysis")
      setAnalysisResult(null)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <main className="flex flex-col min-h-screen p-4 md:p-8 space-y-6">
      {/* Search Bar */}
      <div className="flex justify-center mb-4">
        <Input
          type="search"
          placeholder="Search Chess.com User and press Enter..."
          className="w-full max-w-md"
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleSearch}
          disabled={isLoading || isAnalyzing}
        />
      </div>

      {/* Loading and Error States */}
      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-muted-foreground">Loading data for {searchedUser}...</p>
        </div>
      )}
      {error && !isLoading && (
        <div className="bg-destructive/20 border border-destructive p-4 text-center">
          <p className="text-destructive-foreground">{error}</p>
        </div>
      )}

      {/* Data Display */}
      {!isLoading && playerData && (
        <>
          {/* Top Row Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Current Blitz Rating</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{playerData.blitzRating ?? "N/A"}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Number of levels crossed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{playerData.levelsCrossed ?? "N/A"}</div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Games & Analysis Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Most Recent Game & Analysis</CardTitle>
              <CardDescription>The last game found in the most recent archive.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* List of Games (will show only one) */}
              <div className="space-y-3">
                {playerData.recentGamesAnalysis.length > 0 ? (
                  playerData.recentGamesAnalysis.map((game, index) => (
                    <div key={index} className="bg-muted/50 p-3 text-sm border border-border">
                      <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {game.whiteUsername} ({getResultBadge(game.whiteResult)}) vs {game.blackUsername} (
                            {getResultBadge(game.blackResult)})
                          </span>
                          <Badge variant="secondary">{formatDate(game.endTime)}</Badge>
                        </div>
                        <a
                          href={game.gameUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center text-xs"
                        >
                          View Game <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">No recent game found in the archive.</p>
                )}
              </div>

              {/* Analysis Trigger and Results */}
              <div className="border-t border-border pt-4 space-y-4">
                <Button
                  onClick={handleAnalyzeGames}
                  disabled={isLoading || isAnalyzing || playerData.recentGamesAnalysis.length === 0}
                  className="w-full md:w-auto"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    "Analyze Most Recent Game (Stockfish)"
                  )}
                </Button>

                {/* Analysis Result Display */}
                {(isAnalyzing || analysisResult) && (
                  <Card className="border-dashed border-primary/50">
                    <CardHeader>
                      <CardTitle className="text-base font-medium">Stockfish Analysis Result</CardTitle>
                      <CardDescription>Moves matching Stockfish's best move in the most recent game.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isAnalyzing ? (
                        <div className="flex items-center text-muted-foreground">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          <span>Analysis in progress... This may take a while.</span>
                        </div>
                      ) : analysisResult && analysisResult.length > 0 ? (
                        // Display result for the single game
                        <div className="bg-muted/50 p-3 text-sm border border-border">
                          <div className="flex justify-between items-center flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {analysisResult[0].whiteUsername} vs {analysisResult[0].blackUsername}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {formatDate(analysisResult[0].endTime)}
                              </Badge>
                              <a
                                href={analysisResult[0].gameUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline inline-flex items-center text-xs"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                            <div className="flex items-center gap-2 text-lg font-bold">
                              <Zap className="h-5 w-5 text-yellow-400" />
                              <span>{analysisResult[0].greatMovesCount} Great Moves</span>
                            </div>
                          </div>
                        </div>
                      ) : analysisResult ? (
                        <p className="text-muted-foreground text-center py-4">
                          Analysis complete, but no great moves found in the game.
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Levels Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Level Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="current">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="current">Current Level</TabsTrigger>
                  <TabsTrigger value="todo">Todo for next Level</TabsTrigger>
                  <TabsTrigger value="next">Next Level</TabsTrigger>
                </TabsList>
                <TabsContent value="current" className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="elo-current" className="text-base">
                      Elo ({currentLevelData?.elo ?? "..."})
                    </Label>
                    <Checkbox
                      id="elo-current"
                      checked={
                        !!playerData.blitzRating && !!currentLevelData && playerData.blitzRating >= currentLevelData.elo
                      }
                      disabled
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="puzzle-current" className="text-base">
                      Puzzle Points ({currentLevelData?.puzzlePoints ?? "..."})
                    </Label>
                    <Checkbox
                      id="puzzle-current"
                      checked={
                        !!playerData.puzzlePoints &&
                        !!currentLevelData &&
                        playerData.puzzlePoints >= currentLevelData.puzzlePoints
                      }
                      disabled
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="great-current" className="text-base">
                      Great Moves ({currentLevelData?.greatMoves ?? "..."})
                    </Label>
                    <Checkbox
                      id="great-current"
                      checked={
                        !!playerData.totalGreatMoves &&
                        !!currentLevelData &&
                        playerData.totalGreatMoves >= currentLevelData.greatMoves
                      }
                      disabled
                    />
                  </div>
                </TabsContent>
                <TabsContent value="todo" className="mt-4">
                  <p className="text-muted-foreground">{playerData.todoForNextLevel}</p>
                </TabsContent>
                <TabsContent value="next" className="mt-4">
                  <p className="text-muted-foreground">Details about the next level requirements.</p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
      {/* Initial state message */}
      {!isLoading && !playerData && !error && (
        <div className="text-center py-10">
          <p className="text-muted-foreground">Enter a Chess.com username above to view analysis.</p>
        </div>
      )}
    </main>
  )
}
