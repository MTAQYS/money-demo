(function () {
  const KEY = "dynamogic-money-demo";
  const PRESETS = {
    thirds: { invest: 33, obligations: 33, spend: 34 },
    "503020": { invest: 20, obligations: 50, spend: 30 }
  };
  const RING = ["var(--t1)", "var(--a)", "var(--t2)", "var(--b2)", "#8d8680", "#c4b8a8"];

  const state = {
    data: null,
    lang: "fr",
    theme: "dark",
    welcomed: false,
    tab: "home",
    preset: "thirds",
    pct: { invest: 33, obligations: 33, spend: 34 },
    weekendRule: "before",
    extraTx: [],
    sumError: false
  };

  const $ = (id) => document.getElementById(id);

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function t(key, vars) {
    const pack = state.data.i18n[state.lang] || state.data.i18n.fr;
    let s = pack[key] ?? state.data.i18n.fr[key] ?? key;
    if (vars) {
      Object.keys(vars).forEach((k) => {
        s = s.replaceAll("{" + k + "}", String(vars[k]));
      });
    }
    return s;
  }

  function rich(s) {
    return s.split("*").map((part, i) => (i % 2 ? "<em>" + esc(part) + "</em>" : esc(part))).join("");
  }

  function money(n) {
    const rounded = Math.round(Number(n) || 0);
    const abs = Math.abs(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
    return (rounded < 0 ? "−" : "") + abs;
  }

  function nameOf(obj) {
    if (!obj) return "";
    if (typeof obj === "string") return obj;
    return obj[state.lang] || obj.fr || "";
  }

  function catName(id) {
    const c = state.data.categories[id] || state.data.categories.autre;
    return nameOf(c);
  }

  function parseISO(s) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function iso(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function addDays(d, n) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  }

  function diffDays(a, b) {
    return Math.round((a - b) / 86400000);
  }

  function daysInMonth(y, m) {
    return new Date(y, m + 1, 0).getDate();
  }

  function shiftWeekend(date, rule) {
    const day = date.getDay();
    const x = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (rule === "none" || (day !== 0 && day !== 6)) return x;
    if (rule === "before") x.setDate(x.getDate() - (day === 0 ? 2 : 1));
    else x.setDate(x.getDate() + (day === 6 ? 2 : 1));
    return x;
  }

  function effectiveDue(year, month, day, rule) {
    const base = new Date(year, month, Math.min(day, daysInMonth(year, month)));
    let shifted = shiftWeekend(base, rule);
    if (shifted.getMonth() !== month || shifted.getFullYear() !== year) {
      const other = rule === "before" ? "after" : rule === "after" ? "before" : "none";
      const back = shiftWeekend(base, other);
      shifted = back.getMonth() === month ? back : base;
    }
    return shifted;
  }

  function cycleFor(today, incomeDay) {
    const start = new Date(today.getFullYear(), today.getMonth(), incomeDay);
    if (today.getDate() < incomeDay) start.setMonth(start.getMonth() - 1);
    const next = new Date(start.getFullYear(), start.getMonth() + 1, incomeDay);
    return { start, next };
  }

  function billsThisCycle(start, next, rule) {
    const out = [];
    let y = start.getFullYear();
    let m = start.getMonth();
    for (let guard = 0; guard < 3; guard += 1) {
      if (new Date(y, m, 1) >= next) break;
      state.data.bills.forEach((bill) => {
        const due = effectiveDue(y, m, bill.day, rule);
        if (due >= start && due < next) out.push(Object.assign({}, bill, { due: due }));
      });
      m += 1;
      if (m > 11) { m = 0; y += 1; }
    }
    return out;
  }

  function allocate(income, pct, billsTotal) {
    const invest0 = Math.round(income * pct.invest / 100);
    const obl0 = Math.round(income * pct.obligations / 100);
    let spend = income - invest0 - obl0;
    let invest = invest0;
    const overflow = Math.max(0, billsTotal - obl0);
    spend -= overflow;
    const floor = Math.round(income * 0.2);
    let mode = overflow > 0 ? "from-spend" : "none";
    if (spend < 1000) {
      const can = Math.max(0, invest - floor);
      const take = Math.min(can, 1000 - spend);
      invest -= take;
      spend += take;
      mode = spend >= 1000 ? "from-invest" : "floor";
    }
    return { invest: invest, plannedObl: obl0, spend: spend, overflow: overflow, mode: mode, floor: floor };
  }

  function allTx() {
    return state.data.transactions.concat(state.extraTx);
  }

  function compute() {
    const today = parseISO(state.data.asOf);
    const bounds = cycleFor(today, state.data.income.day);
    const bills = billsThisCycle(bounds.start, bounds.next, state.weekendRule);
    const txs = allTx().filter((tx) => {
      const d = parseISO(tx.date);
      return d >= bounds.start && d <= today;
    });
    const billsTotal = bills.reduce((s, b) => s + b.amount, 0);
    const budget = allocate(state.data.income.amount, state.pct, billsTotal);
    const paid = bills.filter((b) => b.due < today);
    const upcoming = bills.filter((b) => b.due >= today).sort((a, b) => a.due - b.due);
    const spent = txs.reduce((s, tx) => s + tx.amount, 0);
    const paidSum = paid.reduce((s, b) => s + b.amount, 0);
    const upcomingSum = upcoming.reduce((s, b) => s + b.amount, 0);
    const cash = state.data.income.amount - budget.invest - paidSum - spent;
    const safe = cash - upcomingSum;
    const daysToPayday = Math.max(1, diffDays(bounds.next, today));
    const totalDays = Math.max(1, diffDays(bounds.next, bounds.start));
    const elapsed = diffDays(today, bounds.start);
    const expected = budget.spend * elapsed / totalDays;
    const paceGap = expected - spent;
    const dailyRaw = (budget.spend - spent) / daysToPayday;
    return {
      today: today,
      start: bounds.start,
      next: bounds.next,
      bills: bills,
      txs: txs,
      budget: budget,
      paid: paid,
      upcoming: upcoming,
      spent: spent,
      cash: cash,
      safe: safe,
      daysToPayday: daysToPayday,
      totalDays: totalDays,
      paceGap: paceGap,
      dailyRaw: dailyRaw,
      daily: dailyRaw > 0 ? dailyRaw : 0,
      upcomingSum: upcomingSum
    };
  }

  function pointsFor(model) {
    const income = state.data.income.amount;
    let bal = income - model.budget.invest;
    const txOf = {};
    const billOf = {};
    model.txs.forEach((tx) => { txOf[tx.date] = (txOf[tx.date] || 0) + tx.amount; });
    model.bills.forEach((b) => {
      const k = iso(b.due);
      billOf[k] = (billOf[k] || 0) + b.amount;
    });
    const pts = [];
    for (let d = new Date(model.start); d < model.today; d = addDays(d, 1)) {
      pts.push({ bal: bal, future: false });
      const k = iso(d);
      bal -= (txOf[k] || 0) + (billOf[k] || 0);
    }
    bal -= txOf[iso(model.today)] || 0;
    pts.push({ bal: bal, future: false });
    const pace = model.daysToPayday > 0 ? Math.max(0, model.budget.spend - model.spent) / model.daysToPayday : 0;
    let f = bal;
    for (let i = 0; i < model.daysToPayday; i += 1) {
      const k = iso(addDays(model.today, i));
      f -= (billOf[k] || 0) + pace;
      pts.push({ bal: f, future: true });
    }
    return pts;
  }

  function bar(pct, kind) {
    const w = Math.max(0, Math.min(100, Math.round(pct)));
    return '<svg class="bar ' + (kind || "") + '" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true"><rect class="track" width="100" height="8"></rect><rect class="fill" width="' + w + '" height="8"></rect></svg>';
  }

  function chartSVG(pts) {
    const w = 320;
    const h = 112;
    const pad = 8;
    const vals = pts.map((p) => p.bal);
    const min = Math.min(0, ...vals);
    const max = Math.max(1, ...vals);
    const x = (i) => pad + (pts.length === 1 ? 0 : (i / (pts.length - 1)) * (w - pad * 2));
    const y = (v) => 8 + (1 - (v - min) / (max - min)) * (h - 22);
    const split = pts.findIndex((p) => p.future);
    const solidEnd = Math.max(split, 1);
    const solid = pts.slice(0, solidEnd);
    const dashed = pts.slice(Math.max(split - 1, 0));
    const line = (list, offset) => list.map((p, i) => x(i + offset).toFixed(1) + "," + y(p.bal).toFixed(1)).join(" ");
    return '<svg class="chart" viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="' + esc(t("forecast")) + '">' +
      '<polyline points="' + line(solid, 0) + '" fill="none" stroke="var(--t1)" stroke-width="2"/>' +
      '<polyline points="' + line(dashed, Math.max(split - 1, 0)) + '" fill="none" stroke="var(--a)" stroke-width="2" stroke-dasharray="5 4"/></svg>';
  }

  function ringSVG(txs) {
    const map = {};
    txs.forEach((tx) => { map[tx.category] = (map[tx.category] || 0) + tx.amount; });
    const entries = Object.keys(map).map((k) => [k, map[k]]).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, e) => s + e[1], 0) || 1;
    const r = 46;
    const c = 2 * Math.PI * r;
    let off = 0;
    const arcs = entries.map((e, i) => {
      const len = (e[1] / total) * c;
      const dash = Math.max(0, len - 2).toFixed(1) + " " + c.toFixed(1);
      const el = '<circle r="' + r + '" cx="70" cy="70" fill="none" stroke="' + RING[i % RING.length] + '" stroke-width="12" stroke-dasharray="' + dash + '" stroke-dashoffset="' + (-off).toFixed(1) + '" transform="rotate(-90 70 70)"/>';
      off += len;
      return el;
    }).join("");
    const legend = entries.map((e, i) =>
      '<li><i class="swatch swatch-' + (i % RING.length) + '"></i><span>' + esc(catName(e[0])) + "</span><b>" + money(e[1]) + "</b></li>"
    ).join("");
    return { svg: '<svg class="ring" viewBox="0 0 140 140" role="img" aria-label="' + esc(t("analysisTitle")) + '">' + arcs + "</svg>", legend: legend, total: total, top: entries[0] };
  }

  function overflowText(model) {
    const b = model.budget;
    if (b.mode === "from-spend") {
      return t("overflowSpend", { bills: money(model.bills.reduce((s, x) => s + x.amount, 0)), plan: money(b.plannedObl), gap: money(b.overflow) });
    }
    if (b.mode === "from-invest") return t("overflowInvest");
    if (b.mode === "floor") return t("overflowFloor", { floor: money(b.floor) });
    return "";
  }

  function dayNum(d) {
    return String(d.getDate()).padStart(2, "0");
  }

  function billMeta(bill) {
    const notes = [];
    const nominal = new Date(bill.due.getFullYear(), bill.due.getMonth(), Math.min(bill.day, daysInMonth(bill.due.getFullYear(), bill.due.getMonth())));
    if (nominal.getDate() !== bill.day) notes.push(t("monthEnd"));
    if (iso(nominal) !== iso(bill.due)) notes.push(t("weekendMoved"));
    notes.push(t("reserved"));
    return notes.join(" · ");
  }

  function renderWelcome() {
    $("main").innerHTML =
      '<section class="welcome"><div class="hero-copy"><p class="kicker">' + esc(t("welcomeKicker")) + "</p><h1 id=\"screen-title\">" +
      rich(t("welcomeTitle")) + "</h1><p>" + esc(t("welcomeBody")) + "</p></div>" +
      '<button type="button" class="cta" data-action="start">' + esc(t("start")) + "</button>" +
      '<button type="button" class="ghost" data-action="start">' + esc(t("haveAccount")) + "</button></section>";
  }

  function renderHome(model) {
    const pace = model.paceGap > 1 ? '<p class="sub">' + esc(t("rollover", { n: money(model.paceGap) })) + "</p>" :
      model.dailyRaw <= 0 ? '<p class="sub">' + esc(t("overspent")) + "</p>" : "";
    const msg = overflowText(model);
    const upcoming = model.upcoming.slice(0, 3).map((b) =>
      '<div class="bill"><div class="when"><b>' + dayNum(b.due) + "</b></div><div class=\"name\">" + esc(nameOf(b.name)) +
      "<span>" + esc(billMeta(b)) + "</span></div><div class=\"amt\">−" + money(b.amount) + "</div></div>"
    ).join("") || '<p class="muted">' + esc(t("noneUpcoming")) + "</p>";
    const next = model.upcoming[0];
    const tgNext = next ? "<p>" + esc(t("tgNext", { name: nameOf(next.name), amount: money(next.amount) })) + "</p>" : "";
    const allow = Math.max(0, model.budget.spend);
    const spentPct = allow ? Math.min(100, Math.round(model.spent / allow * 100)) : 100;
    const oblPct = model.budget.plannedObl ? Math.min(100, Math.round(model.bills.reduce((s, b) => s + b.amount, 0) / model.budget.plannedObl * 100)) : 100;
    $("main").innerHTML =
      '<section><h1 class="kicker" id="screen-title">' + esc(t("canSpend")) + '</h1>' +
      '<p class="hero" id="metric-daily">' + money(model.daily) + "<small>MAD</small></p>" +
      '<p class="sub">' + esc(t("leftSpend", { left: money(model.safe), days: String(model.daysToPayday) })) + "</p>" + pace +
      '<div class="stats"><div><span class="kicker">' + esc(t("free")) + '</span><b id="metric-safe">' + money(model.safe) + "</b></div>" +
      "<div><span class=\"kicker\">" + esc(t("payday")) + "</span><b>" + esc(t("days", { n: String(model.daysToPayday) })) + "</b></div>" +
      "<div><span class=\"kicker\">" + esc(t("spent")) + '</span><b id="metric-spent">' + money(model.spent) + "</b></div></div>" +
      '<div class="card"><div class="tier"><div class="line"><b>' + esc(t("obligations")) + "</b><span>" +
      esc(t("billsOf", { actual: money(model.bills.reduce((s, b) => s + b.amount, 0)), plan: money(model.budget.plannedObl) })) +
      '</span></div>' + bar(oblPct, "") + '</div>' +
      '<div class="tier"><div class="line"><b>' + esc(t("wants")) + "</b><span>" +
      esc(t("spentOf", { spent: money(model.spent), allow: money(allow) })) +
      "</span></div>" + bar(spentPct, "copper") + "</div>" +
      '<div class="tier"><div class="line"><b>' + esc(t("invest")) + "</b><span>" + money(model.budget.invest) +
      "</span></div><p>" + esc(t("setAside")) + "</p>" + bar(100, "dim") + "</div></div>" +
      (msg ? '<div class="card" id="overflow"><p class="note">' + esc(msg) + "</p></div>" : "") +
      '<div class="card"><h2>' + esc(t("forecast")) + "</h2>" + chartSVG(pointsFor(model)) + "</div>" +
      '<div class="card"><h2>' + esc(t("upcoming")) + "</h2>" + upcoming + "</div>" +
      '<div class="card" id="telegram"><div class="tg-head"><div class="avatar"><svg class="mark" viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path class="owl" fill="var(--t1)" fill-rule="evenodd" d="M24 14.6L45 2.476L41 9.404L41 28L24 45L7 28L7 9.404L3 2.476Z M26.151 21.758A6 6 0 1 0 36.082 16.024Z M21.849 21.758A6 6 0 1 1 11.918 16.024Z M29.1 22.321A2.6 2.6 0 1 0 34.3 22.321A2.6 2.6 0 1 0 29.1 22.321Z M13.7 22.321A2.6 2.6 0 1 0 18.9 22.321A2.6 2.6 0 1 0 13.7 22.321Z M24 24.299L27.985 26.599L24 37.913L20.015 26.599Z"/><path class="beak" fill="var(--a)" d="M24 25.8L26.4 27.186L24 34L21.6 27.186Z"/></svg></div><div><strong>Dynamogic</strong><div class="muted">' + esc(t("telegram")) + "</div></div></div>" +
      '<div class="bubble" id="telegram-text"><span class="who">' + esc(t("tgHello")) + "</span><strong>" + money(model.daily) + ' MAD</strong><p>' +
      esc(t("tgBody", { daily: money(model.daily), days: String(model.daysToPayday) })) + "</p>" + tgNext +
      '<p class="muted">' + esc(t("tgPrivate")) + "</p></div></div></section>";
  }

  function renderBills(model) {
    const y = model.today.getFullYear();
    const m = model.today.getMonth();
    const lead = (new Date(y, m, 1).getDay() + 6) % 7;
    const n = daysInMonth(y, m);
    const cells = Array(lead).fill(null);
    for (let d = 1; d <= n; d += 1) cells.push(d);
    while (cells.length % 7) cells.push(null);
    const billDays = {};
    model.bills.forEach((b) => {
      if (b.due.getMonth() === m && b.due.getFullYear() === y) billDays[b.due.getDate()] = true;
    });
    const incomeDay = state.data.income.day;
    const heads = ["L", "M", "M", "J", "V", "S", "D"].map((d) => '<span class="wd">' + d + "</span>").join("");
    const days = cells.map((d) => {
      if (!d) return "<span></span>";
      const cls = ["day"];
      if (d === model.today.getDate()) cls.push("today");
      else if (d < model.today.getDate()) cls.push("past");
      let dot = "";
      if (billDays[d]) dot = '<i class="dot"></i>';
      else if (d === incomeDay) dot = '<i class="dot in"></i>';
      return '<span class="' + cls.join(" ") + '">' + d + dot + "</span>";
    }).join("");
    const rows = [{ due: model.start, name: state.data.income.name, amount: state.data.income.amount, income: true }]
      .concat(model.bills.slice().sort((a, b) => a.due - b.due))
      .map((row) => {
        const sign = row.income ? "+" : "−";
        const cls = row.income ? "amt pos" : "amt";
        const meta = row.income ? "" : billMeta(row);
        return '<div class="bill"><div class="when"><b>' + dayNum(row.due) + '</b></div><div class="name">' + esc(nameOf(row.name)) +
          (meta ? "<span>" + esc(meta) + "</span>" : "") + '</div><div class="' + cls + '">' + sign + money(row.amount) + "</div></div>";
      }).join("");
    const out = model.bills.reduce((s, b) => s + b.amount, 0);
    $("main").innerHTML =
      '<section><p class="kicker">' + esc(t("billsKicker")) + '</p><h1 class="screen-title" id="screen-title">' + esc(t("billsTitle")) + "</h1>" +
      '<p class="sub">' + esc(t("income")) + " <b>" + money(state.data.income.amount) + "</b> · " + esc(t("outgo")) + " <b>" + money(out) + "</b></p>" +
      '<div class="card"><div class="cal">' + heads + days + "</div></div>" +
      '<div class="card">' + rows + "</div></section>";
  }

  function renderAnalysis(model) {
    const ring = ringSVG(model.txs);
    const top = ring.top ? t("insightTop", { name: catName(ring.top[0]), amount: money(ring.top[1]) }) : "";
    const pace = model.paceGap >= 0 ? t("insightPaceUnder", { n: money(model.paceGap) }) : t("insightPaceOver", { n: money(-model.paceGap) });
    const gap = state.data.emergency.goal - state.data.emergency.saved;
    const emerg = model.budget.invest >= gap ? t("emergencySoon", { invest: money(model.budget.invest) }) :
      t("emergencyMonths", { n: String(Math.max(1, Math.ceil(gap / Math.max(1, model.budget.invest)))) });
    const pct = Math.min(100, Math.round(state.data.emergency.saved / state.data.emergency.goal * 100));
    $("main").innerHTML =
      '<section><p class="kicker">' + esc(t("analysisKicker")) + '</p><h1 class="screen-title" id="screen-title">' + esc(t("analysisTitle")) + "</h1>" +
      '<div class="card"><div class="ring-wrap">' + ring.svg + '<ul class="legend">' + ring.legend + "</ul></div>" +
      '<p class="muted">' + esc(t("spentMonth", { n: money(ring.total) })) + "</p></div>" +
      '<div class="card"><p class="note">' + esc(top) + "</p><p class=\"note\">" + esc(pace) + "</p></div>" +
      '<div class="card"><h2>' + esc(t("emergency")) + "</h2><p>" + esc(t("emergencyLine", {
        saved: money(state.data.emergency.saved), goal: money(state.data.emergency.goal)
      })) + "</p><p class=\"note\">" + esc(emerg) + "</p>" + bar(pct, "copper") + "</div></section>";
  }

  function renderSettings(model) {
    const pct = state.pct;
    const sum = pct.invest + pct.obligations + pct.spend;
    const hint = state.preset === "thirds" ? t("presetHintThirds") : state.preset === "503020" ? t("presetHint503020") : t("presetHintCustom");
    const err = state.sumError ? '<p class="err">' + esc(t("sumBad", { n: String(state.badSum != null ? state.badSum : sum) })) + "</p>" : "";
    const dis = state.preset === "custom" ? "" : " disabled";
    const press = (id) => (state.preset === id ? "true" : "false");
    const wpress = (id) => (state.weekendRule === id ? "true" : "false");
    $("main").innerHTML =
      '<section><p class="kicker">' + esc(t("settingsKicker")) + '</p><h1 class="screen-title" id="screen-title">' + esc(t("settingsTitle")) + "</h1>" +
      '<div class="card"><h2>' + esc(t("preset")) + " · " + money(state.data.income.amount) + " MAD</h2>" +
      '<div class="preset" role="group"><button type="button" data-preset="thirds" aria-pressed="' + press("thirds") + '">' + esc(t("presetThirds")) +
      '</button><button type="button" data-preset="503020" aria-pressed="' + press("503020") + '">' + esc(t("preset503020")) +
      '</button><button type="button" data-preset="custom" aria-pressed="' + press("custom") + '">' + esc(t("presetCustom")) + "</button></div>" +
      '<div class="fields"><label>' + esc(t("invest")) + '<input id="pct-invest" inputmode="numeric" value="' + pct.invest + '"' + dis + '></label>' +
      "<label>" + esc(t("obligations")) + '<input id="pct-obl" inputmode="numeric" value="' + pct.obligations + '"' + dis + "></label>" +
      "<label>" + esc(t("wants")) + '<input id="pct-spend" inputmode="numeric" value="' + pct.spend + '"' + dis + "></label></div>" +
      "<p class=\"muted\">" + esc(hint) + "</p>" + err + "</div>" +
      '<div class="card"><h2>' + esc(t("weekend")) + "</h2><div class=\"weekend\" role=\"group\">" +
      '<button type="button" data-weekend="before" aria-pressed="' + wpress("before") + '">' + esc(t("weekendBefore")) + "</button>" +
      '<button type="button" data-weekend="after" aria-pressed="' + wpress("after") + '">' + esc(t("weekendAfter")) + "</button>" +
      '<button type="button" data-weekend="none" aria-pressed="' + wpress("none") + '">' + esc(t("weekendNone")) + "</button></div></div>" +
      (overflowText(model) ? '<div class="card"><p class="note">' + esc(overflowText(model)) + "</p></div>" : "") +
      '<button type="button" class="danger" data-action="reset">' + esc(t("reset")) + "</button></section>";
  }

  function paintChrome(model) {
    document.documentElement.lang = state.lang;
    document.documentElement.dataset.theme = state.theme;
    $("month-pill").textContent = t("month");
    $("lang").setAttribute("aria-label", t("langLabel"));
    $("lang-fr").setAttribute("aria-pressed", state.lang === "fr" ? "true" : "false");
    $("lang-en").setAttribute("aria-pressed", state.lang === "en" ? "true" : "false");
    const themeBtn = $("theme-btn");
    themeBtn.textContent = state.theme === "dark" ? t("themeToLight") : t("themeToDark");
    themeBtn.setAttribute("aria-pressed", state.theme === "light" ? "true" : "false");
    themeBtn.setAttribute("aria-label", state.theme === "dark" ? t("themeToLight") : t("themeToDark"));
    const labels = { home: t("tabHome"), bills: t("tabBills"), analysis: t("tabAnalysis"), settings: t("tabSettings") };
    document.querySelectorAll("[data-tab]").forEach((btn) => {
      btn.querySelector("span").textContent = labels[btn.dataset.tab];
      const on = state.welcomed && btn.dataset.tab === state.tab;
      if (on) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    $("tabs").setAttribute("aria-label", t("tabsLabel"));
    $("tabs").hidden = !state.welcomed;
    $("fab").hidden = !state.welcomed;
    $("fab").setAttribute("aria-label", t("fab"));
    $("add-title").textContent = t("addTitle");
    $("add-label").textContent = t("addLabel");
    $("add-input").placeholder = t("addPlaceholder");
    $("add-save").textContent = t("addSave");
    $("add-cancel").textContent = t("addCancel");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = state.theme === "light" ? "#F5F3EE" : "#0E0F11";
    if (!model) return;
  }

  function render(opts) {
    const model = state.welcomed ? compute() : null;
    paintChrome(model);
    if (!state.welcomed) renderWelcome();
    else if (state.tab === "home") renderHome(model);
    else if (state.tab === "bills") renderBills(model);
    else if (state.tab === "analysis") renderAnalysis(model);
    else renderSettings(model);
    if (opts && opts.focus) {
      const h = $("screen-title");
      if (h) h.focus();
    }
  }

  function save() {
    const snap = {
      lang: state.lang,
      theme: state.theme,
      welcomed: state.welcomed,
      tab: state.tab,
      preset: state.preset,
      pct: state.pct,
      weekendRule: state.weekendRule,
      extraTx: state.extraTx
    };
    localStorage.setItem(KEY, JSON.stringify(snap));
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      ["lang", "theme", "welcomed", "tab", "preset", "pct", "weekendRule", "extraTx"].forEach((k) => {
        if (s[k] !== undefined) state[k] = s[k];
      });
    } catch (err) {
      localStorage.removeItem(KEY);
    }
  }

  function categorize(note) {
    const n = note.toLowerCase();
    const rules = [
      [["café", "cafe", "coffee", "thé", "the"], "cafes"],
      [["tram", "bus", "taxi", "uber", "essence"], "transport"],
      [["pain", "courses", "marché", "marche", "lait", "jus"], "courses"],
      [["pharma", "médecin", "medecin"], "sante"],
      [["ciné", "cine", "livre"], "loisirs"]
    ];
    for (let i = 0; i < rules.length; i += 1) {
      if (rules[i][0].some((k) => n.includes(k))) return rules[i][1];
    }
    return "autre";
  }

  function parseExpense(raw) {
    const m = String(raw).trim().match(/^(\d+(?:[.,]\d{1,2})?)\s+(.+)$/);
    if (!m) return null;
    const amount = Math.round(Number(m[1].replace(",", ".")) * 100) / 100;
    if (!amount || amount <= 0) return null;
    const note = m[2].trim();
    return { amount: amount, note: note, category: categorize(note) };
  }

  function openAdd() {
    $("add-error").hidden = true;
    $("add-input").value = "";
    $("add-dialog").showModal();
    $("add-input").focus();
  }

  function applyCustom() {
    const invest = Number($("pct-invest").value);
    const obligations = Number($("pct-obl").value);
    const spend = Number($("pct-spend").value);
    if (![invest, obligations, spend].every((n) => Number.isFinite(n) && n >= 0)) return;
    const sum = invest + obligations + spend;
    state.preset = "custom";
    if (sum !== 100) {
      state.sumError = true;
      state.badSum = sum;
      save();
      render();
      return;
    }
    state.sumError = false;
    state.pct = { invest: invest, obligations: obligations, spend: spend };
    save();
    render();
  }

  document.body.addEventListener("click", (ev) => {
    const lang = ev.target.closest("[data-lang]");
    if (lang) {
      state.lang = lang.dataset.lang;
      save();
      render();
      return;
    }
    if (ev.target.closest("#theme-btn")) {
      state.theme = state.theme === "dark" ? "light" : "dark";
      save();
      render();
      return;
    }
    const tab = ev.target.closest("[data-tab]");
    if (tab && state.welcomed) {
      state.tab = tab.dataset.tab;
      save();
      render({ focus: true });
      return;
    }
    if (ev.target.closest("[data-action='start']")) {
      state.welcomed = true;
      state.tab = "home";
      save();
      render({ focus: true });
      return;
    }
    if (ev.target.closest("[data-action='reset']")) {
      localStorage.removeItem(KEY);
      location.reload();
      return;
    }
    const preset = ev.target.closest("[data-preset]");
    if (preset) {
      state.preset = preset.dataset.preset;
      state.sumError = false;
      if (PRESETS[state.preset]) state.pct = Object.assign({}, PRESETS[state.preset]);
      save();
      render();
      return;
    }
    const weekend = ev.target.closest("[data-weekend]");
    if (weekend) {
      state.weekendRule = weekend.dataset.weekend;
      save();
      render();
    }
  });

  document.body.addEventListener("change", (ev) => {
    if (ev.target.closest("#pct-invest, #pct-obl, #pct-spend")) applyCustom();
  });

  $("tabs").addEventListener("keydown", (ev) => {
    const order = ["home", "bills", "analysis", "settings"];
    const i = order.indexOf(state.tab);
    if (i < 0) return;
    if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") {
      ev.preventDefault();
      const next = ev.key === "ArrowRight" ? (i + 1) % 4 : (i + 3) % 4;
      state.tab = order[next];
      save();
      render();
      document.querySelector('[data-tab="' + state.tab + '"]').focus();
    }
  });

  $("fab").addEventListener("click", openAdd);
  $("add-cancel").addEventListener("click", () => $("add-dialog").close());
  $("add-form").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const parsed = parseExpense($("add-input").value);
    const err = $("add-error");
    if (!parsed) {
      err.hidden = false;
      err.textContent = t("addError");
      return;
    }
    state.extraTx.push({
      id: "u" + Date.now(),
      date: state.data.asOf,
      note: parsed.note,
      amount: parsed.amount,
      category: parsed.category
    });
    save();
    $("add-dialog").close();
    state.tab = "home";
    render();
    $("status").textContent = t("added", { amount: money(parsed.amount), cat: catName(parsed.category) });
  });

  function init() {
    load();
    fetch("data.json")
      .then((res) => {
        if (!res.ok) throw new Error("data");
        return res.json();
      })
      .then((data) => {
        state.data = data;
        render();
      })
      .catch(() => {
        $("main").textContent = "data.json";
      });
  }

  init();
})();
