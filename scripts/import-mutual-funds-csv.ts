#!/usr/bin/env ts-node
/**
 * CLI script to import mutual funds from CSV file into MongoDB
 * 
 * Usage:
 *   npm run import-mutual-funds
 *   or
 *   tsx scripts/import-mutual-funds-csv.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { createOrUpdateMutualFund } from '../lib/mutualFundModel';

interface CSVRow {
  Sector: string;
  Category: string;
  'Fund Name': string;
  Rating: string;
  Benchmark: string;
  'Validity Date': string;
  NAV: string;
  YTD: string;
  MTD: string;
  '1 Day': string;
  '15 Days': string;
  '30 Days': string;
  '90 Days': string;
  '180 Days': string;
  '270 Days': string;
  '365 Days': string;
  '2 Years': string;
  '3 Years': string;
  amc_clean: string;
  [key: string]: string;
}

/**
 * Generate fundCode from fund name
 * Example: "ABL Cash Fund" -> "ABL-CASH-FUND"
 */
function generateFundCode(fundName: string): string {
  return fundName
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '') // Remove special characters
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Parse percentage value from CSV
 * Handles empty strings, "Nil", and numeric values
 */
function parsePercentage(value: string): number | undefined {
  if (!value || value.trim() === '' || value.trim().toLowerCase() === 'nil') {
    return undefined;
  }

  const num = parseFloat(value.trim());
  if (isNaN(num)) {
    return undefined;
  }

  return num;
}

/**
 * Format duration in milliseconds to human-readable string
 * Examples: "1.5s", "2m 30s", "1h 15m 30s"
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;
    if (remainingMinutes > 0 && remainingSeconds > 0) {
      return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
    } else if (remainingMinutes > 0) {
      return `${hours}h ${remainingMinutes}m`;
    } else {
      return `${hours}h ${remainingSeconds}s`;
    }
  } else if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    if (remainingSeconds > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${minutes}m`;
    }
  } else {
    return `${seconds}s`;
  }
}

/**
 * Calculate estimated time remaining
 * Returns estimated milliseconds remaining
 */
function calculateETA(elapsed: number, processed: number, total: number): number {
  if (processed === 0 || total === 0) {
    return 0;
  }

  const rate = processed / elapsed; // items per millisecond
  const remaining = total - processed;
  return remaining / rate;
}

/**
 * Parse date string from CSV format
 * Example: "Jan 16, 2026" -> Date object
 */
function parseDate(dateStr: string): Date | undefined {
  if (!dateStr || dateStr.trim() === '') {
    return undefined;
  }

  try {
    // Handle format like "Jan 16, 2026"
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return undefined;
    }
    return date;
  } catch {
    return undefined;
  }
}

/**
 * Parse CSV file and return rows
 */
function parseCSV(filePath: string): CSVRow[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  if (lines.length < 2) {
    throw new Error('CSV file must have at least 2 rows (header + data)');
  }

  // Skip first row (title row), use second row as headers
  const headerLine = lines[1];
  const headers = headerLine.split(',').map(h => h.trim());

  const rows: CSVRow[] = [];

  // Process data rows (starting from line 2, index 2)
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    const values = parseCSVLine(line);
    
    if (values.length === 0) continue;

    const row: CSVRow = {} as CSVRow;
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    // Only add rows that have a fund name
    if (row['Fund Name'] && row['Fund Name'].trim()) {
      rows.push(row);
    }
  }

  return rows;
}

/**
 * Parse a CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  return values;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('     Mutual Funds CSV Import Utility');
  console.log('═══════════════════════════════════════════════════════\n');

  const csvPath = path.join(process.cwd(), 'Performance_Summary_MUTUAL_FUNDS_ASSOCIATION_OF_PAKISTAN_CLEAN_AMC.csv');

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  try {
    console.log(`📄 Reading CSV file: ${csvPath}\n`);
    const rows = parseCSV(csvPath);
    console.log(`📊 Found ${rows.length} fund records\n`);

    console.log('🔄 Starting import...\n');

    const startTime = Date.now();
    let created = 0;
    let updated = 0;
    let errors = 0;
    const errorDetails: string[] = [];
    const fundCodes = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const fundName = row['Fund Name'].trim();

      if (!fundName) {
        continue;
      }

      try {
        // Generate fundCode
        let fundCode = generateFundCode(fundName);
        
        // Ensure uniqueness
        let uniqueFundCode = fundCode;
        let suffix = 1;
        while (fundCodes.has(uniqueFundCode)) {
          uniqueFundCode = `${fundCode}-${suffix}`;
          suffix++;
        }
        fundCodes.add(uniqueFundCode);
        fundCode = uniqueFundCode;

        // Extract data
        const category = row.Category?.trim() || undefined;
        const sector = row.Sector?.trim() || undefined;
        const rating = row.Rating?.trim() || undefined;
        const benchmark = row.Benchmark?.trim() || undefined;
        const amc = row.amc_clean?.trim() || undefined;
        const navStr = row.NAV?.trim();
        const nav = navStr && !isNaN(parseFloat(navStr)) ? parseFloat(navStr) : undefined;
        const validityDate = parseDate(row['Validity Date']?.trim() || '');

        // Parse performance metrics
        const ytdReturn = parsePercentage(row.YTD);
        const mtdReturn = parsePercentage(row.MTD);
        const return1Day = parsePercentage(row['1 Day']);
        const return15Days = parsePercentage(row['15 Days']);
        const return30Days = parsePercentage(row['30 Days']);
        const return90Days = parsePercentage(row['90 Days']);
        const return180Days = parsePercentage(row['180 Days']);
        const return270Days = parsePercentage(row['270 Days']);
        const return365Days = parsePercentage(row['365 Days']);
        const return2Years = parsePercentage(row['2 Years']);
        const return3Years = parsePercentage(row['3 Years']);

        // Check if fund already exists
        const existing = await import('../lib/mutualFundModel').then(m => m.getMutualFund(fundCode));
        const isNew = !existing;

        // Create or update fund with all data including performance metrics
        await createOrUpdateMutualFund({
          fundCode,
          fundName,
          amc,
          category,
          sector,
          rating,
          benchmark,
          ytdReturn,
          mtdReturn,
          return1Day,
          return15Days,
          return30Days,
          return90Days,
          return180Days,
          return270Days,
          return365Days,
          return2Years,
          return3Years,
        });

        // Update NAV if available
        if (nav !== undefined) {
          await import('../lib/mutualFundModel').then(m => 
            m.updateMutualFundNAV(fundCode, nav)
          );
        }

        if (isNew) {
          created++;
        } else {
          updated++;
        }

        // Progress indicator with timing
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const processed = i + 1;
        const percentage = ((processed / rows.length) * 100).toFixed(1);
        const rate = processed / elapsed; // funds per millisecond
        const eta = calculateETA(elapsed, processed, rows.length);
        const elapsedFormatted = formatDuration(elapsed);
        const etaFormatted = formatDuration(eta);

        // Update progress every 10 funds or at milestones
        if (processed % 10 === 0 || processed === rows.length) {
          process.stdout.write(
            `\r  ⏳ Progress: ${processed}/${rows.length} (${percentage}%) | ` +
            `Elapsed: ${elapsedFormatted} | ` +
            `ETA: ${etaFormatted} | ` +
            `Rate: ${(rate * 1000).toFixed(1)} funds/s`
          );
        }
      } catch (error) {
        errors++;
        const errorMsg = `Row ${i + 3}: ${fundName} - ${error instanceof Error ? error.message : String(error)}`;
        errorDetails.push(errorMsg);
        console.error(`  ❌ ${errorMsg}`);
      }
    }

    const duration = Date.now() - startTime;
    const durationFormatted = formatDuration(duration);

    // Clear progress line
    process.stdout.write('\r' + ' '.repeat(100) + '\r');

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ Import completed!\n');
    console.log('Summary:');
    console.log(`  📊 Total funds processed: ${rows.length}`);
    console.log(`  ✨ New funds created:     ${created}`);
    console.log(`  🔄 Existing funds updated: ${updated}`);
    console.log(`  ❌ Errors encountered:   ${errors}`);
    console.log(`  ⏱️  Total time:            ${durationFormatted} (${duration}ms)`);
    console.log(`  📈 Average rate:          ${((rows.length / duration) * 1000).toFixed(2)} funds/s\n`);

    if (errors > 0) {
      console.log('⚠️  Error details:');
      errorDetails.forEach(msg => console.log(`     ${msg}`));
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('═══════════════════════════════════════════════════════');
    console.error('❌ Import failed!\n');
    console.error('Error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('\nStack:', error.stack);
    }
    console.error('═══════════════════════════════════════════════════════\n');

    process.exit(1);
  }
}

main();
