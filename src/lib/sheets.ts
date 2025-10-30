'use server';
import { google } from 'googleapis';

/**
 * Intelligently synchronizes data with a Google Sheet.
 * - If the sheet's data is not from today, it clears the sheet and writes the new data.
 * - If the sheet's data is from today, it only appends new rows, avoiding duplicates by 'orderId'.
 * 
 * @param spreadsheetId The ID of the Google Sheet.
 * @param sheetName The name of the sheet (e.g., 'Montecarlo').
 * @param values An array of objects (today's orders) to sync.
 * @returns An object containing the number of updated rows.
 */
export async function smartSyncSheet(spreadsheetId: string, sheetName: string, values: Record<string, any>[]) {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      project_id: process.env.GOOGLE_PROJECT_ID
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    // --- 1. Ensure sheet exists --- 
    const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetExists = sheetInfo.data.sheets?.some(s => s.properties?.title === sheetName);

    if (!sheetExists) {
      console.log(`Sheet "${sheetName}" not found, creating it...`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: sheetName } } }],
        },
      });
    }

    // --- 2. Check current sheet state to decide strategy ---
    const today = new Date().toISOString().split('T')[0];
    let sheetIsFromToday = false;

    const rangeToCheck = `${sheetName}!1:2`; // Check headers and first data row
    const readResult = await sheets.spreadsheets.values.get({ spreadsheetId, range: rangeToCheck });
    
    const headers = readResult.data.values?.[0];
    const firstDataRow = readResult.data.values?.[1];

    if (headers && firstDataRow) {
        const dateColumnIndex = headers.indexOf('extractionDate');
        if (dateColumnIndex !== -1 && firstDataRow[dateColumnIndex] === today) {
            sheetIsFromToday = true;
        }
    }

    // --- 3. Execute Strategy ---

    // STRATEGY B: Data is from today and headers exist. Perform an intelligent append.
    if (sheetIsFromToday && headers) {
      console.log(`Strategy for "${sheetName}": APPEND NEW.`);
      
      const orderIdColumnIndex = headers.indexOf('orderId');
      if (orderIdColumnIndex === -1) {
        throw new Error("'orderId' column not found. Cannot perform smart append.");
      }

      const columnLetter = String.fromCharCode(65 + orderIdColumnIndex);
      const idDataResponse = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!${columnLetter}2:${columnLetter}`,
      });
      
      const existingOrderIds = new Set<string>(idDataResponse.data.values?.flat() || []);
      const newValues = values.filter(row => !existingOrderIds.has(row.orderId));
      
      if (newValues.length === 0) {
        console.log('No new orders to append.');
        return { updates: { updatedRows: 0 } };
      }
      
      const dataToAppend = newValues.map(row => headers.map(header => row[header] ?? ''));
      const appendResult = await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: sheetName,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: dataToAppend },
      });

      const appendedRows = appendResult.data.updates?.updatedRows || 0;
      console.log(`Appended ${appendedRows} new rows.`);
      return { updates: { updatedRows: appendedRows } };
    }
    // STRATEGY A: Data is old, sheet is empty, or headers are missing. Perform a full clear-and-write.
    else {
      console.log(`Strategy for "${sheetName}": CLEAR and WRITE.`);
      
      await sheets.spreadsheets.values.clear({ spreadsheetId, range: sheetName });

      if (values.length === 0) {
        console.log('No orders for today. Sheet is now empty.');
        return { updates: { updatedRows: 0 } };
      }
      
      const newHeaders = Object.keys(values[0]);
      const dataToWrite = [ newHeaders, ...values.map(row => newHeaders.map(header => row[header] ?? '')) ];
      
      const writeResult = await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: dataToWrite },
      });
      
      const writtenRows = writeResult.data.updatedRows ? writeResult.data.updatedRows - 1 : 0; // -1 for header
      console.log(`Wrote ${writtenRows} rows to the clean sheet.`);
      return { updates: { updatedRows: writtenRows } };
    }

  } catch (error: any) {
    console.error('Detailed error from Google Sheets API:', error.response?.data || error.message || error);
    throw new Error(`Failed to intelligently sync data to Google Sheet. Reason: ${error.message}`);
  }
}
