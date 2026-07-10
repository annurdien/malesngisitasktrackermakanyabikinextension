// Saves options to chrome.storage
function save_options() {
  const credentialsText = document.getElementById('credentials').value;
  const spreadsheetId = document.getElementById('spreadsheetId').value.trim();
  const sheetId = document.getElementById('sheetId').value.trim();

  try {
    const credentials = credentialsText ? JSON.parse(credentialsText) : null;
    chrome.storage.local.set({
      serviceAccountCredentials: credentials,
      spreadsheetId: spreadsheetId,
      sheetId: sheetId
    }, function() {
      // Update status to let user know options were saved.
      const status = document.getElementById('status');
      status.textContent = 'Settings saved securely!';
      setTimeout(function() {
        status.textContent = '';
      }, 3000);
    });
  } catch (e) {
    const status = document.getElementById('status');
    status.style.color = 'red';
    status.textContent = 'Invalid JSON! Please check your credentials format.';
    setTimeout(function() {
      status.style.color = 'green';
      status.textContent = '';
    }, 4000);
  }
}

// Restores text box state using the preferences stored in chrome.storage.
function restore_options() {
  chrome.storage.local.get({
    serviceAccountCredentials: null,
    spreadsheetId: '',
    sheetId: ''
  }, function(items) {
    if (items.serviceAccountCredentials) {
      document.getElementById('credentials').value = JSON.stringify(items.serviceAccountCredentials, null, 2);
    }
    document.getElementById('spreadsheetId').value = items.spreadsheetId;
    document.getElementById('sheetId').value = items.sheetId;
  });
}
// Auto-extract IDs from Spreadsheet URL
function extractIdsFromUrl() {
  const urlInput = document.getElementById('spreadsheetUrl').value.trim();
  const statusDiv = document.getElementById('extractStatus');
  
  if (!urlInput) {
    statusDiv.textContent = 'Paste URL here to automatically fill the IDs below.';
    statusDiv.style.color = '#5e6c84';
    return;
  }

  // Regex to extract Spreadsheet ID
  const idMatch = urlInput.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  // Regex to extract Sheet ID (gid)
  const gidMatch = urlInput.match(/[#&?]gid=([0-9]+)/);

  let success = false;
  if (idMatch && idMatch[1]) {
    document.getElementById('spreadsheetId').value = idMatch[1];
    success = true;
  }
  if (gidMatch && gidMatch[1]) {
    document.getElementById('sheetId').value = gidMatch[1];
    success = true;
  }

  if (success) {
    statusDiv.textContent = 'IDs successfully extracted!';
    statusDiv.style.color = 'green';
  } else {
    statusDiv.textContent = 'Could not detect valid Google Sheets URL format.';
    statusDiv.style.color = 'red';
  }
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
document.getElementById('spreadsheetUrl').addEventListener('input', extractIdsFromUrl);
