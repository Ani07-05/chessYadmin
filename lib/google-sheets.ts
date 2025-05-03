// Replace the existing placeholder function with the actual implementation.
// Make sure to install 'googleapis' and 'google-auth-library' and set up authentication.
import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library'; // For authentication

// --- Constants ---
// Extracted from the URL: https://docs.google.com/spreadsheets/d/1VP2C9Ak7EpPp4zKsz8ep-jORQ-IBbIrJ1pyr1ghZdCg/edit?resourcekey=&gid=350034059#gid=350034059
const SPREADSHEET_ID = '1VP2C9Ak7EpPp4zKsz8ep-jORQ-IBbIrJ1pyr1ghZdCg';
// Update based on actual sheet name from the API
const SHEET_NAME = 'Form Responses 1'; 
const USERNAME_COLUMN_RANGE = `'${SHEET_NAME}'!D2:D`; // Note: Added single quotes around sheet name to handle spaces

// --- Authentication ---
// Uses Application Default Credentials (ADC).
// Set the GOOGLE_APPLICATION_CREDENTIALS environment variable to the path of your service account key file.
// See: https://cloud.google.com/docs/authentication/provide-credentials-adc#local-dev
const auth = new GoogleAuth({
    // Ensure you have the correct scope for reading sheets
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

// --- Main Function ---
export async function getUsernamesFromSheet(): Promise<string[]> {
    console.log(`[Google Sheets] Attempting to fetch usernames from Sheet ID: ${SPREADSHEET_ID}, Range: ${USERNAME_COLUMN_RANGE}`);

    try {
        // Obtain an authenticated client
        const authClient = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient as any });

        console.log('[Google Sheets] Authentication successful. Fetching values...');
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: USERNAME_COLUMN_RANGE,
        });

        const rows = response.data.values;
        if (rows && rows.length > 0) {
            const usernames = rows
                .map(row => row[0]) // Get the first cell (Column D value) from each row
                .filter(username => typeof username === 'string' && username.trim() !== ''); // Filter out empty strings and non-string values

            console.log(`[Google Sheets] Successfully fetched ${usernames.length} valid usernames.`);
            return usernames;
        } else {
            console.log('[Google Sheets] No data found in the specified range or sheet.');
            return [];
        }
    } catch (error: any) {
        // Log detailed error information
        console.error('[Google Sheets] Error fetching data:', error.message || error);
        if (error.response?.data?.error) {
            console.error('[Google Sheets] API Error Details:', JSON.stringify(error.response.data.error, null, 2));
        }
        // Returning empty array to allow the batch process to continue potentially,
        // rather than throwing and stopping everything. Adjust if different behavior is desired.
        return [];
    }
}