# Development Server Setup

This guide explains how to run the Fonternate popup UI in a standalone browser tab for easier debugging.

## Overview

The dev server allows you to:
- ✅ Debug the UI in a regular browser tab (not just extension popup)
- ✅ Use full browser DevTools (Elements, Console, Network, etc.)
- ✅ Hot reload on code changes
- ✅ See console logs more easily
- ✅ Inspect React components with React DevTools

**Note:** Chrome extension APIs are mocked in dev mode. Actions are logged to console but won't actually apply fonts to web pages.

## Setup

1. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

2. **Start the dev server**:
   ```bash
   npm run dev:ui
   ```

3. **Open your browser**:
   - The dev server will automatically open `http://localhost:3000`
   - Or manually navigate to that URL

## How It Works

### Dev Mode Detection

The extension automatically detects if it's running in:
- **Extension context**: Real Chrome APIs are used
- **Dev mode (browser tab)**: Mock Chrome APIs are used

### Mock Chrome APIs

In dev mode, the following are mocked:
- `chrome.runtime.sendMessage()` - Logs to console
- `chrome.storage.sync` - Uses in-memory storage
- `chrome.tabs.query()` - Returns mock tab data
- `chrome.runtime.getURL()` - Returns localhost URLs

### Console Logging

All Chrome API calls are logged to the browser console with `[DEV MODE]` prefix:
```
[DEV MODE] chrome.runtime.sendMessage: {type: "APPLY_FONT", payload: {...}}
[DEV MODE] chrome.storage.sync.set: {appState: {...}}
```

## Development Workflow

### Option 1: Dev Server Only (UI Testing)
```bash
npm run dev:ui
```
- Test UI components and interactions
- Debug React state and props
- Test styling and layout
- **Note:** Font application won't work (mocked)

### Option 2: Extension Build + Dev Server (Full Testing)
1. **Terminal 1** - Build extension in watch mode:
   ```bash
   npm run dev
   ```

2. **Terminal 2** - Run dev server for UI:
   ```bash
   npm run dev:ui
   ```

3. **Load extension in Chrome**:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder
   - Test in actual extension popup

4. **Debug UI in browser tab**:
   - Open `http://localhost:3000` for easier debugging
   - Use React DevTools, console, etc.

## Troubleshooting

### Assets Not Loading
If SVG icons don't appear:
1. Check that `src/popup/assets/` contains the SVG files
2. Verify the dev server is serving from the correct directory
3. Check browser console for 404 errors

### Hot Reload Not Working
- Make sure you're using `npm run dev:ui` (not `npm run dev`)
- Check that webpack-dev-server is running
- Hard refresh the browser (Cmd+Shift+R / Ctrl+Shift+R)

### Chrome APIs Not Working
- This is expected in dev mode - APIs are mocked
- Check console for `[DEV MODE]` logs
- To test real APIs, use the extension popup instead

## File Structure

```
fonternate/
├── dev.html              # Dev server HTML template
├── webpack.dev.js        # Dev server webpack config
├── src/
│   └── utils/
│       └── chromeDev.ts  # Mock Chrome APIs for dev mode
└── package.json          # Contains "dev:ui" script
```

## Port Configuration

Default port is **3000**. To change it:
1. Edit `webpack.dev.js`
2. Change `port: 3000` to your desired port
3. Restart the dev server

## Production Build

The dev server is **only for development**. For production:
```bash
npm run build
```

This creates the extension files in `dist/` folder.

## Notes

- Dev mode storage is **in-memory only** - data is lost on page refresh
- Font application is **mocked** - won't actually change fonts on web pages
- Use the actual extension popup to test real functionality
- The dev server is separate from the extension build process
