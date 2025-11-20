/**
 * Storage wrapper for background script
 * Makes storage functions from shared/storage.js available
 */

// Since Firefox background scripts use importScripts, we need to inline the storage code
// or load it as a separate script. For simplicity, we'll inline the essential functions.

// Generate UUID v4
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function getGroups() {
  const result = await browser.storage.local.get('groups');
  return result.groups || [];
}

async function saveGroups(groups) {
  await browser.storage.local.set({ groups });
}

async function getSettings() {
  const result = await browser.storage.local.get('settings');
  return result.settings || {
    mode: 'multi',
    defaultGroupId: null
  };
}

async function saveSettings(settings) {
  await browser.storage.local.set({ settings });
}

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

async function updateGroup(groupId, updates) {
  const groups = await getGroups();
  const group = groups.find(g => g.id === groupId);
  if (!group) return null;

  Object.assign(group, updates);
  await saveGroups(groups);
  return group;
}

async function deleteGroup(groupId) {
  const groups = await getGroups();
  const index = groups.findIndex(g => g.id === groupId);
  if (index === -1) return false;

  groups.splice(index, 1);
  await saveGroups(groups);
  return true;
}

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

async function exportData() {
  const groups = await getGroups();
  const settings = await getSettings();
  const urlsData = await browser.storage.local.get('urls');
  const urls = urlsData.urls || [];

  return {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    groups,
    settings,
    urls
  };
}

async function importData(data, merge = false) {
  if (!data || !data.groups) {
    throw new Error('Invalid import data');
  }

  if (merge) {
    // Merge groups
    const existingGroups = await getGroups();
    const mergedGroups = [...existingGroups, ...data.groups];
    await saveGroups(mergedGroups);

    // Merge URLs (avoid duplicates by ID)
    if (data.urls) {
      const urlsData = await browser.storage.local.get('urls');
      const existingUrls = urlsData.urls || [];
      const existingUrlIds = new Set(existingUrls.map(u => u.id));
      const newUrls = data.urls.filter(u => !existingUrlIds.has(u.id));
      const mergedUrls = [...existingUrls, ...newUrls];
      await browser.storage.local.set({ urls: mergedUrls });
    }
  } else {
    // Replace mode
    await saveGroups(data.groups);
    if (data.settings) {
      await saveSettings(data.settings);
    }
    if (data.urls) {
      await browser.storage.local.set({ urls: data.urls });
    }
  }
}

async function initializeDefaultData() {
  const groups = await getGroups();

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

    await saveSettings({
      mode: 'single',
      defaultGroupId: exampleGroup.id,
      autostartDelay: 10
    });
  }
}
