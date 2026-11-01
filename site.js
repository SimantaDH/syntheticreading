/* The Eyes Have It: a synthetic reading. Site behaviour.
   All results are read from site_data.json and interpretation.md, which the notebook writes. */
(function () {
  "use strict";

  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(hover: none)").matches;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } }
  };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  // used only if site_data.json cannot be loaded (for example when the page is opened from disk)
  var DEFAULT_PARTIAL = { total_sentences: 99, selection: [
    { part: 1, name: "Beginning", sentences: [1, 33], strategy: "first", lines_read: [1, 2, 3, 4, 5, 6, 7] },
    { part: 2, name: "Middle", sentences: [34, 66], strategy: "random", lines_read: [35, 38, 41, 42, 57, 62, 66] },
    { part: 3, name: "End", sentences: [67, 99], strategy: "last", lines_read: [93, 94, 95, 96, 97, 98, 99] }
  ]};

  var state = { data: null, view: "scenes", figures: [], lbIndex: 0, citeStyle: "mla" };

  /* ================================================================ theme */
  function isDark() {
    var t = root.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  $("#theme-toggle").addEventListener("click", function () {
    var next = isDark() ? "light" : "dark";
    root.setAttribute("data-theme", next);
    store.set("eyes-theme", next);
    drawChart(false);
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
    if (!root.getAttribute("data-theme")) drawChart(false);
  });

  /* ================================================================ top bar, nav, progress, back to top */
  var hero = $(".hero"), topbar = $(".topbar"), heroVisible = true;
  var reveal = null;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
      topbar.classList.toggle("on-hero", entries[0].intersectionRatio > 0.12);
    }, { threshold: [0, 0.12, 0.5] }).observe(hero);

    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        $$(".navlinks a").forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$(".navlinks a").forEach(function (a) {
      var t = document.getElementById(a.getAttribute("href").slice(1));
      if (t) navObserver.observe(t);
    });

    // a beam of lamplight passes over each section title once
    var sweepObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("lit"); sweepObserver.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -15% 0px" });
    $$("h2.sweep").forEach(function (h) { sweepObserver.observe(h); });

    // cards and blocks rise into the light as they are reached
    reveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); reveal.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
  }
  function rise(nodes) {
    nodes.forEach(function (n, i) {
      n.classList.add("rise"); n.style.setProperty("--d", (i % 6) * 70 + "ms");
      if (reveal && !reduceMotion) reveal.observe(n); else n.classList.add("in");
    });
  }
  rise($$(".imp"));

  var bar = $("#progress-bar"), toTop = $("#to-top"), steps = $("#steps");
  var stepItems = steps ? $$("li", steps) : [];
  function onScroll() {
    var doc = document.documentElement, max = doc.scrollHeight - innerHeight;
    bar.style.transform = "scaleX(" + (max > 0 ? clamp(scrollY / max, 0, 1) : 0) + ")";
    toTop.classList.toggle("show", scrollY > innerHeight * 0.9);
    if (steps) {
      var r = steps.getBoundingClientRect(), line = innerHeight * 0.62;
      steps.style.setProperty("--fill", clamp((line - r.top) / r.height, 0, 1).toFixed(3));
      stepItems.forEach(function (li) { li.classList.toggle("reached", li.getBoundingClientRect().top < line); });
    }
  }
  var scrollQueued = false;
  addEventListener("scroll", function () {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(function () { scrollQueued = false; onScroll(); });
  }, { passive: true });
  toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }); });
  onScroll();

  /* ================================================================ spotlight that follows the pointer over panels */
  function addSpot(node) {
    if (coarse || !node || node.dataset.spot) return;
    node.dataset.spot = "1";
    node.classList.add("spot");
    node.addEventListener("pointermove", function (e) {
      var r = node.getBoundingClientRect();
      node.style.setProperty("--mx", (e.clientX - r.left) + "px");
      node.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  }
  $$(".chart-fig, .cite-box, .prompt-wrap, .imp").forEach(addSpot);

  var portrait = $("#portrait");
  if (portrait && !coarse) portrait.addEventListener("pointermove", function (e) {
    var r = portrait.getBoundingClientRect();
    portrait.style.setProperty("--mx", (e.clientX - r.left) + "px");
    portrait.style.setProperty("--my", (e.clientY - r.top) + "px");
  });

  /* ================================================================ the lamp */
  var lampTexts = $$(".hero .lamp-text");
  var title = $(".hero-title");
  var lamp = { x: 0, y: 0, r: 0, glow: 0.14 };
  var mode = "intro";          // intro | rest | follow | wander
  var target = null, lastMove = 0, raf = 0, t0 = performance.now();

  function heroRect() { return hero.getBoundingClientRect(); }
  function titleCentre() {
    var h = heroRect(), t = title.getBoundingClientRect();
    return { x: t.left - h.left + t.width / 2, y: t.top - h.top + t.height / 2, w: t.width };
  }
  function restRadius() { return Math.max(title.offsetWidth * 0.78, 260); }
  function pointerRadius() { return clamp(innerWidth * 0.2, 170, 300); }

  function applyLamp(flick) {
    var h = heroRect();
    var r = lamp.r * (1 + flick * 0.035);
    hero.style.setProperty("--hx", lamp.x + "px");
    hero.style.setProperty("--hy", lamp.y + "px");
    hero.style.setProperty("--glow", (0.13 + flick * 0.025).toFixed(3));
    lampTexts.forEach(function (t) {
      var b = t.getBoundingClientRect();
      t.style.setProperty("--x", (lamp.x - (b.left - h.left)).toFixed(1) + "px");
      t.style.setProperty("--y", (lamp.y - (b.top - h.top)).toFixed(1) + "px");
      t.style.setProperty("--r", r.toFixed(1) + "px");
    });
    warmWindows(h);
  }

  var heroWins = [];
  function warmWindows(h) {
    if (!heroWins.length) return;
    var reach = lamp.r * 0.9;
    heroWins.forEach(function (w) {
      var b = w.getBoundingClientRect();
      var dx = b.left + b.width / 2 - h.left - lamp.x, dy = b.top + b.height / 2 - h.top - lamp.y;
      var near = clamp(1 - Math.sqrt(dx * dx + dy * dy) / reach, 0, 1);
      var v = near > 0 ? (near * near).toFixed(2) : "0";
      if (w._near !== v) { w._near = v; w.style.setProperty("--near", v); }
    });
  }

  function flicker(t) {
    if (reduceMotion) return 0;
    return Math.sin(t * 0.0021) * 0.5 + Math.sin(t * 0.0057 + 1.3) * 0.3 + Math.sin(t * 0.013 + 0.4) * 0.2;
  }

  function tick(now) {
    raf = 0;
    if (!heroVisible || document.hidden) return;
    var c = titleCentre();
    if (mode === "intro") {
      var k = clamp((now - t0 - 350) / 1600, 0, 1), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      lamp.x = c.x - c.w * 0.62 + c.w * 1.24 * e; lamp.y = c.y; lamp.r = 130 + 80 * Math.sin(Math.PI * k);
      if (k >= 1) { mode = "rest"; target = { x: c.x, y: c.y, r: restRadius() }; lastMove = now; }
    } else if (mode === "follow" && target) {
      lamp.x += (target.x - lamp.x) * 0.22; lamp.y += (target.y - lamp.y) * 0.22; lamp.r += (target.r - lamp.r) * 0.15;
      if (now - lastMove > 3200 && !coarse) { mode = "rest"; target = { x: c.x, y: c.y, r: restRadius() }; lastMove = now; }
    } else if (mode === "rest" && target) {
      lamp.x += (target.x - lamp.x) * 0.06; lamp.y += (target.y - lamp.y) * 0.06; lamp.r += (target.r - lamp.r) * 0.06;
      if (!reduceMotion && now - lastMove > 4200) { mode = "wander"; t0 = now; }
    } else if (mode === "wander") {
      var s = (now - t0) / 1000;
      var epi = $(".epi-quote").getBoundingClientRect(), h = heroRect();
      var ey = epi.top - h.top + epi.height / 2;
      var mid = (c.y + ey) / 2, amp = (ey - c.y) / 2;
      var tx = c.x + Math.sin(s * 0.42) * c.w * 0.38;
      var ty = mid - Math.cos(s * 0.27) * amp;
      lamp.x += (tx - lamp.x) * 0.05; lamp.y += (ty - lamp.y) * 0.05;
      lamp.r += (Math.max(c.w * 0.42, 220) - lamp.r) * 0.04;
    }
    applyLamp(flicker(now));
    raf = requestAnimationFrame(tick);
  }
  function wake() { if (!raf) raf = requestAnimationFrame(tick); }

  hero.addEventListener("pointermove", function (ev) {
    var h = heroRect();
    mode = "follow"; lastMove = performance.now();
    target = { x: ev.clientX - h.left, y: ev.clientY - h.top, r: pointerRadius() };
    wake();
  });
  hero.addEventListener("pointerleave", function () {
    var c = titleCentre();
    mode = "rest"; lastMove = performance.now(); target = { x: c.x, y: c.y, r: restRadius() }; wake();
  });
  addEventListener("resize", function () { if (mode === "rest") { var c = titleCentre(); target = { x: c.x, y: c.y, r: restRadius() }; } wake(); });
  document.addEventListener("visibilitychange", wake);
  addEventListener("scroll", function () { if (heroVisible) wake(); }, { passive: true });

  if (reduceMotion) {
    var c0 = titleCentre(); lamp.x = c0.x; lamp.y = c0.y; lamp.r = restRadius(); mode = "rest"; target = { x: c0.x, y: c0.y, r: lamp.r };
    applyLamp(0);
  } else {
    var c1 = titleCentre(); lamp.x = c1.x - c1.w * 0.62; lamp.y = c1.y; lamp.r = 120; applyLamp(0);
  }
  wake();

  /* ================================================================ dust in the lamplight */
  (function motes() {
    var canvas = $("#motes");
    if (!canvas || reduceMotion || !canvas.getContext) return;
    var ctx = canvas.getContext("2d"), dpr = Math.min(devicePixelRatio || 1, 2), W = 0, H = 0, ps = [];
    function size() {
      var r = hero.getBoundingClientRect();
      W = r.width; H = r.height; canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(clamp(W * H / 14000, 28, 90));
      ps = [];
      for (var i = 0; i < n; i++) ps.push({ x: Math.random() * W, y: Math.random() * H, r: 0.5 + Math.random() * 1.6,
        vx: (Math.random() - 0.5) * 0.12, vy: -0.05 - Math.random() * 0.18, ph: Math.random() * 6.28 });
    }
    size(); addEventListener("resize", size);
    function frame(now) {
      if (heroVisible && !document.hidden) {
        ctx.clearRect(0, 0, W, H);
        var R = Math.max(lamp.r * 1.25, 160);
        for (var i = 0; i < ps.length; i++) {
          var p = ps[i];
          p.x += p.vx + Math.sin(now * 0.0004 + p.ph) * 0.08; p.y += p.vy;
          if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
          if (p.x < -5) p.x = W + 5; else if (p.x > W + 5) p.x = -5;
          var dx = p.x - lamp.x, dy = p.y - lamp.y, d = Math.sqrt(dx * dx + dy * dy);
          var a = 0.035 + 0.75 * Math.pow(clamp(1 - d / R, 0, 1), 1.6);
          a *= 0.75 + 0.25 * Math.sin(now * 0.002 + p.ph);
          if (a < 0.03) continue;
          ctx.beginPath();
          ctx.fillStyle = "rgba(244, 220, 168, " + a.toFixed(3) + ")";
          ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();

  /* ================================================================ the train of sentences */
  function buildTrain(node, partial, interactive) {
    node.innerHTML = "";
    var lit = {}, order = 0;
    partial.selection.forEach(function (p) { p.lines_read.forEach(function (n) { lit[n] = true; }); });
    partial.selection.forEach(function (p) {
      var car = el("div", "carriage");
      car.setAttribute("data-label", p.name + " part, sentences " + p.sentences[0] + " to " + p.sentences[1] + " (" + p.strategy + " 20%)");
      for (var n = p.sentences[0]; n <= p.sentences[1]; n++) {
        var w = document.createElement(interactive ? "button" : "span");
        w.className = "win" + (lit[n] ? " lit" : "");
        if (lit[n]) w.style.setProperty("--i", order++);
        if (interactive) {
          w.type = "button";
          w.tabIndex = n === p.sentences[0] ? 0 : -1;
          w.dataset.n = n; w.dataset.part = p.name.toLowerCase(); w.dataset.read = lit[n] ? "1" : "";
          w.setAttribute("aria-label", "Sentence " + n + ", " + p.name.toLowerCase() + " part" + (lit[n] ? ", read before interpretation" : ""));
        }
        car.appendChild(w);
      }
      node.appendChild(car);
    });
    if (!interactive) { heroWins = $$(".win", node); return; }
    var tip = $("#train-tip");
    function describe(w) {
      tip.textContent = "Sentence " + w.dataset.n + " of " + partial.total_sentences + ", in the " + w.dataset.part + " part: " +
        (w.dataset.read ? "read before the interpretation was written." : "not read until after the impression was written.");
    }
    node.onpointerover = function (e) { if (e.target.classList.contains("win")) describe(e.target); };
    node.onfocusin = function (e) { if (e.target.classList.contains("win")) describe(e.target); };
    node.onkeydown = function (e) {
      var w = e.target;
      if (!w.classList.contains("win")) return;
      var next = e.key === "ArrowRight" ? w.nextElementSibling : e.key === "ArrowLeft" ? w.previousElementSibling : null;
      if (!next) return;
      e.preventDefault(); w.tabIndex = -1; next.tabIndex = 0; next.focus();
    };
  }
  function lightWhenSeen(node, cls, threshold) {
    if (!node) return;
    if (!("IntersectionObserver" in window) || reduceMotion) { node.classList.add(cls); return; }
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { node.classList.add(cls); io.disconnect(); }
    }, { threshold: threshold || 0.4 });
    io.observe(node);
  }

  /* ================================================================ data binding + counters */
  function get(obj, path) { return path.split(".").reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj); }
  function fmt(v) { return typeof v === "number" ? v.toLocaleString("en-GB") : (v == null ? "—" : String(v)); }
  function enrich(d) {
    d.run.model_short = String(d.run.model || "").split(" (")[0];
    d.run.removed_count = (d.run.removed || []).length;
    d.corpus.sha_short = d.corpus.sha256 ? d.corpus.sha256.slice(0, 16) + "…" : "not recorded";
    d.segments_count = d.segments.length;
    return d;
  }
  function fillData(d) {
    $$("[data-k]").forEach(function (node) {
      var v = get(d, node.getAttribute("data-k"));
      if (v !== undefined && v !== null) node.textContent = fmt(v);
    });
    var model = $("#run-desc");
    model.textContent = "";
    model.append("The phrases were extracted by ");
    model.appendChild(el("strong", null, d.run.model_short));
    var rest = String(d.run.model).slice(d.run.model_short.length).replace(/^\s*\(|\)\s*$/g, "");
    model.append((rest ? " (" + rest + ")" : "") + " on " + d.run.date + ", at temperature 0 with seed 42 and structured JSON output, once for each of the three chunks of the story.");
    // abstract: the verdicts in one sentence
    var groups = {};
    d.claims.forEach(function (c) { (groups[c.verdict] = groups[c.verdict] || []).push(c.id); });
    var words = ["none", "one", "two", "three", "four"];
    var order = ["Supported", "Partly supported", "Not supported", "Inconclusive"];
    var parts = order.filter(function (k) { return groups[k]; }).map(function (k) {
      var ids = groups[k], n = ids.length;
      var verb = k === "Inconclusive" ? (n === 1 ? "was inconclusive" : "were inconclusive") : (n === 1 ? "was " : "were ") + k.toLowerCase();
      return (words[n] || n) + " " + verb + " (" + ids.join(", ") + ")";
    });
    var sentence = parts.length > 1 ? parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1] : parts[0];
    $("#abstract-claims").textContent = "Four claims were stated before the full reading and tested against the counts by rules written in advance: " + sentence + ".";
  }
  function startCounters() {
    if (reduceMotion || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var node = e.target, final = node.textContent.trim(), num = parseFloat(final.replace(/,/g, ""));
        if (!isFinite(num)) return;
        var start = performance.now();
        (function step(now) {
          var k = clamp((now - start) / 1200, 0, 1), eased = 1 - Math.pow(1 - k, 3);
          node.textContent = k < 1 ? Math.round(num * eased).toLocaleString("en-GB") : final;
          if (k < 1) requestAnimationFrame(step);
        })(start);
      });
    }, { threshold: 0.6 });
    $$(".count").forEach(function (node) { io.observe(node); });
  }

  /* ================================================================ dimensions (accordion) */
  function buildDims(d) {
    var box = $("#dims"); box.innerHTML = "";
    d.dimensions.forEach(function (dim, i) {
      var det = el("details", "dim dim-" + i);
      var sum = el("summary");
      sum.appendChild(el("span", "dim-n", String(i + 1)));
      var t = el("span", "dim-t"); t.appendChild(el("strong", null, dim.label)); t.appendChild(el("span", "dim-def", dim.definition));
      sum.appendChild(t);
      det.appendChild(sum);
      var dl = el("dl", "subs");
      dim.subs.forEach(function (s, j) {
        var row = el("div");
        row.appendChild(el("dt", null, "(" + "abc"[j] + ") " + s.label));
        row.appendChild(el("dd", null, s.definition));
        dl.appendChild(row);
      });
      det.appendChild(dl);
      box.appendChild(det);
    });
    rise($$(".dim", box));
  }

  /* ================================================================ lexicon explorer */
  function buildLexicon(d) {
    var tabs = $("#lex-tabs"), panel = $("#lexicon");
    tabs.innerHTML = "";
    function show(i, focus) {
      $$("button", tabs).forEach(function (b, k) { b.setAttribute("aria-selected", String(k === i)); b.tabIndex = k === i ? 0 : -1; });
      if (focus) $$("button", tabs)[i].focus();
      var dim = d.dimensions[i];
      panel.innerHTML = "";
      panel.className = "lexicon dimc-" + i + (reduceMotion ? "" : " fresh");
      dim.subs.forEach(function (s) {
        var sec = el("div", "lex-sub");
        var h = el("h4", null, s.label);
        var total = s.items.reduce(function (a, it) { return a + it.hits; }, 0);
        h.appendChild(el("span", "lex-total", s.items.length + (s.items.length === 1 ? " phrase, " : " phrases, ") + total + (total === 1 ? " hit" : " hits")));
        sec.appendChild(h);
        sec.appendChild(el("p", "lex-def", s.definition));
        var ul = el("ul", "chips");
        if (!s.items.length) ul.appendChild(el("li", "chip none", "No phrase was kept for this sub-type."));
        s.items.forEach(function (it, k) {
          var li = el("li", "chip" + (it.hits ? "" : " zero"));
          li.style.setProperty("--k", k);
          li.appendChild(el("span", "chip-t", it.phrase));
          li.appendChild(el("span", "chip-n", String(it.hits)));
          li.title = it.hits ? "Counted " + it.hits + (it.hits === 1 ? " time" : " times") : "Not counted on its own: a longer phrase covers it";
          ul.appendChild(li);
        });
        sec.appendChild(ul);
        panel.appendChild(sec);
      });
      void panel.offsetWidth; panel.classList.remove("fresh");
    }
    d.dimensions.forEach(function (dim, i) {
      var b = el("button", null, dim.label);
      b.type = "button"; b.setAttribute("role", "tab");
      b.addEventListener("click", function () { show(i, false); });
      tabs.appendChild(b);
    });
    tabs.addEventListener("keydown", function (e) {
      var bs = $$("button", tabs), i = bs.indexOf(document.activeElement);
      if (i < 0 || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
      e.preventDefault(); show((i + (e.key === "ArrowRight" ? 1 : -1) + bs.length) % bs.length, true);
    });
    show(0, false);
    var list = $("#removed-list"); list.innerHTML = "";
    var label = {}; d.dimensions.forEach(function (dim) { dim.subs.forEach(function (s) { label[dim.key + "|" + s.key] = dim.label + " / " + s.label.toLowerCase(); }); });
    (d.run.removed || []).forEach(function (r) {
      var li = el("li");
      li.appendChild(el("q", null, r.phrase));
      li.append(" (" + (label[r.dimension + "|" + r.sub] || r.dimension + " / " + r.sub) + "): " + r.reason.replace(/_/g, " ") + ".");
      list.appendChild(li);
    });
    if (!(d.run.removed || []).length) list.appendChild(el("li", null, "No phrase was removed."));
    $("#removed summary").textContent = "Phrases removed in verification (" + (d.run.removed || []).length + ")";
  }

  /* ================================================================ story map and voices */
  function buildStoryMap(d) {
    var map = $("#storymap"), tip = $("#scene-tip");
    map.innerHTML = "";
    d.stages.forEach(function (st, si) {
      var g = el("div", "stage-group st-" + si);
      g.style.flexGrow = st.words;
      g.appendChild(el("span", "stage-label", st.name));
      var row = el("div", "scenes");
      d.segments.filter(function (s) { return s.stage === st.name; }).forEach(function (s) {
        var b = el("button", "scene", String(s.id));
        b.type = "button"; b.setAttribute("role", "listitem");
        b.style.flexGrow = s.words; b.style.setProperty("--i", s.id);
        var txt = "Scene " + s.id + " · " + s.stage + " · sentences " + s.sentences.replace("-", "–") + " · " + s.words + " words: " + s.note;
        b.setAttribute("aria-label", txt);
        var say = function () { tip.textContent = txt; };
        b.addEventListener("pointerenter", say); b.addEventListener("focus", say);
        row.appendChild(b);
      });
      g.appendChild(row);
      map.appendChild(g);
    });
    lightWhenSeen(map, "drawn", 0.3);
    var vb = $("#voicebar"); vb.innerHTML = "";
    var total = d.voices.reduce(function (a, v) { return a + v.words; }, 0);
    d.voices.forEach(function (v, i) {
      var s = el("div", "voice v-" + i);
      s.style.flexGrow = v.words;
      s.appendChild(el("strong", null, v.label));
      s.appendChild(el("span", null, v.words + " words (" + Math.round(100 * v.words / total) + "%) · " + v.questions + (v.questions === 1 ? " question" : " questions")));
      vb.appendChild(s);
    });
    lightWhenSeen(vb, "drawn", 0.3);
  }

  /* ================================================================ charts */
  function palette() {
    var dark = isDark(), cs = getComputedStyle(root);
    return {
      dark: dark, ink: cs.getPropertyValue("--ink").trim(), soft: cs.getPropertyValue("--chart-ink").trim(),
      grid: cs.getPropertyValue("--chart-grid").trim(), paper: cs.getPropertyValue("--paper").trim(),
      dims: dark ? ["#e8b65a", "#e46d9f", "#7fbf95", "#7aa7e0"] : ["#b7801f", "#a3285f", "#3f7a52", "#2a5b9a"],
      stage: cs.getPropertyValue("--dahlia").trim(),
      heat: dark ? [[0, cs.getPropertyValue("--paper").trim()], [0.001, "#3a2f1e"], [0.35, "#7a5a26"], [0.7, "#c8902e"], [1, "#f4dca8"]]
                 : [[0, "#eef0eb"], [0.001, "#f6e7c4"], [0.35, "#e8b65a"], [0.7, "#b85a3c"], [1, "#7a1f47"]]
    };
  }
  function baseLayout(c, extra, animate) {
    var l = {
      paper_bgcolor: c.paper, plot_bgcolor: c.paper,
      font: { family: "Literata, Georgia, serif", size: 13, color: c.soft },
      margin: { l: 56, r: 16, t: 40, b: 56 },
      hoverlabel: { bgcolor: c.dark ? "#232a38" : "#ffffff", bordercolor: c.grid, font: { family: "Literata, Georgia, serif", color: c.ink }, align: "left" },
      legend: { orientation: "h", x: 0, y: -0.2, font: { size: 12, color: c.ink }, bgcolor: "rgba(0,0,0,0)" }
    };
    if (animate && !reduceMotion) l.transition = { duration: 550, easing: "cubic-in-out" };
    for (var k in extra) l[k] = extra[k];
    return l;
  }
  var CONFIG = { responsive: true, displaylogo: false, modeBarButtonsToRemove: ["select2d", "lasso2d", "autoScale2d", "toggleSpikelines"] };
  var VIEW_FIG = { scenes: 1, stages: 3, voices: 6, timeline: 4 };
  function f2(x) { return (Math.round(x * 100) / 100).toFixed(2); }

  function stageMarks(c, d, yTop) {
    var shapes = [], ann = [];
    d.stages.forEach(function (st) {
      var ids = d.segments.filter(function (s) { return s.stage === st.name; }).map(function (s) { return s.id; });
      var a = Math.min.apply(null, ids), b = Math.max.apply(null, ids);
      if (a !== 1) shapes.push({ type: "line", xref: "x", yref: "paper", x0: a - 0.5, x1: a - 0.5, y0: 0, y1: 1, line: { color: c.stage, width: 1.4, dash: "dot" } });
      ann.push({ text: innerWidth < 640 ? st.name.split(".")[0] : st.name, xref: "x", yref: "paper", x: (a + b) / 2, y: yTop, yanchor: "bottom", showarrow: false, font: { size: 11.5, color: c.stage } });
    });
    return { shapes: shapes, annotations: ann };
  }

  function drawChart(animate) {
    var d = state.data;
    if (!d) return;
    var box = $("#chart-main");
    var fig = d.figures[VIEW_FIG[state.view] - 1] || {};
    $("#chart-how").textContent = fig.how || "";
    $("#chart-shows").textContent = fig.shows || "";
    if (!window.Plotly) {
      box.innerHTML = '<p class="chart-empty">The interactive chart needs the Plotly library, which loads from the internet. The JPG figures below show the same results.</p>';
      return;
    }
    var c = palette(), dims = d.dimensions, ids = d.segments.map(function (s) { return s.id; }), traces = [], layout;
    var labels = dims.map(function (x, i) { return (i + 1) + ". " + x.label; });
    var narrow = innerWidth < 640;
    if (state.view === "scenes") {
      var z = dims.map(function (x) { return d.counts.segment_density[x.key]; });
      var raw = dims.map(function (x) { return d.counts.segment[x.key]; });
      var hover = dims.map(function (x, a) {
        return ids.map(function (i, b) {
          var s = d.segments[b];
          return "<b>" + esc(labels[a]) + "</b><br>Scene " + i + ": " + esc(s.note) + "<br>" + raw[a][b] + " hit(s) = " + f2(z[a][b]) +
            " per 100 words<br>" + esc(d.segment_items[x.key][b]);
        });
      });
      traces.push({ type: "heatmap", z: z, x: ids, y: narrow ? dims.map(function (x, i) { return "D" + (i + 1); }) : labels,
        customdata: hover, hovertemplate: "%{customdata}<extra></extra>", colorscale: c.heat, xgap: 3, ygap: 3,
        text: raw.map(function (r) { return r.map(function (v) { return v ? String(v) : ""; }); }), texttemplate: "%{text}", textfont: { size: 12 },
        colorbar: { title: { text: "per 100<br>words", font: { size: 11 } }, thickness: 12, outlinewidth: 0, tickfont: { size: 10 } } });
      var m = stageMarks(c, d, 1.0);
      layout = baseLayout(c, { shapes: m.shapes, annotations: m.annotations, margin: { l: narrow ? 30 : 230, r: 10, t: 40, b: 56 },
        xaxis: { dtick: 1, range: [0.5, ids.length + 0.5], title: { text: "Scene (in story order)", font: { size: 12 } }, fixedrange: true, showgrid: false },
        yaxis: { type: "category", autorange: "reversed", tickfont: { size: 12, color: c.ink }, fixedrange: true, showgrid: false } }, false);
    } else if (state.view === "stages" || state.view === "voices") {
      var stages = state.view === "stages";
      var xs = stages ? d.stages.map(function (s) { return s.name; }) : d.voices.map(function (v) { return v.label; });
      var words = stages ? d.stages.map(function (s) { return s.words; }) : d.voices.map(function (v) { return v.words; });
      dims.forEach(function (x, i) {
        var cnt = stages ? d.counts.stage[x.key] : d.counts.voice[x.key];
        var den = stages ? d.counts.stage_density[x.key] : d.counts.voice_density[x.key];
        traces.push({ type: "bar", name: labels[i], x: xs, y: den, marker: { color: c.dims[i], line: { color: c.paper, width: 1 } },
          customdata: xs.map(function (_, k) { return [cnt[k], words[k], stages ? "" : esc(d.voice_items[x.key][k])]; }),
          hovertemplate: "%{x}<br><b>" + esc(labels[i]) + "</b><br>%{y:.2f} per 100 words<br>(%{customdata[0]} hits in %{customdata[1]} words)" +
            (stages ? "" : "<br>%{customdata[2]}") + "<extra></extra>" });
      });
      layout = baseLayout(c, { barmode: "group", bargap: 0.22, bargroupgap: 0.06,
        xaxis: { fixedrange: true, tickfont: { size: narrow ? 10 : 12.5, color: c.ink } },
        yaxis: { gridcolor: c.grid, zeroline: false, title: { text: "Hits per 100 words" + (stages ? "" : " of the voice"), font: { size: 12 } }, fixedrange: true } }, animate);
    } else {
      dims.forEach(function (x, i) {
        traces.push({ type: "scatter", mode: "lines+markers", name: labels[i], x: ids, y: d.counts.segment_density[x.key],
          line: { color: c.dims[i], width: 2.6, shape: "spline", smoothing: 0.5 }, marker: { size: 8, color: c.dims[i], line: { color: c.paper, width: 1.5 } },
          customdata: ids.map(function (_, b) { return [d.counts.segment[x.key][b], d.segments[b].words, esc(d.segments[b].note)]; }),
          hovertemplate: "Scene %{x}: %{customdata[2]}<br><b>" + esc(labels[i]) + "</b><br>%{y:.2f} per 100 words (%{customdata[0]} hits in %{customdata[1]} words)<extra></extra>" });
      });
      var m2 = stageMarks(c, d, 1.0);
      layout = baseLayout(c, { shapes: m2.shapes, annotations: m2.annotations, hovermode: "closest",
        xaxis: { dtick: 1, range: [0.5, ids.length + 0.5], gridcolor: c.grid, title: { text: "Scene (in story order)", font: { size: 12 } }, fixedrange: true },
        yaxis: { gridcolor: c.grid, zeroline: false, rangemode: "tozero", title: { text: "Hits per 100 words", font: { size: 12 } }, fixedrange: true } }, animate);
    }
    if (narrow) layout.legend.font.size = 11;
    Plotly.react(box, traces, layout, CONFIG);
  }
  var seg = $(".seg");
  $$(".seg button").forEach(function (b, i) {
    b.addEventListener("click", function () {
      state.view = b.dataset.view;
      seg.style.setProperty("--seg-x", (i * 100) + "%");
      $$(".seg button").forEach(function (x) { x.setAttribute("aria-checked", String(x === b)); });
      var fig = $("#chart-main").closest(".chart-fig");
      if (!reduceMotion) { fig.classList.remove("swap"); void fig.offsetWidth; fig.classList.add("swap"); }
      drawChart(true);
    });
  });
  var resizeT = 0;
  addEventListener("resize", function () { clearTimeout(resizeT); resizeT = setTimeout(function () { drawChart(false); }, 250); });

  /* ================================================================ verdicts */
  function buildVerdicts(d) {
    var dl = $("#verdicts"); dl.innerHTML = "";
    var cls = { "Supported": "yes", "Partly supported": "partly", "Not supported": "no", "Inconclusive": "open" };
    d.claims.forEach(function (c) {
      var box = el("div", cls[c.verdict] || "open");
      var dt = el("dt");
      dt.appendChild(el("span", "badge", c.verdict));
      dt.append(" " + c.id);
      box.appendChild(dt);
      var dd = el("dd");
      dd.appendChild(el("p", "claim-s", c.statement));
      var ev = el("p", "claim-e"); ev.appendChild(el("strong", null, "Evidence. ")); ev.append(c.evidence.charAt(0).toUpperCase() + c.evidence.slice(1) + ".");
      dd.appendChild(ev);
      box.appendChild(dd);
      addSpot(box);
      dl.appendChild(box);
    });
    rise($$("#verdicts > div"));
  }

  /* ================================================================ gallery + lightbox */
  var lb = $("#lightbox"), lbImg = $("#lb-img");
  function showFigure(i, swap) {
    var figs = state.figures, f = figs[(i + figs.length) % figs.length];
    state.lbIndex = (i + figs.length) % figs.length;
    var apply = function () {
      lbImg.src = f.file + ".jpg"; lbImg.alt = f.title;
      $("#lb-caption").textContent = f.title + (f.shows ? " " + f.shows : "");
      $("#lb-count").textContent = "Figure " + (state.lbIndex + 1) + " of " + figs.length;
      $("#lb-html").href = f.file + ".html";
      $("#lb-jpg").href = lbImg.src;
      lbImg.classList.remove("swap");
    };
    if (swap && !reduceMotion) { lbImg.classList.add("swap"); setTimeout(apply, 180); } else apply();
  }
  function buildGallery(figs) {
    state.figures = figs;
    var g = $("#gallery");
    g.innerHTML = "";
    figs.forEach(function (f, i) {
      var b = el("button", "thumb"); b.type = "button";
      var frame = el("div", "frame");
      var img = document.createElement("img");
      img.src = f.file + ".jpg"; img.alt = f.title; img.loading = "lazy";
      frame.appendChild(img);
      b.appendChild(frame); b.appendChild(el("span", null, f.title));
      b.addEventListener("click", function () {
        showFigure(i, false);
        if (lb.showModal) lb.showModal(); else window.open(img.src, "_blank");
      });
      addSpot(b);
      g.appendChild(b);
    });
    rise($$(".thumb", g));
  }
  $("#lb-prev").addEventListener("click", function () { showFigure(state.lbIndex - 1, true); });
  $("#lb-next").addEventListener("click", function () { showFigure(state.lbIndex + 1, true); });
  lb.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { e.preventDefault(); showFigure(state.lbIndex - 1, true); }
    if (e.key === "ArrowRight") { e.preventDefault(); showFigure(state.lbIndex + 1, true); }
  });
  lb.addEventListener("click", function (e) { if (e.target === lb) lb.close(); });

  /* ================================================================ the essay */
  function inline(t) {
    t = esc(t);
    t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
    return t.replace(/(https?:\/\/[^\s<]+[^\s<.,;)])/g, '<a href="$1">$1</a>');
  }
  function renderEssay(md) {
    var out = [], list = false, toc = [], n = 0;
    md.split(/\r?\n/).forEach(function (line) {
      if (/^- /.test(line)) { if (!list) { out.push("<ul>"); list = true; } out.push("<li>" + inline(line.slice(2)) + "</li>"); return; }
      if (list) { out.push("</ul>"); list = false; }
      if (/^## /.test(line)) {
        var text = line.slice(3), id = "essay-" + (++n);
        toc.push({ id: id, text: text.replace(/^\d+\.\d+\s+/, ""), num: (text.match(/^(\d+\.\d+)/) || [, ""])[1] });
        out.push('<h3 id="' + id + '">' + inline(text) + "</h3>");
      } else if (/^# /.test(line)) { /* the essay title: the section already has one */ }
      else if (line.trim()) out.push("<p>" + inline(line) + "</p>");
    });
    if (list) out.push("</ul>");
    $("#essay-body").innerHTML = out.join("\n");
    var nav = $("#essay-toc"); nav.innerHTML = "";
    toc.forEach(function (t) {
      var a = el("a"); a.href = "#" + t.id;
      if (t.num) a.appendChild(el("span", "toc-n", t.num));
      a.append(t.text);
      nav.appendChild(a);
    });
    rise($$("#essay-body h3"));
  }

  /* ================================================================ prompt */
  function copyText(btn, plain, html, label) {
    var done = function () { btn.textContent = "Copied"; btn.classList.add("done");
      setTimeout(function () { btn.textContent = label; btn.classList.remove("done"); }, 1800); };
    try {
      if (html && window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
        navigator.clipboard.write([new ClipboardItem({
          "text/plain": new Blob([plain], { type: "text/plain" }), "text/html": new Blob([html], { type: "text/html" })
        })]).then(done, function () { navigator.clipboard.writeText(plain).then(done); });
        return;
      }
      if (navigator.clipboard) { navigator.clipboard.writeText(plain).then(done); return; }
    } catch (e) { /* clipboard unavailable */ }
  }
  $("#copy-prompt").addEventListener("click", function () { copyText(this, $("#prompt-text").textContent, null, "Copy prompt"); });

  /* ================================================================ citation machine */
  var MLA_M = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];
  var FULL_M = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var IEEE_M = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."];
  var SITE_URL = "https://simantadh.github.io/syntheticreading/";
  var REPO_URL = "https://github.com/SimantaDH/syntheticreading";
  function citations() {
    var dt = new Date(), day = dt.getDate(), mo = dt.getMonth(), yr = dt.getFullYear(), url = SITE_URL;
    var iso = yr + "-" + String(mo + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
    var T = "Synthetic Reading of Ruskin Bond’s “The Eyes Have It”: Sight, Blindness and the Conversation of Concealment";
    var Tsent = "Synthetic reading of Ruskin Bond’s “The eyes have it”: Sight, blindness and the conversation of concealment";
    var Tharv = "Synthetic reading of Ruskin Bond’s ‘The Eyes Have It’: sight, blindness and the conversation of concealment";
    var inst = "Indian Institute of Technology (ISM) Dhanbad";
    var a = function () { return '<a href="' + url + '">' + url + "</a>"; };
    return {
      mla: { html: "Nandi, Simanta. <i>" + T + "</i>. " + inst + ", 2026, " + a() + ". Accessed " + day + " " + MLA_M[mo] + " " + yr + "." },
      apa: { html: "Nandi, S. (2026). <i>" + Tsent + "</i> [Digital humanities project]. " + inst + ". " + a() },
      chicago: { html: "Nandi, Simanta. <i>" + T + "</i>. Dhanbad: " + inst + ", 2026. Accessed " + FULL_M[mo] + " " + day + ", " + yr + ". " + a() + "." },
      harvard: { html: "Nandi, S. (2026) <i>" + Tharv + "</i>. Dhanbad: " + inst + ". Available at: " + a() + " (Accessed: " + day + " " + FULL_M[mo] + " " + yr + ")." },
      ieee: { html: "S. Nandi, “Synthetic reading of Ruskin Bond’s ‘The Eyes Have It’: Sight, blindness and the conversation of concealment,” " + inst + ", 2026. [Online]. Available: " + a() + ". [Accessed: " + IEEE_M[mo] + " " + day + ", " + yr + "]." },
      bibtex: { pre: "@misc{nandi2026eyes,\n  author       = {Nandi, Simanta},\n  title        = {Synthetic Reading of Ruskin Bond's ``The Eyes Have It'': Sight, Blindness and the Conversation of Concealment},\n  year         = {2026},\n  howpublished = {Digital humanities project, Indian Institute of Technology (ISM) Dhanbad},\n  url          = {" + url + "},\n  note         = {Accessed: " + iso + ". Licensed under CC BY-NC 4.0}\n}" }
    };
  }
  var citeText = $("#cite-text");
  function renderCite(style, fade) {
    state.citeStyle = style;
    var c = citations()[style];
    var put = function () {
      if (c.pre) { citeText.innerHTML = ""; var pre = document.createElement("pre"); pre.textContent = c.pre; citeText.appendChild(pre); }
      else citeText.innerHTML = c.html;
      citeText.classList.remove("fade");
    };
    if (fade && !reduceMotion) { citeText.classList.add("fade"); setTimeout(put, 160); } else put();
  }
  var citeTabs = $("#cite-tabs");
  $$("button", citeTabs).forEach(function (b) {
    b.addEventListener("click", function () {
      $$("button", citeTabs).forEach(function (x) { x.setAttribute("aria-selected", String(x === b)); });
      renderCite(b.dataset.style, true);
    });
  });
  citeTabs.addEventListener("keydown", function (e) {
    var tabs = $$("button", citeTabs), i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      var n = tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
      n.focus(); n.click();
    }
  });
  $("#cite-copy").addEventListener("click", function () {
    var c = citations()[state.citeStyle];
    if (c.pre) copyText(this, c.pre, null, "Copy citation");
    else copyText(this, citeText.innerText.trim(), "<p>" + c.html + "</p>", "Copy citation");
  });
  renderCite("mla", false);
  $("#repo-link").href = REPO_URL;

  /* ================================================================ load */
  var heroTrain = $("#train-hero");
  buildTrain(heroTrain, DEFAULT_PARTIAL, false);
  buildTrain($("#train-large"), DEFAULT_PARTIAL, true);
  lightWhenSeen($("#train-large"), "lighting", 0.4);
  if (!reduceMotion) requestAnimationFrame(function () { heroTrain.classList.add("arrive"); });

  var text = function (url) { return fetch(url, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }); };

  text("prompt.txt").then(function (t) { $("#prompt-text").textContent = t.trim(); },
    function () { $("#prompt-text").textContent = "The prompt is in prompt.txt in the repository."; });
  text("interpretation.md").then(renderEssay, function () {
    $("#essay-body").innerHTML = '<p class="note">The essay could not be loaded here. It is in <code>interpretation.md</code> and in <a href="report.html">the report page</a>.</p>';
  });

  text("site_data.json").then(function (t) {
    var d = enrich(JSON.parse(t));
    state.data = d;
    fillData(d);
    if (d.partial_reading && d.partial_reading.selection) {
      buildTrain(heroTrain, d.partial_reading, false);
      buildTrain($("#train-large"), d.partial_reading, true);
    }
    buildDims(d); buildLexicon(d); buildStoryMap(d); buildVerdicts(d);
    buildGallery(d.figures);
    drawChart(false);
    startCounters();
  }).catch(function (err) {
    if (window.console) console.warn("site_data.json:", err);
    $("#chart-main").innerHTML = '<p class="chart-empty">The results (site_data.json) could not be loaded. Open the site from GitHub Pages or a local web server.</p>';
    startCounters();
  });
})();
