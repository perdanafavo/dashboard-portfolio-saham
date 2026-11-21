// =========================================================================
// Portfolio NAV Tracker — Market Auto-Sync Engine (Direct IDX + Multi-Fallback)
// Pure Network ES Module (zero DOM & zero global state coupling)
// =========================================================================

export function formatUnixMarketDateWIB(unixSec) {
  if (!unixSec) return null;
  const d = new Date(unixSec * 1000);
  if (isNaN(d.getTime())) return null;
  const dateWIB = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(d);
  const labelWIB = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(d);
  return { dateWIB, labelWIB };
}

export function formatIsoDateLabelWIB(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T12:00:00+07:00`);
  if (isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short"
  }).format(d);
}

export async function fetchTradingViewIDX(tickers) {
  const uniqueSymbols = Array.from(new Set(tickers.map((t) => `IDX:${String(t).toUpperCase().trim()}`)));
  if (uniqueSymbols.length === 0) return {};

  const payload = {
    symbols: { tickers: uniqueSymbols, query: { types: [] } },
    columns: ["name", "close", "change", "change_abs", "open", "high", "low", "volume"]
  };

  const res = await fetch("https://scanner.tradingview.com/indonesia/scan", {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`TradingView HTTP ${res.status}`);

  const json = await res.json();
  const map = {};
  for (const row of json?.data || []) {
    const sym = String(row.s || "").replace(/^IDX:/i, "").toUpperCase();
    const vals = row.d || [];
    const close = Number(vals[1]);
    const changeAbs = Number(vals[3]);
    if (sym && Number.isFinite(close) && close > 0) {
      const prevClose = Number.isFinite(changeAbs) ? close - changeAbs : 0;
      map[sym] = { price: close, prevClose, lastTs: null };
    }
  }
  return map;
}

export async function fetchGoogleFinanceQuote(symbolWithExchange) {
  const url = `https://www.google.com/finance/quote/${encodeURIComponent(symbolWithExchange)}`;
  const proxyUrls = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`
  ];

  for (const pUrl of proxyUrls) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(pUrl, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) continue;
      const html = await res.text();
      const priceMatch = html.match(/data-last-price="([0-9.]+)"/);
      const prevMatch = html.match(/data-previous-close="([0-9.]+)"/);
      const tsMatch = html.match(/data-last-normal-market-timestamp="([0-9]+)"/);
      if (priceMatch) {
        const price = Number(priceMatch[1]);
        const prevClose = prevMatch ? Number(prevMatch[1]) : 0;
        const lastTs = tsMatch ? Number(tsMatch[1]) : null;
        if (price > 0) return { price, prevClose, lastTs };
      }
    } catch {
      // Continue to next fallback
    }
  }
  return null;
}

export async function fetchYahooChart(symbol, range = "5d", interval = "1d") {
  const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
  const candidates = [
    targetUrl,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
  ];

  for (const u of candidates) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4500);
      const res = await fetch(u, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) continue;
      const json = await res.json();
      const result = json?.chart?.result?.[0];
      if (result?.meta) return result;
    } catch {
      // Try next endpoint
    }
  }
  return null;
}

export async function fetchStooqQuote(stooqSymbol) {
  const targetUrl = `https://stooq.com/q/l/?s=${encodeURIComponent(stooqSymbol)}&f=sd2t2ohlcv&h&e=csv`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return null;
    const cols = lines[1].split(",");
    const open = Number(cols[3]);
    const close = Number(cols[6]);
    if (Number.isFinite(close) && close > 0) {
      return { price: close, prevClose: Number.isFinite(open) ? open : 0, lastTs: null };
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Mengambil snapshot harga saham IDX & indeks benchmark (IHSG, LQ45)
 * secara berurutan dengan fallback: TradingView -> Google Finance -> Yahoo -> Stooq.
 * @param {string[]} tickers
 * @returns {Promise<{ sourceProviderLabel: string, stockQuotes: Record<string, { price: number, prevClose: number, lastTs: number|null }>, ihsgQuote: { price: number }|null, lq45Quote: { price: number }|null }>}
 */
export async function fetchMarketQuotes(tickers = []) {
  const normalizedTickers = Array.from(
    new Set(tickers.map((t) => String(t || "").toUpperCase().trim()).filter(Boolean))
  );

  let sourceProviderLabel = "IDX Real";
  let tvMap = {};
  try {
    tvMap = await fetchTradingViewIDX([...normalizedTickers, "COMPOSITE", "LQ45"]);
  } catch (tvErr) {
    console.warn("TradingView IDX fallback triggered:", tvErr);
  }

  if (Object.keys(tvMap).length > 0) {
    sourceProviderLabel = "TradingView IDX";
  }

  const stockQuotes = {};
  await Promise.allSettled(
    normalizedTickers.map(async (ticker) => {
      let quote = tvMap[ticker] || null;

      if (!quote) {
        quote = await fetchGoogleFinanceQuote(`${ticker}:IDX`);
      }
      if (!quote) {
        const chartRes = await fetchYahooChart(`${ticker}.JK`, "5d", "1d");
        if (chartRes?.meta?.regularMarketPrice) {
          quote = {
            price: Number(chartRes.meta.regularMarketPrice),
            prevClose: Number(chartRes.meta.chartPreviousClose || chartRes.meta.previousClose || 0),
            lastTs: chartRes.meta.regularMarketTime || null
          };
        }
      }
      if (!quote) {
        quote = await fetchStooqQuote(`${ticker.toLowerCase()}.jk`);
      }

      if (quote && quote.price > 0) {
        stockQuotes[ticker] = quote;
      }
    })
  );

  let ihsgQuote = tvMap.COMPOSITE || (await fetchGoogleFinanceQuote("COMPOSITE:IDX"));
  if (!ihsgQuote) {
    const yIhsg = await fetchYahooChart("^JKSE", "5d", "1d");
    if (yIhsg?.meta?.regularMarketPrice) {
      ihsgQuote = { price: Number(yIhsg.meta.regularMarketPrice) };
    }
  }

  let lq45Quote = tvMap.LQ45 || (await fetchGoogleFinanceQuote("LQ45:IDX"));
  if (!lq45Quote) {
    const yLq45 = await fetchYahooChart("^JKLQ45", "5d", "1d");
    if (yLq45?.meta?.regularMarketPrice) {
      lq45Quote = { price: Number(yLq45.meta.regularMarketPrice) };
    }
  }

  return {
    sourceProviderLabel,
    stockQuotes,
    ihsgQuote: ihsgQuote && ihsgQuote.price > 0 ? ihsgQuote : null,
    lq45Quote: lq45Quote && lq45Quote.price > 0 ? lq45Quote : null
  };
}
