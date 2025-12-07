# === Coding Style Guide for GitHub Copilot (PSX Portfolio App) ===
# This project uses:
# - Next.js 15 App Router
# - React Native (Expo) (Planned, not implemented yet)
# - MongoDB + Mongoose
# - Gemini GenAI
# - Portfolio analytics for Pakistan Stock Exchange (PSX)
# - Modular service/controller architecture

# ================================================================
# General Code Principles
# ================================================================
- Always write clean, modular, reusable code.
- Prefer pure functions for portfolio calculations.
- Prefer async/await with try/catch. No .then() chains.
- Use named exports unless exporting a component as default (e.g., `ChartClient.jsx`).
- Follow a service-layer-first mindset for all data logic.
- Keep files short and focused; create helpers instead of long components (e.g., modularize `AIInsightsModal.tsx`).

# ================================================================
# Naming Conventions
# ================================================================
- API routes: lowercase-with-hyphens.
- Controllers: PascalCase, suffix with "Controller" (Planned, not explicitly implemented).
- Services: PascalCase, suffix with "Service".
- Mongo models: PascalCase, singular.
- Utility functions: camelCase.
- React components and screens: PascalCase.
- Variables for prices:
  - currentPrice
  - changePercent
  - averagePrice
- Portfolio keys:
  - totalValue
  - investedAmount
  - gainLoss
  - gainLossPercent

# ================================================================
# Directory Structure
# ================================================================
Follow this structure when generating or suggesting code:

/app (Next.js)
  /api
    /portfolio
    /company
    /auth
    /analysis
    /symbols
  /dashboard (Planned, not implemented)
  /holdings (Planned, not implemented)
  /insights (Planned, not implemented)

/src
  /services (Planned, not implemented)
  /models
  /utils
    /psx (Planned, not implemented)
    /portfolio
    /numbers

# ================================================================
# MongoDB/Mongoose Style Rules
# ================================================================
- Always use `.lean()` for read queries.
- Always project fields to avoid overfetching.
- Always validate user roles before returning sensitive fields.
- Never return unnecessary fields like __v, passwords, tokens.
- Prefer indexes for:
  - symbol
  - userId
  - createdAt

Example optimal pattern:
const company = await Company.findOne({ symbol })
  .select("symbol name sector lastPrice marketCap")
  .lean();

# ================================================================
# API Route Standards
# ================================================================
Every API endpoint must follow this structure:

1. Validate params & body
2. Call service
3. Return consistent response shape:
{
  success: true/false,
  data: {},
  error: null | string
}

4. Never expose raw errors → log internally, return clean error.

# ================================================================
# Controller Style
# ================================================================
A controller should:
- Only orchestrate service calls.
- Perform minimal validation.
- Format API response consistently.

Example structure:
export async function getPortfolioController(req) {
  try {
    const userId = req.user.id;
    const data = await PortfolioService.getUserPortfolio(userId);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: "Failed to get portfolio" };
  }
}

# ================================================================
# Service Layer Standards
# ================================================================
Services:
- Must contain business logic.
- Must not depend on HTTP layer.
- Must throw clean Error messages (no raw Mongo errors).
- Prefer composable helpers inside /utils.

Example service pattern:
class PortfolioService {
  static async calculateOverview(holdings) {
    const totalValue = ...
    const investedAmount = ...
    return { totalValue, investedAmount, gainLoss };
  }
}

# ================================================================
# PSX-Specific Rules
# ================================================================
- Symbol must always be uppercase.
- Always map symbol → sector → index using unified helper (Planned, not implemented).
- If price is missing, service should fallback to:
  - last known PSX price
  - cache
  - manual override table

Price structure:
{
  symbol,
  currentPrice,
  previousClose,
  changeAmount,
  changePercent,
  volume
}

# ================================================================
# Portfolio Calculations Rules
# ================================================================
- All math belongs in /utils/portfolio.
- Use pure functions.
- Always calculate:
  - gainLoss
  - gainLossPercent
  - sector allocation
  - top gainers & losers
  - unrealized vs realized
  - contribution-to-portfolio (% weight)

Example function signature:
calculateHoldingStats({ shares, averagePrice, currentPrice })

Return shape:
{
  currentValue,
  investedAmount,
  gainLoss,
  gainLossPercent,
  weightPercent
}

# ================================================================
# React / Next.js UI Standards
# ================================================================
- Components must be clean and stateless whenever possible.
- Use custom hooks for data fetching.
- Use React Query where possible (Planned, not implemented).
- Use skeleton loaders on all screens.
- Avoid inline styles; prefer Tailwind for web.

# ================================================================
# Error Handling Rules
# ================================================================
- Never expose system messages.
- Use unified error utility: errorResponse(message, code) (Planned, not implemented).
- Ensure all Gemini calls have fallbacks and field validation.

# ================================================================
# Gemini GenAI Integration Rules
# ================================================================
- All prompts stored in /ai/prompts (Planned, not implemented).
- All function calling definitions stored in /ai/functions (Planned, not implemented).
- AI helpers must:
  - Structure data before sending
  - Validate missing PSX data
  - Provide disclaimers for uncertain information

Prompt structure:
"""
You are an AI analyzing a PSX company. Use only provided data:
{{company}}
{{price}}
{{financials}}
"""

# ================================================================
# Commit Message Style
# ================================================================
Follow this pattern:

feat: adding portfolio insights engine  
fix: correcting sector mapping for PSX symbols  
refactor: moving portfolio math to utils  
chore: updating dependencies  
docs: improving README

# === End of Copilot Coding Style Guide ===
