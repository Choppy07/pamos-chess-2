/* Trang bài học: bàn cờ có animation, bài tập có lưu và đánh giá. */
(function () {
  "use strict";
  const PA = window.PA, el = PA.el, esc = PA.esc;
  const FILES = "abcdefgh";
  const HAS_CHESS = typeof Chess === "function";
  const SLIDE = 650;

  /* ---------- Bàn cờ ---------- */
  function makeBoard(host) {
    host.textContent = "";
    host.setAttribute("aria-hidden", "true");
    const map = {};
    for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
      const c = col, r = 7 - row, name = FILES[c] + (r + 1);
      const b = el("button");
      b.type = "button"; b.tabIndex = -1;
      b.className = "sq " + ((c + r) % 2 === 0 ? "d" : "l");
      let h = "";
      if (col === 0) h += '<span class="lab lr">' + (r + 1) + "</span>";
      if (row === 7) h += '<span class="lab lf">' + FILES[c] + "</span>";
      b.innerHTML = h + '<span class="pc"></span>';
      host.appendChild(b);
      map[name] = b;
    }
    return map;
  }
  function put(sq, code) {
    const p = sq.querySelector(".pc");
    if ((p.dataset.code || "") === (code || "")) return;
    p.dataset.code = code || "";
    p.innerHTML = code ? PA.pieceSVG(code) : "";
    p.style.animationDelay = code ? (-Math.random() * 6).toFixed(2) + "s" : "";
    p.className = "pc" + (code ? " on " + (code === code.toUpperCase() ? "w" : "b") : "");
  }
  PA.makeBoard = makeBoard; PA.put = put;
  function codeBoard(g) {
    const m = {};
    g.board().forEach((row, ri) => row.forEach((p, ci) => { if (p) m[FILES[ci] + (8 - ri)] = p.color === "w" ? p.type.toUpperCase() : p.type; }));
    return m;
  }
  function paint(sqs, pos, last) {
    Object.keys(sqs).forEach(n => {
      put(sqs[n], pos[n] || null);
      sqs[n].classList.toggle("last", !!last && (n === last.from || n === last.to));
    });
  }
  function fenBoard(fen) {
    const m = {};
    fen.split(" ")[0].split("/").forEach((row, ri) => { let c = 0; for (const ch of row) { if (/\d/.test(ch)) c += +ch; else { m[FILES[c] + (8 - ri)] = ch; c++; } } });
    return m;
  }
  const fenTurn = fen => (fen.split(" ")[1] === "b" ? "b" : "w");

  /* Vẽ thế mới rồi cho quân trượt từ ô cũ sang ô mới. */
  function slide(sqs, from, to) {
    const p = sqs[to].querySelector(".pc");
    if (PA.calm() || !p.animate) return;
    const a = sqs[from].getBoundingClientRect(), b = sqs[to].getBoundingClientRect();
    if (!a.width) return;
    const dx = a.left - b.left, dy = a.top - b.top;
    sqs[to].classList.add("moving");
    const anim = p.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(1)` },
      { transform: `translate(${dx / 2}px, ${dy / 2 - b.height * 0.35}px) scale(1.18) rotate(${dx > 0 ? -8 : 8}deg)`, offset: 0.5 },
      { transform: "translate(0,0) scale(1.08, .9)", offset: 0.88 },
      { transform: "translate(0,0) scale(1)" }
    ], { duration: SLIDE, easing: "ease-in-out" });
    anim.onfinish = anim.oncancel = () => sqs[to].classList.remove("moving");
  }
  function puff(sq) {
    if (PA.calm()) return;
    const s = el("span", "puff", "💥");
    sq.appendChild(s); setTimeout(() => s.remove(), 700);
  }
  function paintMove(sqs, pos, mv) {
    const captured = mv.flags && /[ce]/.test(mv.flags);
    paint(sqs, pos, mv);
    slide(sqs, mv.from, mv.to);
    if (mv.flags && /[kq]/.test(mv.flags)) {
      const rank = mv.to[1], short = mv.to[0] === "g";
      slide(sqs, (short ? "h" : "a") + rank, (short ? "f" : "d") + rank);
    }
    if (captured) setTimeout(() => puff(sqs[mv.to]), SLIDE * 0.75);
    PA.sound("move");
  }
  const noLib = () => el("p", "tip", "Không tải được thư viện cờ vua. Hãy kiểm tra kết nối mạng rồi tải lại trang.");
  const shuffled = n => { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* Chạy fn một lần khi phần tử xuất hiện trên màn hình. */
  function whenSeen(node, fn) {
    if (!("IntersectionObserver" in window)) return;
    const ob = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { ob.disconnect(); fn(); } }, { threshold: 0.6 });
    ob.observe(node);
  }

  function mkDiagram(b) {
    const fig = el("figure", "diagram");
    const boardEl = el("div", "board static"); fig.appendChild(boardEl);
    const sqs = makeBoard(boardEl), pos = fenBoard(b.fen), marks = b.marks || [];
    Object.keys(sqs).forEach(n => { put(sqs[n], pos[n] || null); sqs[n].classList.toggle("last", marks.includes(n)); });
    if (b.caption) fig.appendChild(el("figcaption", "src", b.caption));
    return fig;
  }

  /* ---------- Ván mẫu ---------- */
  function mkReplay(b) {
    if (!HAS_CHESS) return noLib();
    const g = b.fen ? new Chess(b.fen) : new Chess(), startFen = g.fen(), poss = [codeBoard(g)], hist = [null];
    b.moves.forEach(san => { const m = g.move(san); if (!m) return; poss.push(codeBoard(g)); hist.push(m); });
    const N = poss.length - 1;
    const panel = el("div", "panel");
    panel.appendChild(el("h3", null, b.title));
    const boardEl = el("div", "board static"); panel.appendChild(boardEl);
    const sqs = makeBoard(boardEl);
    const ctl = el("div", "ctl"); ctl.setAttribute("role", "group"); ctl.setAttribute("aria-label", "Điều khiển ván mẫu");
    const mk = (label, fn) => { const x = el("button", "pill", label); x.type = "button"; x.addEventListener("click", fn); ctl.appendChild(x); return x; };
    let idx = 0, timer = null;
    const stop = () => { clearInterval(timer); timer = null; bPlay.textContent = "▶ Tự chạy"; };
    const bFirst = mk("⏮", () => { stop(); go(0); }), bPrev = mk("◀ Lùi", () => { stop(); go(idx - 1); }), bNext = mk("Tiến ▶", () => { stop(); go(idx + 1); });
    const bPlay = mk("▶ Tự chạy", () => {
      if (timer) { stop(); return; }
      if (idx === N) go(0);
      bPlay.textContent = "⏸ Dừng";
      timer = setInterval(() => { go(idx + 1); if (idx >= N) stop(); }, 1300);
    });
    bFirst.setAttribute("aria-label", "Về đầu"); bNext.classList.add("primary");
    panel.appendChild(ctl);
    const cmt = el("p", "cmt"); cmt.setAttribute("aria-live", "polite"); panel.appendChild(cmt);
    const list = el("div", "moves"); list.setAttribute("role", "group"); list.setAttribute("aria-label", "Danh sách nước đi");
    const blackFirst = fenTurn(startFen) === "b", startNo = Number(startFen.split(" ")[5]) || 1;
    const chips = hist.slice(1).map((h, i) => {
      const ply = i + 1, x = el("button", "mv"), off = i + (blackFirst ? 1 : 0), no = startNo + Math.floor(off / 2);
      x.type = "button";
      x.innerHTML = (off % 2 === 0 ? '<span class="n">' + no + ".</span>" : (i === 0 ? '<span class="n">' + no + "...</span>" : "")) + h.san;
      x.addEventListener("click", () => { stop(); go(ply); });
      list.appendChild(x);
      return x;
    });
    panel.appendChild(list);
    function go(i) {
      const prev = idx;
      idx = Math.max(0, Math.min(N, i));
      if (idx === prev + 1) paintMove(sqs, poss[idx], hist[idx]); else paint(sqs, poss[idx], hist[idx]);
      cmt.textContent = idx === 0 ? (b.intro || "Thế cờ ban đầu.") : ((b.notes && b.notes[idx]) || "");
      chips.forEach((c, k) => c.setAttribute("aria-current", String(k + 1 === idx)));
      bFirst.disabled = bPrev.disabled = idx === 0;
      bNext.disabled = idx === N;
    }
    panel.addEventListener("keydown", e => {
      if (e.key === "ArrowRight") { stop(); go(idx + 1); e.preventDefault(); }
      else if (e.key === "ArrowLeft") { stop(); go(idx - 1); e.preventDefault(); }
    });
    go(0);
    return panel;
  }

  /* ---------- Lưu kết quả và phản hồi ---------- */
  let evaluate = () => {};
  const themesOf = text => { const m = /Chủ đề: ([^.]+)\./.exec(text || ""); return m ? m[1].split(",").map(s => s.trim()).filter(Boolean) : []; };
  function savedBadge(id) {
    const b = el("span", "saved");
    b.refresh = () => {
      const s = PA.me(), a = s && s.ans[id];
      b.hidden = !a;
      if (a) { b.textContent = a.last ? (a.first ? "✅ Đúng ngay lần đầu" : "✅ Đã sửa đúng") : "🔁 Cần ôn lại"; b.className = "saved " + (a.last ? "good" : "bad"); }
    };
    b.refresh();
    return b;
  }
  function react(ok, card, btn, meta, id, badge) {
    const res = PA.record(id, ok, meta);
    badge.refresh(); PA.refreshChip(); evaluate();
    PA.sound(ok ? "ok" : "no");
    if (ok) {
      const r = btn.getBoundingClientRect();
      PA.confetti(r.left + r.width / 2, r.top + r.height / 2);
      PA.say(["Giỏi quá! 🎉", "Chính xác! ⭐", "Tính hay lắm!", "Đúng rồi, tiếp nào!"][Math.floor(Math.random() * 4)], "happy");
    } else {
      card.classList.remove("shake"); void card.offsetWidth; card.classList.add("shake");
      PA.say(card.dataset.anim ? "Chưa đúng. Xem quân đi để hiểu đáp án nhé!" : "Chưa đúng. Đọc lời giải bên dưới nhé!", "sad");
    }
    if (res && res.goalReached) setTimeout(() => {
      PA.sound("goal"); PA.confetti(window.innerWidth / 2, window.innerHeight / 3, 34);
      PA.say("Bạn đã đạt mục tiêu " + res.goal + " bài hôm nay! 🏆", "happy"); PA.toast("🎯 Hoàn thành mục tiêu hôm nay!");
    }, 1500);
    if (!res && !react.warned) { react.warned = true; PA.toast(PA.cloud && PA.cloud.enabled ? "Chưa đăng nhập nên bài làm không được lưu." : "Chưa chọn học viên nên bài làm không được lưu."); }
  }

  /* ---------- Bài tập chọn nước đi ---------- */
  function mkPositions(b, so) {
    const box = el("div", "stack");
    b.items.forEach((it, ix) => {
      const isText = !!it.text;
      if (!isText && !HAS_CHESS) { box.appendChild(noLib()); return; }
      const g = isText ? null : new Chess(it.fen);
      if (g) (it.moves || []).forEach(s => g.move(s));
      const turn = g ? g.turn() : fenTurn(it.fen);
      const hist = g ? g.history({ verbose: true }) : [];
      const last = hist.slice(-1)[0] || null;
      const nowPos = g ? codeBoard(g) : fenBoard(it.fen);
      let prevPos = null;
      if (last) { g.undo(); prevPos = codeBoard(g); g.move(last.san); }

      const card = el("div", "panel exercise"); card.id = "q-" + it.id;
      if (g) card.dataset.anim = "1";
      const label = "Thế cờ " + (ix + 1);
      const badge = savedBadge(it.id);
      const top = el("div", "ex-top");
      top.appendChild(el("span", "pos-head", label + " · " + (turn === "w" ? "⚪ Trắng đi" : "⚫ Đen đi")));
      top.appendChild(badge); card.appendChild(top);
      const boardEl = el("div", "board static"); card.appendChild(boardEl);
      const sqs = makeBoard(boardEl);
      paint(sqs, nowPos, last);
      let answered = false, timer = null;
      const showLast = () => {
        if (!prevPos) return;
        clearTimeout(timer); paint(sqs, prevPos, null);
        timer = setTimeout(() => paintMove(sqs, nowPos, last), 550);
      };
      const tools = el("div", "ctl");
      const again = el("button", "pill small", "↻ Xem nước đối phương vừa đi"); again.type = "button";
      const retry = el("button", "pill small", "🔁 Làm lại"); retry.type = "button"; retry.hidden = true;
      if (prevPos) { tools.appendChild(again); again.addEventListener("click", () => { if (!answered) showLast(); }); whenSeen(boardEl, () => { if (!answered) showLast(); }); }
      tools.appendChild(retry); card.appendChild(tools);
      if (isText && it.marks) it.marks.forEach(n => sqs[n].classList.add("last"));
      card.appendChild(el("p", null, "<strong>" + it.q + "</strong>"));
      const opts = el("div", "opts");
      const fb = el("p", "fb"); fb.hidden = true; fb.setAttribute("aria-live", "polite");
      const renderOpts = () => {
        opts.textContent = "";
        shuffled(it.o.length).forEach(oi => {
          const san = it.o[oi];
          const x = el("button", isText ? "opt" : "opt san"); x.type = "button"; x.textContent = san; x.dataset.i = String(oi);
          x.addEventListener("click", () => {
            answered = true; clearTimeout(timer);
            opts.querySelectorAll("button").forEach(y => { y.disabled = true; if (Number(y.dataset.i) === it.a) y.classList.add("right"); });
            const ok = oi === it.a;
            if (!ok) x.classList.add("wrong");
            react(ok, card, x, { so, label, q: it.q.slice(0, 120), themes: themesOf(it.e) }, it.id, badge);
            if (g) {
              paint(sqs, nowPos, last);
              const answer = () => { const m = g.move(it.o[it.a]); if (m) { paintMove(sqs, codeBoard(g), m); g.undo(); } };
              if (ok) answer(); else timer = setTimeout(answer, 900);
            }
            fb.textContent = (ok ? "Đúng. " : "Chưa đúng. Đáp án là " + it.o[it.a] + ". ") + it.e;
            fb.hidden = false; retry.hidden = false;
          });
          opts.appendChild(x);
        });
      };
      retry.addEventListener("click", () => { answered = false; clearTimeout(timer); paint(sqs, nowPos, last); fb.hidden = true; retry.hidden = true; renderOpts(); showLast(); });
      renderOpts();
      card.appendChild(opts); card.appendChild(fb);
      box.appendChild(card);
    });
    return box;
  }

  /* ---------- Quiz ---------- */
  function mkQuiz(b, so) {
    const wrap = el("div", "stack");
    const box = el("div", "stack"), score = el("div", "score");
    const prog = el("span"), reset = el("button", "pill", "🔁 Làm lại quiz");
    prog.setAttribute("aria-live", "polite"); reset.type = "button"; reset.hidden = true;
    score.appendChild(prog); score.appendChild(reset);
    wrap.appendChild(box); wrap.appendChild(score);
    const items = b.items;
    let done, right;
    function render() {
      done = 0; right = 0; reset.hidden = true; prog.textContent = "Đã trả lời 0 / " + items.length;
      box.textContent = "";
      items.forEach((item, qi) => {
        const f = el("fieldset", "q exercise"); f.id = "q-" + item.id;
        const label = "Câu " + (qi + 1);
        const lg = el("legend"); lg.textContent = label + ". " + item.q; f.appendChild(lg);
        const badge = savedBadge(item.id); f.appendChild(badge);
        let sqs = null, gq = null;
        if (item.fen) {
          const bd = el("div", "board static"); f.appendChild(bd);
          sqs = makeBoard(bd);
          let lastMv = null, posn;
          if (HAS_CHESS) {
            gq = new Chess(item.fen); (item.moves || []).forEach(sn => gq.move(sn));
            if (gq.move(item.o[item.a])) { f.dataset.anim = "1"; gq.undo(); }
            const hq = gq.history({ verbose: true }); lastMv = hq.length ? hq[hq.length - 1] : null; posn = codeBoard(gq);
          } else posn = fenBoard(item.fen);
          paint(sqs, posn, lastMv);
        }
        const opts = el("div", "opts");
        const fb = el("p", "fb"); fb.hidden = true; fb.setAttribute("aria-live", "polite");
        shuffled(item.o.length).forEach(oi => {
          const x = el("button", "opt"); x.type = "button"; x.textContent = item.o[oi]; x.dataset.i = String(oi);
          x.addEventListener("click", () => {
            opts.querySelectorAll("button").forEach(y => { y.disabled = true; if (Number(y.dataset.i) === item.a) y.classList.add("right"); });
            const ok = oi === item.a;
            if (ok) right++; else x.classList.add("wrong");
            done++;
            prog.textContent = done < items.length ? "Đã trả lời " + done + " / " + items.length : "Kết quả lượt này: " + right + " / " + items.length + " câu đúng";
            if (done === items.length) reset.hidden = false;
            react(ok, f, x, { so, label: "Quiz " + label.toLowerCase(), q: item.q.slice(0, 120), themes: themesOf(item.e) }, item.id, badge);
            if (gq) { const m = gq.move(item.o[item.a]); if (m) { const after = codeBoard(gq); gq.undo(); setTimeout(() => paintMove(sqs, after, m), ok ? 0 : 900); } }
            fb.textContent = (ok ? "Đúng. " : "Chưa đúng. ") + item.e; fb.hidden = false;
          });
          opts.appendChild(x);
        });
        f.appendChild(opts); f.appendChild(fb); box.appendChild(f);
      });
    }
    reset.addEventListener("click", () => { render(); wrap.closest("section").scrollIntoView(); });
    render();
    return wrap;
  }
  PA.mkQuiz = mkQuiz;

  /* ---------- Bảng đánh giá cuối buổi ---------- */
  function mkEvaluation(so) {
    const info = (window.PAMOS_LESSONS || []).find(l => l.so === so);
    const sec = el("section", "key result"); sec.id = "danh-gia";
    let wasComplete = null;
    const draw = quiet => {
      if (quiet) wasComplete = null;
      const s = PA.me();
      if (!s) { sec.innerHTML = '<h2>📊 Đánh giá</h2><p>Hãy <a href="index.html">' + (PA.cloud && PA.cloud.enabled ? "đăng nhập" : "chọn học viên") + "</a> để lưu bài và được đánh giá.</p>"; return; }
      const st = PA.lessonStats(s, info);
      const grade = PA.grade(st.firstPct);
      const wrong = info.ids.filter(id => s.ans[id] && !s.ans[id].last);
      sec.innerHTML = "<h2>📊 Đánh giá buổi " + so + "</h2>" +
        '<div class="meter" role="img" aria-label="Đã làm ' + st.done + " trên " + st.total + ' bài"><i style="width:' + (st.total ? st.done / st.total * 100 : 0) + '%"></i></div>' +
        "<p>Đã làm <b>" + st.done + " / " + st.total + "</b> bài. Đúng ngay lần đầu <b>" + st.first + "</b>, hiện đang đúng <b>" + st.last + "</b>.</p>" +
        (st.complete
          ? '<div class="verdict">' + PA.starsHTML(st.stars) + '<div><b class="grade">' + grade.icon + " " + grade.name + " · " + Math.round(st.firstPct * 100) + "% đúng lần đầu</b><p>" + grade.tip + "</p></div></div>"
          : '<p class="src">Làm hết bài để nhận sao và xếp loại.' + (st.done ? " Tạm tính: " + Math.round(st.firstPct * 100) + "% đúng lần đầu." : "") + "</p>") +
        (wrong.length ? "<p><b>Cần ôn lại:</b></p><div class='chips'>" + wrong.map(id => '<a class="chip warn" href="#q-' + id + '">' + esc(s.ans[id].label) + "</a>").join("") + "</div>" : "");
      if (wasComplete === false && st.complete) setTimeout(() => {
        PA.sound("goal"); PA.confetti(window.innerWidth / 2, window.innerHeight / 3, 40);
        PA.toast("Xong buổi " + so + ": " + st.stars + " sao. Xem đánh giá ở cuối bài.");
      }, 1200);
      wasComplete = st.complete;
    };
    evaluate = draw; draw();
    return sec;
  }
  PA.mkEvaluation = mkEvaluation;

  function mkBlock(b, so) {
    switch (b.t) {
      case "p": return el("p", null, b.html);
      case "tip": return el("p", "tip", b.html);
      case "h3": return el("h3", null, b.text);
      case "ul": { const u = el("ul"); b.items.forEach(i => u.appendChild(el("li", null, i))); return u; }
      case "table": {
        const w = el("div", "table-wrap"), t = el("table");
        t.innerHTML = "<thead><tr>" + b.head.map(h => "<th>" + h + "</th>").join("") + "</tr></thead><tbody>" +
          b.rows.map(r => "<tr>" + r.map(c => "<td>" + c + "</td>").join("") + "</tr>").join("") + "</tbody>";
        w.appendChild(t); return w;
      }
      case "diagram": return mkDiagram(b);
      case "replay": return mkReplay(b);
      case "positions": return mkPositions(b, so);
      case "quiz": return mkQuiz(b, so);
      case "links": {
        const u = el("ul", "links");
        b.items.forEach(i => u.appendChild(el("li", null, (i.k ? '<em class="kind">' + i.k + "</em>" : "") + '<a href="' + i.href + '" target="_blank" rel="noopener">' + i.t + "</a><span>" + i.d + "</span>")));
        return u;
      }
    }
    return el("span");
  }

  PA.guestBanner = () => {
    if (PA.me()) return null;
    return el("div", "guest", PA.cloud && PA.cloud.enabled
      ? '🔐 Bạn chưa đăng nhập nên bài làm chưa được lưu. <a href="index.html">Đăng nhập</a>'
      : '👋 Bạn đang học thử, bài làm chưa được lưu. <a href="index.html">Chọn học viên</a>');
  };
  function onCloud() {
    if (!document.querySelector(".exercise, #quiz-box")) return;
    document.querySelectorAll(".guest").forEach(g => g.remove());
    const banner = PA.guestBanner(), main = document.getElementById("main");
    if (banner && main) main.prepend(banner);
    document.querySelectorAll(".saved").forEach(b => b.refresh && b.refresh());
    PA.refreshChip(); evaluate(true);
  }
  window.addEventListener("pamos:cloud", onCloud);
  PA.jumpToHash = () => {
    const t = location.hash && document.getElementById(location.hash.slice(1));
    if (t) setTimeout(() => { t.scrollIntoView({ block: "start" }); t.classList.add("flash"); }, 250);
  };

  function renderLesson(L) {
    const main = document.getElementById("main");
    const banner = PA.guestBanner(); if (banner) main.appendChild(banner);
    const head = el("header", "lead");
    head.appendChild(el("span", "kicker", PA.course.name + " · Buổi " + L.so));
    head.appendChild(el("h1", null, L.title));
    head.appendChild(el("p", null, L.lead));
    const nav = el("div", "chips"); nav.setAttribute("aria-label", "Chuyển nhanh tới mục");
    L.sections.forEach(s => nav.appendChild(el("a", "chip", s.nav)).setAttribute("href", "#" + s.id));
    nav.appendChild(el("a", "chip", "📊 Đánh giá")).setAttribute("href", "#danh-gia");
    head.appendChild(nav); main.appendChild(head);

    const key = el("section", "key");
    key.appendChild(el("h2", null, "💡 Ý chính của buổi học"));
    const ku = el("ul"); L.keyPoints.forEach(k => ku.appendChild(el("li", null, k))); key.appendChild(ku);
    main.appendChild(key);

    const evalHost = el("div");
    L.sections.forEach(s => {
      if (s.id === "lien-ket") main.appendChild(evalHost);
      const sec = el("section", "sec"); sec.id = s.id;
      sec.appendChild(el("span", "tag", s.tag));
      sec.appendChild(el("h2", null, s.h));
      s.blocks.forEach(b => sec.appendChild(mkBlock(b, L.so)));
      main.appendChild(sec);
    });
    if (!evalHost.isConnected) main.appendChild(evalHost);
    evalHost.appendChild(mkEvaluation(L.so));

    const end = el("div", "end");
    end.appendChild(el("a", "back", "← Về trang chủ")).setAttribute("href", "index.html");
    const r = el("div", "end-r");
    if (L.prev) r.appendChild(el("a", "back", "← " + L.prev.title)).setAttribute("href", L.prev.file);
    if (L.next) r.appendChild(el("a", "back solid", L.next.title + " →")).setAttribute("href", L.next.file);
    end.appendChild(r); main.appendChild(end);
    main.appendChild(el("p", "src", "Puzzle và tư liệu tham khảo từ Lichess.org, nền tảng cờ vua miễn phí và mã nguồn mở."));
    PA.jumpToHash();
  }

  PA.setupChrome();
  PA.mascot();
  if (window.LESSON) renderLesson(window.LESSON);
})();
