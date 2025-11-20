/**
 * Content script for LinkStart
 * Executes automation scripts in the page context
 */

(function() {
  'use strict';

  // Helper functions available to automation scripts
  const helpers = {
    /**
     * Wait for an element to appear in the DOM
     */
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

    /**
     * Fill an input field with a value
     */
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

    /**
     * Click an element
     */
    clickElement: async function(selector) {
      const element = await helpers.waitForElement(selector);
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }

      element.click();
    },

    /**
     * Wait for navigation to complete
     */
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

    /**
     * Sleep for a specified duration
     */
    sleep: function(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Wait for multiple elements to appear
     */
    waitForElements: async function(selectors, timeout = 10000) {
      const promises = selectors.map(selector => helpers.waitForElement(selector, timeout));
      return Promise.all(promises);
    },

    /**
     * Check if an element exists
     */
    elementExists: function(selector) {
      return document.querySelector(selector) !== null;
    },

    /**
     * Get text content of an element
     */
    getTextContent: async function(selector) {
      const element = await helpers.waitForElement(selector);
      return element.textContent.trim();
    },

    /**
     * Select an option in a select element
     */
    selectOption: async function(selector, value) {
      const element = await helpers.waitForElement(selector);
      if (!element || element.tagName !== 'SELECT') {
        throw new Error(`Select element not found: ${selector}`);
      }

      element.value = value;
      element.dispatchEvent(new Event('change', { bubbles: true }));
    },

    /**
     * Check a checkbox or radio button
     */
    setChecked: async function(selector, checked = true) {
      const element = await helpers.waitForElement(selector);
      if (!element || (element.type !== 'checkbox' && element.type !== 'radio')) {
        throw new Error(`Checkbox/radio element not found: ${selector}`);
      }

      if (element.checked !== checked) {
        element.click();
      }
    },

    /**
     * Scroll to an element
     */
    scrollToElement: async function(selector) {
      const element = await helpers.waitForElement(selector);
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    /**
     * Type text with a delay between each character
     */
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

    /**
     * Log a message to console (for debugging)
     */
    log: function(...args) {
      console.log('[LinkStart Script]', ...args);
    },

    /**
     * Wait for DOM to be ready
     */
    waitForDOMReady: function() {
      return new Promise((resolve) => {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
          resolve();
          return;
        }
        document.addEventListener('DOMContentLoaded', () => resolve());
      });
    },

    /**
     * Wait for page to be fully loaded (DOM + resources)
     */
    waitForPageLoad: function() {
      return new Promise((resolve) => {
        if (document.readyState === 'complete') {
          resolve();
          return;
        }
        window.addEventListener('load', () => resolve());
      });
    },

    /**
     * Wait for network to be idle (best effort)
     */
    waitForNetworkIdle: async function(timeout = 2000) {
      await helpers.waitForPageLoad();
      // Wait additional time for any async requests
      await helpers.sleep(timeout);
    }
  };

  /**
   * Execute automation script
   */
  async function executeAutomation(script, siteName) {
    console.log('[LinkStart] Executing automation script for:', siteName);

    try {
      // Content scripts can use AsyncFunction without CSP restrictions
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

      // Build the function with helpers destructured
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

      // Create and execute the automation function
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
        script
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

      console.log('[LinkStart] Automation completed successfully');

      // Notify background script of success
      chrome.runtime.sendMessage({
        action: 'automationComplete',
        siteName: siteName
      });

    } catch (error) {
      console.error('[LinkStart] Automation error for', siteName);
      console.error('[LinkStart] Error details:', error);
      console.error('[LinkStart] Stack trace:', error.stack);

      // Provide more helpful error messages
      let errorMessage = error.message;

      if (error.message.includes('Timeout waiting for element')) {
        errorMessage = `Element not found on ${siteName}. This may be caused by:\n- Chrome password manager not unlocked\n- Page structure changed\n- Network delay\n\nOriginal error: ${error.message}`;
      } else if (error.message.includes('timeout')) {
        errorMessage = `Script timeout for ${siteName}. Possible causes:\n- Chrome password manager locked\n- Page taking too long to load\n- Script waiting for non-existent element`;
      }

      // Notify background script of error
      chrome.runtime.sendMessage({
        action: 'automationError',
        error: `Automation failed for ${siteName}: ${errorMessage}`,
        siteName: siteName
      });
    }
  }

  /**
   * Listen for messages from background script
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'executeAutomation') {
      // Execute automation (it will notify background script internally)
      executeAutomation(message.script, message.siteName);
      // Don't return true - we're not using sendResponse
      // The executeAutomation function handles its own messaging
    }
  });

  console.log('[LinkStart] Content script loaded');
})();
