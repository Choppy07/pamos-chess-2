/* Hình vẽ SVG tự thiết kế cho PAMOS CHESS: quân cờ có mặt, avatar con vật, linh vật Bé Mã, vương quốc cờ. */
(function () {
  "use strict";
  const PA = (window.PA = window.PA || {});

  /* ---------- Quân cờ dễ thương ---------- */
  const SKIN = {
    w: { fill: "#FFF5DF", line: "#6B4528", eye: "#3F2815", shine: "#FFFFFF", mouth: "#3F2815", deco: "#FFC94D" },
    b: { fill: "#64529A", line: "#241A45", eye: "#FFFFFF", shine: "#241A45", mouth: "#FFFFFF", deco: "#C3B2FF" }
  };
  const base = s => `<path d="M20 92 Q20 78 34 77 L66 77 Q80 78 80 92 Z" fill="${s.fill}" stroke="${s.line}" stroke-width="4" stroke-linejoin="round"/>`;
  const shape = (s, d, fill) => `<path d="${d}" fill="${fill || s.fill}" stroke="${s.line}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`;
  const dot = (s, x, y, r, fill) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill || s.deco}" stroke="${s.line}" stroke-width="3.5"/>`;
  function eye(s, x, y, r) {
    return `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.2}" fill="${s.eye}"/><circle cx="${x + r * 0.32}" cy="${y - r * 0.4}" r="${r * 0.38}" fill="${s.shine}"/>`;
  }
  function face(s, x, y, gap) {
    return `<g class="eyes">${eye(s, x - gap, y, 3.6)}${eye(s, x + gap, y, 3.6)}</g>` +
      `<ellipse cx="${x - gap - 5}" cy="${y + 7}" rx="4" ry="2.6" fill="#FF8FA3" opacity=".75"/><ellipse cx="${x + gap + 5}" cy="${y + 7}" rx="4" ry="2.6" fill="#FF8FA3" opacity=".75"/>` +
      `<path d="M${x - 4} ${y + 6} Q${x} ${y + 11} ${x + 4} ${y + 6}" fill="none" stroke="${s.mouth}" stroke-width="2.6" stroke-linecap="round"/>`;
  }
  const PIECES = {
    p: s => base(s) + shape(s, "M33 77 Q40 66 40 54 L60 54 Q60 66 67 77 Z") + `<circle cx="50" cy="39" r="22" fill="${s.fill}" stroke="${s.line}" stroke-width="4"/>` + face(s, 50, 37, 8),
    r: s => base(s) + shape(s, "M29 40 L71 40 L68 77 L32 77 Z") + shape(s, "M23 18 L35 18 L35 27 L44 27 L44 18 L56 18 L56 27 L65 27 L65 18 L77 18 L77 42 L23 42 Z") + face(s, 50, 55, 9),
    b: s => base(s) + shape(s, "M50 14 C71 28 76 56 62 71 L38 71 C24 56 29 28 50 14 Z") + dot(s, 50, 12, 6) +
      `<path d="M59 27 L49 39" stroke="${s.line}" stroke-width="4" stroke-linecap="round"/>` + shape(s, "M34 70 L66 70 L66 78 L34 78 Z", s.deco) + face(s, 50, 52, 8),
    n: s => base(s) + shape(s, "M31 77 C33 66 43 60 46 52 C39 55 31 61 22 57 C13 52 17 42 26 36 C32 30 35 21 45 18 L49 5 L58 17 L68 9 L68 23 C82 32 84 56 72 77 Z") +
      `<path d="M66 24 C74 36 75 54 68 72" fill="none" stroke="${s.deco}" stroke-width="6" stroke-linecap="round"/>` +
      `<g class="eyes">${eye(s, 45, 34, 4.4)}</g><ellipse cx="49" cy="47" rx="4.5" ry="2.8" fill="#FF8FA3" opacity=".75"/><circle cx="24" cy="47" r="2.2" fill="${s.mouth}"/>` +
      `<path d="M24 53 Q30 56 35 52" fill="none" stroke="${s.mouth}" stroke-width="2.4" stroke-linecap="round"/>`,
    q: s => base(s) + shape(s, "M31 77 L23 36 L38 51 L41 24 L50 47 L59 24 L62 51 L77 36 L69 77 Z") +
      dot(s, 23, 32, 6) + dot(s, 41, 19, 6) + dot(s, 59, 19, 6) + dot(s, 77, 32, 6) + face(s, 50, 62, 7),
    k: s => base(s) + shape(s, "M45 8 L55 8 L55 18 L65 18 L65 28 L55 28 L55 44 L45 44 L45 28 L35 28 L35 18 L45 18 Z", s.deco) +
      shape(s, "M29 77 C14 58 24 36 50 44 C76 36 86 58 71 77 Z") + face(s, 50, 60, 9)
  };
  const cache = {};
  PA.pieceSVG = function (code) {
    if (!cache[code]) {
      const color = code === code.toUpperCase() ? "w" : "b";
      cache[code] = `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">${PIECES[code.toLowerCase()](SKIN[color])}</svg>`;
    }
    return cache[code];
  };

  /* ---------- Avatar con vật ---------- */
  const INK = "#3B2A20";
  const c = (x, y, r, f, ex) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" ${ex || ""}/>`;
  const e = (x, y, rx, ry, f, ex) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}" ${ex || ""}/>`;
  const pa = (d, f, ex) => `<path d="${d}" fill="${f}" ${ex || ""}/>`;
  const head = f => e(50, 58, 30, 28, f);
  const eyes = (y, gap) => `<g class="eyes">${c(50 - gap, y, 4, INK)}${c(50 + gap, y, 4, INK)}${c(51.4 - gap, y - 1.5, 1.4, "#fff")}${c(51.4 + gap, y - 1.5, 1.4, "#fff")}</g>`;
  const cheeks = y => e(30, y, 5.5, 3.5, "#FF8FA3", 'opacity=".7"') + e(70, y, 5.5, 3.5, "#FF8FA3", 'opacity=".7"');
  const smile = y => pa(`M43 ${y} Q46.5 ${y + 5} 50 ${y} Q53.5 ${y + 5} 57 ${y}`, "none", `stroke="${INK}" stroke-width="2.4" stroke-linecap="round"`);
  const nose = y => pa(`M46 ${y} Q50 ${y - 2.5} 54 ${y} Q52 ${y + 4.5} 50 ${y + 4.5} Q48 ${y + 4.5} 46 ${y} Z`, INK);
  const std = (y) => eyes(y || 54, 12) + cheeks((y || 54) + 11);
  const ANIMALS = {
    tho: ["Thỏ", () => e(37, 24, 9, 22, "#FDF3F0") + e(63, 24, 9, 22, "#FDF3F0") + e(37, 24, 4, 16, "#FFB3C1") + e(63, 24, 4, 16, "#FFB3C1") + head("#FDF3F0") + std() + nose(62) + smile(68)],
    gau: ["Gấu", () => c(25, 34, 12, "#A86B3C") + c(75, 34, 12, "#A86B3C") + c(25, 34, 6, "#E8B98C") + c(75, 34, 6, "#E8B98C") + head("#A86B3C") + e(50, 68, 15, 12, "#E8B98C") + std() + nose(61) + smile(69)],
    meo: ["Mèo", () => pa("M22 50 L24 18 L46 34 Z", "#F6A94A") + pa("M78 50 L76 18 L54 34 Z", "#F6A94A") + pa("M28 40 L29 26 L39 33 Z", "#FFC7B0") + pa("M72 40 L71 26 L61 33 Z", "#FFC7B0") + head("#F6A94A") + std() + nose(62) + smile(68) + pa("M12 60 L28 63 M12 70 L28 69 M88 60 L72 63 M88 70 L72 69", "none", `stroke="${INK}" stroke-width="1.6" stroke-linecap="round"`)],
    cao: ["Cáo", () => pa("M20 52 L20 14 L46 36 Z", "#EF7B2D") + pa("M80 52 L80 14 L54 36 Z", "#EF7B2D") + head("#EF7B2D") + pa("M21 62 Q35 62 50 76 Q65 62 79 62 Q74 86 50 86 Q26 86 21 62 Z", "#FFF4E6") + std() + nose(68) + smile(75)],
    gautruc: ["Gấu trúc", () => c(25, 33, 12, "#2F2B2B") + c(75, 33, 12, "#2F2B2B") + head("#FFFFFF") + e(37, 55, 10, 12, "#2F2B2B", 'transform="rotate(25 37 55)"') + e(63, 55, 10, 12, "#2F2B2B", 'transform="rotate(-25 63 55)"') + `<g class="eyes">${c(38, 54, 4, "#fff")}${c(62, 54, 4, "#fff")}${c(38.5, 54.5, 2.4, INK)}${c(61.5, 54.5, 2.4, INK)}</g>` + cheeks(68) + nose(65) + smile(72)],
    ech: ["Ếch", () => c(33, 34, 14, "#6BBF59") + c(67, 34, 14, "#6BBF59") + head("#6BBF59") + `<g class="eyes">${c(33, 34, 8, "#fff")}${c(67, 34, 8, "#fff")}${c(34, 35, 4, INK)}${c(66, 35, 4, INK)}</g>` + cheeks(64) + pa("M36 66 Q50 80 64 66", "none", `stroke="${INK}" stroke-width="3" stroke-linecap="round"`)],
    ho: ["Hổ", () => c(25, 35, 11, "#F59E2E") + c(75, 35, 11, "#F59E2E") + head("#F59E2E") + pa("M50 30 L50 42 M40 32 L43 41 M60 32 L57 41 M21 56 L31 57 M21 66 L30 65 M79 56 L69 57 M79 66 L70 65", "none", `stroke="${INK}" stroke-width="3.4" stroke-linecap="round"`) + e(50, 69, 15, 11, "#FFF4E6") + std() + nose(63) + smile(70)],
    canhcut: ["Cánh cụt", () => e(50, 56, 31, 32, "#34406B") + pa("M50 42 C62 26 82 40 74 62 C68 82 32 82 26 62 C18 40 38 26 50 42 Z", "#FFFFFF") + std(54) + pa("M42 63 L58 63 L50 74 Z", "#FFA62B")],
    cumeo: ["Cú", () => pa("M22 44 L24 20 L44 34 Z", "#9C6B4F") + pa("M78 44 L76 20 L56 34 Z", "#9C6B4F") + head("#9C6B4F") + c(37, 54, 14, "#FFF1DC") + c(63, 54, 14, "#FFF1DC") + `<g class="eyes">${c(38, 54, 6, INK)}${c(62, 54, 6, INK)}${c(40, 52, 2, "#fff")}${c(64, 52, 2, "#fff")}</g>` + pa("M44 65 L56 65 L50 75 Z", "#FFA62B")],
    cun: ["Cún", () => e(21, 52, 11, 24, "#8C5A33", 'transform="rotate(18 21 52)"') + e(79, 52, 11, 24, "#8C5A33", 'transform="rotate(-18 79 52)"') + head("#EBC391") + e(50, 69, 15, 12, "#FFF4E6") + std() + nose(61) + smile(69) + e(50, 79, 4.5, 5, "#FF7F8E")],
    heo: ["Heo", () => pa("M22 46 L22 22 L44 34 Z", "#FFA8B8") + pa("M78 46 L78 22 L56 34 Z", "#FFA8B8") + head("#FFC2CD") + std() + e(50, 66, 13, 9, "#FF93A8") + e(45, 66, 2.2, 3.4, INK) + e(55, 66, 2.2, 3.4, INK) + smile(77)],
    kylan: ["Kỳ lân", () => pa("M50 4 L57 34 L43 34 Z", "#FFD34D") + pa("M23 46 L22 20 L42 34 Z", "#FFFFFF") + pa("M77 46 L78 20 L58 34 Z", "#FFFFFF") + head("#FFFFFF") + c(27, 40, 9, "#B79CFF") + c(36, 33, 9, "#7FD4F5") + c(70, 38, 9, "#FF9ECF") + std(57) + e(50, 72, 13, 9, "#FFD9E6") + smile(72)]
  };
  PA.ANIMALS = Object.keys(ANIMALS).map(id => ({ id, name: ANIMALS[id][0] }));
  PA.COLORS = ["#FFD6E0", "#FFE8A3", "#C9F2C7", "#BDE7FF", "#DCCBFF", "#FFD3B0"];
  PA.avatarSVG = function (animal, color) {
    const a = Object.prototype.hasOwnProperty.call(ANIMALS, animal) ? ANIMALS[animal] : ANIMALS.tho;
    const bg = PA.COLORS.includes(color) ? color : PA.COLORS[0];
    return `<svg class="ava-svg" viewBox="0 0 100 100" role="img" aria-label="${a[0]}"><circle cx="50" cy="50" r="49" fill="${bg}"/><g transform="translate(5 4) scale(.9)">${a[1]()}</g></svg>`;
  };

  /* ---------- Linh vật Bé Mã (quân Mã quàng khăn) ---------- */
  PA.mascotSVG = function () {
    const knight = PIECES.n(SKIN.w);
    return `<svg viewBox="0 0 100 100" aria-hidden="true">${knight}<path d="M31 70 Q50 80 73 68 L74 77 Q51 89 30 79 Z" fill="#F2545B" stroke="#6B4528" stroke-width="3" stroke-linejoin="round"/><path d="M66 76 L76 94 L62 90 L58 80 Z" fill="#F2545B" stroke="#6B4528" stroke-width="3" stroke-linejoin="round"/></svg>`;
  };

  /* ---------- Vương quốc cờ: mở khóa dần theo số sao ---------- */
  const at = (x, y, inner, cls, label) => `<g transform="translate(${x} ${y})"><g class="thing ${cls || ""}" tabindex="0" role="img" aria-label="${label}"><title>${label}</title>${inner}</g></g>`;
  const piece = (code, size) => `<g transform="scale(${size / 100})">${PIECES[code.toLowerCase()](SKIN[code === code.toUpperCase() ? "w" : "b"])}</g>`;
  PA.KINGDOM = [
    { need: 0, name: "Lều của người học", draw: () => at(90, 300, pa("M0 70 L55 0 L110 70 Z", "#FF8A65", 'stroke="#7A3E2B" stroke-width="4" stroke-linejoin="round"') + pa("M40 70 L55 34 L70 70 Z", "#7A3E2B"), "", "Lều của người học") },
    { need: 2, name: "Cây táo", draw: () => at(10, 215, pa("M42 150 L46 90 L60 90 L64 150 Z", "#8D5A34") + c(53, 62, 44, "#5FB85A") + c(24, 82, 28, "#6CC866") + c(82, 82, 28, "#6CC866") + c(40, 55, 7, "#F2545B") + c(72, 74, 7, "#F2545B") + c(28, 88, 7, "#F2545B"), "sway", "Cây táo") },
    { need: 5, name: "Vườn hoa", draw: () => [[215, 380, "#FF7EB6"], [245, 395, "#FFD34D"], [275, 378, "#B79CFF"], [305, 397, "#FF8A65"]].map(([x, y, f], i) => at(x, y, `<path d="M0 0 L0 22" stroke="#2E7D32" stroke-width="4"/>` + [0, 72, 144, 216, 288].map(d => `<circle cx="${(9 * Math.cos(d * Math.PI / 180)).toFixed(1)}" cy="${(9 * Math.sin(d * Math.PI / 180)).toFixed(1)}" r="7" fill="${f}"/>`).join("") + c(0, 0, 5, "#FFF3B0"), "sway d" + i, "Vườn hoa")).join("") },
    { need: 8, name: "Ngôi nhà gỗ", draw: () => at(225, 250, pa("M8 44 L8 104 L112 104 L112 44 Z", "#FFE0B2", 'stroke="#7A4A2B" stroke-width="4"') + pa("M-4 48 L60 0 L124 48 Z", "#E5655B", 'stroke="#7A3E2B" stroke-width="4" stroke-linejoin="round"') + pa("M48 104 L48 66 Q60 56 72 66 L72 104 Z", "#8D5A34") + pa("M20 62 h18 v18 h-18 z M82 62 h18 v18 h-18 z", "#9BD8F5", 'stroke="#7A4A2B" stroke-width="3"'), "", "Ngôi nhà gỗ") },
    { need: 12, name: "Bạn Tốt nhỏ", draw: () => at(345, 340, piece("P", 62), "hop", "Bạn Tốt nhỏ") },
    { need: 16, name: "Ao vịt", draw: () => at(420, 372, e(75, 22, 82, 24, "#7FD4F5", 'stroke="#3A9BC1" stroke-width="3"') + `<g class="swim">` + e(66, 14, 20, 12, "#FFE066") + c(84, 2, 10, "#FFE066") + c(87, 0, 2.2, INK) + pa("M93 3 L104 6 L93 9 Z", "#FFA62B") + `</g>`, "", "Ao vịt") },
    { need: 22, name: "Cối xay gió", draw: () => at(600, 190, pa("M18 150 L30 40 L70 40 L82 150 Z", "#F5E6C8", 'stroke="#7A4A2B" stroke-width="4" stroke-linejoin="round"') + pa("M40 150 v-30 q10 -10 20 0 v30 z", "#8D5A34") + `<g transform="translate(50 44)"><g class="spin">` + [0, 90, 180, 270].map(d => `<path d="M0 0 L-10 -58 L10 -58 Z" fill="#FF8A65" stroke="#7A3E2B" stroke-width="3" transform="rotate(${d})"/>`).join("") + `</g>${c(0, 0, 7, "#7A3E2B")}</g>`, "", "Cối xay gió") },
    { need: 28, name: "Tháp canh Xe", draw: () => at(505, 268, piece("R", 112), "", "Tháp canh Xe") },
    { need: 35, name: "Lâu đài cờ", draw: () => at(330, 150, pa("M20 140 V60 H40 V75 H55 V60 H75 V75 H85 V35 H95 V50 H105 V35 H115 V75 H125 V60 H145 V75 H160 V60 H180 V140 Z", "#D9CCF2", 'stroke="#5A4A86" stroke-width="4" stroke-linejoin="round"') + pa("M82 140 v-34 q18 -22 36 0 v34 z", "#7A5C9E") + pa("M100 35 V4 L128 13 L100 22", "#F2545B", 'stroke="#5A4A86" stroke-width="3"'), "", "Lâu đài cờ") },
    { need: 42, name: "Cầu vồng", draw: () => `<g class="rainbow">` + ["#FF6B6B", "#FFA94D", "#FFE066", "#8CE99A", "#74C0FC", "#B197FC"].map((f, i) => `<path d="M ${170 + i * 11} 250 A ${230 - i * 11} ${190 - i * 11} 0 0 1 ${630 - i * 11} 250" fill="none" stroke="${f}" stroke-width="11" opacity=".75"/>`).join("") + `</g>`, back: true },
    { need: 51, name: "Vua và Hậu ghé thăm", draw: () => at(385, 292, piece("K", 70), "hop d1", "Đức Vua") + at(455, 296, piece("Q", 70), "hop d3", "Hoàng Hậu") }
  ];
  PA.kingdomSVG = function (stars, avatar) {
    const open = PA.KINGDOM.filter(k => stars >= k.need);
    const cloud = (y, d, s) => `<g transform="translate(0 ${y})"><g class="cloud" style="animation-duration:${d}s;animation-delay:-${d * s}s"><ellipse cx="0" cy="0" rx="42" ry="17" fill="#fff"/><circle cx="-12" cy="-10" r="17" fill="#fff"/><circle cx="16" cy="-6" r="13" fill="#fff"/></g></g>`;
    return `<svg class="kingdom" viewBox="0 0 720 440" role="group" aria-label="Vương quốc cờ của bạn">` +
      `<rect width="720" height="440" fill="#BDE7FF"/>` + `<g class="sun">${c(640, 70, 34, "#FFD93D")}</g>` + cloud(70, 55, 0.2) + cloud(130, 80, 0.7) + cloud(45, 95, 0.45) +
      open.filter(k => k.back).map(k => k.draw()).join("") +
      pa("M0 270 Q150 190 310 262 T720 238 V440 H0 Z", "#A5DB7F") + pa("M0 345 Q200 285 390 345 T720 330 V440 H0 Z", "#8ACB66") +
      open.filter(k => !k.back).map(k => k.draw()).join("") +
      (avatar ? `<g transform="translate(150 345)"><g class="thing hop me" tabindex="0" role="img" aria-label="Bạn">${PA.avatarSVG(avatar.animal, avatar.color).replace("<svg ", '<svg width="64" height="64" ')}</g></g>` : "") +
      `</svg>`;
  };
})();
