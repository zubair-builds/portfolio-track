# MongoDB Atlas Database Download Guide

## 🎯 Purpose
Download the `sample_mflix` database from MongoDB Atlas to your local machine with progress tracking and error logging.

---

## 🚀 Quick Start

### Run the Script
```bash
npm run download-atlas-db
```

---

## 📋 Prerequisites

### Install MongoDB Database Tools

The script requires `mongodump` to be installed:

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-database-tools
```

**Linux (Ubuntu/Debian):**
```bash
wget https://fastdl.mongodb.org/tools/db/mongodb-database-tools-ubuntu2204-x86_64-100.9.4.deb
sudo dpkg -i mongodb-database-tools-*.deb
```

**Windows:**
Download from: https://www.mongodb.com/try/download/database-tools

**Verify Installation:**
```bash
mongodump --version
# Should output: mongodump version: 100.x.x
```

---

## 📊 What It Does

1. **Creates backup directory**: `backups/sample_mflix-{timestamp}/`
2. **Connects to Atlas**: Uses the provided connection string
3. **Downloads all collections**: With progress tracking
4. **Shows live progress**: Documents count, size, time
5. **Logs everything**: Saves to `scripts/download-log.txt`
6. **Verifies download**: Lists all collections and sizes
7. **Provides restore command**: Ready to import to local

---

## 🎬 Example Session

```
═══════════════════════════════════════════════════════
       MongoDB Atlas Database Downloader
═══════════════════════════════════════════════════════

Starting database download...
Database: sample_mflix
Output directory: /Users/zubair/Projects/portfolioTrack/backups/sample_mflix-1762543000000

✓ Created output directory

🚀 Starting mongodump...

────────────────────────────────────────

📄 Writing: sample_mflix.movies
   Documents: 5,000 | Size: 12.5 MB | Time: 3s
   ✓ Completed: sample_mflix.movies (23,539 documents)

📄 Writing: sample_mflix.comments
   Documents: 10,000 | Size: 8.3 MB | Time: 5s
   ✓ Completed: sample_mflix.comments (50,304 documents)

📄 Writing: sample_mflix.users
   ✓ Completed: sample_mflix.users (185 documents)

📄 Writing: sample_mflix.theaters
   ✓ Completed: sample_mflix.theaters (1,564 documents)

📄 Writing: sample_mflix.sessions
   ✓ Completed: sample_mflix.sessions (1 documents)

────────────────────────────────────────

═══════════════════════════════════════════════════════
✅ Download completed successfully!

Summary:
  📦 Database:    sample_mflix
  📁 Location:    backups/sample_mflix-1762543000000
  📊 Collections: 5
  📄 Documents:   75,593
  💾 Total size:  31.8 MB
  ⏱️  Duration:    15s

📝 Log saved to: download-log.txt
═══════════════════════════════════════════════════════

🔍 Verifying download...

✓ Verification results:
  Collections:     5
  Metadata files:  5

  Collections found:
    • movies                       18.5 MB
    • comments                     10.2 MB
    • users                        45.3 KB
    • theaters                     890 KB
    • sessions                     2.1 KB

✅ Download verified successfully!

💡 To restore to local MongoDB:
   mongorestore --uri="mongodb://localhost:27017" --db=sample_mflix "backups/sample_mflix-1762543000000/sample_mflix"
```

---

## 📁 Output Structure

```
backups/
└── sample_mflix-1762543000000/
    └── sample_mflix/
        ├── movies.bson
        ├── movies.metadata.json
        ├── comments.bson
        ├── comments.metadata.json
        ├── users.bson
        ├── users.metadata.json
        ├── theaters.bson
        ├── theaters.metadata.json
        ├── sessions.bson
        └── sessions.metadata.json

scripts/
└── download-log.txt  (detailed logs)
```

---

## 📝 Log File

All output is saved to `scripts/download-log.txt`:

```
2025-11-07T10:30:00.000Z - Starting database download...
2025-11-07T10:30:00.123Z - Database: sample_mflix
2025-11-07T10:30:00.234Z - ✓ Created output directory
2025-11-07T10:30:01.000Z - 🚀 Starting mongodump...
2025-11-07T10:30:05.567Z - writing sample_mflix.movies
...
2025-11-07T10:30:15.234Z - ✅ Download completed successfully!
```

**Location**: `scripts/download-log.txt`

---

## 🔄 Restoring to Local MongoDB

After download, restore to your local MongoDB:

```bash
# Make sure local MongoDB is running
brew services start mongodb-community

# Restore the database
mongorestore \
  --uri="mongodb://localhost:27017" \
  --db=sample_mflix \
  backups/sample_mflix-1762543000000/sample_mflix

# Verify
mongosh mongodb://localhost:27017/sample_mflix --eval "db.stats()"
```

---

## ⚙️ Configuration

You can modify the script to download different databases:

**File**: `scripts/download-atlas-db.ts`

```typescript
// Change these constants:
const ATLAS_URI = 'your-atlas-connection-string';
const DB_NAME = 'your-database-name';
```

---

## 🐛 Troubleshooting

### Issue: "mongodump: command not found"
**Solution**: Install MongoDB Database Tools
```bash
brew install mongodb-database-tools
```

### Issue: "Authentication failed"
**Solution**: 
- Check username/password in connection string
- Verify user has read permissions on Atlas
- Check IP whitelist in Atlas (allow your IP)

### Issue: "Connection timeout"
**Solution**:
- Check internet connection
- Verify Atlas cluster is running
- Check firewall settings

### Issue: "Partial download"
**Solution**:
- Check `download-log.txt` for errors
- Re-run the script (mongodump will continue/overwrite)
- Verify disk space available

### Issue: "Permission denied"
**Solution**:
```bash
# Make sure output directory is writable
chmod +x scripts/download-atlas-db.ts
mkdir -p backups
```

---

## 🎯 Features

✅ **Progress Tracking**
- Live document count
- Real-time size monitoring
- Elapsed time display
- Per-collection progress

✅ **Error Handling**
- Comprehensive error logging
- Graceful interruption (Ctrl+C)
- Verification after download
- Detailed error messages

✅ **Logging**
- All output saved to `download-log.txt`
- Timestamps for debugging
- Both stdout and stderr captured

✅ **Verification**
- Checks all collections downloaded
- Verifies file sizes
- Lists all collections
- Provides restore command

✅ **Organization**
- Timestamped backup folders
- Clean directory structure
- Easy to manage multiple backups

---

## 💾 Backup Management

### Multiple Backups
Each run creates a new timestamped folder:
```
backups/
├── sample_mflix-1762540000000/  (Nov 7, 10:00 AM)
├── sample_mflix-1762543600000/  (Nov 7, 11:00 AM)
└── sample_mflix-1762547200000/  (Nov 7, 12:00 PM)
```

### Cleanup Old Backups
```bash
# Delete backups older than 7 days
find backups -name "sample_mflix-*" -mtime +7 -exec rm -rf {} \;

# Or manually delete specific backups
rm -rf backups/sample_mflix-1762540000000
```

### Compare Backup Sizes
```bash
# List all backups with sizes
du -sh backups/sample_mflix-*
```

---

## 📊 Expected Download Size

For `sample_mflix`:
- **Collections**: 5 (movies, comments, users, theaters, sessions)
- **Documents**: ~75,000
- **Size**: ~30-40 MB
- **Duration**: 10-20 seconds (depending on connection)

---

## 🔐 Security Note

⚠️ **The connection string contains credentials!**

**In the script, I've hardcoded your credentials for easy use.**

**For production:**
1. Store in environment variable:
   ```bash
   export ATLAS_URI="mongodb+srv://..."
   ```

2. Update script to use:
   ```typescript
   const ATLAS_URI = process.env.ATLAS_URI || 'fallback';
   ```

3. Add to `.env`:
   ```bash
   ATLAS_URI=mongodb+srv://user:pass@cluster.net/dbname
   ```

---

## ⚡ Quick Commands

```bash
# Download database
npm run download-atlas-db

# Check log
cat scripts/download-log.txt

# List backups
ls -lh backups/

# Restore to local
mongorestore --uri="mongodb://localhost:27017" --db=sample_mflix backups/sample_mflix-*/sample_mflix
```

---

## 🎉 Ready to Download!

Simply run:
```bash
npm run download-atlas-db
```

The script will:
- ✅ Download all collections with progress
- ✅ Log everything to `download-log.txt`
- ✅ Verify the download
- ✅ Show restore command
- ✅ Handle errors gracefully

**Estimated time**: 10-20 seconds for sample_mflix (~30 MB)

---

**Happy downloading!** 🚀

