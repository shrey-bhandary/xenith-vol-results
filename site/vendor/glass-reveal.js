// Glassy UI Glass Logo Reveal, vanilla JavaScript port of the MIT-licensed React + WebGL2
// component (glassyui.com/components/glass-logo-reveal).
//
// Load the renderer first: window.GlassRevealRenderer comes from renderer.js. Then:
//
//   const reveal = window.GlassReveal.mount(el, {
//     markSrc, label, duration, onComplete, progress, play,
//   });
//
// It returns { setProgress, destroy, el }. setProgress holds a moment from 0 (the dark stage)
// to 1 (the mark at rest); call it with no argument to clear the hold and play on. destroy()
// tears down the figure and its GL context. el is the figure, with role="img" and the label.
//
// The DOM is the reference's: a stage canvas, the real mark img on top of it, and the mark
// alone at once under reduced motion, reduced transparency or without WebGL2.

(function (global) {
  'use strict';

  const QUALITY = {
    // Every wavelength traces the glass, so quality trades colour samples and resolution.
    low: { ratio: 1, taps: 3 },
    medium: { ratio: 1.5, taps: 3 },
    high: { ratio: 2, taps: 5 },
  };

  /** Reduced motion or transparency, from the system or the provider's preferences. */
  function stillness() {
    const root = document.documentElement.dataset;

    return (
      root.lgReduceMotion === '1' ||
      root.lgReduceTransparency === '1' ||
      matchMedia('(prefers-reduced-motion: reduce)').matches ||
      matchMedia('(prefers-reduced-transparency: reduce)').matches
    );
  }

  function luminance(colour) {
    const [r, g, b, a] = colour;

    return a ? (0.2126 * r + 0.7152 * g + 0.0722 * b) / a : 0;
  }

  /** A held moment, or undefined for "play on". */
  function heldMoment(value) {
    if (value === undefined || value === null) return undefined;

    const number = Number(value);

    return Number.isFinite(number) ? number : undefined;
  }

  function mount(host, options) {
    if (!host || typeof host.appendChild !== 'function') {
      throw new TypeError('GlassReveal.mount needs a container element.');
    }

    const settings = options || {};
    const figure = document.createElement('figure');

    figure.className = settings.className
      ? 'lg-logo-reveal ' + settings.className
      : 'lg-logo-reveal';
    figure.setAttribute('role', 'img');
    figure.setAttribute('aria-label', settings.label == null ? '' : String(settings.label));
    figure.dataset.state = 'waiting';

    const canvas = document.createElement('canvas');

    canvas.className = 'lg-logo-reveal-canvas';
    canvas.setAttribute('aria-hidden', 'true');

    const mark = document.createElement('img');

    mark.className = 'lg-logo-reveal-mark';
    mark.alt = '';
    mark.setAttribute('aria-hidden', 'true');
    mark.crossOrigin = 'anonymous';
    mark.draggable = false;

    figure.appendChild(canvas);
    figure.appendChild(mark);

    const latest = {
      duration:
        settings.duration === undefined || !Number.isFinite(Number(settings.duration))
          ? 2600
          : Number(settings.duration),
      onComplete: typeof settings.onComplete === 'function' ? settings.onComplete : undefined,
      play: settings.play === 'mount' ? 'mount' : 'visible',
      progress: heldMoment(settings.progress),
    };

    let errorEl = null;
    let destroyed = false;
    let controls = null;
    let cleanup = null;

    const setState = (next) => {
      figure.dataset.state = next;
    };

    const setError = (message) => {
      if (!errorEl) {
        errorEl = document.createElement('figcaption');
        errorEl.className = 'lg-logo-reveal-error';
        figure.appendChild(errorEl);
      }

      errorEl.textContent = message;
    };

    mark.src = settings.markSrc == null ? '' : String(settings.markSrc);
    host.appendChild(figure);

    // The reveal effect: one renderer, one state machine, one set of observers and listeners.
    const setup = () => {
      const library = global.GlassRevealRenderer;
      let renderer = null;

      if (library && typeof library.createLogoRevealRenderer === 'function') {
        try {
          renderer = library.createLogoRevealRenderer(canvas);
        } catch (error) {
          renderer = null;
        }
      }

      if (!renderer) {
        // Without WebGL2, or without the renderer loaded, the mark simply shows.
        figure.dataset.renderer = 'none';
        setState('ended');

        if (!library && typeof console !== 'undefined') {
          console.warn('GlassReveal: load renderer.js before glass-reveal.js.');
        }

        return null;
      }

      figure.dataset.renderer = 'webgl';

      const { LOGO_REVEAL_LENGTH, paintMark, readColour } = library;
      let alive = true;
      let ready = false;
      let visible = false;
      let begun = false;
      let completed = false;
      // How far through the reveal it is, from 0 to 1.
      let moment = 0;
      let frame = 0;
      let painting = 0;
      let last = 0;

      const draw = () => {
        if (ready) renderer.draw(moment * LOGO_REVEAL_LENGTH);
      };

      const stop = () => {
        cancelAnimationFrame(frame);
        frame = 0;
      };

      const finish = () => {
        stop();
        moment = 1;
        setState('ended');

        if (!completed) {
          completed = true;
          if (latest.onComplete) latest.onComplete();
        }
      };

      const tick = (now) => {
        frame = 0;

        if (!alive) return;

        // A background tab pauses the reveal rather than skipping it.
        const step = last ? Math.min(now - last, 50) : 0;

        last = now;
        moment = Math.min(moment + step / Math.max(latest.duration, 1), 1);
        draw();

        if (moment >= 1) finish();
        else frame = requestAnimationFrame(tick);
      };

      const update = () => {
        if (!alive) return;

        const when = latest.play;
        const held = latest.progress;

        // Reduced motion keeps the end state, even for a held moment.
        if (stillness()) {
          finish();

          return;
        }

        if (held !== undefined) {
          stop();
          moment = Math.min(Math.max(held, 0), 1);
          // Clearing the hold plays on from this moment.
          begun = true;
          setState(moment >= 1 ? 'ended' : 'held');
          draw();

          return;
        }

        if (moment >= 1) {
          finish();

          return;
        }

        if (!ready) return;

        if (begun || when === 'mount' || visible) {
          begun = true;
          setState('playing');

          if (!frame) {
            last = 0;
            frame = requestAnimationFrame(tick);
          }

          return;
        }

        setState('waiting');
        draw();
      };

      // Draws the mark as the page lays it out, in the figure's colours, at the device's
      // resolution within the quality preference.
      const paint = () => {
        painting = 0;

        if (!alive || !mark.complete || !mark.naturalWidth) return;

        const width = figure.clientWidth;
        const height = figure.clientHeight;

        if (!width || !height) return;

        const level = document.documentElement.dataset.lgQuality;
        const quality = level === 'low' || level === 'medium' ? QUALITY[level] : QUALITY.high;

        const ratio = Math.min(
          window.devicePixelRatio || 1,
          quality.ratio,
          renderer.limit / Math.max(width, height),
        );

        const style = getComputedStyle(figure);
        const backdrop = readColour(style.backgroundColor);

        renderer.resize(width, height, ratio);
        renderer.setTaps(quality.taps);
        renderer.setStage({
          backdrop,
          // A clear stage takes its light from the ink: pale ink means a dark page.
          dark:
            backdrop[3] > 0.5
              ? luminance(backdrop) < 0.5
              : luminance(readColour(style.color)) >= 0.5,
          thickness: Number.parseFloat(style.getPropertyValue('--lg-glass-thickness')) || 1,
        });

        try {
          const pictures = paintMark(
            figure,
            mark,
            canvas.width,
            canvas.height,
            2.5,
            renderer.limit,
          );

          renderer.setMark(pictures.sharp);
          renderer.setStill(pictures.still, pictures.layout);
        } catch (error) {
          setError('The mark needs permission to load across origins.');
          finish();

          return;
        }

        ready = true;
        update();
        draw();
      };

      const schedule = () => {
        if (alive && !painting) painting = requestAnimationFrame(paint);
      };

      const onError = () => {
        setError('The mark could not load.');
        finish();
      };

      const onLost = () => {
        ready = false;
        finish();
      };

      const sight = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];

          visible = Boolean(entry && entry.isIntersecting);
          update();
        },
        { threshold: 0.5 },
      );

      const resize = new ResizeObserver(schedule);

      const preferences = new MutationObserver(() => {
        schedule();
        update();
      });

      const queries = [
        '(prefers-reduced-motion: reduce)',
        '(prefers-reduced-transparency: reduce)',
        '(prefers-color-scheme: dark)',
      ].map((query) => matchMedia(query));

      const fonts = document.fonts;

      controls = { paint: schedule, update };
      sight.observe(figure);
      resize.observe(figure);
      preferences.observe(document.documentElement, {
        attributes: true,
        attributeFilter: [
          'class',
          'style',
          'data-lg-theme',
          'data-lg-quality',
          'data-lg-reduce-motion',
          'data-lg-reduce-transparency',
        ],
      });
      queries.forEach((query) => query.addEventListener('change', schedule));
      queries.forEach((query) => query.addEventListener('change', update));
      mark.addEventListener('load', schedule);
      mark.addEventListener('error', onError);
      canvas.addEventListener('webglcontextlost', onLost);
      fonts.addEventListener('loadingdone', schedule);

      if (mark.complete && !mark.naturalWidth && mark.currentSrc) onError();

      // Fonts that are still loading would change the name's shape.
      void fonts.ready.then(schedule);
      schedule();
      update();

      return () => {
        alive = false;
        controls = null;
        stop();
        cancelAnimationFrame(painting);
        sight.disconnect();
        resize.disconnect();
        preferences.disconnect();
        queries.forEach((query) => {
          query.removeEventListener('change', schedule);
          query.removeEventListener('change', update);
        });
        mark.removeEventListener('load', schedule);
        mark.removeEventListener('error', onError);
        canvas.removeEventListener('webglcontextlost', onLost);
        fonts.removeEventListener('loadingdone', schedule);
        renderer.dispose();
      };
    };

    cleanup = setup();

    const setProgress = (value) => {
      if (destroyed) return;

      latest.progress = heldMoment(value);
      if (controls) controls.update();
    };

    const destroy = () => {
      if (destroyed) return;

      destroyed = true;

      if (cleanup) {
        cleanup();
        cleanup = null;
      }

      controls = null;
      figure.remove();
    };

    return { setProgress, destroy, el: figure };
  }

  global.GlassReveal = { mount };
})(window);
