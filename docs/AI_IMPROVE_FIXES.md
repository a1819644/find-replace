# AI Improve JavaScript - Error Fixes

## Issues Identified:

1. **MAX_TOKENS Limit**: Batch requests are too large
2. **Invalid Response Structure**: Response parsing is failing
3. **Batch Processing Errors**: Fallback logic not working properly

## Fixes Needed:

### 1. Reduce Batch Size
The current batch size is too large, causing MAX_TOKENS errors.

**Location**: Around line 1034 in `ai-improve.js`
**Change**: Reduce the `batchSize` variable from current value to a smaller number (try 3-5 instead of 11)

```javascript
// Change this line (find the batchSize definition):
const batchSize = 3; // Reduced from higher number to avoid MAX_TOKENS
```

### 2. Improve Response Parsing
**Location**: Around lines 1225-1235 in `improveBatchWithGemini` function

**Current problematic code**:
```javascript
if (!rawText || !rawText.trim()) {
  console.error("Unexpected batch response format:", candidate);
  throw new Error("Invalid batch response structure from API");
}
```

**Replace with better error handling**:
```javascript
if (!rawText || !rawText.trim()) {
  console.error("Unexpected batch response format:", candidate);
  console.error("Full API response:", data);
  
  // Try alternative extraction methods
  if (candidate.outputText) {
    rawText = candidate.outputText;
  } else if (candidate.text) {
    rawText = candidate.text;
  } else if (data.text) {
    rawText = data.text;
  } else {
    throw new Error("Invalid batch response structure from API - no text found");
  }
}
```

### 3. Add Retry Logic for Failed Batches
**Location**: Around line 1091 in `improveFieldsInBatches` function

**Add retry logic before fallback**:
```javascript
} catch (error) {
  console.warn(`Batch request failed, retrying with smaller batch size: ${error.message}`);
  
  // Try with smaller batch size first
  if (batch.length > 1) {
    const smallerBatches = [];
    for (let j = 0; j < batch.length; j += 2) {
      smallerBatches.push(batch.slice(j, j + 2));
    }
    
    for (const smallBatch of smallerBatches) {
      try {
        const smallBatchResults = await improveBatchWithGemini(smallBatch, settings, pageIntent);
        // Process results...
      } catch (smallBatchError) {
        // Fall back to single field processing for this small batch
        for (const field of smallBatch) {
          // Single field fallback code...
        }
      }
    }
  } else {
    // Original fallback code for single fields
    console.log("Batch request failed, falling back to single field calls:", error.message);
    // ... existing fallback code
  }
}
```

### 4. Improve Token Management
**Add before making API calls**:

```javascript
function estimateTokens(text) {
  // Rough estimation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

function shouldReduceBatchSize(batch) {
  const totalTokens = batch.reduce((sum, field) => {
    return sum + estimateTokens(field.text || '');
  }, 0);
  
  // Keep under 30000 tokens to avoid MAX_TOKENS
  return totalTokens > 25000;
}
```

### 5. Enhanced Error Logging
**Add to improveBatchWithGemini function** around line 1181:

```javascript
console.log("Batch API Response:", data);

// Add detailed logging for debugging
if (data.candidates && data.candidates[0]) {
  const candidate = data.candidates[0];
  console.log("Candidate finish reason:", candidate.finishReason);
  console.log("Candidate content structure:", {
    hasContent: !!candidate.content,
    hasParts: !!candidate.content?.parts,
    partsLength: candidate.content?.parts?.length || 0,
    hasOutputText: !!candidate.outputText,
    hasText: !!candidate.text
  });
}
```

## Quick Fix Implementation:

### Immediate Solution (Minimal Changes):

1. **Find this line** around 1034:
   ```javascript
   const batchSize = // current number;
   ```
   **Change to**:
   ```javascript
   const batchSize = 3; // Reduced to avoid MAX_TOKENS
   ```

2. **Add better error handling** in the response parsing section around line 1230:
   ```javascript
   if (!rawText || !rawText.trim()) {
     console.error("Trying alternative text extraction methods...");
     rawText = candidate.outputText || candidate.text || data.text || "";
     
     if (!rawText || !rawText.trim()) {
       console.error("Unexpected batch response format:", candidate);
       throw new Error("Invalid batch response structure from API");
     }
   }
   ```

3. **Add token estimation** before batch processing:
   ```javascript
   // Before calling improveBatchWithGemini, add:
   const totalLength = batch.reduce((sum, field) => sum + (field.text?.length || 0), 0);
   if (totalLength > 20000) { // Adjust threshold as needed
     console.warn("Batch too large, splitting further...");
     // Split the batch into smaller pieces
   }
   ```

## Testing:
1. Reload the page
2. Try the AI improve function with a smaller amount of content first
3. Monitor the console for the new logging messages
4. Gradually increase the content amount to find the optimal batch size

These changes should resolve the MAX_TOKENS errors and improve the response parsing reliability.