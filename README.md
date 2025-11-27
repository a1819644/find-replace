# Find & Replace Browser Extension with AI Content Improver

A powerful browser extension that allows you to find and replace text on any webpage, plus an AI-powered content improvement tool using Google Gemini 2.0.

## Features

### Manual Find & Replace
- 🔍 Find and replace text on any webpage
- 🔄 Replace all occurrences at once
- ↩️ Restore original content with one click
- 🎯 Case-sensitive matching option
- 📝 Whole word matching option
- 💾 Remembers your last search settings
- ✏️ Works in text fields, textareas, and WordPress editors

### AI Content Improver (NEW!)
- 🤖 Powered by Google Gemini 2.0 Flash
- 📝 Automatically scans all text fields on a page
- ✨ Generates improved versions of your content
- 🎯 Customizable based on brand name, business focus, and target audience
- 👀 Review and accept/reject each suggestion individually
- 🚀 Applies all accepted changes with one click
- 💼 Perfect for WordPress, forms, and content management systems

## Installation

### For Chrome/Edge/Brave (Chromium-based browsers):

1. Open your browser and go to the extensions page:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
   - Brave: `brave://extensions/`

2. Enable "Developer mode" (toggle switch in the top right corner)

3. Click "Load unpacked" button

4. Select the folder containing these extension files (`find&replace`)

5. The extension icon should now appear in your browser toolbar

### For Firefox:

1. Open Firefox and go to `about:debugging#/runtime/this-firefox`

2. Click "Load Temporary Add-on..."

3. Navigate to the `find&replace` folder and select the `manifest.json` file

4. The extension will be loaded temporarily (it will be removed when you restart Firefox)

**Note for Firefox**: To make the extension permanent in Firefox, you need to:
- Add an `id` to the manifest (browser_specific_settings)
- Sign it through Mozilla Add-ons (or use Firefox Developer Edition/Nightly with signing disabled)

## Usage
BeVu qy8E 1yuK iQJG r7To C4N9
### Manual Find & Replace

1. Navigate to any webpage where you want to find and replace text

2. Click the extension icon in your browser toolbar

3. Enter the text you want to find in the "Find" field

4. Enter the replacement text in the "Replace with" field

5. (Optional) Enable "Case sensitive" or "Whole word only" options

6. Click "Replace All" to replace all occurrences

7. Click "Restore Original" if you want to undo the changes

### AI Content Improver

1. **Get a Gemini API Key:**
   - Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Sign in with your Google account
   - Click "Create API Key"
   - Copy your free API key

2. **Configure Settings:**
   - Click the extension icon
   - Click "✨ Try AI Content Improver"
   - Go to the "Settings" tab
   - Enter your Gemini API key
   - Fill in your brand information:
     - Brand Name
     - Business Focus
     - Target Audience
     - Service Area
     - Content Tone
   - Click "Save Settings"

3. **Improve Content:**
   - Navigate to a webpage with text fields (e.g., WordPress editor)
   - Click the extension icon and open AI Content Improver
   - Go to the "Improve Content" tab
   - Click "Scan Page & Generate Suggestions"
   - Wait for AI to analyze and improve your content
   - Review each suggestion (original vs improved)
   - Click "✓ Accept" for suggestions you like
   - Click "✗ Reject" for suggestions you don't want
   - Click "Apply All Accepted Changes" to update the page

4. **Perfect for:**
   - WordPress blog posts and pages
   - Product descriptions
   - Service pages
   - Contact forms
   - Any editable web content

## Options

- **Case sensitive**: When enabled, "hello" will not match "Hello"
- **Whole word only**: When enabled, "cat" will not match "category"

## Notes

- The extension only modifies the current page view temporarily
- Changes are not permanent - refreshing the page will restore original content
- The extension saves your last search settings for convenience
- Works on most websites (some sites with strict security policies may not allow modifications)

## Creating Icons

To complete the extension, you need to create three icon files:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

You can create simple icons using any image editor or online icon generator.

## License

Free to use and modify.
