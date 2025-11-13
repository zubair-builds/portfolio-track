# AI Portfolio Review Enhancement

## Overview

Transform the portfolio review feature to provide comprehensive, data-rich analysis by fetching symbol metadata, company information, and dividend data from MongoDB. The AI will act as a financial consultant and respond in an engaging, professional blog style.

## Data to Fetch

For each portfolio holding, gather:

- **Symbol Price Data**: P/E ratio, P/B ratio, dividend yield, EPS, market cap, volume, 52-week high/low
- **Company Data**: Free float %, sector, business description, key people
- **Dividend History**: Last dividend, annual yield, dividend growth, upcoming dividends
- **Index Membership**: KSE-100, KMI30, etc.
- **Portfolio Position**: Shares, avg buy price, current value, return %, portfolio weight

## Implementation Steps

### 1. Create Data Fetching Function

**File**: `app/api/ai/insights/route.ts`

Add helper function before the POST handler to fetch enriched portfolio data:

```typescript
async function fetchEnrichedPortfolioData(stocks: any[]) {
  const { getSymbolPriceData } = await import('../../../../lib/symbolsStore');
  const { getCompaniesBySymbols } = await import('../../../../lib/companiesStore');
  const { getDividendSummary, calculateDividendYield } = await import('../../../../lib/dividendsStore');
  const { getLatestIndexPrice } = await import('../../../../lib/indicesStore');
  
  const symbols = stocks.map(s => s.symbol);
  
  // Fetch all data in parallel
  const [symbolsData, companiesData, kse100Data] = await Promise.all([
    Promise.all(symbols.map(s => getSymbolPriceData(s))),
    getCompaniesBySymbols(symbols),
    getLatestIndexPrice('KSE100'),
  ]);
  
  // Fetch dividend data for each symbol
  const dividendsData = await Promise.all(
    symbols.map(s => getDividendSummary(s).catch(() => null))
  );
  
  // Combine all data
  const enrichedData = stocks.map((stock, idx) => {
    const symbolData = symbolsData[idx];
    const companyData = companiesData.find(c => c.symbol === stock.symbol.toUpperCase());
    const dividendData = dividendsData[idx];
    
    return {
      ...stock,
      symbolData,
      companyData,
      dividendData,
    };
  });
  
  return { enrichedData, kse100Data };
}
```

### 2. Update Portfolio Mode Prompt

**File**: `app/api/ai/insights/route.ts` (lines 92-101)

Replace the basic portfolio prompt with a comprehensive one:

```typescript
} else if (mode === 'portfolio') {
  if (!Array.isArray(stocks) || stocks.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Invalid or empty stocks array.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  portfolioSymbols = stocks.map((s: any) => s.symbol);
  
  // Fetch enriched data
  const { enrichedData, kse100Data } = await fetchEnrichedPortfolioData(stocks);
  
  // Calculate portfolio metrics
  const totalInvestment = stocks.reduce((sum, s) => sum + (s.shares * s.avgBuy), 0);
  const currentValue = stocks.reduce((sum, s) => sum + (s.shares * s.currentPrice), 0);
  const totalReturn = ((currentValue - totalInvestment) / totalInvestment * 100);
  const totalReturnAmount = currentValue - totalInvestment;
  
  // Build detailed holdings breakdown
  const holdingsDetails = enrichedData.map((stock) => {
    const invested = stock.shares * stock.avgBuy;
    const current = stock.shares * stock.currentPrice;
    const returnPct = ((stock.currentPrice - stock.avgBuy) / stock.avgBuy * 100);
    const returnAmount = current - invested;
    const weight = ((current / currentValue) * 100);
    
    const symbolData = stock.symbolData;
    const companyData = stock.companyData;
    const dividendData = stock.dividendData;
    
    return {
      symbol: stock.symbol,
      name: symbolData?.name || stock.symbol,
      sector: symbolData?.sectorName || 'N/A',
      shares: stock.shares,
      avgBuy: stock.avgBuy,
      currentPrice: stock.currentPrice,
      invested: invested,
      currentValue: current,
      returnAmount: returnAmount,
      returnPct: returnPct,
      weight: weight,
      // Fundamentals
      peRatio: symbolData?.peRatio || null,
      pbRatio: symbolData?.pbRatio || null,
      eps: symbolData?.earningsPerShare || null,
      marketCap: symbolData?.marketCapString || symbolData?.marketCap || null,
      freeFloat: companyData?.freeFloatPercent || symbolData?.freeFloatPercent || null,
      volume: symbolData?.volume || null,
      week52High: symbolData?.weekRange52High || null,
      week52Low: symbolData?.weekRange52Low || null,
      // Dividends
      dividendYield: symbolData?.dividendYield || dividendData?.lastDividend?.amount || null,
      lastDividend: dividendData?.lastDividend?.amount || null,
      dividendCount: dividendData?.dividendCount || 0,
      // Index membership
      indices: symbolData?.listedIn || null,
    };
  });
  
  // Sector allocation
  const sectorAllocation = holdingsDetails.reduce((acc, stock) => {
    const sector = stock.sector || 'Other';
    const existing = acc.find(s => s.sector === sector);
    if (existing) {
      existing.value += stock.currentValue;
      existing.weight += stock.weight;
    } else {
      acc.push({ sector, value: stock.currentValue, weight: stock.weight });
    }
    return acc;
  }, [] as Array<{ sector: string; value: number; weight: number }>);
  
  // Sort sectors by weight
  sectorAllocation.sort((a, b) => b.weight - a.weight);
  
  // Find top performers
  const sortedByReturn = [...holdingsDetails].sort((a, b) => b.returnPct - a.returnPct);
  const topGainer = sortedByReturn[0];
  const topLoser = sortedByReturn[sortedByReturn.length - 1];
  
  // Calculate portfolio dividend income
  const totalDividendIncome = holdingsDetails.reduce((sum, stock) => {
    if (stock.lastDividend) {
      return sum + (stock.shares * stock.lastDividend);
    }
    return sum;
  }, 0);
  
  // Build prompt sections
  const portfolioOverview = `
**Portfolio Snapshot:**
- Total Investment: PKR ${totalInvestment.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Current Value: PKR ${currentValue.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Total Return: PKR ${totalReturnAmount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${totalReturn.toFixed(2)}%)
- Number of Holdings: ${stocks.length}
- Annual Dividend Income: PKR ${totalDividendIncome.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
${kse100Data ? `- KSE-100 Index: ${kse100Data.price.toFixed(2)} (${kse100Data.changePercent >= 0 ? '+' : ''}${kse100Data.changePercent.toFixed(2)}%)` : ''}
`;

  const sectorBreakdown = sectorAllocation.map(s => 
    `  - ${s.sector}: ${s.weight.toFixed(1)}% (PKR ${s.value.toLocaleString('en-PK', { maximumFractionDigits: 0 })})`
  ).join('\n');

  const holdingsTable = holdingsDetails.map(stock => {
    const valuation = [
      stock.peRatio ? `P/E: ${stock.peRatio.toFixed(1)}` : null,
      stock.pbRatio ? `P/B: ${stock.pbRatio.toFixed(2)}` : null,
      stock.dividendYield ? `Yield: ${stock.dividendYield.toFixed(2)}%` : null,
    ].filter(Boolean).join(', ') || 'N/A';
    
    return `
**${stock.symbol}** - ${stock.name} (${stock.sector})
  - Position: ${stock.shares} shares @ PKR ${stock.avgBuy.toFixed(2)} avg → Current: PKR ${stock.currentPrice.toFixed(2)}
  - Investment: PKR ${stock.invested.toLocaleString('en-PK', { maximumFractionDigits: 0 })} → Value: PKR ${stock.currentValue.toLocaleString('en-PK', { maximumFractionDigits: 0 })}
  - Return: PKR ${stock.returnAmount.toLocaleString('en-PK', { maximumFractionDigits: 0 })} (${stock.returnPct >= 0 ? '+' : ''}${stock.returnPct.toFixed(2)}%)
  - Portfolio Weight: ${stock.weight.toFixed(1)}%
  - Valuation: ${valuation}
  - Market Cap: ${stock.marketCap || 'N/A'} | Free Float: ${stock.freeFloat ? stock.freeFloat.toFixed(1) + '%' : 'N/A'}
  - 52-Week Range: ${stock.week52Low ? 'PKR ' + stock.week52Low.toFixed(2) : 'N/A'} - ${stock.week52High ? 'PKR ' + stock.week52High.toFixed(2) : 'N/A'}
  - Index: ${stock.indices || 'Not listed in major indices'}`;
  }).join('\n');

  prompt = `You are a seasoned financial consultant at a leading wealth management firm in Pakistan, conducting a comprehensive portfolio review for your client. Write your analysis in an engaging, professional blog style that balances expertise with accessibility.

${portfolioOverview}

**Sector Allocation:**
${sectorBreakdown}

**Holdings Analysis:**
${holdingsTable}

**Performance Highlights:**
- Top Performer: ${topGainer.symbol} (${topGainer.returnPct >= 0 ? '+' : ''}${topGainer.returnPct.toFixed(2)}% return)
- Weakest Performer: ${topLoser.symbol} (${topLoser.returnPct >= 0 ? '+' : ''}${topLoser.returnPct.toFixed(2)}% return)

---

## Your Task: Comprehensive Portfolio Review

Write a detailed, insightful portfolio review as if you're publishing it on a premium financial blog. Use a professional yet conversational tone that engages retail investors.

### Structure Your Response:

#### 1. Executive Summary (2-3 paragraphs)
Open with a compelling overview of the portfolio's current state. How is it performing? What's the overall health? Lead with the most important insights that will grab the reader's attention.

#### 2. Performance Analysis
Evaluate the portfolio's ${totalReturn >= 0 ? 'gains' : 'losses'} in context:
- Compare to KSE-100 benchmark performance
- Assess if returns are adequate given the risk profile
- Highlight what's driving performance (individual stocks, sectors)

#### 3. Portfolio Composition Deep Dive

**A) Sector Diversification**
- Analyze sector allocation: Is it well-diversified or concentrated?
- Which sectors are overweight/underweight?
- Any sector concentration risks (>30% in one sector is concerning)?
- Recommend optimal sector mix for Pakistani market conditions

**B) Individual Stock Assessment**
For each major holding (>10% weight), provide:
- **Valuation Check**: Is the P/E ratio attractive compared to sector average? P/B ratio reasonable?
- **Growth Trajectory**: Based on the fundamentals, is this stock in growth, value, or distress territory?
- **Dividend Quality**: For dividend-paying stocks, is the yield sustainable?
- **Risk Factors**: Free float concerns? Liquidity issues? Overvaluation risks?

#### 4. Risk Assessment
Be candid about risks:
- **Concentration Risk**: Flag any single position >20% (high risk) or >15% (moderate concern)
- **Sector Concentration**: Warn if >40% in one sector
- **Valuation Risk**: Identify overvalued positions (high P/E with low growth)
- **Liquidity Risk**: Low free float or low volume stocks
- **Market Conditions**: How vulnerable is this portfolio to market corrections?

#### 5. Income Generation
- Evaluate dividend income strategy
- Calculate approximate dividend yield for the portfolio
- Suggest if income generation can be improved

#### 6. Actionable Recommendations

Provide specific, prioritized recommendations:

**Immediate Actions** (Next 30 days):
- Stocks to trim/exit (with reasoning)
- Rebalancing moves to reduce concentration
- Risk mitigation steps

**Strategic Moves** (Next 3-6 months):
- Sectors to add exposure to
- Types of stocks to consider (growth/value/dividend)
- Diversification opportunities

**Watchlist Ideas**:
- Suggest 3-5 PSX stocks that could complement this portfolio

#### 7. Closing Thoughts
End with an encouraging yet realistic perspective. Summarize the 2-3 most critical actions and the expected outcome if implemented.

---

### Writing Guidelines:
- **Tone**: Professional financial consultant meets engaging blogger
- **Style**: Use subheadings, bullet points, and short paragraphs for readability
- **Language**: Avoid jargon where possible; explain technical terms briefly
- **Formatting**: Use **bold** for emphasis, bullet points for lists
- **Length**: Be comprehensive but respect the reader's time (aim for blog-post length, not a book)
- **Honesty**: Be direct about weaknesses; investors appreciate candor
- **Actionability**: Every section should lead to insights or actions

Begin your portfolio review now:`;

}
```

### 3. Add Required Imports

**File**: `app/api/ai/insights/route.ts` (after existing imports)

The imports will be dynamically loaded in the helper function, so no changes needed to top-level imports.

### 4. Update Modal UI (Optional Enhancement)

**File**: `components/AIInsightsModal.tsx` (line 169)

Update the button label to reflect the enhanced analysis:

```typescript
<p className="font-semibold text-slate-900 dark:text-slate-100">Portfolio Review</p>
<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
  Comprehensive analysis by AI consultant
</p>
```

## Expected Output

The AI will generate responses like:

> **Your Portfolio at a Glance: Solid Foundation with Room to Optimize**

>

> Looking at your PKR 500,000 portfolio, I see a story of measured growth and strategic diversification. With an overall return of 12.5%, you're outpacing many conservative investors...

>

> ### Performance Analysis

> Your portfolio's 12.5% return is commendable, especially when...

>

> [etc.]

## Testing Strategy

1. Test with a small portfolio (2-3 stocks)
2. Test with a larger portfolio (10+ stocks)
3. Test with missing data (some stocks without dividend history)
4. Verify formatting and readability
5. Check cache behavior (should cache by portfolio symbols)

## Benefits

✅ Rich, data-driven insights using real fundamentals

✅ Professional financial consultant tone

✅ Engaging blog-style format for readability

✅ Actionable recommendations specific to each portfolio

✅ Comprehensive risk assessment

✅ Sector and stock-level analysis

✅ Benchmark comparison (KSE-100)

✅ Dividend income evaluation