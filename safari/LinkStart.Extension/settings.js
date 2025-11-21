/**
 * Settings page script for LinkStart
 * Handles group and site management, settings configuration
 */

let groups = [];
let settings = {};
let urls = [];
let currentEditingGroup = null;
let currentEditingSite = null;
let currentEditingUrl = null;

/**
 * Script Library - Example automation scripts
 */
const scriptLibrary = [
  {
    id: 'youtube-consent-signin',
    name: 'YouTube - Accept Cookies & Sign In',
    description: 'Automatically accepts YouTube\'s cookie consent dialog and clicks the Sign in button.',
    site: 'YouTube (youtube.com)',
    tags: ['YouTube', 'Cookie Consent', 'Sign In'],
    script: `// Enable debug logging
log('YouTube automation started');

// Wait for page to be fully loaded
log('Waiting for page load...');
await waitForPageLoad();

// Wait a bit for YouTube's JavaScript to initialize
log('Waiting for network idle...');
await waitForNetworkIdle(2000);

// Check if consent dialog exists
log('Checking for consent dialog...');
if (elementExists('ytd-consent-bump-v2-lightbox')) {
  log('Consent dialog found, waiting for it to render...');
  await waitForElement('ytd-consent-bump-v2-lightbox', 5000);
  await sleep(500);

  log('Clicking Accept all button...');
  await clickElement('button[aria-label*="Accept the use of cookies"]');
  log('Accept button clicked!');
} else {
  log('No consent dialog found - already accepted');
}

// Wait for page to settle after accepting cookies
log('Waiting for page to update...');
await sleep(1000);

// Click the Sign in button
log('Looking for Sign in button...');
if (elementExists('a[aria-label="Sign in"]')) {
  log('Sign in button found, clicking...');
  await clickElement('a[aria-label="Sign in"]');
  log('Sign in button clicked! Redirecting to Google login...');
} else {
  log('Sign in button not found - may already be signed in');
}

log('YouTube automation complete');`
  },
  {
    id: 'cookie-banner-accept',
    name: 'Generic Cookie Banner - Accept All',
    description: 'Dismisses common cookie consent banners by clicking "Accept" buttons.',
    site: 'General use',
    tags: ['Cookie Consent', 'Generic'],
    script: `// Common cookie banner selectors
const cookieSelectors = [
  'button[aria-label*="Accept"]',
  'button[aria-label*="accept"]',
  '.cookie-accept',
  '#cookie-accept',
  'button:contains("Accept all")',
  'button:contains("Accept All")',
  '.accept-cookies',
  '#accept-cookies'
];

log('Looking for cookie banner...');

// Try each selector
for (const selector of cookieSelectors) {
  if (elementExists(selector)) {
    log('Cookie banner found with selector:', selector);
    await clickElement(selector);
    log('Clicked accept button');
    break;
  }
}

log('Cookie banner check complete');`
  },
  {
    id: 'wait-then-click',
    name: 'Wait for Element Then Click',
    description: 'Template for waiting for a specific element to appear, then clicking it.',
    site: 'Template',
    tags: ['Template', 'Basic'],
    script: `// Wait for the element to appear (up to 10 seconds)
log('Waiting for element...');
await waitForElement('#your-selector-here', 10000);

// Optional: wait a bit more for animations
await sleep(500);

// Click the element
log('Clicking element...');
await clickElement('#your-selector-here');

log('Done!');`
  },
  {
    id: 'form-autofill',
    name: 'Auto-Fill Form Template',
    description: 'Template for automatically filling out a form with your information.',
    site: 'Template',
    tags: ['Template', 'Form', 'Login'],
    script: `// Wait for the form to load
await waitForElement('#username');

log('Filling in form...');

// Fill in the fields
await fillInput('#username', 'your-username');
await fillInput('#email', 'your-email@example.com');
await fillInput('#password', 'your-password');

// Optional: check a checkbox
await setChecked('#remember-me', true);

// Optional: select from dropdown
await selectOption('#country', 'USA');

// Submit the form
await clickElement('#submit-button');

log('Form submitted!');`
  }
];

/**
 * Initialize settings page
 */
async function init() {
  try {
    await loadData();
    renderUrls();
    renderGroups();
    renderSettings();
    renderScriptLibrary();
    setupEventListeners();
  } catch (error) {
    debug.error('Error initializing settings:', error);
    alert('Failed to load settings: ' + error.message);
  }
}

/**
 * Load data from storage
 */
async function loadData() {
  const [groupsResponse, settingsResponse, urlsData] = await Promise.all([
    browser.runtime.sendMessage({ action: 'getGroups' }),
    browser.runtime.sendMessage({ action: 'getSettings' }),
    browser.storage.local.get('urls')
  ]);

  groups = groupsResponse.groups || [];
  settings = settingsResponse.settings || { mode: 'multi', defaultGroupId: null, autostartDelay: 10 };
  urls = urlsData.urls || [];
}

/**
 * Save data to storage
 */
async function saveData() {
  await Promise.all([
    browser.runtime.sendMessage({ action: 'saveGroups', groups }),
    browser.runtime.sendMessage({ action: 'saveSettings', settings })
  ]);
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Group actions
  document.getElementById('addGroupBtn').addEventListener('click', () => openGroupModal());
  document.getElementById('saveGroupBtn').addEventListener('click', saveGroup);
  document.getElementById('cancelGroupBtn').addEventListener('click', closeGroupModal);

  // Site actions
  document.getElementById('saveSiteBtn').addEventListener('click', saveSite);
  document.getElementById('cancelSiteBtn').addEventListener('click', closeSiteModal);
  document.getElementById('addUrlToGroup').addEventListener('click', moveUrlsToSelected);
  document.getElementById('removeUrlFromGroup').addEventListener('click', moveUrlsToAvailable);

  // Script editor actions
  document.getElementById('saveScriptBtn').addEventListener('click', saveScript);
  document.getElementById('cancelScriptBtn').addEventListener('click', closeScriptModal);

  // URL actions
  document.getElementById('addUrlBtn').addEventListener('click', () => openUrlModal());
  document.getElementById('saveUrlBtn').addEventListener('click', saveUrl);
  document.getElementById('cancelUrlBtn').addEventListener('click', closeUrlModal);

  // Modal close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      closeGroupModal();
      closeSiteModal();
      closeScriptModal();
      closeUrlModal();
    });
  });

  // Click outside modal to close
  document.getElementById('groupModal').addEventListener('click', (e) => {
    if (e.target.id === 'groupModal') closeGroupModal();
  });
  document.getElementById('siteModal').addEventListener('click', (e) => {
    if (e.target.id === 'siteModal') closeSiteModal();
  });
  document.getElementById('scriptModal').addEventListener('click', (e) => {
    if (e.target.id === 'scriptModal') closeScriptModal();
  });
  document.getElementById('urlModal').addEventListener('click', (e) => {
    if (e.target.id === 'urlModal') closeUrlModal();
  });

  // Settings
  document.querySelectorAll('input[name="mode"]').forEach(radio => {
    radio.addEventListener('change', () => {
      settings.mode = radio.value;
      updateDefaultGroupSelect();
    });
  });

  document.getElementById('defaultGroup').addEventListener('change', (e) => {
    settings.defaultGroupId = e.target.value || null;
  });

  document.getElementById('autostartDelay').addEventListener('change', (e) => {
    settings.autostartDelay = parseInt(e.target.value) || 0;
  });

  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);

  // Import/Export
  document.getElementById('exportBtn').addEventListener('click', exportData);
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });
  document.getElementById('importFile').addEventListener('change', importData);
}

/**
 * Switch tabs
 */
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === tabName + 'Tab');
  });
}

/**
 * Render groups list
 */
function renderGroups() {
  const container = document.getElementById('groupsList');
  const emptyState = document.getElementById('emptyGroupsState');

  if (groups.length === 0) {
    container.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  container.style.display = 'block';
  emptyState.style.display = 'none';
  container.innerHTML = '';

  groups.forEach(group => {
    const groupCard = createGroupCard(group);
    container.appendChild(groupCard);
  });
}

/**
 * Create a group card element
 */
function createGroupCard(group) {
  const card = document.createElement('div');
  card.className = 'group-card';
  card.dataset.groupId = group.id;

  const enabledSites = group.sites.filter(s => s.enabled !== false).length;
  const totalSites = group.sites.length;

  // Create header
  const header = document.createElement('div');
  header.className = 'group-card-header';

  const info = document.createElement('div');
  info.className = 'group-info';

  const title = document.createElement('div');
  title.className = 'group-title';
  title.textContent = group.name;

  const meta = document.createElement('div');
  meta.className = 'group-meta';
  meta.textContent = `${enabledSites} of ${totalSites} sites enabled`;

  info.appendChild(title);
  info.appendChild(meta);

  const actions = document.createElement('div');
  actions.className = 'group-actions';

  const testBtn = document.createElement('button');
  testBtn.className = 'test-btn test-group';
  testBtn.title = 'Test group (launch all sites)';
  testBtn.textContent = '🚀 Test';

  const editBtn = document.createElement('button');
  editBtn.className = 'icon-btn edit-group';
  editBtn.title = 'Edit group name';
  editBtn.textContent = '✏️ Edit';

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'icon-btn delete-group';
  deleteBtn.title = 'Delete group';
  deleteBtn.textContent = '🗑️ Delete';

  actions.appendChild(testBtn);
  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);

  header.appendChild(info);
  header.appendChild(actions);

  // Create options section
  const options = document.createElement('div');
  options.className = 'group-options';

  const label = document.createElement('label');
  label.className = 'checkbox-label autostart-label';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'autostart-checkbox';
  checkbox.checked = group.autostart || false;

  const labelText = document.createElement('span');
  labelText.textContent = '🚀 Launch this group automatically when Firefox starts';

  label.appendChild(checkbox);
  label.appendChild(labelText);
  options.appendChild(label);

  // Create body
  const body = document.createElement('div');
  body.className = 'group-card-body';

  const sitesList = document.createElement('div');
  sitesList.className = 'sites-list';

  if (group.sites.length > 0) {
    group.sites.forEach(site => {
      const siteElement = createSiteItemElement(group.id, site);
      sitesList.appendChild(siteElement);
    });
  } else {
    const emptySites = document.createElement('div');
    emptySites.className = 'empty-sites';
    emptySites.textContent = 'No sites in this group yet.';
    sitesList.appendChild(emptySites);
  }

  const addSiteBtn = document.createElement('button');
  addSiteBtn.className = 'primary-btn add-site';
  addSiteBtn.dataset.groupId = group.id;
  addSiteBtn.textContent = '+ Add Site';

  body.appendChild(sitesList);
  body.appendChild(addSiteBtn);

  // Assemble card
  card.appendChild(header);
  card.appendChild(options);
  card.appendChild(body);

  // Event listeners
  header.addEventListener('click', (e) => {
    if (!e.target.closest('.group-actions')) {
      card.classList.toggle('expanded');
    }
  });

  testBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    testGroup(group.id);
  });

  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    editGroup(group.id);
  });

  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteGroup(group.id);
  });

  addSiteBtn.addEventListener('click', () => {
    openSiteModal(group.id);
  });

  // Autostart checkbox listener
  checkbox.addEventListener('change', async (e) => {
    await toggleAutostart(group.id, e.target.checked);
  });

  // Site action listeners
  card.querySelectorAll('.delete-site').forEach(btn => {
    btn.addEventListener('click', () => {
      const siteId = btn.closest('.site-item').dataset.siteId;
      deleteSite(group.id, siteId);
    });
  });

  return card;
}

/**
 * Create a site item element
 */
function createSiteItemElement(groupId, site) {
  const siteItem = document.createElement('div');
  siteItem.className = 'site-item';
  if (site.enabled === false) {
    siteItem.classList.add('disabled');
  }
  siteItem.dataset.siteId = site.id;

  const siteInfo = document.createElement('div');
  siteInfo.className = 'site-info';

  const siteName = document.createElement('div');
  siteName.className = 'site-name';
  siteName.textContent = site.name;

  if (site.automationScript) {
    const badge = document.createElement('span');
    badge.className = 'site-badge has-script';
    badge.textContent = 'Has Script';
    siteName.appendChild(document.createTextNode(' '));
    siteName.appendChild(badge);
  }

  const siteUrl = document.createElement('div');
  siteUrl.className = 'site-url';
  siteUrl.textContent = site.url;

  siteInfo.appendChild(siteName);
  siteInfo.appendChild(siteUrl);

  const siteActions = document.createElement('div');
  siteActions.className = 'site-actions';

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'icon-btn delete-site';
  deleteBtn.title = 'Remove from group';
  deleteBtn.textContent = '🗑️';

  siteActions.appendChild(deleteBtn);

  siteItem.appendChild(siteInfo);
  siteItem.appendChild(siteActions);

  return siteItem;
}

/**
 * Open group modal for adding/editing
 */
function openGroupModal(groupId = null) {
  currentEditingGroup = groupId;
  const modal = document.getElementById('groupModal');
  const title = document.getElementById('groupModalTitle');
  const input = document.getElementById('groupName');

  if (groupId) {
    const group = groups.find(g => g.id === groupId);
    title.textContent = 'Edit Group';
    input.value = group.name;
  } else {
    title.textContent = 'Add Group';
    input.value = '';
  }

  modal.classList.add('active');
  input.focus();
}

/**
 * Close group modal
 */
function closeGroupModal() {
  document.getElementById('groupModal').classList.remove('active');
  currentEditingGroup = null;
}

/**
 * Save group
 */
async function saveGroup() {
  const name = document.getElementById('groupName').value.trim();

  if (!name) {
    alert('Please enter a group name');
    return;
  }

  try {
    if (currentEditingGroup) {
      // Edit existing group
      await browser.runtime.sendMessage({
        action: 'updateGroup',
        groupId: currentEditingGroup,
        updates: { name }
      });
    } else {
      // Add new group
      await browser.runtime.sendMessage({
        action: 'addGroup',
        name
      });
    }

    await loadData();
    renderGroups();
    updateDefaultGroupSelect();
    closeGroupModal();
  } catch (error) {
    debug.error('Error saving group:', error);
    alert('Failed to save group: ' + error.message);
  }
}

/**
 * Edit group
 */
function editGroup(groupId) {
  openGroupModal(groupId);
}

/**
 * Test group by launching all sites
 */
async function testGroup(groupId) {
  try {
    await browser.runtime.sendMessage({
      action: 'launchGroup',
      groupId: groupId
    });
  } catch (error) {
    debug.error('Error testing group:', error);
    alert('Failed to launch group: ' + error.message);
  }
}

/**
 * Delete group
 */
async function deleteGroup(groupId) {
  const group = groups.find(g => g.id === groupId);
  if (!confirm(`Delete group "${group.name}" and all its sites?`)) {
    return;
  }

  try {
    await browser.runtime.sendMessage({
      action: 'deleteGroup',
      groupId
    });

    await loadData();
    renderGroups();
    updateDefaultGroupSelect();
  } catch (error) {
    debug.error('Error deleting group:', error);
    alert('Failed to delete group: ' + error.message);
  }
}

/**
 * Toggle autostart for a group
 */
async function toggleAutostart(groupId, enabled) {
  try {
    // If enabling, disable autostart for all other groups (only one can autostart)
    if (enabled) {
      groups.forEach(g => {
        g.autostart = g.id === groupId;
      });
    } else {
      // Just disable this group
      const group = groups.find(g => g.id === groupId);
      group.autostart = false;
    }

    // Save to background
    await browser.runtime.sendMessage({
      action: 'saveGroups',
      groups: groups
    });

    await loadData();
    renderGroups();

    const group = groups.find(g => g.id === groupId);
    if (enabled) {
      // Show confirmation
      debug.log(`Autostart enabled for "${group.name}"`);
    }
  } catch (error) {
    debug.error('Error toggling autostart:', error);
    alert('Failed to update autostart: ' + error.message);
  }
}

/**
 * Open site modal for adding/editing
 */
function openSiteModal(groupId, siteId = null) {
  currentEditingGroup = groupId;
  currentEditingSite = siteId;

  const modal = document.getElementById('siteModal');
  const title = document.getElementById('siteModalTitle');
  const group = groups.find(g => g.id === groupId);

  title.textContent = siteId ? 'Edit Sites in Group' : 'Add Sites to Group';

  // Populate the dual listboxes
  populateDualListbox(group);

  modal.classList.add('active');
}

/**
 * Populate dual listbox with available and selected URLs
 */
function populateDualListbox(group) {
  const availableSelect = document.getElementById('availableUrls');
  const selectedSelect = document.getElementById('selectedUrls');

  // Get currently selected URL IDs in this group
  const selectedUrlIds = group.sites.map(site => site.urlId);

  // Clear both lists
  availableSelect.innerHTML = '';
  selectedSelect.innerHTML = '';

  // Populate available URLs (those not in the group)
  urls.forEach(url => {
    if (!selectedUrlIds.includes(url.id)) {
      const option = document.createElement('option');
      option.value = url.id;
      option.textContent = url.name;
      availableSelect.appendChild(option);
    }
  });

  // Populate selected URLs (those already in the group)
  group.sites.forEach(site => {
    const url = urls.find(u => u.id === site.urlId);
    if (url) {
      const option = document.createElement('option');
      option.value = url.id;
      option.textContent = url.name;
      selectedSelect.appendChild(option);
    }
  });
}

/**
 * Move selected URLs from available to selected list
 */
function moveUrlsToSelected() {
  const availableSelect = document.getElementById('availableUrls');
  const selectedSelect = document.getElementById('selectedUrls');

  const selectedOptions = Array.from(availableSelect.selectedOptions);

  selectedOptions.forEach(option => {
    selectedSelect.appendChild(option);
    option.selected = false;
  });
}

/**
 * Move selected URLs from selected to available list
 */
function moveUrlsToAvailable() {
  const availableSelect = document.getElementById('availableUrls');
  const selectedSelect = document.getElementById('selectedUrls');

  const selectedOptions = Array.from(selectedSelect.selectedOptions);

  selectedOptions.forEach(option => {
    availableSelect.appendChild(option);
    option.selected = false;
  });
}

/**
 * Close site modal
 */
function closeSiteModal() {
  document.getElementById('siteModal').classList.remove('active');
  currentEditingGroup = null;
  currentEditingSite = null;
}

/**
 * Save site
 */
async function saveSite() {
  try {
    const selectedSelect = document.getElementById('selectedUrls');
    const selectedUrlIds = Array.from(selectedSelect.options).map(opt => opt.value);

    // Update the group's sites based on selected URLs
    const group = groups.find(g => g.id === currentEditingGroup);

    // Create site entries for each selected URL
    group.sites = selectedUrlIds.map(urlId => {
      const url = urls.find(u => u.id === urlId);
      // Check if this site already exists to preserve its settings
      const existingSite = group.sites.find(s => s.urlId === urlId);

      return {
        id: existingSite ? existingSite.id : generateId(),
        urlId: urlId,
        name: url.name,
        url: url.url,
        automationScript: existingSite ? existingSite.automationScript : '',
        enabled: existingSite ? existingSite.enabled : true
      };
    });

    // Save to background
    await browser.runtime.sendMessage({
      action: 'saveGroups',
      groups: groups
    });

    await loadData();
    renderGroups();
    closeSiteModal();
  } catch (error) {
    debug.error('Error saving sites:', error);
    alert('Failed to save sites: ' + error.message);
  }
}

/**
 * Delete site
 */
async function deleteSite(groupId, siteId) {
  const group = groups.find(g => g.id === groupId);
  const site = group.sites.find(s => s.id === siteId);

  if (!confirm(`Remove "${site.name}" from this group?`)) {
    return;
  }

  try {
    // Remove site from group
    group.sites = group.sites.filter(s => s.id !== siteId);

    // Save to background
    await browser.runtime.sendMessage({
      action: 'saveGroups',
      groups: groups
    });

    await loadData();
    renderGroups();
  } catch (error) {
    debug.error('Error deleting site:', error);
    alert('Failed to delete site: ' + error.message);
  }
}

/**
 * Render settings tab
 */
function renderSettings() {
  // Set mode radio
  document.querySelector(`input[name="mode"][value="${settings.mode}"]`).checked = true;

  // Set autostart delay
  const autostartDelay = settings.autostartDelay || 10;
  document.getElementById('autostartDelay').value = autostartDelay.toString();

  // Update default group select
  updateDefaultGroupSelect();
}

/**
 * Update default group select dropdown
 */
function updateDefaultGroupSelect() {
  const select = document.getElementById('defaultGroup');
  const container = document.getElementById('defaultGroupSelect');

  // Show/hide based on mode
  if (settings.mode === 'single') {
    container.style.display = 'block';

    // Populate options
    select.innerHTML = '<option value="">Select a group...</option>';
    groups.forEach(group => {
      const option = document.createElement('option');
      option.value = group.id;
      option.textContent = group.name;
      option.selected = group.id === settings.defaultGroupId;
      select.appendChild(option);
    });
  } else {
    container.style.display = 'none';
  }
}

/**
 * Render script library
 */
function renderScriptLibrary() {
  const container = document.getElementById('scriptLibrary');
  container.innerHTML = '';

  scriptLibrary.forEach(script => {
    const card = document.createElement('div');
    card.className = 'script-card';

    // Create header
    const header = document.createElement('div');
    header.className = 'script-card-header';

    const headerInner = document.createElement('div');

    const title = document.createElement('div');
    title.className = 'script-card-title';
    title.textContent = script.name;

    const description = document.createElement('div');
    description.className = 'script-card-description';
    description.textContent = script.description;

    const meta = document.createElement('div');
    meta.className = 'script-card-meta';
    script.tags.forEach(tag => {
      const tagSpan = document.createElement('span');
      tagSpan.className = 'script-tag';
      tagSpan.textContent = tag;
      meta.appendChild(tagSpan);
    });

    headerInner.appendChild(title);
    headerInner.appendChild(description);
    headerInner.appendChild(meta);
    header.appendChild(headerInner);

    // Create actions
    const actions = document.createElement('div');
    actions.className = 'script-card-actions';

    const viewBtn = document.createElement('button');
    viewBtn.className = 'secondary-btn view-script-btn';
    viewBtn.dataset.scriptId = script.id;
    viewBtn.textContent = 'View Script';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'primary-btn copy-script-btn';
    copyBtn.dataset.scriptId = script.id;
    copyBtn.textContent = 'Copy to Clipboard';

    actions.appendChild(viewBtn);
    actions.appendChild(copyBtn);

    // Create preview
    const preview = document.createElement('div');
    preview.className = 'script-preview';
    preview.dataset.scriptId = script.id;

    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = script.script;
    pre.appendChild(code);
    preview.appendChild(pre);

    // Assemble card
    card.appendChild(header);
    card.appendChild(actions);
    card.appendChild(preview);
    container.appendChild(card);

    // Add event listeners
    viewBtn.addEventListener('click', () => {
      preview.classList.toggle('show');
      viewBtn.textContent = preview.classList.contains('show') ? 'Hide Script' : 'View Script';
    });

    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(script.script);
      const originalText = copyBtn.textContent;
      copyBtn.textContent = '✓ Copied!';
      setTimeout(() => {
        copyBtn.textContent = originalText;
      }, 2000);
    });
  });
}

/**
 * Save settings
 */
async function saveSettings() {
  try {
    await browser.runtime.sendMessage({
      action: 'saveSettings',
      settings
    });

    // Show success feedback
    const btn = document.getElementById('saveSettingsBtn');
    const originalText = btn.textContent;
    btn.textContent = '✓ Saved!';
    btn.style.background = '#4CAF50';

    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
    }, 2000);

  } catch (error) {
    debug.error('Error saving settings:', error);
    alert('Failed to save settings: ' + error.message);
  }
}

/**
 * Export data
 */
async function exportData() {
  try {
    const response = await browser.runtime.sendMessage({ action: 'exportData' });
    const data = response.data;

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `linkstart-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);
  } catch (error) {
    debug.error('Error exporting data:', error);
    alert('Failed to export data: ' + error.message);
  }
}

/**
 * Import data
 */
async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    const merge = confirm('Do you want to merge with existing data?\n\nOK = Merge (keep existing groups)\nCancel = Replace (delete existing groups)');

    await browser.runtime.sendMessage({
      action: 'importData',
      data,
      merge
    });

    await loadData();
    renderUrls();
    renderGroups();
    updateDefaultGroupSelect();

    alert('Import successful!');
  } catch (error) {
    debug.error('Error importing data:', error);
    alert('Failed to import data: ' + error.message);
  }

  // Reset file input
  event.target.value = '';
}

/**
 * Generate UUID v4
 */
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Render URLs list
 */
function renderUrls() {
  const container = document.getElementById('urlsList');
  const emptyState = document.getElementById('emptyUrlsState');

  if (urls.length === 0) {
    container.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  container.style.display = 'block';
  emptyState.style.display = 'none';
  container.innerHTML = '';

  urls.forEach(url => {
    const urlItem = document.createElement('div');
    urlItem.className = 'url-item';
    urlItem.dataset.urlId = url.id;

    // Create info section
    const infoDiv = document.createElement('div');
    infoDiv.className = 'url-item-info';

    const nameDiv = document.createElement('div');
    nameDiv.className = 'url-item-name';
    nameDiv.textContent = url.name;

    if (url.automationScript) {
      const badge = document.createElement('span');
      badge.className = 'site-badge has-script';
      badge.textContent = 'Has Script';
      nameDiv.appendChild(document.createTextNode(' '));
      nameDiv.appendChild(badge);
    }

    const addressDiv = document.createElement('div');
    addressDiv.className = 'url-item-address';
    addressDiv.textContent = url.url;

    infoDiv.appendChild(nameDiv);
    infoDiv.appendChild(addressDiv);

    // Create actions section
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'url-item-actions';

    const testBtn = document.createElement('button');
    testBtn.className = 'test-btn';
    testBtn.title = 'Test URL';
    testBtn.textContent = '🚀 Test';

    const editBtn = document.createElement('button');
    editBtn.className = 'icon-btn edit-url';
    editBtn.title = 'Edit URL';
    editBtn.textContent = '✏️';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'icon-btn delete-url';
    deleteBtn.title = 'Delete URL';
    deleteBtn.textContent = '🗑️';

    actionsDiv.appendChild(testBtn);
    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);

    urlItem.appendChild(infoDiv);
    urlItem.appendChild(actionsDiv);

    // Event listeners
    testBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      testUrl(url.url);
    });
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      editUrl(url.id);
    });
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteUrl(url.id);
    });

    // Click entire URL item to edit automation script
    urlItem.addEventListener('click', () => {
      openScriptModalForUrl(url.id);
    });
    urlItem.style.cursor = 'pointer';

    container.appendChild(urlItem);
  });
}

/**
 * Test URL by opening in new tab
 */
function testUrl(url) {
  browser.tabs.create({ url: url, active: false });
}

/**
 * Open URL modal
 */
function openUrlModal(urlId = null) {
  currentEditingUrl = urlId;
  const modal = document.getElementById('urlModal');
  const title = document.getElementById('urlModalTitle');
  const nameInput = document.getElementById('urlName');
  const addressInput = document.getElementById('urlAddress');

  if (urlId) {
    const url = urls.find(u => u.id === urlId);
    title.textContent = 'Edit URL';
    nameInput.value = url.name;
    addressInput.value = url.url;
  } else {
    title.textContent = 'Add URL';
    nameInput.value = '';
    addressInput.value = '';
  }

  modal.classList.add('active');
  nameInput.focus();
}

/**
 * Close URL modal
 */
function closeUrlModal() {
  document.getElementById('urlModal').classList.remove('active');
  currentEditingUrl = null;
}

/**
 * Save URL
 */
async function saveUrl() {
  const name = document.getElementById('urlName').value.trim();
  const address = document.getElementById('urlAddress').value.trim();

  if (!name) {
    alert('Please enter a name');
    return;
  }

  if (!address) {
    alert('Please enter a URL');
    return;
  }

  // Basic URL validation
  try {
    new URL(address);
  } catch {
    alert('Please enter a valid URL (including http:// or https://)');
    return;
  }

  try {
    if (currentEditingUrl) {
      // Edit existing URL (preserve script)
      const url = urls.find(u => u.id === currentEditingUrl);
      url.name = name;
      url.url = address;
      // Keep existing automationScript
    } else {
      // Add new URL
      urls.push({
        id: generateId(),
        name: name,
        url: address,
        automationScript: '' // Initialize empty script
      });
    }

    // Save to storage
    await browser.storage.local.set({ urls });

    renderUrls();
    closeUrlModal();
  } catch (error) {
    debug.error('Error saving URL:', error);
    alert('Failed to save URL: ' + error.message);
  }
}

/**
 * Edit URL
 */
function editUrl(urlId) {
  openUrlModal(urlId);
}

/**
 * Delete URL
 */
async function deleteUrl(urlId) {
  const url = urls.find(u => u.id === urlId);

  if (!confirm(`Delete URL "${url.name}"?`)) {
    return;
  }

  try {
    urls = urls.filter(u => u.id !== urlId);
    await browser.storage.local.set({ urls });
    renderUrls();
  } catch (error) {
    debug.error('Error deleting URL:', error);
    alert('Failed to delete URL: ' + error.message);
  }
}

/**
 * Open script editor modal
 */
function openScriptModal(groupId, siteId) {
  currentEditingGroup = groupId;
  currentEditingSite = siteId;
  currentEditingUrl = null;

  const group = groups.find(g => g.id === groupId);
  const site = group.sites.find(s => s.id === siteId);

  const modal = document.getElementById('scriptModal');

  // Populate modal
  document.getElementById('scriptSiteName').textContent = site.name;
  document.getElementById('scriptSiteUrl').textContent = site.url;
  document.getElementById('automationScript').value = site.automationScript || '';
  document.getElementById('scriptSiteEnabled').checked = site.enabled !== false;

  // Show the enabled checkbox for group sites
  document.querySelector('.checkbox-group').style.display = 'block';

  modal.classList.add('active');
  document.getElementById('automationScript').focus();
}

/**
 * Close script editor modal
 */
function closeScriptModal() {
  document.getElementById('scriptModal').classList.remove('active');
  currentEditingGroup = null;
  currentEditingSite = null;
  currentEditingUrl = null;
}

/**
 * Save automation script
 */
async function saveScript() {
  try {
    const script = document.getElementById('automationScript').value.trim();

    // Check if we're editing a URL or a group site
    if (currentEditingUrl && !currentEditingGroup) {
      // Editing a URL
      const url = urls.find(u => u.id === currentEditingUrl);
      url.automationScript = script;

      // Save to storage
      await browser.storage.local.set({ urls });

      // Update all groups that use this URL to have the updated script
      groups.forEach(group => {
        group.sites.forEach(site => {
          if (site.urlId === currentEditingUrl) {
            site.automationScript = script;
          }
        });
      });

      await browser.runtime.sendMessage({
        action: 'saveGroups',
        groups: groups
      });

      await loadData();
      renderUrls();
      renderGroups();
    } else if (currentEditingGroup && currentEditingSite) {
      // Editing a site in a group (keep for backward compatibility)
      const enabled = document.getElementById('scriptSiteEnabled').checked;
      const group = groups.find(g => g.id === currentEditingGroup);
      const site = group.sites.find(s => s.id === currentEditingSite);

      site.automationScript = script;
      site.enabled = enabled;

      // Save to background
      await browser.runtime.sendMessage({
        action: 'saveGroups',
        groups: groups
      });

      await loadData();
      renderGroups();
    }

    closeScriptModal();
  } catch (error) {
    debug.error('Error saving script:', error);
    alert('Failed to save script: ' + error.message);
  }
}

/**
 * Open script editor modal for a URL (not in a group)
 */
function openScriptModalForUrl(urlId) {
  currentEditingUrl = urlId;
  currentEditingGroup = null;
  currentEditingSite = null;

  const url = urls.find(u => u.id === urlId);
  const modal = document.getElementById('scriptModal');

  // Populate modal
  document.getElementById('scriptSiteName').textContent = url.name;
  document.getElementById('scriptSiteUrl').textContent = url.url;
  document.getElementById('automationScript').value = url.automationScript || '';

  // Hide the enabled checkbox for URLs (only relevant in groups)
  document.querySelector('.checkbox-group').style.display = 'none';

  modal.classList.add('active');
  document.getElementById('automationScript').focus();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
