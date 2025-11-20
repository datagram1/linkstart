/**
 * Popup script for LinkStart
 * Displays groups and handles launching
 */

let groups = [];
let settings = {};

/**
 * Initialize popup
 */
async function init() {
  try {
    // Load groups and settings from background
    const [groupsResponse, settingsResponse] = await Promise.all([
      browser.runtime.sendMessage({ action: 'getGroups' }),
      browser.runtime.sendMessage({ action: 'getSettings' })
    ]);

    groups = groupsResponse.groups || [];
    settings = settingsResponse.settings || { mode: 'multi' };

    renderGroups();
  } catch (error) {
    console.error('Error initializing popup:', error);
  }
}

/**
 * Render groups in the popup
 */
function renderGroups() {
  const container = document.getElementById('groupsContainer');
  const emptyState = document.getElementById('emptyState');

  if (groups.length === 0) {
    container.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  container.style.display = 'block';
  emptyState.style.display = 'none';
  container.innerHTML = '';

  // If single mode and default group is set, show only that group
  if (settings.mode === 'single' && settings.defaultGroupId) {
    const defaultGroup = groups.find(g => g.id === settings.defaultGroupId);
    if (defaultGroup) {
      renderGroup(defaultGroup);
      return;
    }
  }

  // Multi mode: show all groups
  groups.forEach(group => {
    renderGroup(group);
  });
}

/**
 * Render a single group
 * @param {Object} group - Group object
 */
function renderGroup(group) {
  const container = document.getElementById('groupsContainer');

  const enabledSites = group.sites.filter(site => site.enabled !== false);
  const siteCount = enabledSites.length;

  const groupElement = document.createElement('div');
  groupElement.className = 'group-item';

  // Create header
  const header = document.createElement('div');
  header.className = 'group-header';

  const nameSpan = document.createElement('span');
  nameSpan.className = 'group-name';
  nameSpan.textContent = group.name;

  const countSpan = document.createElement('span');
  countSpan.className = 'site-count';
  countSpan.textContent = `${siteCount} site${siteCount !== 1 ? 's' : ''}`;

  header.appendChild(nameSpan);
  header.appendChild(countSpan);

  // Create launch button
  const launchBtn = document.createElement('button');
  launchBtn.className = 'launch-btn';
  launchBtn.dataset.groupId = group.id;
  if (siteCount === 0) {
    launchBtn.disabled = true;
  }

  // SVG icon (static HTML, no variables)
  launchBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z"/>
      </svg>`;

  const btnText = document.createTextNode(` Launch ${group.name}`);
  launchBtn.appendChild(btnText);

  // Add click handler for launch button
  launchBtn.addEventListener('click', () => launchGroup(group.id));

  groupElement.appendChild(header);
  groupElement.appendChild(launchBtn);
  container.appendChild(groupElement);
}

/**
 * Launch a group
 * @param {string} groupId - Group ID to launch
 */
async function launchGroup(groupId) {
  try {
    // Disable all launch buttons
    document.querySelectorAll('.launch-btn').forEach(btn => {
      btn.disabled = true;
      btn.textContent = 'Launching...';
    });

    // Send message to background script to launch group
    await browser.runtime.sendMessage({
      action: 'launchGroup',
      groupId: groupId
    });

    // Close popup after launching
    window.close();

  } catch (error) {
    console.error('Error launching group:', error);

    // Re-enable buttons
    document.querySelectorAll('.launch-btn').forEach(btn => {
      btn.disabled = false;
    });

    alert('Failed to launch group: ' + error.message);
  }
}

/**
 * Open settings page
 */
function openSettings() {
  browser.runtime.openOptionsPage();
  window.close();
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Event listeners
document.getElementById('settingsBtn').addEventListener('click', openSettings);
document.getElementById('createFirstGroup').addEventListener('click', openSettings);

// Initialize on load
init();
