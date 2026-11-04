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
    await ensureFont();
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#06050f";
    ctx.fillRect(0, 0, W, H);

    // warm haze behind the mark
    const g = ctx.createRadialGradient(W * 0.5, H * 0.36, 20, W * 0.5, H * 0.36, 520);
    g.addColorStop(0, "rgba(255,140,60,.12)");
    g.addColorStop(0.6, "rgba(90,60,170,.06)");
    g.addColorStop(1, "rgba(6,5,15,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    drawX(ctx, W / 2, 330, 380, 0.9);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "rgba(255,233,176,.55)";
    ctx.font = "18px ui-monospace, Menlo, monospace";
    ctx.fillText("X E N I T H   2 0 2 6", W / 2, 90);

    ctx.fillStyle = "#ffe9b0";
    const nameSize = fitFont(ctx, person.name, 880, 68, '"PS2P", monospace');
    ctx.font = `${nameSize}px "PS2P", monospace`;
    const nameLines = person.name.length > 18 ? person.name.split(" ") : [person.name];
    if (nameLines.length > 1 && nameLines.join(" ").length > 18) {
      const mid = Math.ceil(nameLines.length / 2);
      ctx.fillText(nameLines.slice(0, mid).join(" "), W / 2, 690);
      ctx.fillText(nameLines.slice(mid).join(" "), W / 2, 690 + nameSize * 1.35);
    } else {
      ctx.fillText(person.name, W / 2, 690);
    }

    ctx.fillStyle = "#ffb15c";
    ctx.font = "20px ui-monospace, Menlo, monospace";
    ctx.fillText((person.dept || "XENITH CREW").toUpperCase(), W / 2, 840);

    ctx.fillStyle = "rgba(255,233,176,.68)";
    ctx.font = "26px ui-monospace, Menlo, monospace";
    const lines = wrap(ctx, person.line || "", 760);
    lines.slice(0, 3).forEach((ln, i) => {
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

  async function download(person) {
    const c = await render(person);
    const url = c.toDataURL("image/png");
    const name = `xenith-${(person.name || "crew").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (ios) {
      const w = window.open();
      if (w) { w.document.write(`<img src="${url}" style="width:100%">`); return; }
    }
    const a = document.createElement("a");
    a.download = name;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  window.XenithCard = { render, download };
})();
