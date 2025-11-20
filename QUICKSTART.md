# Quick Start Guide

Get up and running with Startup Extension in 5 minutes!

## Installation & First Run

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development mode:**
   ```bash
   npm run dev
   ```

   Firefox will open automatically with the extension loaded. The settings page will appear on first run.

## Create Your First Group

1. **Add a new group:**
   - Click "Add Group"
   - Name it (e.g., "Morning Sites")
   - Click "Save"

2. **Add sites to your group:**
   - Click "Add Site" in your new group
   - Fill in the details:
     - **Name**: "GitHub"
     - **URL**: `https://github.com`
     - **Script**: Leave empty for now
   - Click "Save"

3. **Add a few more sites** the same way (e.g., Gmail, Twitter, etc.)

## Launch Your Group

1. **Click the extension icon** in the Firefox toolbar (green circle with play button)
2. **Click your group's launch button**
3. **Watch the magic happen** - all your sites open in new tabs!

## Add Automation (Optional)

Let's automate a simple task:

1. **Edit a site** in your group
2. **Add this example script:**
   ```javascript
   // Wait for page to load
   await sleep(2000);

   // Click on a specific link (customize selector)
   if (elementExists('a[href="/trending"]')) {
     await clickElement('a[href="/trending"]');
   }
   ```
3. **Save and test**

## Single vs Multi-Group Mode

### Multi-Group Mode (Default)
- Click toolbar icon → See list of all groups → Choose which to launch
- Great when you have different groups for different contexts

### Single-Group Mode
- Settings tab → Select "Single Group Mode" → Choose default group
- Click toolbar icon → Instantly launches your default group
- Great for your most-used daily setup

## Tips & Tricks

### Quick Tips
- Use **Enable/Disable** checkbox to temporarily skip sites without deleting them
- **Export** your configuration regularly as a backup
- Start with simple groups, add automation later
- Check browser console (F12) for automation errors

### Automation Tips
- Test selectors in browser DevTools first
- Add `await sleep(1000)` between actions for stability
- Use `waitForElement()` instead of fixed delays when possible
- Keep scripts simple and focused

### Security Tips
- ⚠️ Don't store real passwords in scripts during testing
- Use test accounts when developing automation
- Remember scripts are stored in plain text
- Consider using password manager integration in production

## Example Groups

### Work Setup
- Email client
- Project management tool
- Slack/Teams
- Calendar
- Time tracking

### Social Media
- Twitter
- LinkedIn
- Facebook
- Instagram
- Reddit

### Development
- GitHub
- Documentation sites
- Local dev servers
- Cloud consoles
- Monitoring dashboards

## Next Steps

1. **Explore automation helpers** - Check README.md for full function list
2. **Create multiple groups** - Different contexts (work, personal, research)
3. **Refine your scripts** - Add proper error handling and logging
4. **Share your setup** - Export and share configurations with team

## Common Issues

**Sites not opening?**
- Check URLs include `https://` or `http://`
- Verify sites are enabled

**Automation not working?**
- Open browser console (F12)
- Check for JavaScript errors
- Verify selectors match page elements

**Extension not loading?**
- Run `npm run lint` to check for errors
- Check `about:debugging` in Firefox
- Restart Firefox

## Development Commands

```bash
# Run in development mode with auto-reload
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

## Get Help

- Check the full README.md for detailed documentation
- Look at example scripts in the settings page
- Open an issue on GitHub for bugs or questions

---

**Happy automating! 🚀**
