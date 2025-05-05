import { NextRequest, NextResponse } from "next/server";
import { getUsernamesFromSheet } from "@/lib/google-sheets";

/**
 * API route to fetch usernames from Google Sheets
 */
export async function GET(request: NextRequest) {
  try {
    const usernames = await getUsernamesFromSheet();
    
    if (!usernames || usernames.length === 0) {
      console.log("[API] No usernames found in sheet");
      return NextResponse.json({ usernames: [], message: "No usernames found in sheet" });
    }
    
    console.log(`[API] Successfully fetched ${usernames.length} usernames from sheet`);
    return NextResponse.json({ usernames });
  } catch (error) {
    console.error("[API] Error fetching usernames from Google Sheets:", error);
    return NextResponse.json(
      { error: "Failed to fetch usernames from Google Sheets" },
      { status: 500 }
    );
  }
}