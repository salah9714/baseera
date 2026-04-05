"use client";
import { useState, useEffect, useCallback, useRef } from "react";

var gn="#10b981",rd="#ef4444",gd="#d4a84b",bl="#3b82f6",dm="#94a3b8",cd="#1e293b",bd="#334155",nv="#0f1729",bg="#0b1120",pu="#8b5cf6",or="#f59e0b";

// TradingView Chart - iframe embed (supports all TADAWUL stocks)
function TVChart(props) {
  var h = props.height || 420;
  var sym = "TADAWUL:" + props.symbol;
  var src = "https://s.tradingview.com/widgetembed/?symbol=" + encodeURIComponent(sym) + "&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=0f1729&studies=RSI%40tv-basicstudies%1FMACD%40tv-basicstudies%1FMASimple%40tv-basicstudies&theme=dark&style=1&timezone=Asia%2FRiyadh&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=ar_AE&utm_source=baseera&utm_medium=widget&utm_campaign=chart";
  return <iframe src={src} style={{ width: "100%", height: h, border: "none", borderRadius: 8 }} allowTransparency="true" allow="encrypted-media"></iframe>;
}

// TradingView Technical Analysis - iframe (supports TADAWUL)
function TVTechAnalysis(props) {
  var sym = "TADAWUL:" + props.symbol;
  var src = "https://s.tradingview.com/embed-widget/technical-analysis/?locale=ar_AE&colorTheme=dark&isTransparent=true&width=100%25&height=350&symbol=" + encodeURIComponent(sym) + "&interval=1D&showIntervalTabs=true&displayMode=single";
  return <iframe src={src} style={{ width: "100%", height: 350, border: "none" }} allowTransparency="true"></iframe>;
}

// TradingView Ticker Tape
function TVTicker() {
  var ref = useRef(null);
  useEffect(function() {
    if (!ref.current || ref.current.childNodes.length > 0) return;
    var container = document.createElement("div");
    var widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    container.appendChild(widget);
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
        { proName: "TADAWUL:2280", title: "المراعي" },
        { proName: "TADAWUL:4260", title: "بدجت" },
        { proName: "NYMEX:BZ1!", title: "برنت" },
      ],
      showSymbolLogo: false,
      isTransparent: true,
      displayMode: "adaptive",
      colorTheme: "dark",
      locale: "ar_AE",
    });
    container.appendChild(script);
    ref.current.appendChild(container);
  }, []);
  return <div ref={ref}></div>;
}

// TradingView Symbol Overview
function TVOverview(props) {
  var ref = useRef(null);
  useEffect(function() {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    var container = document.createElement("div");
    var widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    container.appendChild(widget);
    var script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [["TADAWUL:" + props.symbol + "|1D"]],
      chartOnly: false,
      width: "100%",
      height: 250,
      locale: "ar_AE",
      colorTheme: "dark",
      autosize: false,
      showVolume: true,
      showMA: true,
      hideDateRanges: false,
      hideMarketStatus: false,
      hideSymbolLogo: false,
      scalePosition: "right",
      scaleMode: "Normal",
      fontFamily: "Trebuchet MS, sans-serif",
      fontSize: "10",
      noTimeScale: false,
      valuesTracking: "1",
      changeMode: "price-and-percent",
      chartType: "area",
      maLineColor: "#d4a84b",
      maLineWidth: 1,
      maLength: 50,
      backgroundColor: "rgba(14, 17, 32, 1)",
      lineWidth: 2,
      lineType: 0,
      dateRanges: ["1d|1", "1m|30", "3m|60", "12m|1D", "60m|1W", "all|1M"],
    });
    container.appendChild(script);
    ref.current.appendChild(container);
  }, [props.symbol]);
  return <div ref={ref} style={{ borderRadius: 8, overflow: "hidden" }}></div>;
}

// Stock list
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
];

export default function App() {
  var _pg = useState("home"), pg = _pg[0], setPg = _pg[1];
  var _sel = useState("2222"), sel = _sel[0], setSel = _sel[1];
  var _stocks = useState({}), stocks = _stocks[0], setStocks = _stocks[1];
  var _market = useState(null), market = _market[0], setMarket = _market[1];
  var _detail = useState(null), detail = _detail[0], setDetail = _detail[1];
  var _loading = useState(true), loading = _loading[0], setLoading = _loading[1];
  var _detLoading = useState(false), detLoading = _detLoading[0], setDetLoading = _detLoading[1];
  var _lastUpd = useState(""), lastUpd = _lastUpd[0], setLastUpd = _lastUpd[1];

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
    setSel(code); setPg("stock"); setDetLoading(true);
    fetch("/api/stocks?code=" + code + "&type=full")
      .then(function(r) { return r.json(); })
      .then(function(d) { setDetail(d); setDetLoading(false); })
      .catch(function() { setDetLoading(false); });
  }, []);

  useEffect(function() { fetchAll(); }, [fetchAll]);
  useEffect(function() { var iv = setInterval(fetchAll, 120000); return function() { clearInterval(iv); }; }, [fetchAll]);

  var list = Object.values(stocks);
  var sorted = list.slice().sort(function(a, b) { return (b.changePct || 0) - (a.changePct || 0); });
  var adv = list.filter(function(s) { return (s.changePct || 0) > 0; }).length;
  var dec = list.filter(function(s) { return (s.changePct || 0) < 0; }).length;
  var regime = market && market.regime ? market.regime : null;
  var selName = STOCKS.find(function(s) { return s.c === sel; });

  return (
    <div dir="rtl" style={{ display: "flex", height: "100vh", background: bg, color: "#e2e8f0", fontFamily: "'Segoe UI',sans-serif", fontSize: 11, overflow: "hidden" }}>

      {/* Sidebar */}
      <div style={{ width: 155, background: nv, borderLeft: "1px solid " + bd, flexShrink: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 8, borderBottom: "1px solid " + bd }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: gd }}>تداول بصيرة</div>
          <div style={{ fontSize: 7, color: dm }}>TradingView + World Model</div>
        </div>
        <div style={{ padding: "4px 0" }}>
          {[{ id: "home", l: "🏠 القيادة" }, { id: "stock", l: "📊 تحليل السهم" }, { id: "tv", l: "📈 الشارت المتقدم" }, { id: "signals", l: "🎯 إشارات البيع/الشراء" }].map(function(n) {
            return <div key={n.id} onClick={function() { setPg(n.id); }} style={{ padding: "5px 8px", margin: "1px 3px", borderRadius: 4, cursor: "pointer", fontSize: 10, background: pg === n.id ? gd + "20" : "transparent", color: pg === n.id ? gd : dm, fontWeight: pg === n.id ? 600 : 400 }}>{n.l}</div>;
          })}
        </div>
        <div style={{ borderTop: "1px solid " + bd, padding: 4, flex: 1, overflowY: "auto" }}>
          <div style={{ fontSize: 8, color: dm, padding: "2px 4px" }}>الأسهم:</div>
          {STOCKS.map(function(s) {
            var data = stocks[s.c];
            return <div key={s.c} onClick={function() { fetchDetail(s.c); }} style={{ display: "flex", justifyContent: "space-between", padding: "3px 6px", cursor: "pointer", fontSize: 9, color: s.c === sel ? gd : dm, fontWeight: s.c === sel ? 600 : 400, borderBottom: "1px solid " + bd }}>
              <span>{s.n}</span>
              {data && <span style={{ color: data.changePct >= 0 ? gn : rd }}>{data.price}</span>}
            </div>;
          })}
        </div>
        <div style={{ padding: 4, borderTop: "1px solid " + bd, fontSize: 7, color: dm, textAlign: "center" }}>
          {lastUpd ? "تحديث: " + lastUpd : ""}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* TradingView Ticker Tape */}
        <div style={{ borderBottom: "1px solid " + bd, flexShrink: 0, height: 46, overflow: "hidden" }}>
          <TVTicker />
        </div>

        {/* Top bar */}
        <div style={{ background: nv, borderBottom: "1px solid " + bd, padding: "4px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {regime && <span style={{ color: regime.score > 70 ? gn : regime.score > 50 ? gd : rd, fontWeight: 600, fontSize: 11 }}>{regime.state}</span>}
            <span style={{ color: gn, fontSize: 9 }}>{adv}↑</span>
            <span style={{ color: rd, fontSize: 9 }}>{dec}↓</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={fetchAll} disabled={loading} style={{ background: "none", border: "none", color: gd, cursor: "pointer", fontSize: 10 }}>{loading ? "⏳" : "🔄"}</button>
            <span style={{ background: gn + "25", color: gn, padding: "1px 6px", borderRadius: 8, fontSize: 8, fontWeight: 600 }}>● LIVE</span>
          </div>
        </div>

        {/* Delay Banner */}
        <div style={{ background: "#1e293b", borderBottom: "1px solid " + bd, padding: "3px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 9, color: "#f59e0b" }}>⚠️ الأسعار من Yahoo Finance متأخرة ~15 دقيقة. ليست توصية استثمارية.</span>
          <span style={{ fontSize: 8, color: dm }}>{lastUpd ? "آخر تحديث: " + lastUpd : ""}</span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>

          {/* HOME */}
          {pg === "home" && <div>
            {regime && <div style={{ background: (regime.score > 70 ? gn : regime.score > 50 ? gd : rd) + "10", borderRadius: 8, border: "1px solid " + (regime.score > 70 ? gn : regime.score > 50 ? gd : rd) + "30", padding: 10, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
              <div><div style={{ fontSize: 8, color: dm }}>حالة السوق (World Model)</div><div style={{ fontSize: 16, fontWeight: 700, color: regime.score > 70 ? gn : regime.score > 50 ? gd : rd }}>{regime.state}</div><div style={{ fontSize: 9, color: dm }}>{regime.description}</div></div>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 22, fontWeight: 800, color: regime.score > 70 ? gn : regime.score > 50 ? gd : rd }}>{regime.score}</div><div style={{ fontSize: 8, color: dm }}>/100</div></div>
            </div>}

            {loading && list.length === 0 ? <div style={{ padding: 30, textAlign: "center", color: gd }}>⏳ جاري جلب البيانات الحية...</div> :
            <div style={{ background: cd, borderRadius: 6, border: "1px solid " + bd }}>
              <div style={{ padding: "6px 10px", borderBottom: "1px solid " + bd, fontSize: 10, fontWeight: 600, display: "flex", justifyContent: "space-between" }}>
                <span>أسعار حية + TradingView</span>
                <span style={{ color: gn, fontSize: 8 }}>🟢 Live</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                <thead><tr style={{ background: nv }}>
                  {["رمز", "اسم", "قطاع", "سعر", "تغير", "أعلى", "أدنى", "P/E"].map(function(h) {
                    return <th key={h} style={{ padding: 5, textAlign: "right", color: dm, fontSize: 8 }}>{h}</th>;
                  })}
                </tr></thead>
                <tbody>{sorted.map(function(s) {
                  return <tr key={s.code} onClick={function() { fetchDetail(s.code); }} style={{ cursor: "pointer", borderBottom: "1px solid " + bd }}>
                    <td style={{ padding: 5, fontWeight: 600 }}>{s.code}</td>
                    <td style={{ padding: 5 }}>{s.name}</td>
                    <td style={{ padding: 5, color: dm }}>{s.sector}</td>
                    <td style={{ padding: 5, fontWeight: 700 }}>{(s.price || 0).toFixed(2)}</td>
                    <td style={{ padding: 5, color: (s.changePct || 0) >= 0 ? gn : rd, fontWeight: 600 }}>{(s.changePct || 0) >= 0 ? "+" : ""}{(s.changePct || 0).toFixed(2)}%</td>
                    <td style={{ padding: 5 }}>{(s.high || 0).toFixed(2)}</td>
                    <td style={{ padding: 5 }}>{(s.low || 0).toFixed(2)}</td>
                    <td style={{ padding: 5 }}>{s.pe || "-"}</td>
                  </tr>;
                })}</tbody>
              </table>
            </div>}
          </div>}

          {/* STOCK DETAIL */}
          {pg === "stock" && <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{selName ? selName.n : sel} <span style={{ fontSize: 9, color: gd, background: gd + "20", padding: "1px 6px", borderRadius: 8 }}>{selName ? selName.s : ""}</span></h2>
                <div style={{ fontSize: 9, color: dm }}>TADAWUL:{sel} · بيانات حية</div>
              </div>
              {detail && detail.price && <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{detail.price.toFixed(2)}</div>
                <div style={{ color: detail.changePct >= 0 ? gn : rd, fontSize: 12 }}>{detail.changePct >= 0 ? "+" : ""}{detail.changePct.toFixed(2)}%</div>
              </div>}
            </div>

            {/* TradingView Symbol Overview */}
            <div style={{ marginBottom: 8, borderRadius: 8, overflow: "hidden", border: "1px solid " + bd }}>
              <TVOverview symbol={sel} />
            </div>

            {/* Data from our API */}
            {detail && detail.price && <div>
              <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
                {[
                  { l: "الافتتاح", v: (detail.open || 0).toFixed(2) },
                  { l: "الحجم", v: detail.volume ? (detail.volume / 1e6).toFixed(1) + "M" : "-" },
                  { l: "P/E", v: detail.pe || "-" },
                  { l: "P/B", v: detail.pb || "-" },
                  { l: "العائد", v: detail.divYield ? detail.divYield.toFixed(2) + "%" : "-" },
                  { l: "RSI", v: detail.rsi || "-" },
                  { l: "SMA50", v: detail.sma50 ? detail.sma50.toFixed(2) : "-" },
                  { l: "SMA200", v: detail.sma200 ? detail.sma200.toFixed(2) : "-" },
                  { l: "الدعم", v: detail.support || "-" },
                  { l: "المقاومة", v: detail.resistance || "-" },
                ].map(function(m, i) {
                  return <div key={i} style={{ background: cd, borderRadius: 5, border: "1px solid " + bd, padding: "5px 8px", minWidth: 60, flex: 1 }}>
                    <div style={{ color: dm, fontSize: 7 }}>{m.l}</div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{m.v}</div>
                  </div>;
                })}
              </div>
            </div>}

            {/* ═══ بطاقة القرار الذكية (Smart Decision Card) ═══ */}
            {detail && detail.price && (function() {
              var fs = 0;
              if (detail.pe > 0 && detail.pe < 15) fs += 20; else if (detail.pe > 0 && detail.pe < 20) fs += 12; else if (detail.pe > 0) fs += 5;
              if (detail.divYield > 5) fs += 18; else if (detail.divYield > 3) fs += 12; else if (detail.divYield > 1) fs += 5;
              if (detail.pb > 0 && detail.pb < 2) fs += 10; else if (detail.pb > 0 && detail.pb < 3) fs += 6;
              var ts = 50;
              if (detail.price > (detail.sma50 || 0) && detail.sma50 > 0) ts += 12;
              if (detail.price > (detail.sma200 || 0) && detail.sma200 > 0) ts += 12;
              if (detail.rsi && detail.rsi > 40 && detail.rsi < 65) ts += 8;
              if (detail.rsi && detail.rsi > 70) ts -= 10;
              if (detail.rsi && detail.rsi < 30) ts += 5;
              if (detail.changePct > 0) ts += 5;
              if (detail.volRatio && detail.volRatio > 1.2 && detail.changePct > 0) ts += 8;
              var mb = regime && regime.score > 65 ? 5 : regime && regime.score < 40 ? -5 : 0;
              var sc = Math.min(100, Math.max(0, Math.round(fs * 0.45 + ts * 0.45 + mb)));
              var rec, rc, re;
              if (sc >= 80) { rec = "فرصة قوية"; rc = gn; re = "⭐"; }
              else if (sc >= 65) { rec = "إيجابي"; rc = "#22c55e"; re = "📈"; }
              else if (sc >= 50) { rec = "محايد"; rc = gd; re = "👀"; }
              else if (sc >= 40) { rec = "حذر"; rc = or; re = "⚠️"; }
              else { rec = "سلبي"; rc = rd; re = "🔴"; }
              var conf = Math.min(92, Math.max(30, sc + Math.round(Math.abs(detail.changePct || 0) * 3)));
              var rsk = detail.rsi > 70 || sc < 35 ? "مرتفع 🔴" : detail.rsi > 60 || sc < 50 ? "متوسط 🟡" : "منخفض 🟢";
              var tim = sc >= 70 && (detail.rsi || 50) < 65 ? "شراء الآن 🟢" : sc >= 60 ? "شراء تدريجي 📈" : sc >= 50 ? "مراقبة 👀" : sc >= 40 ? "انتظار ⏳" : "تجنب حالياً 🔴";
              var reasons = [];
              if (detail.pe > 0 && detail.pe < 15) reasons.push("تقييم جذاب (P/E " + detail.pe + ")");
              if (detail.pe > 20) reasons.push("تقييم مرتفع (P/E " + detail.pe + ")");
              if (detail.divYield > 4) reasons.push("عائد توزيع ممتاز (" + detail.divYield.toFixed(1) + "%)");
              if (detail.price > (detail.sma200 || 0) && detail.sma200 > 0) reasons.push("فوق MA200 (اتجاه صاعد)");
              if (detail.price < (detail.sma200 || 0) && detail.sma200 > 0) reasons.push("تحت MA200 (اتجاه هابط)");
              if (detail.rsi && detail.rsi > 70) reasons.push("RSI " + detail.rsi + " - تشبع شراء");
              if (detail.rsi && detail.rsi < 30) reasons.push("RSI " + detail.rsi + " - فرصة محتملة");
              if (detail.changePct > 1.5) reasons.push("ارتفاع قوي +" + detail.changePct.toFixed(2) + "%");
              if (reasons.length === 0) reasons.push("أداء مستقر");
              var warns = [];
              if (detail.rsi && detail.rsi > 70) warns.push("تشبع شراء - جني أرباح محتمل");
              if (detail.pe > 25) warns.push("تقييم مبالغ فيه");
              if (detail.price < (detail.sma50 || 0) && detail.sma50 > 0) warns.push("تحت MA50 - ضعف فني");
              if (regime && regime.score < 40) warns.push("السوق في حالة ضعف");
              if (warns.length === 0) warns.push("لا تحذيرات رئيسية");
              return (
                <div style={{ background: rc + "12", borderRadius: 10, border: "2px solid " + rc + "40", padding: 14, marginTop: 8, marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 8, color: dm }}>🎯 بطاقة القرار الذكية</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: rc }}>{re} {rec}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 30, fontWeight: 800, color: rc }}>{sc}</div>
                      <div style={{ fontSize: 8, color: dm }}>/100</div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5, marginBottom: 10 }}>
                    <div style={{ background: nv, borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
                      <div style={{ fontSize: 7, color: dm }}>الثقة</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: conf > 70 ? gn : conf > 50 ? gd : rd }}>{conf}%</div>
                    </div>
                    <div style={{ background: nv, borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
                      <div style={{ fontSize: 7, color: dm }}>المخاطرة</div>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{rsk}</div>
                    </div>
                    <div style={{ background: nv, borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
                      <div style={{ fontSize: 7, color: dm }}>التوقيت</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: tim.includes("شراء") ? gn : tim.includes("مراقبة") ? gd : or }}>{tim}</div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: gn, marginBottom: 4 }}>💡 لماذا؟</div>
                      {reasons.map(function(r, i) { return <div key={i} style={{ fontSize: 9, color: dm, padding: "2px 0", borderBottom: "1px solid " + bd }}>✅ {r}</div>; })}
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: rd, marginBottom: 4 }}>⚠️ تحذيرات</div>
                      {warns.map(function(w, i) { return <div key={i} style={{ fontSize: 9, color: dm, padding: "2px 0", borderBottom: "1px solid " + bd }}>⚠️ {w}</div>; })}
                    </div>
                  </div>
                  <div style={{ marginTop: 8, padding: "4px 8px", background: nv, borderRadius: 4, fontSize: 8, color: dm, textAlign: "center" }}>هذا تحليل آلي وليس توصية استثمارية. استشر مستشارك المالي.</div>
                </div>
              );
            })()}

            <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
              <button onClick={function() { setPg("tv"); }} style={{ background: bl + "20", border: "1px solid " + bl, borderRadius: 6, padding: "6px 12px", color: bl, cursor: "pointer", fontSize: 10, fontWeight: 600 }}>📈 فتح الشارت المتقدم</button>
              <button onClick={function() { setPg("signals"); }} style={{ background: gd + "20", border: "1px solid " + gd, borderRadius: 6, padding: "6px 12px", color: gd, cursor: "pointer", fontSize: 10, fontWeight: 600 }}>🎯 إشارات TradingView</button>
            </div>
          </div>}

          {/* TRADINGVIEW ADVANCED CHART */}
          {pg === "tv" && <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: gd }}>📈 شارت TradingView المتقدم</h2>
                <div style={{ fontSize: 9, color: dm }}>TADAWUL:{sel} · {selName ? selName.n : ""} · تفاعلي بالكامل</div>
              </div>
              <select value={sel} onChange={function(e) { setSel(e.target.value); }} style={{ background: cd, color: "#e2e8f0", border: "1px solid " + bd, borderRadius: 5, padding: "4px 6px", fontSize: 10 }}>
                {STOCKS.map(function(s) { return <option key={s.c} value={s.c}>{s.n} ({s.c})</option>; })}
              </select>
            </div>
            <TVChart symbol={sel} height={500} />
            <div style={{ marginTop: 6, padding: 6, background: cd, borderRadius: 6, border: "1px solid " + bd, fontSize: 9, color: dm }}>
              الشارت تفاعلي بالكامل: يمكنك تغيير الفاصل الزمني، إضافة مؤشرات، رسم خطوط، وتكبير أي منطقة. المؤشرات المضافة: RSI + MACD + SMA50
            </div>
          </div>}

          {/* TRADINGVIEW TECHNICAL ANALYSIS */}
          {pg === "signals" && <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: gd }}>🎯 إشارات TradingView</h2>
                <div style={{ fontSize: 9, color: dm }}>تحليل فني تلقائي من TradingView - TADAWUL:{sel}</div>
              </div>
              <select value={sel} onChange={function(e) { setSel(e.target.value); }} style={{ background: cd, color: "#e2e8f0", border: "1px solid " + bd, borderRadius: 5, padding: "4px 6px", fontSize: 10 }}>
                {STOCKS.map(function(s) { return <option key={s.c} value={s.c}>{s.n} ({s.c})</option>; })}
              </select>
            </div>
            <div style={{ background: cd, borderRadius: 8, border: "1px solid " + bd, overflow: "hidden" }}>
              <TVTechAnalysis symbol={sel} />
            </div>
            <div style={{ marginTop: 6, padding: 6, background: cd, borderRadius: 6, border: "1px solid " + bd, fontSize: 9, color: dm }}>
              هذا التحليل من TradingView يجمع إشارات 26 مؤشر فني ويعطي توصية مجمّعة (شراء/بيع/محايد) على عدة فواصل زمنية. ننصح بدمجه مع تحليل World Model الخاص بنا.
            </div>
          </div>}

        </div>
      </div>
    </div>
  );
}
