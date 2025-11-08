# Scripts Directory

This directory contains utility scripts for portfolio data management.

## 📄 Files

### Input Files (You Provide)

#### `symbols.json`
**Purpose**: List of symbols to fetch fundamental data for (acts as a "to-do list")

**Format**: JSON array of symbol strings
```json
["786", "AABS", "AASM", "HUBC", "PSO", "OGDC", ...]
```

**⚠️ AUTO-UPDATE**: Script automatically removes processed symbols after each batch!

**Before first run:**
```bash
# IMPORTANT: Backup your original file!
cp symbols.json symbols-original.json
```

**How It Works**:
- Script reads symbols from beginning of array
- Processes requested count (e.g., 50 symbols)
- Removes those 50 from symbols.json
- Next run starts with remaining symbols
- When array is empty → all symbols processed!

**Manual Updates**:
- Add new symbols to the array (append to end)
- Remove symbols you don't want (delete from array)
- Script always processes from index 0

---

### Scripts

#### `sync-symbols.ts`
Syncs symbol metadata from `lib/symbols.ts` to MongoDB

**Run**: `npm run sync-symbols`

#### `fetch-fundamentals.ts`
Fetches fundamental data from PSX Terminal API

**Run**: `npm run fetch-fundamentals`

**Prerequisites**: Requires `symbols.json` file in this directory

---

### Progress Files (Auto-Created)

#### `fundamentals-progress.json`
Tracks script progress for resuming

**Auto-created**: When fetch-fundamentals runs
**Auto-deleted**: When all symbols are completed
**Contains**: 
- Last processed index
- Success/failed/skipped counts
- Arrays of processed/failed/skipped symbols
- Timestamp

#### `failed-symbols.json`
List of symbols that failed due to errors

**Auto-created**: If any symbols fail to fetch
**Contains**: Array of symbol strings that encountered errors

#### `skipped-symbols.json`
List of symbols that were skipped (no data)

**Auto-created**: If any symbols return no data
**Contains**: Array of symbol strings that had no fundamental data

---

## 🔄 Typical Workflow

1. **Backup original symbols.json** ⚠️ IMPORTANT
   ```bash
   cp symbols.json symbols-original.json
   ```

2. **Run fetch-fundamentals**
   ```bash
   npm run fetch-fundamentals
   # Enter batch size: 50
   # Script processes first 50 symbols
   # Removes them from symbols.json automatically
   ```

3. **Check remaining symbols**
   ```bash
   cat symbols.json  # Now has 909 symbols (50 removed)
   ```

4. **Continue processing**
   ```bash
   npm run fetch-fundamentals
   # Enter batch size: 50
   # Processes next 50 from the list
   ```

5. **Review results**
   ```bash
   # Check progress
   cat fundamentals-progress.json
   
   # Check failed symbols (to retry)
   cat failed-symbols.json
   
   # Check skipped symbols (expected)
   cat skipped-symbols.json
   ```

6. **Repeat until done**
   ```bash
   # Keep running until symbols.json is empty
   npm run fetch-fundamentals
   ```

---

## 🧹 Cleanup

To start fresh:
```bash
cd scripts

# Delete progress files
rm fundamentals-progress.json failed-symbols.json skipped-symbols.json

# Restore original symbols list
cp symbols-original.json symbols.json
```

---

## 📝 Important Notes

- **`symbols.json` is automatically updated** - Script removes processed symbols!
- **Always backup first**: `cp symbols.json symbols-original.json`
- Progress files are managed automatically by scripts
- All JSON files can be gitignored (not committed to repo)
- `symbols.json` becomes empty when all symbols are processed
