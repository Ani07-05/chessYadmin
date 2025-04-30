"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import { StatsCards } from "@/components/stats-cards";
import { MovesAnalysis } from "@/components/moves-analysis";
// import { LevelProgress } from "@/components/level-progress"; // Keep if used
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; // Keep if used
import { Badge } from "@/components/ui/badge"; // Keep if used
import { Button } from "@/components/ui/button"; // Keep if used for other things
import type { PlayerData, AnalyzedGameSummary } from "@/lib/types"; // Use PlayerData directly
import { formatDate } from "@/lib/utils"; // Keep if used
// import { SearchBar } from "@/components/search-bar"; // Remove if Input is used directly
import { BlitzGameCard } from "@/components/blitz-game-card";
import { useToast } from "@/hooks/use-toast"; // Or components/ui/use-toast
import { CriticalMoveViewer } from "@/components/critical-move-viewer"; // Import the new component


// Remove PlayerProfile interface, use PlayerData from lib/types

interface GameAnalysisResult {
  brilliantMoves?: number;
  greatMoves?: number;
  error?: string;
  analyzing?: boolean; // To show per-game loading state
}

// Basic game data structure expected from /api/blitz-games
interface BasicGameData {
  url: string;
  pgn: string;
  time_control: string;
  time_class: string;
  end_time: number;
  rated: boolean;
  white: { rating: number; result: string; username: string };
  black: { rating: number; result: string; username: string };
}

type AnalysisStatus =
  | "idle"
  | "fetching_data" // Renamed state
  | "ready" // Ready to analyze or display fetched data
  | "analyzing"
  | "complete"
  | "error";

export default function DashboardPage() {
  const [usernameInput, setUsernameInput] = useState<string>(""); // Input state
  const [usernameToFetch, setUsernameToFetch] = useState<string>(""); // State to trigger fetch
  const [playerData, setPlayerData] = useState<PlayerData | null>(null); // Use PlayerData
  const [recentGames, setRecentGames] = useState<BasicGameData[]>([]);
  const [analysisResults, setAnalysisResults] = useState<Record<string, GameAnalysisResult>>({}); // Keyed by game URL
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");
  const [analyzingGameIndex, setAnalyzingGameIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch data when usernameToFetch changes (triggered by handleSearch)
  useEffect(() => {
    const fetchUserData = async () => {
      if (!usernameToFetch) return; // Only fetch if usernameToFetch is set

      setAnalysisStatus("fetching_data"); // Use combined fetching state
      setError(null);
      setPlayerData(null); // Reset PlayerData
      setRecentGames([]);
      setAnalysisResults({});
      // Reset analysis status if needed, e.g., if re-fetching for a new user
      if (analysisStatus === 'complete') setAnalysisStatus('idle');


      try {
        // Fetch full PlayerData
        const analysisRes = await fetch(`/api/player-analysis?username=${usernameToFetch}`);
        if (!analysisRes.ok) {
          const errorData = await analysisRes.json();
          throw new Error(errorData.error || `Failed to fetch player analysis (${analysisRes.status})`);
        }
        const fullPlayerData: PlayerData = await analysisRes.json();
        setPlayerData(fullPlayerData); // Display rating and stats

        // Fetch games (still needed for separate display/analysis trigger)
        // setAnalysisStatus("fetching_games"); // No longer needed
        const gamesRes = await fetch(`/api/blitz-games?username=${usernameToFetch}&count=5`);
        if (!gamesRes.ok) {
           const errorData = await gamesRes.json();
           // Don't throw here, player data is already loaded, just show toast for games
           toast({ title: "Warning", description: `Failed to fetch recent games: ${errorData.error || gamesRes.statusText}`, variant: "destructive" });
           setRecentGames([]);
        } else {
            const gamesData = await gamesRes.json();
            const fetchedGames = gamesData.games || [];
            setRecentGames(fetchedGames); // Display games list
            if (fetchedGames.length === 0) {
                toast({ title: "No recent blitz games found." });
            }
        }
        // Data is fetched, ready to display or analyze
        setAnalysisStatus(recentGames.length > 0 ? "ready" : "idle");

      } catch (err) {
        console.error(err);
        const message = err instanceof Error ? err.message : "An unknown error occurred";
        setError(message);
        setAnalysisStatus("error");
        toast({ title: "Error", description: message, variant: "destructive" });
      }
    };

    fetchUserData();
    // React Hook useEffect has a missing dependency: 'recentGames.length'. Either include it or remove the dependency array.
    // -> We intentionally omit recentGames.length as we only want this effect to run when usernameToFetch changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usernameToFetch, toast]); // Run only when usernameToFetch changes

  // Renamed from handleSearch to triggerFetch to avoid confusion
  const triggerFetch = () => {
    if (!usernameInput || isLoading || isAnalyzing) return; // Prevent fetch if input empty or busy
    setUsernameToFetch(usernameInput); // Set the state that triggers the useEffect
  };

  const isLoading = analysisStatus === "fetching_data"; // Updated loading state check
  const isAnalyzing = false; // Analysis is now part of fetching_data

  return (
    <main className="flex flex-col min-h-screen p-4 md:p-8 space-y-6 bg-gray-950 text-gray-100">
      {/* Search Bar */}
      <div className="flex justify-center items-center gap-2 mb-4">
        <Input
          type="search"
          placeholder="Search Chess.com User..."
          className="w-full max-w-md bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500 focus:ring-purple-500 focus:border-purple-500"
          value={usernameInput}
          onChange={(e) => setUsernameInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && triggerFetch()} // Trigger fetch on Enter
          disabled={isLoading || isAnalyzing} // Disable during loading/analyzing
        />
        <Button onClick={triggerFetch} disabled={isLoading || isAnalyzing || !usernameInput}>
           <Search className="h-4 w-4 mr-2" />
           Fetch
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
          <span className="ml-4 text-lg">Fetching player data and analyzing games...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Content Area - Display only when playerData is loaded and not loading */}
      {playerData && !isLoading && (
        <div className="space-y-8">
          <h1 className="text-center text-2xl font-semibold text-gray-200">
            Analysis for <span className="text-purple-400">{playerData.username}</span>
          </h1>
          {/* StatsCards uses playerData */}
          <StatsCards playerData={playerData} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* MovesAnalysis uses playerData */}
            <MovesAnalysis playerData={playerData} />
            {/* Replace Placeholder with CriticalMoveViewer */}
            <CriticalMoveViewer playerData={playerData} />
          </div>

          {/* Analyze Games Section - Removed, analysis happens on fetch */}
          {/* {recentGames.length > 0 && ( ... )} */}

          {/* Recent Games List - Removed, analysis integrated into MovesAnalysis/CriticalMoveViewer */}
          {/* {recentGames.length > 0 && ( ... )} */}

          {/* Optional: Message if player data loaded but no recent games found */}
          {/* This might need adjustment based on whether analysisSummaries exist */}
          {playerData && playerData.recentGamesAnalysis.length === 0 && !isLoading && (
             <div className="text-center py-10">
                <p className="text-gray-500">No recent games found or analyzed for {playerData.username}.</p>
             </div>
          )}
        </div>
      )}

      {/* Initial state / No user searched */}
      {!usernameToFetch && !isLoading && !error && (
        <div className="text-center py-10">
          <p className="text-gray-500">Enter a Chess.com username above and click Fetch.</p>
        </div>
      )}
    </main>
  );
}
