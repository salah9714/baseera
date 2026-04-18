// ══════════════════════════════════════════════════════════════
// Fundamental Analysis Engine v1.0
// محرك التحليل الأساسي - قواعد حتمية بدون LLM
// ══════════════════════════════════════════════════════════════

var SECTOR_BENCHMARKS = {
  "البنوك":       { avgPE: 12, avgPB: 1.8, avgDivYield: 4.0, avgROE: 14 },
  "الطاقة":       { avgPE: 15, avgPB: 2.0, avgDivYield: 5.5, avgROE: 16 },
  "المواد":       { avgPE: 18, avgPB: 2.2, avgDivYield: 3.5, avgROE: 12 },
  "الاتصالات":    { avgPE: 14, avgPB: 3.0, avgDivYield: 5.0, avgROE: 20 },
  "النقل":        { avgPE: 20, avgPB: 2.5, avgDivYield: 2.5, avgROE: 10 },
  "التجزئة":      { avgPE: 22, avgPB: 4.0, avgDivYield: 3.0, avgROE: 18 },
  "الأغذية":      { avgPE: 20, avgPB: 3.0, avgDivYield: 3.5, avgROE: 15 },
  "التأمين":      { avgPE: 12, avgPB: 1.5, avgDivYield: 3.0, avgROE: 12 },
  "العقار":       { avgPE: 16, avgPB: 1.2, avgDivYield: 4.5, avgROE: 8 },
};

function getBenchmark(sector) {
  return SECTOR_BENCHMARKS[sector] || { avgPE: 18, avgPB: 2.5, avgDivYield: 3.5, avgROE: 14 };
}

function analyzeBusinessModel(sector, name) {
  var models = {
    "البنوك":    { model: "مؤسسة مالية تحقق الإيرادات من فوائد القروض ورسوم الخدمات المصرفية", moat: "قوي - حواجز تنظيمية عالية والعلامة التجارية المصرفية", stability: "مرتفعة" },
    "الطاقة":    { model: "استخراج وتكرير وتوزيع منتجات نفطية وغازية", moat: "قوي جداً - احتياطيات ضخمة وبنية تحتية مكلفة", stability: "مرتفعة مع تأثر بأسعار النفط" },
    "الاتصالات":  { model: "خدمات الاتصالات والإنترنت والتقنية", moat: "قوي - البنية التحتية والترددات محدودة", stability: "مرتفعة جداً" },
    "المواد":    { model: "إنتاج مواد صناعية وكيماوية ومعادن", moat: "متوسط - يعتمد على الكلفة والسعة الإنتاجية", stability: "متقلبة" },
    "التجزئة":   { model: "بيع السلع والخدمات للمستهلك النهائي", moat: "متوسط - العلامة التجارية والموقع", stability: "متوسطة" },
    "الأغذية":   { model: "إنتاج وتوزيع منتجات غذائية أساسية", moat: "قوي - علامات تجارية مستهلكة يومياً", stability: "مرتفعة" },
    "النقل":     { model: "خدمات الشحن البحري والبري والجوي", moat: "متوسط - الأصول الرأسمالية وشبكة العمليات", stability: "متقلبة" },
    "التأمين":   { model: "أقساط التأمين واستثمار الاحتياطيات", moat: "متوسط - البيانات والخبرة الاكتوارية", stability: "مرتفعة" },
  };
  return models[sector] || { model: name + " تعمل في قطاع " + sector, moat: "يحتاج تقييم فردي", stability: "غير محدد" };
}

function analyzeValuation(pe, pb, divYield, sector) {
  var bench = getBenchmark(sector);
  var score = 50;
  var verdicts = [];
  var details = {};

  if (pe > 0 && pe < 50) {
    var peRatio = pe / bench.avgPE;
    if (peRatio < 0.7) { score += 20; verdicts.push("P/E أقل من متوسط القطاع بـ " + Math.round((1-peRatio)*100) + "% — تقييم جذاب"); details.peVerdict = "رخيص"; }
    else if (peRatio < 0.9) { score += 10; verdicts.push("P/E أقل قليلاً من المتوسط — تقييم معقول"); details.peVerdict = "معقول"; }
    else if (peRatio < 1.15) { verdicts.push("P/E قريب من متوسط القطاع — تقييم عادل"); details.peVerdict = "عادل"; }
    else if (peRatio < 1.5) { score -= 10; verdicts.push("P/E أعلى من المتوسط بـ " + Math.round((peRatio-1)*100) + "% — تقييم مرتفع"); details.peVerdict = "مرتفع"; }
    else { score -= 20; verdicts.push("P/E مرتفع جداً — مخاطر تقييم"); details.peVerdict = "مبالغ فيه"; }
    details.peValue = pe;
    details.peBenchmark = bench.avgPE;
  } else {
    verdicts.push("P/E غير متاح في البيانات");
    details.peVerdict = "غير متاح";
  }

  if (divYield > 0) {
    var yieldRatio = divYield / bench.avgDivYield;
    if (yieldRatio > 1.5) { score += 15; verdicts.push("عائد توزيعات ممتاز (" + divYield.toFixed(1) + "%)"); details.yieldVerdict = "ممتاز"; }
    else if (yieldRatio > 1.0) { score += 8; verdicts.push("عائد توزيعات جيد (" + divYield.toFixed(1) + "%)"); details.yieldVerdict = "جيد"; }
    else if (yieldRatio > 0.6) { score += 3; details.yieldVerdict = "مقبول"; }
    else { details.yieldVerdict = "منخفض"; }
    details.yieldValue = divYield;
    details.yieldBenchmark = bench.avgDivYield;
  }

  if (pb > 0) {
    if (pb < bench.avgPB * 0.8) { score += 10; verdicts.push("P/B منخفض — تداول بخصم على القيمة الدفترية"); }
    else if (pb > bench.avgPB * 1.5) { score -= 8; verdicts.push("P/B مرتفع — تداول بعلاوة كبيرة"); }
    details.pbValue = pb;
  }

  score = Math.max(0, Math.min(100, score));

  var label;
  if (score >= 75) label = "تقييم جذاب";
  else if (score >= 60) label = "تقييم معقول";
  else if (score >= 45) label = "تقييم عادل";
  else if (score >= 30) label = "تقييم مرتفع";
  else label = "تقييم مبالغ فيه";

  return { score: score, label: label, verdicts: verdicts, details: details };
}

function analyzeBalanceSheet(debt, cash, revenue, sector) {
  var score = 60;
  var notes = [];

  if (debt !== undefined && cash !== undefined && debt !== null) {
    var netDebt = debt - cash;
    if (netDebt <= 0) {
      score = 90;
      notes.push("الشركة خالية من الدين الصافي — وضع مالي قوي جداً");
    } else if (revenue > 0) {
      var debtToRev = netDebt / revenue;
      if (debtToRev < 0.5) { score = 80; notes.push("الدين منخفض نسبة للإيرادات — ميزانية قوية"); }
      else if (debtToRev < 1.0) { score = 65; notes.push("الدين معتدل"); }
      else if (debtToRev < 2.0) { score = 45; notes.push("الدين مرتفع — يحتاج مراقبة"); }
      else { score = 25; notes.push("الدين مرتفع جداً — مخاطر مالية"); }
    }
  } else {
    if (sector === "البنوك" || sector === "التأمين") { notes.push("القطاع المالي يعتمد على الرافعة المالية بطبيعته"); score = 60; }
    else if (sector === "الطاقة" || sector === "الاتصالات") { notes.push("الشركات الكبرى في هذا القطاع عادة بميزانيات قوية"); score = 70; }
    else { notes.push("بيانات الميزانية التفصيلية غير متاحة — تقييم مبدئي بناء على القطاع"); score = 55; }
  }

  var label;
  if (score >= 80) label = "ميزانية قوية";
  else if (score >= 60) label = "ميزانية سليمة";
  else if (score >= 40) label = "ميزانية متوسطة";
  else label = "ميزانية ضعيفة";

  return { score: score, label: label, notes: notes };
}

function buildScenarios(stockData, valuation, balanceSheet, businessModel) {
  var bull = [], bear = [];

  if (valuation.score >= 70) bull.push("تقييم جذاب نسبة للقطاع يوفر هامش أمان");
  if (valuation.details.yieldVerdict === "ممتاز" || valuation.details.yieldVerdict === "جيد") bull.push("عائد توزيعات جذاب يدعم العائد الكلي");
  if (balanceSheet.score >= 70) bull.push("ميزانية قوية تحمي من الصدمات");
  if (businessModel.moat.indexOf("قوي") === 0) bull.push("ميزة تنافسية قوية تحمي الأرباح طويلة الأمد");
  if (businessModel.stability === "مرتفعة" || businessModel.stability === "مرتفعة جداً") bull.push("استقرار الأعمال يقلل مخاطر التدفق النقدي");
  if (stockData.sector === "الطاقة") bull.push("الطاقة السعودية تستفيد من الطلب العالمي المستدام");
  if (stockData.sector === "البنوك") bull.push("البنوك السعودية استفادت تاريخياً من ارتفاع الفائدة");

  if (valuation.score < 40) bear.push("التقييم المرتفع يحد من الصعود المحتمل ويزيد مخاطر التراجع");
  if (valuation.details.peVerdict === "مبالغ فيه") bear.push("P/E مرتفع — حساسية عالية لأي تباطؤ في النمو");
  if (balanceSheet.score < 50) bear.push("مستوى الدين يستدعي الحذر في بيئة فائدة مرتفعة");
  if (businessModel.stability === "متقلبة") bear.push("تقلب الأعمال يزيد عدم اليقين في التدفقات");
  if (stockData.sector === "النقل") bear.push("حساسية لأسعار الوقود وظروف التجارة العالمية");
  if (stockData.sector === "المواد") bear.push("دورية قوية — الأرباح تتأثر بأسعار السلع");

  if (bull.length === 0) bull.push("الأسهم في السوق السعودي تستفيد من رؤية 2030 والنمو الاقتصادي");
  if (bear.length === 0) bear.push("السوق بطبيعته متقلب — أي سهم معرّض لتصحيحات");

  return {
    bull: { summary: "السيناريو الإيجابي", factors: bull },
    bear: { summary: "السيناريو السلبي", factors: bear },
  };
}

function computeOverallStrength(valuation, balanceSheet, businessModel) {
  var moatScore = 50;
  if (businessModel.moat.indexOf("قوي جداً") >= 0) moatScore = 90;
  else if (businessModel.moat.indexOf("قوي") >= 0) moatScore = 75;
  else if (businessModel.moat.indexOf("متوسط") >= 0) moatScore = 55;

  var stabilityScore = 50;
  if (businessModel.stability.indexOf("جداً") >= 0) stabilityScore = 85;
  else if (businessModel.stability === "مرتفعة") stabilityScore = 70;
  else if (businessModel.stability === "متوسطة") stabilityScore = 50;
  else stabilityScore = 35;

  var s = Math.round(valuation.score*0.30 + balanceSheet.score*0.25 + moatScore*0.25 + stabilityScore*0.20);
  return Math.max(0, Math.min(100, s));
}

function buildSummary(stockData, valuation, balanceSheet, businessModel, strength) {
  var parts = [];
  parts.push(stockData.name + " (" + stockData.code + ") من قطاع " + stockData.sector + ".");
  parts.push(businessModel.model + ".");
  if (strength >= 75) parts.push("التقييم الإجمالي: قوي — شركة بأساسيات جذابة.");
  else if (strength >= 60) parts.push("التقييم الإجمالي: إيجابي — أساسيات صحية.");
  else if (strength >= 45) parts.push("التقييم الإجمالي: محايد — أساسيات متوسطة.");
  else if (strength >= 30) parts.push("التقييم الإجمالي: حذر — نقاط ضعف أساسية.");
  else parts.push("التقييم الإجمالي: سلبي — مخاطر أساسية مرتفعة.");
  parts.push(valuation.label + ". " + balanceSheet.label + ".");
  return parts.join(" ");
}

// ══════════════════════════════════════════════════════════════
// MAIN EXPORTED FUNCTION
// ══════════════════════════════════════════════════════════════
export function analyzeFundamental(stockData) {
  if (!stockData || !stockData.code) {
    return { error: "بيانات السهم غير صالحة" };
  }

  var businessModel = analyzeBusinessModel(stockData.sector || "عام", stockData.name || stockData.code);
  var valuation = analyzeValuation(stockData.pe || 0, stockData.pb || 0, stockData.divYield || 0, stockData.sector || "عام");
  var balanceSheet = analyzeBalanceSheet(stockData.debt, stockData.cash, stockData.revenue, stockData.sector || "عام");
  var strength = computeOverallStrength(valuation, balanceSheet, businessModel);
  var scenarios = buildScenarios(stockData, valuation, balanceSheet, businessModel);
  var summary = buildSummary(stockData, valuation, balanceSheet, businessModel, strength);

  return {
    business_model: businessModel.model,
    competitive_moat: businessModel.moat,
    business_stability: businessModel.stability,
    profitability: {
      sector_avg_pe: getBenchmark(stockData.sector).avgPE,
      sector_avg_yield: getBenchmark(stockData.sector).avgDivYield,
    },
    balance_sheet: balanceSheet,
    valuation: valuation,
    strength_score: strength,
    summary: summary,
    bull_case: scenarios.bull,
    bear_case: scenarios.bear,
    methodology: "Rule-based v1.0 — معايير قطاعية + قواعد حتمية",
    limitations: "البيانات المالية التفصيلية غير مدمجة حالياً — يعتمد على المؤشرات المتاحة",
  };
}
