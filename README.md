# Fonternate

A Chrome Extension that lets you test custom fonts on live websites with advanced typography controls, similar to the old FontSwap extension but with more granular control.

## Features

### 🎨 Font Selection
- **Google Fonts Integration**: Choose from popular Google Fonts with a dropdown selector
- **Custom Fonts**: Enter any font name manually (e.g., Arial, Helvetica, custom web fonts)
- **Font Preview**: See how your selected font looks with sample text

### 📏 Typography Controls
- **Font Size**: Adjust font size from 8px to 32px with a slider
- **Letter Spacing (Tracking)**: Control character spacing from -2px to 4px
- **Line Height (Leading)**: Adjust line spacing from 1.0 to 3.0
- **Text Transform**: Apply uppercase, lowercase, capitalize, or none

### 🔤 OpenType Features
- **Ligatures**: Enable/disable standard ligatures (fi, fl, ff, etc.)
- **Stylistic Sets**: Toggle ss01-ss20 for advanced typography features
- **Real-time Preview**: See OpenType features in action

### ⚡ Quick Controls
- **Keyboard Shortcut**: Toggle extension on/off with `Ctrl+Shift+F` (or `Cmd+Shift+F` on Mac)
- **Global Application**: Apply fonts to all text elements on any website
- **Persistent Settings**: Your preferences are saved and restored across sessions

## Project Structure

```
fonternate/
├── manifest.json              # Chrome extension manifest (v3)
├── popup.html                 # Popup entry point
├── package.json               # Dependencies and build scripts
├── tsconfig.json              # TypeScript configuration
├── webpack.config.js          # Webpack build configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── src/
│   ├── types/
│   │   ├── index.ts           # TypeScript type definitions
│   │   └── chrome.d.ts        # Chrome API type declarations
│   ├── utils/
│   │   └── chrome.ts          # Chrome API utility functions
│   ├── background/
│   │   └── background.ts      # Service worker for background tasks
│   ├── content/
│   │   └── content.ts         # Content script for page injection
│   └── popup/
│       ├── index.tsx          # Main React popup component
│       ├── popup.css          # Popup styles with Tailwind
│       └── components/
│           ├── FontSelector.tsx       # Font selection component
│           ├── FontControls.tsx       # Typography controls
│           └── OpenTypeFeatures.tsx   # OpenType feature toggles
├── dist/                      # Built extension files (generated)
└── icons/                     # Extension icons (to be added)
```

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

1. **Clone or download the project**
   ```bash
   cd fonternate
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```

4. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked" and select the `dist` folder
   - The extension should now appear in your extensions list

### Development

For development with hot reloading:
```bash
npm run dev
```

This will watch for changes and rebuild automatically.

## Usage

### Basic Usage
1. Click the extension icon in your Chrome toolbar
2. Select a font from the dropdown or enter a custom font name
3. Adjust typography settings using the sliders and controls
4. Toggle the extension on/off using the button in the popup header

### Keyboard Shortcuts
- **Toggle Extension**: `Ctrl+Shift+F` (Windows/Linux) or `Cmd+Shift+F` (Mac)

### Advanced Features
- **OpenType Features**: Enable ligatures and stylistic sets for fonts that support them
- **Custom Fonts**: Enter any font family name, including web fonts loaded on the page
- **Persistent Settings**: Your font preferences are saved and will be applied to new pages

## Technical Details

### Architecture
- **Manifest v3**: Uses the latest Chrome extension manifest format
- **TypeScript**: Full type safety throughout the codebase
- **React**: Modern UI components with hooks
- **Tailwind CSS**: Utility-first styling
- **Webpack**: Module bundling and optimization

### Chrome APIs Used
- `chrome.storage.sync`: Persistent settings storage
- `chrome.tabs`: Tab management and messaging
- `chrome.runtime`: Message passing between components
- `chrome.commands`: Keyboard shortcut handling
- `chrome.scripting`: Content script injection

### Content Script Features
- **Non-destructive**: Preserves original page styles
- **Dynamic Content**: Handles dynamically loaded content
- **Performance Optimized**: Efficient DOM manipulation
- **Memory Management**: Proper cleanup of applied styles

## Customization

### Adding New Fonts
The extension includes a curated list of popular Google Fonts. To add more:
1. Edit `src/utils/chrome.ts`
2. Add fonts to the fallback array in `loadGoogleFonts()`
3. Rebuild the extension

### Custom OpenType Features
To add support for additional OpenType features:
1. Update the `FontSettings` interface in `src/types/index.ts`
2. Add the feature to the default settings
3. Update the UI components to include the new feature

### Styling
The popup uses Tailwind CSS. Customize the design by:
1. Modifying `tailwind.config.js`
2. Adding custom classes in `src/popup/popup.css`
3. Updating component styles

## Troubleshooting

### Common Issues

**Extension not loading**
- Check that all files are in the correct locations
- Ensure the manifest.json is valid
- Verify that the dist folder contains all built files

**Fonts not applying**
- Check browser console for errors
- Ensure the target website allows content scripts
- Verify that the font name is correct

**Settings not saving**
- Check Chrome storage permissions
- Verify that the background script is running
- Check for console errors in the extension

### Debug Mode
Enable debug mode by opening the extension popup and checking the browser console for detailed logs.

## Future Enhancements

- [ ] Local font file upload support
- [ ] Font comparison mode (side-by-side)
- [ ] Font performance metrics
- [ ] Custom CSS injection
- [ ] Font subsetting for performance
- [ ] Integration with font services (Adobe Fonts, etc.)
- [ ] Export/import font settings
- [ ] Font recommendations based on website content

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Credits

Inspired by the original FontSwap extension, but rebuilt with modern web technologies and enhanced features. 