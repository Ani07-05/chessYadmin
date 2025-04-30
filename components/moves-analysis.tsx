import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { Sparkles, Zap, ExternalLink } from "lucide-react"
import type { PlayerData, AnalyzedGameSummary } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"

interface MovesAnalysisProps {
	playerData: PlayerData
}

export function MovesAnalysis({ playerData }: MovesAnalysisProps) {
	return (
		<Card className="bg-gray-900 border-gray-800 text-gray-200">
			<CardHeader>
				<CardTitle className="text-xl">
					Move Analysis (Last{" "}
					{playerData.recentGamesAnalysis.length} Games)
				</CardTitle>
				<CardDescription className="text-gray-400">
					Overall and per-game move quality breakdown based on Stockfish
					analysis.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Overall Counts */}
				<div className="flex items-center justify-between">
					<div className="flex items-center">
						<div className="p-2 bg-amber-500/20 rounded-full mr-3">
							<Sparkles className="h-5 w-5 text-amber-400" />
						</div>
						<span className="text-gray-300">Total Brilliant Moves</span>
					</div>
					<span className="text-xl font-bold text-amber-400">
						{playerData.totalBrilliantMoves}
					</span>
				</div>

				<div className="flex items-center justify-between">
					<div className="flex items-center">
						<div className="p-2 bg-green-500/20 rounded-full mr-3">
							<Zap className="h-5 w-5 text-green-400" />
						</div>
						<span className="text-gray-300">Total Great Moves</span>
					</div>
					<span className="text-xl font-bold text-green-400">
						{playerData.totalGreatMoves}
					</span>
				</div>

				{/* Recent Games Analysis Section */}
				<div className="mt-6 pt-6 border-t border-gray-700">
					<h4 className="text-sm font-medium text-gray-400 mb-3">
						Per-Game Summary
					</h4>
					{playerData.recentGamesAnalysis.length > 0 ? (
						<ul className="space-y-3">
							{playerData.recentGamesAnalysis.map(
								(gameSummary, index) => (
									<li
										key={
											gameSummary.gameUrl ||
											index
										} /* Use gameUrl as key if available */
										className="bg-gray-800 p-3 rounded-md text-sm border border-gray-700"
									>
										<div className="flex justify-between items-center mb-2 flex-wrap gap-x-4 gap-y-1">
											<div className="flex items-center gap-2">
												<a
													href={gameSummary.gameUrl}
													target="_blank"
													rel="noopener noreferrer"
													className="text-purple-400 hover:underline truncate font-medium inline-flex items-center"
												>
													{gameSummary.whiteUsername} vs{" "}
													{gameSummary.blackUsername}
													<ExternalLink className="h-3 w-3 ml-1" />
												</a>
												<Badge
													variant="secondary"
													className="text-xs px-1.5 py-0.5"
												>
													{formatDate(gameSummary.endTime)}
												</Badge>
											</div>
											{/* Display FEN if needed, maybe less prominent */}
											{/* <code className="block text-xs text-gray-500 bg-gray-900 p-1 rounded overflow-x-auto whitespace-nowrap">
											{gameSummary.fen}
										</code> */}
										</div>
										<div className="flex gap-4 text-xs mt-1">
											{/* Remove Good Moves */}
											<span className="flex items-center text-green-400">
												<Zap className="h-3 w-3 mr-1" /> Great:{" "}
												{gameSummary.greatMovesCount}
											</span>
											<span className="flex items-center text-amber-400">
												<Sparkles className="h-3 w-3 mr-1" /> Brilliant:{" "}
												{gameSummary.brilliantMovesCount}
											</span>
										</div>
									</li>
								)
							)}
						</ul>
					) : (
						<p className="text-gray-500 text-sm">
							No recent game analysis available.
						</p>
					)}
				</div>
			</CardContent>
		</Card>
	)
}
