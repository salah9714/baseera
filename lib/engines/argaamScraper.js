// ══════════════════════════════════════════════════════════════
// Argaam Scraper Engine v2.0 — data-attribute based
// يستخرج البيانات من attributes على span.searchingElements
// Verified structure from actual Vercel-fetched HTML:
// <span class="searchingElements"
//   relf-Stocksymbol="2222"
//   relf-companyName="SAUDI ARAMCO"
//   relf-close="27.2000"
//   relf-change="-0.3200"
//   relf-change-percantage="-1.1628"   ← note Argaam's spelling
//   relf-prev-close="27.5200"
//   relf-volume="7738516.0000"
//   relf-amount="211101389.0000"
//   relf-tickerid="12434">
// ══════════════════════════════════════════════════════════════

var ARGAAM_URL = "https://www.argaam.com/en/company/companies-prices/3";

// ──────────────────────────────────────────────
// Sector mapping (English → Arabic)
// ──────────────────────────────────────────────

var SECTOR_AR = {
  "Energy": "الطاقة",
  "Materials": "المواد",
  "Capital Goods": "السلع الرأسمالية",
  "Commercial & Professional Svc": "الخدمات التجارية",
  "Commercial &amp; Professional Svc": "الخدمات التجارية",
  "Transportation": "النقل",
  "Consumer Durables & Apparel": "السلع الاستهلاكية المعمرة",
  "Consumer Durables &amp; Apparel": "السلع الاستهلاكية المعمرة",
  "Consumer Services": "الخدمات الاستهلاكية",
  "Media and Entertainment": "الإعلام والترفيه",
  "Consumer Discretionary Distribution & Retail": "تجزئة الكماليات",
  "Consumer Discretionary Distribution &amp; Retail": "تجزئة الكماليات",
  "Consumer Staples Distribution & Retail": "تجزئة الأساسيات",
  "Consumer Staples Distribution &amp; Retail": "تجزئة الأساسيات",
  "Food & Beverages": "الأغذية",
  "Food &amp; Beverages": "الأغذية",
  "Health Care Equipment & Svc": "الرعاية الصحية",
  "Health Care Equipment &amp; Svc": "الرعاية الصحية",
  "Pharma, Biotech & Life Sciences": "الأدوية",
  "Pharma, Biotech &amp; Life Sciences": "الأدوية",
  "Banks": "البنوك",
  "Financial Services": "الخدمات المالية",
  "Insurance": "التأمين",
  "Software & Services": "البرمجيات",
  "Software &amp; Services": "البرمجيات",
  "Telecommunication Services": "الاتصالات",
  "Utilities": "المرافق",
  "REITs": "ريتس",
  "Real Estate Mgmt & Dev't": "العقار",
  "Real Estate Mgmt &amp; Dev't": "العقار",
  "Household & Personal Products": "المنتجات المنزلية",
  "Household &amp; Personal Products": "المنتجات المنزلية",
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function getAttr(elemStr, attrName) {
  // Argaam uses quoted attributes: relf-close="27.2000"
  var re = new RegExp(attrName + '\\s*=\\s*"([^"]*)"', "i");
  var m = elemStr.match(re);
  return m ? m[1] : null;
}

function toNumber(str) {
  if (str === null || str === undefined) return 0;
  var n = parseFloat(String(str).replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

function decodeEntities(s) {
  if (!s) return s;
  return s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

// ──────────────────────────────────────────────
// Parse the HTML — search all span.searchingElements
// ──────────────────────────────────────────────

function parseStocks(html) {
  var stocks = [];

  // Pre-index sector positions so we can assign sectors by offset
  // Pattern: <span class="head sectorfilterremove_main">Energy</span>
  var sectorRegex = /<span[^>]*class="[^"]*sectorfilterremove_main[^"]*"[^>]*>([^<]+)<\/span>/gi;
  var sectorBoundaries = [];
  var sm;
  while ((sm = sectorRegex.exec(html)) !== null) {
    var name = decodeEntities(sm[1].trim());
    sectorBoundaries.push({ offset: sm.index, name: name, ar: SECTOR_AR[name] || name });
  }

  function sectorAt(offset) {
    var current = "عام";
    for (var i = 0; i < sectorBoundaries.length; i++) {
      if (sectorBoundaries[i].offset <= offset) current = sectorBoundaries[i].ar;
      else break;
    }
    return current;
  }

  // Find all searchingElements spans
  // They can be: <span class="searchingElements" attr1="..." attr2="..." ...>
  // Use relatively permissive regex to capture the opening tag
  var elemRegex = /<span\s+class="searchingElements"([^>]*)>/gi;
  var match;
  var seenCodes = {};

  while ((match = elemRegex.exec(html)) !== null) {
    var attrs = match[1];
    var offset = match.index;

    var code = getAttr(attrs, "relf-Stocksymbol");
    if (!code || !/^\d{4}$/.test(code)) continue;
    if (seenCodes[code]) continue;  // dedupe
    seenCodes[code] = true;

    var name = getAttr(attrs, "relf-companyName") || "";
    var close = toNumber(getAttr(attrs, "relf-close"));
    var change = toNumber(getAttr(attrs, "relf-change"));
    var changePct = toNumber(getAttr(attrs, "relf-change-percantage"));  // Argaam's spelling
    if (changePct === 0) changePct = toNumber(getAttr(attrs, "relf-change-percentage"));  // fallback
    var prevClose = toNumber(getAttr(attrs, "relf-prev-close"));
    var volume = toNumber(getAttr(attrs, "relf-volume"));
    var amount = toNumber(getAttr(attrs, "relf-amount"));

    if (close === 0) continue;  // skip empty rows

    stocks.push({
      code: code,
      name: decodeEntities(name),
      sector: sectorAt(offset),
      price: close,
      change: change,
      changePct: changePct,
      prevClose: prevClose,
      volume: volume,
      turnover: amount,
      transactions: 0,   // not exposed in this element; available elsewhere
      high52w: 0,        // not exposed here
      low52w: 0,
    });
  }

  return stocks;
}

// ──────────────────────────────────────────────
// Extract main indices (TASI, NomuC) from the top of the page
// ──────────────────────────────────────────────

function extractIndex(html, name) {
  // Pattern near: "TASI\n\n11,090.33\n\n10.40 \n0.09 %"
  // Or inside divs
  var re = new RegExp(">?\\s*" + name + "\\s*[<\\n][\\s\\S]{0,200}?([\\d,]+\\.\\d{2})[\\s\\S]{0,120}?([\\-\\(]?\\s*[\\d,.]+\\s*\\)?)[\\s\\S]{0,60}?\\(?\\s*([\\-\\(]?\\s*[\\d.]+\\s*\\)?)\\s*%", "i");
  var m = html.match(re);
  if (!m) return null;
  function parseNum(s) {
    if (!s) return 0;
    var neg = String(s).indexOf("(") >= 0 || String(s).indexOf("-") >= 0;
    var n = parseFloat(String(s).replace(/[(),\-\s]/g, ""));
    if (isNaN(n)) return 0;
    return neg ? -Math.abs(n) : n;
  }
  return { value: parseNum(m[1]), change: parseNum(m[2]), changePct: parseNum(m[3]) };
}

function extractDataDate(html) {
  var m = html.match(/(\d{2}\/\d{2}\/\d{4})/);
  if (!m) return null;
  var p = m[1].split("/");
  return p[2] + "-" + p[1] + "-" + p[0];
}

// ──────────────────────────────────────────────
// Main fetch
// ──────────────────────────────────────────────

export async function fetchArgaamData() {
  try {
    console.log("[Argaam] Fetching " + ARGAAM_URL);
    var res = await fetch(ARGAAM_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("[Argaam] HTTP " + res.status);
      return { error: "HTTP " + res.status };
    }

    var html = await res.text();
    var dataDate = extractDataDate(html);
    var tasi = extractIndex(html, "TASI");
    var nomuc = extractIndex(html, "NomuC");
    var stocks = parseStocks(html);

    console.log("[Argaam] Parsed " + stocks.length + " stocks, date=" + dataDate);

    return {
      ok: true,
      data_date: dataDate,
      indices: { tasi: tasi, nomuc: nomuc },
      stocks: stocks,
      count: stocks.length,
      source: "argaam",
      timestamp: new Date().toISOString(),
    };
  } catch (e) {
    console.error("[Argaam] Error: " + e.message);
    return { error: e.message };
  }
}

export function stocksToMap(stocks, filterCodes) {
  var map = {};
  stocks.forEach(function(s) {
    if (filterCodes && filterCodes.indexOf(s.code) < 0) return;
    map[s.code] = s;
  });
  return map;
}
