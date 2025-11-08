# Fonternate

A Chrome Extension that lets you override fonts on any webpage with locally installed fonts. Test typography with advanced OpenType features, weight selection, and stylistic sets.

## Features

### 🎨 Font Selection
- **Custom Font Input**: Enter any font family name (e.g., Helvetica, Arial, custom web fonts)
- **Weight Selector**: Always-visible selector with 9 font weights (100-900)
  - Default weight: 400 (regular)
  - Separate family name and weight for better control
- **Previous Font**: Quickly switch between current and previous font

### 📝 Text Controls
- **Text Transform**: Apply uppercase, lowercase, or none transformations
- **Text Styles**: Toggle various text style features

### 🔤 OpenType Features
- **Ligatures**: 
  - Standard ligatures (liga) - fi, fl, ff, etc.
  - Discretionary ligatures (dlig) - decorative ligatures
- **Stylistic Sets**: Toggle ss01-ss20 for advanced typography features
- **Swashes**: Control swash levels (0-9) for decorative characters
- **Contextual Alternates (calt)**: Enable contextual character substitutions
- **Smart Detection**: Automatically detects available OpenType features for your selected font

### ⚡ Quick Controls
- **Keyboard Shortcut**: Toggle extension with `Ctrl+Shift+F` (or `Cmd+Shift+F` on Mac)
- **Apply Button**: Manually apply font changes
- **Reset Button**: Clear all font overrides and reset to defaults
- **Persistent Settings**: Your preferences are saved and restored across sessions

### 🔒 Privacy
- **No Data Collection**: Fonternate does NOT collect, track, or transmit any personal data
- **Local Storage Only**: All preferences stored locally on your device
- **No Analytics**: No tracking or analytics services used

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
│           ├── FontNameInput.tsx           # Font name input component
│           ├── FontWeightSelector.tsx      # Weight selector component
│           ├── TextTransformSegmented.tsx   # Text transform controls
│           ├── StylisticSetsToggleGroup.tsx # Stylistic sets toggles
│           ├── LigatureToggles.tsx          # Ligature controls
│           ├── SwashLevelSegmented.tsx      # Swash level selector
│           ├── ContextualAltToggle.tsx      # Contextual alternates toggle
│           └── TextStylesToggleGroup.tsx    # Text styles controls
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
2. Enter a font family name (e.g., "Helvetica", "Arial", "Inter")
3. Select a font weight from the always-visible weight selector (default: 400/regular)
4. Click "APPLY" to apply the font to the current page
5. Use "PREVIOUS" to quickly switch between fonts
6. Use "RESET" to clear all font overrides

### Keyboard Shortcuts
- **Toggle Extension**: `Ctrl+Shift+F` (Windows/Linux) or `Cmd+Shift+F` (Mac)

### Advanced Features
- **Weight Selection**: Choose from 9 font weights (100-900) - just enter the family name and select weight
- **OpenType Features**: 
  - Enable ligatures (standard and discretionary)
  - Toggle stylistic sets (ss01-ss20) for fonts that support them
  - Control swash levels for decorative characters
  - Enable contextual alternates
- **Text Transform**: Apply uppercase, lowercase, or none transformations
- **Smart Detection**: Extension automatically detects available OpenType features for your selected font
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

### Font Weight Suffixes
The extension supports standard font weight suffixes. To modify available weights:
1. Edit `src/utils/fontUtils.ts`
2. Update the `FONT_WEIGHTS` object or `getAvailableWeightSuffixes()` function
3. Rebuild the extension

### Custom OpenType Features
To add support for additional OpenType features:
1. Update the `AppState` interface in `src/types/index.ts`
2. Add the feature to the default settings in `src/utils/chrome.ts`
3. Update the UI components to include the new feature
4. Update the content script to apply the feature

### Styling
The popup uses Tailwind CSS with custom CSS. Customize the design by:
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