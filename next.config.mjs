import { SAUDI_STOCKS } from "../../../lib/stocks-config.js";
export const dynamic = "force-dynamic";

var API_KEY = process.env.MARKETSTACK_KEY || "0bac9135fc2c32aa38536052154cfad8";

function msSymbol(code) { return code + ".XSAU"; }

function daysSince(dateStr) {
  if (!dateStr) return null;
  try {
    var d = new Date(dateStr);
    var now = new Date();
    return Math.floor((now - d) / 86400000);
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

async function fetchEodWithPrevious(codes) {
  var symbols = codes.map(msSymbol).join(",");
  var urls = [
    "https://api.marketstack.com/v1/eod?access_key=" + API_KEY + "&symbols=" + encodeURIComponent(symbols) + "&limit=" + (codes.length * 5) + "&sort=DESC",
    "http://api.marketstack.com/v1/eod?access_key=" + API_KEY + "&symbols=" + encodeURIComponent(symbols) + "&limit=" + (codes.length * 5) + "&sort=DESC",
  ];
  for (var u = 0; u < urls.length; u++) {
    try {
      var res = await fetch(urls[u], { signal: AbortSignal.timeout(15000), cache: "no-store" });
      if (res.status === 401 && u === 0) continue;
      if (!res.ok) continue;
      var json = await res.json();
      if (!json.data || json.data.length === 0) continue;
      var byCode = {};
      json.data.forEach(function(item) {
        var code = (item.symbol || "").replace(".XSAU", "");
        if (!byCode[code]) byCode[code] = [];
        if (byCode[code].length < 2) byCode[code].push(item);
      });
      return { ok: true, data: byCode };
    } catch (e) {}
  }
  return { error: "failed" };
}

async function fetchEodLatest(codes) {
  var symbols = codes.map(msSymbol).join(",");
  var urls = [
    "https://api.marketstack.com/v1/eod/latest?access_key=" + API_KEY + "&symbols=" + encodeURIComponent(symbols) + "&limit=1000",
    "http://api.marketstack.com/v1/eod/latest?access_key=" + API_KEY + "&symbols=" + encodeURIComponent(symbols) + "&limit=1000",
  ];
  for (var u = 0; u < urls.length; u++) {
    try {
      var res = await fetch(urls[u], { signal: AbortSignal.timeout(15000), cache: "no-store" });
      if (res.status === 401 && u === 0) continue;
      if (!res.ok) continue;
      var json = await res.json();
      if (!json.data) continue;
      var byCode = {};
      json.data.forEach(function(item) {
        var code = (item.symbol || "").replace(".XSAU", "");
        if (!byCode[code]) byCode[code] = [item];
      });
      return { ok: true, data: byCode };
    } catch (e) {}
  }
  return { error: "failed" };
}

function calcRSI(closes) {
  if (closes.length < 15) return null;
  var g = 0, l = 0;
  for (var i = closes.length - 14; i < closes.length; i++) {
    var d = closes[i] - closes[i-1];
    if (d > 0) g += d; else l += Math.abs(d);
  }
  var ag = g/14, al = l/14;
  return al === 0 ? 100 : Math.round(100 - (100/(1 + ag/al)));
}

async function fetchHistory(code) {
  var end = new Date(), start = new Date();
  start.setDate(start.getDate() - 90);
  var urls = [
    "https://api.marketstack.com/v1/eod?access_key=" + API_KEY + "&symbols=" + msSymbol(code) + "&date_from=" + start.toISOString().split("T")[0] + "&date_to=" + end.toISOString().split("T")[0] + "&limit=100&sort=ASC",
    "http://api.marketstack.com/v1/eod?access_key=" + API_KEY + "&symbols=" + msSymbol(code) + "&date_from=" + start.toISOString().split("T")[0] + "&date_to=" + end.toISOString().split("T")[0] + "&limit=100&sort=ASC",
  ];
  for (var u = 0; u < urls.length; u++) {
    try {
      var res = await fetch(urls[u], { signal: AbortSignal.timeout(12000), cache: "no-store" });
      if (res.status === 401 && u === 0) continue;
      if (!res.ok) continue;
      var json = await res.json();
      if (!json.data) continue;
      return json.data.map(function(d) { return { date: (d.date||"").split("T")[0], open: d.open||0, high: d.high||0, low: d.low||0, close: d.close||0, volume: d.volume||0 }; });
    } catch (e) {}
  }
  return [];
}

export async function GET(request) {
  var url = new URL(request.url);
  var code = url.searchParams.get("code");
  var type = url.searchParams.get("type") || "quote";

  try {
    if (code) {
      var info = SAUDI_STOCKS[code];
      if (!info) return Response.json({ error: "رمز غير موجود" }, { status: 404 });

      var batch = await fetchEodWithPrevious([code]);
      var rows = batch.ok && batch.data[code] ? batch.data[code] : [];
      if (rows.length === 0) {
        var fb = await fetchEodLatest([code]);
        if (fb.ok && fb.data[code]) rows = fb.data[code];
      }
      if (rows.length === 0) {
        return Response.json({ error: "تعذر تحميل " + info.name, source: "marketstack" }, { status: 502 });
      }

      var today = rows[0];
      var yesterday = rows.length > 1 ? rows[1] : null;
      var price = today.close || 0;
      var prevClose = yesterday ? (yesterday.close || 0) : (today.open || price);
      var change = price - prevClose;
      var changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
      var history = type === "full" ? await fetchHistory(code) : [];
      var closes = history.map(function(h) { return h.close; });
      var high52w = 0, low52w = 0;
      if (history.length > 0) {
        high52w = Math.max.apply(null, history.map(function(h) { return h.high; }));
        low52w = Math.min.apply(null, history.map(function(h) { return h.low; }));
      }

      var result = {
        code: code, name: info.name, en: info.en, sector: info.sector,
        price: Math.round(price * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePct: Math.round(changePct * 100) / 100,
        open: Math.round((today.open || 0) * 100) / 100,
        high: Math.round((today.high || 0) * 100) / 100,
        low: Math.round((today.low || 0) * 100) / 100,
        prevClose: Math.round(prevClose * 100) / 100,
        volume: today.volume || 0,
        high52w: high52w > 0 ? Math.round(high52w * 100) / 100 : null,
        low52w: low52w > 0 ? Math.round(low52w * 100) / 100 : null,
        pe: 0, pb: 0, divYield: 0,
        rsi: calcRSI(closes),
        data_date: (today.date || "").split("T")[0],
        data_age_days: daysSince(today.date),
        freshness_label: freshnessLabel(daysSince(today.date)),
        source: "marketstack",
      };

      if (history.length > 0) {
        var l30 = history.slice(-30);
        result.resistance = Math.round(Math.max.apply(null, l30.map(function(h){return h.high;})) * 100) / 100;
        result.support = Math.round(Math.min.apply(null, l30.map(function(h){return h.low;})) * 100) / 100;
        var avgV = l30.reduce(function(a,h){return a+h.volume;}, 0) / l30.length;
        result.volRatio = avgV > 0 ? Math.round((result.volume/avgV) * 100) / 100 : 1;
      }
      if (type === "full") result.history = history.slice(-30);
      return Response.json(result);
    }

    var codes = Object.keys(SAUDI_STOCKS);
    var batchResult = await fetchEodWithPrevious(codes);
    if (!batchResult.ok || Object.keys(batchResult.data || {}).length === 0) {
      var fb2 = await fetchEodLatest(codes);
      if (fb2.ok) batchResult = fb2;
    }
    if (!batchResult.ok) {
      return Response.json({ error: "تعذر تحميل البيانات", source: "marketstack" }, { status: 502 });
    }

    var allStocks = {};
    var latestDate = null;
    codes.forEach(function(c) {
      var rows2 = batchResult.data[c];
      if (!rows2 || rows2.length === 0) return;
      var today2 = rows2[0];
      var yesterday2 = rows2.length > 1 ? rows2[1] : null;
      var inf = SAUDI_STOCKS[c];
      var price2 = today2.close || 0;
      var prevClose2 = yesterday2 ? (yesterday2.close || 0) : (today2.open || price2);
      var change2 = price2 - prevClose2;
      var changePct2 = prevClose2 > 0 ? (change2 / prevClose2) * 100 : 0;
      if (today2.date && (!latestDate || today2.date > latestDate)) latestDate = today2.date;

      allStocks[c] = {
        code: c, name: inf.name, en: inf.en, sector: inf.sector,
        price: Math.round(price2 * 100) / 100,
        change: Math.round(change2 * 100) / 100,
        changePct: Math.round(changePct2 * 100) / 100,
        open: Math.round((today2.open||0)*100)/100,
        high: Math.round((today2.high||0)*100)/100,
        low: Math.round((today2.low||0)*100)/100,
        prevClose: Math.round(prevClose2 * 100) / 100,
        volume: today2.volume || 0,
        sma50: 0, sma200: 0, pe: 0, divYield: 0,
      };
    });

    var count = Object.keys(allStocks).length;
    var ageDays = daysSince(latestDate);

    if (count === 0) {
      return Response.json({ error: "لم يتم العثور على أسهم", source: "marketstack" }, { status: 502 });
    }

    return Response.json({
      stocks: allStocks,
      count: count,
      total: codes.length,
      updated: new Date().toISOString(),
      data_date: (latestDate || "").split("T")[0],
      data_age_days: ageDays,
      freshness_label: freshnessLabel(ageDays),
      source: "marketstack",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
