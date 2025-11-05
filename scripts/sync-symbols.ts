#!/usr/bin/env ts-node
/**
 * CLI script to sync symbols from lib/symbols.ts to MongoDB
 * This is useful for initial database setup or manual syncing
 * 
 * Usage:
 *   npm run sync-symbols
 *   or
 *   npx ts-node scripts/sync-symbols.ts
 */

import { syncSymbolsFromStaticData } from '../lib/symbolsStore';

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('        Symbol Database Sync Utility');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('📋 This script will sync symbols from lib/symbols.ts to MongoDB');
  console.log('   - Updates existing symbols with metadata');
  console.log('   - Creates new symbols with default price values (null)\n');

  try {
    console.log('🔄 Starting sync...\n');
    
    const startTime = Date.now();
    const result = await syncSymbolsFromStaticData();
    const duration = Date.now() - startTime;

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Sync completed successfully!\n');
    console.log('Summary:');
    console.log(`  📊 Total symbols processed: ${result.total}`);
    console.log(`  ✨ New symbols created:     ${result.created}`);
    console.log(`  🔄 Existing symbols updated: ${result.updated}`);
    console.log(`  ❌ Errors encountered:      ${result.errors}`);
    console.log(`  ⏱️  Duration:               ${duration}ms\n`);
    
    if (result.errors > 0) {
      console.log('⚠️  Some errors occurred during sync. Check logs for details.');
    }
    
    console.log('═══════════════════════════════════════════════════════\n');
    
    process.exit(0);
  } catch (error) {
    console.error('═══════════════════════════════════════════════════════');
    console.error('❌ Sync failed!\n');
    console.error('Error:', error instanceof Error ? error.message : String(error));
    console.error('═══════════════════════════════════════════════════════\n');
    
    process.exit(1);
  }
}

main();

