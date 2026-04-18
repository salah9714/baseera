// ══════════════════════════════════════════════════════════════
// Technical Analysis Engine v1.0
// محرك التحليل الفني - RSI + SMA + MACD + Trend + Trade Setup
// ══════════════════════════════════════════════════════════════
//
// Inputs:
// - history: array of { date, open, high, low, close, volume }
// - minimum 30 data points required
//
// Outputs: structured technical analysis + actionable trade setup

// ──────────────────────────────────────────────
// Indicator Calculations
// ──────────────────────────────────────────────

function sma(values, period) {
  if (values.length < period) return null;
  var sum = 0;
  for (var i = values.length - period; i < values.length; i++) sum += values[i];
  return sum / period;
}

function smaSeries(values, period) {
  var result = [];
  for (var i = 0; i < values.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    var sum = 0;
    for (var j = i - period + 1; j <= i; j++) sum += values[j];
    result.push(sum / period);
  }
  return result;
}

function ema(values, period) {
  if (values.length < period) return null;
  var k = 2 / (period + 1);
  var e = values[0];
  for (var i = 1; i < values.length; i++) {
    e = values[i] * k + e * (1 - k);
  }
  return e;
}

function emaSeries(values, period) {
  var k = 2 / (period + 1);
  var result = [values[0]];
  for (var i = 1; i < values.length; i++) {
    result.push(values[i] * k + result[i-1] * (1 - k));
  }
  return result;
}

function rsi(closes, period) {
  period = period || 14;
  if (closes.length < period + 1) return null;
  var gains = 0, losses = 0;
  for (var i = closes.length - period; i < closes.length; i++) {
    var diff = closes[i] - closes[i-1];
    if (diff > 0) gains += diff; else losses += Math.abs(diff);
  }
  var ag = gains / period, al = losses / period;
  if (al === 0) return 100;
  var rs = ag / al;
  return 100 - (100 / (1 + rs));
}

function macd(closes) {
  if (closes.length < 26) return { macd: null, signal: null, histogram: null };
  var ema12 = emaSeries(closes, 12);
  var ema26 = emaSeries(closes, 26);
  var macdLine = [];
  for (var i = 0; i < closes.length; i++) {
    macdLine.push(ema12[i] - ema26[i]);
  }
  var signalLine = emaSeries(macdLine, 9);
  var lastMacd = macdLine[macdLine.length - 1];
  var lastSignal = signalLine[signalLine.length - 1];
  return {
    macd: lastMacd,
    signal: lastSignal,
    histogram: lastMacd - lastSignal,
  };
}

function bollingerBands(closes, period, stdDevMult) {
  period = period || 20;
  stdDevMult = stdDevMult || 2;
  if (closes.length < period) return null;
  var slice = closes.slice(-period);
  var mean = slice.reduce(function(a, c) { return a + c; }, 0) / period;
  var variance = slice.reduce(function(a, c) { return a + Math.pow(c - mean, 2); }, 0) / period;
  var sd = Math.sqrt(variance);
  return {
    upper: mean + stdDevMult * sd,
    middle: mean,
    lower: mean - stdDevMult * sd,
  };
}

function atr(history, period) {
  period = period || 14;
  if (history.length < period + 1) return null;
  var trs = [];
  for (var i = 1; i < history.length; i++) {
    var h = history[i], p = history[i-1];
    var tr = Math.max(
      h.high - h.low,
      Math.abs(h.high - p.close),
      Math.abs(h.low - p.close)
    );
    trs.push(tr);
  }
  var slice = trs.slice(-period);
  return slice.reduce(function(a, c) { return a + c; }, 0) / period;
}

// ──────────────────────────────────────────────
// Support / Resistance Detection
// ──────────────────────────────────────────────

function findSupportResistance(history, lookback) {
  lookback = lookback || 30;
  var slice = history.slice(-lookback);
  var highs = slice.map(function(h) { return h.high; }).sort(function(a,b) { return b-a; });
  var lows = slice.map(function(h) { return h.low; }).sort(function(a,b) { return a-b; });

  // Take top 3 cluster highs and bottom 3 cluster lows
  var resistance = [highs[0], highs[1], highs[2]].filter(function(v) { return v > 0; });
  var support = [lows[0], lows[1], lows[2]].filter(function(v) { return v > 0; });

  return {
    resistance: resistance,
    support: support,
    key_resistance: resistance[0] || 0,
    key_support: support[0] || 0,
  };
}

// ──────────────────────────────────────────────
// Trend Detection
// ──────────────────────────────────────────────

function detectTrend(closes, sma20, sma50) {
  var lastPrice = closes[closes.length - 1];
  var score = 0;
  var notes = [];

  // Price vs MAs
  if (sma20 && lastPrice > sma20) { score += 25; notes.push("السعر فوق MA20"); }
  if (sma20 && lastPrice < sma20) { score -= 20; notes.push("السعر تحت MA20"); }
  if (sma50 && lastPrice > sma50) { score += 25; notes.push("السعر فوق MA50"); }
  if (sma50 && lastPrice < sma50) { score -= 20; notes.push("السعر تحت MA50"); }

  // MA alignment
  if (sma20 && sma50 && sma20 > sma50) { score += 15; notes.push("MA20 فوق MA50 (ترتيب صاعد)"); }
  if (sma20 && sma50 && sma20 < sma50) { score -= 15; notes.push("MA20 تحت MA50 (ترتيب هابط)"); }

  // Price momentum (last 10 days)
  if (closes.length >= 10) {
    var tenAgo = closes[closes.length - 10];
    var pct = ((lastPrice - tenAgo) / tenAgo) * 100;
    if (pct > 5) { score += 15; notes.push("ارتفاع " + pct.toFixed(1) + "% خلال 10 أيام"); }
    else if (pct > 2) { score += 8; }
    else if (pct < -5) { score -= 15; notes.push("انخفاض " + pct.toFixed(1) + "% خلال 10 أيام"); }
    else if (pct < -2) { score -= 8; }
  }

  score = Math.max(-100, Math.min(100, score));

  var direction;
  if (score >= 40) direction = "bullish";
  else if (score >= 15) direction = "mildly_bullish";
  else if (score >= -15) direction = "neutral";
  else if (score >= -40) direction = "mildly_bearish";
  else direction = "bearish";

  var label;
  if (direction === "bullish") label = "صاعد قوي";
  else if (direction === "mildly_bullish") label = "صاعد";
  else if (direction === "neutral") label = "جانبي";
  else if (direction === "mildly_bearish") label = "هابط";
  else label = "هابط قوي";

  return { direction: direction, label: label, score: score, notes: notes };
}

// ──────────────────────────────────────────────
// Volume Analysis
// ──────────────────────────────────────────────

function analyzeVolume(history) {
  if (history.length < 20) return { ratio: 1, label: "غير محدد" };
  var last = history[history.length - 1];
  var last20 = history.slice(-20);
  var avg = last20.reduce(function(a, h) { return a + h.volume; }, 0) / 20;
  if (avg === 0) return { ratio: 1, label: "غير متاح" };
  var ratio = last.volume / avg;
  var label;
  if (ratio > 2) label = "مرتفع جداً";
  else if (ratio > 1.3) label = "مرتفع";
  else if (ratio > 0.7) label = "طبيعي";
  else label = "منخفض";
  return { ratio: Math.round(ratio * 100) / 100, label: label, avgVolume: Math.round(avg), lastVolume: last.volume };
}

// ──────────────────────────────────────────────
// Trade Setup Builder
// ──────────────────────────────────────────────

function buildTradeSetup(history, trend, rsiValue, sr, atrValue) {
  var last = history[history.length - 1];
  var entry = last.close;

  // Determine setup type
  var setup = null;

  if (trend.direction === "bullish" || trend.direction === "mildly_bullish") {
    // Long setup
    var stopLoss = Math.max(
      sr.key_support * 0.98,  // 2% below support
      entry - (atrValue ? atrValue * 2 : entry * 0.04)  // OR 2xATR / 4% below
    );

    var target1 = sr.key_resistance > entry ? sr.key_resistance : entry * 1.05;
    var target2 = target1 + (target1 - entry);  // 1:1 extension
    var target3 = entry * 1.10;

    var risk = entry - stopLoss;
    var reward = target1 - entry;
    var rr = risk > 0 ? reward / risk : 0;

    setup = {
      bias: "شراء (Long)",
      entry: Math.round(entry * 100) / 100,
      stop_loss: Math.round(stopLoss * 100) / 100,
      targets: [
        { label: "الهدف الأول", price: Math.round(target1 * 100) / 100 },
        { label: "الهدف الثاني", price: Math.round(target2 * 100) / 100 },
        { label: "الهدف الثالث", price: Math.round(target3 * 100) / 100 },
      ],
      risk_per_share: Math.round(risk * 100) / 100,
      reward_per_share: Math.round(reward * 100) / 100,
      risk_reward_ratio: Math.round(rr * 100) / 100,
      position_size_note: "احسب حجم المركز بحيث لا تتجاوز الخسارة 1-2% من رأس المال",
    };

    if (rsiValue && rsiValue > 75) {
      setup.warning = "RSI في منطقة تشبع شراء — انتظر تراجع قصير للدخول";
    }
  } else if (trend.direction === "bearish" || trend.direction === "mildly_bearish") {
    // Bearish - avoid or wait
    setup = {
      bias: "انتظار / تجنب",
      entry: null,
      stop_loss: null,
      targets: [],
      note: "الاتجاه هابط — الأفضل الانتظار حتى استقرار السعر أو ظهور انعكاس فني واضح",
      reversal_trigger: "كسر " + Math.round(sr.key_resistance * 100) / 100 + " أو تقاطع صاعد لـ MA20/MA50",
    };

    if (rsiValue && rsiValue < 30) {
      setup.note = "RSI في تشبع بيع — قد يكون هناك ارتداد قريب لكن الاتجاه العام لا يزال هابط";
    }
  } else {
    // Neutral
    setup = {
      bias: "محايد",
      entry: null,
      stop_loss: null,
      targets: [],
      note: "السوق في نطاق عرضي — ينتظر إشارة واضحة (كسر مقاومة أو ارتداد من دعم)",
      watch_levels: {
        breakout_above: Math.round(sr.key_resistance * 100) / 100,
        breakdown_below: Math.round(sr.key_support * 100) / 100,
      },
    };
  }

  return setup;
}

// ──────────────────────────────────────────────
// Momentum Score (0-100)
// ──────────────────────────────────────────────

function computeMomentumScore(trend, rsiValue, macdData, volumeData) {
  var score = 50;

  // Trend contribution (most weight)
  score += trend.score * 0.35;

  // RSI contribution
  if (rsiValue !== null) {
    if (rsiValue > 70) score -= 10;      // overbought = momentum exhausted
    else if (rsiValue > 60) score += 8;   // strong but healthy
    else if (rsiValue > 50) score += 5;
    else if (rsiValue > 40) score -= 2;
    else if (rsiValue > 30) score -= 8;
    else score += 5;                      // oversold = potential reversal
  }

  // MACD contribution
  if (macdData && macdData.histogram !== null) {
    if (macdData.histogram > 0) score += 8;
    else score -= 8;
  }

  // Volume contribution
  if (volumeData.ratio > 1.5 && trend.score > 0) score += 5;  // volume confirms uptrend
  if (volumeData.ratio > 1.5 && trend.score < 0) score -= 5;  // volume confirms downtrend

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ══════════════════════════════════════════════════════════════
// MAIN EXPORTED FUNCTION
// ══════════════════════════════════════════════════════════════
export function analyzeTechnical(history) {
  if (!history || !Array.isArray(history) || history.length < 30) {
    return { error: "بيانات تاريخية غير كافية (يلزم 30+ يوم)", received: history ? history.length : 0 };
  }

  var closes = history.map(function(h) { return h.close; });
  var lastPrice = closes[closes.length - 1];

  // Compute indicators
  var sma20 = sma(closes, 20);
  var sma50 = sma(closes, 50);
  var sma200 = sma(closes, 200);
  var rsi14 = rsi(closes, 14);
  var macdData = macd(closes);
  var bb = bollingerBands(closes, 20, 2);
  var atr14 = atr(history, 14);

  // Analysis
  var trend = detectTrend(closes, sma20, sma50);
  var sr = findSupportResistance(history, 30);
  var volumeData = analyzeVolume(history);
  var momentumScore = computeMomentumScore(trend, rsi14, macdData, volumeData);
  var tradeSetup = buildTradeSetup(history, trend, rsi14, sr, atr14);

  // MACD signal interpretation
  var macdSignal;
  if (macdData.histogram === null) macdSignal = "غير متاح";
  else if (macdData.histogram > 0 && macdData.macd > 0) macdSignal = "صاعد قوي";
  else if (macdData.histogram > 0) macdSignal = "انعكاس صاعد محتمل";
  else if (macdData.histogram < 0 && macdData.macd < 0) macdSignal = "هابط قوي";
  else macdSignal = "انعكاس هابط محتمل";

  // RSI interpretation
  var rsiLabel;
  if (rsi14 === null) rsiLabel = "غير متاح";
  else if (rsi14 > 70) rsiLabel = "تشبع شراء";
  else if (rsi14 > 60) rsiLabel = "قوة صاعدة";
  else if (rsi14 > 40) rsiLabel = "محايد";
  else if (rsi14 > 30) rsiLabel = "ضعف هابط";
  else rsiLabel = "تشبع بيع";

  return {
    trend: {
      direction: trend.direction,
      label: trend.label,
      score: trend.score,
      notes: trend.notes,
    },
    support_resistance: sr,
    rsi: {
      value: rsi14 !== null ? Math.round(rsi14 * 10) / 10 : null,
      label: rsiLabel,
    },
    macd: {
      value: macdData.macd !== null ? Math.round(macdData.macd * 100) / 100 : null,
      signal: macdData.signal !== null ? Math.round(macdData.signal * 100) / 100 : null,
      histogram: macdData.histogram !== null ? Math.round(macdData.histogram * 100) / 100 : null,
      signal_label: macdSignal,
    },
    moving_averages: {
      sma20: sma20 ? Math.round(sma20 * 100) / 100 : null,
      sma50: sma50 ? Math.round(sma50 * 100) / 100 : null,
      sma200: sma200 ? Math.round(sma200 * 100) / 100 : null,
      price_vs_sma20: sma20 ? Math.round(((lastPrice - sma20) / sma20) * 10000) / 100 : null,
      price_vs_sma50: sma50 ? Math.round(((lastPrice - sma50) / sma50) * 10000) / 100 : null,
    },
    bollinger: bb ? {
      upper: Math.round(bb.upper * 100) / 100,
      middle: Math.round(bb.middle * 100) / 100,
      lower: Math.round(bb.lower * 100) / 100,
      position: lastPrice > bb.upper ? "فوق النطاق العلوي" : lastPrice < bb.lower ? "تحت النطاق السفلي" : "داخل النطاق",
    } : null,
    volume: volumeData,
    atr: atr14 ? Math.round(atr14 * 100) / 100 : null,
    momentum_score: momentumScore,
    trade_setup: tradeSetup,
    methodology: "Technical analysis v1.0 — RSI + SMA + MACD + BB + ATR + S/R",
    data_points_used: history.length,
  };
}
