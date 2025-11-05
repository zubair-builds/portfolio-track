/**
 * Test script to verify symbol sync functionality
 * Run with: npx ts-node scripts/test-sync.ts
 */

import { syncSymbolsFromStaticData, getSymbolPriceData } from '../lib/symbolsStore';

async function testSync() {
  console.log('🔄 Starting symbol sync test...\n');

  try {
    // Run the sync
    console.log('Running syncSymbolsFromStaticData()...');
    const result = await syncSymbolsFromStaticData();

    console.log('\n✅ Sync completed successfully!');
    console.log('Results:');
    console.log(`  - Total symbols processed: ${result.total}`);
    console.log(`  - New symbols created: ${result.created}`);
    console.log(`  - Existing symbols updated: ${result.updated}`);
    console.log(`  - Errors: ${result.errors}`);

    // Test fetching a few sample symbols to verify they exist
    console.log('\n🔍 Verifying sample symbols...');
    const testSymbols = ['MEBL', 'EFERT', 'OGDC', 'PSO', 'HBL'];

    for (const symbol of testSymbols) {
      const data = await getSymbolPriceData(symbol);
      if (data) {
        console.log(`  ✓ ${symbol}: Found - ${data.name || 'N/A'} (${data.sectorName || 'N/A'})`);
      } else {
        console.log(`  ✗ ${symbol}: Not found`);
      }
    }

    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testSync();

