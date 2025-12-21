/**
 * Background Sync Functions
 * 
 * Handles async execution of data synchronization operations
 * with progress tracking for the admin dashboard.
 */

import * as fs from 'fs';
import * as path from 'path';
import { saveCompanyData, type CompanyData } from './companiesStore';
import { saveDividendBatch, type DividendRecord } from './dividendsStore';
import { updateSymbolFundamentals } from './symbolsStore';
import { saveIndexPrice, getAllIndices, getIndicesByFrequency, type IndexPriceData } from './indicesStore';
import { syncNAVForFunds } from './mutualFundNavStore';
import { getAllMutualFunds } from './mutualFundModel';
import {
  updateProgress,
  completeSession,
  calculateETA,
  updateProgressByType,
  updateSyncStatus,
  getSyncStatus,
} from './syncProgressStore';
import { syncEventEmitter } from './syncEventEmitter';

const PSX_API_BASE = 'https://psxterminal.com/api';
const RATE_LIMIT_DELAY = 650; // 650ms between requests
const UPDATE_FREQUENCY = 2; // Emit progress update every N items

// Track active syncs
const activeSyncs = new Map<string, boolean>();

// ============================================================================
// Company Sync
// ============================================================================

interface PSXCompanyResponse {
  success: boolean;
  data: {
    symbol: string;
    scrapedAt: string;
    financialStats: {
      marketCap: { numeric: number };
      shares: { numeric: number };
      freeFloat: { numeric: number };
      freeFloatPercent: { numeric: number };
    };
    businessDescription: string;
    keyPeople: Array<{ name: string; position: string }>;
    error: null | string;
  };
}

async function fetchCompanyFromPSX(symbol: string): Promise<PSXCompanyResponse | null> {
  try {
    const response = await fetch(`${PSX_API_BASE}/companies/${symbol.toUpperCase()}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://psxterminal.com/',
      },
    });

    if (!response.ok) return null;

    const data: PSXCompanyResponse = await response.json();
    if (!data.success || !data.data || data.data.error) return null;

    return data;
  } catch (error) {
    console.error(`Failed to fetch company ${symbol}:`, error);
    return null;
  }
}

export async function runCompaniesSync(
  batchSize: number,
  sessionId: string
): Promise<void> {
  const startTime = Date.now();
  let successCount = 0;
  let failedCount = 0;
  const failedItems: string[] = [];

  try {
    // Load symbols
    const symbolsPath = path.join(process.cwd(), 'scripts', 'symbols.json');
    const symbolsData = fs.readFileSync(symbolsPath, 'utf-8');
    const allSymbols: string[] = JSON.parse(symbolsData);

    const symbolsToFetch = allSymbols.slice(0, batchSize);

    // Update total
    await updateProgress(
      sessionId,
      {
        total: symbolsToFetch.length,
        current: 0,
        percentage: 0,
        successCount: 0,
        failedCount: 0,
      },
      'running'
    );

    // Process each symbol
    for (let i = 0; i < symbolsToFetch.length; i++) {
      const symbol = symbolsToFetch[i];

      // Fetch data
      const apiData = await fetchCompanyFromPSX(symbol);

      if (apiData && apiData.data) {
        try {
          const companyData: CompanyData = {
            symbol: apiData.data.symbol.toUpperCase(),
            marketCap: apiData.data.financialStats.marketCap.numeric,
            shares: apiData.data.financialStats.shares.numeric,
            freeFloat: apiData.data.financialStats.freeFloat.numeric,
            freeFloatPercent: apiData.data.financialStats.freeFloatPercent.numeric,
            businessDescription: apiData.data.businessDescription,
            keyPeople: apiData.data.keyPeople,
            scrapedAt: new Date(apiData.data.scrapedAt),
            lastUpdated: new Date(),
          };

          await saveCompanyData(companyData);
          successCount++;
        } catch (error) {
          console.error(`Failed to save company ${symbol}:`, error);
          failedCount++;
          failedItems.push(symbol);
        }
      } else {
        failedCount++;
        failedItems.push(symbol);
      }

      // Update progress
      const current = i + 1;
      const percentage = (current / symbolsToFetch.length) * 100;
      const elapsedMs = Date.now() - startTime;
      const eta = calculateETA(current, symbolsToFetch.length, elapsedMs);

      await updateProgress(sessionId, {
        current,
        percentage,
        currentItem: symbol,
        successCount,
        failedCount,
        estimatedTimeRemaining: eta,
      });

      // Rate limiting
      if (i < symbolsToFetch.length - 1) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }
    }

    // Complete session
    await completeSession(sessionId, 'completed', {
      processed: symbolsToFetch.length,
      successful: successCount,
      failed: failedCount,
      failedItems: failedItems.length > 0 ? failedItems : undefined,
    });

  } catch (error) {
    const err = error as Error;
    console.error('Companies sync error:', err);
    await completeSession(sessionId, 'failed', undefined, err.message);
  }
}

// ============================================================================
// Dividends Sync
// ============================================================================

interface PSXDividendResponse {
  success: boolean;
  data: Array<{
    symbol: string;
    ex_date: string;
    payment_date: string;
    record_date: string;
    amount: number;
    year: number;
  }>;
}

async function fetchDividendsFromPSX(symbol: string): Promise<PSXDividendResponse | null> {
  try {
    const response = await fetch(`${PSX_API_BASE}/dividends/${symbol.toLowerCase()}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://psxterminal.com/',
      },
    });

    if (response.status === 404) {
      return { success: true, data: [] };
    }

    if (!response.ok) return null;

    const data: PSXDividendResponse = await response.json();
    return data;
  } catch (error) {
    console.error(`Failed to fetch dividends for ${symbol}:`, error);
    return null;
  }
}

export async function runDividendsSync(
  batchSize: number,
  sessionId: string
): Promise<void> {
  const startTime = Date.now();
  let successCount = 0;
  let failedCount = 0;
  const failedItems: string[] = [];

  try {
    // Load symbols
    const symbolsPath = path.join(process.cwd(), 'scripts', 'symbols.json');
    const symbolsData = fs.readFileSync(symbolsPath, 'utf-8');
    const allSymbols: string[] = JSON.parse(symbolsData);

    const symbolsToFetch = allSymbols.slice(0, batchSize);

    // Update total
    await updateProgress(
      sessionId,
      {
        total: symbolsToFetch.length,
        current: 0,
        percentage: 0,
        successCount: 0,
        failedCount: 0,
      },
      'running'
    );

    // Process each symbol
    for (let i = 0; i < symbolsToFetch.length; i++) {
      const symbol = symbolsToFetch[i];

      // Fetch data
      const apiData = await fetchDividendsFromPSX(symbol);

      if (apiData) {
        try {
          if (apiData.data && apiData.data.length > 0) {
            const dividendRecords: DividendRecord[] = apiData.data.map(d => ({
              symbol: symbol.toUpperCase(),
              exDate: new Date(d.ex_date),
              paymentDate: new Date(d.payment_date),
              recordDate: new Date(d.record_date),
              amount: d.amount,
              year: d.year,
              createdAt: new Date(),
            }));

            await saveDividendBatch(dividendRecords);
          }
          successCount++;
        } catch (error) {
          console.error(`Failed to save dividends for ${symbol}:`, error);
          failedCount++;
          failedItems.push(symbol);
        }
      } else {
        failedCount++;
        failedItems.push(symbol);
      }

      // Update progress
      const current = i + 1;
      const percentage = (current / symbolsToFetch.length) * 100;
      const elapsedMs = Date.now() - startTime;
      const eta = calculateETA(current, symbolsToFetch.length, elapsedMs);

      await updateProgress(sessionId, {
        current,
        percentage,
        currentItem: symbol,
        successCount,
        failedCount,
        estimatedTimeRemaining: eta,
      });

      // Rate limiting
      if (i < symbolsToFetch.length - 1) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }
    }

    // Complete session
    await completeSession(sessionId, 'completed', {
      processed: symbolsToFetch.length,
      successful: successCount,
      failed: failedCount,
      failedItems: failedItems.length > 0 ? failedItems : undefined,
    });

  } catch (error) {
    const err = error as Error;
    console.error('Dividends sync error:', err);
    await completeSession(sessionId, 'failed', undefined, err.message);
  }
}

// ============================================================================
// Fundamentals Sync
// ============================================================================

interface PSXFundamentalsResponse {
  success: boolean;
  data: {
    symbol: string;
    sector: string;
    listedIn: string;
    marketCap: string;
    price: number;
    changePercent: number;
    yearChange: number;
    peRatio: number;
    dividendYield: number;
    freeFloat: string;
    volume30Avg: number;
    isNonCompliant: boolean;
    timestamp: string;
  };
}

async function fetchFundamentalsFromPSX(symbol: string): Promise<PSXFundamentalsResponse | null> {
  try {
    const response = await fetch(`${PSX_API_BASE}/fundamentals/${symbol.toUpperCase()}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://psxterminal.com/',
      },
    });

    if (response.status === 404) return null;
    if (!response.ok) return null;

    const data: PSXFundamentalsResponse = await response.json();
    if (!data.success || !data.data) return null;

    return data;
  } catch (error) {
    console.error(`Failed to fetch fundamentals for ${symbol}:`, error);
    return null;
  }
}

export async function runFundamentalsSync(
  batchSize: number,
  sessionId: string
): Promise<void> {
  const startTime = Date.now();
  let successCount = 0;
  let failedCount = 0;
  const failedItems: string[] = [];

  try {
    // Load symbols
    const symbolsPath = path.join(process.cwd(), 'scripts', 'symbols.json');
    const symbolsData = fs.readFileSync(symbolsPath, 'utf-8');
    const allSymbols: string[] = JSON.parse(symbolsData);

    const symbolsToFetch = allSymbols.slice(0, batchSize);

    // Update total
    await updateProgress(
      sessionId,
      {
        total: symbolsToFetch.length,
        current: 0,
        percentage: 0,
        successCount: 0,
        failedCount: 0,
      },
      'running'
    );

    // Process each symbol
    for (let i = 0; i < symbolsToFetch.length; i++) {
      const symbol = symbolsToFetch[i];

      // Fetch data
      const apiData = await fetchFundamentalsFromPSX(symbol);

      if (apiData && apiData.data) {
        try {
          await updateSymbolFundamentals(symbol, apiData.data);
          successCount++;
        } catch (error) {
          console.error(`Failed to update fundamentals for ${symbol}:`, error);
          failedCount++;
          failedItems.push(symbol);
        }
      } else {
        failedCount++;
        failedItems.push(symbol);
      }

      // Update progress
      const current = i + 1;
      const percentage = (current / symbolsToFetch.length) * 100;
      const elapsedMs = Date.now() - startTime;
      const eta = calculateETA(current, symbolsToFetch.length, elapsedMs);

      await updateProgress(sessionId, {
        current,
        percentage,
        currentItem: symbol,
        successCount,
        failedCount,
        estimatedTimeRemaining: eta,
      });

      // Rate limiting
      if (i < symbolsToFetch.length - 1) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }
    }

    // Complete session
    await completeSession(sessionId, 'completed', {
      processed: symbolsToFetch.length,
      successful: successCount,
      failed: failedCount,
      failedItems: failedItems.length > 0 ? failedItems : undefined,
    });

  } catch (error) {
    const err = error as Error;
    console.error('Fundamentals sync error:', err);
    await completeSession(sessionId, 'failed', undefined, err.message);
  }
}

// ============================================================================
// Indices Sync
// ============================================================================

interface PSXIndexResponse {
  success: boolean;
  data: {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    trades: number;
    value: number;
    high: number;
    low: number;
    timestamp: number;
  };
}

async function fetchIndexFromPSX(symbol: string): Promise<PSXIndexResponse | null> {
  try {
    const response = await fetch(`${PSX_API_BASE}/ticks/IDX/${symbol.toUpperCase()}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://psxterminal.com/',
      },
    });

    if (!response.ok) return null;

    const data: PSXIndexResponse = await response.json();
    if (!data.success || !data.data) return null;

    return data;
  } catch (error) {
    console.error(`Failed to fetch index ${symbol}:`, error);
    return null;
  }
}

export async function runIndicesSync(
  options: { type?: 'all' | 'realtime'; symbols?: string[] },
  sessionId: string
): Promise<void> {
  const startTime = Date.now();
  let successCount = 0;
  let failedCount = 0;
  const failedItems: string[] = [];

  try {
    // Determine which indices to fetch
    let indicesToFetch;

    if (options.symbols && options.symbols.length > 0) {
      const allIndices = await getAllIndices();
      indicesToFetch = allIndices.filter(idx =>
        options.symbols!.includes(idx.symbol.toUpperCase())
      );
    } else if (options.type === 'realtime') {
      indicesToFetch = await getIndicesByFrequency('realtime');
    } else {
      indicesToFetch = await getAllIndices();
    }

    // Update total
    await updateProgress(
      sessionId,
      {
        total: indicesToFetch.length,
        current: 0,
        percentage: 0,
        successCount: 0,
        failedCount: 0,
      },
      'running'
    );

    // Process each index
    for (let i = 0; i < indicesToFetch.length; i++) {
      const index = indicesToFetch[i];

      // Fetch data
      const apiData = await fetchIndexFromPSX(index.symbol);

      if (apiData && apiData.data) {
        try {
          const priceData: IndexPriceData = {
            indexSymbol: index.symbol,
            price: apiData.data.price,
            change: apiData.data.change,
            changePercent: apiData.data.changePercent,
            volume: apiData.data.volume,
            trades: apiData.data.trades,
            value: apiData.data.value,
            high: apiData.data.high,
            low: apiData.data.low,
            timestamp: new Date(
              apiData.data.timestamp > 1_000_000_000_000
                ? apiData.data.timestamp
                : apiData.data.timestamp * 1000
            ),
          };

          await saveIndexPrice(priceData);
          successCount++;
        } catch (error) {
          console.error(`Failed to save index ${index.symbol}:`, error);
          failedCount++;
          failedItems.push(index.symbol);
        }
      } else {
        failedCount++;
        failedItems.push(index.symbol);
      }

      // Update progress
      const current = i + 1;
      const percentage = (current / indicesToFetch.length) * 100;
      const elapsedMs = Date.now() - startTime;
      const eta = calculateETA(current, indicesToFetch.length, elapsedMs);

      await updateProgress(sessionId, {
        current,
        percentage,
        currentItem: index.symbol,
        successCount,
        failedCount,
        estimatedTimeRemaining: eta,
      });

      // Rate limiting
      if (i < indicesToFetch.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Complete session
    await completeSession(sessionId, 'completed', {
      processed: indicesToFetch.length,
      successful: successCount,
      failed: failedCount,
      failedItems: failedItems.length > 0 ? failedItems : undefined,
    });

  } catch (error) {
    const err = error as Error;
    console.error('Indices sync error:', err);
    await completeSession(sessionId, 'failed', undefined, err.message);
  }
}

// ============================================================================
// Main Sync Orchestration
// ============================================================================

/**
 * Start background sync for specified types
 */
export async function startBackgroundSync(types: Array<'companies' | 'dividends' | 'fundamentals'>): Promise<void> {
  for (const type of types) {
    // Check if already running
    if (activeSyncs.get(type)) {
      console.warn(`Sync for ${type} is already running`);
      continue;
    }

    // Mark as running
    activeSyncs.set(type, true);

    // Update sync status
    await updateSyncStatus(type, {
      isRunning: true,
      startedAt: new Date().toISOString(),
      error: null
    });

    // Emit status change event
    const statusData = await getSyncStatus(type);
    syncEventEmitter.emitStatus(type, statusData);

    // Start the sync in background (don't await)
    runSyncWithTracking(type).catch(error => {
      console.error(`Background sync error for ${type}:`, error);
      syncEventEmitter.emitError(type, error.message);
    });
  }
}

/**
 * Stop background sync for specified types
 */
export async function stopBackgroundSync(types: Array<'companies' | 'dividends' | 'fundamentals'>): Promise<void> {
  for (const type of types) {
    activeSyncs.set(type, false);

    await updateSyncStatus(type, {
      isRunning: false,
      error: null
    });

    // Emit status change event
    const statusData = await getSyncStatus(type);
    syncEventEmitter.emitStatus(type, statusData);

    console.log(`Stopped sync for ${type}`);
  }
}

/**
 * Run sync with progress tracking
 */
async function runSyncWithTracking(type: 'companies' | 'dividends' | 'fundamentals'): Promise<void> {
  const startTime = Date.now();
  let successCount = 0;
  let failedCount = 0;
  const failedItems: string[] = [];

  try {
    // Check for existing progress
    const { getProgress } = await import('./syncProgressStore');
    const existingProgress = await getProgress(type);

    let symbolsToProcess: string[];
    let currentCompleted = existingProgress.completed;

    if (existingProgress.pending && existingProgress.pending.length > 0) {
      // Resume from where we left off
      symbolsToProcess = existingProgress.pending;
      console.log(`Resuming ${type} sync with ${symbolsToProcess.length} pending items`);
    } else {
      // Start fresh
      const symbolsPath = path.join(process.cwd(), 'scripts', 'symbols.json');
      const symbolsData = fs.readFileSync(symbolsPath, 'utf-8');
      symbolsToProcess = JSON.parse(symbolsData);
      currentCompleted = 0;

      // Initialize progress
      await updateProgressByType(type, {
        total: symbolsToProcess.length,
        completed: 0,
        pending: symbolsToProcess,
        failed: [],
        currentBatch: []
      });
    }

    // Process symbols
    for (let i = 0; i < symbolsToProcess.length; i++) {
      // Check if sync was stopped
      if (!activeSyncs.get(type)) {
        console.log(`Sync for ${type} was stopped`);
        break;
      }

      const symbol = symbolsToProcess[i];

      try {
        if (type === 'companies') {
          const apiData = await fetchCompanyFromPSX(symbol);
          if (apiData && apiData.data) {
            const companyData: CompanyData = {
              symbol: apiData.data.symbol.toUpperCase(),
              marketCap: apiData.data.financialStats.marketCap.numeric,
              shares: apiData.data.financialStats.shares.numeric,
              freeFloat: apiData.data.financialStats.freeFloat.numeric,
              freeFloatPercent: apiData.data.financialStats.freeFloatPercent.numeric,
              businessDescription: apiData.data.businessDescription,
              keyPeople: apiData.data.keyPeople,
              scrapedAt: new Date(apiData.data.scrapedAt),
              lastUpdated: new Date(),
            };
            await saveCompanyData(companyData);
            successCount++;
          } else {
            failedCount++;
            failedItems.push(symbol);
          }
        } else if (type === 'dividends') {
          const apiData = await fetchDividendsFromPSX(symbol);
          if (apiData) {
            if (apiData.data && apiData.data.length > 0) {
              const dividendRecords: DividendRecord[] = apiData.data.map(d => ({
                symbol: symbol.toUpperCase(),
                exDate: new Date(d.ex_date),
                paymentDate: new Date(d.payment_date),
                recordDate: new Date(d.record_date),
                amount: d.amount,
                year: d.year,
                createdAt: new Date(),
              }));
              await saveDividendBatch(dividendRecords);
            }
            successCount++;
          } else {
            failedCount++;
            failedItems.push(symbol);
          }
        } else if (type === 'fundamentals') {
          const apiData = await fetchFundamentalsFromPSX(symbol);
          if (apiData && apiData.data) {
            await updateSymbolFundamentals(symbol, apiData.data);
            successCount++;
          } else {
            failedCount++;
            failedItems.push(symbol);
          }
        }
      } catch (error) {
        console.error(`Failed to process ${symbol}:`, error);
        failedCount++;
        failedItems.push(symbol);
      }

      // Update progress in database
      const remaining = symbolsToProcess.slice(i + 1);
      await updateProgressByType(type, {
        completed: currentCompleted + i + 1,
        pending: remaining,
        failed: failedItems,
        currentBatch: [symbol]
      });

      // Emit progress update every UPDATE_FREQUENCY items or on error
      if ((i + 1) % UPDATE_FREQUENCY === 0 || failedCount > 0) {
        const progressData = await getProgress(type);
        syncEventEmitter.emitProgress(type, progressData);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    }

    // Complete - calculate duration
    const duration = Math.round((Date.now() - startTime) / 1000); // seconds
    await updateSyncStatus(type, {
      isRunning: false,
      lastSync: new Date().toISOString(),
      lastSyncDuration: duration,
      error: null
    });

    // Emit final progress and status
    const finalProgress = await getProgress(type);
    const finalStatus = await getSyncStatus(type);
    syncEventEmitter.emitProgress(type, finalProgress);
    syncEventEmitter.emitStatus(type, finalStatus);

    console.log(`✓ Completed ${type} sync: ${successCount} success, ${failedCount} failed`);

  } catch (error) {
    const err = error as Error;
    console.error(`${type} sync error:`, err);

    await updateSyncStatus(type, {
      isRunning: false,
      error: err.message
    });

    // Emit error event
    syncEventEmitter.emitError(type, error.message);
    const statusData = await getSyncStatus(type);
    syncEventEmitter.emitStatus(type, statusData);
  } finally {
    activeSyncs.delete(type);
  }
}

/**
 * Check if a sync is currently running
 */
export function isSyncRunning(type: 'companies' | 'dividends' | 'fundamentals'): boolean {
  return activeSyncs.get(type) || false;
}

// ============================================================================
// Mutual Fund NAV Sync
// ============================================================================

/**
 * Run mutual fund NAV sync with progress tracking
 */
export async function runMutualFundNAVSync(
  sessionId: string,
  fundCodes?: string[]
): Promise<void> {
  const startTime = Date.now();
  let successCount = 0;
  let failedCount = 0;
  const failedItems: string[] = [];

  try {
    let fundsToSync: string[];

    if (fundCodes && fundCodes.length > 0) {
      fundsToSync = fundCodes;
    } else {
      // Get all funds
      const allFunds = await getAllMutualFunds();
      fundsToSync = allFunds.map(f => f.fundCode);
    }

    if (fundsToSync.length === 0) {
      await completeSession(sessionId, 'completed', undefined, 'No funds to sync');
      return;
    }

    // Update progress
    await updateProgress(
      sessionId,
      {
        total: fundsToSync.length,
        current: 0,
        percentage: 0,
        successCount: 0,
        failedCount: 0,
      },
      'running'
    );

    // Sync NAV for each fund
    for (let i = 0; i < fundsToSync.length; i++) {
      const fundCode = fundsToSync[i];

      try {
        // Use syncNAVForFunds for individual fund
        const result = await syncNAVForFunds([fundCode]);

        if (result.success && result.fundsUpdated > 0) {
          successCount++;
        } else {
          failedCount++;
          failedItems.push(fundCode);
        }
      } catch (error) {
        console.error(`Failed to sync NAV for ${fundCode}:`, error);
        failedCount++;
        failedItems.push(fundCode);
      }

      // Update progress
      const current = i + 1;
      const percentage = (current / fundsToSync.length) * 100;
      const elapsedMs = Date.now() - startTime;
      const eta = calculateETA(current, fundsToSync.length, elapsedMs);

      await updateProgress(sessionId, {
        current,
        percentage,
        currentItem: fundCode,
        successCount,
        failedCount,
        estimatedTimeRemaining: eta,
      });

      // Rate limiting
      if (i < fundsToSync.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Complete session
    // const duration = Math.round((Date.now() - startTime) / 1000);
    await completeSession(sessionId, 'completed', {
      processed: fundsToSync.length,
      successful: successCount,
      failed: failedCount,
      failedItems: failedItems.length > 0 ? failedItems : undefined,
    });

  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error('Mutual Fund NAV sync error:', error);

    await completeSession(sessionId, 'failed', undefined, error.message);
  }
}

