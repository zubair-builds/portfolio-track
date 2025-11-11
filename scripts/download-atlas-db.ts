#!/usr/bin/env tsx
/**
 * Download MongoDB database from Atlas to local machine
 * With progress tracking, error logging, and verification
 * 
 * Usage:
 *   npm run download-atlas-db
 *   or
 *   npx tsx scripts/download-atlas-db.ts
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Configuration
// ============================================================================

const ATLAS_URI = 'mongodb+srv://<redacted-user>:<redacted-password>@<redacted-cluster>.mongodb.net/sample_mflix?retryWrites=true&w=majority';
const DB_NAME = 'sample_mflix';
const OUTPUT_DIR = path.join(__dirname, '..', 'backups', `${DB_NAME}-${Date.now()}`);
const LOG_FILE = path.join(__dirname, 'download-log.txt');
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

// ============================================================================
// Utilities
// ============================================================================

function log(message: string, toFile: boolean = true) {
  console.log(message);
  if (toFile) {
    fs.appendFileSync(LOG_FILE, `${new Date().toISOString()} - ${message}\n`);
  }
}

function logError(message: string, error?: any) {
  const errorMsg = error ? `${message}: ${error}` : message;
  console.error(`❌ ${errorMsg}`);
  fs.appendFileSync(LOG_FILE, `${new Date().toISOString()} - ERROR: ${errorMsg}\n`);
}

function ensureDirectory(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function getDirectorySize(dirPath: string): number {
  let size = 0;
  try {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      if (stats.isFile()) {
        size += stats.size;
      } else if (stats.isDirectory()) {
        size += getDirectorySize(filePath);
      }
    }
  } catch (error) {
    // Ignore errors
  }
  return size;
}

// ============================================================================
// Main Backup Function
// ============================================================================

async function downloadAtlasDatabase(retryCount: number = 0): Promise<void> {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('       MongoDB Atlas Database Downloader');
  console.log('═══════════════════════════════════════════════════════\n');

  // Clear previous log
  if (fs.existsSync(LOG_FILE)) {
    fs.unlinkSync(LOG_FILE);
  }

  log('Starting database download...', false);
  log(`Database: ${DB_NAME}`);
  log(`Output directory: ${OUTPUT_DIR}\n`);

  // Create output directory
  try {
    ensureDirectory(OUTPUT_DIR);
    log(`✓ Created output directory: ${OUTPUT_DIR}\n`);
  } catch (error) {
    logError('Failed to create output directory', error);
    process.exit(1);
  }

  // Build mongodump command with better network settings
  const args = [
    '--uri', ATLAS_URI,
    '--out', OUTPUT_DIR,
    '--verbose',
    '--numParallelCollections=1',  // Download one collection at a time (more stable)
  ];

  log('🚀 Starting mongodump...\n');
  log('────────────────────────────────────────\n', false);

  const startTime = Date.now();
  let lastProgressUpdate = Date.now();
  let collectionCount = 0;
  let documentCount = 0;

  return new Promise((resolve, reject) => {
    const mongodump = spawn('mongodump', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Handle stdout (progress and info)
    mongodump.stdout.on('data', (data) => {
      const output = data.toString();
      fs.appendFileSync(LOG_FILE, output);

      // Parse output for progress
      const lines = output.split('\n');
      lines.forEach((line: string) => {
        if (line.includes('writing')) {
          // Collection being written
          const match = line.match(/writing (\w+\.\w+)/);
          if (match) {
            collectionCount++;
            console.log(`📄 Writing: ${match[1]}`);
          }
        } else if (line.includes('document')) {
          // Document count
          const match = line.match(/(\d+) document/);
          if (match) {
            documentCount += parseInt(match[1]);
            
            // Update progress every 2 seconds
            const now = Date.now();
            if (now - lastProgressUpdate > 2000) {
              const elapsed = (now - startTime) / 1000;
              const currentSize = getDirectorySize(OUTPUT_DIR);
              console.log(`   Documents: ${documentCount.toLocaleString()} | Size: ${formatBytes(currentSize)} | Time: ${Math.round(elapsed)}s`);
              lastProgressUpdate = now;
            }
          }
        } else if (line.includes('done dumping')) {
          // Collection completed
          const match = line.match(/done dumping (\w+\.\w+) \((\d+) document/);
          if (match) {
            console.log(`   ✓ Completed: ${match[1]} (${match[2]} documents)`);
          }
        }
      });
    });

    // Handle stderr (errors and warnings)
    mongodump.stderr.on('data', (data) => {
      const output = data.toString();
      fs.appendFileSync(LOG_FILE, `STDERR: ${output}`);

      // Don't print all stderr (mongodump uses it for logs too)
      if (output.toLowerCase().includes('error') || output.toLowerCase().includes('failed')) {
        console.error(`⚠️  ${output.trim()}`);
      }
    });

    // Handle completion
    mongodump.on('close', async (code) => {
      const duration = (Date.now() - startTime) / 1000;
      const finalSize = getDirectorySize(OUTPUT_DIR);

      console.log('\n────────────────────────────────────────\n');

      if (code === 0) {
        log('═══════════════════════════════════════════════════════');
        log('✅ Download completed successfully!\n');
        log('Summary:');
        log(`  📦 Database:    ${DB_NAME}`);
        log(`  📁 Location:    ${OUTPUT_DIR}`);
        log(`  📊 Collections: ${collectionCount}`);
        log(`  📄 Documents:   ${documentCount.toLocaleString()}`);
        log(`  💾 Total size:  ${formatBytes(finalSize)}`);
        log(`  ⏱️  Duration:    ${Math.round(duration)}s\n`);
        log(`📝 Log saved to: ${path.basename(LOG_FILE)}`);
        log('═══════════════════════════════════════════════════════\n');

        // Verify download
        verifyDownload(OUTPUT_DIR);
        resolve();
      } else {
        // Download failed
        if (retryCount < MAX_RETRIES) {
          logError(`mongodump failed with code ${code}. Retrying (${retryCount + 1}/${MAX_RETRIES})...`);
          console.log(`⏳ Waiting ${RETRY_DELAY / 1000}s before retry...\n`);
          
          await new Promise(r => setTimeout(r, RETRY_DELAY));
          
          try {
            await downloadAtlasDatabase(retryCount + 1);
            resolve();
          } catch (error) {
            reject(error);
          }
        } else {
          logError(`\n❌ mongodump exited with code ${code} after ${MAX_RETRIES} retries`);
          logError(`Check ${path.basename(LOG_FILE)} for details\n`);
          reject(new Error(`mongodump failed with code ${code}`));
        }
      }
    });

    // Handle errors
    mongodump.on('error', (error) => {
      logError('Failed to start mongodump', error);
      logError('Make sure mongodump is installed: brew install mongodb-database-tools\n');
      reject(error);
    });
  });
}

// ============================================================================
// Verification
// ============================================================================

function verifyDownload(outputDir: string) {
  try {
    console.log('🔍 Verifying download...\n');

    const dbPath = path.join(outputDir, DB_NAME);
    
    if (!fs.existsSync(dbPath)) {
      console.log(`⚠️  Warning: Expected database directory not found: ${dbPath}`);
      return;
    }

    const files = fs.readdirSync(dbPath);
    const bsonFiles = files.filter(f => f.endsWith('.bson'));
    const metadataFiles = files.filter(f => f.endsWith('.metadata.json'));

    console.log('✓ Verification results:');
    console.log(`  Collections:     ${bsonFiles.length}`);
    console.log(`  Metadata files:  ${metadataFiles.length}`);
    
    if (bsonFiles.length > 0) {
      console.log('\n  Collections found:');
      bsonFiles.forEach((file) => {
        const filePath = path.join(dbPath, file);
        const stats = fs.statSync(filePath);
        const collectionName = file.replace('.bson', '');
        console.log(`    • ${collectionName.padEnd(30)} ${formatBytes(stats.size)}`);
      });
    }

    console.log('\n✅ Download verified successfully!\n');

    // Show restore command
    console.log('💡 To restore to local MongoDB:');
    console.log(`   mongorestore --uri="mongodb://localhost:27017" --db=${DB_NAME} "${dbPath}"`);
    console.log('\n');

  } catch (error) {
    console.log('⚠️  Verification warning:', error);
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  try {
    await downloadAtlasDatabase();
    process.exit(0);
  } catch (error) {
    console.error('\n═══════════════════════════════════════════════════════');
    console.error('❌ Download failed!\n');
    console.error('Error:', error instanceof Error ? error.message : String(error));
    console.error(`\nCheck ${path.basename(LOG_FILE)} for detailed logs`);
    console.error('═══════════════════════════════════════════════════════\n');
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Download interrupted by user.');
  console.log('Partial backup may be available in output directory.');
  console.log(`Check ${path.basename(LOG_FILE)} for details.\n`);
  process.exit(0);
});

main();

