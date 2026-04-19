import { SAUDI_STOCKS } from "../../../lib/stocks-config.js";
import { analyzeFundamental } from "../../../lib/engines/fundamentalEngine.js";
import { analyzeTechnical } from "../../../lib/engines/technicalEngine.js";
import { fetchArgaamData } from "../../../lib/engines/argaamScraper.js";

export const dynamic = "force-dynamic";

// Share cache with argaam route (per-instance)
var cache = { data: null, timestamp: 0 };
var CACHE_MS = 5 * 60 * 1000;

async function getArgaamStock(code) {
  var now = Date.now();
  if (!cache.data || (now - cache.timestamp) >= CACHE_MS) {
    var result = await fetchArgaamData();
    if (result.ok) { cache.data = result; cache.timestamp = now; }
    else return null;
  }
  return cache.data.stocks.find(function(s) { return s.code === code; });
}

export async function GET(request) {
  var url = new URL(request.url);
  var code = url.searchParams.get("code");
  if (!code) return Response.json({ error: "المعامل code مطلوب" }, { status: 400 });

  var info = SAUDI_STOCKS[code];
  if (!info) return Response.json({ error: "رمز غير موجود: " + code }, { status: 404 });

  try {
    var start = Date.now();
    var stock = await getArgaamStock(code);
    if (!stock) {
      return Response.json({ error: "تعذر تحميل بيانات السهم من Argaam", code: code }, { status: 502 });
    }

    // Build stock data for fundamental engine
    var stockData = {
      code: code,
      name: info.name,
      en: stock.name,
      sector: stock.sector || info.sector,
      price: stock.price,
      pe: 0, pb: 0, divYield: 0,
    };

    var fundamentalAnalysis = analyzeFundamental(stockData);

    // Technical analysis requires 30+ data points which we don't have from Argaam quote page
    // Graceful error until we build cumulative history (Phase 3)
    var technicalAnalysis = {
      error: "التحليل الفني يحتاج بيانات تاريخية",
      note: "جارٍ بناء قاعدة بيانات تاريخية تراكمية — ستكون متاحة خلال 30 يوم",
      available_now: {
        price: stock.price,
        change: stock.change,
        changePct: stock.changePct,
        prevClose: stock.prevClose,
        volume: stock.volume,
        high52w: stock.high52w,
        low52w: stock.low52w,
        position_vs_52w: stock.high52w > 0 ? Math.round(((stock.price - stock.low52w) / (stock.high52w - stock.low52w)) * 100) : null,
      },
    };

    var duration = Date.now() - start;

    return Response.json({
      code: code,
      name: info.name,
      sector: stock.sector || info.sector,
      price_data: {
        price: stock.price,
        change: stock.change,
        change_pct: stock.changePct,
        prev_close: stock.prevClose,
        volume: stock.volume,
        turnover: stock.turnover,
        transactions: stock.transactions,
        high52w: stock.high52w,
        low52w: stock.low52w,
      },
      fundamental_analysis: fundamentalAnalysis,
      technical_analysis: technicalAnalysis,
      metadata: {
        processing_time_ms: duration,
        source: "argaam + baseera engines v1.0",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
