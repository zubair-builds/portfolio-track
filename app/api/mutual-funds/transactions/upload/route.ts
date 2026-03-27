import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../../lib/jwt';
import { parseFile } from '../../../../../src/services/MutualFundParserService';
import { createMutualFundTransactionsBulk, syncHoldingsFromTransactions, createOrUpdateMutualFund } from '../../../../../lib/mutualFundModel';

/**
 * POST /api/mutual-funds/transactions/upload
 * Upload and parse PDF/Excel file with mutual fund transaction data
 */
export async function POST(req: NextRequest) {
  console.log('[MutualFundUpload API] Received upload request');
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
      'application/pdf', // .pdf
    ];

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv|pdf)$/i)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload Excel (.xlsx, .xls), CSV, or PDF file' },
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
    console.log(`[MutualFundUpload API] File processed: ${file.name}, Size: ${file.size} bytes`);

    // Parse file
    const parseResult = await parseFile(buffer, file.name);

    if (!parseResult.success || parseResult.data.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to parse file or no valid transactions found',
          errors: parseResult.errors,
          warnings: parseResult.warnings,
        },
        { status: 400 }
      );
    }

    console.log(`[MutualFundUpload API] Parsed ${parseResult.data.length} valid transactions`);

    // Create or update fund metadata for all unique funds
    const uniqueFunds = new Map<string, { fundCode: string; fundName?: string }>();
    for (const tx of parseResult.data) {
      if (!uniqueFunds.has(tx.fundCode)) {
        uniqueFunds.set(tx.fundCode, {
          fundCode: tx.fundCode,
          // Fund name would need to be extracted from file or provided separately
        });
      }
    }

    // Create fund metadata (if not exists)
    for (const fund of uniqueFunds.values()) {
      try {
        await createOrUpdateMutualFund({
          fundCode: fund.fundCode,
          fundName: fund.fundName || fund.fundCode, // Use code as name if not provided
        });
      } catch (error) {
        console.error(`Failed to create/update fund ${fund.fundCode}:`, error);
      }
    }

    // Insert transactions
    const result = await createMutualFundTransactionsBulk(user.email, parseResult.data);

    // Sync holdings after bulk insert
    await syncHoldingsFromTransactions(user.email);

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${result.insertedCount} transaction(s)`,
      insertedCount: result.insertedCount,
      warnings: parseResult.warnings,
      errors: parseResult.errors,
    });
  } catch (error) {
    console.error('[MutualFundUpload API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process file',
      },
      { status: 500 }
    );
  }
}


