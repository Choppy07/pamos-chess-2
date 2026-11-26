/* Lõi dùng chung: hồ sơ học viên, lưu bài, chấm điểm, hiệu ứng. Dữ liệu nằm trong localStorage của trình duyệt. */
(function () {
  "use strict";
  const PA = window.PA;
  /* Mỗi khóa lưu riêng, vì các web trên cùng một tài khoản GitHub dùng chung kho của trình duyệt. */
  const COURSE = (PA.course = window.PAMOS_COURSE || { id: "k1", name: "PAMOS CHESS" });
  const KEY = "pamos-app-v1" + (COURSE.id === "k1" ? "" : "-" + COURSE.id);
  /* Khóa ít buổi hơn thì hạ mốc sao, để vẫn mở được toàn bộ Vương quốc. */
  const maxStars = (window.PAMOS_LESSONS || []).length * 3;
  const topNeed = Math.max(...PA.KINGDOM.map(k => k.need));
  if (maxStars && maxStars < topNeed) PA.KINGDOM.forEach(k => { k.need = Math.round(k.need * maxStars / topNeed); });

  const el = (tag, cls, html) => { const x = document.createElement(tag); if (cls) x.className = cls; if (html != null) x.innerHTML = html; return x; };
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  PA.el = el; PA.esc = esc;

  /* ---------- Kho dữ liệu ---------- */
  const empty = () => ({ v: 1, current: null, students: {}, sound: true });
  let mem = null, storageOk = true;
  function load() {
    try { const s = localStorage.getItem(KEY); if (s) { const d = JSON.parse(s); if (d && d.v === 1 && d.students) return d; } }
    catch (err) { storageOk = false; }
    return mem || empty();
  }
  function save(db) {
    mem = db;
    try { localStorage.setItem(KEY, JSON.stringify(db)); storageOk = true; }
    catch (err) { storageOk = false; PA.toast("Trình duyệt không cho lưu. Tiến độ sẽ mất khi đóng trang."); }
  }
  PA.db = load;
  PA.me = () => { const db = load(); return (db.current && db.students[db.current]) || null; };
  const update = fn => { const db = load(); const out = fn(db); save(db); return out; };
  PA.update = update;
  /* cloud.js đặt PA.onChange để biết khi nào cần đẩy lên máy chủ. */
  const changed = () => { if (PA.onChange) PA.onChange(); };

  const hash = s => { let h = 5381; for (const ch of String(s)) h = ((h << 5) + h + ch.codePointAt(0)) >>> 0; return h.toString(36); };
  PA.pinHash = (id, pin) => hash(id + ":" + pin);
  PA.addStudent = info => update(db => {
    const id = "hv" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
    db.students[id] = { id, name: info.name.trim().slice(0, 24), animal: info.animal, color: info.color, goal: info.goal, pin: info.pin ? PA.pinHash(id, info.pin) : "", created: Date.now(), ans: {}, days: {}, drill: null };
    db.current = id;
    return id;
  });
  PA.editStudent = (id, patch) => { update(db => { if (db.students[id]) Object.assign(db.students[id], patch, { pt: Date.now() }); }); changed(); };
  PA.login = id => update(db => { if (db.students[id]) db.current = id; });
  PA.logout = () => update(db => { db.current = null; });
  PA.removeStudent = id => update(db => { delete db.students[id]; if (db.current === id) db.current = null; });

  const dayKey = d => { const x = d || new Date(); return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); };
  PA.dayKey = dayKey;

  /* Ghi một lần trả lời. first = kết quả lần đầu (dùng để đánh giá), last = lần gần nhất (dùng để tính sao). */
  const recordLocal = (id, ok, meta) => update(db => {
    const s = db.current && db.students[db.current];
    if (!s) return null;
    const old = s.ans[id];
    const now = Date.now();
    s.ans[id] = Object.assign({}, meta, { first: old ? old.first : ok, last: ok, n: old ? old.n + 1 : 1, t: now, ft: old ? old.ft || old.t : now });
    const d = dayKey(), day = s.days[d] || (s.days[d] = { ids: [], goalDone: false });
    if (!day.ids.includes(id)) day.ids.push(id);
    const reached = !day.goalDone && day.ids.length >= s.goal;
    if (reached) day.goalDone = true;
    return { isNew: !old, goalReached: reached, today: day.ids.length, goal: s.goal };
  });
  PA.record = (id, ok, meta) => { const out = recordLocal(id, ok, meta); if (out) changed(); return out; };
  const drillLocal = (right, total, secs) => update(db => {
    const s = db.current && db.students[db.current];
    if (!s) return null;
    const b = s.drill;
    const better = !b || right > b.right || (right === b.right && secs < b.secs);
    if (better) s.drill = { right, total, secs };
    return better;
  });
  PA.saveDrill = (right, total, secs) => { const out = drillLocal(right, total, secs); if (out) changed(); return out; };

  PA.todayCount = s => ((s.days[dayKey()] || {}).ids || []).length;
  PA.streak = s => {
    let n = 0; const d = new Date();
    if (!s.days[dayKey(d)]) d.setDate(d.getDate() - 1);
    while (s.days[dayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  };

  /* ---------- Đánh giá ---------- */
  PA.lessonStats = (s, lesson) => {
    const list = lesson.ids.map(id => s.ans[id]).filter(Boolean);
    const done = list.length, total = lesson.ids.length;
    const first = list.filter(a => a.first).length, last = list.filter(a => a.last).length;
    const complete = total > 0 && done === total;
    const lastPct = total ? last / total : 0;
    const stars = complete ? (lastPct >= 0.9 ? 3 : lastPct >= 0.7 ? 2 : 1) : 0;
    return { done, total, first, last, complete, stars, firstPct: done ? first / done : 0 };
  };
  PA.totalStars = s => (window.PAMOS_LESSONS || []).reduce((a, l) => a + PA.lessonStats(s, l).stars, 0);
  PA.grade = pct => pct >= 0.9 ? { name: "Xuất sắc", icon: "🏆", tip: "Bạn tính rất chắc. Hãy sang buổi tiếp theo." }
    : pct >= 0.75 ? { name: "Tốt", icon: "🌟", tip: "Nền tảng ổn. Xem lại các câu sai rồi đi tiếp." }
    : pct >= 0.55 ? { name: "Khá", icon: "👍", tip: "Nên ôn các câu sai và tính hết biến trước khi chọn." }
    : { name: "Cần ôn lại", icon: "🌱", tip: "Đọc lại phần kiến thức, tua puzzle mẫu rồi làm lại các câu sai." };
  PA.themeStats = s => {
    const m = Object.create(null);
    Object.values(s.ans).forEach(a => (a.themes || []).forEach(t => { const x = m[t] || (m[t] = { name: t, n: 0, ok: 0 }); x.n++; if (a.first) x.ok++; }));
    return Object.values(m).sort((a, b) => a.ok / a.n - b.ok / b.n || b.n - a.n);
  };
  PA.starsHTML = n => '<span class="stars" role="img" aria-label="' + n + ' trên 3 sao">' + [1, 2, 3].map(i => '<span class="' + (i <= n ? "on" : "off") + '">★</span>').join("") + "</span>";

  /* ---------- Sao lưu ---------- */
  PA.exportData = () => {
    const blob = new Blob([JSON.stringify(Object.assign({}, load(), { course: COURSE.id }), null, 1)], { type: "application/json" });
    const a = el("a"); a.href = URL.createObjectURL(blob); a.download = "pamos-sao-luu-" + (COURSE.id === "k1" ? "" : COURSE.id + "-") + dayKey() + ".json";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const isObj = x => !!x && typeof x === "object" && !Array.isArray(x);
  function cleanAns(src) {
    const out = {};
    if (isObj(src)) Object.keys(src).forEach(id => {
      const a = src[id];
      if (/^b\d+-[a-z0-9-]+$/.test(id) && isObj(a)) out[id] = { so: Number(a.so) || 0, label: String(a.label || "").slice(0, 60), q: String(a.q || "").slice(0, 160), themes: Array.isArray(a.themes) ? a.themes.slice(0, 6).map(t => String(t).slice(0, 60)) : [], first: !!a.first, last: !!a.last, n: Number(a.n) || 1, t: Number(a.t) || 0, ft: Number(a.ft) || Number(a.t) || 0 };
    });
    return out;
  }
  function cleanDays(src) {
    const out = {};
    if (isObj(src)) Object.keys(src).forEach(d => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(d) && isObj(src[d])) out[d] = { ids: Array.isArray(src[d].ids) ? src[d].ids.map(String) : [], goalDone: !!src[d].goalDone };
    });
    return out;
  }
  const cleanDrill = d => isObj(d) ? { right: Number(d.right) || 0, total: Number(d.total) || 0, secs: Number(d.secs) || 0 } : null;
  /* Dữ liệu từ file hoặc từ máy chủ đều không đáng tin: chỉ giữ đúng các trường, đúng kiểu. */
  PA.sanitize = (s, id) => ({
    id, name: String(s.name || "").slice(0, 24), animal: String(s.animal).slice(0, 20), color: String(s.color).slice(0, 7),
    goal: [5, 10, 15].includes(s.goal) ? s.goal : 10, created: Number(s.created) || Date.now(), pt: Number(s.pt) || 0,
    ans: cleanAns(s.ans), days: cleanDays(s.days), drill: cleanDrill(s.drill)
  });
  /* Gộp tiến độ từ hai nơi, không làm mất bài: lần làm mới nhất quyết định "last", lần sớm nhất quyết định "first". */
  PA.merge = (a, b) => {
    const prof = (b.pt || 0) > (a.pt || 0) ? b : a;
    const out = Object.assign({}, a, { name: prof.name, animal: prof.animal, color: prof.color, goal: prof.goal, pt: prof.pt || 0, created: Math.min(a.created, b.created), ans: {}, days: {} });
    new Set(Object.keys(a.ans).concat(Object.keys(b.ans))).forEach(id => {
      const x = a.ans[id], y = b.ans[id];
      if (!x || !y) { out.ans[id] = x || y; return; }
      const late = y.t > x.t ? y : x, early = (y.ft || y.t) < (x.ft || x.t) ? y : x;
      out.ans[id] = Object.assign({}, late, { first: early.first, ft: early.ft || early.t, n: Math.max(x.n, y.n) });
    });
    new Set(Object.keys(a.days).concat(Object.keys(b.days))).forEach(d => {
      const x = a.days[d] || { ids: [] }, y = b.days[d] || { ids: [] };
      out.days[d] = { ids: Array.from(new Set(x.ids.concat(y.ids))), goalDone: !!(x.goalDone || y.goalDone) };
    });
    const p = a.drill, q = b.drill;
    out.drill = !p ? q : !q ? p : (q.right > p.right || (q.right === p.right && q.secs < p.secs)) ? q : p;
    return out;
  };
  PA.importData = text => {
    let d; try { d = JSON.parse(text); } catch (err) { return 0; }
    if (!d || d.v !== 1 || !isObj(d.students) || (d.course || "k1") !== COURSE.id) return 0;
    let n = 0;
    update(db => {
      Object.values(d.students).forEach(s => {
        if (!s || !/^hv[a-z0-9]+$/.test(s.id) || typeof s.name !== "string") return;
        db.students[s.id] = Object.assign(PA.sanitize(s, s.id), { pin: typeof s.pin === "string" ? s.pin : "" });
        n++;
      });
    });
    return n;
  };

  /* ---------- Hiệu ứng ---------- */
  const calm = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  PA.calm = calm;
  PA.toast = msg => {
    let t = document.getElementById("toast");
    if (!t) { t = el("div"); t.id = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 3200);
  };
  PA.confetti = (x, y, count) => {
    if (calm()) return;
    const bits = ["⭐", "✨", "💛", "🎉", "🌸"];
    for (let i = 0; i < (count || 16); i++) {
      const p = el("span", "confetti", bits[i % bits.length]);
      p.style.left = x + "px"; p.style.top = y + "px";
      document.body.appendChild(p);
      const ang = Math.PI * 2 * i / (count || 16) + Math.random() * 0.5, d = 60 + Math.random() * 90;
      const anim = p.animate([
        { transform: "translate(-50%,-50%) scale(.4)", opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(ang) * d}px), calc(-50% + ${Math.sin(ang) * d - 40}px)) scale(1.1) rotate(${Math.random() * 360}deg)`, opacity: 1, offset: 0.6 },
        { transform: `translate(calc(-50% + ${Math.cos(ang) * d}px), calc(-50% + ${Math.sin(ang) * d + 40}px)) scale(.8)`, opacity: 0 }
      ], { duration: 900 + Math.random() * 400, easing: "cubic-bezier(.2,.7,.4,1)" });
      anim.onfinish = () => p.remove();
    }
  };

  let actx = null;
  PA.sound = kind => {
    if (!load().sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const notes = { ok: [660, 880, 1175], no: [330, 262], move: [440], goal: [523, 659, 784, 1047] }[kind] || [440];
      notes.forEach((f, i) => {
        const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + i * 0.09;
        o.type = kind === "no" ? "sine" : "triangle"; o.frequency.value = f;
        g.gain.setValueAtTime(kind === "move" ? 0.04 : 0.09, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + 0.2);
      });
    } catch (err) { /* không có âm thanh thì bỏ qua */ }
  };

  let bubbleTimer = null;
  PA.mascot = () => {
    let m = document.getElementById("mascot");
    if (m) return m;
    m = el("div"); m.id = "mascot";
    m.innerHTML = '<div class="bubble" role="status" hidden></div><button type="button" class="pony" aria-label="Bé Mã">' + PA.mascotSVG() + "</button>";
    document.body.appendChild(m);
    const lines = ["Tính hết biến rồi hãy chọn nhé!", "Nhìn nước chiếu trước, rồi đến nước ăn quân.", "Đối phương còn nước nào đáp không?", "Bạn đang làm rất tốt!"];
    m.querySelector(".pony").addEventListener("click", () => PA.say(lines[Math.floor(Math.random() * lines.length)], "happy"));
    return m;
  };
  PA.say = (text, mood) => {
    const m = PA.mascot(), b = m.querySelector(".bubble"), p = m.querySelector(".pony");
    b.textContent = text; b.hidden = false;
    p.classList.remove("happy", "sad"); void p.offsetWidth; if (mood) p.classList.add(mood);
    clearTimeout(bubbleTimer); bubbleTimer = setTimeout(() => { b.hidden = true; }, 3600);
  };

  /* ---------- Thanh trên: học viên, âm thanh, sáng/tối ---------- */
  PA.avatarOf = s => PA.avatarSVG(s.animal, s.color);
  PA.setupChrome = () => {
    const root = document.documentElement, theme = document.getElementById("theme-btn"), snd = document.getElementById("sound-btn");
    const eff = () => root.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const label = () => { theme.textContent = eff() === "dark" ? "☀️" : "🌙"; theme.setAttribute("aria-label", eff() === "dark" ? "Chế độ sáng" : "Chế độ tối"); };
    try { const t = localStorage.getItem("pamos-theme"); if (t) root.dataset.theme = t; } catch (err) {}
    label();
    theme.addEventListener("click", () => { const next = eff() === "dark" ? "light" : "dark"; root.dataset.theme = next; try { localStorage.setItem("pamos-theme", next); } catch (err) {} label(); });
    const sl = () => { const on = load().sound !== false; snd.textContent = on ? "🔊" : "🔇"; snd.setAttribute("aria-label", on ? "Tắt âm thanh" : "Bật âm thanh"); };
    sl();
    snd.addEventListener("click", () => { update(db => { db.sound = db.sound === false; }); sl(); PA.sound("ok"); });
    PA.refreshChip();
  };
  PA.refreshChip = () => {
    const chip = document.getElementById("who");
    if (!chip) return;
    const s = PA.me();
    if (!s) { chip.hidden = true; return; }
    chip.hidden = false;
    const n = PA.todayCount(s);
    chip.innerHTML = '<span class="ava">' + PA.avatarOf(s) + '</span><span class="who-txt"><b>' + esc(s.name) + "</b><small>" + (n >= s.goal ? "✅ Đủ mục tiêu" : "🎯 " + n + "/" + s.goal + " bài hôm nay") + "</small></span>";
  };
})();
