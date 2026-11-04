// Lab demo for the vanilla Glass Logo Reveal: the Xenith lockup on a dark 3:1 stage.
// The logo is inlined so the demo also runs straight from file://, where a cross-origin mark
// would taint the canvas and break the glass.

(function () {
  'use strict';

  const XENITH_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" width="1200" height="400">
<defs>
  <filter id="g" x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="13" result="b"/>
    <feColorMatrix in="b" type="matrix" values="0 0 0 0 1  0 0 0 0 0.55  0 0 0 0 0.2  0 0 0 0.9 0" result="tint"/>
    <feMerge><feMergeNode in="tint"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
</defs>
<g filter="url(#g)" fill="#ffb15c"><rect x="72" y="88" width="26" height="26"/><rect x="98" y="88" width="26" height="26"/><rect x="228" y="88" width="26" height="26"/><rect x="254" y="88" width="26" height="26"/><rect x="72" y="114" width="26" height="26"/><rect x="98" y="114" width="26" height="26"/><rect x="124" y="114" width="26" height="26"/><rect x="202" y="114" width="26" height="26"/><rect x="228" y="114" width="26" height="26"/><rect x="254" y="114" width="26" height="26"/><rect x="98" y="140" width="26" height="26"/><rect x="124" y="140" width="26" height="26"/><rect x="150" y="140" width="26" height="26"/><rect x="176" y="140" width="26" height="26"/><rect x="202" y="140" width="26" height="26"/><rect x="228" y="140" width="26" height="26"/><rect x="124" y="166" width="26" height="26"/><rect x="150" y="166" width="26" height="26"/><rect x="176" y="166" width="26" height="26"/><rect x="202" y="166" width="26" height="26"/><rect x="124" y="192" width="26" height="26"/><rect x="150" y="192" width="26" height="26"/><rect x="176" y="192" width="26" height="26"/><rect x="202" y="192" width="26" height="26"/><rect x="98" y="218" width="26" height="26"/><rect x="124" y="218" width="26" height="26"/><rect x="150" y="218" width="26" height="26"/><rect x="176" y="218" width="26" height="26"/><rect x="202" y="218" width="26" height="26"/><rect x="228" y="218" width="26" height="26"/><rect x="72" y="244" width="26" height="26"/><rect x="98" y="244" width="26" height="26"/><rect x="124" y="244" width="26" height="26"/><rect x="202" y="244" width="26" height="26"/><rect x="228" y="244" width="26" height="26"/><rect x="254" y="244" width="26" height="26"/><rect x="72" y="270" width="26" height="26"/><rect x="98" y="270" width="26" height="26"/><rect x="228" y="270" width="26" height="26"/><rect x="254" y="270" width="26" height="26"/></g>
<text x="304" y="300" font-family="Inter Black, Inter, DejaVu Sans, sans-serif" font-weight="900" font-size="232" letter-spacing="-8" fill="#f6f1e4" filter="url(#soft)">enith</text>
</svg>`;

  // Over HTTP the lab uses the raster mark beside this file, which renderer.js can read without
  // tainting the canvas. Opened from disk, a file:// image would trip CORS, so the same brand
  // SVG is inlined as a data URL instead.
  const markSrc =
    window.location.protocol === 'file:'
      ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(XENITH_LOGO)
      : 'mark.png';

  const stage = document.getElementById('stage');
  const replay = document.getElementById('replay');
  const resume = document.getElementById('resume');
  const scrub = document.getElementById('scrub');
  const status = document.getElementById('status');

  let reveal = null;

  function play() {
    if (!window.GlassReveal) {
      status.textContent = 'glass-reveal.js did not load.';
      return;
    }

    if (reveal) reveal.destroy();

    scrub.value = '0';
    status.textContent = 'Revealing…';

    reveal = window.GlassReveal.mount(stage, {
      markSrc,
      label: 'Xenith',
      duration: 2600,
      play: 'mount',
      onComplete() {
        status.textContent = 'Landed.';
        scrub.value = '100';
      },
    });

    // The component keeps the mark rather than the glass when WebGL2 is unavailable.
    if (reveal.el.dataset.renderer === 'none') {
      status.textContent = 'Mark shown without the glass.';
      scrub.value = '100';
    }
  }

  replay.addEventListener('click', play);

  resume.addEventListener('click', () => {
    if (!reveal) return;

    const atEnd = Number(scrub.value) >= 100;

    reveal.setProgress();
    status.textContent = atEnd ? 'Already landed.' : 'Playing on…';
  });

  scrub.addEventListener('input', () => {
    if (!reveal) return;

    const moment = Number(scrub.value) / 100;

    reveal.setProgress(moment);
    status.textContent =
      moment >= 1 ? 'Held at the end.' : 'Held at ' + Math.round(moment * 100) + '%.';
  });

  play();
})();
