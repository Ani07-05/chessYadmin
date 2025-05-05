"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js"; // Import Chess for move validation
import type { PlayerData, HighlightedMove, AnalyzedGameSummary } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Sparkles, Zap, RefreshCw, X, Maximize, Minimize, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "./ui/use-mobile";
import { FullscreenChessboard } from "./fullscreen-chessboard"; // Add this import
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";

// --- Vertical Evaluation Bar Component (Re-implemented) ---
interface EvaluationBarProps {
  evaluation: number | null;
  mate: number | null;
}

const EvaluationBar: React.FC<EvaluationBarProps> = ({ evaluation, mate }) => {
  const MAX_EVAL = 10; // Cap visual evaluation at +/- 10 pawns
  const BAR_HEIGHT_PX = 400;
  let whiteAdvantagePercentage = 50;
  let evalText = "0.0";

  if (mate !== null) {
    whiteAdvantagePercentage = mate > 0 ? 100 : 0;
    evalText = `M${Math.abs(mate)}`;
  } else if (evaluation !== null) {
    const clampedEval = Math.max(-MAX_EVAL, Math.min(MAX_EVAL, evaluation));
    const winProb = 1 / (1 + Math.exp(-0.4 * clampedEval));
    whiteAdvantagePercentage = winProb * 100;
    evalText = evaluation.toFixed(1);
  }

  whiteAdvantagePercentage = Math.max(0, Math.min(100, whiteAdvantagePercentage));
  const blackAdvantagePercentage = 100 - whiteAdvantagePercentage;

  const markers = [
    { value: 5, label: "+5" }, { value: 2, label: "+2" }, { value: 0, label: "0" },
    { value: -2, label: "-2" }, { value: -5, label: "-5" },
  ];

  const getMarkerPosition = (evalValue: number): number => {
    const clamped = Math.max(-MAX_EVAL, Math.min(MAX_EVAL, evalValue));
    const winProb = 1 / (1 + Math.exp(-0.4 * clamped));
    return (winProb * BAR_HEIGHT_PX);
  };

  return (
    <div className="relative h-[400px] w-6 flex flex-col rounded overflow-hidden bg-gray-700 border border-gray-600 ml-4">
      {/* ... bar rendering ... */}
      <div className="w-full bg-gray-900 transition-all duration-300 ease-in-out" style={{ height: `${blackAdvantagePercentage}%` }} />
      <div className="w-full bg-gray-200 transition-all duration-300 ease-in-out" style={{ height: `${whiteAdvantagePercentage}%` }} />
      <div className="absolute left-full ml-1 w-10 text-center text-xs font-semibold text-white pointer-events-none" style={{ bottom: `${whiteAdvantagePercentage}%`, transform: 'translateY(50%)' }}>
        {evalText}
      </div>
      {markers.map(marker => (
         <div key={marker.value} className="absolute left-0 w-full h-px bg-gray-500/50 pointer-events-none" style={{ bottom: `${getMarkerPosition(marker.value)}px` }}>
           {/* Optional labels */}
         </div>
      ))}
    </div>
  );
};
// --- End Evaluation Bar Component ---

interface CriticalMoveViewerProps {
  playerData: PlayerData;
}

// Update the FullscreenChessboard interface to include game selection capabilities
interface FullscreenChessboardProps {
  position: string;
  onClose: () => void;
  currentMove: HighlightedMove;
  displayEvaluation: number | null;
  displayMate: number | null;
  isMoveMade: boolean;
  onPieceDrop?: (sourceSquare: string, targetSquare: string, piece: string) => boolean;
  onReset: () => void;
  onNext: () => void;
  onPrevious: () => void;
  totalMoves: number;
  currentIndex: number;
  // Add new props for game selection
  games: {
    url: string;
    title: string;
    brilliantMoves: number;
    greatMoves: number;
  }[];
  selectedGame: string;
  onGameChange: (value: string) => void;
}

export function CriticalMoveViewer({ playerData }: CriticalMoveViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [boardPosition, setBoardPosition] = useState<string>("");
  // Display evaluation/mate associated with the *best* move from the starting position
  const [displayEvaluation, setDisplayEvaluation] = useState<number | null>(null);
  const [displayMate, setDisplayMate] = useState<number | null>(null);
  const [isMoveMade, setIsMoveMade] = useState<boolean>(false);
  const [selectedGame, setSelectedGame] = useState<string>("all");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [boardWidth, setBoardWidth] = useState<number>(400);

  const { toast } = useToast();
  const isMobile = useIsMobile();
  const chess = useMemo(() => new Chess(), []);

  // Get unique games with highlighted moves
  const gamesWithHighlightedMoves = useMemo(() => {
    const games = playerData.recentGamesAnalysis.filter(game => 
      game.highlightedMoves && game.highlightedMoves.length > 0
    );
    
    return games.map(game => ({
      url: game.gameUrl,
      title: `${game.whiteUsername} vs ${game.blackUsername} (${formatDate(game.endTime)})`,
      brilliantMoves: game.brilliantMovesCount,
      greatMoves: game.greatMovesCount,
      moves: game.highlightedMoves
    }));
  }, [playerData.recentGamesAnalysis]);

  // Filter highlighted moves based on selected game
  const filteredHighlightedMoves = useMemo(() => {
    if (selectedGame === "all") {
      return playerData.recentGamesAnalysis.flatMap(game => game.highlightedMoves);
    } else {
      const game = playerData.recentGamesAnalysis.find(g => g.gameUrl === selectedGame);
      return game ? game.highlightedMoves : [];
    }
  }, [playerData.recentGamesAnalysis, selectedGame]);

  const currentMove: HighlightedMove | undefined = filteredHighlightedMoves[currentIndex];

  // Adjust board size when fullscreen mode changes or on window resize
  useEffect(() => {
    const handleResize = () => {
      if (isFullscreen) {
        const minDimension = Math.min(window.innerWidth - 100, window.innerHeight - 200);
        setBoardWidth(minDimension);
      } else {
        setBoardWidth(isMobile ? Math.min(window.innerWidth - 40, 400) : 400);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isFullscreen, isMobile]);

  // Effect to reset state when currentMove changes
  useEffect(() => {
    if (currentMove) {
      setBoardPosition(currentMove.fenBefore);
      // Display the evaluation/mate associated with the *best* move from this position
      setDisplayEvaluation(currentMove.bestMoveEval);
      setDisplayMate(currentMove.bestMoveMate);
      setIsMoveMade(false);
      chess.load(currentMove.fenBefore);
    } else {
      setBoardPosition("");
      setDisplayEvaluation(null);
      setDisplayMate(null);
      setIsMoveMade(false);
    }
  }, [currentMove, chess]);

  // Effect to reset index when filtered moves change
  useEffect(() => {
    setCurrentIndex(0);
  }, [filteredHighlightedMoves.length]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, filteredHighlightedMoves.length - 1)));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < filteredHighlightedMoves.length - 1 ? prev + 1 : 0));
  };

  const resetPosition = () => {
    if (currentMove) {
      setBoardPosition(currentMove.fenBefore);
      // Reset eval/mate display to the best move's eval/mate from the starting position
      setDisplayEvaluation(currentMove.bestMoveEval);
      setDisplayMate(currentMove.bestMoveMate);
      setIsMoveMade(false);
      chess.load(currentMove.fenBefore);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Handle game selection change
  const handleGameChange = (value: string) => {
    setSelectedGame(value);
  };

  // Handle piece drop for making the move
  const onPieceDrop = (sourceSquare: string, targetSquare: string, piece: string): boolean => {
    if (!currentMove || isMoveMade) return false;

    try {
      // Use chess.js to validate and make the move internally
      // No ShortMove type annotation needed
      const moveData = {
        from: sourceSquare,
        to: targetSquare,
        promotion: piece.toLowerCase().startsWith('p') && (targetSquare.endsWith('1') || targetSquare.endsWith('8')) ? 'q' : undefined,
      };

      const result = chess.move(moveData);

      if (result === null) {
        toast({ title: "Invalid Move", description: "That move is not legal in this position.", variant: "destructive" });
        return false;
      }

      // Check if the made move matches the highlighted move's SAN
      const playedSan = result.san;
      const coreExpectedSan = currentMove.moveSan.replace(/[+#=]/g, '');
      const corePlayedSan = playedSan.replace(/[+#=]/g, '');

      if (corePlayedSan.includes(coreExpectedSan) || playedSan.includes(coreExpectedSan)) {
        // Correct move made!
        setBoardPosition(chess.fen()); // Update board to the position *after* the played move
        // Keep displaying the evaluation associated with the *best* move from the *start* position
        // setDisplayEvaluation(currentMove.bestMoveEval); // No change needed
        // setDisplayMate(currentMove.bestMoveMate);       // No change needed
        setIsMoveMade(true);
        toast({ title: "Correct!", description: `You played the ${currentMove.quality} move: ${currentMove.moveSan}`, variant: "default" });
        return true;
      } else {
        // Incorrect move made
        chess.undo();
        toast({ title: "Incorrect Move", description: `Try playing the highlighted move: ${currentMove.moveSan}`, variant: "destructive" });
        return false;
      }

    } catch (e) {
      console.error("Error during move validation:", e);
      toast({ title: "Move Error", description: "Could not validate the move.", variant: "destructive" });
      return false;
    }
  };

  if (isFullscreen && currentMove) {
    return (
      <FullscreenChessboard
        position={boardPosition}
        onClose={toggleFullscreen}
        currentMove={currentMove}
        displayEvaluation={displayEvaluation}
        displayMate={displayMate}
        isMoveMade={isMoveMade}
        onPieceDrop={!isMoveMade ? onPieceDrop : undefined}
        onReset={resetPosition}
        onNext={goToNext}
        onPrevious={goToPrevious}
        totalMoves={filteredHighlightedMoves.length}
        currentIndex={currentIndex}
        // Pass game selection props
        games={gamesWithHighlightedMoves}
        selectedGame={selectedGame}
        onGameChange={handleGameChange}
      />
    );
  }

  if (!currentMove || filteredHighlightedMoves.length === 0) {
    // ... No moves found card ...
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle>Critical Moves Review</CardTitle>
          <CardDescription>Review Brilliant and Great moves found in recent games.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-center py-8">No brilliant or great moves found in the analyzed games.</p>
        </CardContent>
      </Card>
    );
  }

  // Text based on the evaluation/mate of the *best* move from the starting position
  const currentEvalText = displayMate !== null
    ? `Mate in ${Math.abs(displayMate)}`
    : displayEvaluation !== null
    ? `Eval: ${displayEvaluation.toFixed(2)}`
    : "N/A";

  // Render the normal card view
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <div className="flex justify-between items-start flex-wrap gap-2">
          <div>
             <CardTitle>Critical Moves Review</CardTitle>
             <CardDescription>
                Move {currentIndex + 1} of {filteredHighlightedMoves.length} ({isMoveMade ? "Position After Your Move" : "Position Before - Make the Move!"})
             </CardDescription>
             {/* ... game link ... */}
             <div className="text-sm text-gray-400 mt-1">
                Game: <a href={currentMove.gameUrl} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">{currentMove.whiteUsername} vs {currentMove.blackUsername}</a>
             </div>
          </div>
           <Badge variant={currentMove.quality === 'brilliant' ? 'default' : 'secondary'}
                  className={`capitalize ${currentMove.quality === 'brilliant' ? 'bg-amber-500/80 text-white border-amber-700' : 'bg-green-500/80 text-white border-green-700'}`}>
             {currentMove.quality === 'brilliant' ? <Sparkles className="h-4 w-4 mr-1" /> : <Zap className="h-4 w-4 mr-1" />}
             {currentMove.quality} Move: <span className="font-mono ml-1">{currentMove.moveSan}</span>
           </Badge>
        </div>

        {/* Game selection dropdown */}
        <div className="mt-2">
          <Select value={selectedGame} onValueChange={handleGameChange}>
            <SelectTrigger className="w-full md:w-[350px]">
              <SelectValue placeholder="Select a game to filter moves" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Games ({playerData.totalGreatMoves + playerData.totalBrilliantMoves} moves)</SelectItem>
              {gamesWithHighlightedMoves.map(game => (
                <SelectItem key={game.url} value={game.url}>
                  {game.title} ({game.brilliantMoves} brilliant, {game.greatMoves} great)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col items-center space-y-4">
        <div className="flex justify-center items-start w-full">
            <div className="w-full max-w-[400px] aspect-square relative">
               <Chessboard
                 id="critical-move-board"
                 position={boardPosition}
                 onPieceDrop={onPieceDrop}
                 arePiecesDraggable={!isMoveMade}
                 boardWidth={boardWidth}
                 customBoardStyle={{ borderRadius: '4px', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)' }}
                 customDarkSquareStyle={{ backgroundColor: '#4B5563' }}
                 customLightSquareStyle={{ backgroundColor: '#9CA3AF' }}
               />
               <Button 
                 variant="outline" 
                 size="icon" 
                 onClick={toggleFullscreen}
                 className="absolute top-2 right-2 bg-white/20 hover:bg-white/30 z-10"
                 title="Enter fullscreen mode"
               >
                 <Maximize className="h-4 w-4" />
               </Button>
            </div>
            {/* Vertical Evaluation Bar - Shows eval/mate of BEST move from start pos */}
            <EvaluationBar evaluation={displayEvaluation} mate={displayMate} />
        </div>

        <div className="text-center">
            {/* Display eval/mate of BEST move from start pos */}
            <p className="text-lg font-semibold">{currentEvalText}</p>
            <p className="text-sm text-gray-400">
                {isMoveMade ? `Played: ${currentMove.moveSan}` : `Your turn to play: ${currentMove.moveSan}`}
            </p>
             {/* Game link */}
             <a href={currentMove.gameUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:underline mt-1 block">
                View Full Game on Chess.com
             </a>
        </div>

        {/* Navigation, Reset, and Fullscreen Buttons */}
        <div className="flex justify-center items-center space-x-4 w-full pt-2">
          <Button onClick={goToPrevious} variant="outline" size="icon" disabled={filteredHighlightedMoves.length <= 1} title="Previous Move">
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button onClick={resetPosition} variant="outline" size="sm" className="min-w-[140px]" disabled={!isMoveMade && boardPosition === currentMove?.fenBefore} title="Reset to position before the move">
             <RefreshCw className="h-4 w-4 mr-2" />
             Reset Position
          </Button>

          <Button onClick={goToNext} variant="outline" size="icon" disabled={filteredHighlightedMoves.length <= 1} title="Next Move">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* New "Enter Full Screen" button */}
        <Button onClick={toggleFullscreen} variant="outline" className="mt-2" title="View board in fullscreen">
          <Maximize className="h-4 w-4 mr-2" />
          View in Full Screen
        </Button>
      </CardContent>
    </Card>
  );
}
