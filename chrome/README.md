# LinkStart Chrome Extension

Chrome/Chromium version of LinkStart using Manifest V3.

## Key Differences from Firefox Version

### Manifest V3
- Uses service worker instead of persistent background page
- Uses `chrome.scripting.executeScript` instead of `browser.tabs.executeScript`
- Permissions separated into `permissions` and `host_permissions`
- Uses `chrome.alarms` API for autostart delay (more reliable than setTimeout in service workers)

### API Changes
- All `browser.*` APIs replaced with `chrome.*`
- Chrome uses callback-style APIs but also supports Promises in most modern APIs

## Testing in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `chrome/` directory
5. Extension should load and open settings page

## Testing Features

- [ ] URL management (add/edit/delete)
- [ ] Group management (add/edit/delete/launch)
- [ ] Automation scripts execution
- [ ] Autostart on Chrome launch (requires browser restart)
- [ ] Import/Export functionality
- [ ] Both Single and Multi Group modes
- [ ] Dark mode

## Building for Distribution

```bash
npm run build:chrome
```

This creates `dist/linkstart-chrome.zip` ready for Chrome Web Store submission.

## Known Chrome-Specific Behavior

1. **Service Worker Lifecycle**: The service worker may terminate when idle and restart when needed
2. **Autostart Delay**: Uses `chrome.alarms` instead of `setTimeout` for reliability
3. **Content Script Injection**: Must use `chrome.scripting` API (MV3 requirement)
4. **Icon Format**: SVG icons work but PNG recommended for Chrome Web Store

## Chrome Web Store Submission Checklist

- [ ] Test on latest Chrome
- [ ] Test on Microsoft Edge (Chromium)
- [ ] Create store listing with screenshots
- [ ] Add detailed description
- [ ] Set up developer account ($5 one-time fee)
- [ ] Upload `linkstart-chrome.zip`
- [ ] Fill privacy policy
- [ ] Submit for review

## Compatibility

- Chrome 88+
- Microsoft Edge (Chromium)
- Brave
- Opera
- Any Chromium-based browser with Manifest V3 support
