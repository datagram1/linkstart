/**
 * Background script for LinkStart
 * Handles initialization, tab launching, and message passing
 */

// Import config and storage functions for service worker
importScripts('config.js', 'storage.js');

// Track tabs being automated
const automatingTabs = new Map();

/**
 * Initialize extension on first install
 */
browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    debug.log('LinkStart installed');
    await initializeDefaultData();

    // Open settings page on first install
    browser.tabs.create({
      url: browser.runtime.getURL('settings.html')
    });
  }
});

/**
 * Launch autostart group when Firefox starts
 */
browser.runtime.onStartup.addListener(async () => {
  debug.log('Firefox started - checking for autostart group');

  try {
    const [groups, settings] = await Promise.all([
      getGroups(),
      getSettings()
    ]);
    const autostartGroup = groups.find(g => g.autostart === true);

    if (autostartGroup && autostartGroup.sites.length > 0) {
      const delay = (settings.autostartDelay || 10) * 1000; // Convert seconds to milliseconds
      debug.log(`Launching autostart group "${autostartGroup.name}" in ${delay/1000} seconds`);

      setTimeout(() => {
        launchGroup(autostartGroup.id);
      }, delay);
    }
  } catch (error) {
    debug.error('Error launching autostart group:', error);
  }
});

/**
 * Launch a group of sites
 * @param {string} groupId - ID of the group to launch
 */
async function launchGroup(groupId) {
  try {
    const groups = await getGroups();
    const group = groups.find(g => g.id === groupId);

    if (!group) {
      debug.error('Group not found:', groupId);
      return;
    }

    debug.log('Launching group:', group.name);

    // Filter enabled sites
    const sites = group.sites.filter(site => site.enabled !== false);

    if (sites.length === 0) {
      browser.notifications.create({
        type: 'basic',
        iconUrl: browser.runtime.getURL('icons/icon.svg'),
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
    browser.notifications.create({
      type: 'basic',
      iconUrl: browser.runtime.getURL('icons/icon.svg'),
      title: 'LinkStart',
      message: `Launched ${sites.length} site${sites.length !== 1 ? 's' : ''} from "${group.name}"`
    });

  } catch (error) {
    debug.error('Error launching group:', error);
    browser.notifications.create({
      type: 'basic',
      iconUrl: browser.runtime.getURL('icons/icon.svg'),
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
    const tab = await browser.tabs.create({
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
    debug.error('Error launching site:', site.url, error);
  }
}

/**
 * Listen for tab updates to inject automation scripts
 */
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only proceed if we're tracking this tab and page has loaded
  if (!automatingTabs.has(tabId) || changeInfo.status !== 'complete') {
    return;
  }

  const automationData = automatingTabs.get(tabId);
  automatingTabs.delete(tabId); // Remove from tracking

  try {
    debug.log('Injecting automation script for:', automationData.name);

    // Inject config first, then content script
    await browser.tabs.executeScript(tabId, {
      file: 'config.js'
    });

    await browser.tabs.executeScript(tabId, {
      file: 'content.js'
    });

    // Wait a moment for content script to initialize
    await new Promise(resolve => setTimeout(resolve, 100));

    // Send automation script to content script
    await browser.tabs.sendMessage(tabId, {
      action: 'executeAutomation',
      script: automationData.script,
      siteName: automationData.name
    });

  } catch (error) {
    debug.error('Error injecting automation script:', error);

    // Show error notification
    browser.notifications.create({
      type: 'basic',
      iconUrl: browser.runtime.getURL('icons/icon.svg'),
      title: 'Automation Error',
      message: `Failed to run automation for ${automationData.name}: ${error.message}`
    });
  }
});

/**
 * Handle messages from popup and settings pages
 */
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  debug.log('Background received message:', message);

  switch (message.action) {
    case 'launchGroup':
      await launchGroup(message.groupId);
      return Promise.resolve({ success: true });

    case 'getGroups':
      const groups = await getGroups();
      return Promise.resolve({ groups });

    case 'getSettings':
      const settings = await getSettings();
      return Promise.resolve({ settings });

    case 'saveGroups':
      await saveGroups(message.groups);
      return Promise.resolve({ success: true });

    case 'saveSettings':
      await saveSettings(message.settings);
      return Promise.resolve({ success: true });

    case 'exportData':
      const data = await exportData();
      return Promise.resolve({ data });

    case 'importData':
      await importData(message.data, message.merge || false);
      return Promise.resolve({ success: true });

    case 'addGroup':
      const newGroup = await addGroup(message.name);
      return Promise.resolve({ group: newGroup });

    case 'updateGroup':
      const updatedGroup = await updateGroup(message.groupId, message.updates);
      return Promise.resolve({ group: updatedGroup });

    case 'deleteGroup':
      const deleted = await deleteGroup(message.groupId);
      return Promise.resolve({ success: deleted });

    case 'addSite':
      const newSite = await addSite(message.groupId, message.site);
      return Promise.resolve({ site: newSite });

    case 'updateSite':
      const updatedSite = await updateSite(message.groupId, message.siteId, message.updates);
      return Promise.resolve({ site: updatedSite });

    case 'deleteSite':
      const siteDeleted = await deleteSite(message.groupId, message.siteId);
      return Promise.resolve({ success: siteDeleted });

    case 'automationComplete':
      // Automation script completed successfully
      debug.log('Automation completed for tab:', sender.tab.id);
      return Promise.resolve({ success: true });

    case 'automationError':
      // Automation script failed
      debug.error('Automation error:', message.error);
      browser.notifications.create({
        type: 'basic',
        iconUrl: browser.runtime.getURL('icons/icon.svg'),
        title: 'Automation Error',
        message: message.error
      });
      return Promise.resolve({ success: true });

    default:
      debug.warn('Unknown message action:', message.action);
      return Promise.resolve({ error: 'Unknown action' });
  }
});

debug.log('LinkStart background script loaded');
