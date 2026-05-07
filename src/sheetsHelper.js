const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

// Sheet headers setup
const SHEET_HEADERS = {
  Images: ['Timestamp', 'Message ID', 'Drive URL', 'Description', 'User ID'],
  Notes: ['Timestamp', 'Type', 'Content', 'User ID'],
  Concerts: ['Timestamp', 'Title', 'Artist', 'Date', 'Venue', 'Country', 'Source URL'],
};

async function ensureSheetExists(sheets, sheetName) {
  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetExists = spreadsheet.data.sheets.some(
      (s) => s.properties.title === sheetName
    );

    if (!sheetExists) {
      // Create sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{ addSheet: { properties: { title: sheetName } } }],
        },
      });

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [SHEET_HEADERS[sheetName] || []] },
      });
    }
  } catch (e) {
    console.error('Sheet setup error:', e.message);
  }
}

async function appendToSheet(auth, sheetName, rows) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  await ensureSheetExists(sheets, sheetName);

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows },
  });
}

module.exports = { appendToSheet };
