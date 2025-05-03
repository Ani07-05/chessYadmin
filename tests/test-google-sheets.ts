import dotenv from 'dotenv';
import path from 'path';
import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';

// Load environment variables from .env.local file with specific path
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { getUsernamesFromSheet } from '../lib/google-sheets';

async function runTest() {
    console.log("Attempting to fetch usernames from Google Sheet...");
    
    // First, let's list all the available sheets to find the correct sheet name
    try {
        const SPREADSHEET_ID = '1VP2C9Ak7EpPp4zKsz8ep-jORQ-IBbIrJ1pyr1ghZdCg';
        const auth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        
        const authClient = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient as any });
        
        console.log("Fetching available sheets in the spreadsheet...");
        const response = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID
        });
        
        console.log("Available sheets:");
        response.data.sheets?.forEach((sheet: any) => {
            console.log(`- Title: ${sheet.properties?.title}, SheetId: ${sheet.properties?.sheetId}`);
        });
        
        // After listing sheets, try to get the usernames
        const usernames = await getUsernamesFromSheet();

        if (usernames.length > 0) {
            console.log("Successfully fetched usernames:");
            console.log(usernames);
        } else {
            console.log("Fetched data, but no usernames were found in the specified range or the sheet might be empty/incorrectly configured.");
        }
    } catch (error) {
        console.error("Error during Google Sheets test:", error);
    }
}

runTest();