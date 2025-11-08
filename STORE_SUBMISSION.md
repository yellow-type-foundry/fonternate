# Chrome Web Store Submission Guide

## Package Information
- **Package File**: `fonternate-v1.0.3.zip` (120KB)
- **Version**: 1.0.3
- **Manifest Version**: 3

## Store Listing Requirements

### 1. Name
**Fonternate**

### 2. Summary (132 characters max)
Override fonts on any webpage. Test typography with weight selection, OpenType features, and stylistic sets.

### 3. Description
Fonternate is a powerful Chrome extension that lets you override fonts on any webpage with locally installed fonts. Perfect for designers, developers, and typography enthusiasts who want to test how different fonts look on live websites.

**Key Features:**
- 🎨 **Font Override**: Apply any locally installed font to any webpage
- ⚖️ **Weight Selection**: Choose from 9 font weights (100-900) with always-visible selector
- 🔤 **OpenType Features**: Enable ligatures, stylistic sets (ss01-ss20), swashes, and contextual alternates
- 📝 **Text Transform**: Apply uppercase, lowercase, or none transformations
- 💾 **Persistent Settings**: Your preferences are saved and restored across sessions
- ⌨️ **Keyboard Shortcut**: Toggle extension with Ctrl+Shift+F (Cmd+Shift+F on Mac)
- 🔄 **Previous Font**: Quickly switch between current and previous font
- 🎯 **Smart Detection**: Automatically detects available OpenType features for your selected font

**Perfect For:**
- Web designers testing typography choices
- Developers previewing fonts before implementation
- Typography enthusiasts exploring font features
- Anyone who wants to customize their browsing experience

**Privacy:**
Fonternate does NOT collect, track, or transmit any personal data. All preferences are stored locally on your device. See PRIVACY_POLICY.md for details.

### 4. Category
**Productivity** or **Developer Tools**

### 5. Language
English (United States)

### 6. Privacy Policy URL
[Your GitHub Pages URL or website]/PRIVACY_POLICY.md

Example: `https://yourusername.github.io/fonternate/PRIVACY_POLICY.md`

### 7. Screenshots Required
You'll need to provide:
- **Small tile (440x280)**: Extension icon or popup preview
- **Screenshot 1 (1280x800 or 640x400)**: Main popup interface showing font input and weight selector
- **Screenshot 2 (1280x800 or 640x400)**: OpenType features panel
- **Screenshot 3 (1280x800 or 640x400)**: Before/after comparison on a website

### 8. Promotional Images (Optional but Recommended)
- **Marquee (1400x560)**: Main promotional banner
- **Small tile (440x280)**: For featured placement

### 9. Store Icons
All icons are included in the package:
- ✅ icon16.png
- ✅ icon32.png
- ✅ icon48.png
- ✅ icon128.png

### 10. Support URL
[Your GitHub repository URL]/issues

Example: `https://github.com/yourusername/fonternate/issues`

### 11. Homepage URL (Optional)
[Your GitHub repository URL]

Example: `https://github.com/yourusername/fonternate`

## Submission Checklist

### Pre-Submission
- ✅ Code is production-ready
- ✅ Debug console.log statements removed
- ✅ Privacy policy created
- ✅ LICENSE file included
- ✅ Manifest version 3 compliant
- ✅ All required icons present
- ✅ Extension tested and working
- ✅ No TypeScript errors
- ✅ No linter errors

### Store Listing
- [ ] Screenshots prepared (3-5 images)
- [ ] Promotional images created (optional)
- [ ] Privacy policy hosted online
- [ ] Support URL configured
- [ ] Description finalized
- [ ] Category selected

### Testing Checklist
- [ ] Extension loads without errors
- [ ] Font override works on various websites
- [ ] Weight selector functions correctly
- [ ] OpenType features apply properly
- [ ] Settings persist across sessions
- [ ] Keyboard shortcut works
- [ ] Previous font button works
- [ ] Reset button clears all settings

## Submission Steps

1. **Prepare Store Assets**
   - Take screenshots of the extension
   - Create promotional images if desired
   - Host privacy policy online

2. **Go to Chrome Web Store Developer Dashboard**
   - Visit: https://chrome.google.com/webstore/devconsole
   - Sign in with your Google account
   - Pay one-time $5 registration fee (if first time)

3. **Upload Package**
   - Click "New Item"
   - Upload `fonternate-v1.0.2.zip`
   - Fill in all required fields

4. **Complete Store Listing**
   - Add description
   - Upload screenshots
   - Add privacy policy URL
   - Set category and language

5. **Submit for Review**
   - Review all information
   - Submit for review
   - Wait for approval (typically 1-3 business days)

## Notes

- The extension uses Manifest V3 (latest standard)
- All permissions are necessary and explained in the privacy policy
- No user data is collected or transmitted
- The extension is lightweight (~120KB packaged)
- Compatible with all Chrome-based browsers

## Version History

### v1.0.3 (Current)
- Replaced font weight segmented control with interactive slider component
- Added smooth drag animations with requestAnimationFrame
- Improved weight label styling with active state lift animation
- Updated inactive label color to #d0bfb9
- Enhanced handle styling with 16px width and 100px border radius
- Improved alignment with exact tick mark positioning

### v1.0.2
- Centered font input text
- Removed debug console.log statements
- Updated description
- Added privacy policy
- Optimized for production

### v1.0.1
- Added weight selector with default 400 (regular)
- Separated font family name and weight
- Always-visible weight selector

### v1.0.0
- Initial release
- Font override functionality
- OpenType features support

