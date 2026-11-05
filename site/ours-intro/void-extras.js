/* void-extras.js
   The room around Rusty: dust that parts, a distant grid, one light cone.
   Canvas 2D only. One canvas, no dependencies, no shadowBlur, no ctx.filter.

   window.VoidExtras.mount(canvas, opts) -> instance
     instance.setCursor(x, y)   pointer in css px relative to the canvas.
                                null lifts it; the bore closes in about 900ms.
     instance.setDepth(px, py)  camera vector in css px. Drift plus pointer,
                                already summed by the host. Smoothed here.
     instance.update(dt)        dt in milliseconds, advance and paint one frame.
                                A number under 0.1 is read as seconds.
     instance.burst(x, y)       one pressure ring, css px. Fires the dust and
                                the light once, then gets out of the way.
     instance.resize()          remeasure. ResizeObserver already does this.
     instance.destroy()         unhook everything. No loop is left running.

   The namespace forwards setCursor, setDepth, update and burst to the last
   mount, so a page with one canvas can call VoidExtras.update(dt) from its
   own loop. It never starts a clock of its own.

   opts { reduced, follow, bloom }
     reduced  true forces the still room. Default reads prefers-reduced-motion.
     follow   0..1, how far the beam leans toward the pointer. 0.55 default.
              Set 0 and write instance.light.angle yourself when the antenna
              owns the bulb. Off entirely on reduced motion.
     bloom    true by default. The light comes up over 900ms, like an eye.
              Pass false to start at full radius, late in the intro.

   instance.light is a plain object, safe to write between frames:
     { x, y, angle, radius, power, on }
     x, y in css px. angle in radians, canvas convention: 90deg points down.
     radius is driven by update; read it, do not fight it.

   The contract from plan/void.md: one light, one camera, the cursor is a hole
   and not a lamp. The pointer takes light out of the dust, it never adds any.
   Nothing here is brighter than the point at instance.light.

   Demo: void-extras-demo.html, move, click, press r. Test:
   node lab/intro/.extras-check.js

   One host loop:
     var room = VoidExtras.mount(document.getElementById("voidCv"));
     addEventListener("pointermove", function (e) {
       room.setCursor(e.clientX, e.clientY);
     });
     function frame(now) {
       var dt = now - last; last = now;
       room.setDepth(camX, camY);
       room.update(dt);
       requestAnimationFrame(frame);
     }
*/
(function (global) {
  "use strict";

  var VERSION = "1.0.0";
  var TAU = Math.PI * 2;
  var DEG = Math.PI / 180;

  var CREAM = "#ffe9b0";
  var AMBER = "#ffb15c";
  var VIOLET = "#7b5cff";
  var MINT = "#9ef0c0";

  var COUNT = { far: 20, mid: 58, near: 18 };
  var MOTES = COUNT.far + COUNT.mid + COUNT.near;

  /* per layer: one pixel size, one alpha band, one hole radius, one parallax
     factor. the near layer is wider and slower to react, so the bore reads as
     a cone through depth rather than a flat cutout. */
  var LAYER = {
    far: {
      size: 1, alpha: [0.09, 0.16], hole: 210, px: 0.18, py: 0.12,
      rise: [0.0016, 0.0042], sway: [0.0005, 0.0014]
    },
    mid: {
      size: 1, alpha: [0.14, 0.30], hole: 170, px: 0.18, py: 0.12,
      rise: [0.0040, 0.0110], sway: [0.0007, 0.0019]
    },
    near: {
      size: 2, alpha: [0.08, 0.18], hole: 130, px: 0.62, py: 0.44,
      rise: [0.0080, 0.0190], sway: [0.0010, 0.0026]
    }
  };

  var PUSH = 0.30;          /* fraction of the radius at the centre */
  var SPRING = { k: 14, d: 5 };
  var PLANE_GRID = { x: 0.06, y: 0.04 };
  var CAM_CAP = 0.014;      /* no plane slides more than 1.4% of the frame */
  var GRID = { v: 11, h: 5, step: 72, start: 7 };
  var GRID_LINE = "rgba(255,233,176,0.03)";
  var CONE = { half: 15 * DEG, len: 0.95 };
  var LAMP = { rim: 22, core: 10 };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function damp(a, b, lambda, dt) { return a + (b - a) * (1 - Math.exp(-lambda * dt)); }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function pick(layer) {
    var r = Math.random();
    if (layer === "near") return r < 0.62 ? CREAM : (r < 0.88 ? AMBER : VIOLET);
    if (r < 0.74) return CREAM;
    if (r < 0.89) return AMBER;
    if (r < 0.97) return VIOLET;
    return MINT;
  }

  function seed() {
    var out = [];
    var names = ["far", "mid", "near"];
    for (var n = 0; n < names.length; n++) {
      var name = names[n];
      var L = LAYER[name];
      for (var i = 0; i < COUNT[name]; i++) {
        out.push({
          layer: name,
          size: L.size,
          px: L.px,
          py: L.py,
          fx: Math.random(),
          fy: Math.random(),
          rise: L.rise[0] + Math.random() * (L.rise[1] - L.rise[0]),
          sway: L.sway[0] + Math.random() * (L.sway[1] - L.sway[0]),
          w: 0.22 + Math.random() * 0.42,
          ph: Math.random() * TAU,
          base: L.alpha[0] + Math.random() * (L.alpha[1] - L.alpha[0]),
          col: pick(name),
          ox: 0, oy: 0, vx: 0, vy: 0,
          act: 0, sx: 0, sy: 0, vis: 0, lit: 0
        });
      }
    }
    return out;
  }

  /* the falloff. a 256px sprite, cached once, scaled to the radius. no
     per-frame gradient, no shadowBlur, one drawImage. */
  function buildGlow(doc) {
    var c = doc.createElement("canvas");
    c.width = 256;
    c.height = 256;
    var g = c.getContext && c.getContext("2d");
    if (!g) return null;
    var grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, "rgba(255,177,92,0.20)");
    grd.addColorStop(0.22, "rgba(255,177,92,0.10)");
    grd.addColorStop(0.52, "rgba(255,177,92,0.032)");
    grd.addColorStop(1, "rgba(255,177,92,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    return c;
  }

  /* the wedge. five nested triangles, widest and faintest outside, so the
     cone has no hard edge. 512 long, apex at x=200, pointing down. */
  function buildCone(doc) {
    var L = 512;
    var c = doc.createElement("canvas");
    c.width = 400;
    c.height = L;
    var g = c.getContext && c.getContext("2d");
    if (!g) return null;
    var layers = [[18, 0.008], [15.5, 0.011], [13, 0.013], [10.5, 0.016], [8, 0.018]];
    for (var i = 0; i < layers.length; i++) {
      var half = Math.tan(layers[i][0] * DEG) * L;
      var a = layers[i][1];
      var grd = g.createLinearGradient(0, 0, 0, L);
      grd.addColorStop(0, "rgba(255,233,176," + a.toFixed(4) + ")");
      grd.addColorStop(0.45, "rgba(255,233,176," + (a * 0.55).toFixed(4) + ")");
      grd.addColorStop(1, "rgba(255,233,176,0)");
      g.fillStyle = grd;
      g.beginPath();
      g.moveTo(200, 0);
      g.lineTo(200 - half, L);
      g.lineTo(200 + half, L);
      g.closePath();
      g.fill();
    }
    return c;
  }

  function mount(canvas, options) {
    var opts = options || {};
    var doc = global.document;
    if (!canvas || typeof canvas.getContext !== "function") {
      throw new Error("VoidExtras.mount: a canvas is required");
    }

    if (canvas.__voidExtras) canvas.__voidExtras.destroy();

    var api = { version: VERSION };
    var ctx = canvas.getContext("2d");
    var motes = seed();
    var rings = [];
    var alive = true;

    var W = 0, H = 0, dpr = 1;
    var A = { x: 0, y: 0 };
    var time = 0;
    var ramp = 0;
    var kick = 0;

    var depth = { x: 0, y: 0 };
    var cam = { x: 0, y: 0 };
    var grid = { x: 0, y: 0 };

    var cursor = { x: 0, y: 0 };
    var last = { x: 0, y: 0 };
    var has = false;
    var presence = 0;
    var speed = 0;

    var reduced = opts.reduced == null
      ? !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches)
      : !!opts.reduced;
    var follow = isFinite(opts.follow) ? clamp(Number(opts.follow), 0, 1) : 0.55;

    var light = {
      x: 0, y: 0,
      angle: Math.PI / 2,
      radius: 0,
      power: 1,
      on: true,
      follow: follow
    };

    var glow = buildGlow(doc);
    var wedge = buildCone(doc);
    var ro = null;

    /* ---------- measure ---------- */

    function size() {
      if (!alive || !ctx) return;
      var r = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
      var w = Math.max(1, Math.round((r && r.width) || canvas.clientWidth || 0));
      var h = Math.max(1, Math.round((r && r.height) || canvas.clientHeight || 0));
      if (w <= 1 || h <= 1) {
        w = Math.max(1, canvas.width || 960);
        h = Math.max(1, canvas.height || 540);
      }
      var d = Math.min(global.devicePixelRatio || 1, 2);
      if (w === W && h === H && d === dpr) return;
      var ox = A.x, oy = A.y;
      W = w;
      H = h;
      dpr = d;
      canvas.width = Math.round(w * d);
      canvas.height = Math.round(h * d);
      A.x = W * 0.5;
      A.y = H * 0.46;
      if (!ox && !oy) {
        light.x = A.x;
        light.y = A.y;
      } else {
        light.x += A.x - ox;
        light.y += A.y - oy;
      }
      ctx.setTransform(d, 0, 0, d, 0, 0);
    }

    /* ---------- inputs ---------- */

    function setCursor(x, y) {
      if (x == null || y == null) {
        has = false;
        return api;
      }
      var nx = Number(x), ny = Number(y);
      if (!isFinite(nx) || !isFinite(ny)) {
        has = false;
        return api;
      }
      if (!has) {
        last.x = nx;
        last.y = ny;
      }
      cursor.x = nx;
      cursor.y = ny;
      has = true;
      return api;
    }

    function setDepth(x, y) {
      var nx = Number(x), ny = Number(y);
      depth.x = isFinite(nx) ? nx : 0;
      depth.y = isFinite(ny) ? ny : 0;
      return api;
    }

    function burst(x, y) {
      if (!alive || !ctx) return api;
      var bx = isFinite(x) ? Number(x) : light.x;
      var by = isFinite(y) ? Number(y) : light.y;
      if (reduced) {
        rings.push({ x: bx, y: by, age: 0, life: 0.34, pow: 0.6, still: true });
        return api;
      }
      rings.push({ x: bx, y: by, age: 0, life: 0.85, pow: 1, still: false });
      rings.push({ x: bx, y: by, age: -0.085, life: 0.9, pow: 0.55, still: false });
      if (rings.length > 24) rings.splice(0, rings.length - 24);
      kick = Math.min(1.1, kick + 0.85);

      var reach = Math.min(W, H) * 0.55;
      for (var i = 0; i < motes.length; i++) {
        var m = motes[i];
        var mx = m.fx * W + (m.layer === "near" ? (grid.nearX || 0) : (grid.farX || 0)) + m.ox;
        var my = m.fy * H + (m.layer === "near" ? (grid.nearY || 0) : (grid.farY || 0)) + m.oy;
        var dx = mx - bx, dy = my - by;
        var d = Math.sqrt(dx * dx + dy * dy) || 0.001;
        if (d > reach) continue;
        var f = (1 - d / reach) * (m.layer === "near" ? 150 : m.layer === "mid" ? 90 : 45);
        m.vx += (dx / d) * f;
        m.vy += (dy / d) * f;
      }
      return api;
    }

    /* ---------- lights, camera ---------- */

    function stepLight(dt) {
      if (ramp < 1) ramp = Math.min(1, ramp + dt / 0.9);
      var want = 0.52 * Math.min(W, H);
      light.radius = want * easeOut(ramp);
      kick = damp(kick, 0, 4.2, dt);

      var pulse = reduced ? 1 : 0.86 + 0.14 * Math.sin(time * 2.2);
      light.power = clamp(pulse + kick, 0, 2.2);

      var base = Math.PI / 2;
      if (reduced) {
        light.angle = base;
        return;
      }
      var want2 = base + Math.sin(time * 0.31) * 0.016;
      if (light.on && light.follow > 0 && has) {
        var a = Math.atan2(cursor.y - light.y, cursor.x - light.x);
        var off = Math.atan2(Math.sin(a - base), Math.cos(a - base));
        want2 = base + clamp(off, -0.40, 0.40) * light.follow;
      }
      light.angle = damp(light.angle, want2, 2.4, dt);
    }

    function stepCamera(dt) {
      if (reduced) {
        cam.x = 0;
        cam.y = 0;
      } else {
        cam.x = damp(cam.x, depth.x, 8, dt);
        cam.y = damp(cam.y, depth.y, 8, dt);
      }
      var cx = CAM_CAP * W, cy = CAM_CAP * H;
      var farX = clamp(cam.x * LAYER.far.px, -cx, cx);
      var farY = clamp(cam.y * LAYER.far.py, -cy, cy);
      var nearX = clamp(cam.x * LAYER.near.px, -cx, cx);
      var nearY = clamp(cam.y * LAYER.near.py, -cy, cy);
      grid.x = clamp(cam.x * PLANE_GRID.x, -cx, cx);
      grid.y = clamp(cam.y * PLANE_GRID.y, -cy, cy);
      grid.farX = farX;
      grid.farY = farY;
      grid.nearX = nearX;
      grid.nearY = nearY;
    }

    /* ---------- dust ---------- */

    function stepDust(dt, sizeK) {
      var farX = grid.farX || 0, farY = grid.farY || 0;
      var nearX = grid.nearX || 0, nearY = grid.nearY || 0;
      var fast = 0.3 + 0.7 * clamp(speed / 1400, 0, 1);
      var cx = cursor.x, cy = cursor.y;

      for (var i = 0; i < motes.length; i++) {
        var m = motes[i];
        var isNear = m.layer === "near";

        if (!reduced) {
          m.fy -= m.rise * dt;
          m.fx += Math.cos(time * m.w + m.ph) * m.sway * m.w * dt;
          if (m.fy < -0.04) {
            m.fy = 1.04;
            m.fx = Math.random();
          } else if (m.fy > 1.04) {
            m.fy = -0.04;
            m.fx = Math.random();
          }
          if (m.fx < -0.03) m.fx = 1.03;
          else if (m.fx > 1.03) m.fx = -0.03;
        }

        var baseX = m.fx * W + (isNear ? nearX : farX);
        var baseY = m.fy * H + (isNear ? nearY : farY);
        var tx = 0, ty = 0, dim = 1;

        /* the bore. nearer layers have a tighter radius, so one pointer
           cuts a cone and not a flat circle. */
        if (!reduced && presence > 0.004 && has) {
          var R = LAYER[m.layer].hole * sizeK;
          var dx = baseX - cx, dy = baseY - cy;
          var d = Math.sqrt(dx * dx + dy * dy) || 0.001;
          if (d < R) {
            var k = 1 - d / R;
            var push = PUSH * R * Math.pow(k, 1.6) * fast * presence;
            tx += (dx / d) * push;
            ty += (dy / d) * push;
            m.act = damp(m.act, 1, 9.5 / (1 + (d / R) * 1.4), dt);
            dim = 1 - 0.72 * k * presence;
          } else {
            m.act = damp(m.act, 0, 3, dt);
          }
        } else {
          m.act = damp(m.act, 0, 3, dt);
        }
        tx *= m.act;
        ty *= m.act;

        /* nothing crosses the lamp. this is the image people keep. */
        var ldx = baseX - light.x, ldy = baseY - light.y;
        var ld = Math.sqrt(ldx * ldx + ldy * ldy) || 0.001;
        if (light.on && ld < LAMP.rim) {
          var edge = clamp((ld - LAMP.core) / (LAMP.rim - LAMP.core), 0, 1);
          if (!reduced) {
            var lp = (LAMP.rim - ld) * 1.7;
            tx += (ldx / ld) * lp;
            ty += (ldy / ld) * lp;
          }
          dim *= edge;
        }

        var ax = (tx - m.ox) * SPRING.k - m.vx * SPRING.d;
        var ay = (ty - m.oy) * SPRING.k - m.vy * SPRING.d;
        m.vx += ax * dt;
        m.vy += ay * dt;
        m.ox += m.vx * dt;
        m.oy += m.vy * dt;

        var sx = baseX + m.ox;
        var sy = baseY + m.oy;
        var lit = 0;
        if (light.on && light.radius > 2) {
          var dlx = sx - light.x, dly = sy - light.y;
          var d2 = Math.sqrt(dlx * dlx + dly * dly) || 0.001;
          lit = Math.max(0, 1 - d2 / light.radius);
          lit = lit * Math.sqrt(lit);
        }
        m.lit = lit;
        m.sx = sx;
        m.sy = sy;
        m.vis = clamp(m.base * (0.14 + lit * 1.15) * dim, 0, 0.92);
      }
    }

    /* ---------- paint ---------- */

    function drawDust(near) {
      for (var i = 0; i < motes.length; i++) {
        var m = motes[i];
        if ((m.layer === "near") !== near) continue;
        var a = m.vis;
        if (a < 0.012) continue;
        ctx.globalAlpha = a;
        ctx.fillStyle = m.col;
        ctx.fillRect(m.sx | 0, m.sy | 0, m.size, m.size);
      }
      ctx.globalAlpha = 1;
    }

    function drawGlow() {
      if (!light.on || !glow) return;
      var r = light.radius;
      if (r < 6) return;
      ctx.globalAlpha = clamp(0.5 + 0.5 * light.power, 0, 1);
      ctx.drawImage(glow, light.x - r, light.y - r, r * 2, r * 2);
      ctx.globalAlpha = 1;
    }

    function drawCone() {
      if (!light.on || !wedge) return;
      var len = Math.max(160, H * CONE.len);
      var s = len / 512;
      ctx.save();
      ctx.translate(light.x, light.y);
      ctx.rotate(light.angle - Math.PI / 2);
      ctx.globalAlpha = clamp(ramp * (0.35 + 0.65 * light.power), 0, 1);
      ctx.drawImage(wedge, -200 * s, 0, 400 * s, len);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    function drawGrid() {
      if (!light.on) return;
      var len = Math.max(220, H * 1.12);
      var ox = A.x + grid.x;
      var oy = A.y + grid.y;
      /* 11 blades on a fan wide enough to reach both edges, but spaced against
         the cone so about three of them live inside it at every depth, on a
         phone as well as a wide monitor. */
      var stepX = Math.max(52, Math.min(W * 0.088, H * 0.11));

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(light.x, light.y);
      ctx.arc(light.x, light.y, len, light.angle - CONE.half, light.angle + CONE.half);
      ctx.closePath();
      ctx.clip();

      ctx.globalAlpha = clamp(ramp * (0.45 + 0.55 * light.power), 0, 0.92);
      ctx.strokeStyle = GRID_LINE;
      ctx.lineWidth = 1;
      ctx.beginPath();

      var half = (GRID.v - 1) / 2;
      for (var i = -half; i <= half; i++) {
        var bx = ox + i * stepX;
        var dx = bx - ox;
        var dy = (H + 40) - oy;
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        ctx.moveTo(ox + (dx / d) * GRID.start, oy + (dy / d) * GRID.start);
        ctx.lineTo(bx, H + 40);
      }
      for (var j = 1; j <= GRID.h; j++) {
        var y = oy + j * GRID.step;
        if (y > H + 40) break;
        ctx.moveTo(-40, y);
        ctx.lineTo(W + 40, y);
      }
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    function drawRings() {
      for (var i = 0; i < rings.length; i++) {
        var r = rings[i];
        if (r.age < 0) continue;
        var p = clamp(r.age / r.life, 0, 1);
        var rad = r.still
          ? Math.min(W, H) * 0.3
          : 10 + easeOut(p) * Math.min(W, H) * 0.42;
        var a = (1 - p) * (1 - p) * 0.5 * r.pow;
        if (a <= 0.01) continue;
        ctx.globalAlpha = a;
        ctx.strokeStyle = CREAM;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(r.x, r.y, rad, 0, TAU);
        ctx.stroke();
        if (!r.still && p < 0.18) {
          ctx.globalAlpha = (0.18 - p) * 1.6;
          ctx.fillStyle = CREAM;
          ctx.fillRect(Math.round(r.x) - 1, Math.round(r.y) - 1, 3, 3);
        }
      }
      ctx.globalAlpha = 1;
    }

    function draw() {
      if (!ctx || W < 2 || H < 2) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      drawGlow();
      drawCone();
      drawGrid();
      drawDust(false);
      drawRings();
      drawDust(true);
    }

    /* ---------- the frame ---------- */

    function update(dtMs) {
      if (!alive || !ctx) return api;
      var raw = Number(dtMs);
      if (!isFinite(raw) || raw <= 0) raw = 16.667;
      if (raw < 0.1) raw *= 1000;
      var dt = clamp(raw, 0.5, 50) / 1000;
      time += dt;

      /* pointer activity, measured between frames so a fast hand pushes
         harder than a slow one. */
      var mvx = has ? cursor.x - last.x : 0;
      var mvy = has ? cursor.y - last.y : 0;
      last.x = cursor.x;
      last.y = cursor.y;
      if (!reduced && has) {
        var v = Math.sqrt(mvx * mvx + mvy * mvy) / dt;
        speed = damp(speed, Math.min(v, 4000), 7, dt);
      } else {
        speed = damp(speed, 0, 7, dt);
      }
      presence = damp(presence, !reduced && has ? 1 : 0, has ? 7 : 2.4, dt);

      stepLight(dt);
      stepCamera(dt);

      var sizeK = clamp(Math.min(W, H) / 900, 0.58, 1.25);
      stepDust(dt, sizeK);

      for (var i = rings.length - 1; i >= 0; i--) {
        var r = rings[i];
        r.age += dt;
        if (r.age > r.life) rings.splice(i, 1);
      }

      draw();
      return api;
    }

    function stats() {
      var lit = 0, push = 0;
      for (var i = 0; i < motes.length; i++) {
        var m = motes[i];
        if (m.lit > 0.25) lit++;
        var d = Math.sqrt(m.ox * m.ox + m.oy * m.oy);
        if (d > push) push = d;
      }
      return {
        motes: MOTES,
        lit: lit,
        rings: rings.length,
        presence: presence,
        speed: speed,
        push: push,
        cursor: { x: cursor.x, y: cursor.y },
        depth: { x: cam.x, y: cam.y },
        light: {
          x: light.x, y: light.y, angle: light.angle,
          radius: light.radius, power: light.power, on: light.on
        }
      };
    }

    function destroy() {
      if (!alive) return;
      alive = false;
      if (ro) {
        ro.disconnect();
        ro = null;
      }
      global.removeEventListener("resize", size);
      if (canvas.__voidExtras === api) {
        try { delete canvas.__voidExtras; } catch (e) { canvas.__voidExtras = null; }
      }
      if (current === api) current = null;
    }

    api.setCursor = setCursor;
    api.setDepth = setDepth;
    api.update = update;
    api.burst = burst;
    api.resize = size;
    api.destroy = destroy;
    api.stats = stats;
    api.light = light;
    api.canvas = canvas;

    size();
    if (opts.bloom === false || reduced) ramp = 1;

    /* one silent layout pass, so the very first paint has the dust in place
       and not in a heap at 0,0. no time passes. */
    stepLight(0);
    stepCamera(0);
    stepDust(0, clamp(Math.min(W, H) / 900, 0.58, 1.25));

    if (typeof global.ResizeObserver === "function" && ctx) {
      ro = new global.ResizeObserver(function () { size(); });
      ro.observe(canvas);
    }
    if (global.addEventListener) global.addEventListener("resize", size);

    canvas.__voidExtras = api;
    current = api;
    draw();
    return api;
  }

  var current = null;

  function forward(name) {
    return function (a, b) {
      if (current) current[name](a, b);
      return api;
    };
  }

  var api = {
    version: VERSION,
    mount: mount,
    setCursor: forward("setCursor"),
    setDepth: forward("setDepth"),
    update: forward("update"),
    burst: forward("burst")
  };

  global.VoidExtras = api;
})(typeof window !== "undefined" ? window : globalThis);
