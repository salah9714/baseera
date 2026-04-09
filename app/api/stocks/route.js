import { SAUDI_STOCKS } from "../../../lib/stocks-config.js";

export const dynamic = "force-dynamic";

// ── Fetch chart data (price + history) ──
async function yahooChart(symbol) {
  try {
    var url = "https://query1.finance.yahoo.com/v8/finance/chart/" + symbol + "?interval=1d&range=1mo";
    var res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return null;
    var json = await res.json();
    if (!json.chart || !json.chart.result || !json.chart.result[0]) return null;

    var meta = json.chart.result[0].meta;
    var timestamps = json.chart.result[0].timestamp || [];
    var quotes = json.chart.result[0].indicators.quote[0];

    var price = meta.regularMarketPrice || 0;
    var prevClose = meta.chartPreviousClose || meta.previousClose || price;
    var change = Math.round((price - prevClose) * 100) / 100;
    var changePct = prevClose > 0 ? Math.round((change / prevClose) * 10000) / 100 : 0;

    var history = [];
    for (var i = 0; i < timestamps.length; i++) {
      if (quotes.close[i] !== null) {
        history.push({
          date: new Date(timestamps[i] * 1000).toISOString().split("T")[0],
          open: Math.round((quotes.open[i] || 0) * 100) / 100,
          high: Math.round((quotes.high[i] || 0) * 100) / 100,
          low: Math.round((quotes.low[i] || 0) * 100) / 100,
          close: Math.round((quotes.close[i] || 0) * 100) / 100,
          volume: quotes.volume[i] || 0,
        });
      }
    }

    return {
      price: price, change: change, changePct: changePct,
      prevClose: prevClose,
      open: meta.regularMarketOpen || (history.length > 0 ? history[history.length - 1].open : 0),
      high: meta.regularMarketDayHigh || (history.length > 0 ? history[history.length - 1].high : 0),
      low: meta.regularMarketDayLow || (history.length > 0 ? history[history.length - 1].low : 0),
      volume: meta.regularMarketVolume || (history.length > 0 ? history[history.length - 1].volume : 0),
      sma50: meta.fiftyDayAverage ? Math.round(meta.fiftyDayAverage * 100) / 100 : 0,
      sma200: meta.twoHundredDayAverage ? Math.round(meta.twoHundredDayAverage * 100) / 100 : 0,
      high52w: meta.fiftyTwoWeekHigh || 0,
      low52w: meta.fiftyTwoWeekLow || 0,
      currency: meta.currency || "SAR",
      history: history,
    };
  } catch (e) { return null; }
}

// ── Fetch fundamentals (P/E, dividend, etc.) ──
async function yahooFundamentals(symbol) {
  try {
    var url = "https://query1.finance.yahoo.com/v7/finance/quote?symbols=" + symbol + "&fields=trailingPE,priceToBook,trailingAnnualDividendYield,marketCap,trailingEps,beta,fiftyDayAverage,twoHundredDayAverage";
    var res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    var json = await res.json();
    if (!json.quoteResponse || !json.quoteResponse.result || !json.quoteResponse.result[0]) return null;
    var q = json.quoteResponse.result[0];
    return {
      pe: q.trailingPE ? Math.round(q.trailingPE * 10) / 10 : 0,
      pb: q.priceToBook ? Math.round(q.priceToBook * 10) / 10 : 0,
      eps: q.epsTrailingTwelveMonths ? Math.round(q.epsTrailingTwelveMonths * 100) / 100 : 0,
      divYield: q.trailingAnnualDividendYield ? Math.round(q.trailingAnnualDividendYield * 10000) / 100 : 0,
      marketCap: q.marketCap || 0,
      beta: q.beta ? Math.round(q.beta * 100) / 100 : 0,
    };
  } catch (e) { return null; }
}

// ── Calc RSI ──
function calcRSI(closes) {
  if (closes.length < 15) return null;
  var gains = 0, losses = 0;
  for (var i = closes.length - 14; i < closes.length; i++) {
    var diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses += Math.abs(diff);
  }
  var ag = gains / 14, al = losses / 14;
  return al === 0 ? 100 : Math.round(100 - (100 / (1 + ag / al)));
}

export async function GET(request) {
  var url = new URL(request.url);
  var code = url.searchParams.get("code");
  var type = url.searchParams.get("type") || "quote";

  try {
    // ── سهم واحد بالكامل ──
    if (code) {
      var info = SAUDI_STOCKS[code];
      if (!info) return Response.json({ error: "رمز غير موجود" }, { status: 404 });

      var symbol = code + ".SR";
      var both = await Promise.all([yahooChart(symbol), yahooFundamentals(symbol)]);
      var chart = both[0];
      var fund = both[1] || {};

      if (!chart) return Response.json({ error: "لم نتمكن من جلب البيانات" }, { status: 502 });

      var closes = chart.history.map(function(h) { return h.close; });
      var highs = chart.history.map(function(h) { return h.high; });
      var lows = chart.history.map(function(h) { return h.low; });
      var avgVol = chart.history.length > 0 ? chart.history.reduce(function(a, h) { return a + h.volume; }, 0) / chart.history.length : 0;

      var result = {
        code: code, name: info.name, en: info.en, sector: info.sector,
        price: chart.price, change: chart.change, changePct: chart.changePct,
        open: chart.open, high: chart.high, low: chart.low,
        prevClose: chart.prevClose, volume: chart.volume,
        pe: fund.pe || 0, pb: fund.pb || 0, eps: fund.eps || 0,
        divYield: fund.divYield || 0, marketCap: fund.marketCap || 0, beta: fund.beta || 0,
        sma50: chart.sma50, sma200: chart.sma200,
        high52w: chart.high52w, low52w: chart.low52w,
        rsi: calcRSI(closes),
        resistance: highs.length > 0 ? Math.round(Math.max.apply(null, highs) * 100) / 100 : 0,
        support: lows.length > 0 ? Math.round(Math.min.apply(null, lows) * 100) / 100 : 0,
        volRatio: avgVol > 0 ? Math.round((chart.volume / avgVol) * 100) / 100 : 1,
        timestamp: new Date().toISOString(),
        source: "yahoo-finance",
      };

      if (type === "full") result.history = chart.history;
      return Response.json(result);
    }

    // ── كل الأسهم - بالتوازي ──
    var codes = Object.keys(SAUDI_STOCKS);
    var allStocks = {};

    var promises = codes.map(function(c) {
      return Promise.all([yahooChart(c + ".SR"), yahooFundamentals(c + ".SR")]).then(function(results) {
        var ch = results[0], fd = results[1] || {};
        if (ch && ch.price > 0) {
          var inf = SAUDI_STOCKS[c];
          allStocks[c] = {
            code: c, name: inf.name, en: inf.en, sector: inf.sector,
            price: ch.price, change: ch.change, changePct: ch.changePct,
            volume: ch.volume, high: ch.high, low: ch.low,
            sma50: ch.sma50, sma200: ch.sma200,
            pe: fd.pe || 0, divYield: fd.divYield || 0,
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
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
