export const dynamic = "force-dynamic";
var API_KEY = process.env.MARKETSTACK_KEY || "0bac9135fc2c32aa38536052154cfad8";

// Determine Saudi market status based on Riyadh time
function getMarketStatus() {
  try {
    var now = new Date();
    // Riyadh = UTC+3, no DST
    var riyadhHours = (now.getUTCHours() + 3) % 24;
    var riyadhMinutes = now.getUTCMinutes();
    var riyadhDay = now.getUTCDay(); // 0=Sun, 5=Fri, 6=Sat
    // Adjust day for timezone shift at midnight
    if (now.getUTCHours() + 3 >= 24) riyadhDay = (riyadhDay + 1) % 7;

    // Weekend: Friday (5) and Saturday (6)
    if (riyadhDay === 5 || riyadhDay === 6) {
      return { state: "closed", label: "مغلق (نهاية الأسبوع)", color: "red", emoji: "🔴" };
    }

    var minutes = riyadhHours * 60 + riyadhMinutes;
    var preOpenStart = 9 * 60 + 30;     // 09:30
    var marketOpen = 10 * 60;            // 10:00
    var marketClose = 15 * 60;           // 15:00
    var closingAuction = 15 * 60 + 10;   // 15:10

    if (minutes < preOpenStart) {
      return { state: "pre_market", label: "قبل الافتتاح", color: "gold", emoji: "🟡" };
    } else if (minutes < marketOpen) {
      return { state: "pre_open", label: "جلسة افتتاح", color: "gold", emoji: "🟡" };
    } else if (minutes < marketClose) {
      return { state: "open", label: "السوق مفتوح", color: "green", emoji: "🟢" };
    } else if (minutes < closingAuction) {
      return { state: "closing", label: "جلسة الإغلاق", color: "gold", emoji: "🟡" };
    } else {
      return { state: "closed", label: "مغلق (انتهى التداول)", color: "red", emoji: "🔴" };
    }
  } catch (e) {
    return { state: "unknown", label: "غير معروف", color: "grey", emoji: "⚪" };
  }
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  try { return Math.floor((new Date() - new Date(dateStr)) / 86400000); } catch (e) { return null; }
}

async function fetchIndex(symbol) {
  var urls = [
    "https://api.marketstack.com/v1/eod/latest?access_key=" + API_KEY + "&symbols=" + symbol + "&limit=1",
    "http://api.marketstack.com/v1/eod/latest?access_key=" + API_KEY + "&symbols=" + symbol + "&limit=1",
  ];
  for (var u = 0; u < urls.length; u++) {
    try {
      var res = await fetch(urls[u], { signal: AbortSignal.timeout(8000), cache: "no-store" });
      if (res.status === 401 && u === 0) continue;
      if (!res.ok) continue;
      var json = await res.json();
      if (!json.data || !json.data[0]) continue;
      return json.data[0];
    } catch (e) {}
  }
  return null;
}

export async function GET() {
  try {
    // Fetch all three major indices in parallel
    var results = await Promise.all([
      fetchIndex("TASI.INDX"),
      fetchIndex("MT30.INDX"),
      fetchIndex("NOMUC.INDX"),
    ]);

    var tasiRaw = results[0];
    var mt30Raw = results[1];
    var nomucRaw = results[2];

    function toIndex(raw) {
      if (!raw) return { value: 0, change: 0, changePct: 0, date: null };
      var price = raw.close || 0;
      var open = raw.open || price;
      return {
        value: Math.round(price * 100) / 100,
        open: Math.round(open * 100) / 100,
        high: raw.high || 0,
        low: raw.low || 0,
        change: Math.round((price - open) * 100) / 100,
        changePct: open > 0 ? Math.round(((price - open) / open) * 10000) / 100 : 0,
        date: (raw.date || "").split("T")[0],
      };
    }

    var tasi = toIndex(tasiRaw);
    var mt30 = toIndex(mt30Raw);
    var nomuc = toIndex(nomucRaw);

    // Compute market regime score based on TASI trend
    var score = 50;
    if (tasi.changePct > 1) score += 20;
    else if (tasi.changePct > 0) score += 10;
    else if (tasi.changePct < -1) score -= 20;
    else if (tasi.changePct < 0) score -= 10;

    var state, desc;
    if (score >= 75) { state = "صعود قوي"; desc = "السوق في موجة صعود قوية"; }
    else if (score >= 60) { state = "صعود بحذر"; desc = "صعود مع انتقائية"; }
    else if (score >= 45) { state = "نطاق عرضي"; desc = "لا اتجاه واضح"; }
    else if (score >= 30) { state = "تحذير"; desc = "إشارات ضعف"; }
    else { state = "هبوط"; desc = "حماية رأس المال"; }

    var marketStatus = getMarketStatus();
    var ageDays = daysSince(tasi.date);

    return Response.json({
      market_status: marketStatus,
      indices: {
        tasi: tasi,
        mt30: mt30,
        nomuc: nomuc,
      },
      // Keep backward-compatible fields for current UI
      tasi: { value: tasi.value, change: tasi.changePct, high: tasi.high, low: tasi.low, sma200: 0, sma50: 0 },
      oil: { price: 0, change: 0 },
      regime: { state: state, score: score, description: desc },
      data_date: tasi.date,
      data_age_days: ageDays,
      timestamp: new Date().toISOString(),
      source: "marketstack",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
