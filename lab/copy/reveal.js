// Xenith selected: the personal line arrives word by word, with one pause at
// the sentence turn and one caret. No dependencies, no loop.
// Call XenithLine.start(el, { beat }) from unlock(). All words stay in the DOM
// from the first frame, so the sentence never reflows and screen readers get it
// whole. The caret is absolute, so it cannot push a word onto the next line.
(function () {
  const GAP = 52;     // ms between words
  const BEAT = 420;   // ms at the sentence turn
  const START = 1600; // ms after unlock, once the name has landed
  const HOLD = 240;   // ms after the last word
  const FADE = 420;   // caret fade

  let el = null;
  let words = [];
  let caret = null;
  let timer = 0;
  let beatAt = 0;
  let done = true;
  let last = -1;
  let onSkip = null;

  function reduced() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function clearTimer() {
    if (timer) clearTimeout(timer);
    timer = 0;
  }

  function detach() {
    if (!onSkip) return;
    removeEventListener("pointerdown", onSkip, true);
    removeEventListener("keydown", onSkip, true);
    onSkip = null;
  }

  function finish() {
    if (done) return;
    done = true;
    clearTimer();
    for (const w of words) w.style.opacity = "1";
    if (caret) {
      const c = caret;
      c.classList.remove("ln-caret-live");
      c.classList.add("ln-caret-out");
      setTimeout(() => c.remove(), FADE + 80);
    }
    detach();
  }

  function place(word) {
    if (!caret || !word) return;
    caret.classList.add("ln-caret-live");
    const r = word.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    caret.style.left = Math.round(r.right - b.left) + "px";
    caret.style.top = Math.round(r.top - b.top) + "px";
  }

  function mark(i) {
    const w = words[i];
    if (!w) return;
    last = i;
    w.style.opacity = "1";
    place(w);
  }

  addEventListener("resize", function () {
    if (done || last < 0) return;
    place(words[last]);
  });

  function step(i) {
    if (done) return;
    mark(i);
    if (i + 1 >= words.length) {
      timer = setTimeout(finish, HOLD);
      return;
    }
    const wait = GAP + (i + 1 === beatAt ? BEAT : 0);
    timer = setTimeout(() => step(i + 1), wait);
  }

  function start(node, opts) {
    if (!node || node.dataset.lnPlayed) return;
    const text = (node.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return;
    if (!done) finish();
    opts = opts || {};
    node.dataset.lnPlayed = "1";
    el = node;
    last = -1;

    const source = text.split(" ");
    node.textContent = "";
    words = source.map(function (word, i) {
      const s = document.createElement("span");
      s.className = "ln-w";
      s.textContent = word;
      s.style.opacity = "0";
      node.appendChild(s);
      if (i < source.length - 1) node.appendChild(document.createTextNode(" "));
      return s;
    });

    caret = document.createElement("span");
    caret.className = "ln-caret";
    caret.setAttribute("aria-hidden", "true");

    // Auto beat: after the first sentence period. 1-based word number.
    let auto = 0;
    for (let i = 0; i < words.length - 1; i++) {
      if (/[.!?]$/.test(words[i].textContent)) { auto = i + 1; break; }
    }
    beatAt = opts.beat === -1 ? 0 : (opts.beat > 0 ? opts.beat : auto);

    if (reduced()) {
      done = true;
      for (const w of words) w.style.opacity = "1";
      return;
    }

    done = false;
    node.appendChild(caret);
    const at = opts.start === undefined ? START : opts.start;
    timer = setTimeout(function () {
      if (done) return;
      onSkip = finish;
      addEventListener("pointerdown", onSkip, true);
      addEventListener("keydown", onSkip, true);
      step(0);
    }, at);
  }

  window.XenithLine = { start: start, finish: finish };
})();
