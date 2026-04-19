import { SAUDI_STOCKS } from "../../../lib/stocks-config.js";
import { analyzeTechnical } from "../../../lib/engines/technicalEngine.js";
import { analyzeFundamental } from "../../../lib/engines/fundamentalEngine.js";
export const dynamic = "force-dynamic";

// API Key - embedded directly to guarantee it works
// TODO: Move to env var later and regenerate key
var API_KEY = process.env.MARKETSTACK_KEY || "0bac9135fc2c32aa38536052154cfad8";

function calcRSI(c) {
  if (c.length < 15) return null;
  var g = 0, l = 0;
  for (var i = c.length - 14; i < c.length; i++) { var d = c[i] - c[i-1]; if (d > 0) g += d; else l += Math.abs(d); }
  var ag = g/14, al = l/14;
  return al === 0 ? 100 : Math.round(100 - (100 / (1 + ag/al)));
}

async function fetchBatch(codes) {
  var symbols = codes.map(function(c) { return c + ".XSAU"; }).join(",");
  // Try HTTPS first (paid plan), fall back to HTTP
  var urls = [
    "https://api.marketstack.com/v1/eod/latest?access_key=" + API_KEY + "&symbols=" + encodeURIComponent(symbols) + "&limit=1000",
    "http://api.marketstack.com/v1/eod/latest?access_key=" + API_KEY + "&symbols=" + encodeURIComponent(symbols) + "&limit=1000",
  ];

  for (var u = 0; u < urls.length; u++) {
    try {
      console.log("[stocks] Try " + (u === 0 ? "HTTPS" : "HTTP") + "...");
      var res = await fetch(urls[u], { signal: AbortSignal.timeout(12000), cache: "no-store" });
      var text = await res.text();
      console.log("[stocks] Status=" + res.status + " len=" + text.length);

      if (res.status === 401 && u === 0) {
        console.log("[stocks] HTTPS rejected, trying HTTP...");
        continue;
      }
      if (!res.ok) return { error: "HTTP " + res.status, detail: text.slice(0, 200) };

      var json = JSON.parse(text);
      if (json.error) return { error: json.error.message || JSON.stringify(json.error) };
      if (!json.data || json.data.length === 0) return { error: "empty_data" };

      var byCode = {};
      json.data.forEach(function(item) {
        var code = (item.symbol || "").replace(".XSAU", "");
        if (!byCode[code]) byCode[code] = item;
      });
      return { ok: true, data: byCode };
    } catch (e) {
      console.error("[stocks] " + (u === 0 ? "HTTPS" : "HTTP") + " error: " + e.message);
      if (u === urls.length - 1) return { error: e.message };
    }
  }
  return { error: "all_attempts_failed" };
}

async function fetchHistory(code) {
  var end = new Date(), start = new Date(); start.setDate(start.getDate() - 60);
  var url = "https://api.marketstack.com/v1/eod?access_key=" + API_KEY + "&symbols=" + code + ".XSAU&date_from=" + start.toISOString().split("T")[0] + "&date_to=" + end.toISOString().split("T")[0] + "&limit=100&sort=ASC";
  try {
    var res = await fetch(url, { signal: AbortSignal.timeout(12000), cache: "no-store" });
    if (!res.ok) {
      // Try HTTP
      url = url.replace("https://", "http://");
      res = await fetch(url, { signal: AbortSignal.timeout(12000), cache: "no-store" });
      if (!res.ok) return [];
    }
    var json = await res.json();
    if (!json.data) return [];
    return json.data.map(function(d) { return { date: (d.date||"").split("T")[0], open: d.open||0, high: d.high||0, low: d.low||0, close: d.close||0, volume: d.volume||0 }; });
  } catch (e) { return []; }
}

export async function GET(request) {
  var url = new URL(request.url);
  var code = url.searchParams.get("code");
  var type = url.searchParams.get("type") || "quote";

  console.log("[API/stocks] code=" + code + " key_len=" + API_KEY.length);

  try {
    if (code) {
      var info = SAUDI_STOCKS[code];
      if (!info) return Response.json({ error: "رمز غير موجود" }, { status: 404 });

      var batch = await fetchBatch([code]);
      if (!batch.ok || !batch.data[code]) {
        return Response.json({ error: "تعذر تحميل " + info.name, detail: batch.error, source: "marketstack" }, { status: 502 });
      }

      var q = batch.data[code];
      var price = q.close || 0, open = q.open || price;
      var history = type === "full" ? await fetchHistory(code) : [];
      var closes = history.map(function(h) { return h.close; });

      var result = {
        code: code, name: info.name, en: info.en, sector: info.sector,
        price: Math.round(price * 100) / 100,
        change: Math.round((price - open) * 100) / 100,
        changePct: open > 0 ? Math.round(((price - open) / open) * 10000) / 100 : 0,
        open: Math.round(open * 100) / 100,
        high: Math.round((q.high || 0) * 100) / 100,
        low: Math.round((q.low || 0) * 100) / 100,
        prevClose: Math.round(open * 100) / 100,
        volume: q.volume || 0,
        pe: 0, pb: 0, divYield: 0,
        rsi: calcRSI(closes),
        timestamp: new Date().toISOString(),
        source: "marketstack",
      };

      if (history.length > 0) {
        var l30 = history.slice(-30);
        result.resistance = Math.round(Math.max.apply(null, l30.map(function(h) { return h.high; })) * 100) / 100;
        result.support = Math.round(Math.min.apply(null, l30.map(function(h) { return h.low; })) * 100) / 100;
        var avgV = l30.reduce(function(a, h) { return a + h.volume; }, 0) / l30.length;
        result.volRatio = avgV > 0 ? Math.round((result.volume / avgV) * 100) / 100 : 1;
      }

      if (type === "full") {
        result.history = history;  // full history for engines

        // ═══ Run Analysis Engines ═══
        try {
          console.log("[engines] Running technical analysis for " + code);
          result.technical_analysis = analyzeTechnical(result);
        } catch (e) {
          console.error("[engines] Technical error: " + e.message);
          result.technical_analysis = { error: e.message };
        }

        try {
          console.log("[engines] Running fundamental analysis for " + code);
          result.fundamental_analysis = analyzeFundamental(result);
        } catch (e) {
          console.error("[engines] Fundamental error: " + e.message);
          result.fundamental_analysis = { error: e.message };
        }

        // Keep only last 30 points of history in response (engines already ran on full)
        result.history = history.slice(-30);
      }

      return Response.json(result);
    }

    // All stocks in one batch
    var codes = Object.keys(SAUDI_STOCKS);
    var batchResult = await fetchBatch(codes);

    if (!batchResult.ok) {
      return Response.json({ error: "تعذر تحميل البيانات", detail: batchResult.error, source: "marketstack" }, { status: 502 });
    }

    var allStocks = {};
    codes.forEach(function(c) {
      var q = batchResult.data[c];
      if (q && q.close) {
        var inf = SAUDI_STOCKS[c], price = q.close, open = q.open || price;
        allStocks[c] = {
          code: c, name: inf.name, en: inf.en, sector: inf.sector,
          price: Math.round(price * 100) / 100,
          change: Math.round((price - open) * 100) / 100,
          changePct: open > 0 ? Math.round(((price - open) / open) * 10000) / 100 : 0,
          volume: q.volume || 0,
          high: Math.round((q.high || 0) * 100) / 100,
          low: Math.round((q.low || 0) * 100) / 100,
          sma50: 0, sma200: 0, pe: 0, divYield: 0,
        };
      }
    });

    var count = Object.keys(allStocks).length;
    console.log("[API/stocks] Loaded: " + count + "/" + codes.length);

    if (count === 0) {
      return Response.json({
        error: "لم يتم العثور على أسهم سعودية",
        hint: "خطة Marketstack قد لا تدعم XSAU. جرّب البحث عن الأسهم بصيغة مختلفة.",
        source: "marketstack",
      }, { status: 502 });
    }

    return Response.json({
      stocks: allStocks,
      count: count,
      total: codes.length,
      updated: new Date().toISOString(),
      source: "marketstack",
    });
  } catch (error) {
    console.error("[API/stocks] Fatal: " + error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
