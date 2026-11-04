// Xenith share card: 1080x1350, drawn on canvas, no dependencies.
(() => {
  const W = 1080, H = 1350;

  async function ensureFont() {
    if (!document.fonts) return;
    try {
      await document.fonts.load('64px "PS2P"');
      await document.fonts.ready;
    } catch (e) { /* fall back to monospace */ }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawX(ctx, cx, cy, size, alpha) {
    const h = size / 2;
    ctx.save();
    ctx.lineCap = "round";
    ctx.shadowColor = "rgba(255,157,61,.9)";
    ctx.shadowBlur = 50;
    ctx.strokeStyle = `rgba(255,196,120,${alpha})`;
    ctx.lineWidth = 7;
    for (const [ax, ay, bx, by] of [
      [cx - h, cy - h, cx + h, cy + h],
      [cx + h, cy - h, cx - h, cy + h],
    ]) {
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawRusty(ctx, x, y, u) {
    const px = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a * u, y + b * u, w * u, h * u); };
    const white = "#e9e3d2", shade = "#bdb6a4", dark = "#241d3a", screen = "#0b0818", red = "#ff5c3b", amber = "#ffb15c";
    px(20, 6, 2, 6, amber);
    px(19, 3, 4, 3, amber);
    px(20, 2, 2, 1, "#ffe9b0");
    px(11, 12, 20, 14, dark);
    px(12, 13, 18, 12, white);
    px(13, 14, 16, 10, screen);
    ctx.save();
    ctx.shadowColor = red;
    ctx.shadowBlur = 12;
    px(16, 17, 3, 3, red);
    px(24, 17, 3, 3, red);
    ctx.restore();
    px(19, 21, 4, 1, amber);
    px(9, 16, 2, 6, dark);
    px(31, 16, 2, 6, dark);
    px(19, 26, 4, 2, shade);
    px(14, 28, 14, 10, dark);
    px(15, 29, 12, 8, white);
    px(16, 30, 10, 6, screen);
    px(17, 32, 2, 2, amber);
    px(20, 32, 2, 2, "#9ef0c0");
    px(23, 32, 2, 2, red);
    px(11, 29, 2, 7, shade);
    px(29, 29, 2, 7, shade);
    px(14, 38, 14, 4, dark);
    px(15, 39, 3, 2, shade);
    px(20, 39, 3, 2, shade);
    px(25, 39, 3, 2, shade);
  }

  function fitFont(ctx, text, maxWidth, start, family) {
    let size = start;
    do {
      ctx.font = `${size}px ${family}`;
      if (ctx.measureText(text).width <= maxWidth) break;
      size -= 4;
    } while (size > 18);
    return size;
  }

  // Shrink a single line to fit, then ellipsize if it still overflows.
  function fit(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let out = text;
    while (out.length > 4 && ctx.measureText(out + "\u2026").width > maxWidth) {
      out = out.slice(0, -1);
    }
    return out.replace(/[\s,.:;-]+$/, "") + "\u2026";
  }

  function wrap(ctx, text, maxWidth) {
    const words = text.split(/\s+/);
    const lines = [];
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  async function render(person) {
    person = person || {};
    await ensureFont();
    // Coerce here: a bad ?p= must not crash the card render.
    const name = String(person.name || "").trim() || "xenith crew";
    const dept = String(person.dept || "").trim();
    const tag = String(person.tag || "").trim();
    const line = String(person.line || "").trim();
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d");

    // Load banner image for card if available
    let bannerImg = null;
    try {
      const img = new Image();
      img.src = "../assets/brand/xenith-banner.jpg";
      await new Promise((res) => {
        img.onload = () => { bannerImg = img; res(); };
        img.onerror = () => res();
      });
    } catch (e) {}

    ctx.fillStyle = "#060412";
    ctx.fillRect(0, 0, W, H);

    // cosmic haze behind the mark
    const g = ctx.createRadialGradient(W * 0.5, H * 0.28, 20, W * 0.5, H * 0.28, 560);
    g.addColorStop(0, "rgba(254,210,53,.18)");
    g.addColorStop(0.4, "rgba(123,44,191,.15)");
    g.addColorStop(0.8, "rgba(20,8,40,.4)");
    g.addColorStop(1, "rgba(6,4,18,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    if (bannerImg && bannerImg.naturalWidth) {
      const bw = Math.min(840, W - 140);
      const bh = (bw * bannerImg.naturalHeight) / bannerImg.naturalWidth;
      const bx = (W - bw) / 2;
      const by = 200;
      ctx.drawImage(bannerImg, bx, by, bw, bh);
    } else {
      drawX(ctx, W / 2, 330, 380, 0.9);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "rgba(254,210,53,.65)";
    ctx.font = "18px ui-monospace, Menlo, monospace";
    ctx.fillText("X E N I T H   2 0 2 6", W / 2, 90);

    const nameSize = fitFont(ctx, name, 880, 68, '"PS2P", monospace');
    ctx.font = `${nameSize}px "PS2P", monospace`;
    const nameLines = name.length > 18 ? name.split(" ") : [name];
    if (nameLines.length > 1 && nameLines.join(" ").length > 18) {
      const mid = Math.ceil(nameLines.length / 2);
      const l1 = nameLines.slice(0, mid).join(" ");
      const l2 = nameLines.slice(mid).join(" ");
      ctx.fillStyle = "#180a2b";
      ctx.fillText(l1, W / 2 + 4, 694);
      ctx.fillText(l2, W / 2 + 4, 694 + nameSize * 1.35);
      ctx.fillStyle = "#fed235";
      ctx.fillText(l1, W / 2, 690);
      ctx.fillText(l2, W / 2, 690 + nameSize * 1.35);
    } else {
      ctx.fillStyle = "#180a2b";
      ctx.fillText(name, W / 2 + 4, 694);
      ctx.fillStyle = "#fed235";
      ctx.fillText(name, W / 2, 690);
    }

    ctx.fillStyle = "#ff9800";
    ctx.font = "20px ui-monospace, Menlo, monospace";
    ctx.fillText(fit(ctx, (dept || "XENITH CREW").toUpperCase(), 880), W / 2, 840);

    if (tag) {
      ctx.fillStyle = "rgba(158,240,192,.82)";
      ctx.font = "22px ui-monospace, Menlo, monospace";
      ctx.fillText(fit(ctx, tag, 880), W / 2, 884);
    }

    ctx.fillStyle = "rgba(255,233,176,.68)";
    ctx.font = "26px ui-monospace, Menlo, monospace";
    const lines = wrap(ctx, line, 760);
    const shown = lines.slice(0, 3);
    if (lines.length > 3) {
      shown[2] = fit(ctx, shown[2] + "\u2026", 760);
    }
    shown.forEach((ln, i) => {
      ctx.fillText(ln, W / 2, 940 + i * 44);
    });

    drawRusty(ctx, 740, 1060, 4);

    ctx.strokeStyle = "rgba(255,233,176,.14)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(120, 1250);
    ctx.lineTo(W - 120, 1250);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,233,176,.62)";
    ctx.font = "16px ui-monospace, Menlo, monospace";
    ctx.fillText("ST. XAVIER'S COLLEGE  //  MUMBAI", W / 2, 1290);

    return c;
  }

  function toFile(canvas, name) {
    return new Promise((res) => {
      if (typeof File !== "function" || !canvas.toBlob) { res(null); return; }
      try {
        canvas.toBlob((blob) => {
          if (!blob) { res(null); return; }
          try { res(new File([blob], name, { type: "image/png" })); } catch (e) { res(null); }
        }, "image/png");
      } catch (e) { res(null); }
    });
  }

  // Resolves true only when the png actually left the page: the share sheet
  // took it, the tab got it, or the browser was handed the anchor download.
  async function download(person) {
    person = person || {};
    const name = `xenith-${String(person.name || "crew").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
    const ua = navigator.userAgent;
    // iPadOS reports itself as a Mac, so check touch points too.
    const ios = /iPad|iPhone|iPod/.test(ua) ||
      (ua.indexOf("Macintosh") !== -1 && (navigator.maxTouchPoints || 0) > 1);

    // Open the tab before any await: a window opened after one is blocked.
    let tab = null;
    if (ios) {
      try { tab = window.open("", "_blank"); } catch (e) { tab = null; }
    }

    let c;
    try {
      c = await render(person);
    } catch (e) {
      if (tab) { try { tab.close(); } catch (err) {} }
      throw e;
    }
    const url = c.toDataURL("image/png");

    // 1. share sheet, the one path that confirms the handoff
    try {
      const file = await toFile(c, name);
      if (file && navigator.canShare && typeof navigator.share === "function" &&
        navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "xenith" });
        if (tab) { try { tab.close(); } catch (err) {} }
        return true;
      }
    } catch (e) {
      // Dismissing the sheet is not a save: say so instead of lying.
      if (e && e.name === "AbortError") {
        if (tab) { try { tab.close(); } catch (err) {} }
        return false;
      }
      // any other share failure falls through to the tab / anchor below
    }

    // 2. iOS: the tab was opened synchronously above, fill it in now
    if (tab && !tab.closed) {
      try {
        tab.document.write(`<title>${name}</title><img src="${url}" alt="" style="width:100%">`);
        tab.document.close();
        return true;
      } catch (e) {
        try { tab.close(); } catch (err) {}
      }
    }

    // 3. plain anchor download
    const a = document.createElement("a");
    if (!("download" in a)) return false;
    a.download = name;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  }

  window.XenithCard = { render, download };
})();
