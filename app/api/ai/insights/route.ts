import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getCachedAnalysis, saveAnalysis, saveChatHistory } from '../../../../lib/aiAnalysisCache';
import { getUserFromRequest } from '../../../../lib/jwt';
import { saveSymbolPriceData, SymbolPriceData } from '../../../../lib/symbolsStore';

const companyUrl2 = `https://dps.psx.com.pk/company/`;
const companyUrl = `https://sarmaaya.pk/stocks/`;


if (!process.env.GEMINI_API_KEY) {
  console.warn('Warning: GEMINI_API_KEY is not set. AI insights will not work.');
}

export const runtime = 'nodejs';

// Helper function to fetch enriched portfolio data
async function fetchEnrichedPortfolioData(stocks: { symbol: string; shares: number; avgBuy: number; currentPrice: number }[]) {
  const { getSymbolPriceData } = await import('../../../../lib/symbolsStore');
  const { getCompaniesBySymbols } = await import('../../../../lib/companiesStore');
  const { getDividendSummary } = await import('../../../../lib/dividendsStore');
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
  console.log('enrichedData', enrichedData);
  console.log('kse100Data', kse100Data);
  return { enrichedData, kse100Data };
}

// Helper function to fetch enriched data for a single stock
async function fetchEnrichedStockData(symbol: string) {
  const { getSymbolPriceData } = await import('../../../../lib/symbolsStore');
  const { getCompaniesBySymbols } = await import('../../../../lib/companiesStore');
  const { getDividendSummary } = await import('../../../../lib/dividendsStore');
  const { getLatestIndexPrice } = await import('../../../../lib/indicesStore');

  // Fetch all data in parallel
  const [symbolData, companiesData, dividendData, kse100Data] = await Promise.all([
    getSymbolPriceData(symbol),
    getCompaniesBySymbols([symbol]),
    getDividendSummary(symbol).catch(() => null),
    getLatestIndexPrice('KSE100'),
  ]);

  const companyData = companiesData.find(c => c.symbol === symbol.toUpperCase());

  return {
    symbolData,
    companyData,
    dividendData,
    kse100Data,
  };
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY is not configured.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { stocks, mode, symbol, forceRefresh, message, conversationHistory, context } = body;

    const user = await getUserFromRequest(request);
    const userId = user?.email || '';

    console.log('AI Insights request:', { mode, symbol, stocksLength: stocks?.length, forceRefresh, hasMessage: !!message });

    if (!mode) {
      console.error('Missing mode parameter');
      return new Response(
        JSON.stringify({ success: false, error: 'Mode parameter is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Skip cache check for symbols and chat modes (they have their own logic)
    if (!forceRefresh && mode !== 'symbols' && mode !== 'chat') {
      const portfolioSymbols = mode === 'portfolio' && Array.isArray(stocks)
        ? stocks.map((s: { symbol: string }) => s.symbol)
        : undefined;
      console.log('portfolioSymbols', portfolioSymbols);
      const cached = await getCachedAnalysis(mode, symbol, portfolioSymbols);
      console.log('cached', cached);

      if (cached) {
        const encoder = new TextEncoder();
        const cacheMetadata = `[Cached Analysis - Generated: ${cached.createdAt.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}]\n\n`;

        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(cacheMetadata));
            controller.enqueue(encoder.encode(cached.content));
            controller.close();
          },
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Cache-Hit': 'true',
            'X-Cache-Date': cached.createdAt.toISOString(),
          },
        });
      }
    }

    let prompt = '';
    let portfolioSymbols: string[] | undefined;

    if (mode === 'stock') {
      if (!symbol || typeof symbol !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Invalid symbol provided for stock mode.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Fetch enriched data for the stock
      const { symbolData, companyData, dividendData, kse100Data } = await fetchEnrichedStockData(symbol);

      // Extract investment data if user owns the stock
      const investmentData = body.investmentData as { shares?: number; avgBuy?: number; currentPrice?: number } | undefined;
      const hasInvestment = investmentData && investmentData.shares && investmentData.avgBuy;

      // Build stock overview
      const stockOverview = `
**Stock Overview - ${symbol.toUpperCase()}:**
${symbolData?.name ? `- Company: ${symbolData.name}` : ''}
${symbolData?.sectorName ? `- Sector: ${symbolData.sectorName}` : ''}
- Current Price: PKR ${symbolData?.currentPrice?.toFixed(2) || 'N/A'}
- Price Change: ${symbolData?.priceChange ? (symbolData.priceChange >= 0 ? '+' : '') + symbolData.priceChange.toFixed(2) : 'N/A'} (${symbolData?.priceChangePercent ? (symbolData.priceChangePercent >= 0 ? '+' : '') + symbolData.priceChangePercent.toFixed(2) + '%' : 'N/A'})
- Volume: ${symbolData?.volume ? symbolData.volume.toLocaleString() : 'N/A'}
- Trades: ${symbolData?.trades ? symbolData.trades.toLocaleString() : 'N/A'}
- Value: PKR ${symbolData?.value ? (symbolData.value / 1_000_000).toFixed(2) + 'M' : 'N/A'}
${kse100Data ? `- KSE-100 Index: ${kse100Data.price.toFixed(2)} (${kse100Data.changePercent >= 0 ? '+' : ''}${kse100Data.changePercent.toFixed(2)}%)` : ''}
`;

      // Valuation metrics
      const valuationMetrics = `
**Valuation Metrics:**
- Market Cap: ${symbolData?.marketCapString || symbolData?.marketCap?.toLocaleString() || 'N/A'}
- P/E Ratio: ${symbolData?.peRatio?.toFixed(2) || 'N/A'}
- P/B Ratio: ${symbolData?.pbRatio?.toFixed(2) || 'N/A'}
- EPS: PKR ${symbolData?.earningsPerShare?.toFixed(2) || 'N/A'}
- Dividend Yield: ${symbolData?.dividendYield?.toFixed(2) || 'N/A'}%
- Free Float: ${companyData?.freeFloatPercent?.toFixed(1) || symbolData?.freeFloatPercent?.toFixed(1) || 'N/A'}%
- Shares Outstanding: ${symbolData?.sharesOutstanding ? symbolData.sharesOutstanding.toLocaleString() : 'N/A'}
`;

      // 52-Week performance
      const weekPerformance = `
**52-Week Performance:**
- High: PKR ${symbolData?.weekRange52High?.toFixed(2) || 'N/A'}
- Low: PKR ${symbolData?.weekRange52Low?.toFixed(2) || 'N/A'}
- Current vs 52W High: ${symbolData?.weekRange52High && symbolData?.currentPrice
          ? ((symbolData.currentPrice - symbolData.weekRange52High) / symbolData.weekRange52High * 100).toFixed(2) + '%'
          : 'N/A'}
- Current vs 52W Low: ${symbolData?.weekRange52Low && symbolData?.currentPrice
          ? ((symbolData.currentPrice - symbolData.weekRange52Low) / symbolData.weekRange52Low * 100).toFixed(2) + '%'
          : 'N/A'}
`;

      // Dividend information
      const dividendInfo = dividendData ? `
**Dividend Information:**
- Last Dividend: PKR ${dividendData.lastDividend?.amount?.toFixed(2) || 'N/A'} per share
- Dividend Count (Historical): ${dividendData.dividendCount || 0}
- Total Dividends Paid: PKR ${dividendData.totalDividends?.toFixed(2) || 'N/A'}
${dividendData.lastDividend?.announcementDate ? `- Last Announcement: ${new Date(dividendData.lastDividend.announcementDate).toLocaleDateString()}` : ''}
` : '\n**Dividend Information:**\n- No dividend data available\n';

      // Investment position (if owned)
      let investmentPosition = '';
      let returnPct = 0;
      if (hasInvestment && investmentData) {
        const shares = investmentData.shares!;
        const avgBuy = investmentData.avgBuy!;
        const currentPrice = investmentData.currentPrice || symbolData?.currentPrice || 0;
        const invested = shares * avgBuy;
        const currentValue = shares * currentPrice;
        const returnAmount = currentValue - invested;
        returnPct = ((currentPrice - avgBuy) / avgBuy * 100);

        investmentPosition = `
**Your Investment Position:**
- Shares Owned: ${shares.toLocaleString()}
- Average Buy Price: PKR ${avgBuy.toFixed(2)}
- Current Price: PKR ${currentPrice.toFixed(2)}
- Amount Invested: PKR ${invested.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Current Value: PKR ${currentValue.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Gain/Loss: PKR ${returnAmount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%)
${dividendData?.lastDividend?.amount ? `- Estimated Annual Dividend Income: PKR ${(shares * dividendData.lastDividend.amount).toLocaleString('en-PK', { minimumFractionDigits: 2 })}` : ''}
`;
      }

      // Index membership
      const indexMembership = symbolData?.listedIn ? `
**Index Membership:**
- Listed in: ${symbolData.listedIn}
` : '';

      prompt = `You are a seasoned equity research analyst at a leading Pakistani brokerage firm, preparing a comprehensive stock report for ${symbol.toUpperCase()}. Write your analysis in an engaging, professional blog style that balances technical expertise with accessibility for retail investors.

${stockOverview}
${valuationMetrics}
${weekPerformance}
${dividendInfo}
${investmentPosition}
${indexMembership}

---

## Your Task: Comprehensive Stock Analysis Report

Write a detailed, insightful stock analysis report as if you're publishing it on a premium financial research platform. Use a professional yet conversational tone that engages retail investors.

### Structure Your Response:

#### 1. Executive Summary (2-3 paragraphs)
Open with a compelling overview of ${symbol.toUpperCase()}'s current state. What's the investment thesis? What are the key highlights? Lead with the most important insights that will grab the reader's attention.

#### 2. Fundamental Analysis

**A) Valuation Assessment**
- Is the stock fairly valued, overvalued, or undervalued?
- Analyze P/E ratio in context of sector averages and growth prospects
- Evaluate P/B ratio - is it trading above or below book value, and why?
- Assess EPS trend and quality of earnings

**B) Financial Health**
- Market capitalization and company size
- Free float analysis - liquidity considerations
- Dividend policy and sustainability (if applicable)

#### 3. Market Performance Analysis
- Evaluate the ${symbolData?.priceChangePercent ? (symbolData.priceChangePercent >= 0 ? 'positive' : 'negative') : ''} price movement
- 52-week performance context - where is the stock in its range?
- Volume and liquidity analysis
- Compare performance to KSE-100 benchmark

#### 4. Technical Indicators
- Current price positioning (near 52W high/low?)
- Volume trends and trading activity
- Support and resistance levels based on 52-week range
- Market sentiment indicators

${hasInvestment ? `
#### 5. Your Investment Position Review
- Evaluate your ${investmentData?.shares} shares position
- Performance analysis: ${returnPct >= 0 ? 'gains' : 'losses'} of ${Math.abs(returnPct).toFixed(2)}%
- Should you hold, add more, or consider taking profits?
- Risk-reward assessment for your specific entry price
` : `
#### 5. Investment Recommendation
- Is this a good entry point for new investors?
- Price targets and potential upside/downside
- Ideal allocation size in a balanced portfolio
`}

#### 6. Risk Assessment
Be candid about risks:
- **Valuation Risk**: Any red flags in P/E, P/B multiples?
- **Liquidity Risk**: Free float and average volume concerns?
- **Sector Risk**: Industry-specific challenges?
- **Market Risk**: Sensitivity to market corrections?
${hasInvestment ? `- **Position Risk**: Is your exposure appropriate for your portfolio?` : ''}

#### 7. Sector Context
- How does ${symbol.toUpperCase()} compare to sector peers?
- Industry trends and outlook
- Competitive positioning

#### 8. Key Catalysts & Watch Points
- Upcoming events or announcements to watch
- Factors that could drive price movement
- Warning signs to monitor

#### 9. Final Verdict
- Clear investment rating (Strong Buy / Buy / Hold / Sell / Strong Sell)
- Target price range (next 3-6 months)
- Investment horizon suitability (short-term trade vs long-term hold)
${hasInvestment ? `- Specific action recommendation for your position` : ''}
- 2-3 sentence bottom line

---

### Writing Guidelines:
- **Tone**: Professional equity analyst meets engaging financial blogger
- **Style**: Use subheadings, bullet points, and short paragraphs for readability
- **Language**: Explain technical terms briefly; be accessible but sophisticated
- **Formatting**: Use **bold** for emphasis, bullet points for lists
- **Length**: Comprehensive but respect the reader's time (aim for detailed blog-post length)
- **Honesty**: Be direct about risks and weaknesses; investors appreciate candor
- **Actionability**: Provide clear, specific recommendations backed by data

Begin your stock analysis report now:`;

    } else if (mode === 'portfolio') {
      console.log('portfolio mode: stocks', stocks);
      if (!Array.isArray(stocks) || stocks.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Invalid or empty stocks array.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      portfolioSymbols = stocks.map((s: { symbol: string }) => s.symbol);

      // Fetch enriched data
      const { enrichedData, kse100Data } = await fetchEnrichedPortfolioData(stocks);

      // Calculate portfolio metrics
      const totalInvestment = stocks.reduce((sum, s) => sum + (s.shares * s.avgBuy), 0);
      const currentValue = stocks.reduce((sum, s) => sum + (s.shares * s.currentPrice), 0);
      // Fetch dividend income for user
      const { netDividend = 0, taxDeducted = 0, zakatDeducted = 0 } = await import('../../../../lib/dividendUtils').then(m => m.getUserDividendIncome(userId));
      const totalReturnAmount = currentValue - totalInvestment + netDividend;
      const totalReturn = (totalReturnAmount / totalInvestment) * 100;

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
      const totalDividendIncome = netDividend;

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

    } else if (mode === 'market') {
      prompt = `Summarize today's market trends for the Pakistan Stock Exchange (PSX). Include key indices performance, notable gainers and losers, and overall market sentiment. Keep the response concise and informative. you can use this url to get the latest market data: https://dps.psx.com.pk/`;
    } else if (mode === 'symbols') {
      if (!symbol || typeof symbol !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Invalid symbol provided for symbols mode.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      const url = `${companyUrl}${symbol.toUpperCase()}`;
      console.log('url', url);
      prompt = `Extract structured data for symbol ${symbol.toUpperCase()} from the Pakistan Stock Exchange (PSX). Visit this URL: ${url} and return ONLY a valid JSON object (no markdown, no explanations) with the following exact structure:
      {
        "symbol": "string",
        "currentPrice": number,
        "priceOpen": number,
        "priceClose": number,
        "priceHigh": number,
        "priceLow": number,
        "dayRangeLow": number,
        "dayRangeHigh": number,
        "weekRange52Low": number,
        "weekRange52High": number,
        "priceChange": number,
        "priceChangePercent": number,
        "volume": number,
        "weeklyAverageVolume": number,
        "marketCap": number,
        "sharesOutstanding": number,
        "freeFloatShares": number,
        "freeFloatPercent": number,
        "peRatio": number,
        "pbRatio": number,
        "dividendYield": number,
        "earningsPerShare": number,
        "netIncomeMargin": number,
        "trades": number,
        "value": number,
        "circuitBreakerLower": number,
        "circuitBreakerUpper": number,
        "bidPrice": number,
        "askPrice": number,
        "bidVolume": number,
        "askVolume": number
      }
      
      Extract all numeric values as numbers (not strings). If a field is not available, use null. Return ONLY the JSON, no other text.`;

    } else if (mode === 'chat') {
      if (!message || typeof message !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Message is required for chat mode.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Detect intent and fetch relevant context
      const messageLower = message.toLowerCase();
      let contextData = '';
      let portfolioSymbols: string[] | undefined;

      // Portfolio context
      if (messageLower.includes('portfolio') || messageLower.includes('holdings') || messageLower.includes('my stocks') || (Array.isArray(stocks) && stocks.length > 0)) {
        if (Array.isArray(stocks) && stocks.length > 0) {
          portfolioSymbols = stocks.map((s: { symbol: string }) => s.symbol);
          const { enrichedData, kse100Data } = await fetchEnrichedPortfolioData(stocks);

          const totalInvestment = stocks.reduce((sum: number, s: { shares: number; avgBuy: number }) => sum + (s.shares * s.avgBuy), 0);
          const currentValue = stocks.reduce((sum: number, s: { shares: number; currentPrice: number }) => sum + (s.shares * s.currentPrice), 0);
          const totalReturn = ((currentValue - totalInvestment) / totalInvestment * 100);

          contextData += `\n\n**PORTFOLIO CONTEXT:**\n`;
          contextData += `- Total Holdings: ${stocks.length}\n`;
          contextData += `- Total Investment: PKR ${totalInvestment.toLocaleString('en-PK', { minimumFractionDigits: 2 })}\n`;
          contextData += `- Current Value: PKR ${currentValue.toLocaleString('en-PK', { minimumFractionDigits: 2 })}\n`;
          contextData += `- Total Return: ${totalReturn.toFixed(2)}%\n`;
          contextData += `- Holdings: ${stocks.map((s: { symbol: string; shares: number; avgBuy: number }) => `${s.symbol} (${s.shares} shares @ PKR ${s.avgBuy.toFixed(2)})`).join(', ')}\n`;
          if (kse100Data) {
            contextData += `- KSE-100 Index: ${kse100Data.price.toFixed(2)} (${kse100Data.changePercent >= 0 ? '+' : ''}${kse100Data.changePercent.toFixed(2)}%)\n`;
          }
        }
      }

      // Symbol context
      if (context?.symbol || messageLower.match(/\b[A-Z]{2,5}\b/)) {
        const symbolToAnalyze = context?.symbol || message.match(/\b([A-Z]{2,5})\b/)?.[1];
        if (symbolToAnalyze) {
          const { symbolData, companyData, dividendData, kse100Data } = await fetchEnrichedStockData(symbolToAnalyze);

          contextData += `\n\n**SYMBOL CONTEXT - ${symbolToAnalyze.toUpperCase()}:**\n`;
          if (symbolData) {
            contextData += `- Current Price: PKR ${symbolData.currentPrice?.toFixed(2) || 'N/A'}\n`;
            contextData += `- Change: ${symbolData.priceChangePercent ? (symbolData.priceChangePercent >= 0 ? '+' : '') + symbolData.priceChangePercent.toFixed(2) + '%' : 'N/A'}\n`;
            contextData += `- P/E: ${symbolData.peRatio?.toFixed(2) || 'N/A'}\n`;
            contextData += `- P/B: ${symbolData.pbRatio?.toFixed(2) || 'N/A'}\n`;
            contextData += `- Market Cap: ${symbolData.marketCapString || 'N/A'}\n`;
            if (dividendData?.lastDividend) {
              contextData += `- Last Dividend: PKR ${dividendData.lastDividend.amount.toFixed(2)}\n`;
            }
          }
        }
      }

      // Market context
      if (messageLower.includes('market') || messageLower.includes('kse') || messageLower.includes('index')) {
        const { getLatestIndexPrice } = await import('../../../../lib/indicesStore');
        const kse100Data = await getLatestIndexPrice('KSE100');
        if (kse100Data) {
          contextData += `\n\n**MARKET CONTEXT:**\n`;
          contextData += `- KSE-100 Index: ${kse100Data.price.toFixed(2)} (${kse100Data.changePercent >= 0 ? '+' : ''}${kse100Data.changePercent.toFixed(2)}%)\n`;
        }
      }

      // Build conversation history for context
      const conversationContext = conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0
        ? '\n\n**CONVERSATION HISTORY:**\n' + conversationHistory.slice(-5).map((msg: { role: string; content: string }) => `${msg.role}: ${msg.content}`).join('\n')
        : '';

      prompt = `You are a knowledgeable and friendly AI financial advisor specializing in the Pakistan Stock Exchange (PSX). You help users with portfolio analysis, stock recommendations, market insights, and investment advice.

${contextData}
${conversationContext}

**USER QUESTION:**
${message}

**INSTRUCTIONS:**
- Provide helpful, accurate, and actionable financial advice
- Use the context data provided above to give informed responses
- If the user asks about their portfolio, reference the portfolio data
- If the user asks about a specific stock, use the symbol context
- Be conversational and friendly, but professional
- Format your response with markdown for better readability (use headings, bullet points, bold text)
- If you don't have enough information, ask clarifying questions
- Always consider risk factors and provide balanced advice

Respond to the user's question:`;

    } else {
      console.error('Invalid mode received:', mode);
      return new Response(
        JSON.stringify({ error: `Invalid mode "${mode}". Use "portfolio", "market", "stock", "symbols", or "chat".` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const contents = [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ];

    // For symbols mode, extract structured JSON from cached analysis
    if (mode === 'symbols') {
      console.log('symbols mode: checking for cached analysis');

      // First, check if we have a cached analysis for this stock
      const cachedAnalysis = await getCachedAnalysis('stock', symbol);
      console.log('symbols cachedAnalysis', cachedAnalysis);
      if (!cachedAnalysis) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `No analysis found for ${symbol?.toUpperCase()}. Please analyze the stock first using "Analyze with AI" before fetching symbol data.`
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      console.log('symbols mode: found cached analysis, extracting JSON');

      // Ask Gemini to extract structured data from the analysis text
      const extractionPrompt = `Extract structured data from the following stock analysis and return ONLY a valid JSON object (no markdown, no explanations, no extra text) with this exact structure:
      {
        "symbol": "string",
        "currentPrice": number,
        "priceOpen": number,
        "priceClose": number,
        "priceHigh": number,
        "priceLow": number,
        "dayRangeLow": number,
        "dayRangeHigh": number,
        "weekRange52Low": number,
        "weekRange52High": number,
        "priceChange": number,
        "priceChangePercent": number,
        "volume": number,
        "weeklyAverageVolume": number,
        "marketCap": number,
        "sharesOutstanding": number,
        "freeFloatShares": number,
        "freeFloatPercent": number,
        "peRatio": number,
        "pbRatio": number,
        "dividendYield": number,
        "earningsPerShare": number,
        "netIncomeMargin": number,
        "trades": number,
        "value": number,
        "circuitBreakerLower": number,
        "circuitBreakerUpper": number,
        "bidPrice": number,
        "askPrice": number,
        "bidVolume": number,
        "askVolume": number
      }
      
      Extract all numeric values as numbers (not strings). If a field is not mentioned in the analysis, use null.
      
      Analysis to extract from:
      ${cachedAnalysis.content}`;


      const extractionContents = [
        {
          role: 'user',
          parts: [{ text: extractionPrompt }],
        },
      ];

      const result = await model.generateContent({
        contents: extractionContents,
      });
      const response = result.response;
      const text = response.text();
      console.log('symbols extraction response:', text.substring(0, 200));

      try {
        // Extract JSON from response (might be wrapped in markdown code blocks)
        let jsonText = text.trim();
        if (jsonText.startsWith('```json')) {
          jsonText = jsonText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
        } else if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```\s*/, '').replace(/```\s*$/, '');
        }

        const parsedData = JSON.parse(jsonText);
        console.log('symbols parsedData:', parsedData);

        // Validate and save to MongoDB
        // Validate and save to MongoDB
        const symbolData: SymbolPriceData = {
          symbol: symbol!.toUpperCase(),
          currentPrice: parsedData.currentPrice ?? null,
          priceOpen: parsedData.priceOpen ?? null,
          priceClose: parsedData.priceClose ?? null,
          priceHigh: parsedData.priceHigh ?? null,
          priceLow: parsedData.priceLow ?? null,
          dayRangeLow: parsedData.dayRangeLow ?? null,
          dayRangeHigh: parsedData.dayRangeHigh ?? null,
          weekRange52Low: parsedData.weekRange52Low ?? null,
          weekRange52High: parsedData.weekRange52High ?? null,
          priceChange: parsedData.priceChange ?? null,
          priceChangePercent: parsedData.priceChangePercent ?? null,
          volume: parsedData.volume ?? null,
          weeklyAverageVolume: parsedData.weeklyAverageVolume ?? null,
          marketCap: parsedData.marketCap ?? null,
          sharesOutstanding: parsedData.sharesOutstanding ?? null,
          freeFloatShares: parsedData.freeFloatShares ?? null,
          freeFloatPercent: parsedData.freeFloatPercent ?? null,
          peRatio: parsedData.peRatio ?? null,
          pbRatio: parsedData.pbRatio ?? null,
          dividendYield: parsedData.dividendYield ?? null,
          earningsPerShare: parsedData.earningsPerShare ?? null,
          netIncomeMargin: parsedData.netIncomeMargin ?? null,
          trades: parsedData.trades ?? null,
          value: parsedData.value ?? null,
          circuitBreakerLower: parsedData.circuitBreakerLower ?? null,
          circuitBreakerUpper: parsedData.circuitBreakerUpper ?? null,
          bidPrice: parsedData.bidPrice ?? null,
          askPrice: parsedData.askPrice ?? null,
          bidVolume: parsedData.bidVolume ?? null,
          askVolume: parsedData.askVolume ?? null,
          lastFetchedAt: new Date(),
        };


        console.log('symbols symbolData:', symbolData);
        await saveSymbolPriceData(symbolData);
        console.log('symbols saved successfully to database');

        return new Response(
          JSON.stringify({
            success: true,
            message: `Structured data for ${symbol!.toUpperCase()} extracted and saved successfully.`,
            data: symbolData
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      } catch (parseError) {
        console.error('Failed to parse symbol data:', parseError);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to extract structured data. The AI response was not valid JSON.',
            rawResponse: text.substring(0, 500)
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // For other modes, use streaming response
    const result = await model.generateContentStream(prompt);

    const encoder = new TextEncoder();
    let fullContent = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              fullContent += chunkText;
              controller.enqueue(encoder.encode(chunkText));
            }
          }
          controller.close();

          // Save to cache after streaming completes (skip for chat mode - handled separately)
          if (fullContent && mode !== 'chat') {
            await saveAnalysis(mode, fullContent, symbol, portfolioSymbols);
          }

          // Save chat history for chat mode
          if (fullContent && mode === 'chat') {
            const user = getUserFromRequest(request);
            if (user?.email) {
              const chatMessages = [
                ...(conversationHistory || []),
                { role: 'user' as const, content: message, timestamp: new Date() },
                { role: 'assistant' as const, content: fullContent, timestamp: new Date() },
              ];
              await saveChatHistory(user.email, chatMessages, context);
            }
          }
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Transfer-Encoding': 'chunked',
        'X-Cache-Hit': 'false',
      },
    });
  } catch (error) {
    console.error('AI insights error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate AI insights.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

