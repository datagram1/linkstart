# Firefox Extension - Task Breakdown

## Project: Multi-Site Launcher with Auto-Login Automation (Firefox First)

### Phase 1: Project Setup for Firefox

- [ ] **1.1** Initialize project directory structure
  - Create `/firefox/` directory
  - Create `/shared/` directory for reusable code
  - Set up `.gitignore` for node_modules, build artifacts, secrets, test profiles

- [ ] **1.2** Initialize package.json and build system
  - Set up npm/yarn with package.json
  - Configure build scripts (optional: webpack/rollup for bundling)
  - Add dev dependencies (web-ext CLI tool, ESLint, Prettier)
  - Install: `npm install --save-dev web-ext`

- [ ] **1.3** Create Firefox manifest.json
  - Use Manifest V2 or V3 (V2 has better compatibility, V3 is newer)
  - Define basic extension metadata (name, version, description)
  - Set up browser_action or action for toolbar button
  - Configure icons placeholder

- [ ] **1.4** Set up development workflow
  - Configure `web-ext run` for testing (auto-reload)
  - Create npm scripts: `npm run dev`, `npm run build`
  - Set up Firefox profile for testing

---

### Phase 2: Design Data Structures & Storage

- [ ] **2.1** Define data models
  ```javascript
  // Group structure
  {
    "groups": [
      {
        "id": "uuid-v4",
        "name": "Work Sites",
        "sites": [
          {
            "id": "uuid-v4",
            "url": "https://example.com",
            "name": "Example Site",
            "automationScript": "// JavaScript code here",
            "enabled": true
          }
        ]
      }
    ],
    "settings": {
      "mode": "single" | "multi",
      "defaultGroupId": "uuid-v4"
    }
  }
  ```

- [ ] **2.2** Implement storage layer (`shared/storage.js`)
  - Use `browser.storage.local` or `browser.storage.sync`
  - Create API wrapper functions:
    - `getGroups()` - Load all groups
    - `saveGroups(groups)` - Save groups
    - `getSettings()` - Load settings
    - `saveSettings(settings)` - Save settings
    - `exportData()` - Export JSON backup
    - `importData(json)` - Import from backup

- [ ] **2.3** Add default data initialization
  - Create example group with sample sites on first install
  - Use `browser.runtime.onInstalled` listener
  - Include helpful example automation script

---

### Phase 3: Extension Icons

- [ ] **3.1** Create or source icon images
  - Design green circle/start button icon
  - Create multiple sizes: 16x16, 32x32, 48x48, 96x96 (PNG format)
  - Optimize file sizes

- [ ] **3.2** Configure icons in manifest
  - Set `icons` field for extension icon
  - Set `browser_action.default_icon` for toolbar button
  - Test icon appearance in Firefox toolbar

---

### Phase 4: Background Script

- [ ] **4.1** Create background script (`firefox/background.js`)
  - Set up in manifest: `background.scripts` or `background.service_worker`
  - Initialize on extension load

- [ ] **4.2** Implement toolbar button click handler
  - Listen to `browser.browserAction.onClicked` (or `browser.action`)
  - Load groups from storage
  - Determine mode (single vs multi-group)
  - Single mode: Launch all sites immediately
  - Multi mode: Open popup for group selection

- [ ] **4.3** Implement tab launcher function
  - `launchGroup(groupId)` - Opens all sites in a group
  - Create tabs using `browser.tabs.create()`
  - Add delays between tab opens (avoid rate limiting)
  - Queue automation scripts for each tab

- [ ] **4.4** Set up message passing
  - Listen for messages from popup/settings pages
  - Handle: `launchGroup`, `getGroups`, `saveGroups`, etc.
  - Send responses back to UI

---

### Phase 5: Popup UI (Multi-Group Mode)

- [ ] **5.1** Create popup HTML (`firefox/popup.html`)
  - Container for group buttons
  - Settings button (gear icon)
  - Minimal, clean design

- [ ] **5.2** Create popup stylesheet (`firefox/popup.css`)
  - Style group buttons (clear, clickable)
  - Responsive layout
  - Settings button positioning

- [ ] **5.3** Implement popup script (`firefox/popup.js`)
  - Load groups on popup open
  - Render button for each group
  - Click handler: Send message to background to launch group
  - Settings button: Open settings page in new tab

- [ ] **5.4** Configure popup in manifest
  - Set `browser_action.default_popup` (or `action.default_popup`)
  - Link to popup.html

---

### Phase 6: Settings/Options Page

- [ ] **6.1** Create settings page structure (`firefox/settings.html`)
  - Two-tab navigation: "Sites" and "Groups"
  - Tab switching UI (CSS tabs or buttons)
  - Link stylesheet and script

- [ ] **6.2** Create settings stylesheet (`firefox/settings.css`)
  - Tab navigation styles
  - Form styles (inputs, buttons, modals)
  - List/table styles for sites and groups
  - Dark mode support

- [ ] **6.3** Implement Groups tab UI
  - Display list of all groups
  - "Add Group" button
  - Each group: Name, site count, Edit/Delete buttons
  - Click group to expand and show sites
  - Drag-and-drop to reorder sites (optional)

- [ ] **6.4** Implement Sites tab UI (within groups)
  - Show all sites in selected group
  - "Add Site" button
  - Each site: URL, name, Edit/Delete buttons
  - Edit button opens automation modal

- [ ] **6.5** Create automation script editor modal
  - Modal overlay with code editor (`<textarea>` or CodeMirror)
  - Site URL and name fields
  - Syntax highlighting (optional)
  - Save and Cancel buttons
  - Help section with examples

- [ ] **6.6** Implement settings page script (`firefox/settings.js`)
  - Load groups from storage on page load
  - Handle all CRUD operations:
    - Create/edit/delete groups
    - Create/edit/delete sites within groups
    - Update automation scripts
  - Save changes to storage
  - Form validation

- [ ] **6.7** Add settings mode toggle
  - Radio buttons or toggle: Single Group vs Multi-Group mode
  - If single group mode: Show "Set as default" option
  - Save setting to storage

- [ ] **6.8** Configure options page in manifest
  - Set `options_ui.page` to settings.html
  - Set `options_ui.open_in_tab` to true

---

### Phase 7: Automation Engine

- [ ] **7.1** Create content script (`firefox/content.js`)
  - Injected into web pages to run automation
  - Listen for messages from background script
  - Receive automation script as payload

- [ ] **7.2** Implement script execution engine
  - Wrap user script in try-catch block
  - Execute using `eval()` or `Function()` constructor in page context
  - Handle async/await scripts
  - Set execution timeout (e.g., 30 seconds)

- [ ] **7.3** Build helper function library
  - `waitForElement(selector, timeout)` - Wait for element to appear
  - `fillInput(selector, value)` - Auto-fill input field
  - `clickElement(selector)` - Click button or link
  - `waitForNavigation()` - Wait for page load
  - `sleep(ms)` - Delay execution
  - Expose helpers to user scripts via global object

- [ ] **7.4** Add script execution feedback
  - Send success/failure message back to background
  - Log console output (optional)
  - Display notification on completion or error

- [ ] **7.5** Configure content script in manifest
  - Do NOT use `content_scripts` (since we need dynamic injection)
  - Use `browser.tabs.executeScript()` in background script
  - Set permissions: `<all_urls>` or `activeTab`

- [ ] **7.6** Implement dynamic script injection
  - In background script after tab creation
  - Wait for tab to load: `browser.tabs.onUpdated` listener
  - Inject content script with `browser.tabs.executeScript()`
  - Send automation script to content script via messaging

---

### Phase 8: Permissions & Manifest Finalization

- [ ] **8.1** Configure required permissions
  - `storage` - For saving groups/settings
  - `tabs` - For creating and managing tabs
  - `<all_urls>` or `activeTab` - For content script injection
  - `unlimitedStorage` - If storing large scripts (optional)

- [ ] **8.2** Set up host permissions
  - Use `"permissions": ["<all_urls>"]` for broad access
  - Or use `"optional_permissions"` and request at runtime

- [ ] **8.3** Add CSP (Content Security Policy)
  - Define CSP in manifest to allow script execution
  - Balance security with functionality

- [ ] **8.4** Finalize manifest metadata
  - Set homepage_url, developer info
  - Add descriptive text
  - Version 1.0.0

---

### Phase 9: Testing & Debugging

- [ ] **9.1** Test single group mode
  - Create one group with 3-5 sites
  - Set to single group mode
  - Click toolbar button: All sites should open
  - Verify tabs open in correct order

- [ ] **9.2** Test multi-group mode
  - Create 3+ groups with different sites
  - Set to multi-group mode
  - Click toolbar button: Popup should appear
  - Click each group button: Sites should launch

- [ ] **9.3** Test automation scripts
  - Write simple test script (e.g., `console.log("Test")`)
  - Write complex script (e.g., auto-fill login form)
  - Test on real websites (Gmail, GitHub, etc.)
  - Verify helper functions work
  - Test error handling with broken scripts

- [ ] **9.4** Test settings page
  - Create, edit, delete groups
  - Create, edit, delete sites
  - Edit automation scripts and save
  - Reload extension and verify persistence
  - Test import/export (if implemented)

- [ ] **9.5** Test edge cases
  - Empty groups (no sites)
  - No groups defined
  - Invalid URLs
  - Very long automation scripts
  - Many groups (10+) and many sites (50+)
  - Rapid button clicking

- [ ] **9.6** Browser console debugging
  - Check for JavaScript errors
  - Monitor background script console
  - Monitor content script console on pages
  - Fix any warnings or errors

- [ ] **9.7** Test on different Firefox versions
  - Firefox Release
  - Firefox ESR (Extended Support Release)
  - Verify compatibility

---

### Phase 10: Polish & UX Improvements

- [ ] **10.1** Add loading states
  - Show spinner when launching groups
  - Disable button during launch to prevent double-clicks
  - Progress indicator (e.g., "Opening 5 of 10 sites...")

- [ ] **10.2** Add success/error notifications
  - Use `browser.notifications` API
  - Notify on successful group launch
  - Alert on automation script errors
  - Badge on toolbar icon (optional)

- [ ] **10.3** Improve settings page UX
  - Add confirmation dialogs for delete actions
  - Form validation with helpful error messages
  - Auto-save or clear save state indicator
  - Keyboard shortcuts (e.g., Ctrl+S to save)

- [ ] **10.4** Add import/export feature
  - Export button: Download groups as JSON file
  - Import button: Upload and parse JSON file
  - Validate imported data structure
  - Merge or replace existing data (user choice)

- [ ] **10.5** Create automation script templates
  - Build library of common scripts
  - Templates for Gmail, GitHub, Twitter, etc.
  - Template picker in settings
  - Documentation for each template

- [ ] **10.6** Add dark mode support
  - Detect Firefox theme: `window.matchMedia('(prefers-color-scheme: dark)')`
  - Apply dark styles to popup and settings page
  - Test readability and contrast

---

### Phase 11: Security & Privacy Audit

- [ ] **11.1** Review permissions
  - Ensure minimal necessary permissions requested
  - Justify `<all_urls>` in documentation
  - Consider `activeTab` + optional permissions approach

- [ ] **11.2** Sanitize user inputs
  - Validate URLs before opening tabs
  - Escape HTML in settings UI
  - Prevent XSS in automation scripts (challenging but important)

- [ ] **11.3** Secure storage
  - Never store passwords in plain text (warn users)
  - Recommend integration with password managers
  - Document security best practices for users

- [ ] **11.4** Audit automation script execution
  - Ensure scripts run in isolated context (content script scope)
  - Prevent scripts from accessing extension APIs
  - Timeout mechanism to prevent runaway scripts

---

### Phase 12: Documentation

- [ ] **12.1** Write README.md
  - Project overview and features
  - Installation instructions (Firefox Add-ons link + local install)
  - Screenshots of popup and settings page
  - Quick start guide

- [ ] **12.2** Create user guide
  - How to create your first group
  - How to add sites to groups
  - How to write automation scripts
  - Example use cases (work setup, research, development)

- [ ] **12.3** Write automation script API documentation
  - List all helper functions with examples
  - Common patterns (login, form filling, navigation)
  - Troubleshooting tips
  - Link to JavaScript/DOM resources

- [ ] **12.4** Add inline help in settings page
  - Tooltips or help icons
  - "Getting Started" section
  - Link to full documentation

- [ ] **12.5** Create CHANGELOG.md
  - Document version 1.0.0 features
  - Set up format for future updates

---

### Phase 13: Packaging & Release

- [ ] **13.1** Prepare extension package
  - Remove development files (node_modules, .git, etc.)
  - Zip only necessary files: manifest.json, scripts, HTML, CSS, icons
  - Or use `web-ext build` command

- [ ] **13.2** Test packaged extension
  - Install the .zip file in clean Firefox profile
  - Verify all features work
  - Check for missing files or broken paths

- [ ] **13.3** Create Firefox Add-ons (AMO) account
  - Sign up at addons.mozilla.org
  - Complete developer profile

- [ ] **13.4** Submit to AMO
  - Upload .zip file
  - Fill in listing information (name, description, category)
  - Add screenshots (popup, settings, in action)
  - Set privacy policy (if applicable)
  - Submit for review

- [ ] **13.5** Respond to review feedback
  - Address any issues flagged by reviewers
  - Update and resubmit if necessary

- [ ] **13.6** Publish and announce
  - Once approved, extension goes live on AMO
  - Share on social media, forums, etc.
  - Set up GitHub repo for issue tracking

---

## Development Priorities

### Must-Have (MVP)
- [x] Basic group and site management
- [x] Single and multi-group modes
- [x] Toolbar button launches tabs
- [x] Automation script execution
- [x] Settings page with CRUD operations

### Should-Have (V1.0)
- [x] Import/export functionality
- [x] Script templates library
- [x] Error notifications
- [x] Dark mode support

### Nice-to-Have (Future)
- [ ] Visual script recorder (record clicks instead of writing JS)
- [ ] Keyboard shortcuts for launching groups
- [ ] Scheduled launches (open at specific times)
- [ ] Cloud sync via Firefox Sync API
- [ ] Mobile support (Firefox for Android)

---

## Technical Stack

### Core Technologies
- **Manifest**: V2 or V3 (recommend V2 for Firefox initially)
- **Storage**: `browser.storage.local` or `.sync`
- **APIs**: `browser.tabs`, `browser.browserAction`, `browser.runtime`
- **Content Scripts**: Injected dynamically via `browser.tabs.executeScript()`

### Development Tools
- **web-ext**: Mozilla's official CLI for testing/building extensions
- **ESLint**: Code linting
- **Prettier**: Code formatting

### Optional Enhancements
- **CodeMirror** or **Monaco Editor**: Syntax highlighting in script editor
- **UUID library**: Generate unique IDs for groups/sites
- **Webpack/Rollup**: Bundle shared modules (if project grows)

---

## Notes & Best Practices

### Firefox-Specific Considerations
- Use `browser.*` namespace (native promises) instead of `chrome.*`
- Test on both Firefox stable and ESR
- AMO review process can take 1-5 days for initial submission
- All extensions must be signed by Mozilla (automatic for AMO submissions)

### User Script Security
- Always wrap user scripts in try-catch
- Set execution timeout (e.g., 30 seconds max)
- Warn users about running untrusted scripts
- Consider sandboxing options (difficult with eval)

### Storage Best Practices
- Use `browser.storage.sync` for cross-device sync (5MB limit)
- Use `browser.storage.local` for larger data (no sync)
- Implement data migration strategy for future versions

### Common Pitfalls to Avoid
- Don't inject content scripts into `about:*`, `moz-extension:*`, or `file:*` URLs
- Handle tab load states carefully (use `browser.tabs.onUpdated`)
- Respect rate limits when opening many tabs (add delays)
- Test with and without internet connection

---

## Quick Start Commands

```bash
# Install dependencies
npm install

# Run extension in Firefox with auto-reload
npm run dev
# or
web-ext run

# Build for distribution
npm run build
# or
web-ext build

# Lint code
npm run lint
```

---

## Resources

- [MDN: Browser Extensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [web-ext CLI Documentation](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/)
- [Firefox Extension Workshop](https://extensionworkshop.com/)
- [AMO Developer Hub](https://addons.mozilla.org/developers/)
- [Manifest.json Reference](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json)
