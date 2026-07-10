importScripts('jsrsasign-all-min.js');

// ==========================================
// CONFIGURATION & CONSTANTS
// ==========================================
const CONFIG = {
  defaultProject: "<Danamon> Squad Development Mobile Apps",
  defaultRole: "Bodyhire",
  defaultCategory: "Sprint",
  defaultStatus: "Completed",
  apiScope: "https://www.googleapis.com/auth/spreadsheets",
  defaultDueDays: 3,
  insertRowIndex: 15,
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getColIndex(letter) {
  if (!letter) return 1; // Default 'B' -> index 1
  return letter.toUpperCase().charCodeAt(0) - 65;
}

function getColLetter(index) {
  return String.fromCharCode(65 + index);
}

/**
 * Get a date formatted as YYYY-MM-DD
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
function getFormattedDate(date) {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * Generates a JWT given the service account credentials
 * @param {Object} credentials - The service account JSON object
 * @returns {string} Signed JWT token
 */
function getJwt(credentials) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: credentials.client_email,
    scope: CONFIG.apiScope,
    aud: credentials.token_uri,
    exp: now + 3600,
    iat: now
  };

  const sHeader = JSON.stringify(header);
  const sClaim = JSON.stringify(claim);
  
  // Uses KJUR from jsrsasign
  return KJUR.jws.JWS.sign(null, sHeader, sClaim, credentials.private_key);
}

/**
 * Fetches the OAuth access token using the service account credentials
 * @param {Object} credentials - The service account JSON object
 * @returns {Promise<string>} The access token
 */
async function getAccessToken(credentials) {
  const jwt = getJwt(credentials);
  
  let response;
  try {
    response = await fetch(credentials.token_uri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      }).toString()
    });
  } catch (e) {
    throw new Error(`fetch() failed in getAccessToken (URL: ${credentials.token_uri}): ${e.message}`);
  }
  
  const data = await response.json();
  if (data.error) {
    throw new Error(`Failed to get access token: ${data.error_description}`);
  }
  return data.access_token;
}

// ==========================================
// GOOGLE SHEETS API WRAPPERS
// ==========================================

/**
 * Fetches spreadsheet metadata to resolve the numeric sheetId to a sheet title
 * @param {string} token - OAuth access token
 * @param {string} spreadsheetId - ID of the spreadsheet
 * @param {number} sheetId - Numeric ID of the specific sheet
 * @returns {Promise<string>} The title (name) of the sheet
 */
async function fetchSheetTitle(token, spreadsheetId, sheetId) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title))`;
  let response;
  try {
    response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  } catch (e) {
    throw new Error(`fetch() failed in fetchSheetTitle: ${e.message}`);
  }
  
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to fetch spreadsheet metadata: ${response.status} ${response.statusText} - ${errText}`);
  }
  
  const data = await response.json();
  const sheet = data.sheets.find(s => s.properties.sheetId === sheetId);
  
  if (!sheet) throw new Error(`Sheet with ID ${sheetId} not found`);
  return sheet.properties.title;
}

/**
 * Scans a specific column to find if a task key already exists
 * @param {string} token - OAuth access token
 * @param {string} spreadsheetId - ID of the spreadsheet
 * @param {string} sheetTitle - Title of the sheet
 * @param {string} taskDetail - The full task string containing the key (e.g. "[KEY] Title")
 * @returns {Promise<number>} The 1-indexed row number if found, or -1 if not found
 */
async function findExistingTaskRow(token, spreadsheetId, sheetTitle, taskDetail, colIndex) {
  const match = taskDetail.match(/^\[(.*?)\]/);
  const taskKey = match ? match[1] : null;
  if (!taskKey) return -1;

  const taskCol = getColLetter(colIndex + 3);
  const encodedRange = encodeURIComponent(`'${sheetTitle}'!${taskCol}:${taskCol}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`;
  
  let response;
  try {
    response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  } catch (e) {
    throw new Error(`fetch() failed in findExistingTaskRow: ${e.message}`);
  }
  
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to fetch existing tasks: ${response.status} ${response.statusText} - ${errText}`);
  }
  
  const data = await response.json();
  const rows = data.values || [];

  for (let i = 0; i < rows.length; i++) {
    if (rows[i] && rows[i][0] && rows[i][0].includes(`[${taskKey}]`)) {
      return i + 1; // Return 1-indexed row number
    }
  }
  return -1;
}

/**
 * Updates an existing row in the spreadsheet
 */
async function updateExistingTask(token, spreadsheetId, sheetTitle, rowNum, payload, colIndex) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valueInputOption: "USER_ENTERED",
        data: [
          { range: `'${sheetTitle}'!${getColLetter(colIndex)}${rowNum}`, values: [[payload.status]] },
          { range: `'${sheetTitle}'!${getColLetter(colIndex + 3)}${rowNum}`, values: [[payload.taskDetail]] },
          { range: `'${sheetTitle}'!${getColLetter(colIndex + 5)}${rowNum}`, values: [[payload.cat]] },
          { range: `'${sheetTitle}'!${getColLetter(colIndex + 6)}${rowNum}`, values: [[payload.due]] }
        ]
      })
    });
  } catch (e) {
    throw new Error(`fetch() failed in updateExistingTask: ${e.message}`);
  }
  
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Google Sheets API Update Error: ${err}`);
  }
}

/**
 * Appends a completely new row into the spreadsheet by inserting a row at index 15
 */
async function insertNewTask(token, spreadsheetId, sheetId, payload, colIndex) {
  const rowData = [
    payload.status, payload.date_ent, payload.project, 
    payload.taskDetail, payload.role, payload.cat, payload.due
  ];
  
  const requests = [
    {
      insertDimension: {
        range: { sheetId: sheetId, dimension: "ROWS", startIndex: CONFIG.insertRowIndex, endIndex: CONFIG.insertRowIndex + 1 },
        inheritFromBefore: true
      }
    },
    {
      updateCells: {
        range: {
          sheetId: sheetId, 
          startRowIndex: CONFIG.insertRowIndex, endRowIndex: CONFIG.insertRowIndex + 1,
          startColumnIndex: colIndex, endColumnIndex: colIndex + rowData.length
        },
        rows: [{
          values: rowData.map(val => val !== "" ? { userEnteredValue: { stringValue: String(val) } } : {})
        }],
        fields: "userEnteredValue"
      }
    }
  ];

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    });
  } catch (e) {
    throw new Error(`fetch() failed in insertNewTask: ${e.message}`);
  }

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Google Sheets API Append Error: ${err}`);
  }
}

// ==========================================
// MAIN WORKFLOW
// ==========================================

/**
 * Orchestrates the task upload flow: fetch metadata -> check duplicates -> update or insert
 */
async function processTaskUpload(accessToken, taskDetail, spreadsheetId, sheetIdStr, taskStatus, taskCategory, taskDueDate, startColumnLetter) {
  const sheetId = parseInt(sheetIdStr, 10);
  const colIndex = getColIndex(startColumnLetter);
  
  // Construct the payload
  const payload = {
    status: taskStatus || CONFIG.defaultStatus,
    date_ent: getFormattedDate(new Date()),
    project: CONFIG.defaultProject,
    taskDetail: taskDetail,
    role: CONFIG.defaultRole,
    cat: taskCategory || CONFIG.defaultCategory,
    due: taskDueDate || getFormattedDate(new Date(Date.now() + CONFIG.defaultDueDays * 24 * 60 * 60 * 1000))
  };
  
  // 1. Resolve numeric sheetId to sheet title
  const sheetTitle = await fetchSheetTitle(accessToken, spreadsheetId, sheetId);

  // 2. Check for duplicates in the specific task detail column
  const existingRowNum = await findExistingTaskRow(accessToken, spreadsheetId, sheetTitle, payload.taskDetail, colIndex);

  // 3. Execute appropriate action
  if (existingRowNum !== -1) {
    await updateExistingTask(accessToken, spreadsheetId, sheetTitle, existingRowNum, payload, colIndex);
  } else {
    await insertNewTask(accessToken, spreadsheetId, sheetId, payload, colIndex);
  }
}

// ==========================================
// EXTENSION EVENT LISTENERS
// ==========================================

// Open options page when the extension icon is clicked
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "addTask") {
    chrome.storage.local.get(['serviceAccountCredentials', 'spreadsheetId', 'sheetId', 'startColumn'], async (result) => {
      if (!result.serviceAccountCredentials || !result.spreadsheetId || !result.sheetId) {
        sendResponse({ success: false, error: 'Extension not fully configured. Please configure in options.' });
        return;
      }
      
      try {
        const token = await getAccessToken(result.serviceAccountCredentials);
        await processTaskUpload(
          token, 
          request.taskDetail, 
          result.spreadsheetId, 
          result.sheetId, 
          request.taskStatus, 
          request.taskCategory, 
          request.taskDueDate,
          result.startColumn || 'B'
        );
        sendResponse({ success: true });
      } catch (e) {
        console.error("Task Tracker Error:", e);
        sendResponse({ success: false, error: e.message });
      }
    });
    
    // Return true to indicate asynchronous response
    return true;
  }
});
