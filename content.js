// ==========================================
// CONSTANTS & SELECTORS
// ==========================================
const CONFIG = {
  buttonId: 'add-task-tracker-btn',
  modalId: 'task-tracker-modal-overlay',
  defaultDueDays: 3,
  selectors: {
    title: '#summary-val',
    key: '#key-val',
    statusAttr: '[data-issue-status]',
    statusId: '#status-val',
    typeAttr: '[data-issue-type]',
    typeId: '#type-val',
    transitionsBtn: '#opsbar-transitions_more',
    transitionsOpsbar: '#opsbar-opsbar-transitions',
    operationsOpsbar: '#opsbar-opsbar-operations',
    listLayoutToolbar: '#stalker > div > div.command-bar > div > div > div > div > ul'
  }
};

// ==========================================
// DOM EXTRACTION LOGIC
// ==========================================

/**
 * Extracts Jira Issue data from the DOM
 * @returns {Object|null} Extracted issue data or null if not found
 */
function extractJiraData() {
  const titleEl = document.querySelector(CONFIG.selectors.title);
  const keyEl = document.querySelector(CONFIG.selectors.key);

  if (!titleEl || !keyEl) {
    return null;
  }

  const title = titleEl.innerText.trim();
  const key = keyEl.innerText.trim();

  // Jira uses different elements for status depending on version/theme
  const statusValEl = document.querySelector(CONFIG.selectors.statusId);
  const dataIssueStatusEl = document.querySelector(CONFIG.selectors.statusAttr);
  let rawStatus = "";
  if (statusValEl) {
    rawStatus = statusValEl.innerText.trim().toUpperCase();
  } else if (dataIssueStatusEl) {
    rawStatus = (dataIssueStatusEl.getAttribute('data-issue-status') || "").trim().toUpperCase();
  }

  // Same for issue type
  const typeValEl = document.querySelector(CONFIG.selectors.typeId);
  const dataIssueTypeEl = document.querySelector(CONFIG.selectors.typeAttr);
  let rawType = "";
  if (typeValEl) {
    rawType = typeValEl.innerText.trim().toUpperCase();
  } else if (dataIssueTypeEl) {
    rawType = (dataIssueTypeEl.getAttribute('data-issue-type') || "").trim().toUpperCase();
  }

  return { key, title, rawStatus, rawType };
}

/**
 * Maps Jira status and type to Google Sheets format
 * @param {string} rawStatus - Extracted status string
 * @param {string} rawType - Extracted type string
 * @returns {Object} Mapped status and category
 */
function mapJiraDataToSheet(rawStatus, rawType) {
  let sheetStatus = "Complete";
  if (rawStatus.includes("IN PROGRESS")) {
    sheetStatus = "In Progress";
  }

  let sheetCategory = "Sprint";
  if (rawType.includes("BUG")) {
    sheetCategory = "Bugfixing";
  } else if (rawType.includes("TASK") || rawType.includes("SUB-TASK") || rawType.includes("SUB TASK")) {
    sheetCategory = "Sprint";
  }

  return { sheetStatus, sheetCategory };
}

// ==========================================
// BUTTON INJECTION & EVENT HANDLING
// ==========================================

/**
 * Finds the correct target <ul> to inject the button into
 * @returns {Element|null} The target <ul> element
 */
function getMountPoint() {
  let opsbarUl = null;

  // 1. Try to find the status transition button directly (works perfectly in List Layout)
  const transitionsBtn = document.querySelector(CONFIG.selectors.transitionsBtn);
  if (transitionsBtn) {
    opsbarUl = transitionsBtn.closest('ul');
  }

  // 2. Fallback to standard Issue View mount points
  if (!opsbarUl) {
    const mountPoint = document.querySelector(CONFIG.selectors.transitionsOpsbar)
      || document.querySelector(CONFIG.selectors.operationsOpsbar);
    if (mountPoint) {
      opsbarUl = mountPoint.parentNode;
    }
  }

  // 3. Fallback to explicit List Layout selector
  if (!opsbarUl) {
    opsbarUl = document.querySelector(CONFIG.selectors.listLayoutToolbar);
  }

  return opsbarUl;
}

/**
 * Main function to inject the "Add to Task Tracker" button
 */
function injectButton() {
  // Avoid duplicate buttons
  if (document.getElementById(CONFIG.buttonId)) return;

  const opsbarUl = getMountPoint();
  if (!opsbarUl) return;

  const li = document.createElement('li');
  li.className = 'aui-buttons pluggable-ops'; // Match native group class

  const a = document.createElement('a');
  a.id = CONFIG.buttonId;
  a.className = 'aui-button toolbar-trigger issueaction-add-to-tracker';
  a.href = '#';
  a.title = 'Send this issue to Google Sheets Task Tracker';

  const iconSpan = document.createElement('span');
  iconSpan.className = 'animated-cat';
  iconSpan.innerText = '🐱';

  const span = document.createElement('span');
  span.className = 'trigger-label';
  span.innerText = 'Add to Task Tracker';

  a.appendChild(iconSpan);
  a.appendChild(span);
  li.appendChild(a);

  // Append to the end of the button row
  opsbarUl.appendChild(li);

  // Attach event listener
  a.addEventListener('click', (e) => handleButtonClick(e, a, span));
}

/**
 * Handles the logic when the tracker button is clicked
 */
function handleButtonClick(e, buttonElement, labelElement) {
  e.preventDefault();

  const jiraData = extractJiraData();
  if (!jiraData) {
    alert('Could not find issue title or key on page.');
    return;
  }

  const { sheetStatus, sheetCategory } = mapJiraDataToSheet(jiraData.rawStatus, jiraData.rawType);
  const taskDetail = `[${jiraData.key}] ${jiraData.title}`;

  showDatePickerModal((selectedDate) => {
    buttonElement.classList.add('loading');
    labelElement.innerText = 'Sending...';

    chrome.runtime.sendMessage({
      action: 'addTask',
      taskDetail,
      taskStatus: sheetStatus,
      taskCategory: sheetCategory,
      taskDueDate: selectedDate
    }, (response) => {
      buttonElement.classList.remove('loading');
      handleBackgroundResponse(response, buttonElement, labelElement);
    });
  });
}

/**
 * Handles the response from the background script
 */
function handleBackgroundResponse(response, buttonElement, labelElement) {
  if (chrome.runtime.lastError) {
    labelElement.innerText = 'Failed';
    alert(`Error connecting to extension: ${chrome.runtime.lastError.message}`);
    return;
  }

  if (response && response.success) {
    labelElement.innerText = 'Added!';
    buttonElement.style.background = 'linear-gradient(135deg, #36B37E 0%, #00875A 100%)';

    chrome.storage.local.get({ showSuccessAnimation: true }, function (items) {
      if (items.showSuccessAnimation) {
        showMemePopup();

        if (typeof confetti === 'function') {
          var duration = 3 * 1000;
          var animationEnd = Date.now() + duration;
          var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

          function randomInRange(min, max) {
            return Math.random() * (max - min) + min;
          }

          var interval = setInterval(function () {
            var timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
              return clearInterval(interval);
            }

            var particleCount = 50 * (timeLeft / duration);
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
          }, 250);
        }
      }
    });

    setTimeout(() => {
      labelElement.innerText = 'Add to Task Tracker';
      buttonElement.style.background = '';
    }, 3000);
  } else {
    labelElement.innerText = 'Error';
    alert(`Failed to add task: ${response ? response.error : 'Unknown error'}`);
    setTimeout(() => {
      labelElement.innerText = 'Add to Task Tracker';
    }, 3000);
  }
}

// ==========================================
// DATE PICKER MODAL UI
// ==========================================

/**
 * Injects and displays the Date Picker Modal
 * @param {Function} onSubmit - Callback function with the selected date
 */
function showDatePickerModal(onSubmit) {
  let overlay = document.getElementById(CONFIG.modalId);
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = CONFIG.modalId;
    overlay.className = 'task-tracker-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'task-tracker-modal';

    const title = document.createElement('h3');
    title.innerText = 'Set Due Date';

    const label = document.createElement('label');
    label.innerText = 'When is this task due?';

    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.id = 'task-tracker-due-date';

    // Default to +3 days
    const defaultDate = new Date(Date.now() + CONFIG.defaultDueDays * 24 * 60 * 60 * 1000);
    dateInput.value = defaultDate.toISOString().split('T')[0];

    const actions = document.createElement('div');
    actions.className = 'task-tracker-modal-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'task-tracker-modal-btn task-tracker-btn-cancel';
    cancelBtn.innerText = 'Cancel';

    const submitBtn = document.createElement('button');
    submitBtn.className = 'task-tracker-modal-btn task-tracker-btn-submit';
    submitBtn.innerText = 'Confirm';

    actions.append(cancelBtn, submitBtn);
    modal.append(title, label, dateInput, actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Event listeners
    cancelBtn.addEventListener('click', () => overlay.classList.remove('active'));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
    submitBtn.addEventListener('click', () => {
      if (!dateInput.value) {
        alert('Please select a due date.');
        return;
      }
      overlay.classList.remove('active');
      onSubmit(dateInput.value);
    });
  }

  overlay.classList.add('active');
}

// ==========================================
// MEME POPUP UI
// ==========================================

/**
 * Shows a sarcastic Indonesian meme popup
 */
function showMemePopup() {
  const sarcasticMemes = [
    { text: "SELAMAT!\nANDA SEMAKIN MEMBUAT BOS ANDA KAYA", emoji: "🤑" },
    { text: "KERJA KERAS BAGAI QUDA\nGAJI TETAP SEADANYA", emoji: "🐴" },
    { text: "MANTAP!\nCICILAN PAJERO BOS MAKIN LANCAR", emoji: "🚙" },
    { text: "KERJA CERDAS, KERJA IKHLAS\nBOS YANG BELI MERCY", emoji: "💸" },
    { text: "BOS MENGUCAPKAN:\nTERIMA KASIH ATAS PENGABDIANMU", emoji: "🤝" }
  ];

  const meme = sarcasticMemes[Math.floor(Math.random() * sarcasticMemes.length)];

  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
  overlay.style.zIndex = '10000';
  overlay.style.display = 'flex';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.style.flexDirection = 'column';
  overlay.style.opacity = '0';
  overlay.style.transition = 'opacity 0.3s ease';

  const emojiEl = document.createElement('div');
  emojiEl.innerText = meme.emoji;
  emojiEl.style.fontSize = '120px';
  emojiEl.style.marginBottom = '20px';
  emojiEl.style.filter = 'drop-shadow(0 0 20px rgba(255,255,255,0.3))';

  const textEl = document.createElement('div');
  textEl.innerText = meme.text;
  textEl.style.fontFamily = 'Impact, sans-serif';
  textEl.style.fontSize = '54px';
  textEl.style.color = 'white';
  textEl.style.textAlign = 'center';
  textEl.style.textTransform = 'uppercase';
  textEl.style.lineHeight = '1.2';
  textEl.style.textShadow = '3px 3px 0 #000, -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 0 4px 15px rgba(0,0,0,0.8)';

  overlay.appendChild(emojiEl);
  overlay.appendChild(textEl);
  document.body.appendChild(overlay);

  // Trigger animation
  setTimeout(() => {
    overlay.style.opacity = '1';
  }, 10);

  // Remove after 3.5 seconds
  setTimeout(() => {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 300);
  }, 3500);
}

// ==========================================
// LIFECYCLE & MUTATION OBSERVER
// ==========================================

window.addEventListener('load', injectButton);
injectButton(); // Initial try for dynamic loads

// Simple debounce to prevent observer thrashing during heavy SPA loads
let debounceTimeout = null;
const observer = new MutationObserver(() => {
  if (debounceTimeout) return;
  debounceTimeout = setTimeout(() => {
    debounceTimeout = null;
    injectButton();
  }, 300); // 300ms debounce
});

observer.observe(document.body, { childList: true, subtree: true });
setTimeout(injectButton, 1000);
