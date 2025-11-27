# Debug Guide - API Error Fix

## ✅ What Was Fixed:

Added comprehensive error handling and logging to identify the exact issue with the Gemini API response.

## 🔍 How to Debug:

### Step 1: Reload the Extension
1. Go to `edge://extensions/`
2. Find "Find & Replace"
3. Click the 🔄 reload button

### Step 2: Open Browser Console
1. Open the extension popup
2. Press **F12** to open Developer Tools
3. Click the **Console** tab
4. Keep it open while testing

### Step 3: Test Again
1. Go to your WordPress page
2. Open "AI Content Improver"
3. Click "Scan Page & Generate Suggestions"
4. Watch the Console tab for detailed error messages

### Step 4: Check Console Output

You should see logs like:
```
Processing field 1/3: We fix fridges fast...
API Response: {candidates: [...], usageMetadata: {...}}
```

**If you see an error**, it will show:
- What field failed
- The exact API response
- Why it failed

## 🔧 Common Issues & Solutions:

### Issue 1: "No candidates returned. Text may have been blocked by safety filters."
**Problem**: Gemini blocked the content due to safety filters
**Solution**: 
- Check if the text contains sensitive content
- Try with simpler, more professional text
- Adjust the prompt to be more neutral

### Issue 2: "API Error (404): Model not found"
**Problem**: `gemini-2.5-flash` model might not be available yet
**Solution**: Switch to `gemini-1.5-flash`:
1. Open `ai-improve.js`
2. Find line with `gemini-2.5-flash`
3. Change to `gemini-1.5-flash`
4. Reload extension

### Issue 3: "Invalid API key"
**Problem**: API key is wrong or expired
**Solution**:
- Get new API key from https://aistudio.google.com/app/apikey
- Make sure you copied the entire key
- Try the "Test API Key" button first

### Issue 4: "Quota exceeded"
**Problem**: Hit the free tier limit
**Solution**:
- Wait a bit (quota resets hourly/daily)
- Check your quota at Google AI Studio
- Upgrade to paid tier if needed

## 📊 What the Console Shows:

Good response:
```javascript
API Response: {
  candidates: [{
    content: {
      parts: [{
        text: "Your improved text here"
      }]
    }
  }]
}
```

Bad response (blocked):
```javascript
API Response: {
  candidates: [{
    finishReason: "SAFETY"
  }]
}
```

## 🎯 Quick Test:

Try with this simple text first:
1. Open any webpage
2. Press F12 → Console tab
3. Paste: `document.body.innerHTML += '<textarea>Professional appliance repair services</textarea>'`
4. Press Enter
5. Now scan the page with AI Improver

If this works, the issue is with your original text content.

## 🔄 Fallback: Use Gemini 1.5 Flash

If `gemini-2.5-flash` doesn't work, switch to the stable version:

1. Open `ai-improve.js` in your editor
2. Find these two lines (around lines 108 and 243):
   ```javascript
   gemini-2.5-flash
   ```
3. Change both to:
   ```javascript
   gemini-1.5-flash
   ```
4. Save and reload the extension

## 📝 Next Steps:

1. **Reload extension** ✅
2. **Open browser console (F12)** ✅
3. **Try scanning a page** ✅
4. **Check console for detailed error** ✅
5. **Share the console output** if still not working

---

The extension now has detailed logging - check the Console tab to see exactly what's happening! 🔍
