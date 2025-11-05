# Scripts

This directory contains utility scripts for database management and maintenance.

## Symbol Sync Scripts

### sync-symbols.ts

CLI utility to sync symbols from `lib/symbols.ts` to MongoDB. This script:
- Updates existing symbols with metadata (name, sectorName, isETF, isDebt, isGEM)
- Creates new symbols with default price values (null)
- Provides a summary of operations performed

**Usage:**
```bash
npm run sync-symbols
```

Or directly with ts-node:
```bash
npx ts-node scripts/sync-symbols.ts
```

**When to use:**
- Initial database setup
- After adding new symbols to `lib/symbols.ts`
- To update metadata for existing symbols
- Manual database synchronization

### test-sync.ts

Test script to verify the symbol sync functionality works correctly.

**Usage:**
```bash
npm run test-sync
```

Or directly with ts-node:
```bash
npx ts-node scripts/test-sync.ts
```

**What it does:**
- Runs the sync function
- Verifies a sample of symbols (MEBL, EFERT, OGDC, PSO, HBL)
- Reports sync results and any errors

## API Endpoint

You can also trigger the sync via the API endpoint:

**POST** `/api/admin/sync-symbols`

Example using curl:
```bash
curl -X POST http://localhost:3000/api/admin/sync-symbols
```

Response:
```json
{
  "success": true,
  "message": "Successfully synced 1445 symbols",
  "data": {
    "total": 1445,
    "created": 1445,
    "updated": 0,
    "errors": 0
  }
}
```

## Prerequisites

Before running these scripts, ensure:
1. MongoDB is running and accessible
2. `MONGODB_URI` is set in your `.env` file
3. Dependencies are installed: `npm install`

## Notes

- The sync operation is idempotent - it's safe to run multiple times
- Existing price data is preserved when updating symbol metadata
- Failed operations don't affect successful ones (ordered: false)
- Check console output for detailed error messages if issues occur

