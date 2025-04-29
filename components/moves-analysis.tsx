import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { Sparkles, Zap, FileText, Star, CheckCircle } from "lucide-react"
import type { PlayerData } from "@/lib/types"
import { Badge } from "@/components/ui/badge"

interface MovesAnalysisProps {
	playerData: PlayerData
}

export function MovesAnalysis({ playerData }: MovesAnalysisProps) {
	return (
		<Card className="bg-gray-900 border-gray-800">
			<CardHeader>
				<CardTitle className="text-xl">Move Analysis (Last 5 Games)</CardTitle>
				<CardDescription>
					Overall and per-game move quality breakdown.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Overall Counts */}
				<div className="flex items-center justify-between">
					<div className="flex items-center">
						<div className="p-2 bg-amber-500/20 rounded-full mr-3">
							<Sparkles className="h-5 w-5 text-amber-500" />
						</div>
						<span className="text-gray-300">Total Brilliant Moves</span>
					</div>
					<span className="text-xl font-bold">
						{playerData.brilliantMoves}
					</span>
				</div>

				<div className="flex items-center justify-between">
					<div className="flex items-center">
						<div className="p-2 bg-green-500/20 rounded-full mr-3">
							<Zap className="h-5 w-5 text-green-500" />
						</div>
						<span className="text-gray-300">Total Great Moves</span>
					</div>
					<span className="text-xl font-bold">{playerData.greatMoves}</span>
				</div>

				{/* Recent Games Analysis Section */}
				<div className="mt-6 pt-6 border-t border-gray-800">
					<h4 className="text-sm font-medium text-gray-400 mb-3">
						Recent Games Summary
					</h4>
					{playerData.recentGamesAnalysis.length > 0 ? (
						<ul className="space-y-3">
							{playerData.recentGamesAnalysis.map((gameSummary, index) => (
								<li
									key={index}
									className="bg-gray-800 p-3 rounded-md text-sm"
								>
									<div className="flex justify-between items-center mb-2">
										<a
											href={gameSummary.gameUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="text-purple-400 hover:underline truncate mr-2"
										>
											Game {index + 1}
										</a>
										<Badge
											variant="outline"
											className="text-xs px-1.5 py-0.5 font-mono"
										>
											FEN
										</Badge>
									</div>
									<code className="block text-xs text-gray-400 bg-gray-900 p-1 rounded overflow-x-auto whitespace-nowrap mb-2">
										{gameSummary.fen}
									</code>
									<div className="flex gap-4 text-xs">
										<span className="flex items-center text-blue-400">
											<CheckCircle className="h-3 w-3 mr-1" /> Good:{" "}
											{gameSummary.goodMovesCount}
										</span>
										<span className="flex items-center text-amber-400">
											<Sparkles className="h-3 w-3 mr-1" /> Brilliant:{" "}
											{gameSummary.brilliantMovesCount}
										</span>
									</div>
								</li>
							))}
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
