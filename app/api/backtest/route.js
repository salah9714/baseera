import { SAUDI_STOCKS } from "../../../lib/stocks-config.js";
export const dynamic = "force-dynamic";

var API_KEY = process.env.MARKETSTACK_KEY || "0bac9135fc2c32aa38536052154cfad8";

// ══════════════════════════════════════════════
// Backtesting Engine
// يختبر استراتيجيات تداول على بيانات تاريخية
// ══════════════════════════════════════════════

async function fetchHistory(code, days) {
  var end = new Date(), start = new Date();
  start.setDate(start.getDate() - days);

  var urls = [
    "https://api.marketstack.com/v1/eod?access_key=" + API_KEY + "&symbols=" + code + ".XSAU&date_from=" + start.toISOString().split("T")[0] + "&date_to=" + end.toISOString().split("T")[0] + "&limit=500&sort=ASC",
    "http://api.marketstack.com/v1/eod?access_key=" + API_KEY + "&symbols=" + code + ".XSAU&date_from=" + start.toISOString().split("T")[0] + "&date_to=" + end.toISOString().split("T")[0] + "&limit=500&sort=ASC",
  ];

  for (var u = 0; u < urls.length; u++) {
    try {
      var res = await fetch(urls[u], { signal: AbortSignal.timeout(15000), cache: "no-store" });
      if (res.status === 401 && u === 0) continue;
      if (!res.ok) continue;
      var json = await res.json();
      if (!json.data || json.data.length === 0) return [];
      return json.data.map(function(d) {
        return {
          date: (d.date || "").split("T")[0],
          open: d.open || 0,
          high: d.high || 0,
          low: d.low || 0,
          close: d.close || 0,
          volume: d.volume || 0,
        };
      });
    } catch (e) {}
  }
  return [];
}

// ── Technical indicators ──
function calcRSI(closes, period) {
  period = period || 14;
  if (closes.length < period + 1) return null;
  var gains = 0, losses = 0;
  for (var i = closes.length - period; i < closes.length; i++) {
    var diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses += Math.abs(diff);
  }
  var ag = gains / period, al = losses / period;
  return al === 0 ? 100 : Math.round(100 - (100 / (1 + ag / al)));
}

function calcSMA(closes, period, idx) {
  if (idx < period - 1) return null;
  var sum = 0;
  for (var i = idx - period + 1; i <= idx; i++) sum += closes[i];
  return sum / period;
}

// Compute indicators for each day
function buildSeries(history) {
  var closes = history.map(function(h) { return h.close; });
  var series = [];
  for (var i = 0; i < history.length; i++) {
    var h = history[i];
    var rsi = null;
    if (i >= 14) {
      var slice = closes.slice(i - 14, i + 1);
      rsi = calcRSI(slice);
    }
    series.push({
      date: h.date,
      close: h.close,
      high: h.high,
      low: h.low,
      volume: h.volume,
      rsi: rsi,
      sma20: calcSMA(closes, 20, i),
      sma50: calcSMA(closes, 50, i),
    });
  }
  return series;
}

// ══════════════════════════════════════════════
// STRATEGIES
// ══════════════════════════════════════════════

// Strategy 1: RSI Oversold/Overbought
function strategyRSI(series) {
  var trades = [];
  var position = null;
  for (var i = 1; i < series.length; i++) {
    var s = series[i];
    if (!s.rsi) continue;

    // BUY when RSI crosses below 30
    if (!position && s.rsi < 30 && series[i-1].rsi >= 30) {
      position = { entry: s.close, entryDate: s.date, entryIdx: i };
    }
    // SELL when RSI crosses above 70
    else if (position && s.rsi > 70 && series[i-1].rsi <= 70) {
      var pnl = ((s.close - position.entry) / position.entry) * 100;
      trades.push({
        entryDate: position.entryDate, exitDate: s.date,
        entryPrice: position.entry, exitPrice: s.close,
        pnlPct: Math.round(pnl * 100) / 100,
        days: i - position.entryIdx,
        result: pnl > 0 ? "ربح" : "خسارة",
      });
      position = null;
    }
  }
  return trades;
}

// Strategy 2: SMA Crossover (Golden Cross / Death Cross)
function strategySMA(series) {
  var trades = [];
  var position = null;
  for (var i = 1; i < series.length; i++) {
    var s = series[i], prev = series[i-1];
    if (!s.sma20 || !s.sma50 || !prev.sma20 || !prev.sma50) continue;

    // BUY: SMA20 crosses above SMA50 (Golden Cross)
    if (!position && s.sma20 > s.sma50 && prev.sma20 <= prev.sma50) {
      position = { entry: s.close, entryDate: s.date, entryIdx: i };
    }
    // SELL: SMA20 crosses below SMA50 (Death Cross)
    else if (position && s.sma20 < s.sma50 && prev.sma20 >= prev.sma50) {
      var pnl = ((s.close - position.entry) / position.entry) * 100;
      trades.push({
        entryDate: position.entryDate, exitDate: s.date,
        entryPrice: Math.round(position.entry * 100) / 100,
        exitPrice: Math.round(s.close * 100) / 100,
        pnlPct: Math.round(pnl * 100) / 100,
        days: i - position.entryIdx,
        result: pnl > 0 ? "ربح" : "خسارة",
      });
      position = null;
    }
  }
  return trades;
}

// Strategy 3: Buy & Hold
function strategyBuyHold(series) {
  if (series.length < 2) return [];
  var entry = series[0], exit = series[series.length - 1];
  var pnl = ((exit.close - entry.close) / entry.close) * 100;
  return [{
    entryDate: entry.date, exitDate: exit.date,
    entryPrice: Math.round(entry.close * 100) / 100,
    exitPrice: Math.round(exit.close * 100) / 100,
    pnlPct: Math.round(pnl * 100) / 100,
    days: series.length,
    result: pnl > 0 ? "ربح" : "خسارة",
  }];
}

// ══════════════════════════════════════════════
// METRICS
// ══════════════════════════════════════════════

function calcMetrics(trades, initialCapital) {
  initialCapital = initialCapital || 10000;
  if (trades.length === 0) {
    return { trades: 0, winRate: 0, totalReturn: 0, avgReturn: 0, maxDrawdown: 0, sharpe: 0, finalCapital: initialCapital };
  }

  var capital = initialCapital;
  var peakCapital = capital;
  var maxDD = 0;
  var wins = 0, losses = 0;
  var returns = [];

  trades.forEach(function(t) {
    capital = capital * (1 + t.pnlPct / 100);
    if (capital > peakCapital) peakCapital = capital;
    var dd = ((peakCapital - capital) / peakCapital) * 100;
    if (dd > maxDD) maxDD = dd;
    if (t.pnlPct > 0) wins++; else losses++;
    returns.push(t.pnlPct);
  });

  var totalReturn = ((capital - initialCapital) / initialCapital) * 100;
  var avgReturn = returns.reduce(function(a, r) { return a + r; }, 0) / returns.length;

  // Sharpe Ratio (simplified)
  var mean = avgReturn;
  var variance = returns.reduce(function(a, r) { return a + Math.pow(r - mean, 2); }, 0) / returns.length;
  var stdDev = Math.sqrt(variance);
  var sharpe = stdDev > 0 ? (mean / stdDev) * Math.sqrt(252 / (returns.length || 1)) : 0;

  return {
    trades: trades.length,
    wins: wins,
    losses: losses,
    winRate: Math.round((wins / trades.length) * 1000) / 10,
    totalReturn: Math.round(totalReturn * 100) / 100,
    avgReturn: Math.round(avgReturn * 100) / 100,
    maxDrawdown: Math.round(maxDD * 100) / 100,
    sharpe: Math.round(sharpe * 100) / 100,
    finalCapital: Math.round(capital),
    initialCapital: initialCapital,
  };
}

// ══════════════════════════════════════════════
// ROUTE HANDLER
// ══════════════════════════════════════════════
export async function GET(request) {
  var url = new URL(request.url);
  var code = url.searchParams.get("code") || "2222";
  var strategy = url.searchParams.get("strategy") || "rsi";
  var days = parseInt(url.searchParams.get("days") || "365");
  var capital = parseInt(url.searchParams.get("capital") || "10000");

  try {
    var info = SAUDI_STOCKS[code];
    if (!info) return Response.json({ error: "رمز غير موجود" }, { status: 404 });

    console.log("[Backtest] " + code + " strategy=" + strategy + " days=" + days);

    var history = await fetchHistory(code, days);
    if (history.length < 30) {
      return Response.json({
        error: "بيانات تاريخية غير كافية",
        detail: "تم جلب " + history.length + " يوم فقط (الحد الأدنى 30)",
      }, { status: 502 });
    }

    var series = buildSeries(history);
    var trades;
    var strategyName;
    var description;

    if (strategy === "sma") {
      trades = strategySMA(series);
      strategyName = "تقاطع المتوسطات (SMA 20/50)";
      description = "شراء عند تقاطع MA20 فوق MA50 (Golden Cross)، بيع عند التقاطع السفلي (Death Cross)";
    } else if (strategy === "hold") {
      trades = strategyBuyHold(series);
      strategyName = "شراء واحتفاظ (Buy & Hold)";
      description = "شراء في بداية الفترة والاحتفاظ حتى نهايتها";
    } else {
      trades = strategyRSI(series);
      strategyName = "مؤشر القوة النسبية (RSI 14)";
      description = "شراء عند RSI < 30 (تشبع بيع)، بيع عند RSI > 70 (تشبع شراء)";
    }

    var metrics = calcMetrics(trades, capital);

    // Buy & Hold comparison
    var buyHoldTrades = strategyBuyHold(series);
    var buyHoldMetrics = calcMetrics(buyHoldTrades, capital);

    return Response.json({
      stock: { code: code, name: info.name, sector: info.sector },
      strategy: { id: strategy, name: strategyName, description: description },
      period: {
        days: days,
        from: series[0].date,
        to: series[series.length - 1].date,
        dataPoints: series.length,
      },
      metrics: metrics,
      buyHoldComparison: {
        totalReturn: buyHoldMetrics.totalReturn,
        beat: metrics.totalReturn > buyHoldMetrics.totalReturn,
        difference: Math.round((metrics.totalReturn - buyHoldMetrics.totalReturn) * 100) / 100,
      },
      trades: trades.slice(-20), // Last 20 trades
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Backtest] " + error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
