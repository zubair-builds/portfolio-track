/**
 * Dividends Upload API
 * Handle Excel file upload and bulk import
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/jwt';
import { parsePaymentReport, detectInternalDuplicates } from '@/src/services/DividendParserService';
import { createDividendsBulk, checkDuplicateDividend } from '@/lib/dividendModel';
import { createPaymentDividendsBulk, checkDuplicatePaymentDividend } from '@/lib/paymentDividendModel';

/**
 * POST /api/dividends/upload
 * Upload and parse Excel file with dividend data
 * Supports both Announcement and Payment Report formats
 */
export async function POST(req: NextRequest) {
  console.log('[Upload API] Received upload request');
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
    console.log(`[Upload API] File processed: ${file.name}, Size: ${file.size} bytes`);

    // Parse file (detect type automatically)
    console.log('[Upload API] Starting file parsing...');
    const parseResult = parsePaymentReport(buffer);
    console.log(`[Upload API] Parse result: success=${parseResult.success}, type=${parseResult.type}`);

    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        error: 'File validation failed',
        errors: parseResult.errors,
        warnings: [],
      }, { status: 400 });
    }

    // --- Handle Payment Report ---
    if (parseResult.type === 'payment_report' && parseResult.data) {
      console.log(`[Upload API] Processing Payment Report with ${parseResult.data.length} records`);
      const payments = parseResult.data;
      const duplicates: string[] = [];
      const warnings: string[] = [];

      // Check for existing duplicates
      for (const payment of payments) {
        const existing = await checkDuplicatePaymentDividend(
          payment.symbol,
          payment.paymentDate,
          payment.warrantNo
        );
        if (existing) {
          duplicates.push(`${payment.symbol} - Warrant ${payment.warrantNo} already exists`);
        }
      }

      // Filter out duplicates (always skip mode for payments for now)
      const newPayments = payments.filter(p => {
        const key = `${p.symbol} - Warrant ${p.warrantNo} already exists`;
        return !duplicates.includes(key);
      });

      if (duplicates.length > 0) {
        warnings.push(`${duplicates.length} duplicate payment(s) skipped`);
      }

      if (newPayments.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No new payment records to import',
          warnings,
          duplicates,
        }, { status: 400 });
      }

      // Bulk insert payments
      console.log(`[Upload API] Inserting ${newPayments.length} new payment records`);
      const result = await createPaymentDividendsBulk(user.email, newPayments);
      console.log(`[Upload API] Insert result: ${result.insertedCount} inserted`);

      return NextResponse.json({
        success: true,
        type: 'payment_report',
        data: {
          inserted: result.insertedCount,
          skipped: duplicates.length,
          total: payments.length,
        },
        warnings,
        message: `Successfully imported ${result.insertedCount} payment record(s)`,
      });
    }

    // --- Handle Announcement (Fallback) ---
    if (parseResult.type === 'announcement' && parseResult.announcementData) {
      console.log('[Upload API] Processing Dividend Announcement');
      const announcementResult = parseResult.announcementData;

      // Check for internal duplicates
      const internalDuplicates = detectInternalDuplicates(announcementResult.data);
      if (internalDuplicates.length > 0) {
        announcementResult.warnings.push(...internalDuplicates);
      }

      // Check for existing duplicates in database
      const duplicates: string[] = [];
      for (const dividend of announcementResult.data) {
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

      let finalData = announcementResult.data;

      if (duplicates.length > 0) {
        if (mode === 'skip') {
          // Filter out duplicates
          const duplicateKeys = new Set(
            duplicates.map(d => {
              const [symbolDate] = d.split(' already exists');
              return symbolDate;
            })
          );

          finalData = announcementResult.data.filter(dividend => {
            const key = `${dividend.symbol} - ${dividend.dates.announcement.toLocaleDateString()}`;
            return !duplicateKeys.has(key);
          });

          announcementResult.warnings.push(`${duplicates.length} duplicate(s) were skipped`);
        } else {
          // For overwrite mode, would need to implement update logic
          announcementResult.warnings.push(`${duplicates.length} duplicate(s) found - will be overwritten`);
        }
      }

      if (finalData.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No new records to import',
          warnings: announcementResult.warnings,
          duplicates,
        }, { status: 400 });
      }

      // Bulk insert
      console.log(`[Upload API] Inserting ${finalData.length} new dividend records`);
      const result = await createDividendsBulk(user.email, finalData);
      console.log(`[Upload API] Insert result: ${result.insertedCount} inserted`);

      return NextResponse.json({
        success: true,
        type: 'announcement',
        data: {
          inserted: result.insertedCount,
          skipped: announcementResult.data.length - finalData.length,
          total: announcementResult.data.length,
        },
        warnings: announcementResult.warnings,
        duplicates,
        message: `Successfully imported ${result.insertedCount} dividend record(s)`,
      });
    }

    return NextResponse.json({ error: 'Unknown file format' }, { status: 400 });

  } catch (error: unknown) {
    console.error('Error uploading dividends:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}
