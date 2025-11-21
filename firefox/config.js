/**
 * LinkStart Configuration
 *
 * Toggle debug mode here for development vs production builds.
 * When DEBUG is false, all console logging will be disabled.
 */

const CONFIG = {
  // Set to false for production builds
  DEBUG: true,

  // Application version
  VERSION: '1.0.0'
};

/**
 * Debug logger - only logs when DEBUG is enabled
 */
const debug = {
  log: (...args) => {
    if (CONFIG.DEBUG) {
      console.log('[LinkStart]', ...args);
    }
  },

  error: (...args) => {
    if (CONFIG.DEBUG) {
      console.error('[LinkStart]', ...args);
    }
  },

  warn: (...args) => {
    if (CONFIG.DEBUG) {
      console.warn('[LinkStart]', ...args);
    }
  },

  info: (...args) => {
    if (CONFIG.DEBUG) {
      console.info('[LinkStart]', ...args);
    }
  },

  // Always log errors, even in production (but with less detail)
  critical: (...args) => {
    console.error('[LinkStart ERROR]', ...args);
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONFIG, debug };
}
