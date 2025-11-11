# Scripts Directory

⚠️ **IMPORTANT**: Most data sync operations have been migrated to the Admin Dashboard at `/admin`.  
This directory now contains only one-time setup scripts and utilities.

---

## 🎛️ Admin Dashboard (Recommended)

For all ongoing data synchronization, use the **Admin Dashboard** at `/admin`:

### Available Sync Operations:
- ✅ **Companies Data** - Fetch company fundamentals (marketCap, shares, freeFloat, etc.)
- ✅ **Dividends Data** - Fetch dividend history
- ✅ **Fundamentals Data** - Fetch symbol fundamentals (sector, listedIn, PE ratio, dividendYield, etc.)
- ✅ **Sync Indices Symbols** - Populate indices symbols from symbol_prices

### Features:
- 🔴 Start/Stop/Retry controls
- 📊 Real-time progress via Server-Sent Events (SSE)
- ⏱️ Execution time tracking
- 📅 Last sync timestamps
- 🔄 Auto-resume after interruptions
- ❌ Failed items tracking and retry

---

## 📄 Remaining Scripts

### One-Time Setup Scripts

#### `sync-symbols.ts`
Initial sync of symbol metadata from `lib/symbols.ts` to MongoDB

**Run**: `npm run sync-symbols`  
**When**: First time setup or when adding new symbols

#### `seed-indices.ts`
Seeds indices collection with metadata from `indices.json`

**Run**: `npm run seed-indices`  
**When**: First time setup

---

### Utility Scripts

#### `cleanup-symbols.ts`
Cleanup and validate symbols data

**Run**: `npm run cleanup-symbols`

#### `download-atlas-db.ts`
Download MongoDB Atlas database for local backup

**Run**: `npm run download-atlas-db`

#### `fetch-index-prices.ts`
Fetch current prices for PSX indices

**Run**: `npm run fetch-index-prices`  
**Note**: Can be run periodically or integrated into admin dashboard later

---

## 📄 Data Files

### `symbols.json`
Master list of PSX symbols used by background sync operations  
**Source**: Used by admin dashboard sync operations  
**Format**: JSON array of symbol strings

### `indices.json`
Metadata for PSX indices (KSE100, KMI30, etc.)  
**Source**: Used by seed-indices script  
**Format**: Array of index metadata objects

### `skipped-symbols.json`
Reference file of symbols that were skipped during processing

### `symbols-before-cleanup.json`
Backup of symbols before cleanup operation

---

## 🔄 Migration Notes

The following scripts have been **removed** as they're now handled by the admin dashboard:

- ❌ `fetch-companies.ts` → Use Admin Dashboard "Companies Data" sync
- ❌ `fetch-dividends.ts` → Use Admin Dashboard "Dividends Data" sync  
- ❌ `fetch-fundamentals.ts` → Use Admin Dashboard "Fundamentals Data" sync
- ❌ `populate-index-composition.ts` → Use Admin Dashboard "Sync Indices Symbols"
- ❌ `test-sync.ts` → No longer needed
- ❌ `companies-progress.json` → Stored in MongoDB
- ❌ `dividends-progress.json` → Stored in MongoDB

---

## 📝 Recommendations

1. **For regular syncs**: Use the Admin Dashboard at `/admin`
2. **For initial setup**: Run `sync-symbols` and `seed-indices` once
3. **For utilities**: Keep cleanup-symbols and download-atlas-db for maintenance
4. **For index prices**: Use `fetch-index-prices` until integrated into admin dashboard
