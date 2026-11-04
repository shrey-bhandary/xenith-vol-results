
/* Drives VoidStage with a fake but honest load: uneven, with two holds.
   A real host calls setProgress from asset events and nothing else. */
(function () {
  "use strict";

  var host = document.getElementById("void");
  var after = document.getElementById("after");
  var slab = document.getElementById("slab");
  var live = document.getElementById("live");
  var tag = document.getElementById("tag");
  var hint = document.getElementById("hint");

  var served = location.protocol === "http:" || location.protocol === "https:";

  // [ms, percent]. flat runs are real holds, not decoration.
  var MARKS = [
    [0, 0], [300, 3], [760, 11], [1240, 16], [1600, 16], [3020, 16],
    [3420, 30], [3920, 52], [4460, 52], [5000, 64], [5620, 64],
    [6620, 64], [7020, 78], [7460, 90], [7900, 96], [8340, 99], [8880, 100]
  ];
  var HOLDS = [[1360, 3020], [5620, 6620]];

  var stage = null;
  var raf = 0;
  var t0 = 0;
  var held = null;
  var manualUntil = 0;
  var ended = false;
  var frameEl = null;

  function ease(k) { return k * k * (3 - 2 * k); }

  function valueAt(ms) {
    if (ms <= 0) return 0;
    for (var i = 1; i < MARKS.length; i++) {
      var t1 = MARKS[i][0], v1 = MARKS[i][1];
      if (ms <= t1) {
        var t0m = MARKS[i - 1][0], v0 = MARKS[i - 1][1];
        var k = t1 === t0m ? 1 : (ms - t0m) / (t1 - t0m);
        return v0 + (v1 - v0) * ease(k);
      }
    }
    return 100;
  }

  function holding(ms) {
    for (var i = 0; i < HOLDS.length; i++) {
      if (ms >= HOLDS[i][0] && ms < HOLDS[i][1]) return true;
    }
    return false;
  }

  function handoff() {
    ended = true;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    hint.hidden = true;
    after.removeAttribute("inert");
    document.body.classList.add("handoff");
    if (!served) return;
    slab.hidden = true;
    tag.hidden = false;
    frameEl = document.createElement("iframe");
    frameEl.title = "Xenith selected page";
    frameEl.src = "../../site/index.html";
    live.appendChild(frameEl);
  }

  function frame(now) {
    if (ended) return;
    var ms = now - t0;
    var hold = holding(ms) || now < manualUntil;
    if (hold !== held) {
      held = hold;
      stage.stall(hold);
    }
    var v = valueAt(ms);
    stage.setProgress(v);
    if (v >= 100) return;
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    ended = false;
    held = null;
    manualUntil = 0;
    if (frameEl) { frameEl.remove(); frameEl = null; }
    live.textContent = "";
    tag.hidden = true;
    hint.hidden = false;
    slab.hidden = false;
    after.setAttribute("inert", "");
    document.body.classList.remove("handoff");
    if (stage) stage.destroy();
    stage = window.VoidStage.mount(host, { onDone: handoff });
    t0 = performance.now();
    raf = requestAnimationFrame(frame);
  }

  addEventListener("keydown", function (e) {
    if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      if (stage && !ended) stage.flash();
    } else if (e.key === "s" || e.key === "S") {
      if (stage && !ended) manualUntil = performance.now() + 1400;
    } else if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      start();
    }
  });

  if (!window.VoidStage) {
    slab.hidden = false;
    return;
  }

  window.__voidDemo = { stage: function () { return stage; }, replay: start };
  start();
})();
