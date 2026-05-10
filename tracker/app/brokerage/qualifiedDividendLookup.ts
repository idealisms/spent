// Estimated qualified dividend fractions by ticker, based on prior-year fund
// distributions. These are stable year-over-year for broad index funds.
// Sources: Vanguard tax center, Schwab fund documents, IRS qualified dividend rules.
//
// Bond funds and money markets pay interest, not dividends → 0%.
// Domestic equity ETFs/funds → near 100% (all US corp dividends).
// International equity → partial, depending on tax treaties (~60-65%).
// Individual US stocks → 100% (assuming >60 day holding period met).
const QUALIFIED_DIVIDEND_LOOKUP: Record<string, number> = {
  // Individual US stocks
  AAPL:  1.00,
  GOOG:  1.00,
  GOOGL: 1.00,

  // Schwab funds
  SWPPX: 1.00, // Schwab S&P 500 Index — all domestic large cap

  // Vanguard bond / money market — interest income, never qualified
  BND:   0.00, // Vanguard Total Bond Market ETF
  VBTLX: 0.00, // Vanguard Total Bond Market Index Admiral
  VMFXX: 0.00, // Vanguard Federal Money Market Fund

  // Vanguard domestic equity — highly qualified
  VLGSX: 0.99, // Vanguard Large-Cap Index Admiral
  VOO:   1.00, // Vanguard S&P 500 ETF
  VTI:   0.85, // Vanguard Total Stock Market ETF (includes small cap, slightly lower)

  // Vanguard international equity — partially qualified via tax treaties
  VEUSX: 0.65, // Vanguard European Stock Index Admiral
  VXUS:  0.63, // Vanguard Total International Stock ETF
};

export default QUALIFIED_DIVIDEND_LOOKUP;
