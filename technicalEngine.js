import { fetchArgaamData } from "../../../lib/engines/argaamScraper.js";

export const dynamic = "force-dynamic";

// ══════════════════════════════════════════════════════════════
// Market API v2 - Argaam-powered
// TASI + NomuC are 100% accurate from Argaam
// MT30 still missing (not exposed in Argaam quotes page)
// ══════════════════════════════════════════════════════════════

// Cached to avoid re-fetching when stocks API already fetched it
var cache = { data: null, timestamp: 0 };
var CACHE_MS = 5 * 60 * 1000;

async function getCachedData() {
  var now = Date.now();
  if (cache.data && (now - cache.timestamp) < CACHE_MS) return cache.data;
  var result = await fetchArgaamData();
  if (result.ok) {
    cache.data = result;
    cache.timestamp = now;
  }
  return result;
}

function getMarketStatus() {
  try {
    var now = new Date();
    // Riyadh = UTC+3 (no DST)
    var riyadhHours = (now.getUTCHours() + 3) % 24;
    var riyadhMinutes = now.getUTCMinutes();
    var riyadhDay = now.getUTCDay();
    if (now.getUTCHours() + 3 >= 24) riyadhDay = (riyadhDay + 1) % 7;

    // Weekend: Friday (5) and Saturday (6) in Saudi Arabia
    if (riyadhDay === 5 || riyadhDay === 6) {
      return { state: "closed", label: "مغلق (نهاية الأسبوع)", color: "red", emoji: "🔴" };
    }

    var minutes = riyadhHours * 60 + riyadhMinutes;
    if (minutes < 570) return { state: "pre_market", label: "قبل الافتتاح", color: "gold", emoji: "🟡" };
    if (minutes < 600) return { state: "pre_open", label: "جلسة افتتاح", color: "gold", emoji: "🟡" };
    if (minutes < 900) return { state: "open", label: "السوق مفتوح", color: "green", emoji: "🟢" };
    if (minutes < 910) return { state: "closing", label: "جلسة الإغلاق", color: "gold", emoji: "🟡" };
    return { state: "closed", label: "مغلق (انتهى التداول)", color: "red", emoji: "🔴" };
  } catch (e) {
    return { state: "unknown", label: "غير معروف", color: "grey", emoji: "⚪" };
  }
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  try { return Math.floor((new Date() - new Date(dateStr)) / 86400000); } catch (e) { return null; }
}

export async function GET() {
  try {
    var result = await getCachedData();

    if (!result || !result.ok) {
      return Response.json({
        error: "تعذر تحميل بيانات السوق من Argaam",
        detail: result ? result.error : "unknown",
      }, { status: 502 });
    }

    var tasi = result.indices.tasi || { value: 0, change: 0, changePct: 0 };
    var nomuc = result.indices.nomuc || { value: 0, change: 0, changePct: 0 };

    // Compute market regime based on TASI
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
    var ageDays = daysSince(result.data_date);

    // Compute top gainers and losers for dashboard stats
    var gainers = result.stocks.filter(function(s) { return s.changePct > 0; }).length;
    var losers = result.stocks.filter(function(s) { return s.changePct < 0; }).length;

    return Response.json({
      market_status: marketStatus,
      indices: {
        tasi: { value: tasi.value, change: tasi.change, changePct: tasi.changePct, date: result.data_date },
        mt30: { value: 0, change: 0, changePct: 0, date: result.data_date },  // not available from Argaam quotes page
        nomuc: { value: nomuc.value, change: nomuc.change, changePct: nomuc.changePct, date: result.data_date },
      },
      // Backward-compatible fields
      tasi: { value: tasi.value, change: tasi.changePct, high: tasi.value, low: tasi.value, sma200: 0, sma50: 0 },
      oil: { price: 0, change: 0 },
      regime: { state: state, score: score, description: desc },
      breadth: {
        total: result.stocks.length,
        gainers: gainers,
        losers: losers,
        unchanged: result.stocks.length - gainers - losers,
      },
      data_date: result.data_date,
      data_age_days: ageDays,
      timestamp: new Date().toISOString(),
      source: "argaam",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
