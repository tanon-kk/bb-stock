const { google } = require('googleapis');
const path = require('path');

const SHEET_ID = '12HZRAvQdQtvgNf17igBghFD2ZdqTNKtZitCuFjEQLH0';

// อ่าน credentials จาก ENV (production) หรือไฟล์ (local)
function getAuth() {
  if (process.env.GOOGLE_CREDENTIALS) {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    return new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  }
  return new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, '../config/credentials.json'),
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
  const auth        = getAuth();
  const sheets      = google.sheets({ version: 'v4', auth });
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const exists      = spreadsheet.data.sheets.some(s => s.properties.title === sheetName);

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetName } } }]
      }
    });
  }
}

// ลบ sheet เก่าถ้าเกิน 24 sheets
async function cleanOldSheets() {
  const auth        = getAuth();
  const sheets      = google.sheets({ version: 'v4', auth });
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const allSheets   = spreadsheet.data.sheets;

  if (allSheets.length > 24) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{ deleteSheet: { sheetId: allSheets[0].properties.sheetId } }]
      }
    });
  }
}

module.exports = { readSheet, writeSheet, ensureSheet, cleanOldSheets };