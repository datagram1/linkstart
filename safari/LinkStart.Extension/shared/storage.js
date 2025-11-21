/**
 * Storage API wrapper for managing groups and settings
 * Uses browser.storage.local for data persistence
 */

// Generate UUID v4
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Get all groups from storage
 * @returns {Promise<Array>} Array of group objects
 */
async function getGroups() {
  const result = await browser.storage.local.get('groups');
  return result.groups || [];
}

/**
 * Save groups to storage
 * @param {Array} groups - Array of group objects
 * @returns {Promise<void>}
 */
async function saveGroups(groups) {
  await browser.storage.local.set({ groups });
}

/**
 * Get settings from storage
 * @returns {Promise<Object>} Settings object
 */
async function getSettings() {
  const result = await browser.storage.local.get('settings');
  return result.settings || {
    mode: 'multi', // 'single' or 'multi'
    defaultGroupId: null
  };
}

/**
 * Save settings to storage
 * @param {Object} settings - Settings object
 * @returns {Promise<void>}
 */
async function saveSettings(settings) {
  await browser.storage.local.set({ settings });
}

/**
 * Add a new group
 * @param {string} name - Group name
 * @returns {Promise<Object>} Created group object
 */
async function addGroup(name) {
  const groups = await getGroups();
  const newGroup = {
    id: generateId(),
    name: name,
    sites: []
  };
  groups.push(newGroup);
  await saveGroups(groups);
  return newGroup;
}

/**
 * Update a group
 * @param {string} groupId - Group ID
 * @param {Object} updates - Object with fields to update
 * @returns {Promise<Object|null>} Updated group or null if not found
 */
async function updateGroup(groupId, updates) {
  const groups = await getGroups();
  const group = groups.find(g => g.id === groupId);
  if (!group) return null;

  Object.assign(group, updates);
  await saveGroups(groups);
  return group;
}

/**
 * Delete a group
 * @param {string} groupId - Group ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
async function deleteGroup(groupId) {
  const groups = await getGroups();
  const index = groups.findIndex(g => g.id === groupId);
  if (index === -1) return false;

  groups.splice(index, 1);
  await saveGroups(groups);
  return true;
}

/**
 * Add a site to a group
 * @param {string} groupId - Group ID
 * @param {Object} site - Site object {url, name, automationScript, enabled}
 * @returns {Promise<Object|null>} Created site or null if group not found
 */
async function addSite(groupId, site) {
  const groups = await getGroups();
  const group = groups.find(g => g.id === groupId);
  if (!group) return null;

  const newSite = {
    id: generateId(),
    url: site.url,
    name: site.name || site.url,
    automationScript: site.automationScript || '',
    enabled: site.enabled !== false
  };

  group.sites.push(newSite);
  await saveGroups(groups);
  return newSite;
}

/**
 * Update a site in a group
 * @param {string} groupId - Group ID
 * @param {string} siteId - Site ID
 * @param {Object} updates - Object with fields to update
 * @returns {Promise<Object|null>} Updated site or null if not found
 */
async function updateSite(groupId, siteId, updates) {
  const groups = await getGroups();
  const group = groups.find(g => g.id === groupId);
  if (!group) return null;

  const site = group.sites.find(s => s.id === siteId);
  if (!site) return null;

  Object.assign(site, updates);
  await saveGroups(groups);
  return site;
}

/**
 * Delete a site from a group
 * @param {string} groupId - Group ID
 * @param {string} siteId - Site ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
async function deleteSite(groupId, siteId) {
  const groups = await getGroups();
  const group = groups.find(g => g.id === groupId);
  if (!group) return false;

  const index = group.sites.findIndex(s => s.id === siteId);
  if (index === -1) return false;

  group.sites.splice(index, 1);
  await saveGroups(groups);
  return true;
}

/**
 * Export all data as JSON
 * @returns {Promise<Object>} Object containing groups and settings
 */
async function exportData() {
  const groups = await getGroups();
  const settings = await getSettings();
  return {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    groups,
    settings
  };
}

/**
 * Import data from JSON
 * @param {Object} data - Import data object
 * @param {boolean} merge - If true, merge with existing data; if false, replace
 * @returns {Promise<void>}
 */
async function importData(data, merge = false) {
  if (!data || !data.groups) {
    throw new Error('Invalid import data');
  }

  if (merge) {
    const existingGroups = await getGroups();
    const mergedGroups = [...existingGroups, ...data.groups];
    await saveGroups(mergedGroups);
  } else {
    await saveGroups(data.groups);
    if (data.settings) {
      await saveSettings(data.settings);
    }
  }
}

/**
 * Initialize default data on first install
 * @returns {Promise<void>}
 */
async function initializeDefaultData() {
  const groups = await getGroups();

  // Only initialize if no groups exist
  if (groups.length === 0) {
    const exampleGroup = {
      id: generateId(),
      name: 'Example Group',
      sites: [
        {
          id: generateId(),
          url: 'https://github.com',
          name: 'GitHub',
          automationScript: '// Example: Auto-login script\n// await waitForElement("#login_field");\n// fillInput("#login_field", "username");\n// fillInput("#password", "password");\n// clickElement("[name=\'commit\']");',
          enabled: true
        },
        {
          id: generateId(),
          url: 'https://google.com',
          name: 'Google',
          automationScript: '',
          enabled: true
        }
      ]
    };

    await saveGroups([exampleGroup]);

    // Set default settings
    await saveSettings({
      mode: 'single',
      defaultGroupId: exampleGroup.id
    });
  }
}

// Export all functions
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment (for testing)
  module.exports = {
    generateId,
    getGroups,
    saveGroups,
    getSettings,
    saveSettings,
    addGroup,
    updateGroup,
    deleteGroup,
    addSite,
    updateSite,
    deleteSite,
    exportData,
    importData,
    initializeDefaultData
  };
}
