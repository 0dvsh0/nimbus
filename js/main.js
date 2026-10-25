/* ==========================================================================
   Nimbus — interactions
   ========================================================================== */
(function () {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  $$(".reveal, .step").forEach((n) => io.observe(n));
  // Geometry fallback (tall viewports, embedded frames, full-page captures)
  function revealCheck() {
    const vh = window.innerHeight;
    $$(".reveal:not(.is-in), .step:not(.is-in)").forEach((n) => {
      const r = n.getBoundingClientRect();
      if (r.top < vh * 0.94 && r.bottom > 0) { n.classList.add("is-in"); io.unobserve(n); }
    });
  }
  window.addEventListener("scroll", revealCheck, { passive: true });
  window.addEventListener("resize", revealCheck);
  window.addEventListener("load", revealCheck);
  setTimeout(revealCheck, 300);

  /* ---------- Nav ---------- */
  const nav = $("#nav");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 30);
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* ---------- Cursor glow + card spotlight + magnetic ---------- */
  const glow = $(".cursor-glow");
  if (window.matchMedia("(pointer: fine)").matches) {
    document.body.classList.add("has-pointer");
    window.addEventListener("pointermove", (e) => { glow.style.transform = `translate(${e.clientX - 260}px, ${e.clientY - 260}px)`; }, { passive: true });
    glow.style.left = "0"; glow.style.top = "0";
    $$(".card").forEach((c) => c.addEventListener("pointermove", (e) => {
      const r = c.getBoundingClientRect();
      c.style.setProperty("--mx", e.clientX - r.left + "px");
      c.style.setProperty("--my", e.clientY - r.top + "px");
    }));
    $$(".magnetic").forEach((b) => {
      b.addEventListener("pointermove", (e) => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.3 - 2}px)`;
      });
      b.addEventListener("pointerleave", () => (b.style.transform = ""));
    });
  }

  /* ======================================================================
     HERO DEMO — loops through platforms
     ====================================================================== */
  const DEMO = [
    { url: "x.com/home", name: "Ava Kim", handle: "@avakim · 2m", av: "AK",
      msg: "Just shipped my first indie app after 14 months of nights & weekends. Terrified and thrilled.",
      typed: "", ghost: "14 months of quiet persistence — that's the real launch. Congrats Ava, downloading it now 🚀", tones: ["Warm", "Witty", "Brief"] },
    { url: "linkedin.com/feed", name: "Daniel Okafor", handle: "Head of Design · Figma · 1h", av: "DO",
      msg: "We're hiring a Senior Product Designer to help shape the future of collaborative tools. DM me if you're curious.",
      typed: "Hi Daniel, ", ghost: "I've been following the team's work on multiplayer editing — would love to learn more about the role. Open to a quick chat this week?", tones: ["Professional", "Warm", "Brief"] },
    { url: "web.whatsapp.com", name: "Mom ❤️", handle: "online", av: "M",
      msg: "Are you coming home for Diwali this year? Your father keeps asking 😊",
      typed: "", ghost: "Yes! Already looking at tickets for the 30th. Tell Papa to save me some kaju katli 😄❤️", tones: ["Warm", "Playful", "Brief"] },
    { url: "instagram.com/direct", name: "lena.studio", handle: "Active now", av: "LS",
      msg: "omg your last post 😍 where was that sunset taken??",
      typed: "", ghost: "Haha thank you!! Big Sur, right off Highway 1 — go at golden hour, it's unreal 🌅", tones: ["Playful", "Warm", "Brief"] },
    { url: "mail.google.com", name: "Rachel Moore", handle: "Re: Q4 roadmap review", av: "RM",
      msg: "Could you share your thoughts on the Q4 priorities before Thursday's sync?",
      typed: "Hi Rachel, ", ghost: "absolutely — I'll send a short write-up by Wednesday EOD so we can use Thursday for decisions.", tones: ["Professional", "Brief", "Warm"] },
  ];

  const D = {
    url: $("#demoUrl"), name: $("#demoName"), handle: $("#demoHandle"), av: $("#demoAvatar"),
    msg: $("#demoMsg"), typed: $("#demoTyped"), ghost: $("#demoGhost"), hint: $("#demoHint"),
    compose: $(".compose"), send: $("#demoSend"), key: $("#demoKey"), cond: $("#demoCondense"),
    tones: $("#demoTones"), tabs: $$(".demo__tab"), msgWrap: $(".msg"),
  };
  let demoIdx = 0, demoToken = 0, demoVisible = true;

  new IntersectionObserver(([e]) => { demoVisible = e.isIntersecting; }, { threshold: 0.2 }).observe($(".demo"));

  async function runDemo(i) {
    const token = ++demoToken;
    const alive = () => token === demoToken;
    const s = DEMO[i];
    demoIdx = i;
    D.tabs.forEach((t, k) => t.classList.toggle("is-active", k === i));

    // reset & swap
    D.msgWrap.classList.add("is-swap");
    D.compose.classList.remove("is-focus");
    D.hint.classList.remove("on"); D.key.classList.remove("on"); D.send.classList.remove("is-ready");
    D.ghost.innerHTML = ""; D.typed.textContent = "";
    await sleep(380); if (!alive()) return;
    D.url.textContent = s.url; D.name.textContent = s.name; D.handle.textContent = s.handle;
    D.av.textContent = s.av; D.msg.textContent = s.msg;
    D.tones.innerHTML = s.tones.map((t, k) => `<span class="chip${k ? "" : " is-on"}">${t}</span>`).join("");
    D.msgWrap.classList.remove("is-swap");

    await sleep(900); if (!alive()) return;
    D.compose.classList.add("is-focus");

    // user types an opener (sometimes)
    for (const ch of s.typed) {
      D.typed.textContent += ch;
      await sleep(55 + Math.random() * 50); if (!alive()) return;
    }

    // condense
    D.cond.classList.add("on");
    await sleep(reduce ? 100 : 850); if (!alive()) return;
    D.cond.classList.remove("on");

    // ghost words drift in
    const words = s.ghost.split(/(\s+)/);
    D.ghost.innerHTML = words.map((w) => `<span class="w">${esc(w)}</span>`).join("");
    const ws = $$(".w", D.ghost);
    for (let k = 0; k < ws.length; k++) {
      ws[k].classList.add("on");
      if (!reduce) await sleep(28); if (!alive()) return;
    }
    D.hint.classList.add("on");
    await sleep(1300); if (!alive()) return;

    // press Tab
    D.key.classList.add("on");
    await sleep(500); if (!alive()) return;
    const kc = $(".keycap", D.key);
    kc.classList.add("is-pressed");
    await sleep(160); if (!alive()) return;
    kc.classList.remove("is-pressed");
    D.typed.textContent += s.ghost; D.ghost.innerHTML = "";
    D.hint.classList.remove("on");
    D.send.classList.add("is-ready");
    await sleep(700); if (!alive()) return;
    D.key.classList.remove("on");

    await sleep(2600); if (!alive()) return;
    while (!demoVisible) { await sleep(400); if (!alive()) return; }
    runDemo((i + 1) % DEMO.length);
  }
  D.tabs.forEach((t, k) => t.addEventListener("click", () => runDemo(k)));
  runDemo(0);

  /* ======================================================================
     PLAYGROUND — a real ghost-text autocomplete
     ====================================================================== */
  const SCN = [
    { id: "li", icon: "fa-brands fa-linkedin-in", label: "LinkedIn", sub: "Recruiter outreach", platform: "LinkedIn · Messaging",
      thread: [{ who: "Sofia Martinez · Talent @ Linear", t: "Hi! Loved your portfolio. We're building out our design team — would you be open to a conversation?" }],
      follow: "Amazing! I'll send over a calendar link shortly 🙌",
      tones: {
        Warm: "Hi Sofia, thank you so much — that genuinely made my day! I'd love to chat. I'm free Tuesday or Thursday afternoon, does either work for you?",
        Professional: "Hi Sofia, thanks for reaching out. I'd be glad to learn more about the role and the team. Could you share a few times that work this week?",
        Brief: "Hi Sofia — thanks! Definitely open to it. When works for you?",
      } },
    { id: "x", icon: "fa-brands fa-x-twitter", label: "X", sub: "Reply to a hot take", platform: "X · Replies",
      thread: [{ who: "@jordan_builds", t: "Unpopular opinion: most startups don't need a design system until they have at least 10 engineers." }],
      follow: "ok that's fair, the button thing is real 😂",
      tones: {
        Witty: "Counterpoint: the moment you have three slightly different blue buttons, the design system has already started — it's just a bad one.",
        Warm: "Mostly agree! Though even a tiny shared component library early on saves so much rework later. Start small, grow it with the team.",
        Brief: "Agree on the system. Disagree on the tokens — set those up on day one.",
      } },
    { id: "wa", icon: "fa-brands fa-whatsapp", label: "WhatsApp", sub: "Friend cancels plans", platform: "WhatsApp · Priya",
      thread: [{ who: "Priya", t: "I'm sooo sorry, something came up at work and I can't make dinner tonight 😭" }, { who: "Priya", t: "Rain check?" }],
      follow: "You're the best ❤️ Saturday it is!",
      tones: {
        Warm: "No worries at all, work comes first! Rain check absolutely — how about Saturday? Same place, my treat 💜",
        Playful: "Only if you promise dessert is on you next time 😤 Kidding! Saturday?",
        Brief: "Totally fine! Saturday instead?",
      } },
    { id: "ig", icon: "fa-brands fa-instagram", label: "Instagram", sub: "Comment on a post", platform: "Instagram · Comments",
      thread: [{ who: "@mira.ceramics", t: "First wood-fired batch out of the kiln after 3 days 🔥 Every piece came out different." }],
      follow: "Thank you!! Might do a small drop next month 🥹",
      tones: {
        Playful: "The glaze on the third one?? Absolutely unreal. Please tell me these are going up for sale 😍",
        Warm: "Three days of patience and it shows — every piece feels like it has its own story. Beautiful work, Mira.",
        Brief: "Stunning batch. That third bowl 🔥",
      } },
    { id: "gm", icon: "fa-regular fa-envelope", label: "Gmail", sub: "Client asks for a delay", platform: "Gmail · Re: Launch timeline",
      thread: [{ who: "Tom Becker", t: "Hi — is there any chance we could push the launch by two weeks? Legal needs more time for review." }],
      follow: "Perfect, appreciate the flexibility. Talk tomorrow.",
      tones: {
        Professional: "Hi Tom, thanks for the heads-up. A two-week shift is workable on our side — I'll update the timeline and share it with the team by tomorrow.",
        Warm: "Hi Tom, completely understand — better to get it right. Two weeks works for us; I'll send a revised plan tomorrow so everyone's aligned.",
        Brief: "Hi Tom, two weeks works. I'll send an updated timeline tomorrow.",
      } },
  ];

  const P = {
    scns: $("#pgScenarios"), icon: $("#pgIcon"), platform: $("#pgPlatform"), thread: $("#pgThread"),
    input: $("#pgInput"), mTyped: $("#pgMirrorTyped"), ghost: $("#pgGhost"), cond: $("#pgCondense"),
    tones: $("#pgTones"), tabBtn: $("#pgTabBtn"), send: $("#pgSend"), field: $("#pgField"),
  };
  let cur = SCN[0], tone = Object.keys(cur.tones)[0], ghostText = "", dismissed = false, condensing = false, condTimer = null, revealed = false;

  P.scns.innerHTML = SCN.map((s, i) =>
    `<button class="pg__scn${i ? "" : " is-active"}" data-i="${i}" role="tab"><i class="${s.icon}"></i><span>${s.label}<small>${s.sub}</small></span></button>`
  ).join("");
  $$(".pg__scn", P.scns).forEach((b) => b.addEventListener("click", () => loadScenario(+b.dataset.i)));

  function loadScenario(i) {
    cur = SCN[i];
    tone = Object.keys(cur.tones)[0];
    $$(".pg__scn", P.scns).forEach((b, k) => b.classList.toggle("is-active", k === i));
    P.icon.className = cur.icon; P.platform.textContent = cur.platform;
    P.thread.innerHTML = cur.thread.map((m) => `<div class="bubble bubble--them"><span class="bubble__who">${esc(m.who)}</span>${esc(m.t)}</div>`).join("");
    P.input.value = ""; dismissed = false; revealed = false;
    renderTones(); setGhost("", false); autoGrow();
    if (document.activeElement === P.input) condense();
  }

  function renderTones() {
    P.tones.innerHTML = Object.keys(cur.tones).map((t) =>
      `<button class="chip${t === tone ? " is-on" : ""}" role="radio" aria-checked="${t === tone}" data-t="${t}" type="button">${t}</button>`).join("");
    $$(".chip", P.tones).forEach((c) => c.addEventListener("mousedown", (e) => {
      e.preventDefault(); // keep focus in textarea
      tone = c.dataset.t; dismissed = false; revealed = false; renderTones();
      P.input.focus(); condense();
    }));
  }

  // ghost with drift-in animation for new words
  function setGhost(text, animate) {
    ghostText = text;
    P.mTyped.textContent = P.input.value;
    if (!text) { P.ghost.innerHTML = ""; P.tabBtn.classList.remove("on"); return; }
    const parts = text.split(/(\s+)/);
    P.ghost.innerHTML = parts.map((w) => `<span class="w${animate ? "" : " on"}">${esc(w)}</span>`).join("");
    P.tabBtn.classList.add("on");
    if (animate && !reduce) {
      $$(".w", P.ghost).forEach((n, k) => setTimeout(() => n.classList.add("on"), k * 22));
    } else $$(".w", P.ghost).forEach((n) => n.classList.add("on"));
  }

  function compute() {
    const v = P.input.value;
    if (dismissed || !revealed) return "";
    // prefer current tone; otherwise any tone that matches what the user is steering toward
    const order = [tone, ...Object.keys(cur.tones).filter((t) => t !== tone)];
    for (const t of order) {
      const s = cur.tones[t];
      if (s.toLowerCase().startsWith(v.toLowerCase()) && s.length > v.length) {
        if (t !== tone) { tone = t; renderTones(); }
        return s.slice(v.length);
      }
    }
    return "";
  }

  function condense() {
    clearTimeout(condTimer);
    setGhost("", false);
    condensing = true; P.cond.classList.add("on");
    condTimer = setTimeout(() => {
      condensing = false; P.cond.classList.remove("on");
      revealed = true;
      setGhost(compute(), true);
    }, reduce ? 50 : 750);
  }

  function autoGrow() {
    P.input.style.height = "auto";
    P.input.style.height = Math.max(96, P.input.scrollHeight) + "px";
  }

  function accept(all) {
    if (!ghostText) return false;
    if (all) P.input.value += ghostText;
    else {
      const m = ghostText.match(/^\s*\S+\s?/);
      P.input.value += m ? m[0] : ghostText;
    }
    P.input.setSelectionRange(P.input.value.length, P.input.value.length);
    autoGrow();
    setGhost(compute(), false);
    return true;
  }

  P.input.addEventListener("focus", () => { if (!revealed && !P.input.value) condense(); else setGhost(compute(), false); });
  P.input.addEventListener("blur", () => { clearTimeout(condTimer); P.cond.classList.remove("on"); condensing = false; });
  P.input.addEventListener("input", () => {
    autoGrow();
    if (!P.input.value) { dismissed = false; }
    if (!revealed) { condense(); return; }
    setGhost(compute(), false);
  });
  P.input.addEventListener("keydown", (e) => {
    const atEnd = P.input.selectionStart === P.input.value.length;
    if (e.key === "Tab" && ghostText && !e.shiftKey) { e.preventDefault(); accept(true); flashKey("Tab"); }
    else if (e.key === "ArrowRight" && ghostText && atEnd) { e.preventDefault(); accept(false); flashKey("→"); }
    else if (e.key === "Escape" && ghostText) { e.preventDefault(); dismissed = true; setGhost("", false); }
    else if ((e.altKey && (e.key === "]" || e.code === "BracketRight"))) {
      e.preventDefault();
      const ks = Object.keys(cur.tones); tone = ks[(ks.indexOf(tone) + 1) % ks.length];
      P.input.value = ""; dismissed = false; revealed = false; renderTones(); autoGrow(); condense();
    }
    else if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  });
  P.tabBtn.addEventListener("mousedown", (e) => { e.preventDefault(); accept(true); P.input.focus(); });
  P.send.addEventListener("click", sendMsg);

  function flashKey(label) {
    const k = $$(".pg__keys .keycap").find((n) => n.textContent.trim() === label);
    if (!k) return; k.classList.add("is-pressed"); setTimeout(() => k.classList.remove("is-pressed"), 160);
  }

  function sendMsg() {
    const v = P.input.value.trim();
    if (!v) { P.input.focus(); return; }
    P.thread.insertAdjacentHTML("beforeend", `<div class="bubble bubble--me">${esc(v)}</div>`);
    P.input.value = ""; autoGrow(); setGhost("", false); dismissed = true;
    const f = cur.follow, who = cur.thread[0].who;
    setTimeout(() => P.thread.insertAdjacentHTML("beforeend", `<div class="bubble bubble--them"><span class="bubble__who">${esc(who)}</span>${esc(f)}</div>`), 1100);
  }

  loadScenario(0);

  /* ---------- Voice dial ---------- */
  const VOICE = {
    warm: "Congrats, Maya! That's huge — you've earned every bit of it. Drinks on me this week? 🥂",
    witty: "Maya, at this rate I'll need to book a meeting just to say hi. Massive congrats, boss 😎",
    brief: "Huge news, Maya — congrats! 🎉",
    formal: "Congratulations on the promotion, Maya. Well deserved — I look forward to seeing what you lead next.",
  };
  const dial = $("#voiceDial"), vOut = $("#voiceOut"), thumb = $(".voice__thumb", dial);
  $$("button", dial).forEach((b, i) => b.addEventListener("click", () => {
    $$("button", dial).forEach((x) => x.classList.toggle("is-on", x === b));
    thumb.style.transform = `translateX(${i * 100}%)`;
    vOut.innerHTML = VOICE[b.dataset.tone].split(/(\s+)/).map((w, k) => `<span class="w" style="animation-delay:${k * 18}ms">${esc(w)}</span>`).join("");
  }));
  // auto-cycle the dial gently while visible & untouched
  let dialTouched = false, dialI = 0;
  dial.addEventListener("click", () => (dialTouched = true));
  setInterval(() => {
    if (dialTouched || !$(".card--voice").classList.contains("is-in")) return;
    dialI = (dialI + 1) % 4; $$("button", dial)[dialI].click(); dialTouched = false;
  }, 3800);

  /* ---------- Counters ---------- */
  const cio = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return; cio.unobserve(e.target);
    const el = e.target, to = parseFloat(el.dataset.count), dec = +(el.dataset.decimals || 0);
    const t0 = performance.now(), dur = 1600;
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur), v = to * (1 - Math.pow(1 - p, 4));
      el.textContent = v.toFixed(dec); if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { threshold: 0.5 });
  $$("[data-count]").forEach((n) => cio.observe(n));

  /* ---------- Manifesto: words light as you scroll ---------- */
  const mq = $("#manifestoQuote");
  (function wrapWords(node) {
    [...node.childNodes].forEach((c) => {
      if (c.nodeType === 3) {
        const frag = document.createDocumentFragment();
        c.textContent.split(/(\s+)/).forEach((w) => {
          if (!w) return;
          if (/^\s+$/.test(w)) frag.appendChild(document.createTextNode(w));
          else { const s = document.createElement("span"); s.className = "w"; s.textContent = w; frag.appendChild(s); }
        });
        c.replaceWith(frag);
      } else if (c.nodeType === 1) wrapWords(c);
    });
  })(mq);
  const mWords = $$(".w", mq), mBg = $(".manifesto__bg"), mSec = $("#manifesto");
  function onManifesto() {
    const r = mSec.getBoundingClientRect(), vh = window.innerHeight;
    const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height * 0.75)));
    const n = Math.round(p * mWords.length);
    mWords.forEach((w, i) => w.classList.toggle("lit", i < n));
    if (!reduce) mBg.style.setProperty("--py", ((r.top + r.height / 2 - vh / 2) * -0.15).toFixed(1) + "px");
  }
  window.addEventListener("scroll", onManifesto, { passive: true }); onManifesto();

  /* ---------- Billing toggle ---------- */
  const billing = $(".billing"), price = $("#proPrice"), per = $("#proPer");
  $$("button", billing).forEach((b) => b.addEventListener("click", () => {
    const y = b.dataset.bill === "y";
    $$("button", billing).forEach((x) => x.classList.toggle("is-on", x === b));
    billing.classList.toggle("is-y", y);
    price.style.transform = "translateY(-8px)"; price.style.opacity = "0";
    setTimeout(() => {
      price.textContent = y ? "4" : "6"; per.textContent = y ? "/month, billed yearly" : "/month";
      price.style.transform = ""; price.style.opacity = "";
    }, 200);
  }));

  /* ---------- FAQ: one open at a time ---------- */
  $$(".faq details").forEach((d) => d.addEventListener("toggle", () => {
    if (d.open) $$(".faq details").forEach((o) => o !== d && (o.open = false));
  }));

  /* ---------- Final Tab key: burst of stardust ---------- */
  const fk = $("#finalKey"), burst = $("#finalBurst");
  function pop() {
    const kc = $(".keycap", fk);
    kc.classList.add("is-pressed"); setTimeout(() => kc.classList.remove("is-pressed"), 150);
    for (let i = 0; i < 18; i++) {
      const s = document.createElement("i"), a = (i / 18) * Math.PI * 2, d = 80 + Math.random() * 90;
      s.style.setProperty("--bx", Math.cos(a) * d + "px"); s.style.setProperty("--by", Math.sin(a) * d + "px");
      burst.appendChild(s); setTimeout(() => s.remove(), 1000);
    }
  }
  fk.addEventListener("click", pop);
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Tab" || document.activeElement === P.input) return;
    const r = $("#cta").getBoundingClientRect();
    if (r.top < window.innerHeight * 0.6 && r.bottom > window.innerHeight * 0.4) pop();
  });
})();
