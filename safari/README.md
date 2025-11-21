# LinkStart for Safari

This directory contains the Safari version of the LinkStart extension.

## Directory Structure

```
safari/
├── LinkStart.Extension/      # Safari web extension files
│   ├── manifest.json         # Safari manifest
│   ├── background.js         # Background script
│   ├── content.js           # Content script
│   ├── popup.html/js/css    # Popup UI
│   ├── settings.html/js/css # Settings page
│   ├── storage-wrapper.js   # Storage API wrapper
│   ├── browser-polyfill.js  # WebExtension API polyfill
│   ├── shared/              # Shared utilities
│   └── icons/               # Extension icons
└── LinkStart/               # Xcode project (generated)
    ├── LinkStart.xcodeproj  # Xcode project file
    ├── LinkStart/           # macOS app wrapper
    └── LinkStart Extension/ # Native extension wrapper
```

## Requirements

- macOS 11.0 or later
- Xcode 12.0 or later
- Safari 14.0 or later (or Safari Technology Preview)

## Development Setup

### 1. Build the Extension

The Safari extension files are already set up in `LinkStart.Extension/`. To build a zip archive for distribution:

```bash
npm run build:safari
```

This creates `dist/linkstart-safari.zip`.

### 2. Open in Xcode

The Xcode project has been pre-generated. To open it:

```bash
open safari/LinkStart/LinkStart.xcodeproj
```

### 3. Run in Safari

1. In Xcode, select the LinkStart scheme and press **Run** (⌘R)
2. This will launch the LinkStart app
3. In Safari, go to **Preferences > Extensions** and enable LinkStart
4. You should see the LinkStart icon in the Safari toolbar

### 4. Enable Developer Mode in Safari

For testing, you may need to enable the Develop menu:

1. Safari > Preferences > Advanced
2. Check "Show Develop menu in menu bar"
3. Develop > Allow Unsigned Extensions

## Regenerating the Xcode Project

If you need to regenerate the Xcode project from scratch:

```bash
# Remove the old project
rm -rf safari/LinkStart

# Regenerate with Safari Web Extension Converter
npm run convert:safari

# Move the generated project back into safari/
mv LinkStart safari/
```

## Key Differences from Firefox Version

### 1. Browser API Compatibility

Safari uses the `chrome.*` namespace instead of `browser.*`. We include `browser-polyfill.js` to provide compatibility:

- **manifest.json**: Polyfill is loaded first in background scripts
- **popup.html**: Polyfill script loaded before popup.js
- **settings.html**: Polyfill script loaded before settings.js

### 2. Manifest Differences

The Safari manifest has these changes from Firefox:

- Removed `browser_specific_settings.gecko` section
- Added `"persistent": false` to background (non-persistent background page)
- Updated description to mention Safari

### 3. Unsupported Features

Safari currently doesn't support some features used in the Firefox version:

- **notifications**: The `browser.notifications` API has limited support
- **open_in_tab**: The `options_ui.open_in_tab` preference may not work (options may open in a tab anyway)

### 4. Native App Wrapper

Safari extensions require a native macOS app wrapper. The `LinkStart` app serves as this wrapper and must be distributed via the App Store or signed for direct distribution.

## Distribution

### Option 1: Mac App Store

1. Configure signing in Xcode with your Apple Developer account
2. Set deployment target (macOS version)
3. Archive the app: Product > Archive
4. Upload to App Store Connect
5. Submit for review

### Option 2: Direct Distribution

1. Sign the app with a Developer ID certificate
2. Notarize the app with Apple
3. Distribute the signed and notarized app

## Testing

### Manual Testing

1. Run the app from Xcode
2. Enable the extension in Safari Preferences
3. Test all functionality:
   - Creating groups
   - Adding sites
   - Launching groups
   - Automation scripts
   - Import/export

### Console Logging

View extension console logs:

1. Safari > Develop > Web Extension Background Pages > LinkStart
2. For content script logs: Safari > Develop > [Select Tab] > [Select Extension]

## Troubleshooting

### Extension Not Appearing

- Ensure the app is running (check menu bar or Applications folder)
- Check Safari > Preferences > Extensions
- Enable "Allow Unsigned Extensions" in Develop menu

### Scripts Not Loading

- Check browser console for errors
- Verify polyfill is loaded first in HTML files
- Ensure all file paths are correct

### Storage Issues

- Safari has different storage quota limits
- Check Safari > Develop > Web Extension Background Pages > LinkStart > Console

### Xcode Build Errors

- Clean build folder: Product > Clean Build Folder
- Update Xcode to latest version
- Check code signing settings

## Build Scripts

All build commands are defined in the root `package.json`:

- `npm run build:safari` - Create zip archive of extension files
- `npm run convert:safari` - Regenerate Xcode project from extension files

## Additional Resources

- [Safari Web Extensions Documentation](https://developer.apple.com/documentation/safariservices/safari_web_extensions)
- [Converting a Web Extension for Safari](https://developer.apple.com/documentation/safariservices/safari_web_extensions/converting_a_web_extension_for_safari)
- [Safari Web Extension Converter](https://developer.apple.com/documentation/safariservices/safari_web_extensions/running_your_safari_web_extension)
- [WebExtensions Browser API Polyfill](https://github.com/mozilla/webextension-polyfill)

## License

Same as the main project: GNU General Public License v3.0 only
