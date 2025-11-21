# LinkStart

**Launch groups of websites with one click. Supports auto-login scripts and Firefox startup automation.**

[![Get LinkStart for Firefox](https://img.shields.io/badge/Firefox%20Add--ons-Install-orange?style=for-the-badge&logo=firefox)](https://addons.mozilla.org/en-GB/firefox/addon/linkstart/)

LinkStart lets you turn Firefox startup into a fully-automated workflow. Create named groups of URLs, optionally attach a JavaScript automation script to each site, and open everything with a single click or when Firefox launches. LinkStart can log you in, navigate to dashboards, and run any repeatable "startup routine" you normally do by hand.

## What You Can Do With LinkStart

- **Open a full "workday" workspace**: email, project management, analytics, documentation – all at once.
- **Automatically log into sites** and jump straight to the pages you actually use (e.g. Jira board, CRM dashboard, YouTube Studio).
- **Run small scripts on startup**: dismiss pop-ups, switch to dark theme, open specific sections, fill in forms, etc.
- **Save different groups for different contexts**: Work, Gaming, Streaming, Research, Study, Daily Admin, and more.

## Key Features

### Groups of URLs
Organise your favourite sites into named groups. Each group can contain as many URLs as you need.

### Startup Automation
Choose one (or more) groups to launch automatically when Firefox starts, or trigger them manually from the toolbar button.

### Per-site JavaScript Automation
Attach an automation script to each URL. Scripts run after the page loads so you can:
- Fill in username/password fields
- Click login/continue buttons
- Navigate to specific sections or dashboards
- Perform any repeatable DOM interactions

### Import / Export
Backup and restore all your groups, URLs and scripts as JSON.

### Dark-mode Friendly UI
The options page and popup respect your system theme and keep the interface clean and readable.

### Modern, Script-friendly Design
A focused interface for editing URLs and automation scripts with helpful examples and debugging tools.

## How It Works

1. **Create a group** – e.g. "Morning Work Start", "Streaming Setup", "Study Session"
2. **Add URLs** – add each site you want to open
3. **(Optional) Add a script** – write a small JavaScript snippet that runs in the context of that tab after it loads (to log in, click elements, etc.)
4. **Launch**:
   - Click the LinkStart toolbar icon and choose a group, or
   - Configure LinkStart to auto-launch one or more groups when Firefox starts

## Security & Privacy

- All configuration (groups, URLs, scripts) is stored locally in the browser using the standard WebExtensions storage APIs
- LinkStart does not send your data to any external server
- Automation scripts run only on the pages you configure them for
- Users should avoid hard-coding plain-text passwords into scripts where possible and instead rely on Firefox's built-in password manager when they can

## Installation

### From Firefox Add-ons (Recommended)

Install LinkStart directly from the official Firefox Add-ons store:

**[→ Get LinkStart for Firefox](https://addons.mozilla.org/en-GB/firefox/addon/linkstart/)**

### From Source (Development)

1. Clone this repository:
   ```bash
   cd startup_extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm run dev
   ```
   This will open Firefox with the extension loaded and auto-reload on changes.

### Loading Temporarily in Firefox

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Navigate to the `firefox` directory and select `manifest.json`

### Building for Distribution

```bash
npm run build
```

This creates a `.zip` file in the `dist/` directory that can be submitted to Mozilla Add-ons (AMO).

### Safari Installation

#### Prerequisites
- macOS 11.0 or later
- Xcode 12.0 or later
- Safari 14.0 or later

#### Building for Safari

1. Install dependencies (if not already done):
   ```bash
   npm install
   ```

2. Open the Xcode project:
   ```bash
   open safari/LinkStart/LinkStart.xcodeproj
   ```

3. In Xcode, select the LinkStart scheme and press Run (⌘R)

4. In Safari:
   - Go to Safari > Preferences > Extensions
   - Enable the LinkStart extension
   - You should see the LinkStart icon in the Safari toolbar

For detailed Safari-specific instructions, see [safari/README.md](safari/README.md).

## Usage

### First Time Setup

1. After installation, the settings page will open automatically
2. Create your first group by clicking "Add Group"
3. Add sites to your group with URLs and optional automation scripts
4. Choose your launch mode in the Settings tab:
   - **Single Group Mode**: Click toolbar icon to instantly launch your default group
   - **Multi Group Mode**: Click toolbar icon to see a list of groups to choose from

### Creating Groups

1. Open the extension settings (click the toolbar icon, then the gear icon)
2. Click "Add Group" in the Groups tab
3. Give your group a descriptive name (e.g., "Work Sites", "Social Media", "Dev Tools")
4. Add sites to the group

### Adding Sites

1. Click "Add Site" within a group
2. Enter:
   - **Site Name**: A friendly name (e.g., "GitHub")
   - **URL**: The full URL including `https://` (e.g., `https://github.com`)
   - **Automation Script** (optional): JavaScript code to automate login/navigation
   - **Enable checkbox**: Whether this site should launch with the group

### Writing Automation Scripts

Automation scripts are JavaScript code that runs after the page loads. You have access to these helper functions:

```javascript
// Wait for an element to appear (returns the element)
await waitForElement('#username', 10000); // selector, timeout in ms

// Fill an input field
await fillInput('#username', 'myusername');
await fillInput('#password', 'mypassword');

// Click an element
await clickElement('#login-button');

// Wait for page navigation to complete
await waitForNavigation();

// Sleep/delay
await sleep(1000); // milliseconds

// Select dropdown option
await selectOption('#country', 'USA');

// Check/uncheck checkbox
await setChecked('#remember-me', true);

// Type text with delay (simulates human typing)
await typeText('#search', 'hello world', 100); // selector, text, delay per char

// Check if element exists (returns boolean)
if (elementExists('#login-form')) {
  // do something
}

// Get text content of element
const text = await getTextContent('.welcome-message');

// Scroll to element
await scrollToElement('#footer');

// Debug logging (outputs to browser console)
log('Script started');
log('Username:', username);

// Wait for DOM to be ready
await waitForDOMReady();

// Wait for page to be fully loaded (DOM + all resources)
await waitForPageLoad();

// Wait for network to be idle (useful for SPAs)
await waitForNetworkIdle(2000); // optional timeout in ms
```

#### Example Automation Script

```javascript
// Wait for login form to appear
await waitForElement('#username');

// Fill in credentials (Note: Consider security implications)
await fillInput('#username', 'myuser@example.com');
await fillInput('#password', 'mypassword');

// Click login button
await clickElement('button[type="submit"]');

// Wait for dashboard to load
await waitForNavigation();

// Navigate to a specific section
await clickElement('a[href="/dashboard"]');
```

#### Security Warning

⚠️ **Important**: Be careful when storing credentials in automation scripts. Consider:
- Using environment-specific test accounts
- Integrating with password managers
- Only using automation on trusted, local sites
- Being aware that scripts are stored in plain text

### Import/Export

- **Export**: Click the "Export" button in settings to download a JSON backup of all your groups and settings
- **Import**: Click "Import" to restore from a backup file. You can choose to merge with existing data or replace it entirely

## Project Structure

```
startup_extension/
├── firefox/              # Firefox extension files
│   ├── background.js     # Background script (handles tab launching)
│   ├── content.js        # Content script (executes automation)
│   ├── popup.html/js/css # Popup UI (group selection)
│   ├── settings.html/js/css # Settings page
│   ├── storage-wrapper.js # Storage API wrapper
│   ├── manifest.json     # Extension manifest
│   └── icons/            # Extension icons
├── safari/               # Safari extension files
│   ├── LinkStart.Extension/  # Safari web extension
│   │   ├── background.js     # Background script
│   │   ├── content.js        # Content script
│   │   ├── popup.html/js/css # Popup UI
│   │   ├── settings.html/js/css # Settings page
│   │   ├── storage-wrapper.js # Storage wrapper
│   │   ├── browser-polyfill.js # WebExtension API polyfill
│   │   ├── manifest.json     # Safari manifest
│   │   ├── shared/           # Shared utilities
│   │   └── icons/            # Extension icons
│   ├── LinkStart/        # Xcode project (generated)
│   └── README.md         # Safari-specific documentation
├── shared/               # Shared code
│   ├── storage.js        # Storage utilities
│   └── helpers.js        # Automation helper functions
├── todo/                 # Task documentation
├── package.json          # npm configuration
└── README.md            # This file
```

## Debug Mode

LinkStart includes a configurable debug mode to control console logging across all extension components.

### Toggling Debug Mode

Debug logging is controlled by the `DEBUG` flag in `config.js`:

**Location:** `shared/config.js` (also copied to `firefox/`, `chrome/`, and `safari/LinkStart.Extension/`)

**Enable Debug Mode (Development):**
```javascript
const CONFIG = {
  DEBUG: true,  // Enable detailed console logging
  VERSION: '1.0.0'
};
```

**Disable Debug Mode (Production):**
```javascript
const CONFIG = {
  DEBUG: false,  // Disable debug logging
  VERSION: '1.0.0'
};
```

### Debug Logging Functions

The extension uses specialized debug functions instead of direct `console.*` calls:

```javascript
debug.log('Message');     // Only logs when DEBUG: true
debug.error('Error');     // Only logs when DEBUG: true
debug.warn('Warning');    // Only logs when DEBUG: true
debug.info('Info');       // Only logs when DEBUG: true
debug.critical('Error');  // Always logs, even in production
```

### Best Practices

- **Development**: Keep `DEBUG: true` to see detailed logs
- **Production**: Set `DEBUG: false` before building release versions
- **Critical Errors**: Use `debug.critical()` for errors that should always be logged
- **Performance**: Disabling debug mode reduces console overhead and keeps logs clean

### Building for Production

Before building a production release:

1. Set `DEBUG: false` in all `config.js` files:
   ```bash
   # Edit these files and set DEBUG: false
   vim shared/config.js
   vim firefox/config.js
   vim chrome/config.js
   vim safari/LinkStart.Extension/config.js
   ```

2. Build the extension:
   ```bash
   npm run build          # Firefox
   npm run build:chrome   # Chrome
   npm run build:safari   # Safari
   ```

## Development

### Running Tests

```bash
npm run lint
```

### Building for Production

```bash
npm run build
```

### Publishing to AMO

1. Create an account at [addons.mozilla.org](https://addons.mozilla.org)
2. Build the extension: `npm run build`
3. Upload the `.zip` file from the `dist/` directory
4. Fill in the listing information and submit for review

## Browser Compatibility

Currently supported:
- **Firefox 78+** (primary platform)
- **Safari 14+** (macOS 11.0+)

Future plans:
- Chrome/Edge (Manifest V3)

## Troubleshooting

### Automation Script Not Running

1. Check the browser console for errors (F12 → Console)
2. Verify the script syntax is valid JavaScript
3. Ensure you're using `await` with async functions
4. Check that selectors match elements on the page (use browser DevTools)

### Extension Not Loading

1. Check that all files are present in the `firefox/` directory
2. Verify `manifest.json` is valid JSON
3. Check browser console for errors in `about:debugging`

### Sites Not Opening

1. Verify URLs include `https://` or `http://`
2. Check that sites are enabled (checkbox in site settings)
3. Ensure the extension has necessary permissions

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

GNU General Public License v3.0 only - see LICENSE file for details

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, version 3 of the License only.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

### Support the Developer

If you find LinkStart useful, consider supporting its development:

<a href="https://buymeacoffee.com/knws" target="_blank"><img src="https://cdn.buymeacoffee.com/uploads/profile_pictures/2025/03/MfaUpCI1Ev9jDJ3q.png@300w_0e.png" alt="Buy Me A Coffee" height="60"></a>

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/knws)

## Roadmap

- [x] Autostart groups when Firefox launches
- [x] URL management with test functionality
- [x] Dual-listbox picker for group URLs
- [x] Generate proper PNG icons from SVG
- [x] Safari support
- [ ] Visual automation recorder (record clicks instead of writing scripts)
- [ ] Keyboard shortcuts for launching groups
- [ ] Password manager integration
- [ ] Template library for common sites
- [ ] Chrome/Edge support
- [ ] Mobile support (Firefox for Android)

## Acknowledgments

Built with ❤️ for productivity enthusiasts and automation fans.

**LinkStart** - Because every browsing session deserves a powerful start!
