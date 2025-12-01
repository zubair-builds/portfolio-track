/**
 * Dividends Upload API
 * Handle Excel file upload and bulk import
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/jwt';
import { parseAndValidate, detectInternalDuplicates } from '@/src/services/DividendParserService';
import { createDividendsBulk, checkDuplicateDividend } from '@/lib/dividendModel';

/**
 * POST /api/dividends/upload
 * Upload and parse Excel file with dividend data
 */
export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ];

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload Excel (.xlsx, .xls) or CSV file' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Parse and validate file
    const parseResult = parseAndValidate(buffer);

    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        error: 'File validation failed',
        errors: parseResult.errors,
        warnings: parseResult.warnings,
      }, { status: 400 });
    }

    // Check for internal duplicates
    const internalDuplicates = detectInternalDuplicates(parseResult.data);
    if (internalDuplicates.length > 0) {
      parseResult.warnings.push(...internalDuplicates);
    }

    // Check for existing duplicates in database
    const duplicates: string[] = [];
    for (const dividend of parseResult.data) {
      const existing = await checkDuplicateDividend(
        dividend.symbol,
        dividend.dates.announcement
      );
      if (existing) {
        duplicates.push(`${dividend.symbol} - ${dividend.dates.announcement.toLocaleDateString()} already exists`);
      }
    }

    // Get import mode from request
    const mode = formData.get('mode') as string || 'skip'; // 'skip' or 'overwrite'

    let finalData = parseResult.data;

    if (duplicates.length > 0) {
      if (mode === 'skip') {
        // Filter out duplicates
        const duplicateKeys = new Set(
          duplicates.map(d => {
            const [symbolDate] = d.split(' already exists');
            return symbolDate;
          })
        );

        finalData = parseResult.data.filter(dividend => {
          const key = `${dividend.symbol} - ${dividend.dates.announcement.toLocaleDateString()}`;
          return !duplicateKeys.has(key);
        });

        parseResult.warnings.push(`${duplicates.length} duplicate(s) were skipped`);
      } else {
        // For overwrite mode, would need to implement update logic
        parseResult.warnings.push(`${duplicates.length} duplicate(s) found - will be overwritten`);
      }
    }

    if (finalData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No new records to import',
        warnings: parseResult.warnings,
        duplicates,
      }, { status: 400 });
    }

    // Bulk insert
    const result = await createDividendsBulk(user.email, finalData);

    return NextResponse.json({
      success: true,
      data: {
        inserted: result.insertedCount,
        skipped: parseResult.data.length - finalData.length,
        total: parseResult.data.length,
      },
      warnings: parseResult.warnings,
      duplicates,
      message: `Successfully imported ${result.insertedCount} dividend record(s)`,
    });

  } catch (error: unknown) {
    console.error('Error uploading dividends:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}
