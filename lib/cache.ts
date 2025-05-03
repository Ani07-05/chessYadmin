import fs from 'fs/promises';
import path from 'path';
import type { PlayerData } from '@/lib/types'; // Assuming PlayerData is the type for analysis results

const CACHE_DIR = path.resolve(process.cwd(), '.cache', 'player-analysis');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
    timestamp: number;
    analyzedGameUrls: string[];
    analysisData: PlayerData;
}

// Ensure cache directory exists
async function ensureCacheDir(): Promise<void> {
    try {
        await fs.mkdir(CACHE_DIR, { recursive: true });
    } catch (error) {
        console.error("Failed to create cache directory:", error);
    }
}

ensureCacheDir(); // Call once on module load

function getCacheFilePath(username: string): string {
    // Sanitize username to create a valid filename
    const safeFilename = encodeURIComponent(username.toLowerCase()) + '.json';
    return path.join(CACHE_DIR, safeFilename);
}

export async function getCachedAnalysis(username: string): Promise<CacheEntry | null> {
    const filePath = getCacheFilePath(username);
    try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const entry: CacheEntry = JSON.parse(fileContent);

        // Check TTL
        if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
            console.log(`[Cache] Stale entry for ${username}`);
            // Optionally delete the stale file
            // await fs.unlink(filePath).catch(err => console.error(`Failed to delete stale cache for ${username}:`, err));
            return null;
        }

        console.log(`[Cache] Hit for ${username}`);
        return entry;
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            console.log(`[Cache] Miss for ${username}`);
        } else {
            console.error(`[Cache] Error reading cache for ${username}:`, error);
        }
        return null;
    }
}

export async function setCachedAnalysis(username: string, analysisData: PlayerData, analyzedGameUrls: string[]): Promise<void> {
    const filePath = getCacheFilePath(username);
    const entry: CacheEntry = {
        timestamp: Date.now(),
        analyzedGameUrls: analyzedGameUrls,
        analysisData: analysisData,
    };
    try {
        await fs.writeFile(filePath, JSON.stringify(entry, null, 2), 'utf-8');
        console.log(`[Cache] Set entry for ${username}`);
    } catch (error) {
        console.error(`[Cache] Error writing cache for ${username}:`, error);
    }
}

// Helper to get current game URLs (replace with actual logic using /api/blitz-games or similar)
export async function getCurrentGameUrls(username: string, count: number): Promise<string[]> {
    // This is a placeholder. Implement fetching the actual latest game URLs.
    // You might call the existing /api/blitz-games endpoint internally or reuse its logic.
    console.warn(`[Cache Validation] Placeholder: Fetching current game URLs for ${username}`);
    try {
        // Example: Fetch from the existing blitz-games endpoint relative to the API route itself
        // This assumes the API route calling this is hosted at the same origin.
        // If running this outside an API route (e.g., a script), provide the full base URL.
        const baseUrl = typeof window === 'undefined' ? (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000') : '';
        const fetchUrl = `${baseUrl}/api/blitz-games?username=${encodeURIComponent(username)}&count=${count}`;
        console.log(`[Cache Validation] Fetching from: ${fetchUrl}`);

        const response = await fetch(fetchUrl);
        if (!response.ok) {
            console.error(`[Cache Validation] Failed to fetch current games for ${username}: ${response.statusText}`);
            return [];
        }
        const data = await response.json();
        // Assuming the API returns { games: [{ url: '...' }, ...] }
        const gameUrls = (data.games || []).map((game: { url: string }) => game.url);
        console.log(`[Cache Validation] Found ${gameUrls.length} current game URLs for ${username}`);
        return gameUrls;
    } catch (error) {
        console.error(`[Cache Validation] Error fetching current games for ${username}:`, error);
        return [];
    }
}