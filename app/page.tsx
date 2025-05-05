"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronDown } from "lucide-react";
import { StatsCards } from "@/components/stats-cards";
import { MovesAnalysis } from "@/components/moves-analysis";
import { LevelProgress } from "@/components/level-progress";
import { CriticalMoveViewer } from "@/components/critical-move-viewer";
import { useToast } from "@/hooks/use-toast";
import type { PlayerData, HighlightedMove, AnalyzedGameSummary } from "@/lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Define BasicGameData type based on the more comprehensive types in types.ts
interface BasicGameData {
  url: string;
  time_control: string;
  end_time: number;
  white: {
    username: string;
    rating: number;
    result: string;
  };
  black: {
    username: string;
    rating: number;
    result: string;
  };
}

// Add GameAnalysisResult type based on the AnalyzedGameSummary type in types.ts
interface GameAnalysisResult extends AnalyzedGameSummary {}

// Update the AnalysisStatus type to include "ready"
type AnalysisStatus = "idle" | "fetching_data" | "ready" | "complete" | "error";
type AnalysisMode = "idle" | "custom_username" | "google_sheets";

export default function DashboardPage() {
  const [usernameInput, setUsernameInput] = useState<string>("");
  const [usernameToFetch, setUsernameToFetch] = useState<string>("");
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [recentGames, setRecentGames] = useState<BasicGameData[]>([]);
  const [analysisResults, setAnalysisResults] = useState<Record<string, GameAnalysisResult>>({});
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");
  const [analyzingGameIndex, setAnalyzingGameIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("idle");
  const [sheetsUsernames, setSheetsUsernames] = useState<string[]>([]);
  const [loadingUsernames, setLoadingUsernames] = useState<boolean>(false);
  const { toast } = useToast();

  // Fetch usernames from Google Sheets
  const fetchSheetsUsernames = async () => {
    try {
      setLoadingUsernames(true);
      const response = await fetch("/api/google-sheets");
      if (!response.ok) {
        throw new Error(`Failed to fetch usernames: ${response.statusText}`);
      }
      const data = await response.json();
      setSheetsUsernames(data.usernames || []);
    } catch (err) {
      console.error("Error fetching usernames:", err);
      toast({ 
        title: "Error", 
        description: err instanceof Error ? err.message : "Failed to fetch usernames",
        variant: "destructive"
      });
    } finally {
      setLoadingUsernames(false);
    }
  };

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
        setAnalysisStatus("ready");

      } catch (err) {
        console.error(err);
        const message = err instanceof Error ? err.message : "An unknown error occurred";
        setError(message);
        setAnalysisStatus("error");
        toast({ title: "Error", description: message, variant: "destructive" });
      }
    };

    fetchUserData();
  }, [usernameToFetch, toast]); // Run only when usernameToFetch changes

  // Renamed from handleSearch to triggerFetch to avoid confusion
  const triggerFetch = () => {
    if (!usernameInput || isLoading || isAnalyzing) return; // Prevent fetch if input empty or busy
    setUsernameToFetch(usernameInput); // Set the state that triggers the useEffect
  };

  const isLoading = analysisStatus === "fetching_data"; // Updated loading state check
  const isAnalyzing = false; // Analysis is now part of fetching_data

  // Handle username selection from dropdown
  const handleUsernameSelect = (username: string) => {
    setUsernameInput(username);
    setUsernameToFetch(username);
  };

  return (
    <main className="flex flex-col min-h-screen p-4 md:p-8 space-y-6 bg-gray-950 text-gray-100">
      {/* Initial Options - only shown in idle mode */}
      {analysisMode === "idle" && !usernameToFetch && (
        <div className="flex flex-col items-center justify-center space-y-8 py-16">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            Chess Analytics Dashboard
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
            <Card className="bg-gray-900 border-gray-800 hover:border-purple-500 transition-colors cursor-pointer"
                  onClick={() => setAnalysisMode("custom_username")}>
              <CardHeader>
                <CardTitle>Analyze Custom Username</CardTitle>
                <CardDescription>Enter any Chess.com username to analyze</CardDescription>
              </CardHeader>
              <CardContent>
                <Search className="h-16 w-16 mx-auto text-purple-400 opacity-80" />
              </CardContent>
            </Card>
            
            <Card className="bg-gray-900 border-gray-800 hover:border-purple-500 transition-colors cursor-pointer"
                  onClick={() => {
                    setAnalysisMode("google_sheets");
                    fetchSheetsUsernames();
                  }}>
              <CardHeader>
                <CardTitle>Analyze from Google Sheets</CardTitle>
                <CardDescription>Select a username from your Google Sheet</CardDescription>
              </CardHeader>
              <CardContent>
                <ChevronDown className="h-16 w-16 mx-auto text-purple-400 opacity-80" />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Custom Username Search Bar */}
      {analysisMode === "custom_username" && (
        <div className="flex flex-col items-center space-y-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            Chess Analytics Dashboard
          </h1>
          <div className="flex justify-center items-center gap-2 mb-4 w-full max-w-md">
            <Input
              type="search"
              placeholder="Search Chess.com User..."
              className="bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500 focus:ring-purple-500 focus:border-purple-500"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && triggerFetch()}
              disabled={isLoading || isAnalyzing}
            />
            <Button onClick={triggerFetch} disabled={isLoading || isAnalyzing || !usernameInput}>
              <Search className="h-4 w-4 mr-2" />
              Fetch
            </Button>
          </div>
          <Button 
            variant="outline" 
            onClick={() => {
              setAnalysisMode("idle");
              setUsernameInput("");
              setUsernameToFetch("");
              setPlayerData(null);
            }} 
            className="text-gray-400"
          >
            Back to Options
          </Button>
        </div>
      )}

      {/* Google Sheets Username Selection */}
      {analysisMode === "google_sheets" && (
        <div className="flex flex-col items-center space-y-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            Chess Analytics Dashboard
          </h1>
          <div className="flex justify-center items-center gap-2 mb-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="min-w-[200px]" disabled={loadingUsernames || isLoading}>
                  {loadingUsernames ? "Loading usernames..." : usernameInput || "Select username"}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-gray-900 border-gray-700">
                {sheetsUsernames.length > 0 ? (
                  sheetsUsernames.map((username) => (
                    <DropdownMenuItem
                      key={username}
                      onClick={() => handleUsernameSelect(username)}
                      className="cursor-pointer hover:bg-gray-800"
                    >
                      {username}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>No usernames found</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button 
            variant="outline" 
            onClick={() => {
              setAnalysisMode("idle");
              setUsernameInput("");
              setUsernameToFetch("");
              setPlayerData(null);
            }} 
            className="text-gray-400"
          >
            Back to Options
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 max-w-3xl mx-auto my-8 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {playerData && !isLoading && (
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Display username at the top */}
          <h2 className="text-2xl font-semibold text-center">
            Analysis for <span className="text-purple-400">{playerData.username}</span>
          </h2>

          <StatsCards playerData={playerData} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* MovesAnalysis uses playerData */}
            <MovesAnalysis playerData={playerData} />
            {/* CriticalMoveViewer component for great and brilliant moves */}
            <CriticalMoveViewer playerData={playerData} />
          </div>

          {/* Optional: Message if player data loaded but no recent games found */}
          {playerData && playerData.recentGamesAnalysis.length === 0 && !isLoading && (
             <div className="text-center py-10">
                <p className="text-gray-500">No recent games found or analyzed for {playerData.username}.</p>
             </div>
          )}
        </div>
      )}

      {/* Initial state / No user searched */}
      {!usernameToFetch && !isLoading && !error && analysisMode === "idle" && (
        <div className="text-center py-10">
          <p className="text-gray-500">Choose an analysis option above to get started.</p>
        </div>
      )}
    </main>
  );
}
