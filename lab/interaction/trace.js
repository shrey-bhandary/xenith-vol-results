/* Xenith · trace to monument
   Turns the visitor's traced diagonals into the 3D X instead of throwing them away.
   Pure functions, no DOM. Dual export: window.XenithTrace / module.exports.

   Coordinate contract
   - Gate units: the ideal X runs -1..1 on both axes. The gate maps screen to units
     with x = cx + gx * (S / 2), where cx = W/2 and S = min(W, H) * 0.38.
   - Model space: the monument projects with cX, cY, base = S0 * 0.5,
     sc = 1 / (1.9 + z * 0.55) and a 2.4 multiplier. toPoints() scales gate units
     into model units; 1.15 is the canonical size.

   API
     XenithTrace.normalize(screenStrokes, W, H, S) -> unitStrokes
     XenithTrace.build(unitStrokes, opts)          -> { ok, beams, meta } | { ok:false, reason }
     XenithTrace.toPoints(beams, scale, layers)    -> [{ x, y, z }]
     XenithTrace.preview(beams, cols, rows)        -> ASCII string (node debugging)

   The fit: each raw point is assigned to its nearest guide, projected onto that
   guide, and its signed perpendicular offset is binned along the arm. Bins are
   averaged, gap-filled, smoothed, clamped, tapered at the corners, and blended
   toward the guide. The result is a closed X that bows the way the hand bowed.
   No shape classification, no ML, no dependencies.
*/
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.XenithTrace = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const GUIDES = [
    { ax: -1, ay: -1, bx: 1, by: 1 }, // top-left to bottom-right
    { ax: 1, ay: -1, bx: -1, by: 1 }  // top-right to bottom-left
  ];

  const DEFAULTS = {
    samples: 64,   // points per arm after fitting
    bins: 24,      // offset buckets along each arm
    tol: 0.22,     // gate units. ~0.22 * (S/2) px, a little over the 26px gate tolerance
    blend: 0.8,    // how much of the hand's bow survives
    maxPerp: 0.24, // hard clamp, gate units
    minBins: 10,   // below this the fit is too thin, fall back to the ideal X
    taper: 0.1     // corners anchor to the ideal so the X stays closed
  };

  const MODEL = 1.15;

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  const smoothstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };

  // Project p onto the guide's line. t is unclamped (0 at a, 1 at b), d is the
  // signed perpendicular distance in gate units.
  function project(g, p) {
    const ux = g.bx - g.ax;
    const uy = g.by - g.ay;
    const len2 = ux * ux + uy * uy;
    const len = Math.sqrt(len2);
    const t = ((p[0] - g.ax) * ux + (p[1] - g.ay) * uy) / len2;
    const fx = g.ax + ux * t;
    const fy = g.ay + uy * t;
    const nx = -uy / len;
    const ny = ux / len;
    const d = (p[0] - fx) * nx + (p[1] - fy) * ny;
    return { t: t, d: d, dist: Math.abs(d) };
  }

  // Bucket the offsets for one guide. Returns a Float64Array or null.
  function binsFor(guideIndex, data, opts) {
    const B = opts.bins;
    const sum = data[guideIndex].sum;
    const wsum = data[guideIndex].wsum;
    const raw = new Float64Array(B);
    const has = new Uint8Array(B);
    let known = 0;

    for (let i = 0; i < B; i++) {
      if (wsum[i] > 1e-6) {
        raw[i] = sum[i] / wsum[i];
        has[i] = 1;
        known++;
      }
    }
    if (known < opts.minBins) return null;

    // Fill empty buckets by linear interpolation between known neighbours.
    const filled = new Float64Array(B);
    for (let i = 0; i < B; i++) {
      if (has[i]) {
        filled[i] = raw[i];
        continue;
      }
      let l = i - 1;
      while (l >= 0 && !has[l]) l--;
      let r = i + 1;
      while (r < B && !has[r]) r++;
      if (l < 0 && r >= B) return null;
      if (l < 0) filled[i] = raw[r];
      else if (r >= B) filled[i] = raw[l];
      else filled[i] = raw[l] + ((raw[r] - raw[l]) * (i - l)) / (r - l);
    }

    // 5-tap smooth: kills mouse jitter and single-sample spikes, keeps the bow.
    const k = [1, 2, 3, 2, 1];
    const out = new Float64Array(B);
    for (let i = 0; i < B; i++) {
      let acc = 0;
      for (let j = -2; j <= 2; j++) acc += filled[clamp(i + j, 0, B - 1)] * k[j + 2];
      out[i] = acc / 9;
    }
    return out;
  }

  // Sample the fitted offsets at `samples` points and convert to gate units.
  function beamPoints(g, offs, opts) {
    const N = opts.samples;
    const B = opts.bins;
    const ux = g.bx - g.ax;
    const uy = g.by - g.ay;
    const len = Math.sqrt(ux * ux + uy * uy);
    const nx = -uy / len;
    const ny = ux / len;
    const pts = [];

    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const f = t * (B - 1);
      const i0 = Math.floor(f);
      const i1 = Math.min(B - 1, i0 + 1);
      const w = f - i0;
      let off = offs[i0] * (1 - w) + offs[i1] * w;
      off = clamp(off, -opts.maxPerp, opts.maxPerp);
      off *= opts.blend;
      // Anchor the four corners so the monument stays a closed X.
      off *= smoothstep(0, opts.taper, t) * smoothstep(0, opts.taper, 1 - t);
      pts.push({
        x: g.ax + ux * t + nx * off,
        y: g.ay + uy * t + ny * off
      });
    }
    return pts;
  }

  function normalize(strokes, W, H, S) {
    const h = Math.max(1, S / 2);
    const cx = W / 2;
    const cy = H / 2;
    return (strokes || []).map((stroke) =>
      (stroke || []).map((p) => [(p[0] - cx) / h, (p[1] - cy) / h])
    );
  }

  function build(strokes, options) {
    const opts = Object.assign({}, DEFAULTS, options || {});
    const clean = (strokes || []).filter((s) => Array.isArray(s) && s.length >= 2);
    if (!clean.length) return { ok: false, reason: "no-strokes" };

    const data = [
      { sum: new Float64Array(opts.bins), wsum: new Float64Array(opts.bins) },
      { sum: new Float64Array(opts.bins), wsum: new Float64Array(opts.bins) }
    ];
    let used = 0;

    for (const stroke of clean) {
      for (const p of stroke) {
        if (!p || !isFinite(p[0]) || !isFinite(p[1])) continue;

        let best = -1;
        let bestDist = Infinity;
        let bestProj = null;
        for (let gi = 0; gi < GUIDES.length; gi++) {
          const pr = project(GUIDES[gi], p);
          if (pr.dist < bestDist) {
            bestDist = pr.dist;
            best = gi;
            bestProj = pr;
          }
        }
        if (best < 0 || bestDist > opts.tol) continue;

        // Splat into the two nearest buckets so the offset curve stays smooth.
        const f = clamp(bestProj.t, 0, 1) * (opts.bins - 1);
        const i0 = Math.floor(f);
        const i1 = Math.min(opts.bins - 1, i0 + 1);
        const w = f - i0;
        data[best].sum[i0] += bestProj.d * (1 - w);
        data[best].wsum[i0] += 1 - w;
        data[best].sum[i1] += bestProj.d * w;
        data[best].wsum[i1] += w;
        used++;
      }
    }

    if (used < 8) return { ok: false, reason: "too-few-points" };

    const beams = [];
    for (let gi = 0; gi < GUIDES.length; gi++) {
      const offs = binsFor(gi, data, opts);
      if (!offs) return { ok: false, reason: "thin-guide-" + gi };
      beams.push(beamPoints(GUIDES[gi], offs, opts));
    }

    return {
      ok: true,
      beams: beams,
      meta: {
        pointsUsed: used,
        tolerance: opts.tol,
        blend: opts.blend
      }
    };
  }

  // Scale gate units into model units. For the gate handoff pass the scale that
  // lands the front layer (z = -0.08) exactly on the gate ink:
  //   scale = (S / 2) / (S0 * 0.5 * 2.4 / (1.9 - 0.08 * 0.55))
  // At the current constants (S = 0.38 * min, S0 = 0.265 * min) that is ~1.109.
  function toPoints(beams, scale, layers) {
    const s = scale || MODEL;
    const zs = layers || [-0.08, 0, 0.08];
    const out = [];
    for (const beam of beams) {
      for (const p of beam) {
        for (const z of zs) out.push({ x: p.x * s, y: p.y * s, z: z });
      }
    }
    return out;
  }

  // Terminal preview, for tests and for the integrator's sanity.
  function preview(beams, cols, rows) {
    const w = cols || 63;
    const h = rows || 31;
    const grid = [];
    for (let y = 0; y < h; y++) grid.push(new Array(w).fill(" "));
    const sx = (x) => Math.round(((x + 1.45) / 2.9) * (w - 1));
    const sy = (y) => Math.round(((y + 1.45) / 2.9) * (h - 1));
    for (const beam of beams) {
      for (const p of beam) {
        const x = sx(p.x);
        const y = sy(p.y);
        if (x >= 0 && x < w && y >= 0 && y < h) grid[y][x] = "#";
      }
    }
    return grid.map((r) => r.join("")).join("\n");
  }

  return {
    build: build,
    normalize: normalize,
    toPoints: toPoints,
    preview: preview,
    GUIDES: GUIDES,
    DEFAULTS: DEFAULTS,
    MODEL: MODEL
  };
});
