const { google } = require('googleapis');
const path = require('path');

const SHEET_ID = '12HZRAvQdQtvgNf17igBghFD2ZdqTNKtZitCuFjEQLH0';
const CREDENTIALS_PATH = path.join(__dirname, '../config/credentials.json');

// สร้าง auth client
function getAuth() {
  return new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

// ดึงข้อมูลจาก sheet
async function readSheet(sheetName) {
  const auth   = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const res    = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: sheetName,
  });
  return res.data.values || [];
}

// เขียนข้อมูลลง sheet
async function writeSheet(sheetName, values) {
  const auth   = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values },
  });
}

// สร้าง sheet ใหม่ถ้ายังไม่มี
async function ensureSheet(sheetName) {
  const auth   = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const exists = spreadsheet.data.sheets.some(s => s.properties.title === sheetName);

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{
          addSheet: { properties: { title: sheetName } }
        }]
      }
    });
  }
}

// ลบ sheet เก่าที่เกิน 24 sheets (วนทับแบบ log)
async function cleanOldSheets() {
  const auth   = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const allSheets   = spreadsheet.data.sheets;

  if (allSheets.length > 24) {
    const oldest = allSheets[0];
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{
          deleteSheet: { sheetId: oldest.properties.sheetId }
        }]
      }
    });
  }
}

module.exports = { readSheet, writeSheet, ensureSheet, cleanOldSheets };