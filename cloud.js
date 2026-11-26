/* Đăng nhập online và đồng bộ tiến độ qua Supabase. Không làm gì nếu config.js để trống. */
(function () {
  "use strict";
  const PA = window.PA;
  const COURSE = PA.course.id;
  const LIB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js";
  const cfg = window.PAMOS_CONFIG || {};
  const url = String(cfg.supabaseUrl || "").trim().replace(/\/+$/, "");
  const key = String(cfg.supabaseKey || "").trim();
  const C = (PA.cloud = { enabled: !!(url || key), state: "off", user: null, isTeacher: false, problem: "", sync: "" });
  if (!C.enabled) return;
  C.state = "loading";

  let sb = null, timer = null, chain = Promise.resolve();
  const emit = () => window.dispatchEvent(new CustomEvent("pamos:cloud"));
  const fail = msg => { C.state = "error"; C.problem = msg; emit(); };

  /* Chặn trường hợp dán nhầm khóa bí mật. */
  function isSecretKey(k) {
    if (/^sb_secret_/i.test(k)) return true;
    const part = k.split(".")[1];
    if (!part) return false;
    try { return JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))).role === "service_role"; }
    catch (err) { return false; }
  }

  const idOf = uid => "hv" + String(uid).toLowerCase().replace(/[^a-z0-9]/g, "");
  const local = () => (C.user ? PA.db().students[idOf(C.user.id)] : null);
  const isDirty = id => !!((PA.db().dirty || {})[id]);
  const markDirty = id => PA.update(db => { db.dirty = db.dirty || {}; db.dirty[id] = (db.dirty[id] || 0) + 1; });

  function setSync(state) {
    C.sync = state;
    const box = document.getElementById("sync");
    if (!box) return;
    const map = { saved: ["☁️", "Đã lưu online"], saving: ["⏳", "Đang lưu"], unsaved: ["⚠️", "Chưa lưu online"] }[state];
    box.hidden = !map;
    if (map) { box.className = "sync " + state; box.innerHTML = "<i>" + map[0] + "</i><span>" + map[1] + "</span>"; box.title = map[1]; }
  }

  const toRow = s => ({ user_id: C.user.id, course: COURSE, name: s.name, animal: s.animal, color: s.color, goal: s.goal, data: { ans: s.ans, days: s.days, drill: s.drill, created: s.created, pt: s.pt || 0 } });
  const fromRow = r => {
    const d = r.data && typeof r.data === "object" ? r.data : {};
    return PA.sanitize({ name: r.name, animal: r.animal, color: r.color, goal: r.goal, ans: d.ans, days: d.days, drill: d.drill, created: d.created, pt: d.pt }, idOf(r.user_id));
  };
  async function fetchRow() {
    const { data, error } = await sb.from("progress").select("*").eq("user_id", C.user.id).eq("course", COURSE).maybeSingle();
    if (error) throw error;
    return data;
  }

  /* Đẩy lên: luôn đọc bản trên máy chủ, gộp, rồi mới ghi để không đè mất bài làm ở máy khác. */
  async function doPush() {
    if (!sb || !C.user) return false;
    const uid = C.user.id, id = idOf(uid);
    if (!local()) return true;
    const rev = (PA.db().dirty || {})[id] || 0;
    try {
      setSync("saving");
      const row = await fetchRow();
      if (!C.user || C.user.id !== uid) return false;
      if (row) PA.update(db => { if (db.students[id]) db.students[id] = PA.merge(db.students[id], fromRow(row)); });
      const { error } = await sb.from("progress").upsert(toRow(local()), { onConflict: "user_id,course" });
      if (error) throw error;
      let clean = false;
      PA.update(db => { if (db.dirty && (db.dirty[id] || 0) === rev) { delete db.dirty[id]; clean = true; } });
      if (clean || !isDirty(id)) setSync("saved"); else schedule(800);
      return true;
    } catch (err) {
      C.problem = (err && err.message) || "Không kết nối được máy chủ";
      setSync("unsaved"); schedule(15000);
      return false;
    }
  }
  const push = () => (chain = chain.then(doPush, doPush));
  function schedule(ms) { clearTimeout(timer); timer = setTimeout(push, ms); }

  PA.onChange = () => {
    if (!C.user || !local()) return;
    markDirty(idOf(C.user.id)); setSync("saving"); schedule(1200);
  };

  function signedOut() {
    C.user = null; C.isTeacher = false; C.state = "signedOut";
    clearTimeout(timer); setSync("");
    PA.update(db => { db.current = null; });
    emit();
  }

  async function enter(user) {
    C.user = user; C.problem = "";
    const id = idOf(user.id), cached = !!PA.db().students[id];
    PA.update(db => { db.current = cached ? id : null; });
    C.isTeacher = !!(PA.db().teacher || {})[id];
    if (cached) { C.state = "ready"; emit(); }
    try {
      const t = await sb.from("teachers").select("user_id").eq("user_id", user.id).maybeSingle();
      if (t.error) throw t.error;
      C.isTeacher = !!t.data;
      PA.update(db => { db.teacher = db.teacher || {}; db.teacher[id] = C.isTeacher; });
      const row = await fetchRow();
      if (row) {
        const remote = fromRow(row);
        PA.update(db => { db.students[id] = db.students[id] ? PA.merge(db.students[id], remote) : remote; db.current = id; });
        C.state = "ready";
        if (isDirty(id)) push(); else setSync("saved");
      } else if (local()) {
        C.state = "ready"; markDirty(id); push();
      } else C.state = "needProfile";
      emit();
    } catch (err) {
      C.problem = (err && err.message) || "Không kết nối được máy chủ";
      if (cached) { setSync("unsaved"); schedule(15000); emit(); } else fail("Đăng nhập được nhưng không đọc được dữ liệu: " + C.problem);
    }
  }

  const friendly = msg => /invalid login credentials/i.test(msg) ? "Email hoặc mật khẩu chưa đúng."
    : /email not confirmed/i.test(msg) ? "Tài khoản chưa được xác nhận. Hãy nhờ giáo viên kiểm tra."
    : /fetch|network/i.test(msg) ? "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại."
    : "Không đăng nhập được: " + msg;

  C.signIn = async (email, password) => {
    if (!sb) return "Chưa kết nối được máy chủ đăng nhập.";
    try {
      const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (error) return friendly(error.message);
      await enter(data.user);
      return "";
    } catch (err) { return friendly(String((err && err.message) || err)); }
  };
  /* Trả về false nếu còn bài chưa đẩy lên được và chưa ép đăng xuất. */
  C.signOut = async force => {
    const id = C.user ? idOf(C.user.id) : null;
    if (id && isDirty(id)) await push();
    const unsaved = !!(id && isDirty(id));
    if (unsaved && !force) return false;
    try { if (sb) await sb.auth.signOut({ scope: "local" }); } catch (err) { /* vẫn đăng xuất trên máy này */ }
    /* Máy dùng chung: xóa bản lưu tạm nếu máy chủ đã giữ đủ. Còn bài chưa đẩy thì giữ lại cho lần sau. */
    if (id && !unsaved) PA.update(db => { delete db.students[id]; if (db.teacher) delete db.teacher[id]; });
    signedOut();
    return true;
  };
  C.createProfile = info => {
    if (!C.user) return;
    const id = idOf(C.user.id), now = Date.now();
    PA.update(db => { db.students[id] = PA.sanitize({ name: info.name.trim(), animal: info.animal, color: info.color, goal: info.goal, created: now, pt: now, ans: {}, days: {} }, id); db.current = id; });
    C.state = "ready"; markDirty(id); push();
  };
  C.changePassword = async password => {
    const { error } = await sb.auth.updateUser({ password });
    return error ? "Chưa đổi được mật khẩu: " + error.message : "";
  };
  C.listClass = async () => {
    const { data, error } = await sb.from("progress").select("*").eq("course", COURSE).order("name", { ascending: true });
    if (error) throw error;
    return (data || []).map(r => Object.assign(fromRow(r), { updatedAt: r.updated_at, mine: !!C.user && r.user_id === C.user.id }));
  };
  C.flush = () => (C.user && isDirty(idOf(C.user.id)) ? push() : Promise.resolve(true));
  C.paintSync = () => setSync(C.sync);

  window.addEventListener("online", () => C.flush());
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") C.flush(); });

  function loadLib() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = LIB; s.onload = resolve; s.onerror = () => reject(new Error("lib"));
      document.head.appendChild(s);
    });
  }

  if (isSecretKey(key)) { fail("config.js đang chứa SECRET KEY. Gỡ ngay, vào Supabase thu hồi khóa đó, rồi dùng Publishable key."); return; }
  if (!/^https:\/\/[^\s/]+$/.test(url) || !key) { fail("config.js chưa điền đúng: cần cả supabaseUrl (https://...) và supabaseKey."); return; }

  loadLib().then(async () => {
    sb = window.supabase.createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: "pamos-auth" } });
    sb.auth.onAuthStateChange(event => { if (event === "SIGNED_OUT" && C.user) setTimeout(signedOut, 0); });
    const { data } = await sb.auth.getSession();
    if (data && data.session) await enter(data.session.user); else signedOut();
  }).catch(() => {
    if (PA.me()) { C.state = "ready"; C.problem = "Không tải được thư viện đăng nhập"; setSync("unsaved"); emit(); }
    else fail("Không tải được thư viện đăng nhập. Kiểm tra mạng rồi tải lại trang.");
  });
})();
