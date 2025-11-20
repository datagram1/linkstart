/**
 * Background service worker for LinkStart (Chrome)
 * Handles initialization, tab launching, and message passing
 */

// Track tabs being automated
const automatingTabs = new Map();

/**
 * Storage functions (inlined for service worker)
 */

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function getGroups() {
  const result = await chrome.storage.local.get('groups');
  return result.groups || [];
}

async function saveGroups(groups) {
  await chrome.storage.local.set({ groups });
}

async function getSettings() {
  const result = await chrome.storage.local.get('settings');
  return result.settings || {
    mode: 'multi',
    defaultGroupId: null
  };
}

async function saveSettings(settings) {
  await chrome.storage.local.set({ settings });
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
  const urlsData = await chrome.storage.local.get('urls');
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
      const urlsData = await chrome.storage.local.get('urls');
      const existingUrls = urlsData.urls || [];
      const existingUrlIds = new Set(existingUrls.map(u => u.id));
      const newUrls = data.urls.filter(u => !existingUrlIds.has(u.id));
      const mergedUrls = [...existingUrls, ...newUrls];
      await chrome.storage.local.set({ urls: mergedUrls });
    }
  } else {
    // Replace mode
    await saveGroups(data.groups);
    if (data.settings) {
      await saveSettings(data.settings);
    }
    if (data.urls) {
      await chrome.storage.local.set({ urls: data.urls });
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

/**
 * Initialize extension on first install
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('LinkStart installed');
    await initializeDefaultData();

    // Open settings page on first install
    chrome.tabs.create({
      url: chrome.runtime.getURL('settings.html')
    });
  }
});

/**
 * Launch autostart group when Chrome starts
 */
chrome.runtime.onStartup.addListener(async () => {
  console.log('Chrome started - checking for autostart group');

  try {
    const [groups, settings] = await Promise.all([
      getGroups(),
      getSettings()
    ]);
    const autostartGroup = groups.find(g => g.autostart === true);

    if (autostartGroup && autostartGroup.sites.length > 0) {
      const delay = (settings.autostartDelay || 10) * 1000; // Convert seconds to milliseconds
      console.log(`Launching autostart group "${autostartGroup.name}" in ${delay/1000} seconds`);

      if (chrome.alarms) {
        // Use alarms API for more reliable timing in service worker
        chrome.alarms.create('autostart', { delayInMinutes: delay / 60000 });

        // Store group ID for alarm handler
        await chrome.storage.local.set({ _autostartGroupId: autostartGroup.id });
      } else {
        // Fallback to setTimeout if alarms not available
        console.warn('Using setTimeout fallback for autostart');
        setTimeout(() => {
          launchGroup(autostartGroup.id);
        }, delay);
      }
    }
  } catch (error) {
    console.error('Error launching autostart group:', error);
  }
});

/**
 * Handle autostart alarm
 */
try {
  if (chrome.alarms && chrome.alarms.onAlarm) {
    chrome.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === 'autostart') {
        const result = await chrome.storage.local.get('_autostartGroupId');
        if (result._autostartGroupId) {
          await launchGroup(result._autostartGroupId);
          // Clean up
          await chrome.storage.local.remove('_autostartGroupId');
        }
      }
    });
  } else {
    console.warn('chrome.alarms API not available');
  }
} catch (error) {
  console.error('Error setting up alarms listener:', error);
}

/**
 * Launch a group of sites
 * @param {string} groupId - ID of the group to launch
 */
async function launchGroup(groupId) {
  try {
    const groups = await getGroups();
    const group = groups.find(g => g.id === groupId);

    if (!group) {
      console.error('Group not found:', groupId);
      return;
    }

    console.log('Launching group:', group.name);

    // Filter enabled sites
    const sites = group.sites.filter(site => site.enabled !== false);

    if (sites.length === 0) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
        title: 'LinkStart',
        message: 'No sites to launch in this group'
      });
      return;
    }

    // Launch each site with a small delay
    for (let i = 0; i < sites.length; i++) {
      const site = sites[i];

      // Add delay between tab opens to avoid overwhelming the browser
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      launchSite(site);
    }

    // Show success notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
      title: 'LinkStart',
      message: `Launched ${sites.length} site${sites.length !== 1 ? 's' : ''} from "${group.name}"`
    });

  } catch (error) {
    console.error('Error launching group:', error);
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
      title: 'LinkStart Error',
      message: 'Failed to launch group: ' + error.message
    });
  }
}

/**
 * Launch a single site
 * @param {Object} site - Site object with url and automationScript
 */
async function launchSite(site) {
  try {
    // Create new tab
    const tab = await chrome.tabs.create({
      url: site.url,
      active: false
    });

    // If site has automation script, inject it when page loads
    if (site.automationScript && site.automationScript.trim()) {
      automatingTabs.set(tab.id, {
        script: site.automationScript,
        url: site.url,
        name: site.name
      });
    }

  } catch (error) {
    console.error('Error launching site:', site.url, error);
  }
}

/**
 * Listen for tab updates to inject automation scripts
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only proceed if we're tracking this tab and page has loaded
  if (!automatingTabs.has(tabId) || changeInfo.status !== 'complete') {
    return;
  }

  const automationData = automatingTabs.get(tabId);
  automatingTabs.delete(tabId); // Remove from tracking

  try {
    console.log('Injecting automation script for:', automationData.name);

    // Inject content script using MV3 API
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });

    // Wait a moment for content script to initialize
    await new Promise(resolve => setTimeout(resolve, 100));

    // Send automation script to content script
    await chrome.tabs.sendMessage(tabId, {
      action: 'executeAutomation',
      script: automationData.script,
      siteName: automationData.name
    });

  } catch (error) {
    console.error('Error injecting automation script:', error);

    // Show error notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
      title: 'Automation Error',
      message: `Failed to run automation for ${automationData.name}: ${error.message}`
    });
  }
});

/**
 * Handle messages from popup and settings pages
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);

  // Handle async operations
  (async () => {
    try {
      switch (message.action) {
        case 'launchGroup':
          await launchGroup(message.groupId);
          sendResponse({ success: true });
          break;

        case 'getGroups':
          const groups = await getGroups();
          sendResponse({ groups });
          break;

        case 'getSettings':
          const settings = await getSettings();
          sendResponse({ settings });
          break;

        case 'saveGroups':
          await saveGroups(message.groups);
          sendResponse({ success: true });
          break;

        case 'saveSettings':
          await saveSettings(message.settings);
          sendResponse({ success: true });
          break;

        case 'exportData':
          const data = await exportData();
          sendResponse({ data });
          break;

        case 'importData':
          await importData(message.data, message.merge || false);
          sendResponse({ success: true });
          break;

        case 'addGroup':
          const newGroup = await addGroup(message.name);
          sendResponse({ group: newGroup });
          break;

        case 'updateGroup':
          const updatedGroup = await updateGroup(message.groupId, message.updates);
          sendResponse({ group: updatedGroup });
          break;

        case 'deleteGroup':
          const deleted = await deleteGroup(message.groupId);
          sendResponse({ success: deleted });
          break;

        case 'addSite':
          const newSite = await addSite(message.groupId, message.site);
          sendResponse({ site: newSite });
          break;

        case 'updateSite':
          const updatedSite = await updateSite(message.groupId, message.siteId, message.updates);
          sendResponse({ site: updatedSite });
          break;

        case 'deleteSite':
          const siteDeleted = await deleteSite(message.groupId, message.siteId);
          sendResponse({ success: siteDeleted });
          break;

        case 'automationComplete':
          // Automation script completed successfully
          console.log('Automation completed for tab:', sender.tab.id);
          sendResponse({ success: true });
          break;

        case 'automationError':
          // Automation script failed
          console.error('Automation error:', message.error);
          chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
            title: 'Automation Error',
            message: message.error
          });
          sendResponse({ success: true });
          break;

        default:
          console.warn('Unknown message action:', message.action);
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    }
  })();

  // Return true to indicate we'll respond asynchronously
  return true;
});

console.log('LinkStart background service worker loaded');
