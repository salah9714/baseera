"use client";
import { useState, useEffect, useCallback, useRef } from "react";

var gn="#10b981",rd="#ef4444",gd="#d4a84b",bl="#3b82f6",dm="#94a3b8",cd="#1e293b",bd="#334155",nv="#0f1729",bg="#0b1120",pu="#8b5cf6",or="#f59e0b";

function TVChart(props) {
  var sym = "TADAWUL:" + props.symbol;
  var src = "https://s.tradingview.com/widgetembed/?symbol=" + encodeURIComponent(sym) + "&interval=D&theme=dark&style=1&locale=ar_AE&studies=RSI%40tv-basicstudies%1FMACD%40tv-basicstudies%1FMASimple%40tv-basicstudies&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=0f1729&timezone=Asia%2FRiyadh";
  return <iframe src={src} style={{ width: "100%", height: props.height || 480, border: "none", borderRadius: 8 }}></iframe>;
}

function TVTechAnalysis(props) {
  var sym = "TADAWUL:" + props.symbol;
  var src = "https://s.tradingview.com/embed-widget/technical-analysis/?locale=ar_AE&colorTheme=dark&isTransparent=true&symbol=" + encodeURIComponent(sym) + "&interval=1D&showIntervalTabs=true&displayMode=single";
  return <iframe src={src} style={{ width: "100%", height: 380, border: "none" }}></iframe>;
}

function TVTicker() {
  var ref = useRef(null);
  useEffect(function() {
    if (!ref.current || ref.current.childNodes.length > 0) return;
    var script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: "TADAWUL:TASI", title: "تاسي" },
        { proName: "TADAWUL:2222", title: "أرامكو" },
        { proName: "TADAWUL:1120", title: "الراجحي" },
        { proName: "TADAWUL:1180", title: "الأهلي" },
        { proName: "TADAWUL:2010", title: "سابك" },
        { proName: "TADAWUL:7010", title: "STC" },
        { proName: "TADAWUL:4030", title: "البحري" },
        { proName: "TADAWUL:4190", title: "جرير" },
        { proName: "TADAWUL:1010", title: "الرياض" },
        { proName: "NYMEX:BZ1!", title: "برنت" },
      ],
      isTransparent: true, displayMode: "adaptive", colorTheme: "dark", locale: "ar_AE",
    });
    ref.current.appendChild(script);
  }, []);
  return <div ref={ref}></div>;
}

var STOCKS = [
  { c: "2222", n: "أرامكو", s: "الطاقة" },
  { c: "1120", n: "الراجحي", s: "البنوك" },
  { c: "1180", n: "الأهلي", s: "البنوك" },
  { c: "2010", n: "سابك", s: "المواد" },
  { c: "7010", n: "STC", s: "الاتصالات" },
  { c: "4030", n: "البحري", s: "النقل" },
  { c: "4190", n: "جرير", s: "التجزئة" },
  { c: "1010", n: "الرياض", s: "البنوك" },
  { c: "2350", n: "كيان", s: "المواد" },
  { c: "2280", n: "المراعي", s: "الأغذية" },
  { c: "4260", n: "بدجت", s: "النقل" },
  { c: "8010", n: "التعاونية", s: "التأمين" },
  { c: "4200", n: "الدريس", s: "الطاقة" },
  { c: "1150", n: "البنك الأول", s: "البنوك" },
  { c: "2150", n: "زين", s: "الاتصالات" },
  { c: "2050", n: "صافولا", s: "الأغذية" },
  { c: "2060", n: "التصنيع", s: "المواد" },
  { c: "2020", n: "سابك للمغذيات", s: "المواد" },
];

function calcDecision(detail, regime) {
  if (!detail || !detail.price) return null;
  var fs = 0;
  if (detail.pe > 0 && detail.pe < 15) fs += 22;
  else if (detail.pe > 0 && detail.pe < 20) fs += 14;
  else if (detail.pe > 0 && detail.pe < 25) fs += 7;
  if (detail.divYield > 5) fs += 18;
  else if (detail.divYield > 3) fs += 12;
  else if (detail.divYield > 1) fs += 6;
  if (detail.pb > 0 && detail.pb < 2) fs += 10;
  else if (detail.pb > 0 && detail.pb < 3) fs += 6;
  var ts = 50;
  if (detail.price > (detail.sma50 || 0) && detail.sma50 > 0) ts += 12;
  if (detail.price > (detail.sma200 || 0) && detail.sma200 > 0) ts += 12;
  if (detail.rsi && detail.rsi > 40 && detail.rsi < 65) ts += 8;
  if (detail.rsi && detail.rsi > 70) ts -= 12;
  if (detail.rsi && detail.rsi < 30) ts += 6;
  if (detail.changePct > 0) ts += 4;
  if (detail.volRatio && detail.volRatio > 1.2) ts += 6;
  var mb = regime && regime.score > 65 ? 5 : regime && regime.score < 40 ? -5 : 0;
  var sc = Math.min(100, Math.max(0, Math.round(fs * 0.45 + ts * 0.45 + mb)));
  var rec, rc, re;
  if (sc >= 78) { rec = "فرصة قوية"; rc = gn; re = "⭐"; }
  else if (sc >= 65) { rec = "إيجابي"; rc = "#22c55e"; re = "📈"; }
  else if (sc >= 50) { rec = "محايد"; rc = gd; re = "👀"; }
  else if (sc >= 40) { rec = "حذر"; rc = or; re = "⚠️"; }
  else { rec = "سلبي"; rc = rd; re = "🔴"; }
  var conf = Math.min(92, Math.max(35, sc));
  var rsk = (detail.rsi > 70 || sc < 40) ? "مرتفع" : (sc < 55) ? "متوسط" : "منخفض";
  var tim;
  if (sc >= 72 && (detail.rsi || 50) < 65) tim = "شراء الآن";
  else if (sc >= 60) tim = "شراء تدريجي";
  else if (sc >= 50) tim = "مراقبة";
  else if (sc >= 40) tim = "انتظار";
  else tim = "تجنب";
  var reasons = [];
  if (detail.pe > 0 && detail.pe < 15) reasons.push("تقييم جذاب (P/E " + detail.pe + ")");
  if (detail.pe > 22) reasons.push("تقييم مرتفع (P/E " + detail.pe + ")");
  if (detail.divYield > 4) reasons.push("عائد ممتاز (" + detail.divYield.toFixed(1) + "%)");
  if (detail.price > (detail.sma200 || 0) && detail.sma200 > 0) reasons.push("فوق MA200 (صاعد)");
  if (detail.price < (detail.sma200 || 0) && detail.sma200 > 0) reasons.push("تحت MA200 (هابط)");
  if (detail.rsi && detail.rsi > 70) reasons.push("RSI " + detail.rsi + " - تشبع شراء");
  if (detail.rsi && detail.rsi < 30) reasons.push("RSI " + detail.rsi + " - فرصة محتملة");
  if (detail.changePct > 2) reasons.push("ارتفاع قوي +" + detail.changePct.toFixed(2) + "%");
  if (reasons.length === 0) reasons.push("أداء مستقر");
  var warns = [];
  if (detail.rsi && detail.rsi > 70) warns.push("احتمال جني أرباح");
  if (detail.pe > 25) warns.push("تقييم مبالغ فيه");
  if (detail.price < (detail.sma50 || 0) && detail.sma50 > 0) warns.push("ضعف فني تحت MA50");
  if (regime && regime.score < 40) warns.push("السوق سلبي");
  if (warns.length === 0) warns.push("لا تحذيرات");
  return { score: sc, rec: rec, color: rc, emoji: re, conf: conf, risk: rsk, timing: tim, reasons: reasons, warns: warns };
}

export default function App() {
  var _pg = useState("home"), pg = _pg[0], setPg = _pg[1];
  var _sel = useState("2222"), sel = _sel[0], setSel = _sel[1];
  var _stocks = useState({}), stocks = _stocks[0], setStocks = _stocks[1];
  var _market = useState(null), market = _market[0], setMarket = _market[1];
  var _detail = useState(null), detail = _detail[0], setDetail = _detail[1];
  var _loading = useState(true), loading = _loading[0], setLoading = _loading[1];
  var _lastUpd = useState(""), lastUpd = _lastUpd[0], setLastUpd = _lastUpd[1];
  var _search = useState(""), search = _search[0], setSearch = _search[1];
  var _menuOpen = useState(false), menuOpen = _menuOpen[0], setMenuOpen = _menuOpen[1];
  var _isMobile = useState(false), isMobile = _isMobile[0], setIsMobile = _isMobile[1];

  useEffect(function() {
    var check = function() { setIsMobile(window.innerWidth < 768); };
    check();
    window.addEventListener("resize", check);
    return function() { window.removeEventListener("resize", check); };
  }, []);

  var fetchAll = useCallback(function() {
    setLoading(true);
    Promise.all([
      fetch("/api/stocks").then(function(r) { return r.json(); }),
      fetch("/api/market").then(function(r) { return r.json(); }),
    ]).then(function(res) {
      if (res[0].stocks) setStocks(res[0].stocks);
      setMarket(res[1]);
      setLastUpd(new Date().toLocaleTimeString("ar-SA"));
      setLoading(false);
    }).catch(function() { setLoading(false); });
  }, []);

  var fetchDetail = useCallback(function(code) {
    setSel(code); setPg("stock"); setMenuOpen(false);
    fetch("/api/stocks?code=" + code + "&type=full").then(function(r) { return r.json(); }).then(function(d) { setDetail(d); });
  }, []);

  useEffect(function() { fetchAll(); }, [fetchAll]);
  useEffect(function() { var iv = setInterval(fetchAll, 120000); return function() { clearInterval(iv); }; }, [fetchAll]);

  var list = Object.values(stocks);
  var filtered = search ? list.filter(function(s) { return s.name.indexOf(search) >= 0 || s.code.indexOf(search) >= 0; }) : list;
  var sorted = filtered.slice().sort(function(a, b) { return (b.changePct || 0) - (a.changePct || 0); });
  var adv = list.filter(function(s) { return (s.changePct || 0) > 0; }).length;
  var dec = list.filter(function(s) { return (s.changePct || 0) < 0; }).length;
  var regime = market && market.regime ? market.regime : null;
  var selName = STOCKS.find(function(s) { return s.c === sel; });
  var decision = detail && detail.price ? calcDecision(detail, regime) : null;
  var topGainers = list.slice().sort(function(a, b) { return (b.changePct || 0) - (a.changePct || 0); }).slice(0, 3);
  var topLosers = list.slice().sort(function(a, b) { return (a.changePct || 0) - (b.changePct || 0); }).slice(0, 3);

  // ── Sidebar (responsive: drawer on mobile, fixed on desktop) ──
  var sidebar = (
    <div style={{
      width: isMobile ? "75vw" : 200,
      maxWidth: 280,
      background: nv,
      borderLeft: "1px solid " + bd,
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
      position: isMobile ? "fixed" : "relative",
      top: 0,
      right: isMobile ? (menuOpen ? 0 : "-100%") : "auto",
      bottom: 0,
      zIndex: 100,
      transition: "right 0.3s ease",
      boxShadow: isMobile && menuOpen ? "-4px 0 20px rgba(0,0,0,0.5)" : "none",
    }}>
      <div style={{ padding: 12, borderBottom: "1px solid " + bd, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: gd }}>تداول بصيرة</div>
          <div style={{ fontSize: 9, color: dm }}>TradingView + World Model</div>
        </div>
        {isMobile && <button onClick={function() { setMenuOpen(false); }} style={{ background: "none", border: "none", color: dm, fontSize: 22, cursor: "pointer", padding: 0 }}>✕</button>}
      </div>
      <div style={{ padding: "6px 0" }}>
        {[
          { id: "home", l: "🏠 لوحة القيادة" },
          { id: "stock", l: "📊 تحليل السهم" },
          { id: "tv", l: "📈 شارت متقدم" },
          { id: "signals", l: "🎯 إشارات" },
        ].map(function(n) {
          return <div key={n.id} onClick={function() { setPg(n.id); setMenuOpen(false); }} style={{ padding: "10px 14px", margin: "2px 6px", borderRadius: 6, cursor: "pointer", fontSize: 13, background: pg === n.id ? gd + "20" : "transparent", color: pg === n.id ? gd : dm, fontWeight: pg === n.id ? 600 : 400 }}>{n.l}</div>;
        })}
      </div>
      <div style={{ padding: "6px 12px", fontSize: 10, color: dm, borderTop: "1px solid " + bd, marginTop: 6 }}>الأسهم:</div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 6px 6px" }}>
        {STOCKS.map(function(s) {
          var st = stocks[s.c];
          return <div key={s.c} onClick={function() { fetchDetail(s.c); }} style={{ padding: "8px 8px", cursor: "pointer", fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: 4, background: s.c === sel ? gd + "15" : "transparent", color: s.c === sel ? gd : "#cbd5e1" }}>
            <span style={{ fontWeight: s.c === sel ? 600 : 400 }}>{s.n}</span>
            {st && <span style={{ fontSize: 11, color: (st.changePct || 0) >= 0 ? gn : rd, fontWeight: 600 }}>{(st.changePct || 0) >= 0 ? "+" : ""}{(st.changePct || 0).toFixed(1)}%</span>}
          </div>;
        })}
      </div>
    </div>
  );

  return (
    <div dir="rtl" style={{ display: "flex", height: "100vh", background: bg, color: "#e2e8f0", fontFamily: "'Segoe UI',Tahoma,sans-serif", fontSize: 13, overflow: "hidden", position: "relative" }}>

      {/* Mobile overlay */}
      {isMobile && menuOpen && <div onClick={function() { setMenuOpen(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 99 }}></div>}

      {sidebar}

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Mobile Header */}
        {isMobile && <div style={{ background: nv, borderBottom: "1px solid " + bd, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <button onClick={function() { setMenuOpen(true); }} style={{ background: gd + "20", border: "1px solid " + gd, borderRadius: 6, padding: "6px 12px", color: gd, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>☰ القائمة</button>
          <div style={{ fontSize: 14, fontWeight: 800, color: gd }}>تداول بصيرة</div>
          <button onClick={fetchAll} disabled={loading} style={{ background: "none", border: "none", color: gd, cursor: "pointer", fontSize: 18 }}>{loading ? "⏳" : "🔄"}</button>
        </div>}

        {/* Ticker Tape */}
        <div style={{ borderBottom: "1px solid " + bd, height: isMobile ? 42 : 48, flexShrink: 0, overflow: "hidden" }}>
          <TVTicker />
        </div>

        {/* Top Bar (Desktop) */}
        {!isMobile && <div style={{ background: nv, borderBottom: "1px solid " + bd, padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {regime && <span style={{ fontSize: 14, fontWeight: 700, color: regime.score > 65 ? gn : regime.score > 50 ? gd : rd }}>{regime.state}</span>}
            {market && market.tasi && <span style={{ fontSize: 12 }}>تاسي: <strong style={{ color: (market.tasi.change || 0) >= 0 ? gn : rd }}>{(market.tasi.value || 0).toFixed(0)}</strong></span>}
            {market && market.oil && <span style={{ fontSize: 12, color: dm }}>برنت: ${(market.oil.price || 0).toFixed(2)}</span>}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12 }}>
            <span style={{ color: gn, fontWeight: 600 }}>{adv}↑</span>
            <span style={{ color: rd, fontWeight: 600 }}>{dec}↓</span>
            <span style={{ color: dm, fontSize: 10 }}>{lastUpd}</span>
            <button onClick={fetchAll} disabled={loading} style={{ background: gd + "20", border: "1px solid " + gd, borderRadius: 6, padding: "4px 10px", color: gd, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>{loading ? "⏳" : "🔄 تحديث"}</button>
          </div>
        </div>}

        {/* Mobile mini status bar */}
        {isMobile && regime && <div style={{ background: nv, borderBottom: "1px solid " + bd, padding: "6px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, fontSize: 11 }}>
          <span style={{ color: regime.score > 65 ? gn : regime.score > 50 ? gd : rd, fontWeight: 700 }}>{regime.state} ({regime.score})</span>
          <div>
            <span style={{ color: gn }}>{adv}↑</span> <span style={{ color: rd }}>{dec}↓</span>
          </div>
        </div>}

        {/* Disclaimer */}
        <div style={{ background: or + "10", borderBottom: "1px solid " + or + "30", padding: "5px 12px", fontSize: isMobile ? 9 : 11, color: or, textAlign: "center" }}>
          ⚠️ بيانات متأخرة ~15 د. تحليل آلي وليس توصية استثمارية
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? 10 : 14 }}>

          {/* ═══ HOME ═══ */}
          {pg === "home" && <div>
            {regime && <div style={{ background: (regime.score > 65 ? gn : regime.score > 50 ? gd : rd) + "10", borderRadius: 10, border: "1px solid " + (regime.score > 65 ? gn : regime.score > 50 ? gd : rd) + "30", padding: isMobile ? 12 : 16, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: dm }}>🧠 World Model</div>
                <div style={{ fontSize: isMobile ? 18 : 24, fontWeight: 800, color: regime.score > 65 ? gn : regime.score > 50 ? gd : rd, margin: "4px 0" }}>{regime.state}</div>
                <div style={{ fontSize: isMobile ? 10 : 12, color: dm }}>{regime.description}</div>
              </div>
              <div style={{ textAlign: "center", paddingLeft: 12 }}>
                <div style={{ fontSize: isMobile ? 28 : 38, fontWeight: 800, color: regime.score > 65 ? gn : regime.score > 50 ? gd : rd, lineHeight: 1 }}>{regime.score}</div>
                <div style={{ fontSize: 9, color: dm }}>/100</div>
              </div>
            </div>}

            {/* Stats - 2 cols on mobile, 4 on desktop */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 8, marginBottom: 10 }}>
              {[
                { l: "إجمالي", v: list.length, c: bl },
                { l: "مرتفعة", v: adv, c: gn },
                { l: "منخفضة", v: dec, c: rd },
                { l: "تاسي", v: market && market.tasi ? Math.round(market.tasi.value || 0) : "-", c: gd },
              ].map(function(m, i) {
                return <div key={i} style={{ background: cd, borderRadius: 8, border: "1px solid " + bd, padding: isMobile ? "8px 10px" : "10px 14px" }}>
                  <div style={{ color: dm, fontSize: 10 }}>{m.l}</div>
                  <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: m.c, marginTop: 2 }}>{m.v}</div>
                </div>;
              })}
            </div>

            {/* Top Movers */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8, marginBottom: 10 }}>
              <div style={{ background: cd, borderRadius: 8, border: "1px solid " + bd, padding: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: gn, marginBottom: 6 }}>📈 الأكثر ارتفاعاً</div>
                {topGainers.map(function(s) {
                  return <div key={s.code} onClick={function() { fetchDetail(s.code); }} style={{ padding: "5px 0", borderBottom: "1px solid " + bd, cursor: "pointer", display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span><strong>{s.name}</strong> <span style={{ color: dm, fontSize: 10 }}>({s.code})</span></span>
                    <span style={{ color: gn, fontWeight: 700 }}>+{(s.changePct || 0).toFixed(2)}%</span>
                  </div>;
                })}
              </div>
              <div style={{ background: cd, borderRadius: 8, border: "1px solid " + bd, padding: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: rd, marginBottom: 6 }}>📉 الأكثر انخفاضاً</div>
                {topLosers.map(function(s) {
                  return <div key={s.code} onClick={function() { fetchDetail(s.code); }} style={{ padding: "5px 0", borderBottom: "1px solid " + bd, cursor: "pointer", display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span><strong>{s.name}</strong> <span style={{ color: dm, fontSize: 10 }}>({s.code})</span></span>
                    <span style={{ color: rd, fontWeight: 700 }}>{(s.changePct || 0).toFixed(2)}%</span>
                  </div>;
                })}
              </div>
            </div>

            {/* Search */}
            <div style={{ marginBottom: 8 }}>
              <input type="text" placeholder="🔍 ابحث عن سهم..." value={search} onChange={function(e) { setSearch(e.target.value); }} style={{ width: "100%", background: cd, border: "1px solid " + bd, borderRadius: 8, padding: "10px 14px", color: "#e2e8f0", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>

            {/* MOBILE: Card list / DESKTOP: Table */}
            {list.length > 0 && (isMobile ? (
              <div>
                {sorted.map(function(s) {
                  return <div key={s.code} onClick={function() { fetchDetail(s.code); }} style={{ background: cd, borderRadius: 8, border: "1px solid " + bd, borderRight: "3px solid " + ((s.changePct || 0) >= 0 ? gn : rd), padding: 12, marginBottom: 6, cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{s.name}</div>
                        <div style={{ fontSize: 10, color: dm }}>{s.code} · {s.sector}</div>
                      </div>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: 16, fontWeight: 800 }}>{(s.price || 0).toFixed(2)}</div>
                        <div style={{ fontSize: 12, color: (s.changePct || 0) >= 0 ? gn : rd, fontWeight: 700 }}>{(s.changePct || 0) >= 0 ? "+" : ""}{(s.changePct || 0).toFixed(2)}%</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, fontSize: 10, color: dm }}>
                      <span>أعلى: <strong style={{ color: "#cbd5e1" }}>{(s.high || 0).toFixed(2)}</strong></span>
                      <span>أدنى: <strong style={{ color: "#cbd5e1" }}>{(s.low || 0).toFixed(2)}</strong></span>
                      {s.pe ? <span>P/E: <strong style={{ color: "#cbd5e1" }}>{s.pe}</strong></span> : null}
                      {s.divYield ? <span>عائد: <strong style={{ color: gn }}>{s.divYield.toFixed(1)}%</strong></span> : null}
                    </div>
                  </div>;
                })}
              </div>
            ) : (
              <div style={{ background: cd, borderRadius: 8, border: "1px solid " + bd }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr style={{ background: nv }}>
                    {["#", "الرمز", "الاسم", "القطاع", "السعر", "التغير %", "الأعلى", "الأدنى", "P/E", "العائد"].map(function(h) {
                      return <th key={h} style={{ padding: "8px 6px", textAlign: "right", color: dm, fontSize: 11, fontWeight: 600 }}>{h}</th>;
                    })}
                  </tr></thead>
                  <tbody>{sorted.map(function(s, i) {
                    return <tr key={s.code} onClick={function() { fetchDetail(s.code); }} style={{ cursor: "pointer", borderBottom: "1px solid " + bd }}>
                      <td style={{ padding: "8px 6px", color: dm, fontSize: 11 }}>{i + 1}</td>
                      <td style={{ padding: "8px 6px", fontWeight: 600 }}>{s.code}</td>
                      <td style={{ padding: "8px 6px", fontWeight: 500 }}>{s.name}</td>
                      <td style={{ padding: "8px 6px", color: dm, fontSize: 11 }}>{s.sector}</td>
                      <td style={{ padding: "8px 6px", fontWeight: 700 }}>{(s.price || 0).toFixed(2)}</td>
                      <td style={{ padding: "8px 6px", color: (s.changePct || 0) >= 0 ? gn : rd, fontWeight: 700 }}>{(s.changePct || 0) >= 0 ? "+" : ""}{(s.changePct || 0).toFixed(2)}%</td>
                      <td style={{ padding: "8px 6px" }}>{(s.high || 0).toFixed(2)}</td>
                      <td style={{ padding: "8px 6px" }}>{(s.low || 0).toFixed(2)}</td>
                      <td style={{ padding: "8px 6px", color: s.pe ? "#e2e8f0" : dm }}>{s.pe ? s.pe : "-"}</td>
                      <td style={{ padding: "8px 6px", color: s.divYield ? gn : dm }}>{s.divYield ? s.divYield.toFixed(2) + "%" : "-"}</td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>
            ))}
          </div>}

          {/* ═══ STOCK DETAIL ═══ */}
          {pg === "stock" && <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
              <div>
                <h2 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, margin: 0 }}>{selName ? selName.n : sel} <span style={{ fontSize: 10, color: gd, background: gd + "20", padding: "3px 8px", borderRadius: 8, marginRight: 6 }}>{selName ? selName.s : ""}</span></h2>
                <div style={{ fontSize: 10, color: dm }}>TADAWUL:{sel} · حية</div>
              </div>
              {detail && detail.price && <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800 }}>{detail.price.toFixed(2)} <span style={{ fontSize: 11, color: dm }}>ر.س</span></div>
                <div style={{ color: detail.changePct >= 0 ? gn : rd, fontSize: 14, fontWeight: 600 }}>{detail.changePct >= 0 ? "+" : ""}{detail.changePct.toFixed(2)}%</div>
              </div>}
            </div>

            {detail && detail.price && <div>
              {decision && <div style={{ background: decision.color + "12", borderRadius: 12, border: "2px solid " + decision.color + "40", padding: isMobile ? 12 : 16, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, color: dm }}>🎯 بطاقة القرار الذكية</div>
                    <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: decision.color }}>{decision.emoji} {decision.rec}</div>
                  </div>
                  <div style={{ textAlign: "center", paddingLeft: 12 }}>
                    <div style={{ fontSize: isMobile ? 32 : 42, fontWeight: 800, color: decision.color, lineHeight: 1 }}>{decision.score}</div>
                    <div style={{ fontSize: 9, color: dm }}>/100</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 10 }}>
                  <div style={{ background: nv, borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: dm }}>الثقة</div>
                    <div style={{ fontSize: isMobile ? 14 : 18, fontWeight: 700, color: decision.conf > 70 ? gn : decision.conf > 50 ? gd : rd }}>{decision.conf}%</div>
                  </div>
                  <div style={{ background: nv, borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: dm }}>المخاطرة</div>
                    <div style={{ fontSize: isMobile ? 12 : 16, fontWeight: 700, color: decision.risk === "منخفض" ? gn : decision.risk === "متوسط" ? gd : rd }}>{decision.risk}</div>
                  </div>
                  <div style={{ background: nv, borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: dm }}>التوقيت</div>
                    <div style={{ fontSize: isMobile ? 11 : 14, fontWeight: 700, color: decision.timing.indexOf("شراء") >= 0 ? gn : decision.timing === "تجنب" ? rd : gd }}>{decision.timing}</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: gn, marginBottom: 4 }}>💡 لماذا؟</div>
                    {decision.reasons.map(function(r, i) { return <div key={i} style={{ fontSize: 11, color: "#cbd5e1", padding: "3px 0", borderBottom: "1px solid " + bd }}>✅ {r}</div>; })}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: rd, marginBottom: 4 }}>⚠️ تحذيرات</div>
                    {decision.warns.map(function(w, i) { return <div key={i} style={{ fontSize: 11, color: "#cbd5e1", padding: "3px 0", borderBottom: "1px solid " + bd }}>⚠️ {w}</div>; })}
                  </div>
                </div>
              </div>}

              {/* Metrics - 2 cols mobile, 6 desktop */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(6, 1fr)", gap: 6, marginBottom: 10 }}>
                {[
                  { l: "الافتتاح", v: (detail.open || 0).toFixed(2) },
                  { l: "الأعلى", v: (detail.high || 0).toFixed(2), c: gn },
                  { l: "الأدنى", v: (detail.low || 0).toFixed(2), c: rd },
                  { l: "إغلاق سابق", v: (detail.prevClose || 0).toFixed(2) },
                  { l: "الحجم", v: detail.volume ? (detail.volume / 1e6).toFixed(2) + "M" : "-" },
                  { l: "P/E", v: detail.pe || "-" },
                  { l: "P/B", v: detail.pb || "-" },
                  { l: "العائد", v: detail.divYield ? detail.divYield.toFixed(2) + "%" : "-", c: gn },
                  { l: "RSI", v: detail.rsi || "-", c: detail.rsi > 70 ? rd : detail.rsi < 30 ? gn : gd },
                  { l: "MA50", v: detail.sma50 ? detail.sma50.toFixed(2) : "-", c: detail.price > detail.sma50 ? gn : rd },
                  { l: "الدعم", v: detail.support || "-", c: gn },
                  { l: "المقاومة", v: detail.resistance || "-", c: rd },
                ].map(function(m, i) {
                  return <div key={i} style={{ background: cd, borderRadius: 6, border: "1px solid " + bd, padding: "8px 10px" }}>
                    <div style={{ color: dm, fontSize: 10 }}>{m.l}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: m.c || "#e2e8f0" }}>{m.v}</div>
                  </div>;
                })}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={function() { setPg("tv"); }} style={{ background: bl + "20", border: "1px solid " + bl, borderRadius: 8, padding: "10px 16px", color: bl, cursor: "pointer", fontSize: 12, fontWeight: 600, flex: isMobile ? 1 : "none" }}>📈 شارت متقدم</button>
                <button onClick={function() { setPg("signals"); }} style={{ background: gd + "20", border: "1px solid " + gd, borderRadius: 8, padding: "10px 16px", color: gd, cursor: "pointer", fontSize: 12, fontWeight: 600, flex: isMobile ? 1 : "none" }}>🎯 إشارات</button>
              </div>
            </div>}

            {!detail && <div style={{ padding: 40, textAlign: "center", color: dm }}>⏳ جاري جلب البيانات...</div>}
          </div>}

          {/* ═══ TV CHART ═══ */}
          {pg === "tv" && <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
              <div>
                <h2 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, margin: 0, color: gd }}>📈 الشارت المتقدم</h2>
                <div style={{ fontSize: 10, color: dm }}>TADAWUL:{sel}</div>
              </div>
              <select value={sel} onChange={function(e) { setSel(e.target.value); }} style={{ background: cd, color: "#e2e8f0", border: "1px solid " + bd, borderRadius: 6, padding: "6px 10px", fontSize: 12 }}>
                {STOCKS.map(function(s) { return <option key={s.c} value={s.c}>{s.n} ({s.c})</option>; })}
              </select>
            </div>
            <TVChart symbol={sel} height={isMobile ? 400 : 550} />
          </div>}

          {/* ═══ SIGNALS ═══ */}
          {pg === "signals" && <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
              <div>
                <h2 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, margin: 0, color: gd }}>🎯 إشارات TradingView</h2>
                <div style={{ fontSize: 10, color: dm }}>TADAWUL:{sel}</div>
              </div>
              <select value={sel} onChange={function(e) { setSel(e.target.value); }} style={{ background: cd, color: "#e2e8f0", border: "1px solid " + bd, borderRadius: 6, padding: "6px 10px", fontSize: 12 }}>
                {STOCKS.map(function(s) { return <option key={s.c} value={s.c}>{s.n} ({s.c})</option>; })}
              </select>
            </div>
            <div style={{ background: cd, borderRadius: 8, border: "1px solid " + bd, overflow: "hidden" }}>
              <TVTechAnalysis symbol={sel} />
            </div>
          </div>}

        </div>
      </div>
    </div>
  );
}
