/* ==========================================================================
   Ink-cloud SVG generator — echoes the scalloped, curl-filled clouds of the
   artwork: lilac body, black ink outline, spiral swirls inside.
   Technique: a cloud is a union of circles. We draw every circle with a thick
   ink stroke first, then every circle filled on top — leaving a clean, single
   scalloped ink outline around the union (no awkward cusps).
   ========================================================================== */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const el = (name, attrs = {}) => {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };

  // Archimedean spiral — the signature curl
  function spiral(cx, cy, r, turns, dir = 1, start = 0) {
    const steps = Math.round(turns * 32);
    let d = "";
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = start + dir * t * turns * Math.PI * 2;
      const rr = r * (1 - t * 0.88);
      d += (i ? " L" : "M") + (cx + Math.cos(a) * rr).toFixed(1) + " " + (cy + Math.sin(a) * rr).toFixed(1);
    }
    return d;
  }

  /**
   * circles: [[x,y,r], ...]; opts: fill, ink, inkW, swirls:[[x,y,r,turns,dir,start]]
   */
  function cloud(parent, circles, opts) {
    const g = el("g", { class: opts.cls || "" });
    const inkW = opts.inkW || 2.4;
    const outline = el("g", { fill: opts.ink || "#07040c" });
    circles.forEach(([x, y, r]) => outline.appendChild(el("circle", { cx: x, cy: y, r: r + inkW })));
    const body = el("g", { fill: opts.fill });
    circles.forEach(([x, y, r]) => body.appendChild(el("circle", { cx: x, cy: y, r })));
    // flat-ish base for a grounded silhouette
    if (opts.base) {
      const [x, y, w, h] = opts.base;
      outline.appendChild(el("rect", { x: x - inkW, y: y, width: w + inkW * 2, height: h + inkW, rx: h / 2 + inkW }));
      body.appendChild(el("rect", { x, y, width: w, height: h, rx: h / 2 }));
    }
    g.appendChild(outline); g.appendChild(body);
    // inner contour arcs — the hand-inked edge echoes
    (opts.swirls || []).forEach(([x, y, r, t, dir, st]) => {
      const p = el("path", { d: spiral(x, y, r, t, dir, st), class: "swirl" });
      p.style.setProperty("--len", Math.round(r * t * 6));
      g.appendChild(p);
    });
    (opts.echoes || []).forEach((d) => {
      const p = el("path", { d, class: "swirl" });
      p.style.setProperty("--len", 260);
      g.appendChild(p);
    });
    parent.appendChild(g);
    return g;
  }

  /* ---------- Brand mark ---------- */
  function logo() {
    const svg = el("svg", { viewBox: "0 0 64 64", class: "ink-cloud drawn", "aria-hidden": "true" });
    cloud(svg, [[20, 38, 11], [32, 28, 14], [45, 36, 11], [27, 42, 9], [40, 43, 8]], {
      fill: "url(#g-lilac)", inkW: 2.6, swirls: [[31, 31, 8, 1.6, 1, 0]],
    });
    return svg;
  }

  /* ---------- Step illustrations ---------- */
  function art(kind) {
    const svg = el("svg", { viewBox: "0 0 320 170", class: "ink-cloud", "aria-hidden": "true" });
    const g = el("g", { class: "float" });
    svg.appendChild(g);

    // Back cloud — deep violet, like the shadowed masses in the artwork
    cloud(g, [[196, 66, 22], [224, 50, 28], [256, 62, 22], [276, 76, 14], [214, 78, 16], [244, 80, 16]], {
      fill: "#3f2063", ink: "#07040c", inkW: 2,
      swirls: [[224, 54, 15, 1.8, -1, 1.2], [258, 66, 9, 1.5, 1, 2.5]],
    });

    // Front cloud — lilac to moon-cream
    cloud(g, [[66, 104, 22], [96, 84, 30], [134, 70, 36], [172, 86, 28], [198, 104, 20], [90, 112, 18], [150, 108, 22]], {
      fill: "url(#g-lilac)", inkW: 2.4, base: [56, 104, 154, 22],
      swirls: [[96, 90, 17, 2.1, 1, 0], [138, 76, 21, 2.3, -1, 2], [176, 92, 12, 1.6, 1, 3.5]],
      echoes: ["M64 116 C 84 108, 104 122, 128 114 S 170 108, 200 116"],
    });

    if (kind === "1") {
      svg.appendChild(el("rect", { x: 70, y: 138, width: 180, height: 26, rx: 13, fill: "rgba(7,4,12,.8)", stroke: "rgba(200,174,214,.45)" }));
      const caret = el("rect", { x: 86, y: 145, width: 2, height: 12, fill: "#c8aed6" });
      caret.innerHTML = '<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;.5;.5;1" dur="1s" repeatCount="indefinite"/>';
      svg.appendChild(caret);
      const cur = el("path", { d: "M228 126 l0 24 l6 -5 l5 10 l5 -2 l-5 -10 l8 0 z", fill: "#f4ebef", stroke: "#07040c", "stroke-width": "1.6", "stroke-linejoin": "round" });
      cur.innerHTML = '<animateTransform attributeName="transform" type="translate" values="18 10;0 0;0 0;18 10" keyTimes="0;.3;.85;1" dur="4s" repeatCount="indefinite"/>';
      svg.appendChild(cur);
    } else if (kind === "2") {
      svg.appendChild(el("rect", { x: 70, y: 138, width: 180, height: 26, rx: 13, fill: "rgba(7,4,12,.8)", stroke: "rgba(200,174,214,.45)" }));
      [[86, 34], [126, 22], [154, 40], [200, 18], [224, 14]].forEach(([x, w], i) => {
        const r = el("rect", { x, y: 148, width: w, height: 6, rx: 3, fill: "rgba(200,174,214,.5)" });
        r.innerHTML = `<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.25;.85;1" dur="3.2s" begin="${i * 0.16}s" repeatCount="indefinite"/>`;
        svg.appendChild(r);
      });
      [[110, 124], [140, 128], [172, 124]].forEach(([x, y], i) => {
        const c = el("circle", { cx: x, cy: y, r: 2.6, fill: "#f4ebef" });
        c.innerHTML = `<animate attributeName="cy" values="${y};${y + 20}" dur="1.6s" begin="${i * 0.3}s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="1.6s" begin="${i * 0.3}s" repeatCount="indefinite"/>`;
        svg.appendChild(c);
      });
    } else {
      svg.appendChild(el("path", { d: "M44 150 C 90 150, 120 140, 168 146", fill: "none", stroke: "rgba(200,174,214,.45)", "stroke-width": "1.5", "stroke-dasharray": "3 5" }));
      const key = el("g", {});
      key.innerHTML =
        '<rect x="176" y="130" width="96" height="36" rx="10" fill="#110818"/>' +
        '<rect x="176" y="126" width="96" height="36" rx="10" fill="#2f1a48" stroke="#07040c" stroke-width="2"/>' +
        '<rect x="180" y="128" width="88" height="1.5" rx="1" fill="rgba(244,235,239,.25)"/>' +
        '<text x="224" y="149" text-anchor="middle" font-family="Geist Mono, monospace" font-size="14" fill="#f4ebef">Tab →</text>' +
        '<animateTransform attributeName="transform" type="translate" values="0 0;0 0;0 3;0 0" keyTimes="0;.8;.86;1" dur="3s" repeatCount="indefinite"/>';
      svg.appendChild(key);
      [[30, 40], [296, 24], [300, 118], [24, 124]].forEach(([x, y], i) => {
        const s = el("circle", { cx: x, cy: y, r: 2, fill: "#f4ebef" });
        s.innerHTML = `<animate attributeName="opacity" values=".2;1;.2" dur="${2.4 + i * 0.5}s" repeatCount="indefinite"/>`;
        svg.appendChild(s);
      });
    }
    return svg;
  }

  window.NimbusClouds = { logo, art };
  document.querySelectorAll("[data-cloud-logo]").forEach((n) => n.appendChild(logo()));
  document.querySelectorAll("[data-cloud-art]").forEach((n) => n.appendChild(art(n.dataset.cloudArt)));
})();
