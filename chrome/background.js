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
 * Uses Tampermonkey's approach: inject at document_start BEFORE CSP is processed
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only proceed if we're tracking this tab and page is loading
  if (!automatingTabs.has(tabId) || changeInfo.status !== 'loading') {
    return;
  }

  const automationData = automatingTabs.get(tabId);
  automatingTabs.delete(tabId); // Remove from tracking

  try {
    console.log('[LinkStart] Injecting automation at document_start for:', automationData.name);

    // Inject into MAIN world at document_start (before CSP)
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      world: 'MAIN',
      injectImmediately: true,
      func: function(userScript, siteName) {
        // This runs in page context BEFORE CSP is applied
        // We can use Function constructors freely here

        // Helper functions (defined as strings so they work in page context)
        const helpers = {
          waitForElement: function(selector, timeout = 10000) {
            return new Promise((resolve, reject) => {
              const element = document.querySelector(selector);
              if (element) {
                resolve(element);
                return;
              }

              const observer = new MutationObserver(() => {
                const element = document.querySelector(selector);
                if (element) {
                  observer.disconnect();
                  clearTimeout(timeoutId);
                  resolve(element);
                }
              });

              observer.observe(document.body || document.documentElement, {
                childList: true,
                subtree: true
              });

              const timeoutId = setTimeout(() => {
                observer.disconnect();
                reject(new Error('Timeout waiting for element: ' + selector));
              }, timeout);
            });
          },

          fillInput: async function(selector, value) {
            const element = await this.waitForElement(selector);
            element.focus();
            element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.blur();
          },

          clickElement: async function(selector) {
            const element = await this.waitForElement(selector);
            element.click();
          },

          waitForNavigation: function(timeout = 5000) {
            return new Promise((resolve) => {
              if (document.readyState === 'complete') {
                resolve();
                return;
              }

              const timeoutId = setTimeout(() => {
                window.removeEventListener('load', onLoad);
                resolve();
              }, timeout);

              const onLoad = () => {
                clearTimeout(timeoutId);
                resolve();
              };

              window.addEventListener('load', onLoad);
            });
          },

          sleep: function(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
          },

          waitForElements: async function(selectors, timeout = 10000) {
            const promises = selectors.map(selector => this.waitForElement(selector, timeout));
            return Promise.all(promises);
          },

          elementExists: function(selector) {
            return document.querySelector(selector) !== null;
          },

          getTextContent: async function(selector) {
            const element = await this.waitForElement(selector);
            return element.textContent.trim();
          },

          selectOption: async function(selector, value) {
            const element = await this.waitForElement(selector);
            if (!element || element.tagName !== 'SELECT') {
              throw new Error('Select element not found: ' + selector);
            }
            element.value = value;
            element.dispatchEvent(new Event('change', { bubbles: true }));
          },

          setChecked: async function(selector, checked = true) {
            const element = await this.waitForElement(selector);
            if (!element || (element.type !== 'checkbox' && element.type !== 'radio')) {
              throw new Error('Checkbox/radio element not found: ' + selector);
            }
            if (element.checked !== checked) {
              element.click();
            }
          },

          scrollToElement: async function(selector) {
            const element = await this.waitForElement(selector);
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          },

          typeText: async function(selector, text, delay = 100) {
            const element = await this.waitForElement(selector);
            element.focus();
            for (const char of text) {
              element.value += char;
              element.dispatchEvent(new Event('input', { bubbles: true }));
              await this.sleep(delay);
            }
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.blur();
          },

          log: function(...args) {
            console.log('[LinkStart Script]', ...args);
          },

          waitForDOMReady: function() {
            return new Promise((resolve) => {
              if (document.readyState === 'complete' || document.readyState === 'interactive') {
                resolve();
                return;
              }
              document.addEventListener('DOMContentLoaded', () => resolve());
            });
          },

          waitForPageLoad: function() {
            return new Promise((resolve) => {
              if (document.readyState === 'complete') {
                resolve();
                return;
              }
              window.addEventListener('load', () => resolve());
            });
          },

          waitForNetworkIdle: async function(timeout = 2000) {
            await this.waitForPageLoad();
            await this.sleep(timeout);
          }
        };

        // Execute automation after page loads
        (async function() {
          try {
            console.log('[LinkStart] Waiting for page to be ready...');
            await helpers.waitForPageLoad();

            console.log('[LinkStart] Executing automation for:', siteName);

            // Create async function from user script with helpers in scope
            const {
              waitForElement, fillInput, clickElement, waitForNavigation, sleep,
              waitForElements, elementExists, getTextContent, selectOption,
              setChecked, scrollToElement, typeText, log, waitForDOMReady,
              waitForPageLoad, waitForNetworkIdle
            } = helpers;

            // Now we can use Function constructor because CSP hasn't been applied yet
            const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
            const automationFunc = new AsyncFunction(
              'waitForElement', 'fillInput', 'clickElement', 'waitForNavigation', 'sleep',
              'waitForElements', 'elementExists', 'getTextContent', 'selectOption',
              'setChecked', 'scrollToElement', 'typeText', 'log', 'waitForDOMReady',
              'waitForPageLoad', 'waitForNetworkIdle',
              userScript
            );

            // Execute with timeout
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Automation timeout (30s)')), 30000);
            });

            await Promise.race([
              automationFunc(
                waitForElement, fillInput, clickElement, waitForNavigation, sleep,
                waitForElements, elementExists, getTextContent, selectOption,
                setChecked, scrollToElement, typeText, log, waitForDOMReady,
                waitForPageLoad, waitForNetworkIdle
              ),
              timeoutPromise
            ]);

            console.log('[LinkStart] Automation completed for:', siteName);

          } catch (error) {
            console.error('[LinkStart] Automation error:', error);
            console.error('[LinkStart] Site:', siteName);
            console.error('[LinkStart] Error:', error.message);
          }
        })();
      },
      args: [automationData.script, automationData.name]
    });

    console.log('[LinkStart] Automation injected successfully');

  } catch (error) {
    console.error('[LinkStart] Injection error:', error);

    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
      title: 'Automation Error',
      message: `Failed to inject automation for ${automationData.name}: ${error.message}`
    });
  }
});

/**
 * Inject helper functions into window object (MAIN world)
 * These run in page context and can interact with DOM
 */
function injectHelpersToWindow() {
  if (window.__linkstart_helpers) return; // Already injected

  const helpers = {
        waitForElement: function(selector, timeout = 10000) {
          return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
              resolve(element);
              return;
            }

            const observer = new MutationObserver(() => {
              const element = document.querySelector(selector);
              if (element) {
                observer.disconnect();
                clearTimeout(timeoutId);
                resolve(element);
              }
            });

            observer.observe(document.body, {
              childList: true,
              subtree: true
            });

            const timeoutId = setTimeout(() => {
              observer.disconnect();
              reject(new Error('Timeout waiting for element: ' + selector));
            }, timeout);
          });
        },

        fillInput: async function(selector, value) {
          const element = await helpers.waitForElement(selector);
          if (!element) {
            throw new Error('Element not found: ' + selector);
          }

          element.focus();
          element.value = value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          element.blur();
        },

        clickElement: async function(selector) {
          const element = await helpers.waitForElement(selector);
          if (!element) {
            throw new Error('Element not found: ' + selector);
          }

          element.click();
        },

        waitForNavigation: function(timeout = 5000) {
          return new Promise((resolve) => {
            if (document.readyState === 'complete') {
              resolve();
              return;
            }

            const timeoutId = setTimeout(() => {
              window.removeEventListener('load', onLoad);
              resolve();
            }, timeout);

            const onLoad = () => {
              clearTimeout(timeoutId);
              resolve();
            };

            window.addEventListener('load', onLoad);
          });
        },

        sleep: function(ms) {
          return new Promise(resolve => setTimeout(resolve, ms));
        },

        waitForElements: async function(selectors, timeout = 10000) {
          const promises = selectors.map(selector => helpers.waitForElement(selector, timeout));
          return Promise.all(promises);
        },

        elementExists: function(selector) {
          return document.querySelector(selector) !== null;
        },

        getTextContent: async function(selector) {
          const element = await helpers.waitForElement(selector);
          return element.textContent.trim();
        },

        selectOption: async function(selector, value) {
          const element = await helpers.waitForElement(selector);
          if (!element || element.tagName !== 'SELECT') {
            throw new Error('Select element not found: ' + selector);
          }

          element.value = value;
          element.dispatchEvent(new Event('change', { bubbles: true }));
        },

        setChecked: async function(selector, checked = true) {
          const element = await helpers.waitForElement(selector);
          if (!element || (element.type !== 'checkbox' && element.type !== 'radio')) {
            throw new Error('Checkbox/radio element not found: ' + selector);
          }

          if (element.checked !== checked) {
            element.click();
          }
        },

        scrollToElement: async function(selector) {
          const element = await helpers.waitForElement(selector);
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        },

        typeText: async function(selector, text, delay = 100) {
          const element = await helpers.waitForElement(selector);
          element.focus();

          for (const char of text) {
            element.value += char;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            await helpers.sleep(delay);
          }

          element.dispatchEvent(new Event('change', { bubbles: true }));
          element.blur();
        },

        log: function(...args) {
          console.log('[LinkStart Script]', ...args);
        },

        waitForDOMReady: function() {
          return new Promise((resolve) => {
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
              resolve();
              return;
            }
            document.addEventListener('DOMContentLoaded', () => resolve());
          });
        },

        waitForPageLoad: function() {
          return new Promise((resolve) => {
            if (document.readyState === 'complete') {
              resolve();
              return;
            }
            window.addEventListener('load', () => resolve());
          });
        },

        waitForNetworkIdle: async function(timeout = 2000) {
          await helpers.waitForPageLoad();
          await helpers.sleep(timeout);
        }
      };

  // Assign to window
  window.__linkstart_helpers = helpers;
  console.log('[LinkStart] Helpers injected to window');
}

/**
 * Execute automation in ISOLATED world (extension context)
 * Can use AsyncFunction here without CSP restrictions
 * Defines helpers directly in this context
 */
async function executeAutomationIsolated(userScript, siteName) {
  console.log('[LinkStart] Executing automation script for:', siteName);

  try {
    // Define helper functions directly in ISOLATED world
    // These can interact with DOM just fine from extension context
    const helpers = {
      waitForElement: function(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
          const element = document.querySelector(selector);
          if (element) {
            resolve(element);
            return;
          }

          const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) {
              observer.disconnect();
              clearTimeout(timeoutId);
              resolve(element);
            }
          });

          observer.observe(document.body, {
            childList: true,
            subtree: true
          });

          const timeoutId = setTimeout(() => {
            observer.disconnect();
            reject(new Error('Timeout waiting for element: ' + selector));
          }, timeout);
        });
      },

      fillInput: async function(selector, value) {
        const element = await helpers.waitForElement(selector);
        if (!element) {
          throw new Error('Element not found: ' + selector);
        }

        element.focus();
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.blur();
      },

      clickElement: async function(selector) {
        const element = await helpers.waitForElement(selector);
        if (!element) {
          throw new Error('Element not found: ' + selector);
        }

        element.click();
      },

      waitForNavigation: function(timeout = 5000) {
        return new Promise((resolve) => {
          if (document.readyState === 'complete') {
            resolve();
            return;
          }

          const timeoutId = setTimeout(() => {
            window.removeEventListener('load', onLoad);
            resolve();
          }, timeout);

          const onLoad = () => {
            clearTimeout(timeoutId);
            resolve();
          };

          window.addEventListener('load', onLoad);
        });
      },

      sleep: function(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      },

      waitForElements: async function(selectors, timeout = 10000) {
        const promises = selectors.map(selector => helpers.waitForElement(selector, timeout));
        return Promise.all(promises);
      },

      elementExists: function(selector) {
        return document.querySelector(selector) !== null;
      },

      getTextContent: async function(selector) {
        const element = await helpers.waitForElement(selector);
        return element.textContent.trim();
      },

      selectOption: async function(selector, value) {
        const element = await helpers.waitForElement(selector);
        if (!element || element.tagName !== 'SELECT') {
          throw new Error('Select element not found: ' + selector);
        }

        element.value = value;
        element.dispatchEvent(new Event('change', { bubbles: true }));
      },

      setChecked: async function(selector, checked = true) {
        const element = await helpers.waitForElement(selector);
        if (!element || (element.type !== 'checkbox' && element.type !== 'radio')) {
          throw new Error('Checkbox/radio element not found: ' + selector);
        }

        if (element.checked !== checked) {
          element.click();
        }
      },

      scrollToElement: async function(selector) {
        const element = await helpers.waitForElement(selector);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      },

      typeText: async function(selector, text, delay = 100) {
        const element = await helpers.waitForElement(selector);
        element.focus();

        for (const char of text) {
          element.value += char;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          await helpers.sleep(delay);
        }

        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.blur();
      },

      log: function(...args) {
        console.log('[LinkStart Script]', ...args);
      },

      waitForDOMReady: function() {
        return new Promise((resolve) => {
          if (document.readyState === 'complete' || document.readyState === 'interactive') {
            resolve();
            return;
          }
          document.addEventListener('DOMContentLoaded', () => resolve());
        });
      },

      waitForPageLoad: function() {
        return new Promise((resolve) => {
          if (document.readyState === 'complete') {
            resolve();
            return;
          }
          window.addEventListener('load', () => resolve());
        });
      },

      waitForNetworkIdle: async function(timeout = 2000) {
        await helpers.waitForPageLoad();
        await helpers.sleep(timeout);
      }
    };

    // Extract helpers to scope
    const {
      waitForElement,
      fillInput,
      clickElement,
      waitForNavigation,
      sleep,
      waitForElements,
      elementExists,
      getTextContent,
      selectOption,
      setChecked,
      scrollToElement,
      typeText,
      log,
      waitForDOMReady,
      waitForPageLoad,
      waitForNetworkIdle
    } = helpers;

    // Create async function from user script
    // This works in ISOLATED world (extension context) without CSP issues
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const automationFunc = new AsyncFunction(
      'waitForElement',
      'fillInput',
      'clickElement',
      'waitForNavigation',
      'sleep',
      'waitForElements',
      'elementExists',
      'getTextContent',
      'selectOption',
      'setChecked',
      'scrollToElement',
      'typeText',
      'log',
      'waitForDOMReady',
      'waitForPageLoad',
      'waitForNetworkIdle',
      userScript
    );

    // Execute with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Automation script timeout (30 seconds)')), 30000);
    });

    await Promise.race([
      automationFunc(
        waitForElement,
        fillInput,
        clickElement,
        waitForNavigation,
        sleep,
        waitForElements,
        elementExists,
        getTextContent,
        selectOption,
        setChecked,
        scrollToElement,
        typeText,
        log,
        waitForDOMReady,
        waitForPageLoad,
        waitForNetworkIdle
      ),
      timeoutPromise
    ]);

    console.log('[LinkStart] Automation completed successfully for', siteName);

  } catch (error) {
    console.error('[LinkStart] Automation error for', siteName, ':', error);
    alert(`LinkStart automation failed for ${siteName}: ${error.message}`);
  }
}

/**
 * Legacy function kept for reference - not used anymore
 */
async function executeAutomationInPage_UNUSED(userScript, siteName) {
  console.log('[LinkStart] Executing automation script for:', siteName);

  try {
    // Define helper functions
    const helpers = {
      waitForElement: function(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
          const element = document.querySelector(selector);
          if (element) {
            resolve(element);
            return;
          }

          const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) {
              observer.disconnect();
              clearTimeout(timeoutId);
              resolve(element);
            }
          });

          observer.observe(document.body, {
            childList: true,
            subtree: true
          });

          const timeoutId = setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Timeout waiting for element: ${selector}`));
          }, timeout);
        });
      },

      fillInput: async function(selector, value) {
        const element = await helpers.waitForElement(selector);
        if (!element) {
          throw new Error(`Element not found: ${selector}`);
        }

        element.focus();
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.blur();
      },

      clickElement: async function(selector) {
        const element = await helpers.waitForElement(selector);
        if (!element) {
          throw new Error(`Element not found: ${selector}`);
        }

        element.click();
      },

      waitForNavigation: function(timeout = 5000) {
        return new Promise((resolve) => {
          if (document.readyState === 'complete') {
            resolve();
            return;
          }

          const timeoutId = setTimeout(() => {
            window.removeEventListener('load', onLoad);
            resolve();
          }, timeout);

          const onLoad = () => {
            clearTimeout(timeoutId);
            resolve();
          };

          window.addEventListener('load', onLoad);
        });
      },

      sleep: function(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      },

      waitForElements: async function(selectors, timeout = 10000) {
        const promises = selectors.map(selector => helpers.waitForElement(selector, timeout));
        return Promise.all(promises);
      },

      elementExists: function(selector) {
        return document.querySelector(selector) !== null;
      },

      getTextContent: async function(selector) {
        const element = await helpers.waitForElement(selector);
        return element.textContent.trim();
      },

      selectOption: async function(selector, value) {
        const element = await helpers.waitForElement(selector);
        if (!element || element.tagName !== 'SELECT') {
          throw new Error(`Select element not found: ${selector}`);
        }

        element.value = value;
        element.dispatchEvent(new Event('change', { bubbles: true }));
      },

      setChecked: async function(selector, checked = true) {
        const element = await helpers.waitForElement(selector);
        if (!element || (element.type !== 'checkbox' && element.type !== 'radio')) {
          throw new Error(`Checkbox/radio element not found: ${selector}`);
        }

        if (element.checked !== checked) {
          element.click();
        }
      },

      scrollToElement: async function(selector) {
        const element = await helpers.waitForElement(selector);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      },

      typeText: async function(selector, text, delay = 100) {
        const element = await helpers.waitForElement(selector);
        element.focus();

        for (const char of text) {
          element.value += char;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          await helpers.sleep(delay);
        }

        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.blur();
      },

      log: function(...args) {
        console.log('[LinkStart Script]', ...args);
      },

      waitForDOMReady: function() {
        return new Promise((resolve) => {
          if (document.readyState === 'complete' || document.readyState === 'interactive') {
            resolve();
            return;
          }
          document.addEventListener('DOMContentLoaded', () => resolve());
        });
      },

      waitForPageLoad: function() {
        return new Promise((resolve) => {
          if (document.readyState === 'complete') {
            resolve();
            return;
          }
          window.addEventListener('load', () => resolve());
        });
      },

      waitForNetworkIdle: async function(timeout = 2000) {
        await helpers.waitForPageLoad();
        await helpers.sleep(timeout);
      }
    };

    // Extract helpers to scope
    const {
      waitForElement,
      fillInput,
      clickElement,
      waitForNavigation,
      sleep,
      waitForElements,
      elementExists,
      getTextContent,
      selectOption,
      setChecked,
      scrollToElement,
      typeText,
      log,
      waitForDOMReady,
      waitForPageLoad,
      waitForNetworkIdle
    } = helpers;

    // Execute user script with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Automation script timeout (30 seconds)')), 30000);
    });

    const scriptPromise = (async () => {
      eval(userScript);
    })();

    await Promise.race([scriptPromise, timeoutPromise]);

    console.log('[LinkStart] Automation completed successfully for', siteName);

  } catch (error) {
    console.error('[LinkStart] Automation error for', siteName, ':', error);
    alert(`LinkStart automation failed for ${siteName}: ${error.message}`);
  }
}

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
