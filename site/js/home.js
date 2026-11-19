/* ==========================================================================
   HWS AI Club home page: scroll journey wiring.
   The words and layout work without any of this. It mounts the vendored
   scroll engine (site/engine/scrollcraft.js), puts a #fragment visitor back
   on their section once the pinned acts have taken their real height, and
   makes keyboard focus inside a pinned act land where the act shows it.
   The dot grid is drawn by its own script.
   ========================================================================== */
(function () {
  "use strict";

  var engine = window.ScrollCraft ? window.ScrollCraft.mount(document) : null;
  if (!engine) return;

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
})();
