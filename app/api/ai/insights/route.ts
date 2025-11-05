import { NextRequest } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getCachedAnalysis, saveAnalysis } from '../../../../lib/aiAnalysisCache';
import { saveSymbolPriceData, SymbolPriceData } from '../../../../lib/symbolsStore';

const companyUrl2 = `https://dps.psx.com.pk/company/`;
const companyUrl = `https://sarmaaya.pk/stocks/`;


if (!process.env.GEMINI_API_KEY) {
  console.warn('Warning: GEMINI_API_KEY is not set. AI insights will not work.');
}

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY is not configured.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { stocks, mode, symbol, forceRefresh } = body;

    console.log('AI Insights request:', { mode, symbol, stocksLength: stocks?.length, forceRefresh });

    if (!mode) {
      console.error('Missing mode parameter');
      return new Response(
        JSON.stringify({ success: false, error: 'Mode parameter is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Skip cache check for symbols mode (it has its own logic)
    if (!forceRefresh && mode !== 'symbols') {
      const portfolioSymbols = mode === 'portfolio' && Array.isArray(stocks)
        ? stocks.map((s: any) => s.symbol)
        : undefined;

      const cached = await getCachedAnalysis(mode, symbol, portfolioSymbols);

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
      const url = `${companyUrl}${symbol.toUpperCase()}`;
      console.log('url', url);
      prompt = `Analyze the stock ${symbol.toUpperCase()} from the Pakistan Stock Exchange (PSX). Provide a comprehensive analysis including: 
      Price Open, Price Close, Price High, Price Low, Current Price, Day's Range, 52-Week High Price, 52-Week Low Price, 52-Week Range, Price Change and Percentage, 
      Trading Volume, Weekly Average Volume, Market Capitalization, Shares Outstanding, Free Float Shares, Free Float %, 
      Price to Earnings (P/E), Price to Book Value (P/B), Dividend Yield (%), Earnings Per Share (EPS), Net Income Margin, 
      Market Performance Summary, and Key Insights. 
      Use this URL for reference: ${url}. Format the response clearly with sections, headings, and bullet points.`;

    } else if (mode === 'portfolio') {
      if (!Array.isArray(stocks) || stocks.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Invalid or empty stocks array.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      portfolioSymbols = stocks.map((s: any) => s.symbol);
      const symbolList = portfolioSymbols.join(', ');
      prompt = `Get the latest price data for these Pakistan Stock Exchange (PSX) symbols: ${symbolList}. For each symbol, provide the current price, price change, and percentage change if available. Format the response clearly and concisely.`;
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

    } else {
      console.error('Invalid mode received:', mode);
      return new Response(
        JSON.stringify({ error: `Invalid mode "${mode}". Use "portfolio", "market", "stock", or "symbols".` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const tools = [{ urlContext: {} }];
    const config = {
      thinkingConfig: {
        thinkingBudget: -1,
      },
      tools,
    };

    const model = 'gemini-2.5-flash';
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

      const response = await ai.models.generateContent({
        model,
        contents: extractionContents,
      });

      const text = response.text || '';
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
    const response = await ai.models.generateContentStream({
      model,
      config,
      contents,
    });

    const encoder = new TextEncoder();
    let fullContent = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            if (chunk.text) {
              fullContent += chunk.text;
              controller.enqueue(encoder.encode(chunk.text));
            }
          }
          controller.close();

          // Save to cache after streaming completes
          if (fullContent) {
            await saveAnalysis(mode, fullContent, symbol, portfolioSymbols);
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

