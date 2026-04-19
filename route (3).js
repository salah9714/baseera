export const dynamic = "force-dynamic";

export async function GET(request) {
  var url = new URL(request.url);
  var mode = url.searchParams.get("mode") || "sample";

  try {
    var res = await fetch("https://www.argaam.com/en/company/companies-prices/3", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(20000),
    });

    var html = await res.text();
    var info = {
      status: res.status,
      size: html.length,
      contains_2222: html.indexOf("2222") >= 0,
      contains_ARAMCO: html.indexOf("ARAMCO") >= 0 || html.indexOf("SAUDI ARAMCO") >= 0,
      contains_TASI: html.indexOf("TASI") >= 0,
      contains_table: html.indexOf("<table") >= 0,
      contains_tr: html.indexOf("<tr") >= 0,
      tr_count: (html.match(/<tr/gi) || []).length,
      table_count: (html.match(/<table/gi) || []).length,
    };

    if (mode === "info") {
      return Response.json(info);
    }

    if (mode === "around2222") {
      // Show 2000 chars before and after "2222" to see actual structure
      var idx = html.indexOf("2222");
      if (idx < 0) return Response.json({ error: "2222 not found", info: info });
      var snippet = html.substring(Math.max(0, idx - 500), Math.min(html.length, idx + 2000));
      return new Response(snippet, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }

    if (mode === "firstrow") {
      // Find first <tr> containing "2222"
      var rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
      var match;
      while ((match = rowRegex.exec(html)) !== null) {
        if (match[0].indexOf("2222") >= 0) {
          return new Response(match[0], { headers: { "Content-Type": "text/plain; charset=utf-8" } });
        }
      }
      return Response.json({ error: "No <tr> containing 2222 found", info: info });
    }

    if (mode === "full") {
      return new Response(html.substring(0, 200000), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }

    // Default: sample (first 5000 chars)
    return new Response(html.substring(0, 5000), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  } catch (e) {
    return Response.json({ error: e.message });
  }
}
