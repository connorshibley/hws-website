/* ==========================================================================
   HWS AI Club home page: scroll journey wiring and the dot grid.
   The words and layout work without any of this.
   - The grid: 42 majors across, 20 use cases down, drawn on one fixed canvas
     into whichever [data-grid-slot] box is nearest the middle of the screen.
     It also drives the major picker in act 3. It needs window.HWS_GRID
     (site/js/grid-data.js) and a 2D canvas, and runs with or without the
     scroll engine.
   - The engine (site/engine/scrollcraft.js), when present: mount it, put a
     #fragment visitor back on their section once the pinned acts have taken
     their real height, and make keyboard focus inside a pinned act land
     where the act shows it.
   ========================================================================== */
(function () {
  "use strict";

  /* The grid goes first: switching it on changes the layout (slots, picker),
     and the engine should measure, and the fragment fix should land, on the
     final layout. */
  startGrid();

  var engine = window.ScrollCraft ? window.ScrollCraft.mount(document) : null;
  if (engine) wireEngine(engine);

  /* The engine caches every act's offset. Opening or closing the use-case
     list moves every act after the pick, so the grid asks for a re-measure.
     A no-op without the engine; it is only called on a visitor's choice,
     long after mount. */
  function relayout() {
    if (engine) engine.layout();
  }

  /* ======================================================================
     The grid
     ====================================================================== */
  function startGrid() {
    var COLS = 42, ROWS = 20, N = COLS * ROWS;
    var INK = [239, 234, 247], ACCENT = [255, 138, 61];
    var DOT = 0.21;              // dot radius, in cells
    var TRAVEL_MS = 650;         // between slots
    var SWEEP_PER_S = 5;         // columns per second
    var FLIGHT_MS = 600, FLIGHT_STAGGER_MS = 20, FADE_STAGGER_MS = 28;

    /* "HWS AI" in a 5 x 7 dot font: top row at grid row 6, letters at these
       0-based columns. */
    var FONT = {
      H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
      W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
      S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
      A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
      I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"]
    };
    var WORD_TOP = 6;
    var WORD_LETTERS = [["H", 5], ["W", 11], ["S", 17], ["A", 26], ["I", 32]];

    var majors = window.HWS_GRID;
    var canvas = document.querySelector("[data-grid-canvas]");
    if (!canvas || !Array.isArray(majors) || majors.length !== COLS) return;
    var ctx = null;
    try { ctx = canvas.getContext("2d"); } catch (e) { ctx = null; }
    if (!ctx) return;

    var slots = Array.prototype.slice.call(document.querySelectorAll("[data-grid-slot]"));
    var pickSlot = document.querySelector('[data-grid-slot="pick"]');
    var tip = document.querySelector("[data-grid-tip]");
    var select = document.getElementById("major-pick");
    var control = document.querySelector("[data-pick-control]");
    var hint = document.querySelector("[data-pick-hint]");
    var live = document.querySelector("[data-pick-live]");
    var result = document.querySelector("[data-pick-result]");
    if (!slots.length || !pickSlot || !tip || !select || !control || !hint || !live || !result) return;

    var reduce = window.ScrollCraft
      ? !!window.ScrollCraft.reduce
      : window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var coarse = window.matchMedia("(pointer: coarse)");
    var wide = window.matchMedia("(min-width: 861px)");

    /* Per-dot state, eased toward each frame's targets. */
    var alpha = new Float32Array(N), tint = new Float32Array(N), grow = new Float32Array(N);
    var phase = new Float32Array(N), speed = new Float32Array(N), word = new Uint8Array(N);
    var i, r, c;
    for (i = 0; i < N; i++) {
      grow[i] = 1;
      phase[i] = Math.random() * Math.PI * 2;
      speed[i] = 0.5 + Math.random() * 1.2;
    }
    WORD_LETTERS.forEach(function (letter) {
      var rows = FONT[letter[0]];
      for (r = 0; r < 7; r++)
        for (c = 0; c < 5; c++)
          if (rows[r].charAt(c) === "1") word[(WORD_TOP + r) * COLS + letter[1] + c] = 1;
    });

    /* Colours from ink to accent, made once; alpha goes through globalAlpha,
       so a frame allocates no colour strings at all. */
    var TINT_STEPS = 32, fills = [];
    for (i = 0; i <= TINT_STEPS; i++) {
      var m = i / TINT_STEPS;
      fills.push("rgb(" +
        Math.round(INK[0] + (ACCENT[0] - INK[0]) * m) + "," +
        Math.round(INK[1] + (ACCENT[1] - INK[1]) * m) + "," +
        Math.round(INK[2] + (ACCENT[2] - INK[2]) * m) + ")");
    }

    /* ---- Switch on: the picker, the hooks, the canvas ---- */
    majors.forEach(function (major, index) {
      var option = document.createElement("option");
      option.value = String(index);
      option.textContent = major.n;
      select.appendChild(option);
    });
    control.hidden = false;
    hint.hidden = false;
    document.documentElement.classList.add("grid-on");

    var viewW = 0, viewH = 0;
    function sizeCanvas() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      viewW = canvas.clientWidth;
      viewH = canvas.clientHeight;
      canvas.width = Math.round(viewW * dpr);
      canvas.height = Math.round(viewH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawnEmpty = false;
    }

    /* ---- Where to draw ---- */
    var box = { x: 0, y: 0, w: 0, h: 0 };   // this frame's grid rectangle
    var fromBox = { x: 0, y: 0, w: 0, h: 0 };
    var active = null, from = null, switchedAt = 0;

    function readBox(el, out) {
      var b = el.getBoundingClientRect();
      out.x = b.left; out.y = b.top; out.w = b.width; out.h = b.height;
    }
    function offscreen(b) { return b.y > viewH || b.y + b.h < 0; }

    /* The slot whose centre is nearest the viewport centre; leaves its rect in box.
       A slot the stylesheet hides (the arrive slot on short screens) has an
       all-zero rect and is skipped, so the grid never travels to or from the
       top-left corner. */
    function nearestSlot() {
      var best = null, bestD = Infinity, mid = viewH / 2;
      box.w = 0;
      for (var s = 0; s < slots.length; s++) {
        var b = slots[s].getBoundingClientRect();
        if (!b.width) continue;
        var d = Math.abs(b.top + b.height / 2 - mid);
        if (d < bestD) {
          bestD = d; best = slots[s];
          box.x = b.left; box.y = b.top; box.w = b.width; box.h = b.height;
        }
      }
      return best;
    }

    /* ---- Picking ---- */
    var hover = -1, chosen = -1;
    var flight = null;   // { start, items: [li], landed: count }
    var flightTo = new Float32Array(COLS * 3);   // per item: x, y (from the result's corner), radius

    function columnAt(clientX) {
      var b = pickSlot.getBoundingClientRect();
      var col = Math.floor(((clientX - b.left) / b.width) * COLS);
      return Math.max(0, Math.min(COLS - 1, col));
    }

    /* The tip sits above the column, kept inside the slot at both edges. */
    function showTip(col) {
      tip.textContent = majors[col].n;
      tip.style.left = "0px";
      tip.classList.add("is-on");
      var slotW = pickSlot.clientWidth, w = tip.offsetWidth;
      var centre = ((col + 0.5) / COLS) * slotW;
      tip.style.left = Math.max(0, Math.min(slotW - w, centre - w / 2)) + "px";
    }
    function hideTip() { tip.classList.remove("is-on"); }

    function el(tag, className, text) {
      var node = document.createElement(tag);
      if (className) node.className = className;
      if (text != null) node.textContent = text;
      return node;
    }

    function choose(index) {
      var major = majors[index];
      chosen = index;
      select.value = String(index);
      hint.hidden = true;
      if (coarse.matches) { hover = -1; hideTip(); }

      var flying = wide.matches && !reduce;
      var head = el("div", "pick__head");
      head.appendChild(el("h3", "pick__name", major.n));
      var all = el("a", "pick__all", "Open all twenty with starter prompts");
      all.href = "/majors/" + major.s + "/";
      head.appendChild(all);

      var list = el("ol", "pick__list"), items = [];
      major.u.forEach(function (useCase, j) {
        var li = el("li", flying ? "is-inbound" : "is-fading");
        if (!flying) li.style.animationDelay = j * FADE_STAGGER_MS + "ms";
        var bullet = el("span", "pick__bullet");
        bullet.setAttribute("aria-hidden", "true");
        var link = el("a", null, useCase[0]);
        link.href = "/majors/" + major.s + "/#uc-" + (j + 1);
        li.appendChild(bullet);
        li.appendChild(link);
        li.appendChild(el("small", null, useCase[1]));
        list.appendChild(li);
        items.push(li);
      });

      result.textContent = "";
      result.appendChild(head);
      result.appendChild(list);
      result.hidden = false;
      live.textContent = major.n + ", 20 use cases";
      relayout();

      flight = null;
      if (flying) {
        /* Bullet centres relative to the result box, read once; each frame
           then only needs the result's own position. */
        var base = result.getBoundingClientRect();
        for (var j = 0; j < items.length; j++) {
          var b = items[j].firstChild.getBoundingClientRect();
          flightTo[j * 3] = b.left + b.width / 2 - base.left;
          flightTo[j * 3 + 1] = b.top + b.height / 2 - base.top;
          flightTo[j * 3 + 2] = b.width / 2;
        }
        flight = { start: performance.now(), items: items, landed: 0 };
        wake();
      }
    }

    /* Back on "Choose your major" (type-ahead on "c" lands there): no choice. */
    function unchoose() {
      chosen = -1;
      flight = null;
      result.hidden = true;
      result.textContent = "";
      hint.hidden = false;
      live.textContent = "";
      relayout();
    }

    select.addEventListener("change", function () {
      if (select.value === "") unchoose();
      else choose(+select.value);
    });
    pickSlot.addEventListener("mousemove", function (e) {
      if (coarse.matches) return;
      var col = columnAt(e.clientX);
      if (col === hover) return;
      hover = col;
      showTip(col);
    });
    pickSlot.addEventListener("mouseleave", function () {
      if (coarse.matches) return;
      hover = -1;
      hideTip();
    });
    /* A tap on a phone-sized column is a guess, so it names the column and
       hands over to the dropdown rather than choosing. */
    pickSlot.addEventListener("click", function (e) {
      var col = columnAt(e.clientX);
      if (coarse.matches) {
        hover = col;
        showTip(col);
        select.focus();
      } else {
        choose(col);
      }
    });

    /* ---- The frame ---- */
    var running = false, last = 0, drawnEmpty = false;
    var flightFrom = { x: 0, y: 0, w: 0, h: 0 };

    function wake() {
      if (running || document.hidden) return;
      running = true;
      last = 0;
      requestAnimationFrame(frame);
    }

    function frame(now) {
      if (document.hidden) { running = false; return; }
      requestAnimationFrame(frame);
      var dt = last ? Math.min(now - last, 100) : 16.7;
      last = now;

      var best = nearestSlot();   // box now holds best's live rect
      if (best !== active) {
        from = active && !reduce ? active : null;
        active = best;
        switchedAt = now;
      }
      if (from) {
        readBox(from, fromBox);
        var t = (now - switchedAt) / TRAVEL_MS;
        if (t >= 1 || (offscreen(fromBox) && offscreen(box))) {
          from = null;
        } else {
          t = 1 - Math.pow(1 - t, 3);
          box.x = fromBox.x + (box.x - fromBox.x) * t;
          box.y = fromBox.y + (box.y - fromBox.y) * t;
          box.w = fromBox.w + (box.w - fromBox.w) * t;
          box.h = fromBox.h + (box.h - fromBox.h) * t;
        }
      }

      /* Off screen (the reading sections between the pick and the close):
         clear once and do nothing more. The dots keep their last state and
         ease into the next one as its box comes into view. */
      var gridOn = !!active && box.w > 0 && !offscreen(box);
      if (!gridOn && !flight) {
        if (!drawnEmpty) { ctx.clearRect(0, 0, viewW, viewH); drawnEmpty = true; }
        return;
      }
      drawnEmpty = false;
      ctx.clearRect(0, 0, viewW, viewH);
      if (gridOn) drawDots(active.getAttribute("data-grid-slot"), now, dt);
      if (flight) drawFlight(now);
      ctx.globalAlpha = 1;
    }

    function drawDots(mode, now, dt) {
      var seconds = now / 1000;
      var sweep = Math.floor(seconds * SWEEP_PER_S) % COLS;
      var still = reduce;
      // Frame-rate independent versions of 0.12 / 0.14 per 60 Hz frame.
      var easeA = 1 - Math.pow(0.88, dt / 16.7);
      var easeK = 1 - Math.pow(0.86, dt / 16.7);
      var cell = box.w / COLS, radius = cell * DOT;
      for (var n = 0; n < N; n++) {
        var col = n % COLS, row = (n / COLS) | 0;
        var ta = 0.5, tk = 0, ts = 1;
        if (mode === "field") {
          if (!still) {
            ta = 0.5 + 0.28 * Math.sin(seconds * speed[n] + phase[n]);
            if (col === sweep) { ta = 1; tk = 0.9; }
          }
        } else if (mode === "dim") {
          ta = 0.13;
        } else if (mode === "pick") {
          if (chosen >= 0) {
            if (col === chosen) { ta = 1; tk = 1; ts = 1.4; } else ta = 0.13;
          }
          if (col === hover && col !== chosen) { ta = 1; tk = chosen >= 0 ? 0 : 1; }
        } else if (mode === "word") {
          if (word[n]) { ta = 1; ts = 1.3; } else ta = 0.1;
        }
        alpha[n] = approach(alpha[n], ta, easeA);
        tint[n] = approach(tint[n], tk, easeK);
        grow[n] = approach(grow[n], ts, easeK);
        ctx.globalAlpha = alpha[n];
        ctx.fillStyle = fills[Math.round(tint[n] * TINT_STEPS)];
        ctx.beginPath();
        ctx.arc(box.x + (col + 0.5) * cell, box.y + (row + 0.5) * cell, radius * grow[n], 0, 6.2832);
        ctx.fill();
      }
    }

    /* Ease toward a target, landing exactly once close enough to be invisible. */
    function approach(value, target, ease) {
      var next = value + (target - value) * ease;
      return Math.abs(target - next) < 0.002 ? target : next;
    }

    /* The chosen column's dots leave the grid and become the list's bullets. */
    function drawFlight(now) {
      readBox(pickSlot, flightFrom);
      var to = result.getBoundingClientRect();
      var cell = flightFrom.w / COLS;
      var x0 = flightFrom.x + (chosen + 0.5) * cell, r0 = cell * DOT * 1.4;
      ctx.globalAlpha = 1;
      ctx.fillStyle = fills[TINT_STEPS];
      for (var j = 0; j < flight.items.length; j++) {
        var t = (now - flight.start - j * FLIGHT_STAGGER_MS) / FLIGHT_MS;
        if (t <= 0) continue;
        var li = flight.items[j];
        if (t >= 1) {
          if (li.className === "is-inbound") { li.className = ""; flight.landed++; }
          continue;
        }
        t = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        var y0 = flightFrom.y + (j + 0.5) * cell;
        var x1 = to.left + flightTo[j * 3], y1 = to.top + flightTo[j * 3 + 1];
        var r1 = flightTo[j * 3 + 2];
        ctx.beginPath();
        ctx.arc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + (r1 - r0) * t, 0, 6.2832);
        ctx.fill();
      }
      if (flight.landed === flight.items.length) flight = null;
    }

    sizeCanvas();
    window.addEventListener("resize", sizeCanvas);
    document.addEventListener("visibilitychange", wake);
    wake();
  }

  /* ======================================================================
     Engine-only wiring
     ====================================================================== */
  function wireEngine(engine) {
    /* ---- Arriving on a fragment ----
       The browser scrolls to /#founders before this script runs, while the
       pinned acts are still their natural height. Mounting stretches them to
       their scroll spans, which pushes every later section down, so the
       browser's jump now lands hundreds of pixels short. Redo it once after
       mount and again on load (fonts and images can move things), unless the
       visitor has scrolled away in between. */
    function hashTarget() {
      if (location.hash.length < 2) return null;
      try {
        return document.getElementById(decodeURIComponent(location.hash.slice(1)));
      } catch (e) {
        return null;
      }
    }

    var settledAt = null;
    function toHash() {
      var el = hashTarget();
      if (!el) return;
      el.scrollIntoView({ block: "start", behavior: "instant" });
      settledAt = window.scrollY;
    }

    toHash();
    function onLoad() {
      if (settledAt !== null && Math.abs(window.scrollY - settledAt) > 2) return;
      toHash();
    }
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });

    /* ---- Keyboard focus inside a pinned act ----
       The stage is already on screen, so the browser will not scroll for a
       focused link, but the words holding it may be faded out at this point
       in the act. Move the page to the middle of that words' cue window,
       where they are fully shown. */
    function reveal(target) {
      var act = target.closest("[data-sc-act]");
      if (!act) return;
      var stage = act.querySelector("[data-sc-stage]") || act;
      if (getComputedStyle(stage).position !== "sticky") return;
      var travel = act.offsetHeight - window.innerHeight;
      if (travel <= 0) return;
      var cue = target.closest("[data-sc-cue]");
      if (!cue || parseFloat(getComputedStyle(cue).opacity) >= 0.9) return;
      var nums = cue.getAttribute("data-sc-cue").trim().split(/\s+/).map(Number);
      var from = nums[0] || 0;
      var to = nums.length > 1 && !isNaN(nums[1]) ? nums[1] : 1;
      var top = act.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top + travel * ((from + to) / 2), behavior: "instant" });
      // Repaint the cues now rather than on the next frame. The engine has its
      // own focus handler (on window, so it runs after this one) that re-scrolls
      // whenever the cue still reads as faded, which would undo this move.
      engine.read();
    }

    document.addEventListener("focusin", function (e) {
      if (e.target instanceof Element && e.target.matches(":focus-visible")) reveal(e.target);
    });
  }
})();
