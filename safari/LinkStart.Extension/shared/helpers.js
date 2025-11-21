/**
 * Helper functions for automation scripts
 * These functions are injected into the page context and available to user scripts
 */

/**
 * Wait for an element to appear in the DOM
 * @param {string} selector - CSS selector
 * @param {number} timeout - Timeout in milliseconds (default: 10000)
 * @returns {Promise<Element>} The found element
 */
function waitForElement(selector, timeout = 10000) {
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
}

/**
 * Fill an input field with a value
 * @param {string} selector - CSS selector for the input
 * @param {string} value - Value to fill
 * @returns {Promise<void>}
 */
async function fillInput(selector, value) {
  const element = await waitForElement(selector);
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }

  // Trigger focus event
  element.focus();

  // Set value
  element.value = value;

  // Trigger input events
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));

  // Trigger blur event
  element.blur();
}

/**
 * Click an element
 * @param {string} selector - CSS selector
 * @returns {Promise<void>}
 */
async function clickElement(selector) {
  const element = await waitForElement(selector);
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }

  element.click();
}

/**
 * Wait for navigation to complete
 * @param {number} timeout - Timeout in milliseconds (default: 5000)
 * @returns {Promise<void>}
 */
function waitForNavigation(timeout = 5000) {
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
}

/**
 * Sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for multiple elements to appear
 * @param {Array<string>} selectors - Array of CSS selectors
 * @param {number} timeout - Timeout in milliseconds (default: 10000)
 * @returns {Promise<Array<Element>>}
 */
async function waitForElements(selectors, timeout = 10000) {
  const promises = selectors.map(selector => waitForElement(selector, timeout));
  return Promise.all(promises);
}

/**
 * Check if an element exists
 * @param {string} selector - CSS selector
 * @returns {boolean}
 */
function elementExists(selector) {
  return document.querySelector(selector) !== null;
}

/**
 * Get text content of an element
 * @param {string} selector - CSS selector
 * @returns {Promise<string>}
 */
async function getTextContent(selector) {
  const element = await waitForElement(selector);
  return element.textContent.trim();
}

/**
 * Select an option in a select element
 * @param {string} selector - CSS selector for the select element
 * @param {string} value - Value to select
 * @returns {Promise<void>}
 */
async function selectOption(selector, value) {
  const element = await waitForElement(selector);
  if (!element || element.tagName !== 'SELECT') {
    throw new Error(`Select element not found: ${selector}`);
  }

  element.value = value;
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Check a checkbox or radio button
 * @param {string} selector - CSS selector
 * @param {boolean} checked - Whether to check or uncheck (default: true)
 * @returns {Promise<void>}
 */
async function setChecked(selector, checked = true) {
  const element = await waitForElement(selector);
  if (!element || (element.type !== 'checkbox' && element.type !== 'radio')) {
    throw new Error(`Checkbox/radio element not found: ${selector}`);
  }

  if (element.checked !== checked) {
    element.click();
  }
}

/**
 * Scroll to an element
 * @param {string} selector - CSS selector
 * @returns {Promise<void>}
 */
async function scrollToElement(selector) {
  const element = await waitForElement(selector);
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Type text with a delay between each character (simulates human typing)
 * @param {string} selector - CSS selector for the input
 * @param {string} text - Text to type
 * @param {number} delay - Delay between characters in ms (default: 100)
 * @returns {Promise<void>}
 */
async function typeText(selector, text, delay = 100) {
  const element = await waitForElement(selector);
  element.focus();

  for (const char of text) {
    element.value += char;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(delay);
  }

  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.blur();
}

// Export helper functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
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
    typeText
  };
}
