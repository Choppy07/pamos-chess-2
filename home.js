/* Trang chủ: chọn học viên, bản đồ buổi học, ôn lại, đánh giá, vương quốc cờ. */
(function () {
  "use strict";
  const PA = window.PA, el = PA.el, esc = PA.esc, LESSONS = window.PAMOS_LESSONS;
  const FILES = "abcdefgh";
  const app = document.getElementById("app"), tabbar = document.getElementById("tabbar");
  const BASE_TABS = [["hoc", "📚", "Học"], ["on", "🔁", "Ôn lại"], ["diem", "📊", "Đánh giá"], ["vuong-quoc", "🏰", "Vương quốc"]];
  const cloud = PA.cloud && PA.cloud.enabled ? PA.cloud : null;
  const tabs = () => (cloud && cloud.isTeacher ? BASE_TABS.concat([["lop", "👩‍🏫", "Lớp"]]) : BASE_TABS);

  function modal(title, build) {
    const back = el("div", "modal-back"), box = el("div", "modal");
    box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", title);
    const x = el("button", "modal-x", "✕"); x.type = "button"; x.setAttribute("aria-label", "Đóng");
    const close = () => { back.remove(); document.removeEventListener("keydown", onKey); };
    const onKey = e => { if (e.key === "Escape") close(); };
    x.addEventListener("click", close);
    back.addEventListener("click", e => { if (e.target === back) close(); });
    document.addEventListener("keydown", onKey);
    const heading = el("h2"); heading.textContent = title;
    box.appendChild(x); box.appendChild(heading);
    build(box, close);
    back.appendChild(box); document.body.appendChild(back);
    const first = box.querySelector("input, .pick, .pill"); if (first) first.focus();
  }

  /* ---------- Tạo / sửa học viên ---------- */
  function studentForm(existing) {
    modal(existing ? "✏️ Sửa hồ sơ" : "🐣 Thêm học viên", (box, close) => {
      const form = el("form", "stack");
      const state = { animal: existing ? existing.animal : "tho", color: existing ? existing.color : PA.COLORS[0], goal: existing ? existing.goal : 10 };
      const preview = el("div", "preview");
      const draw = () => { preview.innerHTML = PA.avatarSVG(state.animal, state.color); };
      draw(); form.appendChild(preview);
      const name = el("input", "field"); name.type = "text"; name.maxLength = 24; name.placeholder = "Ví dụ: Minh Anh"; name.required = true; name.value = existing ? existing.name : "";
      const nl = el("label", "lbl", "Tên của bạn"); nl.appendChild(name); form.appendChild(nl);
      const group = (title, values, key, render, cls) => {
        form.appendChild(el("span", "lbl", title));
        const g = el("div", cls); g.setAttribute("role", "group"); g.setAttribute("aria-label", title);
        values.forEach(v => {
          const b = el("button", "pick"); b.type = "button"; render(b, v);
          const val = v.id !== undefined ? v.id : v;
          b.setAttribute("aria-pressed", String(state[key] === val));
          b.addEventListener("click", () => { state[key] = val; g.querySelectorAll("button").forEach(y => y.setAttribute("aria-pressed", String(y === b))); draw(); });
          g.appendChild(b);
        });
        form.appendChild(g);
      };
      group("Chọn bạn đồng hành", PA.ANIMALS, "animal", (b, a) => { b.innerHTML = PA.avatarSVG(a.id, "#FFE8A3"); b.setAttribute("aria-label", a.name); b.title = a.name; }, "pick-animals");
      group("Màu yêu thích", PA.COLORS, "color", (b, c) => { b.style.background = c; b.setAttribute("aria-label", "Màu " + c); }, "pick-colors");
      group("Mục tiêu mỗi ngày", [5, 10, 15], "goal", (b, n) => { b.textContent = n + " bài"; }, "pick-goals");
      let pin = null;
      if (!existing && !cloud) {
        pin = el("input", "field"); pin.type = "text"; pin.inputMode = "numeric"; pin.maxLength = 4; pin.pattern = "\\d{4}"; pin.placeholder = "Để trống nếu không cần"; pin.autocomplete = "off";
        const pl = el("label", "lbl", "Mã 4 số (không bắt buộc)"); pl.appendChild(pin); form.appendChild(pl);
        form.appendChild(el("p", "src", "Mã chỉ để bạn bè dùng chung máy không bấm nhầm hồ sơ. Đây không phải mật khẩu bảo mật, đừng dùng mã ngân hàng hay mật khẩu thật."));
      }
      const ok = el("button", "pill primary big", existing ? "Lưu" : "Bắt đầu học 🚀"); ok.type = "submit"; form.appendChild(ok);
      form.addEventListener("submit", e => {
        e.preventDefault();
        if (!name.value.trim()) { name.focus(); return; }
        if (existing) PA.editStudent(existing.id, { name: name.value.trim().slice(0, 24), animal: state.animal, color: state.color, goal: state.goal });
        else if (cloud) cloud.createProfile({ name: name.value, animal: state.animal, color: state.color, goal: state.goal });
        else PA.addStudent({ name: name.value, animal: state.animal, color: state.color, goal: state.goal, pin: pin.value });
        close(); route();
        if (!existing) { PA.sound("goal"); PA.confetti(window.innerWidth / 2, window.innerHeight / 3, 30); PA.say("Chào " + PA.me().name + "! Mình là Bé Mã, học cùng nhau nhé!", "happy"); }
      });
      box.appendChild(form);
    });
  }

  function enter(s) {
    const go = () => { PA.login(s.id); location.hash = "#hoc"; route(); PA.say("Chào mừng " + s.name + " trở lại!", "happy"); };
    if (!s.pin) { go(); return; }
    modal("🔒 Mã của " + s.name, (box, close) => {
      const form = el("form", "stack");
      const inp = el("input", "field"); inp.type = "text"; inp.inputMode = "numeric"; inp.maxLength = 4; inp.autocomplete = "off"; inp.setAttribute("aria-label", "Mã 4 số");
      const err = el("p", "fb"); err.hidden = true;
      const ok = el("button", "pill primary", "Vào học"); ok.type = "submit";
      form.append(inp, err, ok);
      form.addEventListener("submit", e => { e.preventDefault(); if (PA.pinHash(s.id, inp.value) === s.pin) { close(); go(); } else { err.textContent = "Mã chưa đúng, thử lại nhé."; err.hidden = false; inp.value = ""; } });
      box.appendChild(form);
    });
  }

  function backupButtons(host) {
    const row = el("div", "ctl");
    const ex = el("button", "pill small", "⬇️ Lưu file sao lưu"); ex.type = "button"; ex.addEventListener("click", PA.exportData);
    const lab = el("label", "pill small", "⬆️ Khôi phục từ file");
    const inp = el("input"); inp.type = "file"; inp.accept = ".json,application/json"; inp.className = "sr-only";
    inp.addEventListener("change", () => {
      const f = inp.files[0]; if (!f) return;
      f.text().then(t => { const n = PA.importData(t); PA.toast(n ? "Đã khôi phục " + n + " hồ sơ." : "File không đúng định dạng sao lưu, hoặc là của khóa khác."); route(); });
    });
    lab.appendChild(inp); row.append(ex, lab); host.appendChild(row);
  }

  /* ---------- Màn chọn học viên ---------- */
  function viewProfiles() {
    tabbar.hidden = true;
    const students = Object.values(PA.db().students).sort((a, b) => a.created - b.created);
    app.innerHTML = '<header class="hello"><div class="hello-pony">' + PA.mascotSVG() + "</div><h1>" + PA.course.name + "</h1><p>" +
      (students.length ? "Ai đang học hôm nay nhỉ?" : "Chào bạn! Hãy tạo hồ sơ để Bé Mã lưu bài và chấm điểm cho bạn.") + "</p></header>";
    const grid = el("div", "profiles");
    students.forEach(s => {
      const b = el("button", "profile", '<span class="ava big">' + PA.avatarOf(s) + "</span><b>" + esc(s.name) + "</b><small>⭐ " + PA.totalStars(s) + (s.pin ? " · 🔒" : "") + "</small>");
      b.type = "button"; b.addEventListener("click", () => enter(s)); grid.appendChild(b);
    });
    const add = el("button", "profile add", '<span class="plus">＋</span><b>Thêm học viên</b>'); add.type = "button"; add.addEventListener("click", () => studentForm(null));
    grid.appendChild(add); app.appendChild(grid);
    const foot = el("div", "panel soft");
    foot.appendChild(el("p", "src", "Tiến độ được lưu trên trình duyệt của máy này. Đổi máy hoặc xóa dữ liệu trình duyệt sẽ mất, trừ khi bạn có file sao lưu."));
    backupButtons(foot); app.appendChild(foot);
  }

  /* ---------- Chế độ online ---------- */
  function hello(text) {
    tabbar.hidden = true;
    app.innerHTML = '<header class="hello"><div class="hello-pony">' + PA.mascotSVG() + "</div><h1>" + PA.course.name + "</h1><p></p></header>";
    app.querySelector(".hello p").textContent = text;
  }
  function field(label, type, autocomplete) {
    const wrap = el("label", "lbl", label), input = el("input", "field");
    input.type = type; input.autocomplete = autocomplete; input.required = true; wrap.appendChild(input);
    return { wrap, input };
  }
  function viewLogin() {
    hello("Đăng nhập để học tiếp trên bất kỳ máy nào.");
    const form = el("form", "panel login");
    const mail = field("Email", "email", "username"), pass = field("Mật khẩu", "password", "current-password");
    const err = el("p", "fb"); err.hidden = true; err.setAttribute("role", "alert");
    const ok = el("button", "pill primary big", "Đăng nhập 🚀"); ok.type = "submit";
    form.append(mail.wrap, pass.wrap, err, ok, el("p", "src", "Chưa có tài khoản hoặc quên mật khẩu? Hãy hỏi giáo viên của bạn."));
    form.addEventListener("submit", async e => {
      e.preventDefault(); ok.disabled = true; err.hidden = true;
      const msg = await cloud.signIn(mail.input.value, pass.input.value);
      ok.disabled = false;
      if (msg) { err.textContent = msg; err.hidden = false; pass.input.value = ""; }
    });
    app.appendChild(form);
  }
  function viewOnboard() {
    hello("Đăng nhập thành công. Giờ tạo hồ sơ của riêng bạn nhé!");
    const row = el("div", "ctl center");
    const make = el("button", "pill primary big", "🐣 Chọn avatar"); make.type = "button"; make.addEventListener("click", () => studentForm(null));
    const out = el("button", "pill", "Đăng xuất"); out.type = "button"; out.addEventListener("click", logout);
    row.append(make, out); app.appendChild(row);
    if (!document.querySelector(".modal")) studentForm(null);
  }
  function viewCloudProblem() {
    hello(cloud.problem || "Không kết nối được máy chủ.");
    const retry = el("button", "pill primary", "Thử lại"); retry.type = "button"; retry.addEventListener("click", () => location.reload());
    const row = el("div", "ctl center"); row.appendChild(retry); app.appendChild(row);
  }
  async function logout() {
    if (await cloud.signOut(false)) { location.hash = ""; return; }
    modal("Còn bài chưa lưu online", (box, close) => {
      box.appendChild(el("p", null, "Máy đang không gửi được bài lên máy chủ. Nếu đăng xuất bây giờ, bài vẫn nằm trên máy này và sẽ được gửi khi bạn đăng nhập lại trên chính máy này."));
      const stay = el("button", "pill primary", "Ở lại"), go = el("button", "pill", "Vẫn đăng xuất"); stay.type = go.type = "button";
      stay.addEventListener("click", close);
      go.addEventListener("click", async () => { close(); await cloud.signOut(true); location.hash = ""; });
      const row = el("div", "ctl"); row.append(stay, go); box.appendChild(row);
    });
  }
  function passwordForm() {
    modal("🔑 Đổi mật khẩu", (box, close) => {
      const form = el("form", "stack");
      const a = field("Mật khẩu mới (ít nhất 8 ký tự)", "password", "new-password"), b = field("Nhập lại mật khẩu mới", "password", "new-password");
      const err = el("p", "fb"); err.hidden = true; err.setAttribute("role", "alert");
      const ok = el("button", "pill primary", "Lưu mật khẩu"); ok.type = "submit";
      form.append(a.wrap, b.wrap, err, ok);
      form.addEventListener("submit", async e => {
        e.preventDefault();
        let msg = a.input.value.length < 8 ? "Mật khẩu cần ít nhất 8 ký tự." : a.input.value !== b.input.value ? "Hai lần nhập chưa giống nhau." : "";
        if (!msg) { ok.disabled = true; msg = await cloud.changePassword(a.input.value); ok.disabled = false; }
        if (msg) { err.textContent = msg; err.hidden = false; } else { close(); PA.toast("Đã đổi mật khẩu."); }
      });
      box.appendChild(form);
    });
  }
  function accountPanel() {
    const box = el("div", "panel soft");
    box.appendChild(el("h3", null, "🔐 Tài khoản"));
    const who = el("p", "src"); who.textContent = "Đang đăng nhập: " + ((cloud.user && cloud.user.email) || "");
    const pw = el("button", "pill small", "🔑 Đổi mật khẩu"); pw.type = "button"; pw.addEventListener("click", passwordForm);
    const ex = el("button", "pill small", "⬇️ Lưu file sao lưu"); ex.type = "button"; ex.addEventListener("click", PA.exportData);
    const out = el("button", "pill small", "🚪 Đăng xuất"); out.type = "button"; out.addEventListener("click", logout);
    const row = el("div", "ctl"); row.append(pw, ex, out); box.append(who, row);
    return box;
  }

  /* ---------- Giáo viên xem lớp ---------- */
  function summary(s) {
    const known = [];
    LESSONS.forEach(l => l.ids.forEach(id => { if (s.ans[id]) known.push(s.ans[id]); }));
    return { done: known.length, first: known.filter(a => a.first).length, wrong: known.filter(a => !a.last).length, total: LESSONS.reduce((n, l) => n + l.ids.length, 0) };
  }
  function lessonTable(list) {
    const w = el("div", "table-wrap"), t = el("table");
    t.innerHTML = "<thead><tr><th>Buổi</th><th>Đã làm</th><th>Đúng lần đầu</th><th>Xếp loại</th><th>Sao</th></tr></thead><tbody>" +
      list.map(x => "<tr><td>Buổi " + x.l.so + "</td><td>" + x.st.done + "/" + x.st.total + "</td><td>" + Math.round(x.st.firstPct * 100) + "%</td><td>" + (x.st.complete ? PA.grade(x.st.firstPct).name : "Đang học") + "</td><td>" + PA.starsHTML(x.st.stars) + "</td></tr>").join("") + "</tbody>";
    w.appendChild(t); return w;
  }
  function studentDetail(s) {
    modal("📋 " + s.name, (box) => {
      box.classList.add("wide-modal");
      const started = LESSONS.map(l => ({ l, st: PA.lessonStats(s, l) })).filter(x => x.st.done);
      if (!started.length) { box.appendChild(el("p", null, "Học viên chưa làm bài nào.")); return; }
      box.appendChild(lessonTable(started));
      const weak = PA.themeStats(s).filter(t => t.n >= 2 && t.ok / t.n < 0.6).slice(0, 4);
      box.appendChild(el("p", null, weak.length ? "💪 Chủ đề còn yếu: <b>" + weak.map(t => esc(t.name) + " (" + t.ok + "/" + t.n + ")").join(", ") + "</b>" : "Chưa thấy chủ đề nào yếu rõ rệt."));
      box.appendChild(el("p", "src", "Đang cần ôn lại " + summary(s).wrong + " câu."));
    });
  }
  function viewClass() {
    const box = el("section", "stack");
    const head = el("div", "ex-top"); head.appendChild(el("h2", null, "👩‍🏫 Lớp học"));
    const reload = el("button", "pill small", "↻ Làm mới"); reload.type = "button"; head.appendChild(reload);
    const body = el("div", "stack");
    box.append(head, body);
    const load = async () => {
      reload.disabled = true; body.innerHTML = "<p>Đang tải danh sách…</p>";
      try {
        await cloud.flush();
        const list = await cloud.listClass();
        body.innerHTML = "";
        if (!list.length) { body.appendChild(el("p", null, "Chưa có học viên nào tạo hồ sơ.")); return; }
        const w = el("div", "table-wrap panel"), t = el("table", "class-table");
        t.innerHTML = "<thead><tr><th>Học viên</th><th>Bài</th><th>Đúng lần đầu</th><th>Sao</th><th>🔥</th><th>Hôm nay</th><th>Cập nhật</th></tr></thead>";
        const tb = el("tbody");
        list.forEach(s => {
          const m = summary(s), tr = el("tr");
          const when = s.updatedAt ? new Date(s.updatedAt) : null;
          tr.innerHTML = "<td></td><td>" + m.done + "/" + m.total + "</td><td>" + (m.done ? Math.round(m.first / m.done * 100) + "%" : "–") + "</td><td>⭐ " + PA.totalStars(s) + "</td><td>" + PA.streak(s) + "</td><td>" + PA.todayCount(s) + "/" + s.goal + "</td><td>" + (when && !isNaN(when) ? esc(when.toLocaleDateString("vi-VN")) : "–") + "</td>";
          const b = el("button", "student", '<span class="ava">' + PA.avatarOf(s) + "</span><b>" + esc(s.name) + (s.mine ? " (bạn)" : "") + "</b>"); b.type = "button";
          b.addEventListener("click", () => studentDetail(s));
          tr.firstElementChild.appendChild(b); tb.appendChild(tr);
        });
        t.appendChild(tb); w.appendChild(t); body.appendChild(w);
        body.appendChild(el("p", "src", "Bấm vào tên để xem chi tiết. Điểm do trình duyệt của học viên gửi lên, nên chỉ dùng để theo dõi việc học, không dùng cho thi cử."));
      } catch (err) {
        body.innerHTML = ""; const p = el("p", "fb"); p.textContent = "Không tải được danh sách: " + ((err && err.message) || err); body.appendChild(p);
      } finally { reload.disabled = false; }
    };
    reload.addEventListener("click", load); load();
    return box;
  }

  /* ---------- Bàn cờ nhỏ trên thẻ buổi học ---------- */
  function miniBoard(m) {
    const xy = sq => [FILES.indexOf(sq[0]), 8 - Number(sq[1])];
    let s = '<svg class="mini" viewBox="0 0 80 80" aria-hidden="true">';
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) s += '<rect x="' + c * 10 + '" y="' + r * 10 + '" width="10" height="10" class="' + ((c + (7 - r)) % 2 === 0 ? "sd" : "sl") + '"/>';
    (m.dots || []).forEach(d => { const [c, r] = xy(d); s += '<circle class="dot" cx="' + (c * 10 + 5) + '" cy="' + (r * 10 + 5) + '" r="1.9"/>'; });
    (m.arrows || []).forEach(([a, b]) => { const [c1, r1] = xy(a), [c2, r2] = xy(b); s += '<line class="arrow" x1="' + (c1 * 10 + 5) + '" y1="' + (r1 * 10 + 5) + '" x2="' + (c2 * 10 + 5) + '" y2="' + (r2 * 10 + 5) + '"/>'; });
    Object.entries(m.pieces || {}).forEach(([sq, p]) => { const [c, r] = xy(sq); s += PA.pieceSVG(p).replace("<svg ", '<svg x="' + c * 10 + '" y="' + r * 10 + '" width="10" height="10" '); });
    return s + "</svg>";
  }

  function greeting(s) {
    const today = PA.todayCount(s), pct = Math.min(1, today / s.goal);
    const card = el("section", "greet");
    card.innerHTML = '<button type="button" class="ava big" aria-label="Sửa hồ sơ">' + PA.avatarOf(s) + "</button>" +
      '<div class="greet-txt"><h1>Chào ' + esc(s.name) + "!</h1><div class='stats'><span>⭐ <b>" + PA.totalStars(s) + "</b> sao</span><span>🔥 <b>" + PA.streak(s) + "</b> ngày liền</span></div>" +
      '<div class="meter" role="img" aria-label="Mục tiêu hôm nay ' + today + " trên " + s.goal + '"><i style="width:' + pct * 100 + '%"></i></div><small>' +
      (today >= s.goal ? "✅ Bạn đã đạt mục tiêu hôm nay (" + today + " bài)" : "🎯 Hôm nay: " + today + " / " + s.goal + " bài") + "</small></div>";
    card.querySelector(".ava").addEventListener("click", () => studentForm(s));
    return card;
  }

  function viewLearn(s) {
    let nextFound = false;
    const list = el("div", "path");
    LESSONS.forEach(l => {
      const st = PA.lessonStats(s, l);
      const isNext = !nextFound && !st.complete; if (isNext) nextFound = true;
      const card = el("a", "card" + (st.complete ? " done" : "") + (isNext ? " next" : ""));
      card.href = l.file;
      card.innerHTML = miniBoard(l.mini) + '<div class="card-body"><div class="meta"><span class="no">Buổi ' + l.so + "</span><span>" + l.ids.length + " bài tập</span>" +
        (isNext ? '<span class="flag">Học tiếp ở đây</span>' : "") + "</div><h3>" + esc(l.tieuDe) + "</h3><p>" + esc(l.tomTat) + "</p>" +
        '<div class="chips">' + l.tuKhoa.map(k => '<span class="chip">' + esc(k) + "</span>").join("") + "</div>" +
        '<div class="prog"><div class="meter"><i style="width:' + (st.total ? st.done / st.total * 100 : 0) + '%"></i></div><span>' + st.done + "/" + st.total + "</span>" + PA.starsHTML(st.stars) + "</div></div>";
      list.appendChild(card);
    });
    return list;
  }

  function viewReview(s) {
    const box = el("section", "stack");
    const items = Object.entries(s.ans).filter(([, a]) => !a.last).sort((a, b) => b[1].t - a[1].t);
    box.appendChild(el("h2", null, "🔁 Câu cần ôn lại (" + items.length + ")"));
    if (!items.length) { box.appendChild(el("div", "panel soft", "<p>🌈 Chưa có câu nào cần ôn. Làm thêm bài trong mục <b>Học</b> nhé!</p>")); return box; }
    box.appendChild(el("p", null, "Bấm vào một câu để làm lại. Làm đúng thì câu đó rời khỏi danh sách."));
    items.forEach(([id, a]) => {
      const l = LESSONS.find(x => x.so === a.so);
      if (!l || !l.ids.includes(id)) return;
      const link = el("a", "review", "<b>Buổi " + l.so + " · " + esc(a.label) + "</b><span>" + esc(a.q) + "</span>");
      link.href = l.file + "#q-" + id; box.appendChild(link);
    });
    return box;
  }

  function viewReport(s) {
    const box = el("section", "stack");
    const all = Object.values(s.ans), n = all.length, first = all.filter(a => a.first).length;
    box.appendChild(el("h2", null, "📊 Đánh giá của " + esc(s.name)));
    const total = LESSONS.reduce((a, l) => a + l.ids.length, 0);
    const done = LESSONS.filter(l => PA.lessonStats(s, l).complete).length;
    box.appendChild(el("div", "tiles", [["Bài đã làm", n + "/" + total], ["Đúng lần đầu", n ? Math.round(first / n * 100) + "%" : "–"], ["Buổi hoàn thành", done + "/" + LESSONS.length], ["Tổng số sao", "⭐ " + PA.totalStars(s)]].map(t => "<div class='tile'><b>" + t[1] + "</b><span>" + t[0] + "</span></div>").join("")));
    if (n >= 5) { const g = PA.grade(first / n); box.appendChild(el("div", "panel soft", "<p class='grade'>" + g.icon + " Xếp loại chung: <b>" + g.name + "</b></p><p>" + g.tip + "</p>" + (n < 20 ? "<p class='src'>Mới có " + n + " bài nên xếp loại còn dễ thay đổi.</p>" : ""))); }
    else box.appendChild(el("div", "panel soft", "<p>Làm ít nhất 5 bài để Bé Mã xếp loại cho bạn.</p>"));

    const themes = PA.themeStats(s).filter(t => t.n >= 2);
    if (themes.length) {
      const p = el("div", "panel"); p.appendChild(el("h3", null, "Chủ đề chiến thuật (tỉ lệ đúng lần đầu)"));
      themes.slice(0, 10).forEach(t => p.appendChild(el("div", "bar-row", "<span>" + esc(t.name) + "</span><div class='meter" + (t.ok / t.n < 0.6 ? " low" : "") + "'><i style='width:" + t.ok / t.n * 100 + "%'></i></div><small>" + t.ok + "/" + t.n + "</small>")));
      const weak = themes.filter(t => t.ok / t.n < 0.6).slice(0, 3).map(t => t.name);
      if (weak.length) p.appendChild(el("p", null, "💪 Nên luyện thêm: <b>" + weak.map(esc).join(", ") + "</b>."));
      box.appendChild(p);
    }

    const started = LESSONS.map(l => ({ l, st: PA.lessonStats(s, l) })).filter(x => x.st.done);
    if (started.length) {
      const w = el("div", "table-wrap panel"), t = el("table");
      t.innerHTML = "<thead><tr><th>Buổi</th><th>Đã làm</th><th>Đúng lần đầu</th><th>Xếp loại</th><th>Sao</th></tr></thead><tbody>" +
        started.map(x => "<tr><td><a href='" + x.l.file + "'>Buổi " + x.l.so + "</a></td><td>" + x.st.done + "/" + x.st.total + "</td><td>" + Math.round(x.st.firstPct * 100) + "%</td><td>" + (x.st.complete ? PA.grade(x.st.firstPct).name : "Đang học") + "</td><td>" + PA.starsHTML(x.st.stars) + "</td></tr>").join("") + "</tbody>";
      w.appendChild(t); box.appendChild(w);
    }
    if (s.drill) box.appendChild(el("p", null, "🎯 Luyện tọa độ tốt nhất: <b>" + Number(s.drill.right) + "/" + Number(s.drill.total) + "</b> trong " + Number(s.drill.secs) + " giây."));

    if (cloud) { box.appendChild(accountPanel()); return box; }

    const manage = el("div", "panel soft"); manage.appendChild(el("h3", null, "👪 Giáo viên / phụ huynh"));
    backupButtons(manage);
    const del = el("button", "pill small danger", "🗑 Xóa hồ sơ này"); del.type = "button";
    del.addEventListener("click", () => {
      modal("Xóa hồ sơ " + s.name + "?", (m, close) => {
        m.appendChild(el("p", null, "Toàn bộ bài làm và sao của hồ sơ này trên máy sẽ mất, không lấy lại được nếu không có file sao lưu."));
        const yes = el("button", "pill danger", "Xóa hẳn"), no = el("button", "pill", "Giữ lại"); yes.type = no.type = "button";
        yes.addEventListener("click", () => { PA.removeStudent(s.id); close(); location.hash = ""; route(); });
        no.addEventListener("click", close);
        const row = el("div", "ctl"); row.append(no, yes); m.appendChild(row);
      });
    });
    manage.appendChild(del); box.appendChild(manage);
    return box;
  }

  function viewKingdom(s) {
    const stars = PA.totalStars(s), box = el("section", "stack wide");
    box.appendChild(el("h2", null, "🏰 Vương quốc của " + esc(s.name)));
    const next = PA.KINGDOM.find(k => stars < k.need);
    box.appendChild(el("p", null, "Mỗi buổi học xong được tối đa 3 sao. Bạn đang có <b>⭐ " + stars + "</b>." + (next ? " Thêm <b>" + (next.need - stars) + " sao</b> nữa để mở <b>" + next.name + "</b>." : " Bạn đã mở toàn bộ vương quốc! 👑")));
    const scene = el("div", "scene", PA.kingdomSVG(stars, s));
    scene.addEventListener("click", e => {
      const t = e.target.closest(".thing"); if (!t) return;
      t.classList.remove("boing"); void t.getBoundingClientRect(); t.classList.add("boing");
      PA.sound("ok"); PA.say(t.getAttribute("aria-label") + " ✨", "happy");
    });
    box.appendChild(scene);
    box.appendChild(el("div", "unlocks", PA.KINGDOM.map(k => "<span class='" + (stars >= k.need ? "got" : "") + "'>" + (stars >= k.need ? "✅ " : "🔒 ") + k.name + " <small>" + k.need + "⭐</small></span>").join("")));
    return box;
  }

  function route() {
    const s = PA.me();
    PA.refreshChip();
    const switcher = document.getElementById("switch-btn"); switcher.hidden = !s;
    if (cloud) {
      cloud.paintSync();
      if (cloud.state === "loading" && !s) { switcher.hidden = true; hello("Đang kết nối…"); return; }
      if (cloud.state === "needProfile") { switcher.hidden = true; viewOnboard(); return; }
      if (cloud.state === "error" && !s) { switcher.hidden = true; viewCloudProblem(); return; }
      if (!s || cloud.state === "signedOut") { switcher.hidden = true; viewLogin(); return; }
    } else if (!s) { viewProfiles(); return; }
    const TABS = tabs();
    let tab = location.hash.slice(1); if (!TABS.some(t => t[0] === tab)) tab = "hoc";
    app.innerHTML = "";
    if (tab === "hoc") app.appendChild(greeting(s));
    app.appendChild({ hoc: viewLearn, on: viewReview, diem: viewReport, "vuong-quoc": viewKingdom, lop: viewClass }[tab](s));
    const wrong = Object.values(s.ans).filter(a => !a.last).length;
    tabbar.hidden = false;
    tabbar.innerHTML = TABS.map(t => "<a href='#" + t[0] + "' class='" + (t[0] === tab ? "on" : "") + "'" + (t[0] === tab ? " aria-current='page'" : "") + "><i>" + t[1] + "</i>" + t[2] + (t[0] === "on" && wrong ? "<em>" + wrong + "</em>" : "") + "</a>").join("");
  }

  PA.setupChrome();
  PA.mascot();
  const switchBtn = document.getElementById("switch-btn");
  if (cloud) { switchBtn.textContent = "🚪"; switchBtn.title = "Đăng xuất"; switchBtn.setAttribute("aria-label", "Đăng xuất"); }
  switchBtn.addEventListener("click", () => { if (cloud) { logout(); return; } PA.logout(); location.hash = ""; route(); });
  window.addEventListener("pamos:cloud", () => { if (cloud.state === "signedOut") document.querySelectorAll(".modal-back").forEach(m => m.remove()); route(); });
  window.addEventListener("hashchange", () => { route(); window.scrollTo(0, 0); });
  window.addEventListener("pageshow", e => { if (e.persisted) route(); });
  route();
})();
