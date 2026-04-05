import { SAUDI_STOCKS } from "../../../lib/stocks-config.js";

export const dynamic = "force-dynamic";

// Direct Yahoo Finance fetch - much faster than yahoo-finance2 library
async function yahooQuote(symbol) {
  try {
    var url = "https://query1.finance.yahoo.com/v8/finance/chart/" + symbol + "?interval=1d&range=1mo&includePrePost=false";
    var res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    var json = await res.json();
    var meta = json.chart.result[0].meta;
    var timestamps = json.chart.result[0].timestamp || [];
    var quotes = json.chart.result[0].indicators.quote[0];

    var price = meta.regularMarketPrice || 0;
    var prevClose = meta.chartPreviousClose || meta.previousClose || price;
    var change = Math.round((price - prevClose) * 100) / 100;
    var changePct = prevClose > 0 ? Math.round((change / prevClose) * 10000) / 100 : 0;

    // Build history from chart data
    var history = [];
    if (timestamps.length > 0) {
      for (var i = 0; i < timestamps.length; i++) {
        if (quotes.close[i] !== null) {
          var d = new Date(timestamps[i] * 1000);
          history.push({
            date: d.toISOString().split("T")[0],
            open: Math.round((quotes.open[i] || 0) * 100) / 100,
            high: Math.round((quotes.high[i] || 0) * 100) / 100,
            low: Math.round((quotes.low[i] || 0) * 100) / 100,
            close: Math.round((quotes.close[i] || 0) * 100) / 100,
            volume: quotes.volume[i] || 0,
          });
        }
      }
    }

    // Calc RSI from history
    var rsi = null;
    var closes = history.map(function(h) { return h.close; });
    if (closes.length >= 15) {
      var gains = 0, losses = 0;
      for (var j = closes.length - 14; j < closes.length; j++) {
        var diff = closes[j] - closes[j - 1];
        if (diff > 0) gains += diff; else losses += Math.abs(diff);
      }
      var ag = gains / 14, al = losses / 14;
      rsi = al === 0 ? 100 : Math.round(100 - (100 / (1 + ag / al)));
    }

    // Support/Resistance from history
    var highs = history.map(function(h) { return h.high; });
    var lows = history.map(function(h) { return h.low; });
    var resistance = highs.length > 0 ? Math.max.apply(null, highs) : 0;
    var support = lows.length > 0 ? Math.min.apply(null, lows) : 0;

    // Volume ratio
    var avgVol = history.length > 0 ? history.reduce(function(a, h) { return a + h.volume; }, 0) / history.length : 0;
    var lastVol = history.length > 0 ? history[history.length - 1].volume : 0;
    var volRatio = avgVol > 0 ? Math.round((lastVol / avgVol) * 100) / 100 : 1;

    // SMA50 from meta
    var sma50 = meta.fiftyDayAverage ? Math.round(meta.fiftyDayAverage * 100) / 100 : 0;
    var sma200 = meta.twoHundredDayAverage ? Math.round(meta.twoHundredDayAverage * 100) / 100 : 0;

    return {
      price: price,
      change: change,
      changePct: changePct,
      open: history.length > 0 ? history[history.length - 1].open : 0,
      high: history.length > 0 ? history[history.length - 1].high : 0,
      low: history.length > 0 ? history[history.length - 1].low : 0,
      prevClose: prevClose,
      volume: lastVol,
      sma50: sma50,
      sma200: sma200,
      high52w: meta.fiftyTwoWeekHigh || 0,
      low52w: meta.fiftyTwoWeekLow || 0,
      rsi: rsi,
      resistance: Math.round(resistance * 100) / 100,
      support: Math.round(support * 100) / 100,
      volRatio: volRatio,
      history: history,
    };
  } catch (e) {
    return null;
  }
}

export async function GET(request) {
  var url = new URL(request.url);
  var code = url.searchParams.get("code");
  var type = url.searchParams.get("type") || "quote";

  try {
    // Single stock
    if (code) {
      var info = SAUDI_STOCKS[code];
      if (!info) return Response.json({ error: "رمز غير موجود" }, { status: 404 });

      var data = await yahooQuote(code + ".SR");
      if (!data) return Response.json({ error: "لم نتمكن من جلب البيانات", hint: "حاول بعد دقيقة" }, { status: 502 });

      var result = {
        code: code, name: info.name, en: info.en, sector: info.sector,
        price: data.price, change: data.change, changePct: data.changePct,
        open: data.open, high: data.high, low: data.low,
        prevClose: data.prevClose, volume: data.volume,
        pe: 0, pb: 0, divYield: 0,
        sma50: data.sma50, sma200: data.sma200,
        high52w: data.high52w, low52w: data.low52w,
        rsi: data.rsi, resistance: data.resistance, support: data.support,
        volRatio: data.volRatio,
        timestamp: new Date().toISOString(),
        source: "yahoo-finance",
        delay: "~15 دقيقة",
      };

      if (type === "full") {
        result.history = data.history;
      }

      return Response.json(result);
    }

    // All stocks - parallel fetch ALL at once (much faster)
    var codes = Object.keys(SAUDI_STOCKS);
    var allStocks = {};

    var promises = codes.map(function(c) {
      return yahooQuote(c + ".SR").then(function(data) {
        if (data && data.price > 0) {
          var inf = SAUDI_STOCKS[c];
          allStocks[c] = {
            code: c, name: inf.name, en: inf.en, sector: inf.sector,
            price: data.price, change: data.change, changePct: data.changePct,
            volume: data.volume, high: data.high, low: data.low,
            sma50: data.sma50, sma200: data.sma200,
          };
        }
      }).catch(function() {});
    });

    await Promise.all(promises);

    return Response.json({
      stocks: allStocks,
      count: Object.keys(allStocks).length,
      total: codes.length,
      updated: new Date().toISOString(),
      source: "yahoo-finance",
      delay: "~15 دقيقة",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
