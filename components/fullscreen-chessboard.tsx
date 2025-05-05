"use client";

import React, { useState, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { X, ChevronLeft, ChevronRight, RefreshCw, Sparkles, Zap } from "lucide-react";
import type { HighlightedMove, AnalyzedGameSummary } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";

// --- Vertical Evaluation Bar Component for Fullscreen ---
interface EvaluationBarProps {
  evaluation: number | null;
  mate: number | null;
}

const FullscreenEvaluationBar: React.FC<EvaluationBarProps> = ({ evaluation, mate }) => {
  const MAX_EVAL = 10; // Cap visual evaluation at +/- 10 pawns
  const BAR_HEIGHT_PX = 500; // Make it taller for fullscreen
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
    <div className="relative h-[500px] w-6 flex flex-col rounded overflow-hidden bg-gray-700 border border-gray-600 mx-4">
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
  // Match the property names being passed from critical-move-viewer.tsx
  games: Array<{
    url: string;
    title: string;
    brilliantMoves: number;
    greatMoves: number;
  }>;
  selectedGame: string;
  onGameChange: (value: string) => void;
}

export function FullscreenChessboard({
  position,
  onClose,
  currentMove,
  displayEvaluation,
  displayMate,
  isMoveMade,
  onPieceDrop,
  onReset,
  onNext,
  onPrevious,
  totalMoves,
  currentIndex,
  games,
  selectedGame,
  onGameChange
}: FullscreenChessboardProps) {
  const [boardWidth, setBoardWidth] = useState<number>(600);

  // Set board size on mount and resize
  useEffect(() => {
    const handleResize = () => {
      // Calculate optimal board size leaving space for right panel
      const maxHeight = window.innerHeight * 0.85;
      const maxWidth = (window.innerWidth - 340) * 0.7; // Leave space for sidebar
      setBoardWidth(Math.min(maxHeight, maxWidth));
    };
    
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const evalText = displayMate !== null
    ? `Mate in ${Math.abs(displayMate)}`
    : displayEvaluation !== null
    ? `Eval: ${displayEvaluation.toFixed(2)}`
    : "N/A";

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center overflow-hidden">
      {/* Close button */}
      <div className="absolute top-4 right-4">
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-gray-800">
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Main content - horizontal layout with board on left and controls on right */}
      <div className="flex flex-row max-w-[95vw] max-h-[90vh] gap-6">
        <div className="flex items-center">
          <FullscreenEvaluationBar evaluation={displayEvaluation} mate={displayMate} />
          
          {/* Chessboard */}
          <div className="relative">
            <Chessboard
              id="fullscreen-chessboard"
              position={position}
              onPieceDrop={onPieceDrop}
              arePiecesDraggable={!isMoveMade && !!onPieceDrop}
              boardWidth={boardWidth}
              customBoardStyle={{ 
                borderRadius: '4px', 
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.8)',
              }}
              customDarkSquareStyle={{ backgroundColor: '#4B5563' }}
              customLightSquareStyle={{ backgroundColor: '#9CA3AF' }}
            />
          </div>
        </div>
        
        {/* Right side panel with move info, game selection, and controls */}
        <div className="bg-gray-900/60 p-6 rounded-lg border border-gray-800 max-w-[300px] flex flex-col h-full max-h-[80vh] overflow-y-auto">
          {/* Move quality badge */}
          <Badge 
            variant={currentMove.quality === 'brilliant' ? 'default' : 'secondary'}
            className={`text-lg px-4 py-2 mb-4 capitalize ${
              currentMove.quality === 'brilliant' 
                ? 'bg-amber-500/80 text-white border-amber-700' 
                : 'bg-green-500/80 text-white border-green-700'
            }`}
          >
            {currentMove.quality === 'brilliant' ? <Sparkles className="h-5 w-5 mr-2" /> : <Zap className="h-5 w-5 mr-2" />}
            {currentMove.quality} Move
          </Badge>
          
          {/* Evaluation and move info */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-white mb-2">{evalText}</h3>
            <p className="text-lg text-gray-300">
              Move to play: <span className="font-mono">{currentMove.moveSan}</span>
            </p>
            <p className="text-gray-400 mt-1">
              Move {currentIndex + 1} of {totalMoves} • {isMoveMade ? "Position after move" : "Position before move"}
            </p>
          </div>
          
          {/* Game info */}
          <div className="mb-6">
            <h4 className="text-gray-400 text-sm mb-1">Game</h4>
            <p className="text-white">{currentMove.whiteUsername} vs {currentMove.blackUsername}</p>
            <a 
              href={currentMove.gameUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-purple-400 hover:underline text-sm mt-1 inline-block"
            >
              View on Chess.com
            </a>
          </div>
          
          {/* Game selection dropdown */}
          <div className="mb-6">
            <h4 className="text-gray-400 text-sm mb-2">Filter Games</h4>
            <Select value={selectedGame} onValueChange={onGameChange}>
              <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Select a game" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                <SelectItem value="all">All Games ({totalMoves} moves)</SelectItem>
                {games.map(game => (
                  <SelectItem key={game.url} value={game.url}>
                    {game.title} ({game.brilliantMoves} brilliant, {game.greatMoves} great)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Navigation buttons */}
          <div className="mt-auto">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Button 
                onClick={onPrevious} 
                variant="outline" 
                disabled={!onPrevious || totalMoves <= 1}
                className="bg-gray-800 hover:bg-gray-700 text-white border-gray-600"
              >
                <ChevronLeft className="h-5 w-5 mr-2" /> Previous
              </Button>
              
              <Button 
                onClick={onNext} 
                variant="outline" 
                disabled={!onNext || totalMoves <= 1}
                className="bg-gray-800 hover:bg-gray-700 text-white border-gray-600"
              >
                Next <ChevronRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
            
            <Button 
              onClick={onReset} 
              variant="outline" 
              disabled={!onReset || (!isMoveMade && position === currentMove?.fenBefore)}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white border-gray-600"
            >
              <RefreshCw className="h-5 w-5 mr-2" /> Reset Position
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}