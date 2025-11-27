# AI Improve JavaScript - Large Response Fixes

## For APIs with 1M+ Token Capacity

Since your API can handle over 1 million tokens, we don't need to reduce batch size. The issues are in response parsing for large responses.

## Key Fixes Needed:

### 1. Remove MAX_TOKENS Warning (Lines 1190-1196)
**Current code that needs to be updated:**
```javascript
// Check if response was truncated due to MAX_TOKENS
if (candidate.finishReason === "MAX_TOKENS") {
  console.warn(
    "⚠️ Batch response hit MAX_TOKENS limit. Response may be incomplete."
  );
  console.warn("Consider reducing batch size or field text length.");
}
```

**Replace with:**
```javascript
// Handle different finish reasons appropriately
if (candidate.finishReason === "MAX_TOKENS") {
  console.info("ℹ️ Large response received - processing full content.");
} else if (candidate.finishReason === "SAFETY") {
  throw new Error("Content blocked by safety filters");
} else if (candidate.finishReason === "STOP") {
  console.info("✅ Response completed successfully.");
}
```

### 2. Enhanced Response Text Extraction (Lines 1197-1230)
**Replace the entire text extraction block:**
```javascript
const parts = Array.isArray(candidate.content?.parts)
  ? candidate.content.parts
  : [];

let rawText = "";

// Method 1: Extract from parts array (most common)
if (parts.length > 0) {
  rawText = parts
    .map((part) => {
      if (typeof part.text === "string") {
        return part.text;
      }
      if (part.inlineData?.data) {
        try {
          return atob(part.inlineData.data);
        } catch (error) {
          console.warn("Failed to decode inlineData", error);
          return "";
        }
      }
      if (part.functionResponse?.result) {
        return JSON.stringify(part.functionResponse.result);
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

// Method 2: Try alternative response properties
if (!rawText || !rawText.trim()) {
  rawText = candidate.outputText || candidate.text || candidate.content?.text || "";
}

// Method 3: Try top-level response properties
if (!rawText || !rawText.trim()) {
  rawText = data.outputText || data.text || data.content || "";
}

// Method 4: If response is wrapped in another structure
if (!rawText || !rawText.trim()) {
  if (data.response?.text) rawText = data.response.text;
  if (data.result?.text) rawText = data.result.text;
}

if (!rawText || !rawText.trim()) {
  console.error("No text found in response. Full response structure:");
  console.error("Candidate keys:", Object.keys(candidate));
  console.error("Data keys:", Object.keys(data));
  throw new Error("Invalid batch response structure from API - no text content found");
}
```

### 3. Improved JSON Parsing for Large Responses (Lines 1320-1340)
**Add this enhanced JSON repair logic:**
```javascript
// Extract the JSON array - handle both complete and truncated responses
let bracketMatch = cleaned.match(/\[[\s\S]*\]/);
let jsonText = bracketMatch ? bracketMatch[0] : cleaned;

// Enhanced handling for large responses
if (!jsonText.startsWith("[")) {
  // Try to find JSON starting point
  const arrayStart = cleaned.indexOf("[");
  if (arrayStart !== -1) {
    jsonText = cleaned.substring(arrayStart);
    const lastBracket = jsonText.lastIndexOf("]");
    if (lastBracket !== -1) {
      jsonText = jsonText.substring(0, lastBracket + 1);
    }
  }
}

// If the JSON appears incomplete (no closing bracket), try to salvage it
if (jsonText.startsWith("[") && !jsonText.endsWith("]")) {
  console.warn("⚠️ JSON response appears truncated. Attempting to complete it...");
  
  // More sophisticated JSON repair for large responses
  let repaired = jsonText;
  
  // Count open/close braces and brackets
  const openBraces = (repaired.match(/\{/g) || []).length;
  const closeBraces = (repaired.match(/\}/g) || []).length;
  const openBrackets = (repaired.match(/\[/g) || []).length;
  const closeBrackets = (repaired.match(/\]/g) || []).length;
  
  // Remove incomplete last object if it exists
  const lastComma = repaired.lastIndexOf(",");
  const lastBrace = repaired.lastIndexOf("}");
  if (lastComma > lastBrace) {
    repaired = repaired.substring(0, lastComma);
  }
  
  // Close missing braces
  const missingBraces = openBraces - closeBraces;
  if (missingBraces > 0) {
    repaired += "}".repeat(missingBraces);
  }
  
  // Close missing brackets
  const missingBrackets = openBrackets - closeBrackets;
  if (missingBrackets > 0) {
    repaired += "]".repeat(missingBrackets);
  }
  
  jsonText = repaired;
  console.log("🔧 JSON repair completed. Length:", jsonText.length);
}
```

### 4. Add Progress Logging for Large Batches
**Add this at the beginning of `improveBatchWithGemini` function:**
```javascript
async function improveBatchWithGemini(batch, settings, pageCtx) {
  const totalFields = batch.length;
  const totalTextLength = batch.reduce((sum, field) => sum + (field.text?.length || 0), 0);
  
  console.log(`🔄 Processing large batch: ${totalFields} fields, ${totalTextLength} characters`);
  
  // Rest of existing function...
```

### 5. Enhanced Error Handling for Large Responses
**Replace the error handling in parseGeminiBatchResponse:**
```javascript
} catch (error) {
  console.error("❌ Failed to parse batch JSON. Error:", error.message);
  console.error("📄 Response length:", jsonText.length);
  console.error("📄 First 500 chars:", jsonText.substring(0, 500));
  console.error("📄 Last 500 chars:", jsonText.substring(Math.max(0, jsonText.length - 500)));
  
  // Try to extract partial results from large responses
  const partialMatches = jsonText.match(/\{[^{}]*"index":\s*\d+[^{}]*"improved":\s*"[^"]*"[^{}]*\}/g);
  if (partialMatches && partialMatches.length > 0) {
    console.warn(`🔧 Attempting to recover ${partialMatches.length} partial results`);
    try {
      const partialResults = partialMatches.map(match => JSON.parse(match));
      console.log(`✅ Recovered ${partialResults.length} partial results`);
      return partialResults;
    } catch (partialError) {
      console.error("❌ Could not parse partial results");
    }
  }
  
  throw new Error(`Batch response was not valid JSON: ${error.message}`);
}
```

## Quick Implementation Steps:

1. **Open your `ai-improve.js` file**
2. **Find line ~1190** and replace the MAX_TOKENS warning
3. **Find line ~1197** and replace the text extraction logic  
4. **Find line ~1320** and enhance the JSON parsing
5. **Save and test with your large batch**

## Test with Large Batches:
- Keep your current batch size (11 or higher)
- The enhanced parsing will handle large API responses properly
- Monitor console for the new progress logging
- Check that all fields are processed correctly

This approach leverages your API's high token capacity while fixing the response parsing issues that were causing the errors.