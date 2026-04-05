export const dynamic = "force-dynamic";

async function fetchQuick(symbol) {
  try {
    var url = "https://query1.finance.yahoo.com/v8/finance/chart/" + symbol + "?interval=1d&range=5d";
    var res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    var json = await res.json();
    var meta = json.chart.result[0].meta;
    return {
      price: meta.regularMarketPrice || 0,
      prevClose: meta.chartPreviousClose || meta.previousClose || 0,
      change: meta.regularMarketPrice && meta.chartPreviousClose ? Math.round((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose * 10000) / 100 : 0,
      sma50: meta.fiftyDayAverage || 0,
      sma200: meta.twoHundredDayAverage || 0,
    };
  } catch (e) { return null; }
}

export async function GET() {
  try {
    var results = await Promise.all([
      fetchQuick("^TASI.SR"),
      fetchQuick("BZ=F"),
    ]);

    var tasi = results[0] || { price: 0, change: 0, sma200: 0, sma50: 0 };
    var oil = results[1] || { price: 0, change: 0 };

    var score = 50;
    if (tasi.price > tasi.sma200 && tasi.sma200 > 0) score += 15;
    if (tasi.price > tasi.sma50 && tasi.sma50 > 0) score += 10;
    if (tasi.change > 0) score += 5;
    if (oil.price > 75) score += 8;
    if (oil.change > 0) score += 3;

    var state, desc;
    if (score >= 80) { state = "صعود قوي"; desc = "السوق في موجة صعود قوية"; }
    else if (score >= 65) { state = "صعود بحذر"; desc = "صعود مع انتقائية"; }
    else if (score >= 50) { state = "نطاق عرضي"; desc = "لا اتجاه واضح"; }
    else if (score >= 35) { state = "تحذير"; desc = "إشارات ضعف"; }
    else { state = "هبوط"; desc = "حماية رأس المال"; }

    return Response.json({
      tasi: { value: tasi.price, change: tasi.change, sma200: tasi.sma200, sma50: tasi.sma50 },
      oil: { price: oil.price, change: oil.change },
      regime: { state: state, score: score, description: desc },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
