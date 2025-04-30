"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Clock, Loader2, AlertCircle, Star, Sparkles, ExternalLink } from "lucide-react";
import { useState } from "react";
import { formatDate } from "@/lib/utils";

// Define the structure for the analysis result passed down
interface GameAnalysisResult {
  brilliantMoves?: number;
  greatMoves?: number;
  error?: string;
  analyzing?: boolean;
}

// Define the structure for the game data passed down
interface GameData {
    url: string;
    pgn: string; // Added pgn
    time_control: string;
    end_time: number;
    rated: boolean;
    white: { rating: number; result: string; username: string };
    black: { rating: number; result: string; username: string };
    analysis?: GameAnalysisResult; // Added optional analysis
    // Remove fields not being passed or needed:
    // lastMove: string;
    // evaluation: string;
    // bestMove: string;
    // lastMoveQuality: string;
    // lastPositions: string[];
}

interface BlitzGameCardProps {
  game: GameData;
  username: string; // Added username prop if needed inside the card
}

// Helper function to determine winner/loser/draw based on username
const getPlayerResult = (game: GameData, username: string): string => {
    if (game.white.username.toLowerCase() === username.toLowerCase()) {
        return game.white.result;
    }
    if (game.black.username.toLowerCase() === username.toLowerCase()) {
        return game.black.result;
    }
    return "N/A"; // Should not happen if username is one of the players
};

// Helper function to get opponent info
const getOpponent = (game: GameData, username: string): { username: string; rating: number } => {
    if (game.white.username.toLowerCase() === username.toLowerCase()) {
        return game.black;
    }
    return game.white;
};


export function BlitzGameCard({ game, username }: BlitzGameCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Function to render move quality badge (example)
  function renderMoveQualityBadge(quality: string) {
    switch (quality.toLowerCase()) {
      case "best":
        return <Badge className="bg-green-500">Best</Badge>
      case "excellent":
        return <Badge className="bg-blue-500">Excellent</Badge>
      case "good":
        return <Badge className="bg-teal-500">Good</Badge>
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

  const analysis = game.analysis;
  const playerResult = getPlayerResult(game, username);
  const opponent = getOpponent(game, username);

  return (
    <Card className="bg-gray-800 border-gray-700 text-white overflow-hidden">
      <CardContent className="p-0">
        <div className="p-4">
          {/* Player vs Opponent Info */}
          <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
             <div className="flex items-center gap-2">
                <span className={`font-semibold ${playerResult === 'win' ? 'text-green-400' : playerResult === 'loss' ? 'text-red-400' : 'text-gray-400'}`}>
                    {username} ({game.white.username.toLowerCase() === username.toLowerCase() ? game.white.rating : game.black.rating})
                </span>
                <span className="text-gray-500 text-sm">vs</span>
                <span className="font-semibold text-gray-400">
                    {opponent.username} ({opponent.rating})
                </span>
             </div>
             <Badge
                variant={playerResult === 'win' ? 'default' : playerResult === 'loss' ? 'destructive' : 'secondary'}
                className={`capitalize ${playerResult === 'win' ? 'bg-green-700/50 text-green-300 border-green-600' : playerResult === 'loss' ? 'bg-red-700/50 text-red-300 border-red-600' : 'bg-gray-700/50 text-gray-300 border-gray-600'}`}
             >
                {playerResult.replace('_', ' ')} {/* Display result nicely */}
             </Badge>
          </div>

          {/* Game Link and Date */}
           <div className="flex items-center gap-2 mb-2 text-xs text-gray-400">
                <a href={game.url} target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 inline-flex items-center">
                    Game Link <ExternalLink className="h-3 w-3 ml-1" />
                </a>
                <span>•</span>
                <span>{formatDate(game.end_time)}</span>
           </div>


          <div className="flex justify-between items-center text-sm mb-4">
             <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-purple-900/30 text-purple-300 border-purple-800">
                    <Clock className="h-3 w-3 mr-1" /> {game.time_control}
                </Badge>
                {game.rated && <Badge variant="secondary" className="text-xs">Rated</Badge>}
             </div>
          </div>

          {/* Analysis Results Section */}
          <div className="mt-4 p-3 bg-gray-900 rounded-md border border-gray-700">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Analysis Results</h4>
            {analysis?.analyzing && (
              <div className="flex items-center text-sm text-yellow-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Analyzing...</span>
              </div>
            )}
            {analysis?.error && (
              <div className="flex items-center text-sm text-red-400">
                <AlertCircle className="mr-2 h-4 w-4" />
                <span>Error: {analysis.error}</span>
              </div>
            )}
            {typeof analysis?.brilliantMoves === 'number' && typeof analysis?.greatMoves === 'number' && !analysis.analyzing && !analysis.error && (
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center text-blue-400">
                  <Sparkles className="mr-1 h-4 w-4" />
                  <span>Brilliant: <span className="font-semibold">{analysis.brilliantMoves}</span></span>
                </div>
                <div className="flex items-center text-green-400">
                  <Star className="mr-1 h-4 w-4" />
                  <span>Great: <span className="font-semibold">{analysis.greatMoves}</span></span>
                </div>
              </div>
            )}
            {/* Show placeholder if no analysis started/done and no error/loading */}
            {!analysis && (
              <div className="text-sm text-gray-500">
                <span>Click "Analyze" above to see results.</span>
              </div>
            )}
            {/* Show placeholder if analysis finished but found 0 moves */}
            {analysis && !analysis.analyzing && !analysis.error && typeof analysis.brilliantMoves === 'number' && analysis.brilliantMoves === 0 && typeof analysis.greatMoves === 'number' && analysis.greatMoves === 0 && (
              <div className="text-sm text-gray-500">
                <span>No brilliant or great moves found in this game.</span>
              </div>
            )}
          </div>

          {/* Collapsible PGN Viewer (Optional) */}
          {game.pgn && (
            <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-4">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-700">
                  {isOpen ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                  Show PGN
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="p-4 pt-2 bg-gray-900 rounded-b-md">
                <pre className="text-xs text-gray-300 whitespace-pre-wrap break-words">{game.pgn}</pre>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
