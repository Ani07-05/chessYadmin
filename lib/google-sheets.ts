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

// --- Main Function ---
export async function getUsernamesFromSheet(): Promise<string[]> {
    console.log(`[Google Sheets] Attempting to fetch usernames from Sheet ID: ${SPREADSHEET_ID}, Range: ${USERNAME_COLUMN_RANGE}`);
    console.log(`[Google Sheets] GOOGLE_APPLICATION_CREDENTIALS environment variable is ${process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'set' : 'NOT SET'}`);
    
    try {
        // Obtain an authenticated client
        const auth = new GoogleAuth({
            // Ensure you have the correct scope for reading sheets
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        
        console.log('[Google Sheets] Creating auth client...');
        const authClient = await auth.getClient();
        console.log('[Google Sheets] Auth client created successfully');
        
        const sheets = google.sheets({ version: 'v4', auth: authClient as any });

        console.log('[Google Sheets] Authentication successful. Fetching values...');
        
        // More verbose error handling for the API call
        try {
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
                console.log('[Google Sheets] Sample usernames:', usernames.slice(0, 3));
                return usernames;
            } else {
                console.log('[Google Sheets] No data found in the specified range or sheet.');
                return [];
            }
        } catch (apiError: any) {
            console.error('[Google Sheets] API call failed:', apiError.message || apiError);
            if (apiError.response) {
                console.error('[Google Sheets] Status:', apiError.response.status);
                console.error('[Google Sheets] Status Text:', apiError.response.statusText);
                console.error('[Google Sheets] Error data:', JSON.stringify(apiError.response.data, null, 2));
            }
            throw apiError; // Re-throw to be caught by the outer try/catch
        }
    } catch (error: any) {
        // Log detailed error information
        console.error('[Google Sheets] Error fetching data:', error.message || error);
        if (error.response?.data?.error) {
            console.error('[Google Sheets] API Error Details:', JSON.stringify(error.response.data.error, null, 2));
        }
        
        // Add additional debugging for common Google Auth errors
        if (error.message?.includes('Could not load the default credentials')) {
            console.error('[Google Sheets] Authentication Error: Could not load default credentials. Make sure GOOGLE_APPLICATION_CREDENTIALS is set correctly.');
        }
        
        if (error.message?.includes('permission')) {
            console.error('[Google Sheets] Permission Error: Make sure the service account has access to the spreadsheet.');
        }
        
        throw error; // Now re-throwing the error to be handled by the API route
    }
}