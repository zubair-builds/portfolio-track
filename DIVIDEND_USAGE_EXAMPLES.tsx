/**
 * DOCUMENTATION FILE - NOT FOR COMPILATION
 * 
 * This file contains example code snippets showing how to use
 * the dividend income features. These are examples only and
 * are not meant to be compiled or executed directly.
 * 
 * Copy relevant examples into your actual components as needed.
 */

// @ts-nocheck
// Example: How to use dividend data in your components

import { useDividendData } from '../hooks/useDividendData';
import { calculatePortfolioStats } from '../lib/portfolioData';
import { DividendIncomeWidget } from '../components/DividendIncomeWidget';

// ================================================================
// Example 1: Basic dividend data fetching
// ================================================================
function MyPortfolioComponent() {
  const { dividendStats, isLoading, error } = useDividendData(userEmail);

  if (isLoading) return <div>Loading dividends...</div>;
  if (error) return <div>Error loading dividends</div>;

  return (
    <div>
      <h2>Total Dividend Income</h2>
      <p>₨{dividendStats?.totalNet.toLocaleString('en-PK')}</p>
    </div>
  );
}

// ================================================================
// Example 2: Portfolio stats with dividends
// ================================================================
function PortfolioSummaryComponent({ stocks }) {
  const { dividendStats } = useDividendData(userEmail);

  const portfolioStats = useMemo(() => {
    const dividendData = dividendStats ? {
      netDividend: dividendStats.totalNet,
      grossDividend: dividendStats.totalGross,
      taxDeducted: dividendStats.totalTax,
      zakatDeducted: dividendStats.totalZakat,
    } : undefined;
    
    return calculatePortfolioStats(stocks, 0, dividendData);
  }, [stocks, dividendStats]);

  return (
    <div>
      <div>Total Investment: ₨{portfolioStats.totalInvestment.toLocaleString()}</div>
      <div>Current Value: ₨{portfolioStats.currentValue.toLocaleString()}</div>
      <div>Capital Gain/Loss: ₨{(portfolioStats.currentValue - portfolioStats.totalInvestment).toLocaleString()}</div>
      <div>Dividend Income: ₨{portfolioStats.totalDividendIncome?.toLocaleString()}</div>
      <div>Total Return: ₨{portfolioStats.totalGainLoss.toLocaleString()} ({portfolioStats.totalReturnPercent?.toFixed(2)}%)</div>
    </div>
  );
}

// ================================================================
// Example 3: Symbol-specific dividend data
// ================================================================
function SymbolDetailComponent({ symbol }) {
  const { dividendStats } = useDividendData(userEmail, { includeBySymbol: true });

  const symbolDividend = useMemo(() => {
    if (!dividendStats?.bySymbol) return null;
    return dividendStats.bySymbol.find(d => d.symbol === symbol);
  }, [dividendStats, symbol]);

  if (!symbolDividend) {
    return <div>No dividend data for {symbol}</div>;
  }

  return (
    <div>
      <h3>Dividends Received from {symbol}</h3>
      <p>Net Amount: ₨{symbolDividend.netDividend.toLocaleString()}</p>
      <p>Gross Amount: ₨{symbolDividend.grossDividend.toLocaleString()}</p>
      <p>Tax Deducted: ₨{symbolDividend.taxDeducted.toLocaleString()}</p>
      <p>Payments: {symbolDividend.count}</p>
    </div>
  );
}

// ================================================================
// Example 4: Date-range filtered dividends
// ================================================================
function YearlyDividendReport() {
  const startOfYear = new Date(new Date().getFullYear(), 0, 1);
  const today = new Date();

  const { dividendStats } = useDividendData(userEmail, {
    includeBySymbol: true,
    startDate: startOfYear,
    endDate: today,
  });

  return (
    <div>
      <h2>YTD Dividend Income</h2>
      <p>₨{dividendStats?.totalNet.toLocaleString('en-PK')}</p>
    </div>
  );
}

// ================================================================
// Example 5: Using the Dividend Income Widget
// ================================================================
function DashboardWithDividends() {
  const { stocks } = usePortfolioData(userEmail);
  const { dividendStats } = useDividendData(userEmail, { includeBySymbol: true });

  const portfolioStats = useMemo(() => {
    const dividendData = dividendStats ? {
      netDividend: dividendStats.totalNet,
      grossDividend: dividendStats.totalGross,
      taxDeducted: dividendStats.totalTax,
      zakatDeducted: dividendStats.totalZakat,
    } : undefined;
    
    return calculatePortfolioStats(stocks, 0, dividendData);
  }, [stocks, dividendStats]);

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <PortfolioSummary stats={portfolioStats} />

      {/* Dividend Widget */}
      {dividendStats && dividendStats.totalNet > 0 && (
        <DividendIncomeWidget
          totalNet={dividendStats.totalNet}
          totalGross={dividendStats.totalGross}
          totalTax={dividendStats.totalTax}
          totalZakat={dividendStats.totalZakat}
          count={dividendStats.count}
          bySymbol={dividendStats.bySymbol}
          totalInvestment={portfolioStats.totalInvestment}
        />
      )}
    </div>
  );
}

// ================================================================
// Example 6: Investment Position Card with dividends
// ================================================================
function SymbolPositionDisplay({ symbol, ownedStock, currentPrice }) {
  const { dividendStats } = useDividendData(userEmail, { includeBySymbol: true });

  const symbolDividend = useMemo(() => {
    if (!dividendStats?.bySymbol) return null;
    return dividendStats.bySymbol.find(d => d.symbol === symbol);
  }, [dividendStats, symbol]);

  return (
    <InvestmentPositionCard
      shares={ownedStock.shares}
      avgBuy={ownedStock.avgBuy}
      currentPrice={currentPrice}
      priceHistory={priceHistory}
      dividendYield={metadata?.dividendYield}
      receivedDividend={symbolDividend?.netDividend}
      receivedDividendGross={symbolDividend?.grossDividend}
      receivedDividendTax={symbolDividend?.taxDeducted}
    />
  );
}

// ================================================================
// Example 7: Custom dividend analytics
// ================================================================
function DividendAnalytics() {
  const { stocks } = usePortfolioData(userEmail);
  const { dividendStats } = useDividendData(userEmail, { includeBySymbol: true });

  const analytics = useMemo(() => {
    if (!dividendStats?.bySymbol) return null;

    const totalInvestment = stocks.reduce((sum, s) => sum + (s.shares * s.avgBuy), 0);
    const avgYield = totalInvestment > 0 ? (dividendStats.totalNet / totalInvestment) * 100 : 0;

    const topPayer = dividendStats.bySymbol.reduce((max, curr) => 
      curr.netDividend > max.netDividend ? curr : max
    , dividendStats.bySymbol[0]);

    const symbolsWithDividends = dividendStats.bySymbol.length;
    const totalSymbols = stocks.length;
    const payingRatio = totalSymbols > 0 ? (symbolsWithDividends / totalSymbols) * 100 : 0;

    return {
      avgYield,
      topPayer,
      payingRatio,
      totalPayments: dividendStats.count,
    };
  }, [stocks, dividendStats]);

  if (!analytics) return null;

  return (
    <div>
      <h2>Dividend Analytics</h2>
      <p>Average Portfolio Yield: {analytics.avgYield.toFixed(2)}%</p>
      <p>Top Payer: {analytics.topPayer.symbol} (₨{analytics.topPayer.netDividend.toLocaleString()})</p>
      <p>Dividend-Paying Stocks: {analytics.payingRatio.toFixed(0)}%</p>
      <p>Total Payments Received: {analytics.totalPayments}</p>
    </div>
  );
}

// ================================================================
// API Response Structure Reference
// ================================================================
/*
GET /api/dividends/stats?includeBySymbol=true

Response:
{
  success: true,
  stats: {
    totalNet: 30000,
    totalGross: 35250,
    totalTax: 5250,
    totalZakat: 0,
    count: 12,
    bySymbol: [
      {
        symbol: "DCR",
        netDividend: 12500,
        grossDividend: 14687.5,
        taxDeducted: 2187.5,
        zakatDeducted: 0,
        count: 5
      },
      // ... more symbols
    ]
  }
}
*/

// ================================================================
// PortfolioStats Interface Reference
// ================================================================
/*
interface PortfolioStats {
  totalInvestment: number;           // Total amount invested
  currentValue: number;              // Current market value
  totalGainLoss: number;             // Capital gain/loss + dividends
  totalGainLossPercent: number;      // Total return %
  topGainer: { symbol: string; gainPercent: number } | null;
  topLoser: { symbol: string; lossPercent: number } | null;
  
  // New dividend fields
  totalDividendIncome?: number;      // Net dividend income
  grossDividendIncome?: number;      // Before tax
  dividendTaxDeducted?: number;      // Total WHT
  dividendYield?: number;            // Dividend as % of investment
  totalReturnWithDividends?: number; // Same as totalGainLoss
  totalReturnPercent?: number;       // Same as totalGainLossPercent
}
*/

export {};
