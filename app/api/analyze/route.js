import { SAUDI_STOCKS } from "../../../lib/stocks-config.js";
import { analyzeFundamental } from "../../../lib/engines/fundamentalEngine.js";
import { analyzeTechnical } from "../../../lib/engines/technicalEngine.js";

export const dynamic = "force-dynamic";

var API_KEY = process.env.MARKETSTACK_KEY || "0bac9135fc2c32aa38536052154cfad8";

// ── Fetch current quote + historical data in parallel ──
async function fetchQuoteAndHistory(code) {
  var symbol = code + ".XSAU";
  var end = new Date(), start = new Date();
  start.setDate(start.getDate() - 90);  // 90 days for technical analysis

  var quoteUrls = [
    "https://api.marketstack.com/v1/eod/latest?access_key=" + API_KEY + "&symbols=" + symbol + "&limit=1",
    "http://api.marketstack.com/v1/eod/latest?access_key=" + API_KEY + "&symbols=" + symbol + "&limit=1",
  ];
  var historyUrls = [
    "https://api.marketstack.com/v1/eod?access_key=" + API_KEY + "&symbols=" + symbol + "&date_from=" + start.toISOString().split("T")[0] + "&date_to=" + end.toISOString().split("T")[0] + "&limit=200&sort=ASC",
    "http://api.marketstack.com/v1/eod?access_key=" + API_KEY + "&symbols=" + symbol + "&date_from=" + start.toISOString().split("T")[0] + "&date_to=" + end.toISOString().split("T")[0] + "&limit=200&sort=ASC",
  ];

  async function tryFetch(urls) {
    for (var i = 0; i < urls.length; i++) {
      try {
        var res = await fetch(urls[i], { signal: AbortSignal.timeout(15000), cache: "no-store" });
        if (res.status === 401 && i === 0) continue;
        if (!res.ok) continue;
        var json = await res.json();
        return json;
      } catch (e) {}
    }
    return null;
  }

  var results = await Promise.all([tryFetch(quoteUrls), tryFetch(historyUrls)]);

  var quote = null;
  if (results[0] && results[0].data && results[0].data[0]) {
    var q = results[0].data[0];
    quote = {
      price: q.close || 0,
      open: q.open || 0,
      high: q.high || 0,
      low: q.low || 0,
      volume: q.volume || 0,
      date: q.date,
    };
  }

  var history = [];
  if (results[1] && results[1].data) {
    history = results[1].data.map(function(d) {
      return {
        date: (d.date || "").split("T")[0],
        open: d.open || 0,
        high: d.high || 0,
        low: d.low || 0,
        close: d.close || 0,
        volume: d.volume || 0,
      };
    });
  }

  return { quote: quote, history: history };
}

// ══════════════════════════════════════════════════════════════
// ROUTE HANDLER
// ══════════════════════════════════════════════════════════════
export async function GET(request) {
  var url = new URL(request.url);
  var code = url.searchParams.get("code");

  if (!code) return Response.json({ error: "المعامل code مطلوب" }, { status: 400 });

  var info = SAUDI_STOCKS[code];
  if (!info) return Response.json({ error: "رمز غير موجود: " + code }, { status: 404 });

  console.log("[analyze] Starting analysis for " + code + " (" + info.name + ")");

  try {
    var data = await fetchQuoteAndHistory(code);

    if (!data.quote) {
      return Response.json({ error: "تعذر تحميل بيانات السعر", code: code }, { status: 502 });
    }

    // Build stock data object for fundamental engine
    var stockData = {
      code: code,
      name: info.name,
      en: info.en,
      sector: info.sector,
      price: data.quote.price,
      pe: 0,           // not yet sourced from Marketstack Basic
      pb: 0,
      divYield: 0,
      // debt, cash, revenue: not available at this tier
    };

    // Run both engines
    var startTime = Date.now();
    var fundamentalAnalysis = analyzeFundamental(stockData);
    var technicalAnalysis = data.history.length >= 30
      ? analyzeTechnical(data.history)
      : { error: "بيانات تاريخية غير كافية", received: data.history.length };
    var duration = Date.now() - startTime;

    console.log("[analyze] " + code + " completed in " + duration + "ms");

    return Response.json({
      code: code,
      name: info.name,
      sector: info.sector,
      price_data: {
        price: Math.round(data.quote.price * 100) / 100,
        open: Math.round(data.quote.open * 100) / 100,
        high: Math.round(data.quote.high * 100) / 100,
        low: Math.round(data.quote.low * 100) / 100,
        volume: data.quote.volume,
        change: Math.round((data.quote.price - data.quote.open) * 100) / 100,
        change_pct: data.quote.open > 0 ? Math.round(((data.quote.price - data.quote.open) / data.quote.open) * 10000) / 100 : 0,
        date: data.quote.date,
      },
      fundamental_analysis: fundamentalAnalysis,
      technical_analysis: technicalAnalysis,
      metadata: {
        data_points: data.history.length,
        processing_time_ms: duration,
        source: "marketstack + baseera engines v1.0",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[analyze] Fatal: " + error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
