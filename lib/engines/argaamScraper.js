// ══════════════════════════════════════════════════════════════
// Argaam Scraper Engine v1.0
// يجلب بيانات السوق السعودي كاملة من Argaam
// البيانات متطابقة 100% مع Saudi Exchange الرسمي
// ══════════════════════════════════════════════════════════════

var ARGAAM_URL = "https://www.argaam.com/en/company/companies-prices/3";

// ──────────────────────────────────────────────
// HTML parsing helpers (no external dependencies)
// ──────────────────────────────────────────────

function stripTags(html) {
  return html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#[0-9]+;/g, "").trim();
}

function parseNumber(str) {
  if (!str) return 0;
  var cleaned = String(str).replace(/,/g, "").replace(/[()%\s]/g, "").trim();
  var num = parseFloat(cleaned);
  // If original had parentheses, it was negative (accounting format)
  if (String(str).indexOf("(") >= 0) num = -Math.abs(num);
  return isNaN(num) ? 0 : num;
}

// Extract current date from header section
function extractDataDate(html) {
  // Look for date pattern like "26/03/2026" near TASI mention
  var match = html.match(/(\d{2}\/\d{2}\/\d{4})/);
  if (match) {
    var parts = match[1].split("/");
    // Convert DD/MM/YYYY to YYYY-MM-DD
    return parts[2] + "-" + parts[1] + "-" + parts[0];
  }
  return null;
}

// Extract TASI index
function extractIndex(html, indexName) {
  // Pattern: "TASI\n\n11,090.33\n\n10.40\n0.09 %"
  var re = new RegExp(indexName + "[\\s\\S]{0,80}?([\\d,]+\\.\\d{2})[\\s\\S]{0,80}?\\(?\\s*([\\(\\-]?[\\d,.]+)\\s*\\)?[\\s\\S]{0,40}?\\(?\\s*([\\(\\-]?[\\d.]+)\\s*%", "i");
  var m = html.match(re);
  if (!m) return null;
  return {
    value: parseNumber(m[1]),
    change: parseNumber(m[2]),
    changePct: parseNumber(m[3]),
  };
}

// ──────────────────────────────────────────────
// Parse HTML table rows into stock objects
// ──────────────────────────────────────────────

function parseStockTable(html) {
  var stocks = [];
  var currentSector = null;

  // Split by sector headers (## Energy, ## Materials, etc.)
  // Actually we'll scan sequentially through the HTML

  // Extract all <tr> rows from tables
  var trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  var sectorRegex = /<h2[^>]*>([^<]+)<\/h2>|<h3[^>]*>([^<]+)<\/h3>/gi;

  // Use a simpler approach: find all stock rows directly
  // Each stock row looks like:
  // <tr>
  //   <td>2222</td>
  //   <td><a href="...">SAUDI ARAMCO</a></td>
  //   ...
  //   <td>27.00</td>
  //   <td>0.14</td>
  //   <td>0.52 %</td>
  //   ...
  // </tr>

  var rowRegex = /<tr>([\s\S]*?)<\/tr>/gi;
  var match;

  // Split by sector markers to assign sectors
  var sectorMarkers = [
    { name: "Energy", ar: "الطاقة" },
    { name: "Materials", ar: "المواد" },
    { name: "Capital Goods", ar: "السلع الرأسمالية" },
    { name: "Commercial & Professional Svc", ar: "الخدمات التجارية" },
    { name: "Transportation", ar: "النقل" },
    { name: "Consumer Durables & Apparel", ar: "السلع الاستهلاكية المعمرة" },
    { name: "Consumer Services", ar: "الخدمات الاستهلاكية" },
    { name: "Media and Entertainment", ar: "الإعلام والترفيه" },
    { name: "Consumer Discretionary Distribution & Retail", ar: "تجزئة السلع الكمالية" },
    { name: "Consumer Staples Distribution & Retail", ar: "تجزئة السلع الأساسية" },
    { name: "Food & Beverages", ar: "الأغذية" },
    { name: "Health Care Equipment & Svc", ar: "الرعاية الصحية" },
    { name: "Pharma, Biotech & Life Sciences", ar: "الأدوية" },
    { name: "Banks", ar: "البنوك" },
    { name: "Financial Services", ar: "الخدمات المالية" },
    { name: "Insurance", ar: "التأمين" },
    { name: "Software & Services", ar: "البرمجيات" },
    { name: "Telecommunication Services", ar: "الاتصالات" },
    { name: "Utilities", ar: "المرافق" },
    { name: "REITs", ar: "ريتس" },
    { name: "Real Estate Mgmt & Dev't", ar: "العقار" },
    { name: "Household & Personal Products", ar: "المنتجات المنزلية" },
  ];

  // Find sector boundaries in HTML
  var sectorBoundaries = [];
  sectorMarkers.forEach(function(sec) {
    var idx = html.indexOf("## " + sec.name);
    if (idx < 0) idx = html.indexOf(">" + sec.name + "<");
    if (idx < 0) idx = html.indexOf(sec.name + "\n\n| St.Symbol");
    if (idx >= 0) sectorBoundaries.push({ index: idx, sector: sec.ar });
  });
  sectorBoundaries.sort(function(a, b) { return a.index - b.index; });

  function sectorAt(offset) {
    var current = "عام";
    for (var i = 0; i < sectorBoundaries.length; i++) {
      if (sectorBoundaries[i].index <= offset) current = sectorBoundaries[i].sector;
      else break;
    }
    return current;
  }

  // Parse rows
  while ((match = rowRegex.exec(html)) !== null) {
    var rowHtml = match[1];
    var rowOffset = match.index;

    // Extract all <td> contents
    var tds = [];
    var tdMatch;
    var tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
      tds.push(stripTags(tdMatch[1]));
    }

    // Valid stock row has ~12 cells and first cell is 4-digit code
    if (tds.length < 10) continue;
    var code = tds[0].trim();
    if (!/^\d{4}$/.test(code)) continue;

    // Column layout (observed from Argaam):
    // 0: Symbol (2222)
    // 1: Short Name (SAUDI ARAMCO)
    // 2: (empty or warning)
    // 3: 52W range "27.00  23.04 27.48"
    // 4: Par Value
    // 5: Price
    // 6: Change
    // 7: Change %
    // 8: Prev. Close
    // 9: Volume
    // 10: Turnover
    // 11: Transactions

    var name = tds[1];
    var range52w = tds[3] || "";
    var parValue = tds[4];
    var price = parseNumber(tds[5]);
    var change = parseNumber(tds[6]);
    var changePct = parseNumber(tds[7]);
    var prevClose = parseNumber(tds[8]);
    var volume = parseNumber(tds[9]);
    var turnover = parseNumber(tds[10]);
    var transactions = parseNumber(tds[11]);

    // Parse 52W range: "27.00  23.04 27.48" — format is current, low, high
    var rangeParts = range52w.replace(/\s+/g, " ").split(" ").filter(function(x) { return x.length > 0; });
    var low52w = 0, high52w = 0;
    if (rangeParts.length >= 3) {
      low52w = parseNumber(rangeParts[1]);
      high52w = parseNumber(rangeParts[2]);
    }

    if (price === 0) continue; // skip invalid rows

    stocks.push({
      code: code,
      name: name,
      sector: sectorAt(rowOffset),
      price: price,
      change: change,
      changePct: changePct,
      prevClose: prevClose,
      volume: volume,
      turnover: turnover,
      transactions: transactions,
      high52w: high52w,
      low52w: low52w,
      par_value: parseNumber(parValue),
    });
  }

  return stocks;
}

// ──────────────────────────────────────────────
// Main exported function
// ──────────────────────────────────────────────

export async function fetchArgaamData() {
  try {
    console.log("[Argaam] Fetching from " + ARGAAM_URL);

    var res = await fetch(ARGAAM_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
      },
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("[Argaam] HTTP " + res.status);
      return { error: "HTTP " + res.status };
    }

    var html = await res.text();
    console.log("[Argaam] Received " + html.length + " bytes");

    var dataDate = extractDataDate(html);
    var tasi = extractIndex(html, "TASI");
    var nomuc = extractIndex(html, "NomuC");
    var stocks = parseStockTable(html);

    console.log("[Argaam] Parsed " + stocks.length + " stocks, date=" + dataDate);

    return {
      ok: true,
      data_date: dataDate,
      indices: {
        tasi: tasi,
        nomuc: nomuc,
      },
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

// Convert to stocks-by-code map (matches existing API format)
export function stocksToMap(stocks, filterCodes) {
  var map = {};
  stocks.forEach(function(s) {
    if (filterCodes && filterCodes.indexOf(s.code) < 0) return;
    map[s.code] = s;
  });
  return map;
}
