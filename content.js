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
 * Helper to get the first visible element matching a selector
 */
function getVisibleElement(selector) {
  const els = Array.from(document.querySelectorAll(selector));
  return els.find(el => el.offsetParent !== null) || els[0];
}

/**
 * Extracts Jira Issue data from the DOM and URL
 * @returns {Object|null} Extracted issue data or null if not found
 */
function extractJiraData() {
  // 1. Prioritize getting the key from the URL in SPA list view
  const urlParams = new URLSearchParams(window.location.search);
  let key = urlParams.get('selectedIssue');
  if (!key) {
    const match = window.location.pathname.match(/\/browse\/([A-Z0-9\-]+)/);
    if (match) key = match[1];
  }

  // 2. Only select visible elements (avoids stale DOM nodes from previous tasks)
  const keyEl = getVisibleElement(CONFIG.selectors.key);
  if (!key && keyEl) {
    key = keyEl.innerText.trim();
  }

  const titleEl = getVisibleElement(CONFIG.selectors.title);
  if (!titleEl || !key) {
    return null;
  }

  const title = titleEl.innerText.trim();

  const statusValEl = getVisibleElement(CONFIG.selectors.statusId);
  const dataIssueStatusEl = getVisibleElement(CONFIG.selectors.statusAttr);
  let rawStatus = "";
  if (statusValEl) {
    rawStatus = statusValEl.innerText.trim().toUpperCase();
  } else if (dataIssueStatusEl) {
    rawStatus = (dataIssueStatusEl.getAttribute('data-issue-status') || "").trim().toUpperCase();
  }

  const typeValEl = getVisibleElement(CONFIG.selectors.typeId);
  const dataIssueTypeEl = getVisibleElement(CONFIG.selectors.typeAttr);
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
  const jiraData = extractJiraData();
  if (!jiraData) return;

  const existingButton = document.getElementById(CONFIG.buttonId);
  if (existingButton) {
    if (existingButton.dataset.taskKey !== jiraData.key) {
      // Task changed in SPA, remove stale button container
      existingButton.closest('li.pluggable-ops')?.remove();
    } else {
      // Button already exists for this task
      return;
    }
  }

  const opsbarUl = getMountPoint();
  if (!opsbarUl) return;

  const li = document.createElement('li');
  li.className = 'aui-buttons pluggable-ops'; // Match native group class

  const a = document.createElement('a');
  a.id = CONFIG.buttonId;
  a.dataset.taskKey = jiraData.key;
  a.className = 'aui-button toolbar-trigger issueaction-add-to-tracker';
  a.href = '#';
  a.title = 'Send this issue to Google Sheets Task Tracker';

  const iconSpan = document.createElement('span');
  iconSpan.className = 'animated-cat';
  iconSpan.style.display = 'inline-flex';
  iconSpan.style.alignItems = 'center';
  iconSpan.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3.1-9-7.56c0-1.25.43-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5Z"/>
      <path d="M8 14v.5"/>
      <path d="M16 14v.5"/>
      <path d="M11.25 16.25h1.5L12 17l-.75-.75Z"/>
    </svg>
  `;

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

    chrome.storage.local.get({ successAnimationType: 'image' }, function (items) {
      if (items.successAnimationType === 'image') {
        const parrotContainer = document.createElement('div');
        parrotContainer.style.position = 'fixed';
        parrotContainer.style.top = '0';
        parrotContainer.style.left = '0';
        parrotContainer.style.width = '100vw';
        parrotContainer.style.height = '100vh';
        parrotContainer.style.display = 'flex';
        parrotContainer.style.flexDirection = 'column';
        parrotContainer.style.justifyContent = 'center';
        parrotContainer.style.alignItems = 'center';
        parrotContainer.style.zIndex = '999999';
        parrotContainer.style.pointerEvents = 'none';
        parrotContainer.style.opacity = '0';
        parrotContainer.style.transform = 'scale(0.5)';
        parrotContainer.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

        const parrot = document.createElement('img');
        parrot.src = chrome.runtime.getURL('jkw-bck.png');
        parrot.style.width = '50vmin'; // Giant image relative to screen size
        parrotContainer.appendChild(parrot);

        const memeText = document.createElement('div');
        memeText.innerText = 'SIP';
        memeText.style.fontFamily = 'Impact, "Arial Black", sans-serif';
        memeText.style.fontSize = '120px';
        memeText.style.color = 'white';
        memeText.style.textTransform = 'uppercase';
        memeText.style.textShadow = '3px 3px 0 #000, -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 0 6px 0 #000, 6px 6px 10px rgba(0,0,0,0.5)';
        memeText.style.marginTop = '20px';
        memeText.style.letterSpacing = '5px';
        parrotContainer.appendChild(memeText);

        document.body.appendChild(parrotContainer);

        const audio = new Audio(chrome.runtime.getURL('hidup-jokowi.mp3'));

        setTimeout(() => {
          parrotContainer.style.opacity = '1';
          parrotContainer.style.transform = 'scale(1)';
          audio.play().catch(e => console.log('Audio playback blocked by browser', e));
        }, 50);

        setTimeout(() => {
          parrotContainer.style.opacity = '0';
          parrotContainer.style.transform = 'scale(0.5)';
          setTimeout(() => parrotContainer.remove(), 500);
        }, 1500);
      } else if (items.successAnimationType === 'confetti' && typeof confetti === 'function') {
        // Fast, intense burst from the middle
        confetti({
          particleCount: 150,
          spread: 100,
          startVelocity: 60,
          origin: { x: 0.5, y: 0.5 }, // Center of screen
          zIndex: 999999,
          gravity: 1.2,
          scalar: 1.2
        });
      }
    });

    // Make the button unclickable and permanently "Done"
    buttonElement.style.pointerEvents = 'none';
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
  let existingOverlay = document.getElementById(CONFIG.modalId);

  if (existingOverlay) {
    existingOverlay.remove();
  }

  let overlay = document.createElement('div');
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

  overlay.classList.add('active');
}

// ==========================================
// LIFECYCLE & MUTATION OBSERVER
// ==========================================

window.addEventListener('load', () => {
  injectButton();
  injectQuickJump();
});
// Initial try for dynamic loads
injectButton();
injectQuickJump();

// Simple debounce to prevent observer thrashing during heavy SPA loads
let debounceTimeout = null;
const observer = new MutationObserver(() => {
  if (debounceTimeout) return;
  debounceTimeout = setTimeout(() => {
    debounceTimeout = null;
    injectButton();
    injectQuickJump();
  }, 300); // 300ms debounce
});

observer.observe(document.body, { childList: true, subtree: true });

// ==========================================
// QUICK JUMP (MACRO TRANSITIONS)
// ==========================================

const STATUS_WEIGHT = {
  "NEW": 0,
  "REVIEW TO DROP": 5,
  "OPEN": 10,
  "POSTPONED": 15,
  "FIX IN PROGRESS": 20,
  "FIXED": 30,
  "DEPLOY TO SIT": 40,
  "SIT PENDING TESTING": 50,
  "SIT RE-OPEN": 45,
  "SIT OK": 60,
  "DEPLOY TO UAT": 70,
  "UAT PENDING TESTING": 80,
  "UAT RE-OPEN": 75,
  "UAT PASSED": 90,
  "CLOSED": 100,
  "DROPPED": 100
};

const COMMON_TARGETS = [
  "OPEN",
  "FIX IN PROGRESS",
  "FIXED",
  "DEPLOY TO SIT",
  "SIT PENDING TESTING",
  "DEPLOY TO UAT",
  "UAT PENDING TESTING",
  "CLOSED"
];

function injectQuickJump() {
  const jiraData = extractJiraData();
  if (!jiraData) return;

  const opsbarUl = getMountPoint();
  if (!opsbarUl) return;

  const existingBtn = document.getElementById('quick-jump-btn');
  if (existingBtn) {
    if (existingBtn.dataset.taskKey !== jiraData.key) {
      existingBtn.closest('li').remove();
    } else {
      return;
    }
  }

  const li = document.createElement('li');
  li.className = 'aui-buttons pluggable-ops';

  const btn = document.createElement('a');
  btn.id = 'quick-jump-btn';
  btn.dataset.taskKey = jiraData.key;
  btn.className = 'aui-button quick-jump-btn';
  btn.href = '#';
  btn.innerHTML = `<span class="aui-icon aui-icon-small aui-iconfont-send" style="color:white; margin-right:4px;"></span>Quick Jump`;
  
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    showQuickJumpModal(jiraData);
  });
  
  li.appendChild(btn);
  opsbarUl.appendChild(li);
}

function showQuickJumpModal(jiraData) {
  let existingOverlay = document.getElementById('quick-jump-modal-overlay');
  if (existingOverlay) existingOverlay.remove();

  const overlay = document.createElement('div');
  overlay.id = 'quick-jump-modal-overlay';
  overlay.className = 'task-tracker-modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'task-tracker-modal';
  modal.style.width = '360px';

  const title = document.createElement('h3');
  title.innerText = '🚀 Quick Jump';

  const desc = document.createElement('p');
  desc.innerText = 'Select a target status. We will automatically transition the issue through the workflow for you.';
  desc.style.color = '#5e6c84';
  desc.style.fontSize = '13px';
  desc.style.marginBottom = '16px';

  const targetsContainer = document.createElement('div');
  targetsContainer.className = 'quick-jump-targets';

  COMMON_TARGETS.forEach(target => {
    if (target.toUpperCase() === jiraData.rawStatus) return; // Skip current
    
    const btn = document.createElement('button');
    btn.className = 'quick-jump-target-btn';
    btn.innerText = target;
    btn.addEventListener('click', () => {
      startMacroTransition(jiraData, target, modal, overlay);
    });
    targetsContainer.appendChild(btn);
  });

  const closeBtn = document.createElement('button');
  closeBtn.className = 'task-tracker-modal-btn task-tracker-btn-cancel';
  closeBtn.innerText = 'Cancel';
  closeBtn.style.width = '100%';
  closeBtn.style.marginTop = '16px';
  closeBtn.addEventListener('click', () => overlay.classList.remove('active'));

  modal.append(title, desc, targetsContainer, closeBtn);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Trigger reflow for animation
  void overlay.offsetWidth;
  overlay.classList.add('active');
}

async function startMacroTransition(jiraData, targetStatus, modalElement, overlayElement) {
  // Update UI to loading state
  modalElement.innerHTML = '';
  
  const title = document.createElement('h3');
  title.innerText = '🚀 Jumping...';
  title.style.textAlign = 'center';
  
  const progressText = document.createElement('p');
  progressText.innerText = `Target: ${targetStatus}`;
  progressText.style.textAlign = 'center';
  progressText.style.color = '#0052cc';
  progressText.style.fontWeight = 'bold';
  progressText.style.margin = '16px 0';

  const logs = document.createElement('div');
  logs.style.fontSize = '12px';
  logs.style.color = '#5e6c84';
  logs.style.background = '#f4f5f7';
  logs.style.padding = '8px';
  logs.style.borderRadius = '4px';
  logs.style.maxHeight = '150px';
  logs.style.overflowY = 'auto';

  modalElement.append(title, progressText, logs);

  const addLog = (msg) => {
    const el = document.createElement('div');
    el.innerText = `• ${msg}`;
    logs.appendChild(el);
    logs.scrollTop = logs.scrollHeight;
  };

  const issueKey = jiraData.key;
  const targetWeight = STATUS_WEIGHT[targetStatus.toUpperCase()];

  if (targetWeight === undefined) {
    addLog(`Error: Target status weight unknown.`);
    setTimeout(() => overlayElement.classList.remove('active'), 3000);
    return;
  }

  addLog(`Starting macro transition for ${issueKey}`);

  let currentStatus = jiraData.rawStatus;
  let safetyCounter = 0;

  while (currentStatus !== targetStatus.toUpperCase() && safetyCounter < 10) {
    safetyCounter++;
    
    // Fetch current available transitions
    let transitionsData;
    try {
      const res = await fetch(`/rest/api/2/issue/${issueKey}/transitions`);
      if (!res.ok) throw new Error('API Error');
      transitionsData = await res.json();
    } catch(e) {
      addLog(`Failed to fetch transitions.`);
      break;
    }

    const available = transitionsData.transitions;
    if (!available || available.length === 0) {
      addLog(`No transitions available from ${currentStatus}. Stuck.`);
      break;
    }

    // Find the best transition using greedy algorithm
    let bestTransition = null;
    let minDistance = Infinity;

    available.forEach(t => {
      const toName = t.to.name.toUpperCase();
      const weight = STATUS_WEIGHT[toName];
      if (weight !== undefined) {
        const distance = Math.abs(targetWeight - weight);
        if (distance < minDistance) {
          minDistance = distance;
          bestTransition = t;
        }
      }
    });

    if (!bestTransition) {
      addLog(`Cannot find a known path from ${currentStatus}. Stuck.`);
      break;
    }

    const nextStatus = bestTransition.to.name.toUpperCase();
    
    // Check if we are stuck in a loop or not making progress
    // e.g., if distance doesn't strictly decrease, but for some complex paths it might temporarily increase
    // but the greedy approach prevents loops since it strictly minimizes distance to target
    
    addLog(`Executing: ${bestTransition.name} -> ${nextStatus}`);
    
    // POST transition
    try {
       const postRes = await fetch(`/rest/api/2/issue/${issueKey}/transitions`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ transition: { id: bestTransition.id } })
       });
       
       if (!postRes.ok) {
         addLog(`Transition failed!`);
         break;
       }
       
       currentStatus = nextStatus;
       if (currentStatus === targetStatus.toUpperCase()) {
         addLog(`🎉 Successfully reached ${targetStatus}!`);
       }
    } catch(err) {
       addLog(`Error during transition.`);
       break;
    }
  }

  if (safetyCounter >= 10) {
    addLog(`Stopped due to too many steps.`);
  }

  addLog(`Reloading page...`);
  setTimeout(() => {
    location.reload();
  }, 1000);
}

