/**
 * Dividend Parser Service
 * Parse Excel/CSV files and transform to dividend schema
 */

import * as XLSX from 'xlsx';
import { Dividend, DividendDates, DividendFinancials } from '../../lib/dividendModel';

export interface ParsedDividendRow {
  symbol?: string;
  companyName?: string;
  sector?: string;
  dividendType?: string;
  announcementDate?: string | Date;
  exDividendDate?: string | Date;
  bookClosureStart?: string | Date;
  bookClosureEnd?: string | Date;
  paymentDate?: string | Date;
  agmDate?: string | Date;
  dividendRate?: number | string;
  dividendPerShare?: number | string;
  dividendAmount?: number | string;
  faceValue?: number | string;
  bonusRatio?: string;
  rightRatio?: string;
  rightPrice?: number | string;
  fiscalYear?: string;
  quarter?: string;
  remarks?: string;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ParseResult {
  success: boolean;
  data: Omit<Dividend, '_id' | 'uploadedAt' | 'calculated'>[];
  errors: ValidationError[];
  warnings: string[];
}

/**
 * Parse Excel file buffer
 */
export function parseExcelFile(buffer: Buffer): ParsedDividendRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  console.log(`[Parser] Reading sheet: ${sheetName}`);
  const worksheet = workbook.Sheets[sheetName];

  const rawData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });
  console.log(`[Parser] Found ${rawData.length} rows in announcement file`);

  return rawData.map(row => normalizeColumnNames(row));
}

/**
 * Normalize column names from Excel (handle various naming conventions)
 */
function normalizeColumnNames(row: Record<string, unknown>): ParsedDividendRow {
  const normalized: ParsedDividendRow = {};

  // Mapping of possible column names to standardized keys
  const columnMap: Record<string, keyof ParsedDividendRow> = {
    'symbol': 'symbol',
    'stock symbol': 'symbol',
    'ticker': 'symbol',
    'company': 'companyName',
    'company name': 'companyName',
    'sector': 'sector',
    'industry': 'sector',
    'dividend type': 'dividendType',
    'type': 'dividendType',
    'announcement date': 'announcementDate',
    'announced': 'announcementDate',
    'ex-dividend date': 'exDividendDate',
    'ex dividend': 'exDividendDate',
    'ex date': 'exDividendDate',
    'book closure start': 'bookClosureStart',
    'closure start': 'bookClosureStart',
    'book closure end': 'bookClosureEnd',
    'closure end': 'bookClosureEnd',
    'payment date': 'paymentDate',
    'pay date': 'paymentDate',
    'agm date': 'agmDate',
    'agm': 'agmDate',
    'dividend rate': 'dividendRate',
    'rate': 'dividendRate',
    'dividend per share': 'dividendPerShare',
    'dps': 'dividendPerShare',
    'dividend amount': 'dividendAmount',
    'total amount': 'dividendAmount',
    'face value': 'faceValue',
    'par value': 'faceValue',
    'bonus ratio': 'bonusRatio',
    'bonus': 'bonusRatio',
    'right ratio': 'rightRatio',
    'right': 'rightRatio',
    'right price': 'rightPrice',
    'rights price': 'rightPrice',
    'fiscal year': 'fiscalYear',
    'fy': 'fiscalYear',
    'year': 'fiscalYear',
    'quarter': 'quarter',
    'q': 'quarter',
    'remarks': 'remarks',
    'notes': 'remarks',
    'comments': 'remarks',
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

  // Remove currency symbols (Rs., Rs, ₨) case-insensitive
  cleaned = cleaned.replace(/Rs\.?/gi, '').replace(/₨/g, '');

  // Remove commas, % and whitespace
  cleaned = cleaned.replace(/[,%\s]/g, '');

  const num = parseFloat(cleaned);

  return isNaN(num) ? undefined : num;
}

/**
 * Validate and transform a single dividend row
 */
export function validateDividendRow(row: ParsedDividendRow, rowIndex: number): {
  valid: boolean;
  dividend?: Omit<Dividend, '_id' | 'uploadedAt' | 'calculated'>;
  errors: ValidationError[];
} {
  const errors: ValidationError[] = [];

  // Required fields validation
  if (!row.symbol) {
    errors.push({ row: rowIndex, field: 'symbol', message: 'Symbol is required' });
  }

  if (!row.companyName) {
    errors.push({ row: rowIndex, field: 'companyName', message: 'Company name is required' });
  }

  if (!row.sector) {
    errors.push({ row: rowIndex, field: 'sector', message: 'Sector is required' });
  }

  if (!row.dividendType) {
    errors.push({ row: rowIndex, field: 'dividendType', message: 'Dividend type is required' });
  }

  if (!row.announcementDate) {
    errors.push({ row: rowIndex, field: 'announcementDate', message: 'Announcement date is required' });
  }

  if (!row.exDividendDate) {
    errors.push({ row: rowIndex, field: 'exDividendDate', message: 'Ex-dividend date is required' });
  }

  if (!row.bookClosureStart) {
    errors.push({ row: rowIndex, field: 'bookClosureStart', message: 'Book closure start date is required' });
  }

  if (!row.bookClosureEnd) {
    errors.push({ row: rowIndex, field: 'bookClosureEnd', message: 'Book closure end date is required' });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Parse dates
  const dates: DividendDates = {
    announcement: parseDate(row.announcementDate)!,
    exDividend: parseDate(row.exDividendDate)!,
    bookClosureStart: parseDate(row.bookClosureStart)!,
    bookClosureEnd: parseDate(row.bookClosureEnd)!,
    payment: parseDate(row.paymentDate),
    agmDate: parseDate(row.agmDate),
  };

  // Validate date logic
  if (dates.announcement >= dates.exDividend) {
    errors.push({ row: rowIndex, field: 'dates', message: 'Announcement date must be before ex-dividend date' });
  }

  if (dates.exDividend >= dates.bookClosureStart) {
    errors.push({ row: rowIndex, field: 'dates', message: 'Ex-dividend date must be before book closure start' });
  }

  if (dates.bookClosureStart >= dates.bookClosureEnd) {
    errors.push({ row: rowIndex, field: 'dates', message: 'Book closure start must be before book closure end' });
  }

  // Parse financials
  const financials: DividendFinancials = {
    faceValue: parseNumber(row.faceValue) || 10,
    dividendRate: parseNumber(row.dividendRate),
    dividendPerShare: parseNumber(row.dividendPerShare),
    totalAmount: parseNumber(row.dividendAmount),
    bonusRatio: row.bonusRatio,
    rightRatio: row.rightRatio,
    rightPrice: parseNumber(row.rightPrice),
  };

  // Validate dividend type-specific fields
  const dividendType = row.dividendType.trim();

  if (dividendType === 'Cash' && !financials.dividendRate && !financials.dividendPerShare) {
    errors.push({ row: rowIndex, field: 'financials', message: 'Cash dividend requires either rate or per-share amount' });
  }

  if (dividendType === 'Bonus' && !financials.bonusRatio) {
    errors.push({ row: rowIndex, field: 'bonusRatio', message: 'Bonus dividend requires bonus ratio' });
  }

  if (dividendType === 'Right' && !financials.rightRatio) {
    errors.push({ row: rowIndex, field: 'rightRatio', message: 'Right shares require right ratio' });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Build dividend object
  const dividend: Omit<Dividend, '_id' | 'uploadedAt' | 'calculated'> = {
    symbol: row.symbol!.toUpperCase().trim(),
    companyName: row.companyName!.trim(),
    sector: row.sector!.trim(),
    dividendType: dividendType as Dividend['dividendType'],
    dates,
    financials,
    fiscalYear: row.fiscalYear?.trim(),
    quarter: row.quarter?.trim(),
    remarks: row.remarks?.trim(),
    source: 'Excel Upload',
  };

  return { valid: true, dividend, errors: [] };
}

/**
 * Parse and validate entire file
 */
export function parseAndValidate(buffer: Buffer): ParseResult {
  const parsedRows = parseExcelFile(buffer);
  const warnings: string[] = [];
  const allErrors: ValidationError[] = [];
  const validDividends: Omit<Dividend, '_id' | 'uploadedAt' | 'calculated'>[] = [];

  if (parsedRows.length === 0) {
    return {
      success: false,
      data: [],
      errors: [{ row: 0, field: 'file', message: 'No data found in file' }],
      warnings: [],
    };
  }

  parsedRows.forEach((row, index) => {
    const { valid, dividend, errors } = validateDividendRow(row, index + 2); // +2 for header row and 1-indexed

    if (valid && dividend) {
      validDividends.push(dividend);
    } else {
      allErrors.push(...errors);
    }
  });

  if (validDividends.length === 0) {
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
    data: validDividends,
    errors: allErrors,
    warnings,
  };
}

/**
 * Detect duplicates within the upload
 */
export function detectInternalDuplicates(dividends: Omit<Dividend, '_id' | 'uploadedAt' | 'calculated'>[]): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];

  dividends.forEach(dividend => {
    const key = `${dividend.symbol}_${dividend.dates.announcement.toISOString()}`;
    if (seen.has(key)) {
      duplicates.push(`Duplicate found: ${dividend.symbol} announced on ${dividend.dates.announcement.toLocaleDateString()}`);
    }
    seen.add(key);
  });

  return duplicates;
}

// --- Payment Report Parsing ---

import { PaymentDividend } from '../../lib/paymentDividendModel';

export interface ParsedPaymentRow {
  paymentDate?: string | Date;
  symbol?: string;
  companyName?: string;
  warrantNo?: string;
  filerStatus?: string;
  netDividend?: number | string;
  grossDividend?: number | string;
  taxDeducted?: number | string;
  zakatDeducted?: number | string;
}

export interface PaymentParseResult {
  success: boolean;
  type: 'payment_report' | 'announcement';
  data?: Omit<PaymentDividend, '_id' | 'uploadedAt' | 'uploadedBy'>[];
  announcementData?: ParseResult; // If it was actually an announcement file
  errors: ValidationError[];
}

/**
 * Parse Payment Report (CDC Format)
 */
export function parsePaymentReport(buffer: Buffer): PaymentParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  console.log(`[Parser] Reading sheet for payment check: ${sheetName}`);
  const worksheet = workbook.Sheets[sheetName];

  // Convert to array of arrays to inspect structure
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' }) as unknown[][];
  console.log(`[Parser] Total rows found: ${rows.length}`);

  // Check if this is a payment report
  const isPaymentReport = rows.length > 1 &&
    rows[1] &&
    rows[1][0] &&
    typeof rows[1][0] === 'string' &&
    rows[1][0].includes('Dividend / Zakat & Tax Deduction Summary Report');

  if (!isPaymentReport) {
    console.log('[Parser] Not a payment report, falling back to announcement parser');
    // Fallback to standard announcement parser
    const announcementResult = parseAndValidate(buffer);
    return {
      success: announcementResult.success,
      type: 'announcement',
      announcementData: announcementResult,
      errors: announcementResult.errors
    };
  }

  // Find header row (usually row 12, index 12 in 0-indexed array if row 1 is index 0... wait, row 13 in Excel is index 12)
  // Based on user's output: Row 12 has headers: 'Payment Date', 'Financial Year', ...
  const dataStartIndex = 13;

  if (rows.length <= dataStartIndex) {
    return {
      success: false,
      type: 'payment_report',
      errors: [{ row: 0, field: 'file', message: 'No data found in payment report' }]
    };
  }

  const validPayments: Omit<PaymentDividend, '_id' | 'uploadedAt' | 'uploadedBy'>[] = [];
  const errors: ValidationError[] = [];

  console.log(`[Parser] Starting payment row parsing from index ${dataStartIndex}`);

  for (let i = dataStartIndex; i < rows.length; i++) {
    const row = rows[i] as (string | number | undefined)[];
    if (!row || row.length === 0 || !row[0]) continue; // Skip empty rows

    // Map columns based on fixed indices from the report format
    // 0: Payment Date
    // 4: Sec. Symbol - Sec. Name
    // 6: Warrant #
    // 7: Filer Status
    // 9: Gross Dividend
    // 10: Tax
    // 12: Zakat
    // 13: Net Dividend

    try {
      const paymentDate = parseDate(row[0] as string);
      const symbolAndName = row[4] as string;
      const warrantNo = row[6]?.toString();
      const filerStatus = row[7]?.toString();
      const grossDividend = parseNumber(row[9] as string | number);
      const taxDeducted = parseNumber(row[10] as string | number);
      const zakatDeducted = parseNumber(row[12] as string | number);
      const netDividend = parseNumber(row[13] as string | number);

      if (!paymentDate || !symbolAndName || !warrantNo || grossDividend === undefined) {
        // Skip invalid rows but log error? Or just skip footer rows?
        continue;
      }

      // Split Symbol and Name
      const [symbolPart, ...nameParts] = symbolAndName.split('-');
      const symbol = symbolPart.trim();
      const companyName = nameParts.join('-').trim();

      validPayments.push({
        paymentDate,
        symbol,
        companyName,
        warrantNo,
        filerStatus: filerStatus || 'Unknown',
        grossDividend,
        taxDeducted: taxDeducted || 0,
        zakatDeducted: zakatDeducted || 0,
        netDividend: netDividend || 0,
        updatedAt: new Date()
      });

    } catch (err) {
      console.error('Row parse error:', err);
      errors.push({ row: i + 1, field: 'row', message: 'Failed to parse row' });
    }
  }

  console.log(`[Parser] Finished parsing. Valid payments: ${validPayments.length}, Errors: ${errors.length}`);

  return {
    success: validPayments.length > 0,
    type: 'payment_report',
    data: validPayments,
    errors
  };
}
