/* dialogue.js
   Rusty's voice, in one place. No dependencies, no build step.

   window.IntroDialogue
     .say(line, opts)        type a line and resolve when it has held. line is a
                             string or { text, expression, gesture, screen, who,
                             hold, rest }. opts may override those plus
                             { lead, onChar, onTyped, onDone }.
     .choose(options, cb)    the two flat rows. Resolves { index, id, label, sub }
                             or null. Queues behind the current line, so
                             say(greeting); choose(...) works in one breath.
     .barks(pool)            shuffle bag of idle lines, four per visit, dropped
                             whenever a voice is already talking. barks(null)
                             stops the bag.
     .react(event)           cursor reactions with cooldowns. Canonical events:
                             hover, row, click, still, fast, leave, return.
                             Aliases: hover-row, click-rusty, pointer-leave...
     .attach(actor, opts)    hand it the rig. opts = { el, armed }
     .arm(true|false)        gate gaze and cursor reactions. false during boot.
     .hush()                 cut the current voice.
     .lookAt(target)         cursor | face | frame | row | edge | down
     .setExpression(name)    set the face without speaking.
     .isSaying(), .isChoosing(), .state()

   Actor contract, all optional:
     setState(name), setGaze(nx, ny), lookAt(target, nx, ny)
     gesture(g)      receives a parsed object, see parseGesture()
     face(text, ms)  a stamp on the screen
     talk(on)        mouth running while a line types
     nod(), dust(), spark(), spin(), blink(kind), chest(v)

   Missing methods are skipped. Gestures the actor cannot play still steer the
   gaze here, so a bare canvas rig gets the look right. Everything is lowercase
   except FOUND. One voice at a time: a bark is dropped, an authored line wins,
   a reaction beats a bark.

   Events on document: xd:line-start, xd:line-end, xd:expression, xd:stamp,
   xd:gesture, xd:talk. A host can render the face without an actor. */
(function (global) {
  "use strict";

  var VERSION = "1.0.0";
  var CHAR_MS = 26;
  var LEAD_MS = 70;
  var HOLD_MS = 640;
  var STAMP_MS = 1200;
  var QUIET_AFTER = 3000;
  var BARK_FIRST = 3000;
  var BARK_GAP = [8000, 12000];
  var NEAR_PX = 170;
  var PRI = { bark: 0, react: 1, line: 2 };

  var DEFAULT_OPTIONS = [
    { id: "result", label: "check my vols application result", sub: "one file, one line" },
    { id: "explore", label: "explore xenith", sub: "six departments, one page" }
  ];

  var CSS_ID = "xd-dialogue-css";
  var ROOT_ID = "xd-dialogue-root";

  var CSS = `
.xd,.xd *{box-sizing:border-box}
.xd{
  --a:#ffb15c;--c:#ffe9b0;--m:#9ef0c0;--v:#7b5cff;
  --mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  --ps:"PS2P","Press Start 2P",ui-monospace,monospace;
  position:fixed;inset:0;z-index:60;pointer-events:none;
  font-family:var(--mono);color:var(--c);
  opacity:0;visibility:hidden;
  transition:opacity .5s ease,visibility .5s;
  -webkit-font-smoothing:antialiased;
}
.xd.is-on{opacity:1;visibility:visible}
.xd-stage{
  position:absolute;left:clamp(20px,6.4vw,92px);bottom:clamp(26px,5vh,52px);
  width:min(520px,82vw);
  display:flex;flex-direction:column;justify-content:flex-end;gap:22px;
  transform:translate3d(calc(var(--xd-px,0) * 3px),calc(var(--xd-py,0) * 2px),0);
  transition:transform .4s cubic-bezier(.2,.9,.2,1);
  will-change:transform;
}

/* the console. one rule, one label, one sentence */
.xd-say{
  padding-left:14px;border-left:1px solid rgba(255,177,92,.34);
  opacity:0;transform:translateY(4px);
  transition:opacity .5s ease,transform .5s ease;
}
.xd-say.is-on{opacity:1;transform:none}
.xd-who{
  display:block;margin-bottom:11px;
  font-family:var(--ps);font-size:8px;line-height:1;
  letter-spacing:.2em;text-transform:lowercase;color:rgba(255,177,92,.7);
}
.xd-line{
  margin:0;max-width:36ch;min-height:2.9em;
  font-size:clamp(13px,1.24vw,15px);line-height:1.78;letter-spacing:.01em;
  color:rgba(255,233,176,.9);white-space:pre-wrap;overflow-wrap:break-word;
  text-shadow:0 0 14px rgba(255,177,92,.08);
}
.xd-caret{
  display:inline-block;width:7px;height:1.02em;margin-left:4px;
  vertical-align:-.16em;background:var(--a);opacity:0;
}
.xd.is-typing .xd-caret{opacity:1;animation:xdCaret 1s steps(1) infinite}
@keyframes xdCaret{50%{opacity:0}}
.xd-sr{
  position:absolute;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;
}

/* two answers, held still */
.xd-rows{
  display:grid;gap:2px;pointer-events:none;
  opacity:0;transform:translateY(8px);
  transition:opacity .5s ease,transform .5s ease;
}
.xd.is-choosing .xd-rows{opacity:1;transform:none;pointer-events:auto}
.xd-row{
  --i:0;
  position:relative;display:grid;grid-template-columns:32px minmax(0,1fr) 12px;
  gap:12px;align-items:start;width:100%;margin:0;padding:15px 12px 16px;
  background:transparent;border:0;border-top:1px solid rgba(255,233,176,.16);
  color:inherit;font:inherit;text-align:left;cursor:pointer;
  transition:background .3s ease,border-color .3s ease,transform .3s ease;
  -webkit-tap-highlight-color:transparent;
}
.xd-row:last-child{border-bottom:1px solid rgba(255,233,176,.16)}
.xd-row::before{
  content:"";position:absolute;left:0;top:0;bottom:0;width:1px;z-index:2;
  background:var(--a);transform:scaleY(0);transform-origin:top;
  transition:transform .3s ease;
}
.xd-row::after{
  content:"";position:absolute;inset:0;z-index:0;pointer-events:none;
  background:linear-gradient(90deg,rgba(255,177,92,.16),rgba(255,177,92,.04) 62%,transparent);
  opacity:var(--near,0);transition:opacity .3s ease;
}
.xd-row > *{position:relative;z-index:1}
.xd-row.is-lit{border-color:rgba(255,177,92,.55)}
.xd-row.is-lit::before{transform:scaleY(1)}
.xd-row:hover,.xd-row:focus-visible{
  background:rgba(255,177,92,.02);border-color:rgba(255,177,92,.55);
  outline:none;transform:translateX(6px);
}
.xd-row:focus-visible{box-shadow:inset 0 0 0 1px rgba(158,240,192,.35)}
.xd.is-choosing .xd-row{animation:xdRowIn .46s cubic-bezier(.2,.9,.2,1) backwards;animation-delay:calc(var(--i) * 80ms)}
@keyframes xdRowIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.xd-idx{
  font-size:10px;line-height:1.6;letter-spacing:.06em;
  color:rgba(255,177,92,.62);padding-top:3px;
}
.xd-mid{min-width:0}
.xd-label{
  display:block;font-family:var(--ps);font-size:clamp(9px,1.05vw,11.5px);
  line-height:1.85;letter-spacing:.02em;color:rgba(255,233,176,.92);
  transition:color .3s ease;
}
.xd-row.is-lit .xd-label,.xd-row:hover .xd-label,.xd-row:focus-visible .xd-label{color:#fff6de}
.xd-sub{
  display:block;margin-top:9px;font-size:10px;line-height:1.6;
  letter-spacing:.05em;color:rgba(255,233,176,.4);
}
.xd-mark{
  font-size:10px;line-height:1.6;text-align:right;color:var(--a);
  opacity:0;transform:rotate(-8deg) scale(.7);padding-top:3px;
  transition:opacity .3s ease,transform .3s ease;
}
.xd-row.is-lit .xd-mark,.xd-row:hover .xd-mark,.xd-row:focus-visible .xd-mark{opacity:.9;transform:none}
.xd-row.is-picked{border-color:var(--a);background:rgba(255,177,92,.05)}
.xd-row.is-picked::before{transform:scaleY(1)}
.xd-row.is-picked .xd-mark{opacity:1;transform:none}
.xd-row.is-gone{opacity:.14;pointer-events:none}
.xd-row.is-gone::after{opacity:0}

@media (max-width:760px){
  .xd-stage{left:18px;right:18px;bottom:22px;width:auto;gap:16px}
  .xd.is-choosing .xd-say{display:none}
  .xd-row{grid-template-columns:26px minmax(0,1fr) 10px;gap:10px;padding:13px 8px 14px}
  .xd-label{font-size:9px;line-height:1.9}
  .xd-sub{font-size:9px;margin-top:7px}
  .xd-line{max-width:none}
}
@media (max-width:430px){
  .xd-label{font-size:8px}
  .xd-sub{font-size:8.5px}
}
@media (max-height:520px){
  .xd-stage{bottom:16px;gap:12px}
  .xd-row{padding-top:9px;padding-bottom:10px}
  .xd-line{min-height:2em;line-height:1.7}
}
@media (prefers-reduced-motion:reduce){
  .xd,.xd *{animation:none!important;transition-duration:.01ms!important}
  .xd-stage{transform:none}
}
`;

  /* ---------- helpers ---------- */

  function now() {
    return global.performance && global.performance.now
      ? global.performance.now()
      : Date.now();
  }

  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }

  function rnd(a, b) {
    return a + Math.random() * (b - a);
  }

  function shuffle(list) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = out[i];
      out[i] = out[j];
      out[j] = t;
    }
    return out;
  }

  function hasDoc() {
    return !!(global.document && global.document.createElement);
  }

  function reduceMotion() {
    try {
      return !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (e) {
      return false;
    }
  }

  /* ---------- state ---------- */

  var root = null, stageEl = null, rowsEl = null, sayEl = null;
  var whoEl = null, lineEl = null, typedEl = null, srEl = null;
  var actor = null, actorEl = null;
  var current = null;
  var seq = 0;
  var rows = [];
  var lit = -1;
  var choosing = null;
  var pendingChoice = null;
  var armed = true;
  var reduce = false;
  var gazeLock = false;
  var lastLineEnd = 0;
  var leftAt = 0;
  var lastGaze = { x: 0, y: 0, target: "face" };
  var reactions = {};
  var reactionCounts = {};
  var pointer = { x: 0, y: 0, at: 0, seen: false, speed: 0, fastSince: 0 };
  var watchers = false;
  var stillTimer = 0;
  var bark = { pool: [], bag: [], cap: 4, fired: 0, timer: 0, running: false };

  /* ---------- dom ---------- */

  function injectCSS() {
    var doc = global.document;
    if (!doc || doc.getElementById(CSS_ID)) return;
    var style = doc.createElement("style");
    style.id = CSS_ID;
    style.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(style);
  }

  function el(tag, cls, text) {
    var node = global.document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function ensure() {
    if (root || !hasDoc()) return root;
    injectCSS();
    var doc = global.document;

    root = el("div", "xd");
    root.id = ROOT_ID;
    root.setAttribute("aria-hidden", "false");

    stageEl = el("div", "xd-stage");
    rowsEl = el("div", "xd-rows");
    rowsEl.setAttribute("role", "group");
    rowsEl.setAttribute("aria-label", "how can rusty help");

    sayEl = el("div", "xd-say");
    whoEl = el("span", "xd-who", "rusty");
    lineEl = el("p", "xd-line");
    typedEl = el("span", "xd-typed");
    var caret = el("span", "xd-caret");
    caret.setAttribute("aria-hidden", "true");
    lineEl.appendChild(typedEl);
    lineEl.appendChild(caret);
    srEl = el("p", "xd-sr");
    srEl.setAttribute("aria-live", "polite");
    sayEl.appendChild(whoEl);
    sayEl.appendChild(lineEl);
    sayEl.appendChild(srEl);

    stageEl.appendChild(rowsEl);
    stageEl.appendChild(sayEl);
    root.appendChild(stageEl);
    doc.body.appendChild(root);

    rowsEl.addEventListener("pointermove", onRowsMove);
    rowsEl.addEventListener("pointerleave", onRowsLeave);
    rowsEl.addEventListener("focusin", onRowsFocus);
    rowsEl.addEventListener("focusout", onRowsBlur);
    rowsEl.addEventListener("keydown", onRowsKey);

    reduce = reduceMotion();
    bindPointer();
    bindActor();
    return root;
  }

  function showRoot() {
    if (root) root.classList.add("is-on");
  }

  function bindActor() {
    if (!actorEl || !actorEl.addEventListener || actorEl.__xdBound) return;
    actorEl.__xdBound = true;
    actorEl.addEventListener("pointerenter", function () {
      if (armed) fireReaction("hover");
    });
    actorEl.addEventListener("click", function () {
      if (armed) fireReaction("click");
    });
  }

  /* ---------- pointer ---------- */

  function normPoint(x, y) {
    var r = null;
    if (actorEl && actorEl.getBoundingClientRect) {
      try { r = actorEl.getBoundingClientRect(); } catch (e) { r = null; }
    }
    var w = r && r.width ? r.width : (global.innerWidth || 1280);
    var h = r && r.height ? r.height : (global.innerHeight || 800);
    var cx = r && r.width ? r.left + r.width / 2 : w / 2;
    var cy = r && r.height ? r.top + r.height / 2 : h / 2;
    return {
      x: clamp((x - cx) / (w * 0.55), -1, 1),
      y: clamp((y - cy) / (h * 0.55), -1, 1)
    };
  }

  function bindPointer() {
    if (watchers || !hasDoc()) return;
    watchers = true;
    var doc = global.document;

    doc.addEventListener("pointermove", function (e) {
      var t = now();
      var dt = t - pointer.at;
      var dx = e.clientX - pointer.x;
      var dy = e.clientY - pointer.y;
      if (pointer.seen && dt > 0 && dt < 120) {
        pointer.speed = Math.sqrt(dx * dx + dy * dy) / dt * 1000;
      } else {
        pointer.speed = 0;
      }
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.at = t;
      pointer.seen = true;

      if (root) {
        var p = normPoint(e.clientX, e.clientY);
        root.style.setProperty("--xd-px", p.x.toFixed(3));
        root.style.setProperty("--xd-py", p.y.toFixed(3));
      }

      if (!armed) return;
      if (!gazeLock) setGaze("cursor");
      if (pointer.speed > 1400) {
        if (!pointer.fastSince) pointer.fastSince = t;
        if (t - pointer.fastSince > 300) {
          pointer.fastSince = 0;
          fireReaction("fast");
        }
      } else {
        pointer.fastSince = 0;
      }

      clearTimeout(stillTimer);
      stillTimer = setTimeout(function () {
        if (armed && pointer.seen) fireReaction("still");
      }, 6000);
    }, { passive: true });

    var edge = doc.documentElement;
    if (edge && edge.addEventListener) {
      edge.addEventListener("pointerleave", function () {
        pointer.seen = false;
        clearTimeout(stillTimer);
        if (armed) {
          leftAt = now();
          fireReaction("leave");
        }
      });
      edge.addEventListener("pointerenter", function () {
        pointer.seen = true;
        if (armed) fireReaction("return");
      });
    }
  }

  /* ---------- actor ---------- */

  function setExpression(name) {
    if (!name) return;
    if (root) root.dataset.expr = name;
    if (actor && typeof actor.setState === "function") {
      try { actor.setState(name); } catch (e) {}
    }
    emit("xd:expression", { name: name });
  }

  function setFace(text, ms) {
    var t = text == null ? "" : String(text);
    var hold = Math.max(0, ms || 0);
    if (root) root.dataset.stamp = t;
    if (actor && typeof actor.face === "function") {
      try { actor.face(t, hold); } catch (e) {}
    }
    emit("xd:stamp", { text: t, ms: hold });
  }

  function talkTo(on) {
    if (root) root.classList.toggle("is-talking", !!on);
    if (actor && typeof actor.talk === "function") {
      try { actor.talk(!!on); } catch (e) {}
    } else if (actor) {
      try { actor.talking = !!on; } catch (e) {}
    }
    emit("xd:talk", { on: !!on });
  }

  function gazeFor(target) {
    if (target === "cursor") {
      if (!pointer.seen) return { x: 0, y: 0 };
      return normPoint(pointer.x, pointer.y);
    }
    if (target === "row") {
      var row = rows[lit];
      if (row && row.getBoundingClientRect) {
        try {
          var r = row.getBoundingClientRect();
          return normPoint(r.left + r.width / 2, r.top + r.height / 2);
        } catch (e) {}
      }
      return { x: 0.35, y: 0.45 };
    }
    if (target === "frame") return { x: 0.42, y: 0.28 };
    if (target === "edge") {
      var p = normPoint(pointer.x, pointer.y);
      return { x: p.x < 0 ? -1 : 1, y: 0 };
    }
    if (target === "down") return { x: 0, y: 0.62 };
    return { x: 0, y: 0 };
  }

  function setGaze(target) {
    var p = gazeFor(target || "cursor");
    lastGaze = { x: p.x, y: p.y, target: target || "cursor" };
    if (!actor) return lastGaze;
    try {
      if (typeof actor.lookAt === "function") actor.lookAt(target, p.x, p.y);
      else if (typeof actor.setGaze === "function") actor.setGaze(p.x, p.y);
    } catch (e) {}
    return lastGaze;
  }

  /* ---------- gestures ----------
     "tilt 9", "lean 2", "antenna perk", "arms out 42", "fold 26", "hand up",
     "gaze cursor", "nod", "dust", "spark", "chest .7", "spin", "step right",
     "blink double". Comma separated, tolerant of words it does not know. */

  function blankGesture() {
    return {
      raw: "", tilt: null, lean: null, ant: null, flick: false, sway: null,
      arms: null, armsUp: null, fold: null, hand: null, gaze: null,
      nod: false, dust: false, spark: false, chest: null, spin: false,
      step: null, blink: null
    };
  }

  function parseGesture(input) {
    var g = blankGesture();
    if (!input) return g;
    if (Object.prototype.toString.call(input) === "[object Array]") {
      input = input.join(", ");
    }
    if (typeof input === "object") {
      for (var k in g) {
        if (Object.prototype.hasOwnProperty.call(input, k) && input[k] !== undefined) {
          g[k] = input[k];
        }
      }
      g.raw = input.raw || "";
      return g;
    }

    var str = String(input);
    g.raw = str;
    var toks = str.toLowerCase().split(/[,;]+|\band\b/);
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i].replace(/^\s+|\s+$/g, "");
      if (!t) continue;
      var m;

      if ((m = t.match(/^tilt\s+(-?\d+(?:\.\d+)?)/))) { g.tilt = +m[1]; continue; }
      if ((m = t.match(/^lean(?:\s+(in|back|toward))?\s+(-?\d+(?:\.\d+)?)/))) {
        g.lean = m[1] === "back" ? -Math.abs(+m[2]) : +m[2];
        continue;
      }
      if ((m = t.match(/^antenna\s+(perk|droop|flick|sway)(?:\s+(-?\d+(?:\.\d+)?))?/))) {
        if (m[1] === "perk") g.ant = g.ant == null ? 10 : g.ant + 10;
        else if (m[1] === "droop") g.ant = g.ant == null ? -12 : g.ant - 12;
        else if (m[1] === "flick") g.flick = true;
        else { g.sway = m[2] != null ? +m[2] : 8; g.ant = g.ant == null ? 4 : g.ant; }
        continue;
      }
      if ((m = t.match(/^arms?\s+(out|up)\s+(-?\d+(?:\.\d+)?)/))) {
        if (m[1] === "out") g.arms = +m[2];
        else g.armsUp = +m[2];
        continue;
      }
      if ((m = t.match(/^fold\s+(-?\d+(?:\.\d+)?)/))) { g.fold = +m[1]; continue; }
      if (/^hand\s+up/.test(t)) { g.hand = "up"; continue; }
      if (/^hand\s+down/.test(t)) { g.hand = "down"; continue; }
      if ((m = t.match(/^gaze\s+(cursor|face|frame|row|edge|down)/))) { g.gaze = m[1]; continue; }
      if (/^(one\s+)?nod\b/.test(t)) { g.nod = true; continue; }
      if (/\bdust\b/.test(t)) { g.dust = true; continue; }
      if (/\bspark\b/.test(t)) { g.spark = true; continue; }
      if ((m = t.match(/^chest\s+(-?\d*\.?\d+)/))) { g.chest = +m[1]; continue; }
      if (/^spin\b/.test(t)) { g.spin = true; continue; }
      if ((m = t.match(/^step\s+(right|back)/))) { g.step = m[1]; continue; }
      if ((m = t.match(/^blink\s+(once|double|long)/))) { g.blink = m[1]; continue; }
    }
    return g;
  }

  function applyGesture(input) {
    var g = parseGesture(input);
    if (!g) return g;
    if (g.gaze) {
      setGaze(g.gaze);
      if (current && g.gaze !== "cursor") gazeLock = true;
    }
    if (actor && typeof actor.gesture === "function") {
      try { actor.gesture(g); } catch (e) {}
    } else if (actor) {
      try {
        if (g.nod && actor.nod) actor.nod();
        if (g.dust && actor.dust) actor.dust();
        if (g.spark && actor.spark) actor.spark();
        if (g.spin) {
          if (actor.spin) actor.spin();
          else if (actor.celebrate) actor.celebrate();
        }
        if (g.blink && actor.blink) actor.blink(g.blink);
        if (g.chest != null && actor.chest) actor.chest(g.chest);
      } catch (e) {}
    }
    if (root) root.dataset.cue = g.raw || "gesture";
    emit("xd:gesture", g);
    return g;
  }

  /* ---------- lines ---------- */

  function normalizeLine(line, opts) {
    var out = {};
    if (line && typeof line === "object") {
      for (var k in line) {
        if (Object.prototype.hasOwnProperty.call(line, k)) out[k] = line[k];
      }
    } else if (typeof line === "string") {
      out.text = line;
    }
    if (opts) {
      if (opts.expression != null) out.expression = opts.expression;
      else if (opts.expr != null) out.expression = opts.expr;
      if (opts.gesture !== undefined) out.gesture = opts.gesture;
      if (opts.screen !== undefined) out.screen = opts.screen;
      if (opts.hold !== undefined) out.hold = opts.hold;
      if (opts.who) out.who = opts.who;
      if (opts.rest !== undefined) out.rest = opts.rest;
    }
    out.text = out.text == null ? "" : String(out.text);
    return out;
  }

  function normalizePool(pool) {
    if (!pool) return [];
    var src = Object.prototype.toString.call(pool) === "[object Array]" ? pool : [pool];
    var out = [];
    for (var i = 0; i < src.length; i++) {
      var item = src[i];
      if (typeof item === "string") {
        if (item) out.push({ text: item });
      } else if (item && typeof item === "object") {
        var line = normalizeLine(item, null);
        if (line.text || line.screen) out.push(line);
      }
    }
    return out;
  }

  function applyCue(line, opts) {
    var expression = opts && opts.expression != null
      ? opts.expression
      : (line.expression || line.expr);
    if (expression) setExpression(expression);

    var gesture = opts && opts.gesture !== undefined ? opts.gesture : line.gesture;
    if (gesture) applyGesture(gesture);

    var screen = opts && opts.screen !== undefined ? opts.screen : line.screen;
    if (screen !== undefined && screen !== null) {
      if (screen === "own") {
        /* the expression already carries its own label */
      } else if (screen === "none" || screen === "") {
        setFace("", 0);
      } else {
        var hold = String(screen) === "FOUND" ? 6000 : (line.stampHold || STAMP_MS);
        setFace(String(screen), hold);
      }
    }
  }

  function speak(line, pri, opts) {
    opts = opts || {};
    if (!line) return null;
    if (!line.text && line.screen === undefined && !line.expression && !line.gesture) return null;

    ensure();

    if (current) {
      if (pri < current.pri) return null;
      if (pri === current.pri && pri !== PRI.line) return null;
      cancelCurrent();
    }

    var rec = {
      token: ++seq,
      line: line,
      text: line.text,
      pri: pri,
      opts: opts,
      typed: 0,
      typing: false,
      started: false,
      timer: 0,
      leadTimer: 0,
      holdTimer: 0,
      startedAt: now(),
      rest: line.rest !== undefined ? line.rest : (opts.rest !== undefined ? opts.rest : "listening"),
      hold: line.hold != null ? Math.max(0, +line.hold) : HOLD_MS,
      resolve: null
    };
    var promise = new Promise(function (resolve) { rec.resolve = resolve; });
    rec.promise = promise;
    current = rec;

    showRoot();
    if (whoEl) whoEl.textContent = line.who || "rusty";
    if (typedEl) typedEl.textContent = "";
    if (lineEl) lineEl.classList.remove("is-typing");
    if (sayEl) sayEl.classList.add("is-on");
    if (srEl) srEl.textContent = (line.who || "rusty") + ": " + line.text;

    applyCue(line, opts);
    emit("xd:line-start", {
      text: line.text, expression: line.expression, gesture: line.gesture, pri: pri
    });

    rec.leadTimer = setTimeout(function () {
      startTyping(rec);
    }, reduce ? 0 : LEAD_MS);

    return promise;
  }

  function startTyping(rec) {
    if (current !== rec) return;
    rec.started = true;
    if (!rec.text) {
      finishTyping(rec);
      return;
    }
    rec.typing = true;
    if (lineEl) lineEl.classList.add("is-typing");
    if (root) root.classList.add("is-typing");
    talkTo(true);

    if (reduce) {
      rec.typed = rec.text.length;
      if (typedEl) typedEl.textContent = rec.text;
      finishTyping(rec);
      return;
    }
    rec.typed = 0;
    typeStep(rec);
  }

  function typeStep(rec) {
    if (current !== rec) return;
    rec.typed += 1;
    if (typedEl) typedEl.textContent = rec.text.slice(0, rec.typed);
    if (rec.typed % 3 === 0 && typeof rec.opts.onChar === "function") {
      try { rec.opts.onChar(rec.typed - 1, rec.text); } catch (e) {}
    }
    if (rec.typed < rec.text.length) {
      rec.timer = setTimeout(function () { typeStep(rec); }, CHAR_MS);
    } else {
      finishTyping(rec);
    }
  }

  function finishTyping(rec) {
    if (current !== rec) return;
    clearTimeout(rec.timer);
    rec.timer = 0;
    rec.typing = false;
    if (typedEl) typedEl.textContent = rec.text;
    if (lineEl) lineEl.classList.remove("is-typing");
    if (root) root.classList.remove("is-typing");
    talkTo(false);
    if (typeof rec.opts.onTyped === "function") {
      try { rec.opts.onTyped(rec.text); } catch (e) {}
    }
    if (pendingChoice) {
      var req = pendingChoice;
      pendingChoice = null;
      openChoice(req);
    }
    rec.holdTimer = setTimeout(function () { finishLine(rec); }, rec.hold);
  }

  function finishLine(rec) {
    if (current !== rec) return;
    current = null;
    gazeLock = false;
    lastLineEnd = now();

    if (sayEl) sayEl.classList.add("is-on");
    if (rec.resolve) {
      rec.resolve({
        done: true,
        text: rec.text,
        ms: Math.round(now() - rec.startedAt)
      });
    }
    if (rec.rest !== false) setExpression(rec.rest || "listening");
    if (typeof rec.opts.onDone === "function") {
      try { rec.opts.onDone({ done: true, text: rec.text }); } catch (e) {}
    }
    emit("xd:line-end", {
      text: rec.text, expression: rec.line.expression, pri: rec.pri, cancelled: false
    });
    scheduleBarkCheck();
  }

  function cancelCurrent() {
    var rec = current;
    if (!rec) return null;
    clearTimeout(rec.timer);
    clearTimeout(rec.leadTimer);
    clearTimeout(rec.holdTimer);
    rec.timer = rec.leadTimer = rec.holdTimer = 0;
    current = null;
    gazeLock = false;
    lastLineEnd = now();
    if (lineEl) lineEl.classList.remove("is-typing");
    if (root) root.classList.remove("is-typing");
    talkTo(false);
    if (rec.resolve) {
      rec.resolve({ done: false, cancelled: true, text: rec.text });
    }
    emit("xd:line-end", {
      text: rec.text, expression: rec.line.expression, pri: rec.pri, cancelled: true
    });
    return rec;
  }

  function emit(name, detail) {
    if (!hasDoc()) return;
    try {
      var Ctor = global.CustomEvent;
      if (!Ctor) return;
      global.document.dispatchEvent(new Ctor(name, { detail: detail }));
    } catch (e) {}
  }

  /* ---------- choices ---------- */

  function normalizeOptions(input) {
    var src = Object.prototype.toString.call(input) === "[object Array]" && input.length
      ? input
      : DEFAULT_OPTIONS;
    var out = [];
    for (var i = 0; i < src.length && out.length < 4; i++) {
      var o = src[i];
      if (typeof o === "string") {
        out.push({ id: "opt" + (out.length + 1), label: o, sub: "" });
      } else if (o && o.label) {
        out.push({
          id: o.id || "opt" + (out.length + 1),
          label: String(o.label),
          sub: o.sub ? String(o.sub) : ""
        });
      }
    }
    return out.length ? out : DEFAULT_OPTIONS.slice();
  }

  function choose(options, cb) {
    if (typeof options === "function" && cb === undefined) {
      cb = options;
      options = null;
    }
    ensure();
    if (pendingChoice) {
      pendingChoice.resolve(null);
      pendingChoice = null;
    }
    if (choosing) closeChoice(true);

    var req = {
      list: normalizeOptions(options),
      cb: cb,
      resolve: null,
      locked: false,
      settled: false
    };
    var promise = new Promise(function (resolve) { req.resolve = resolve; });

    if (current && current.pri < PRI.line) cancelCurrent();
    if (current && (!current.started || current.typing)) pendingChoice = req;
    else openChoice(req);
    return promise;
  }

  function openChoice(req) {
    if (choosing) closeChoice(true);
    ensure();
    choosing = req;
    lit = -1;
    buildRows(req);
    showRoot();
    if (root) root.classList.add("is-choosing");
    if (!current) setExpression("listening");
    setTimeout(function () {
      if (choosing !== req || req.locked) return;
      focusRow(0);
    }, 90);
  }

  function closeChoice(cancelled) {
    var req = choosing;
    if (!req) return;
    choosing = null;
    lit = -1;
    if (root) root.classList.remove("is-choosing");
    if (rowsEl) rowsEl.textContent = "";
    rows = [];
    if (!current) {
      applyGesture({ raw: "lean 0, tilt 0, gaze cursor", lean: 0, tilt: 0, gaze: "cursor" });
    }
    if (cancelled && req.resolve && !req.settled) {
      req.settled = true;
      req.resolve(null);
    }
  }

  function buildRows(req) {
    if (!rowsEl) return;
    rowsEl.textContent = "";
    rows = [];
    for (var i = 0; i < req.list.length; i++) {
      (function (index) {
        var opt = req.list[index];
        var row = el("button", "xd-row");
        row.type = "button";
        row.dataset.index = String(index);
        row.style.setProperty("--i", String(index));

        var idx = el("span", "xd-idx", ("0" + (index + 1)).slice(-2));
        idx.setAttribute("aria-hidden", "true");
        var mid = el("span", "xd-mid");
        mid.appendChild(el("span", "xd-label", opt.label));
        if (opt.sub) mid.appendChild(el("span", "xd-sub", opt.sub));
        var mark = el("span", "xd-mark", "x");
        mark.setAttribute("aria-hidden", "true");

        row.appendChild(idx);
        row.appendChild(mid);
        row.appendChild(mark);

        row.addEventListener("pointerenter", function () {
          if (choosing !== req || req.locked) return;
          setLit(index);
          fireReaction("row", { index: index });
        });
        row.addEventListener("focus", function () {
          if (choosing !== req || req.locked) return;
          setLit(index);
          fireReaction("row", { index: index });
        });
        row.addEventListener("click", function (e) {
          if (e && e.preventDefault) e.preventDefault();
          pick(index);
        });

        rowsEl.appendChild(row);
        rows.push(row);
      })(i);
    }
  }

  function focusRow(i) {
    var row = rows[i];
    if (!row || !row.focus) return;
    try { row.focus({ preventScroll: true }); } catch (e) {
      try { row.focus(); } catch (err) {}
    }
  }

  function setLit(i) {
    if (!choosing || choosing.locked) return;
    if (lit === i) return;
    lit = i;
    for (var j = 0; j < rows.length; j++) {
      rows[j].classList.toggle("is-lit", j === i);
    }
    if (i >= 0) {
      applyGesture({ raw: "lean 1.2, tilt " + (i === 0 ? -2 : 2), lean: 1.2, tilt: i === 0 ? -2 : 2, gaze: "row" });
    } else {
      applyGesture({ raw: "lean 0, gaze cursor", lean: 0, gaze: "cursor" });
    }
  }

  function onRowsMove(e) {
    if (!choosing || choosing.locked) return;
    var x = e.clientX || 0;
    var y = e.clientY || 0;
    var best = -1;
    var bestD = Infinity;
    var boxes = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i].getBoundingClientRect();
      boxes.push(r);
      var dx = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
      var dy = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestD) { bestD = d; best = i; }
    }
    for (var j = 0; j < rows.length; j++) {
      var near = j === best ? Math.max(0, 1 - bestD / NEAR_PX) : 0;
      rows[j].style.setProperty("--near", near.toFixed(3));
    }
    if (best >= 0 && bestD < NEAR_PX) setLit(best);
  }

  function onRowsLeave() {
    if (!choosing || choosing.locked) return;
    for (var i = 0; i < rows.length; i++) rows[i].style.setProperty("--near", "0");
    var focused = -1;
    try { focused = rows.indexOf(global.document.activeElement); } catch (e) {}
    setLit(focused);
  }

  function onRowsFocus(e) {
    if (!choosing || choosing.locked) return;
    var i = rows.indexOf(e.target);
    if (i >= 0) {
      setLit(i);
      fireReaction("row", { index: i });
    }
  }

  function onRowsBlur(e) {
    if (!choosing || choosing.locked) return;
    if (e.relatedTarget && rowsEl.contains(e.relatedTarget)) return;
    setLit(-1);
  }

  function onRowsKey(e) {
    if (!choosing || choosing.locked) return;
    var key = e.key;
    var n = rows.length;
    if (!n) return;
    if (key === "ArrowDown" || key === "ArrowUp" || key === "Home" || key === "End") {
      e.preventDefault();
      var at = rows.indexOf(global.document.activeElement);
      var next;
      if (key === "Home") next = 0;
      else if (key === "End") next = n - 1;
      else if (key === "ArrowDown") next = at < 0 ? 0 : (at + 1) % n;
      else next = at < 0 ? n - 1 : (at - 1 + n) % n;
      focusRow(next);
      setLit(next);
      return;
    }
    if (/^[1-9]$/.test(key)) {
      var i = Number(key) - 1;
      if (rows[i]) {
        e.preventDefault();
        pick(i);
      }
    }
  }

  function pick(index) {
    var req = choosing;
    if (!req || req.locked) return;
    var opt = req.list[index];
    if (!opt) return;
    req.locked = true;

    for (var i = 0; i < rows.length; i++) {
      rows[i].classList.toggle("is-picked", i === index);
      rows[i].classList.toggle("is-gone", i !== index);
      rows[i].disabled = true;
    }
    applyGesture({ raw: "nod, lean 0, tilt 0", nod: true, lean: 0, tilt: 0 });

    if (req.resolve && !req.settled) {
      req.settled = true;
      req.resolve({
        index: index,
        id: opt.id,
        label: opt.label,
        sub: opt.sub || ""
      });
    }
    if (typeof req.cb === "function") {
      try { req.cb(index, opt); } catch (e) {
        if (global.console) global.console.error(e);
      }
    }
    setTimeout(function () {
      if (choosing === req) closeChoice(false);
    }, 460);
  }

  /* ---------- idle barks ---------- */

  function barks(pool, opts) {
    opts = opts || {};
    if (bark.timer) clearTimeout(bark.timer);
    bark.timer = 0;
    bark.running = false;

    var list = normalizePool(pool);
    if (!list.length) {
      bark.pool = [];
      bark.bag = [];
      if (current && current.pri === PRI.bark) cancelCurrent();
      return api;
    }
    bark.pool = list;
    bark.bag = shuffle(list);
    bark.cap = opts.cap != null ? Math.max(0, opts.cap | 0) : 4;
    bark.fired = 0;
    bark.running = true;
    var wait = Math.max(BARK_FIRST, lastLineEnd + QUIET_AFTER - now());
    scheduleBark(wait);
    return api;
  }

  function scheduleBark(ms) {
    if (!bark.running) return;
    if (bark.timer) clearTimeout(bark.timer);
    bark.timer = setTimeout(barkTick, Math.max(200, ms | 0));
  }

  function scheduleBarkCheck() {
    if (!bark.running || !bark.timer) return;
    var gap = now() - lastLineEnd;
    if (gap < QUIET_AFTER) {
      scheduleBark(QUIET_AFTER - gap + 40);
    }
  }

  function barkTick() {
    bark.timer = 0;
    if (!bark.running) return;
    var gap = now() - lastLineEnd;
    if (current || gap < QUIET_AFTER) {
      scheduleBark(Math.max(400, QUIET_AFTER - gap + 40));
      return;
    }
    if (bark.fired >= bark.cap) {
      bark.running = false;
      return;
    }
    if (!bark.bag.length) bark.bag = shuffle(bark.pool);
    var line = bark.bag.shift();
    if (!line) {
      bark.running = false;
      return;
    }
    var spoke = speak(line, PRI.bark, {});
    if (spoke) bark.fired += 1;
    scheduleBark(rnd(BARK_GAP[0], BARK_GAP[1]));
  }

  /* ---------- cursor reactions ---------- */

  var REACTIONS = {
    hover: {
      text: "you found me. i was not hiding.",
      expression: "curious",
      gesture: "tilt 12, antenna flick, gaze cursor",
      screen: "none", cd: 3500, limit: 1
    },
    row: {
      text: "that one. good one.",
      expression: "proud",
      gesture: "gaze row, lean 6",
      screen: "none", cd: 2500, limit: 1, per: "row"
    },
    click: {
      text: "ow. okay. hello.",
      expression: "excited",
      gesture: "nod, dust, blink double",
      screen: "own", cd: 8000, limit: 3
    },
    still: {
      text: "did the cursor fall asleep.",
      expression: "curious",
      gesture: "tilt 5, blink long",
      screen: "none", cd: 20000, limit: 6
    },
    fast: {
      text: "slow down. i have one head.",
      expression: "confused",
      gesture: "antenna flick, gaze cursor",
      screen: "none", cd: 12000, limit: 6
    },
    leave: {
      text: "okay. the light stays on. it is on my head.",
      expression: "scanning",
      gesture: "gaze edge, antenna droop, hand down",
      screen: "none", cd: 0, limit: 1
    },
    back: {
      text: "you came back. i did not move.",
      expression: "proud",
      gesture: "blink once, gaze cursor",
      screen: "none", cd: 0, limit: 1
    }
  };

  var ALIASES = {
    "hover-self": "hover", "hover-rusty": "hover", "rusty-hover": "hover",
    "pointer-hover": "hover", "hover-row": "row", "row-hover": "row",
    "click-rusty": "click", "rusty-click": "click", "pointer-click": "click",
    "idle": "still", "pointer-still": "still", "still-cursor": "still",
    "fast-move": "fast", "pointer-fast": "fast",
    "pointer-leave": "leave", "leave-window": "leave", "window-leave": "leave",
    "pointer-return": "return", "window-return": "return", "back": "back"
  };

  function fireReaction(event, opts) {
    opts = opts || {};
    var key = ALIASES[event] || event;
    if (key === "return") key = "back";
    if (key === "back" && (!leftAt || now() - leftAt > 20000)) key = "hover";
    var def = REACTIONS[key];
    if (!def) return false;
    if (!armed) return false;
    if (current && current.pri >= PRI.react) return false;

    var slot = def.per === "row" ? key + ":" + (opts.index | 0) : key;
    if (def.cd && now() - (reactions[slot] || 0) < def.cd) return false;
    if (def.limit && (reactionCounts[key] || 0) >= def.limit) return false;

    if (key === "leave") leftAt = now();

    var line = {
      text: def.text,
      expression: def.expression,
      gesture: def.gesture,
      screen: def.screen,
      who: "rusty"
    };
    var spoke = speak(line, PRI.react, { rest: "listening" });
    if (!spoke) return false;

    reactions[slot] = now();
    reactionCounts[key] = (reactionCounts[key] || 0) + 1;
    if (key === "back") leftAt = 0;
    return spoke;
  }

  /* ---------- public ---------- */

  var api = {
    version: VERSION,
    say: function (line, opts) {
      var p = speak(normalizeLine(line, opts), PRI.line, opts || {});
      return p || Promise.resolve({ done: false, dropped: true, text: line && line.text });
    },
    choose: choose,
    barks: barks,
    react: fireReaction,
    attach: function (rig, opts) {
      actor = rig || null;
      actorEl = (opts && opts.el) || (rig && rig.el) || null;
      if (opts && opts.armed === false) armed = false;
      if (root) bindActor();
      return api;
    },
    arm: function (on) {
      armed = !!on;
      if (armed) {
        if (!gazeLock) setGaze("cursor");
        if (pointer.seen) {
          clearTimeout(stillTimer);
          stillTimer = setTimeout(function () {
            if (armed && pointer.seen) fireReaction("still");
          }, 6000);
        }
      }
      return api;
    },
    hush: function () {
      cancelCurrent();
      if (pendingChoice) {
        pendingChoice.resolve(null);
        pendingChoice = null;
      }
      return api;
    },
    lookAt: function (target) { return setGaze(target); },
    setExpression: setExpression,
    isSaying: function () { return !!current; },
    isChoosing: function () { return !!choosing; },
    state: function () {
      return {
        saying: !!current,
        typing: !!(current && current.typing),
        expression: root ? root.dataset.expr : "",
        choosing: !!choosing,
        lit: lit,
        armed: armed,
        barks: { running: bark.running, fired: bark.fired, left: bark.bag.length },
        gaze: lastGaze,
        pointer: { x: pointer.x, y: pointer.y, speed: Math.round(pointer.speed) }
      };
    }
  };

  global.IntroDialogue = api;
})(typeof window !== "undefined" ? window : globalThis);
