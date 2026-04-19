import { fetchArgaamData, stocksToMap } from "../../../lib/engines/argaamScraper.js";
import { SAUDI_STOCKS } from "../../../lib/stocks-config.js";

export const dynamic = "force-dynamic";

// ══════════════════════════════════════════════════════════════
// Argaam-powered stocks API
// Data matches Saudi Exchange official 100%
// ══════════════════════════════════════════════════════════════

// In-memory cache (per serverless instance, 5 minute TTL)
var cache = { data: null, timestamp: 0 };
var CACHE_MS = 5 * 60 * 1000;

async function getCachedData() {
  var now = Date.now();
  if (cache.data && (now - cache.timestamp) < CACHE_MS) {
    console.log("[argaam-api] Using cache, age: " + Math.round((now - cache.timestamp) / 1000) + "s");
    return cache.data;
  }
  console.log("[argaam-api] Cache miss, fetching fresh data...");
  var result = await fetchArgaamData();
  if (result.ok) {
    cache.data = result;
    cache.timestamp = now;
  }
  return result;
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  try {
    return Math.floor((new Date() - new Date(dateStr)) / 86400000);
  } catch (e) { return null; }
}

function freshnessLabel(days) {
  if (days === null) return "غير معروف";
  if (days === 0) return "اليوم";
  if (days === 1) return "أمس";
  if (days <= 3) return "منذ " + days + " أيام";
  if (days <= 7) return "⚠️ منذ أسبوع";
  return "🔴 قديمة (" + days + " يوم)";
}

export async function GET(request) {
  var url = new URL(request.url);
  var code = url.searchParams.get("code");
  var type = url.searchParams.get("type") || "quote";
  var all = url.searchParams.get("all") === "1";  // return ALL 230+ stocks, not just configured ones

  try {
    var result = await getCachedData();

    if (!result || !result.ok) {
      return Response.json({
        error: "تعذر تحميل البيانات من Argaam",
        detail: result ? result.error : "unknown",
        source: "argaam",
      }, { status: 502 });
    }

    var ageDays = daysSince(result.data_date);

    // Single stock request
    if (code) {
      var stock = result.stocks.find(function(s) { return s.code === code; });
      if (!stock) {
        return Response.json({
          error: "رمز غير موجود في بيانات Argaam: " + code,
          source: "argaam",
        }, { status: 404 });
      }

      // Merge with config info (Arabic name, etc)
      var info = SAUDI_STOCKS[code] || {};
      return Response.json({
        code: stock.code,
        name: info.name || stock.name,
        en: stock.name,
        sector: stock.sector,
        price: stock.price,
        change: stock.change,
        changePct: stock.changePct,
        prevClose: stock.prevClose,
        volume: stock.volume,
        turnover: stock.turnover,
        transactions: stock.transactions,
        high52w: stock.high52w,
        low52w: stock.low52w,
        pe: 0, pb: 0, divYield: 0,
        data_date: result.data_date,
        data_age_days: ageDays,
        freshness_label: freshnessLabel(ageDays),
        source: "argaam",
      });
    }

    // All stocks
    var stocksMap = {};
    var filterCodes = all ? null : Object.keys(SAUDI_STOCKS);

    result.stocks.forEach(function(stock) {
      if (filterCodes && filterCodes.indexOf(stock.code) < 0) return;
      var info = SAUDI_STOCKS[stock.code] || {};
      stocksMap[stock.code] = {
        code: stock.code,
        name: info.name || stock.name,
        en: stock.name,
        sector: stock.sector,
        price: stock.price,
        change: stock.change,
        changePct: stock.changePct,
        prevClose: stock.prevClose,
        volume: stock.volume,
        turnover: stock.turnover,
        transactions: stock.transactions,
        high52w: stock.high52w,
        low52w: stock.low52w,
        high: 0, low: 0,
        sma50: 0, sma200: 0, pe: 0, divYield: 0,
      };
    });

    return Response.json({
      stocks: stocksMap,
      count: Object.keys(stocksMap).length,
      total_in_market: result.stocks.length,
      indices: result.indices,
      updated: new Date().toISOString(),
      data_date: result.data_date,
      data_age_days: ageDays,
      freshness_label: freshnessLabel(ageDays),
      source: "argaam",
    });
  } catch (error) {
    console.error("[argaam-api] fatal: " + error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
