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
  const worksheet = workbook.Sheets[sheetName];

  const rawData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });

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

  // Remove currency symbols, commas, and % signs
  const cleaned = value.toString().replace(/[₨,Rs.%\s]/g, '');
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
