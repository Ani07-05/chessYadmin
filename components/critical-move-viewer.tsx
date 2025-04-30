"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import type { PlayerData, HighlightedMove } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CriticalMoveViewerProps {
  playerData: PlayerData;
}

export function CriticalMoveViewer({ playerData }: CriticalMoveViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Flatten all highlighted moves from all analyzed games into one list
  const allHighlightedMoves = useMemo(() => {
    return playerData.recentGamesAnalysis.flatMap(game => game.highlightedMoves);
  }, [playerData.recentGamesAnalysis]);

  // Reset index if playerData changes and the index becomes invalid
  useEffect(() => {
    if (currentIndex >= allHighlightedMoves.length) {
      setCurrentIndex(0);
    }
  }, [allHighlightedMoves, currentIndex]);

  const currentMove: HighlightedMove | undefined = allHighlightedMoves[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : allHighlightedMoves.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < allHighlightedMoves.length - 1 ? prev + 1 : 0));
  };

  if (!currentMove) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle>Critical Moves</CardTitle>
          <CardDescription>Review Brilliant and Great moves.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-center py-8">No brilliant or great moves found in the analyzed games.</p>
        </CardContent>
      </Card>
    );
  }

  const evaluationText = currentMove.mate !== null
    ? `Mate in ${Math.abs(currentMove.mate)}`
    : currentMove.evaluation !== null
    ? `Eval: ${currentMove.evaluation.toFixed(2)}`
    : "N/A";

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
             <CardTitle>Critical Moves Review</CardTitle>
             <CardDescription>
                Showing move {currentIndex + 1} of {allHighlightedMoves.length} (Position Before Move)
             </CardDescription>
          </div>
           <Badge variant={currentMove.quality === 'brilliant' ? 'default' : 'secondary'}
                  className={`capitalize ${currentMove.quality === 'brilliant' ? 'bg-amber-500/80 text-white border-amber-700' : 'bg-green-500/80 text-white border-green-700'}`}>
             {currentMove.quality === 'brilliant' ? <Sparkles className="h-4 w-4 mr-1" /> : <Zap className="h-4 w-4 mr-1" />}
             {currentMove.quality} Move
           </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        <div className="w-full max-w-[400px] aspect-square"> {/* Adjust size as needed */}
           <Chessboard
             position={currentMove.fenBefore}
             arePiecesDraggable={false}
             boardWidth={400} // Example width, adjust as needed
           />
        </div>
        <div className="text-center">
            <p className="text-lg font-semibold">{evaluationText}</p>
            <p className="text-sm text-gray-400">Played: <span className="font-mono">{currentMove.moveSan}</span></p>
             <a href={currentMove.gameUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:underline mt-1 block">
                View Game on Chess.com
             </a>
        </div>
        <div className="flex justify-center space-x-4 w-full">
          <Button onClick={goToPrevious} variant="outline" size="icon" disabled={allHighlightedMoves.length <= 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button onClick={goToNext} variant="outline" size="icon" disabled={allHighlightedMoves.length <= 1}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
