# API Consolidation for Vercel Deployment

## Problem
Vercel Hobby plan limits deployments to 12 Serverless Functions. Each file in the `api/` directory was being treated as a separate function, exceeding the limit.

## Solution
Consolidated all API routes into a single serverless function: `api/index.js`

## Changes Made

### 1. Created `api/index.js`
- Single handler for all API routes
- Routes requests based on URL path
- Handles all endpoints:
  - `/api/days`
  - `/api/words/:day`
  - `/api/stats`
  - `/api/kana`
  - `/api/learning-plan`
  - `/api/exercises`
  - `/api/session`
  - `/api/achievements`
  - `/api/daily-quests`

### 2. Updated `vercel.json`
- Routes all `/api/*` requests to `/api/index.js`
- Only creates 1 serverless function instead of 9+

### 3. Old API Files
The old API files have been moved to `api/_legacy/` to prevent Vercel from treating them as separate serverless functions:
- `api/_legacy/days.js`
- `api/_legacy/words/[day].js`
- `api/_legacy/stats.js`
- `api/_legacy/exercises.js`
- `api/_legacy/kana.js`
- `api/_legacy/learning-plan.js`
- `api/_legacy/session.js`
- `api/_legacy/achievements.js`
- `api/_legacy/daily-quests.js`

These are kept for reference but won't be deployed as functions. The `_legacy` directory is ignored by Vercel.

## Deployment
- **Before**: 9+ serverless functions (exceeded limit)
- **After**: 1 serverless function (within limit)

## Local Development
The `server.js` file still uses the individual API files for local development. This doesn't affect Vercel deployment.

## Testing
After deployment, test all API endpoints to ensure they work correctly:
- `/api/days`
- `/api/words/1`
- `/api/stats`
- `/api/kana?type=hiragana`
- `/api/learning-plan`
- `/api/exercises?type=vocabulary`
- `/api/session?action=create`
- `/api/achievements`
- `/api/daily-quests`

All routes should work through the consolidated handler.

