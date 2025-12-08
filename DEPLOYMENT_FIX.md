# Vercel Deployment Fix - Serverless Function Limit

## Problem
Vercel Hobby plan allows maximum 12 Serverless Functions per deployment. The app had 9+ separate API files in the `api/` directory, each being treated as a separate function, exceeding the limit.

## Solution
Consolidated all API routes into a **single serverless function**: `api/index.js`

## Changes Made

### 1. Created Consolidated API Handler
- **File**: `api/index.js`
- **Purpose**: Single handler for all API routes
- **Routes Handled**:
  - `/api/days` - Get all days
  - `/api/words/:day` - Get words for a day
  - `/api/stats` - Get statistics
  - `/api/kana` - Get kana data
  - `/api/learning-plan` - Get learning plan
  - `/api/exercises` - Generate/validate exercises
  - `/api/session` - Exercise session management
  - `/api/achievements` - Achievements data
  - `/api/daily-quests` - Daily quests data

### 2. Updated `vercel.json`
```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/index.js"
    }
  ]
}
```
- Routes all `/api/*` requests to the single handler
- Only creates **1 serverless function** instead of 9+

### 3. Moved Old API Files
- Moved old endpoint files to `api/_legacy/` directory
- Files starting with `_` are ignored by Vercel
- Prevents Vercel from treating them as separate functions
- Kept for reference/documentation

## Result

### Before:
- 9+ serverless functions (exceeded 12 function limit)
- Deployment failed

### After:
- **1 serverless function** (well within limit)
- Deployment should succeed

## File Structure

```
api/
├── index.js              ← Single serverless function (deployed)
├── _game-mechanics.js    ← Helper (not a function)
├── _kana-data.js         ← Helper (not a function)
├── _pdf-extractor.js     ← Helper (not a function)
├── services/             ← Helpers (not functions)
│   ├── answer-validator.js
│   ├── distractor-generator.js
│   ├── exercise-generator.js
│   ├── exercise-session.js
│   └── fuzzy-matcher.js
└── _legacy/              ← Old files (ignored by Vercel)
    ├── achievements.js
    ├── daily-quests.js
    ├── days.js
    ├── exercises.js
    ├── kana.js
    ├── learning-plan.js
    ├── session.js
    ├── stats.js
    └── words/
        └── [day].js
```

## Testing After Deployment

Test all API endpoints to ensure they work:
1. `GET /api/days`
2. `GET /api/words/1`
3. `GET /api/stats`
4. `GET /api/kana?type=hiragana`
5. `GET /api/learning-plan`
6. `GET /api/exercises?type=vocabulary`
7. `POST /api/session?action=create`
8. `GET /api/achievements`
9. `GET /api/daily-quests`

## Local Development

The `server.js` file for local development is unaffected. It can continue using Express routing or be updated to use the consolidated handler. Local development doesn't have function limits.

## Next Steps

1. ✅ Consolidate API routes - DONE
2. ✅ Update vercel.json - DONE
3. ✅ Move old files to _legacy - DONE
4. ⏭️ Deploy to Vercel
5. ⏭️ Test all endpoints
6. ⏭️ Verify deployment succeeds

The app should now deploy successfully on Vercel Hobby plan! 🚀

