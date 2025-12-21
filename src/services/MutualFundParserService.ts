/**
 * Mutual Fund Parser Service
 * Parse PDF and Excel files for mutual fund transactions
 */

import * as XLSX from 'xlsx';
import { MutualFundTransactionInput } from '../../lib/mutualFundModel';

export interface ParsedMutualFundTransactionRow {
  fundCode?: string;
  fundName?: string;
  transactionType?: 'BUY' | 'SELL' | 'REDEMPTION' | 'DIVIDEND_REINVEST';
  transactionDate?: string | Date;
  units?: number | string;
  nav?: number | string;
  amount?: number | string;
  notes?: string;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ParseResult {
  success: boolean;
  data: MutualFundTransactionInput[];
  errors: ValidationError[];
  warnings: string[];
}

/**
 * Parse Excel file buffer
 */
export function parseExcelFile(buffer: Buffer): ParsedMutualFundTransactionRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  console.log(`[MutualFundParser] Reading sheet: ${sheetName}`);
  const worksheet = workbook.Sheets[sheetName];

  const rawData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });
  console.log(`[MutualFundParser] Found ${rawData.length} rows in file`);

  return rawData.map(row => normalizeColumnNames(row));
}

/**
 * Normalize column names from Excel (handle various naming conventions)
 */
function normalizeColumnNames(row: Record<string, unknown>): ParsedMutualFundTransactionRow {
  const normalized: ParsedMutualFundTransactionRow = {};

  const columnMap: Record<string, keyof ParsedMutualFundTransactionRow> = {
    'fund code': 'fundCode',
    'fundcode': 'fundCode',
    'code': 'fundCode',
    'fund name': 'fundName',
    'fundname': 'fundName',
    'name': 'fundName',
    'transaction type': 'transactionType',
    'type': 'transactionType',
    'transaction': 'transactionType',
    'date': 'transactionDate',
    'transaction date': 'transactionDate',
    'purchase date': 'transactionDate',
    'sale date': 'transactionDate',
    'units': 'units',
    'unit': 'units',
    'quantity': 'units',
    'nav': 'nav',
    'price': 'nav',
    'price per unit': 'nav',
    'amount': 'amount',
    'total': 'amount',
    'total amount': 'amount',
    'investment': 'amount',
    'notes': 'notes',
    'note': 'notes',
    'remarks': 'notes',
    'comments': 'notes',
  };

  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = key.toLowerCase().trim();
    const mappedKey = columnMap[normalizedKey];

    if (mappedKey && value !== '') {
      (normalized as Record<string, unknown>)[mappedKey] = value;
    }
  }

  return normalized;
}

/**
 * Parse date string to Date object
 */
function parseDate(dateValue: string | Date | undefined): Date | undefined {
  if (!dateValue) return undefined;

  if (dateValue instanceof Date) {
    return dateValue;
  }

  if (typeof dateValue === 'string') {
    // Handle DD/MM/YYYY or D/M/YY format
    const dmyMatch = dateValue.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      let year = parseInt(dmyMatch[3], 10);

      if (year < 100) {
        year += 2000;
      }

      const date = new Date(year, month, day);
      return isNaN(date.getTime()) ? undefined : date;
    }
  }

  const date = new Date(dateValue);
  return isNaN(date.getTime()) ? undefined : date;
}

/**
 * Parse number from string
 */
function parseNumber(value: number | string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;

  if (typeof value === 'number') return value;

  let cleaned = value.toString();

  // Remove currency symbols
  cleaned = cleaned.replace(/Rs\.?/gi, '').replace(/₨/g, '').replace(/\$/g, '');

  // Remove commas and whitespace
  cleaned = cleaned.replace(/[,%\s]/g, '');

  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}

/**
 * Normalize transaction type
 */
function normalizeTransactionType(type: string | undefined): 'BUY' | 'SELL' | 'REDEMPTION' | 'DIVIDEND_REINVEST' | null {
  if (!type) return null;

  const normalized = type.trim().toUpperCase();

  if (normalized.includes('BUY') || normalized.includes('PURCHASE') || normalized.includes('INVEST')) {
    return 'BUY';
  }
  if (normalized.includes('SELL') || normalized.includes('SALE')) {
    return 'SELL';
  }
  if (normalized.includes('REDEEM') || normalized.includes('REDEMPTION')) {
    return 'REDEMPTION';
  }
  if (normalized.includes('DIVIDEND') || normalized.includes('REINVEST')) {
    return 'DIVIDEND_REINVEST';
  }

  return null;
}

/**
 * Validate and transform a single transaction row
 */
export function validateTransactionRow(
  row: ParsedMutualFundTransactionRow,
  rowIndex: number
): {
  valid: boolean;
  transaction?: MutualFundTransactionInput;
  errors: ValidationError[];
} {
  const errors: ValidationError[] = [];

  // Required fields
  if (!row.fundCode) {
    errors.push({ row: rowIndex, field: 'fundCode', message: 'Fund code is required' });
  }

  if (!row.transactionDate) {
    errors.push({ row: rowIndex, field: 'transactionDate', message: 'Transaction date is required' });
  }

  const transactionType = normalizeTransactionType(row.transactionType);
  if (!transactionType) {
    errors.push({ row: rowIndex, field: 'transactionType', message: 'Valid transaction type is required (BUY, SELL, REDEMPTION, DIVIDEND_REINVEST)' });
  }

  if (row.units === undefined || row.units === '') {
    errors.push({ row: rowIndex, field: 'units', message: 'Units is required' });
  }

  if (row.nav === undefined || row.nav === '') {
    errors.push({ row: rowIndex, field: 'nav', message: 'NAV is required' });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Parse values
  const transactionDate = parseDate(row.transactionDate);
  if (!transactionDate) {
    errors.push({ row: rowIndex, field: 'transactionDate', message: 'Invalid date format' });
  }

  const units = parseNumber(row.units);
  if (units === undefined || units <= 0) {
    errors.push({ row: rowIndex, field: 'units', message: 'Units must be a positive number' });
  }

  const nav = parseNumber(row.nav);
  if (nav === undefined || nav <= 0) {
    errors.push({ row: rowIndex, field: 'nav', message: 'NAV must be a positive number' });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const transaction: MutualFundTransactionInput = {
    fundCode: row.fundCode!.toUpperCase().trim(),
    transactionType: transactionType!,
    units: units!,
    nav: nav!,
    transactionDate: transactionDate!,
    notes: row.notes?.toString().trim(),
  };

  return { valid: true, transaction, errors: [] };
}

/**
 * Parse and validate entire file
 */
export function parseAndValidate(buffer: Buffer): ParseResult {
  const parsedRows = parseExcelFile(buffer);
  const warnings: string[] = [];
  const allErrors: ValidationError[] = [];
  const validTransactions: MutualFundTransactionInput[] = [];

  if (parsedRows.length === 0) {
    return {
      success: false,
      data: [],
      errors: [{ row: 0, field: 'file', message: 'No data found in file' }],
      warnings: [],
    };
  }

  parsedRows.forEach((row, index) => {
    const { valid, transaction, errors } = validateTransactionRow(row, index + 2); // +2 for header row and 1-indexed

    if (valid && transaction) {
      validTransactions.push(transaction);
    } else {
      allErrors.push(...errors);
    }
  });

  if (validTransactions.length === 0) {
    return {
      success: false,
      data: [],
      errors: allErrors,
      warnings,
    };
  }

  if (allErrors.length > 0) {
    warnings.push(`${allErrors.length} row(s) had validation errors and were skipped`);
  }

  return {
    success: true,
    data: validTransactions,
    errors: allErrors,
    warnings,
  };
}

/**
 * Parse PDF file (placeholder - requires pdf-parse or pdfjs-dist)
 * This is a basic implementation that can be extended
 */
export async function parsePDFFile(buffer: Buffer): Promise<ParseResult> {
  try {
    // Dynamic import to avoid issues if pdf-parse is not installed
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const pdfParse = await import('pdf-parse').catch(() => null);

    if (!pdfParse || !pdfParse.default) {
      return {
        success: false,
        data: [],
        errors: [
          { row: 0, field: 'file', message: 'PDF parsing library not available. Please upload Excel/CSV file or install pdf-parse.' },
        ],
        warnings: [],
      };
    }

    const data = await pdfParse.default(buffer);
    const text = data.text;

    // Basic text extraction - can be extended to parse specific PDF formats
    // For now, return error suggesting Excel upload as PDF formats vary
    return {
      success: false,
      data: [],
      errors: [
        { row: 0, field: 'file', message: 'PDF parsing for mutual fund statements is not yet fully implemented. Please upload Excel/CSV file with transaction data.' },
      ],
      warnings: [`Extracted ${text.length} characters from PDF. PDF parsing requires format-specific implementation.`],
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      errors: [
        { row: 0, field: 'file', message: `Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}` },
      ],
      warnings: [],
    };
  }
}

/**
 * Detect file type and parse accordingly
 */
export async function parseFile(buffer: Buffer, fileName: string): Promise<ParseResult> {
  const extension = fileName.toLowerCase().split('.').pop();

  if (extension === 'pdf') {
    return parsePDFFile(buffer);
  } else if (['xlsx', 'xls', 'csv'].includes(extension || '')) {
    return parseAndValidate(buffer);
  } else {
    return {
      success: false,
      data: [],
      errors: [
        { row: 0, field: 'file', message: `Unsupported file type: ${extension}. Please upload PDF, Excel, or CSV file.` },
      ],
      warnings: [],
    };
  }
}

