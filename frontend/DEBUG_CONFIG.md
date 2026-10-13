# Debug: API Key Not Configured Error

## Issue
You're seeing "⚠ No API key configured. Please set it in the sidebar." even though you've configured the API key.

## Root Cause Analysis

The error occurs in `frontend/src/hooks/useAiQuery.js:40` when `config.apiKey` is empty or undefined.

The config flow is:
1. `useConfig()` hook stores API keys per provider in `config.apiKeys` object
2. `useConfig()` derives `apiKey` (singular) from `config.apiKeys[config.provider]`
3. `App.js` creates `effectiveConfig = { ...config, apiKey }` to add the derived key
4. Components like JiraPanel receive `effectiveConfig` and pass it to `useAiQuery`
5. `useAiQuery` checks if `config.apiKey` exists

## Diagnostic Steps

### 1. Check Browser Console
Open browser DevTools (F12) and check the Console for any errors.

### 2. Check localStorage
In Browser DevTools > Application > Local Storage > http://localhost:3000

Look for key: `qa_assistant_config`

The value should be JSON like:
```json
{
  "provider": "groq",
  "model": "llama-3.3-70b-versatile",
  "apiKeys": {
    "groq": "gsk_YOUR_KEY_HERE",
    "gemini": "",
    "anthropic": "",
    ...
  },
  "temperature": 0.7,
  "streaming": true,
  "theme": "dark"
}
```

### 3. Verify the Provider-Key Match
- Check which provider is selected in the sidebar
- Verify that `apiKeys[provider]` has a value
- Example: if `provider` is "groq", then `apiKeys.groq` must have your API key

### 4. Check if Key is Being Saved
1. Open sidebar
2. Select a provider (e.g., Groq)
3. Enter your API key
4. You should see "✓ saved" next to "API Key" label
5. Check localStorage again to confirm it was written

## Quick Fix

If the key is not saving:

1. Clear localStorage:
   - DevTools > Application > Local Storage > right-click > Clear
   
2. Refresh the page

3. Re-enter your configuration:
   - Select provider
   - Enter API key
   - Verify "✓ saved" appears

4. Try using a JIRA tool again

## Code Location of Error
- Error thrown: `frontend/src/hooks/useAiQuery.js:40`
- Config management: `frontend/src/hooks/useConfig.js:76`
- Config merging: `frontend/src/App.js:65`
