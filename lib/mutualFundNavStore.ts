import {
  saveMutualFundNAV,
  getMutualFundNAVHistory,
  getLatestNAV,
  getAllMutualFunds,
  updateMutualFundNAV,
  type MutualFundNAVInput,
} from './mutualFundModel';

/**
 * Mutual Fund NAV Store
 * Handles NAV history management and daily tracking
 */

export interface NAVSyncResult {
  success: boolean;
  fundsUpdated: number;
  fundsFailed: number;
  errors: string[];
}

/**
 * Save NAV for multiple funds (bulk upload from CSV/Excel)
 */
export async function saveBulkNAV(
  navData: Array<{ fundCode: string; nav: number; date: Date; source?: 'api' | 'manual' | 'upload' }>
): Promise<{ saved: number; errors: string[] }> {
  const errors: string[] = [];
  let saved = 0;

  for (const data of navData) {
    try {
      await saveMutualFundNAV({
        fundCode: data.fundCode,
        nav: data.nav,
        date: data.date,
        source: data.source || 'upload',
      });
      saved++;
    } catch (error) {
      errors.push(`Failed to save NAV for ${data.fundCode}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { saved, errors };
}

/**
 * Get NAV history for charting
 */
export async function getNAVHistoryForChart(
  fundCode: string,
  days: number = 90
): Promise<Array<{ date: Date; nav: number }>> {
  const from = new Date();
  from.setDate(from.getDate() - days);

  const history = await getMutualFundNAVHistory(fundCode, from, new Date(), 1000);
  return history.map(h => ({
    date: h.date,
    nav: h.nav,
  })).sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Sync NAV for all funds (placeholder for API integration)
 * This function can be extended to fetch from external APIs
 */
export async function syncNAVForAllFunds(): Promise<NAVSyncResult> {
  const funds = await getAllMutualFunds();
  const result: NAVSyncResult = {
    success: true,
    fundsUpdated: 0,
    fundsFailed: 0,
    errors: [],
  };

  // TODO: Implement API fetching logic here
  // For now, this is a placeholder that can be extended
  // Example structure:
  // for (const fund of funds) {
  //   try {
  //     const nav = await fetchNAVFromAPI(fund.fundCode);
  //     if (nav) {
  //       await saveMutualFundNAV({
  //         fundCode: fund.fundCode,
  //         nav,
  //         date: new Date(),
  //         source: 'api',
  //       });
  //       result.fundsUpdated++;
  //     }
  //   } catch (error) {
  //     result.fundsFailed++;
  //     result.errors.push(`Failed to fetch NAV for ${fund.fundCode}: ${error}`);
  //   }
  // }

  return result;
}

/**
 * Sync NAV for specific funds
 */
export async function syncNAVForFunds(fundCodes: string[]): Promise<NAVSyncResult> {
  const result: NAVSyncResult = {
    success: true,
    fundsUpdated: 0,
    fundsFailed: 0,
    errors: [],
  };

  // TODO: Implement API fetching logic here
  // Similar to syncNAVForAllFunds but for specific funds

  return result;
}

/**
 * Get current NAV for a fund (with fallback to latest in history)
 */
export async function getCurrentNAV(fundCode: string): Promise<number | null> {
  // First try to get from mutual_funds collection
  let nav = await getLatestNAV(fundCode);

  // If not found, get latest from history
  if (nav === null) {
    const history = await getMutualFundNAVHistory(fundCode, undefined, undefined, 1);
    if (history.length > 0) {
      nav = history[0].nav;
      // Update mutual_funds collection
      await updateMutualFundNAV(fundCode, nav);
    }
  }

  return nav;
}

/**
 * Get NAV statistics for a fund
 */
export async function getNAVStats(fundCode: string, days: number = 30): Promise<{
  currentNAV: number | null;
  previousNAV: number | null;
  change: number | null;
  changePercent: number | null;
  minNAV: number | null;
  maxNAV: number | null;
  averageNAV: number | null;
}> {
  const from = new Date();
  from.setDate(from.getDate() - days);

  const history = await getMutualFundNAVHistory(fundCode, from, new Date(), 1000);
  
  if (history.length === 0) {
    return {
      currentNAV: null,
      previousNAV: null,
      change: null,
      changePercent: null,
      minNAV: null,
      maxNAV: null,
      averageNAV: null,
    };
  }

  // Sort by date (newest first)
  const sorted = history.sort((a, b) => b.date.getTime() - a.date.getTime());
  const currentNAV = sorted[0].nav;
  const previousNAV = sorted.length > 1 ? sorted[1].nav : null;

  const change = previousNAV !== null ? currentNAV - previousNAV : null;
  const changePercent = previousNAV !== null && previousNAV !== 0
    ? ((currentNAV - previousNAV) / previousNAV) * 100
    : null;

  const navs = history.map(h => h.nav);
  const minNAV = Math.min(...navs);
  const maxNAV = Math.max(...navs);
  const averageNAV = navs.reduce((sum, nav) => sum + nav, 0) / navs.length;

  return {
    currentNAV,
    previousNAV,
    change,
    changePercent,
    minNAV,
    maxNAV,
    averageNAV,
  };
}


