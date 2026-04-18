export const dynamic = "force-dynamic";
var API_KEY = process.env.MARKETSTACK_KEY || "0cdaa7035167a57e21baa44b2285bcf2";

async function fetchIndex() {
  var urls = [
    "https://api.marketstack.com/v1/eod/latest?access_key=" + API_KEY + "&symbols=TASI.INDX&limit=1",
    "http://api.marketstack.com/v1/eod/latest?access_key=" + API_KEY + "&symbols=TASI.INDX&limit=1",
  ];
  for (var u = 0; u < urls.length; u++) {
    try {
      var res = await fetch(urls[u], { signal: AbortSignal.timeout(10000), cache: "no-store" });
      if (res.status === 401 && u === 0) continue;
      var text = await res.text();
      console.log("[market] " + (u===0?"HTTPS":"HTTP") + " " + res.status + " " + text.slice(0, 200));
      if (!res.ok) continue;
      var json = JSON.parse(text);
      if (json.data && json.data[0]) return json.data[0];
    } catch (e) { console.error("[market] " + e.message); }
  }
  return null;
}

export async function GET() {
  try {
    var d = await fetchIndex();
    var tasiValue = 0, tasiChange = 0;
    if (d) {
      tasiValue = Math.round((d.close || 0) * 100) / 100;
      var open = d.open || tasiValue;
      tasiChange = open > 0 ? Math.round(((tasiValue - open) / open) * 10000) / 100 : 0;
    }
    var score = 50;
    if (tasiChange > 1) score += 20; else if (tasiChange > 0) score += 10;
    else if (tasiChange < -1) score -= 20; else if (tasiChange < 0) score -= 10;
    var state, desc;
    if (score >= 75) { state = "صعود قوي"; desc = "السوق في موجة صعود"; }
    else if (score >= 60) { state = "صعود بحذر"; desc = "صعود مع انتقائية"; }
    else if (score >= 45) { state = "نطاق عرضي"; desc = "لا اتجاه واضح"; }
    else if (score >= 30) { state = "تحذير"; desc = "إشارات ضعف"; }
    else { state = "هبوط"; desc = "حماية رأس المال"; }
    return Response.json({ tasi: { value: tasiValue, change: tasiChange, sma200: 0, sma50: 0 }, oil: { price: 0, change: 0 }, regime: { state: state, score: score, description: desc }, timestamp: new Date().toISOString(), source: "marketstack" });
  } catch (error) { return Response.json({ error: error.message }, { status: 500 }); }
}
