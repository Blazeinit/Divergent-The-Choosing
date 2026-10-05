/* ==========================================================================
   DIVERGENT — procedural retro texture library
   Every texture is painted at low resolution on a canvas so the game needs
   no external image assets. Textures are cached by name.
   texture.userData.world = size in meters of one texture tile (for UVs).
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const cache = {};
  const defs = {};

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  // ---------- painting helpers ----------
  function speckle(ctx, w, h, rng, count, colors, size) {
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = colors[Math.floor(rng() * colors.length)];
      const s = size || 1;
      ctx.fillRect(Math.floor(rng() * w), Math.floor(rng() * h), s, s);
    }
  }
  function noise(ctx, w, h, rng, strength) {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rng() - 0.5) * strength;
      d[i] = U.clamp(d[i] + n, 0, 255);
      d[i + 1] = U.clamp(d[i + 1] + n, 0, 255);
      d[i + 2] = U.clamp(d[i + 2] + n, 0, 255);
    }
    ctx.putImageData(img, 0, 0);
  }
  function blotches(ctx, w, h, rng, count, color, rMin, rMax) {
    for (let i = 0; i < count; i++) {
      const x = rng() * w, y = rng() * h, r = rMin + rng() * (rMax - rMin);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      // wrap for tiling
      if (x - r < 0 || x + r > w || y - r < 0 || y + r > h) {
        for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) {
          if (!ox && !oy) continue;
          const g2 = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
          g2.addColorStop(0, color);
          g2.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g2;
          ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
        }
      }
    }
  }
  function cracks(ctx, w, h, rng, count, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    for (let i = 0; i < count; i++) {
      let x = rng() * w, y = rng() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      const n = 3 + Math.floor(rng() * 5);
      for (let j = 0; j < n; j++) {
        x += (rng() - 0.5) * 14;
        y += (rng() - 0.5) * 14;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  function grid(ctx, w, h, cols, rows, color, lw) {
    ctx.fillStyle = color;
    const cw = w / cols, rh = h / rows;
    for (let i = 0; i <= cols; i++) ctx.fillRect(Math.round(i * cw) - (i === cols ? lw : 0), 0, lw, h);
    for (let j = 0; j <= rows; j++) ctx.fillRect(0, Math.round(j * rh) - (j === rows ? lw : 0), w, lw);
  }

  function def(name, w, h, world, painter, opts) {
    defs[name] = { w, h, world, painter, opts: opts || {} };
  }

  /* ------------------------------ surfaces ------------------------------ */
  def('concrete', 128, 128, 2.5, (c, w, h, r) => {
    c.fillStyle = '#8a8883'; c.fillRect(0, 0, w, h);
    noise(c, w, h, r, 26);
    blotches(c, w, h, r, 10, 'rgba(60,58,52,0.18)', 8, 26);
    blotches(c, w, h, r, 6, 'rgba(255,255,250,0.08)', 6, 20);
    speckle(c, w, h, r, 120, ['#6e6c67', '#9d9b95', '#5c5a55'], 1);
    cracks(c, w, h, r, 2, 'rgba(40,38,35,0.35)');
  });
  def('concrete_dark', 128, 128, 2.5, (c, w, h, r) => {
    c.fillStyle = '#5a5955'; c.fillRect(0, 0, w, h);
    noise(c, w, h, r, 30);
    blotches(c, w, h, r, 12, 'rgba(25,24,22,0.25)', 8, 30);
    speckle(c, w, h, r, 140, ['#4a4945', '#6b6a65'], 1);
    cracks(c, w, h, r, 4, 'rgba(20,20,18,0.45)');
  });
  // raw cut rock (the Dauntless Pit)
  def('rock', 128, 128, 3.2, (c, w, h, r) => {
    c.fillStyle = '#4a4744'; c.fillRect(0, 0, w, h);
    noise(c, w, h, r, 40);
    blotches(c, w, h, r, 18, 'rgba(20,18,16,0.35)', 10, 40);
    blotches(c, w, h, r, 10, 'rgba(120,112,100,0.18)', 8, 30);
    for (let i = 0; i < 9; i++) { c.fillStyle = 'rgba(15,14,12,0.4)'; const y = Math.floor(r() * h); c.fillRect(0, y, w, 1 + Math.floor(r() * 2)); }
    speckle(c, w, h, r, 220, ['#3a3734', '#5e5a55', '#2e2c2a'], 1);
    cracks(c, w, h, r, 7, 'rgba(10,10,8,0.6)');
  });
  // rooftop gravel
  def('gravel', 64, 64, 1.6, (c, w, h, r) => {
    c.fillStyle = '#6c6965'; c.fillRect(0, 0, w, h);
    speckle(c, w, h, r, 700, ['#4f4c48', '#86827c', '#5d5a56', '#9a958e', '#3e3c39'], 2);
    blotches(c, w, h, r, 4, 'rgba(30,28,26,0.18)', 6, 16);
  });
  def('concrete_panel', 128, 128, 3.0, (c, w, h, r) => {
    c.fillStyle = '#9d9a92'; c.fillRect(0, 0, w, h);
    noise(c, w, h, r, 18);
    blotches(c, w, h, r, 6, 'rgba(70,66,58,0.15)', 10, 30);
    c.fillStyle = 'rgba(40,38,34,0.55)'; c.fillRect(0, 0, w, 2); c.fillRect(0, 0, 2, h);
    c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(0, 2, w, 1); c.fillRect(2, 0, 1, h);
    // form-tie holes
    c.fillStyle = 'rgba(40,38,34,0.6)';
    for (const [x, y] of [[32, 32], [96, 32], [32, 96], [96, 96]]) c.fillRect(x - 2, y - 2, 4, 4);
  });
  def('paint_wall', 64, 128, 3.0, (c, w, h, r) => {
    // two-tone institutional wall. v=0 (bottom of canvas) is the floor.
    c.fillStyle = '#c9c6b8'; c.fillRect(0, 0, w, h);
    const lower = Math.round(h * (1 - 1.15 / 3.0));
    c.fillStyle = '#5f7378'; c.fillRect(0, lower, w, h - lower);
    c.fillStyle = '#3f4c50'; c.fillRect(0, lower - 3, w, 3);
    c.fillStyle = '#b08a3a'; c.fillRect(0, lower - 6, w, 2);
    noise(c, w, h, r, 14);
    blotches(c, w, h, r, 4, 'rgba(90,80,60,0.12)', 6, 16);
    // scuffs near floor
    c.fillStyle = 'rgba(30,30,30,0.25)';
    for (let i = 0; i < 6; i++) c.fillRect(Math.floor(r() * w), h - 6 - Math.floor(r() * 10), 4 + Math.floor(r() * 6), 1);
    c.fillStyle = '#2b2b2b'; c.fillRect(0, h - 4, w, 4); // skirting
  }, { clampV: true });
  def('paint_white', 64, 128, 3.0, (c, w, h, r) => {
    c.fillStyle = '#dcdcd6'; c.fillRect(0, 0, w, h);
    noise(c, w, h, r, 10);
    blotches(c, w, h, r, 3, 'rgba(120,120,110,0.10)', 6, 18);
    c.fillStyle = '#9a9c9a'; c.fillRect(0, Math.round(h * (1 - 1.0 / 3)), w, 2);
    c.fillStyle = '#4d5152'; c.fillRect(0, h - 4, w, 4);
  }, { clampV: true });
  def('paint_blue', 64, 128, 3.0, (c, w, h, r) => {
    c.fillStyle = '#c3cdd6'; c.fillRect(0, 0, w, h);
    const lower = Math.round(h * (1 - 1.0 / 3.0));
    c.fillStyle = '#3e5d82'; c.fillRect(0, lower, w, h - lower);
    c.fillStyle = '#d7dde4'; c.fillRect(0, lower - 2, w, 2);
    noise(c, w, h, r, 12);
    c.fillStyle = '#1e2c3d'; c.fillRect(0, h - 4, w, 4);
  }, { clampV: true });
  def('paint_warm', 64, 128, 3.0, (c, w, h, r) => {
    c.fillStyle = '#cdbf9f'; c.fillRect(0, 0, w, h);
    const lower = Math.round(h * (1 - 1.0 / 3.0));
    c.fillStyle = '#8a5a3c'; c.fillRect(0, lower, w, h - lower);
    c.fillStyle = '#5b3a26'; c.fillRect(0, lower - 3, w, 3);
    noise(c, w, h, r, 14);
    c.fillStyle = '#2b1d14'; c.fillRect(0, h - 4, w, 4);
  }, { clampV: true });
  def('tile_white', 64, 64, 1.0, (c, w, h, r) => {
    c.fillStyle = '#e4e6e3'; c.fillRect(0, 0, w, h);
    noise(c, w, h, r, 8);
    grid(c, w, h, 4, 4, '#b2b6b3', 1);
    blotches(c, w, h, r, 2, 'rgba(140,150,140,0.12)', 4, 10);
  });
  def('tile_small', 64, 64, 0.8, (c, w, h, r) => {
    c.fillStyle = '#b9c7c6'; c.fillRect(0, 0, w, h);
    noise(c, w, h, r, 10);
    grid(c, w, h, 8, 8, '#8c9a99', 1);
    blotches(c, w, h, r, 3, 'rgba(90,100,90,0.15)', 4, 10);
  });
  def('mirror', 64, 128, 2.0, (c, w, h, r) => {
    const g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#9fa8ad'); g.addColorStop(0.45, '#d8dee0'); g.addColorStop(0.55, '#c3cbcf'); g.addColorStop(1, '#8e979c');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 3; i++) { c.save(); c.translate(10 + i * 18, 0); c.rotate(0.35); c.fillRect(0, -10, 3, h * 1.4); c.restore(); }
    c.fillStyle = '#5d666b'; c.fillRect(0, 0, 2, h); c.fillRect(0, 0, w, 2);
    noise(c, w, h, r, 6);
  });
  def('terrazzo', 128, 128, 2.0, (c, w, h, r) => {
    c.fillStyle = '#a9a396'; c.fillRect(0, 0, w, h);
    speckle(c, w, h, r, 900, ['#7d776b', '#c6c0b2', '#5f5a52', '#d4cdbd', '#8c6f52', '#6b7a7c'], 2);
    noise(c, w, h, r, 10);
    c.fillStyle = 'rgba(70,64,55,0.6)'; c.fillRect(0, 0, w, 1); c.fillRect(0, 0, 1, h);
    blotches(c, w, h, r, 5, 'rgba(255,255,240,0.07)', 10, 30);
  });
  def('marble_check', 128, 128, 2.4, (c, w, h, r) => {
    const s = w / 2;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      c.fillStyle = (i + j) % 2 ? '#3d3f42' : '#c9c5bb';
      c.fillRect(i * s, j * s, s, s);
    }
    c.globalAlpha = 0.25;
    cracks(c, w, h, r, 10, '#8f8a80');
    c.globalAlpha = 1;
    noise(c, w, h, r, 12);
    c.fillStyle = 'rgba(20,20,20,0.6)'; c.fillRect(0, 0, w, 1); c.fillRect(0, 0, 1, h); c.fillRect(s, 0, 1, h); c.fillRect(0, s, w, 1);
  });
  def('tile_floor', 64, 64, 1.2, (c, w, h, r) => {
    c.fillStyle = '#9b9a8f'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#8b8a80'; c.fillRect(0, 0, w / 2, h / 2); c.fillRect(w / 2, h / 2, w / 2, h / 2);
    speckle(c, w, h, r, 200, ['#7d7c73', '#b0afa4', '#6f6e66'], 1);
    noise(c, w, h, r, 10);
    grid(c, w, h, 2, 2, '#64635c', 1);
  });
  function carpet(base, fleck) {
    return (c, w, h, r) => {
      c.fillStyle = base; c.fillRect(0, 0, w, h);
      speckle(c, w, h, r, 700, fleck, 1);
      noise(c, w, h, r, 14);
      blotches(c, w, h, r, 4, 'rgba(0,0,0,0.12)', 6, 16);
    };
  }
  def('carpet_blue', 64, 64, 1.0, carpet('#2f4565', ['#253752', '#3c5679', '#1e2c42', '#465f80']));
  def('carpet_grey', 64, 64, 1.0, carpet('#5d5e60', ['#4c4d4f', '#6e6f71', '#424345']));
  def('carpet_red', 64, 64, 1.0, carpet('#6a2a26', ['#561f1c', '#7c3530', '#45201d']));
  def('carpet_dark', 64, 64, 1.0, carpet('#2b2c30', ['#222327', '#36373b', '#1b1c1f']));
  def('ceiling_tile', 64, 64, 1.2, (c, w, h, r) => {
    c.fillStyle = '#c8c5ba'; c.fillRect(0, 0, w, h);
    speckle(c, w, h, r, 260, ['#aaa79c', '#b8b5aa', '#d6d3c8'], 1);
    blotches(c, w, h, r, 2, 'rgba(140,110,60,0.18)', 4, 12); // water stains
    grid(c, w, h, 2, 2, '#8d8b84', 2);
  });
  def('ceiling_concrete', 64, 64, 2.0, (c, w, h, r) => {
    c.fillStyle = '#6f6d68'; c.fillRect(0, 0, w, h);
    noise(c, w, h, r, 24);
    blotches(c, w, h, r, 5, 'rgba(30,28,25,0.25)', 6, 18);
  });
  def('wood_panel', 64, 128, 2.0, (c, w, h, r) => {
    c.fillStyle = '#6b4427'; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) {
      c.fillStyle = 'rgba(30,15,5,0.6)'; c.fillRect(x, 0, 1, h);
      c.fillStyle = 'rgba(255,220,180,0.06)'; c.fillRect(x + 1, 0, 1, h);
    }
    for (let i = 0; i < 70; i++) {
      c.fillStyle = 'rgba(40,20,8,' + (0.1 + r() * 0.2) + ')';
      c.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1, 4 + Math.floor(r() * 18));
    }
    noise(c, w, h, r, 10);
    c.fillStyle = '#2a190d'; c.fillRect(0, h - 5, w, 5);
    c.fillStyle = '#3a2414'; c.fillRect(0, Math.round(h * 0.62), w, 3);
  }, { clampV: true });
  def('wood', 64, 64, 1.0, (c, w, h, r) => {
    c.fillStyle = '#7b5634'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y++) {
      c.fillStyle = 'rgba(50,28,12,' + (0.08 + 0.12 * Math.abs(Math.sin(y * 0.6 + r() * 0.4))) + ')';
      c.fillRect(0, y, w, 1);
    }
    noise(c, w, h, r, 10);
  });
  def('wood_light', 64, 64, 1.0, (c, w, h, r) => {
    c.fillStyle = '#b08b5c'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y++) {
      c.fillStyle = 'rgba(90,60,30,' + (0.05 + 0.1 * Math.abs(Math.sin(y * 0.5))) + ')';
      c.fillRect(0, y, w, 1);
    }
    noise(c, w, h, r, 8);
  });
  def('metal', 64, 64, 1.0, (c, w, h, r) => {
    c.fillStyle = '#8f9496'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y++) {
      c.fillStyle = 'rgba(255,255,255,' + r() * 0.08 + ')';
      c.fillRect(0, y, w, 1);
    }
    noise(c, w, h, r, 10);
    blotches(c, w, h, r, 2, 'rgba(60,50,40,0.15)', 4, 10);
  });
  def('metal_dark', 64, 64, 1.0, (c, w, h, r) => {
    c.fillStyle = '#3c4043'; c.fillRect(0, 0, w, h);
    noise(c, w, h, r, 14);
    blotches(c, w, h, r, 3, 'rgba(0,0,0,0.2)', 4, 12);
  });
  def('metal_painted', 64, 64, 1.0, (c, w, h, r) => {
    c.fillStyle = '#4f6a5c'; c.fillRect(0, 0, w, h);
    noise(c, w, h, r, 12);
    blotches(c, w, h, r, 3, 'rgba(110,70,30,0.25)', 3, 8);
  });
  def('metal_plate', 64, 64, 1.0, (c, w, h, r) => {
    c.fillStyle = '#6c7073'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < w; x += 8) {
      c.fillStyle = '#8b8f92'; c.fillRect(x, y, 4, 1);
      c.fillStyle = '#4b4f52'; c.fillRect(x, y + 1, 4, 1);
    }
    noise(c, w, h, r, 14);
  });
  def('rust', 64, 64, 1.5, (c, w, h, r) => {
    c.fillStyle = '#6a4a35'; c.fillRect(0, 0, w, h);
    blotches(c, w, h, r, 14, 'rgba(140,70,30,0.4)', 4, 14);
    blotches(c, w, h, r, 8, 'rgba(40,30,25,0.4)', 4, 12);
    noise(c, w, h, r, 26);
  });
  def('pavement', 128, 128, 3.0, (c, w, h, r) => {
    c.fillStyle = '#7f7c75'; c.fillRect(0, 0, w, h);
    noise(c, w, h, r, 22);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      c.fillStyle = 'rgba(' + (r() > 0.5 ? '255,255,250' : '20,20,18') + ',' + r() * 0.07 + ')';
      c.fillRect(i * 32, j * 32, 32, 32);
    }
    grid(c, w, h, 4, 4, '#55534e', 1);
    blotches(c, w, h, r, 6, 'rgba(40,40,30,0.18)', 6, 20);
    cracks(c, w, h, r, 3, 'rgba(30,30,25,0.4)');
  });
  def('asphalt', 128, 128, 5.0, (c, w, h, r) => {
    c.fillStyle = '#3d3d3e'; c.fillRect(0, 0, w, h);
    speckle(c, w, h, r, 1500, ['#2e2e2f', '#4c4c4d', '#555556', '#262627'], 1);
    blotches(c, w, h, r, 6, 'rgba(15,15,15,0.3)', 10, 30);
    cracks(c, w, h, r, 6, 'rgba(20,20,20,0.6)');
  });
  def('grass', 64, 64, 2.0, (c, w, h, r) => {
    c.fillStyle = '#4b5e30'; c.fillRect(0, 0, w, h);
    speckle(c, w, h, r, 900, ['#3e5127', '#5a6f38', '#6b7c40', '#36451f', '#7b7a44'], 1);
    blotches(c, w, h, r, 4, 'rgba(90,80,40,0.25)', 6, 16);
  });
  // a field in rows: the crop along the ridges, the soil between (grey, tinted by the field: wheat,
  // corn, cabbages, the plough's furrows); four rows a tile, along u
  def('field_rows', 64, 64, 3.0, (c, w, h, r) => {
    c.fillStyle = '#9a9a92'; c.fillRect(0, 0, w, h);
    for (let k = 0; k < 4; k++) {
      const y = k * 16;
      c.fillStyle = '#5a564e'; c.fillRect(0, y, w, 5); // the furrow
      c.fillStyle = '#76736a'; c.fillRect(0, y + 5, w, 2);
      c.fillStyle = '#b4b4aa'; c.fillRect(0, y + 9, w, 4); // the top of the ridge, catching the light
    }
    speckle(c, w, h, r, 500, ['#6a675f', '#c8c8bc', '#8a877e', '#4e4b45'], 1);
    noise(c, w, h, r, 16);
  });
  def('dirt', 64, 64, 2.0, (c, w, h, r) => {
    c.fillStyle = '#5b4632'; c.fillRect(0, 0, w, h);
    speckle(c, w, h, r, 700, ['#4a3828', '#6d5640', '#3b2c20', '#7a6650'], 1);
    noise(c, w, h, r, 14);
  });
  def('brick', 128, 128, 2.4, (c, w, h, r) => {
    c.fillStyle = '#5d5a55'; c.fillRect(0, 0, w, h);
    const bh = 8, bw = 24;
    for (let y = 0; y < h; y += bh) {
      const off = (y / bh) % 2 ? bw / 2 : 0;
      for (let x = -bw; x < w + bw; x += bw) {
        const v = 0.85 + r() * 0.3;
        c.fillStyle = U.rgbToCss(0.52 * v, 0.27 * v, 0.2 * v);
        c.fillRect(x + off + 1, y + 1, bw - 2, bh - 2);
      }
    }
    noise(c, w, h, r, 18);
    blotches(c, w, h, r, 5, 'rgba(20,20,20,0.25)', 8, 26);
  });
  def('facade', 128, 192, 9.0, (c, w, h, r) => {
    // exterior concrete facade: v=0 is the ground. upper floors have dark windows.
    c.fillStyle = '#8b877e'; c.fillRect(0, 0, w, h);
    noise(c, w, h, r, 20);
    blotches(c, w, h, r, 10, 'rgba(50,45,40,0.22)', 8, 30);
    // streaks
    for (let i = 0; i < 20; i++) {
      c.fillStyle = 'rgba(40,36,30,' + r() * 0.15 + ')';
      c.fillRect(Math.floor(r() * w), 0, 1 + Math.floor(r() * 2), Math.floor(r() * h * 0.8));
    }
    // floor bands
    for (const f of [0.36, 0.7]) {
      const y = Math.round(h * (1 - f));
      c.fillStyle = '#6c6860'; c.fillRect(0, y, w, 4);
      c.fillStyle = 'rgba(255,255,255,0.1)'; c.fillRect(0, y, w, 1);
    }
    // windows on the upper floors
    for (const f of [0.42, 0.76]) {
      const y = Math.round(h * (1 - f)) - 26;
      for (let x = 10; x < w; x += 40) {
        c.fillStyle = '#26292b'; c.fillRect(x, y, 24, 24);
        const lit = r() < 0.25;
        c.fillStyle = lit ? 'rgba(220,200,140,0.6)' : 'rgba(80,100,110,0.35)';
        c.fillRect(x + 2, y + 2, 9, 20); c.fillRect(x + 13, y + 2, 9, 20);
        c.fillStyle = '#4a4740'; c.fillRect(x - 1, y + 24, 26, 2);
      }
    }
  });
  def('fabric_grey', 32, 32, 0.6, (c, w, h, r) => {
    c.fillStyle = '#58595c'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) { c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(0, y, w, 1); }
    noise(c, w, h, r, 14);
  });
  def('fabric_blue', 32, 32, 0.6, (c, w, h, r) => {
    c.fillStyle = '#304a6b'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) { c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(0, y, w, 1); }
    noise(c, w, h, r, 14);
  });
  def('plastic', 32, 32, 1.0, (c, w, h, r) => {
    c.fillStyle = '#c2bfb4'; c.fillRect(0, 0, w, h);
    noise(c, w, h, r, 8);
  });
  def('plastic_orange', 32, 32, 1.0, (c, w, h, r) => {
    c.fillStyle = '#c4672c'; c.fillRect(0, 0, w, h);
    noise(c, w, h, r, 10);
  });
  def('white', 8, 8, 1.0, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); });
  def('black', 8, 8, 1.0, (c, w, h) => { c.fillStyle = '#121212'; c.fillRect(0, 0, w, h); });
  def('light_panel', 32, 32, 1.2, (c, w, h, r) => {
    c.fillStyle = '#f4f1e2'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#d9d5c2';
    for (let x = 2; x < w; x += 4) c.fillRect(x, 0, 1, h);
    c.fillStyle = '#9a978c'; c.fillRect(0, 0, w, 2); c.fillRect(0, h - 2, w, 2); c.fillRect(0, 0, 2, h); c.fillRect(w - 2, 0, 2, h);
  });
  def('light_panel_dim', 32, 32, 1.2, (c, w, h, r) => {
    c.fillStyle = '#8f8c80'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#7a776c';
    for (let x = 2; x < w; x += 4) c.fillRect(x, 0, 1, h);
    c.fillStyle = '#5a584f'; c.fillRect(0, 0, w, 2); c.fillRect(0, h - 2, w, 2);
  });
  def('chainlink', 32, 32, 0.5, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.strokeStyle = 'rgba(170,175,175,0.95)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, h / 2); c.lineTo(w / 2, 0); c.lineTo(w, h / 2); c.lineTo(w / 2, h); c.closePath();
    c.stroke();
  }, { alpha: true });
  def('grate', 32, 32, 0.5, (c, w, h) => {
    c.fillStyle = '#2a2c2d'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#6a6e70';
    for (let x = 0; x < w; x += 4) c.fillRect(x, 0, 2, h);
    c.fillRect(0, 0, w, 2); c.fillRect(0, h - 2, w, 2);
  });
  def('vent', 32, 32, 0.6, (c, w, h) => {
    c.fillStyle = '#9fa3a3'; c.fillRect(0, 0, w, h);
    for (let y = 4; y < h - 2; y += 4) { c.fillStyle = '#2f3233'; c.fillRect(3, y, w - 6, 2); }
    c.fillStyle = '#6a6e6e'; c.fillRect(0, 0, w, 2); c.fillRect(0, 0, 2, h);
  });
  def('lockers', 64, 128, 1.2, (c, w, h, r) => {
    c.fillStyle = '#56707a'; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) {
      c.fillStyle = '#2f3d42'; c.fillRect(x, 0, 2, h);
      for (let y = 8; y < 30; y += 4) { c.fillStyle = '#34454b'; c.fillRect(x + 8, y, 16, 2); }
      c.fillStyle = '#c0c4c4'; c.fillRect(x + 24, 60, 3, 10);
      c.fillStyle = '#e8e2c8'; c.fillRect(x + 8, 36, 12, 6);
    }
    noise(c, w, h, r, 12);
  });
  def('shelf_files', 64, 64, 1.0, (c, w, h, r) => {
    c.fillStyle = '#3c3a35'; c.fillRect(0, 0, w, h);
    for (let row = 0; row < 2; row++) {
      let x = 1;
      while (x < w - 1) {
        const bw = 2 + Math.floor(r() * 4);
        const col = U.pick(['#c8b88a', '#a39066', '#7a8a9a', '#9a6a4a', '#d8d0b8', '#5c6f84']);
        c.fillStyle = col;
        const top = row * 32 + 4 + Math.floor(r() * 5);
        c.fillRect(x, top, bw, 32 - (top - row * 32) - 2);
        x += bw + 1;
      }
      c.fillStyle = '#6a6458'; c.fillRect(0, row * 32 + 30, w, 2);
    }
  });
  def('server', 32, 64, 1.0, (c, w, h, r) => {
    c.fillStyle = '#16191b'; c.fillRect(0, 0, w, h);
    for (let y = 2; y < h; y += 6) {
      c.fillStyle = '#2b3033'; c.fillRect(1, y, w - 2, 5);
      for (let x = 3; x < 12; x += 3) {
        c.fillStyle = r() > 0.4 ? (r() > 0.5 ? '#38e86b' : '#e8b838') : '#1e3a24';
        c.fillRect(x, y + 2, 1, 1);
      }
      c.fillStyle = '#4a5054'; c.fillRect(16, y + 1, 13, 3);
    }
  });
  def('crt_green', 32, 32, 1.0, (c, w, h, r) => {
    c.fillStyle = '#04140a'; c.fillRect(0, 0, w, h);
    for (let y = 3; y < h - 2; y += 3) {
      c.fillStyle = 'rgba(80,255,120,' + (0.3 + r() * 0.5) + ')';
      c.fillRect(2, y, 4 + Math.floor(r() * 22), 1);
    }
    for (let y = 0; y < h; y += 2) { c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(0, y, w, 1); }
  });
  def('crt_blue', 32, 32, 1.0, (c, w, h, r) => {
    c.fillStyle = '#0a1830'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#2e6fd6'; c.fillRect(0, 0, w, 4);
    for (let y = 7; y < h - 2; y += 3) {
      c.fillStyle = 'rgba(180,210,255,' + (0.3 + r() * 0.5) + ')';
      c.fillRect(3, y, 3 + Math.floor(r() * 20), 1);
    }
    for (let y = 0; y < h; y += 2) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, y, w, 1); }
  });
  def('crt_cctv', 32, 32, 1.0, (c, w, h, r) => {
    c.fillStyle = '#1b1f1c'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#3e4741'; c.fillRect(4, 14, 24, 12); c.fillRect(8, 6, 4, 8);
    noise(c, w, h, r, 50);
    for (let y = 0; y < h; y += 2) { c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(0, y, w, 1); }
    c.fillStyle = '#e84a3a'; c.fillRect(26, 2, 3, 3);
  });
  def('vending', 32, 64, 1.0, (c, w, h, r) => {
    c.fillStyle = '#7a1f1f'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1a2430'; c.fillRect(2, 2, 20, 46);
    for (let y = 4; y < 46; y += 8) for (let x = 3; x < 21; x += 5) {
      c.fillStyle = U.pick(['#d8c050', '#4a8ad8', '#d85a3a', '#5ad87a', '#e8e8e8']);
      c.fillRect(x, y, 3, 5);
    }
    c.fillStyle = 'rgba(200,230,255,0.15)'; c.fillRect(2, 2, 20, 46);
    c.fillStyle = '#c8c8c0'; c.fillRect(24, 10, 6, 14);
    c.fillStyle = '#111'; c.fillRect(4, 52, 16, 8);
    c.fillStyle = '#f0e0a0'; c.fillRect(24, 4, 6, 3);
  });
  def('paper', 32, 32, 0.3, (c, w, h, r) => {
    c.fillStyle = '#e8e3d3'; c.fillRect(0, 0, w, h);
    for (let y = 5; y < h - 3; y += 3) { c.fillStyle = 'rgba(40,40,40,0.4)'; c.fillRect(3, y, 6 + Math.floor(r() * 20), 1); }
  });
  def('corkboard', 64, 64, 1.0, (c, w, h, r) => {
    c.fillStyle = '#9b7348'; c.fillRect(0, 0, w, h);
    speckle(c, w, h, r, 500, ['#7f5c38', '#b48858', '#6b4c2e'], 1);
    for (let i = 0; i < 7; i++) {
      const x = 4 + Math.floor(r() * 44), y = 4 + Math.floor(r() * 44);
      c.fillStyle = U.pick(['#ece6d4', '#f2e9a8', '#d8e4ec', '#f0d0c0']);
      c.fillRect(x, y, 12 + Math.floor(r() * 6), 14 + Math.floor(r() * 4));
      c.fillStyle = 'rgba(40,40,40,0.5)';
      for (let k = 0; k < 4; k++) c.fillRect(x + 2, y + 3 + k * 3, 8, 1);
      c.fillStyle = U.pick(['#d03030', '#3050d0', '#30a030']); c.fillRect(x + 5, y, 2, 2);
    }
    c.fillStyle = '#4a3420'; c.fillRect(0, 0, w, 3); c.fillRect(0, h - 3, w, 3); c.fillRect(0, 0, 3, h); c.fillRect(w - 3, 0, 3, h);
  });
  def('whiteboard', 64, 32, 1.0, (c, w, h, r) => {
    c.fillStyle = '#eef0ee'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(40,60,160,0.6)'; c.lineWidth = 1;
    for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(6 + r() * 10, 5 + i * 5); c.lineTo(20 + r() * 34, 5 + i * 5 + r() * 2); c.stroke(); }
    c.strokeStyle = 'rgba(180,40,40,0.6)'; c.beginPath(); c.arc(48, 20, 6, 0, 6.28); c.stroke();
    c.fillStyle = '#8a8c8a'; c.fillRect(0, 0, w, 1); c.fillRect(0, h - 1, w, 1);
  });
  def('water', 64, 64, 3.0, (c, w, h, r) => {
    c.fillStyle = '#20343a'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      c.fillStyle = 'rgba(160,200,210,' + r() * 0.25 + ')';
      c.fillRect(Math.floor(r() * w), Math.floor(r() * h), 4 + Math.floor(r() * 10), 1);
    }
  });
  def('rail_track', 64, 64, 2.0, (c, w, h, r) => {
    c.fillStyle = '#2d2a26'; c.fillRect(0, 0, w, h);
    speckle(c, w, h, r, 600, ['#3e3a34', '#4a443c', '#26231f', '#5a5246'], 2);
    for (let y = 2; y < h; y += 12) { c.fillStyle = '#4a3624'; c.fillRect(0, y, w, 5); }
    c.fillStyle = '#8a8a88'; c.fillRect(12, 0, 4, h); c.fillRect(48, 0, 4, h);
  });
  def('tactile', 32, 32, 0.6, (c, w, h) => {
    c.fillStyle = '#c9a42a'; c.fillRect(0, 0, w, h);
    for (let y = 2; y < h; y += 6) for (let x = 2; x < w; x += 6) { c.fillStyle = '#8f7418'; c.fillRect(x, y, 3, 3); }
  });
  def('hazard', 32, 32, 1.0, (c, w, h) => {
    c.fillStyle = '#d8b020'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1a1a1a';
    for (let i = -h; i < w; i += 12) { c.beginPath(); c.moveTo(i, h); c.lineTo(i + 6, h); c.lineTo(i + 6 + h, 0); c.lineTo(i + h, 0); c.fill(); }
  });
  def('glass_dark', 8, 8, 1.0, (c, w, h) => { c.fillStyle = '#1d2326'; c.fillRect(0, 0, w, h); });
  /* ------------------------------ Build 3: the training room ------------------------------ */
  // interlocking foam mats, scuffed where people land
  def('mat_foam', 64, 64, 1.0, (c, w, h, r) => {
    c.fillStyle = '#1f2a38'; c.fillRect(0, 0, w, h);
    noise(c, w, h, r, 14);
    blotches(c, w, h, r, 5, 'rgba(120,130,150,0.12)', 6, 18);
    c.fillStyle = 'rgba(8,10,14,0.85)';
    for (let x = 0; x < w; x += 8) { c.fillRect(x, 0, 1, 3); c.fillRect(x + 4, h - 3, 1, 3); }
    c.fillRect(0, 0, w, 1); c.fillRect(0, 0, 1, h);
    speckle(c, w, h, r, 60, ['#2c394c', '#141c26'], 1);
  });
  // a chalkboard, wiped a hundred times
  def('chalkboard', 64, 64, 1.2, (c, w, h, r) => {
    c.fillStyle = '#1e2420'; c.fillRect(0, 0, w, h);
    blotches(c, w, h, r, 10, 'rgba(200,205,200,0.06)', 6, 22);
    noise(c, w, h, r, 8);
  });
  // rubber floor of the ring
  def('mat_red', 64, 64, 1.0, (c, w, h, r) => {
    c.fillStyle = '#5a1c1a'; c.fillRect(0, 0, w, h);
    noise(c, w, h, r, 16);
    blotches(c, w, h, r, 6, 'rgba(20,6,6,0.25)', 6, 20);
    c.fillStyle = 'rgba(10,4,4,0.7)'; c.fillRect(0, 0, w, 1); c.fillRect(0, 0, 1, h);
  });

  /* ------------------------------ sky -------------------------------- */
  def('skyline', 1024, 256, 1, (c, w, h, r) => {
    c.clearRect(0, 0, w, h);
    // far layer
    let x = 0;
    while (x < w) {
      const bw = 10 + Math.floor(r() * 40), bh = 20 + Math.floor(r() * 90);
      c.fillStyle = '#3c4148';
      c.fillRect(x, h - bh, bw, bh);
      x += bw + Math.floor(r() * 4);
    }
    // near layer with lit windows
    x = 0;
    while (x < w) {
      const bw = 18 + Math.floor(r() * 50);
      let bh = 30 + Math.floor(r() * 120);
      if (r() < 0.04) bh = 200 + Math.floor(r() * 40); // landmark towers
      c.fillStyle = '#23272c';
      c.fillRect(x, h - bh, bw, bh);
      if (bh > 190) { c.fillRect(x + bw / 2 - 1, h - bh - 30, 2, 30); c.fillRect(x + bw / 2 - 6, h - bh - 4, 12, 4); }
      // broken tops
      if (r() < 0.3) { c.clearRect(x + Math.floor(r() * bw), h - bh, 4 + Math.floor(r() * 8), 6 + Math.floor(r() * 10)); }
      for (let wy = h - bh + 6; wy < h - 4; wy += 6) for (let wx = x + 3; wx < x + bw - 3; wx += 5) {
        if (r() < 0.06) { c.fillStyle = 'rgba(230,200,130,0.85)'; c.fillRect(wx, wy, 2, 3); }
      }
      x += bw + Math.floor(r() * 10);
    }
  }, { alpha: true, wrap: 'repeatX' });

  /* ---------------------------- emblems ------------------------------ */
  // Simple original faction sigils.
  function emblem(id, c, w, h, color, bg) {
    const cx = w / 2, cy = h / 2, R = w * 0.44;
    if (bg) { c.fillStyle = bg; c.fillRect(0, 0, w, h); } else c.clearRect(0, 0, w, h);
    c.strokeStyle = color; c.fillStyle = color; c.lineWidth = w * 0.045;
    c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke();
    c.lineWidth = w * 0.035;
    if (id === 'abnegation') {
      // two open hands meeting
      for (const s of [-1, 1]) {
        c.beginPath();
        c.moveTo(cx + s * R * 0.08, cy + R * 0.55);
        c.quadraticCurveTo(cx + s * R * 0.75, cy + R * 0.35, cx + s * R * 0.55, cy - R * 0.25);
        c.lineTo(cx + s * R * 0.25, cy - R * 0.6);
        c.stroke();
        for (let k = 0; k < 3; k++) {
          c.beginPath();
          c.moveTo(cx + s * R * (0.5 - k * 0.1), cy - R * (0.2 + k * 0.12));
          c.lineTo(cx + s * R * (0.12 + k * 0.04), cy - R * (0.35 + k * 0.1));
          c.stroke();
        }
      }
    } else if (id === 'dauntless') {
      // flames
      for (const [ox, sc] of [[-0.32, 0.7], [0.32, 0.7], [0, 1]]) {
        c.beginPath();
        const bx = cx + ox * R, by = cy + R * 0.6;
        c.moveTo(bx - R * 0.22 * sc, by);
        c.quadraticCurveTo(bx - R * 0.35 * sc, by - R * 0.6 * sc, bx, by - R * 1.25 * sc);
        c.quadraticCurveTo(bx + R * 0.1 * sc, by - R * 0.7 * sc, bx + R * 0.3 * sc, by - R * 0.55 * sc);
        c.quadraticCurveTo(bx + R * 0.32 * sc, by - R * 0.2 * sc, bx + R * 0.22 * sc, by);
        c.closePath();
        c.fill();
      }
    } else if (id === 'erudite') {
      // an eye
      c.beginPath();
      c.moveTo(cx - R * 0.75, cy);
      c.quadraticCurveTo(cx, cy - R * 0.75, cx + R * 0.75, cy);
      c.quadraticCurveTo(cx, cy + R * 0.75, cx - R * 0.75, cy);
      c.stroke();
      c.beginPath(); c.arc(cx, cy, R * 0.22, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(cx - R * 0.5, cy - R * 0.62); c.lineTo(cx + R * 0.5, cy - R * 0.62); c.stroke();
    } else if (id === 'candor') {
      // balance scales
      c.beginPath(); c.moveTo(cx, cy - R * 0.65); c.lineTo(cx, cy + R * 0.55); c.stroke();
      c.beginPath(); c.moveTo(cx - R * 0.6, cy - R * 0.4); c.lineTo(cx + R * 0.6, cy - R * 0.4); c.stroke();
      c.beginPath(); c.moveTo(cx - R * 0.3, cy + R * 0.55); c.lineTo(cx + R * 0.3, cy + R * 0.55); c.stroke();
      for (const s of [-1, 1]) {
        c.beginPath(); c.moveTo(cx + s * R * 0.6, cy - R * 0.4); c.lineTo(cx + s * R * 0.42, cy + R * 0.05);
        c.lineTo(cx + s * R * 0.78, cy + R * 0.05); c.closePath(); c.stroke();
        c.beginPath(); c.arc(cx + s * R * 0.6, cy + R * 0.05, R * 0.18, 0, Math.PI); c.fill();
      }
    } else if (id === 'amity') {
      // tree
      c.beginPath(); c.moveTo(cx, cy + R * 0.65); c.lineTo(cx, cy - R * 0.1); c.stroke();
      for (const [dx, dy] of [[-0.35, -0.15], [0.35, -0.15], [0, -0.45]]) {
        c.beginPath(); c.moveTo(cx, cy + R * 0.1); c.lineTo(cx + dx * R * 0.6, cy + dy * R * 0.4); c.stroke();
      }
      for (const [dx, dy, rr] of [[0, -0.4, 0.3], [-0.32, -0.15, 0.24], [0.32, -0.15, 0.24], [-0.18, -0.55, 0.2], [0.18, -0.55, 0.2]]) {
        c.beginPath(); c.arc(cx + dx * R, cy + dy * R, rr * R, 0, Math.PI * 2); c.fill();
      }
      c.beginPath(); c.moveTo(cx - R * 0.4, cy + R * 0.65); c.lineTo(cx + R * 0.4, cy + R * 0.65); c.stroke();
    } else if (id === 'factionless') {
      c.beginPath(); c.moveTo(cx - R * 0.5, cy - R * 0.5); c.lineTo(cx + R * 0.5, cy + R * 0.5); c.stroke();
    } else {
      // five-faction seal: five dots on a ring
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k * Math.PI * 2) / 5;
        c.beginPath(); c.arc(cx + Math.cos(a) * R * 0.55, cy + Math.sin(a) * R * 0.55, R * 0.16, 0, Math.PI * 2); c.fill();
      }
      c.beginPath(); c.arc(cx, cy, R * 0.2, 0, Math.PI * 2); c.stroke();
    }
  }

  /* ---------------------------- API ------------------------------- */
  const Tex = {
    defs,
    filterMode() {
      return DV.Settings && DV.Settings.get('textureFilter') === 'smooth' ? THREE.LinearFilter : THREE.NearestFilter;
    },
    finalize(tex, opts) {
      tex.wrapS = opts.wrap === 'clamp' ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
      tex.wrapT = opts.wrap === 'clamp' || opts.wrap === 'repeatX' || opts.clampV ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
      tex.magFilter = Tex.filterMode();
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.anisotropy = 1;
      tex.needsUpdate = true;
      return tex;
    },
    get(name) {
      if (cache[name]) return cache[name];
      const d = defs[name];
      if (!d) {
        console.warn('[Tex] missing texture', name);
        return Tex.get('white');
      }
      const cv = makeCanvas(d.w, d.h);
      const ctx = cv.getContext('2d');
      d.painter(ctx, d.w, d.h, U.rng('tex_' + name));
      const tex = new THREE.CanvasTexture(cv);
      Tex.finalize(tex, d.opts);
      tex.userData.world = d.world;
      tex.userData.alpha = !!d.opts.alpha;
      cache[name] = tex;
      return tex;
    },
    // A text sign. Cached by key.
    sign(text, opts) {
      opts = opts || {};
      const key = 'sign:' + text + ':' + JSON.stringify(opts);
      if (cache[key]) return cache[key];
      const w = opts.w || 256, h = opts.h || 64;
      const cv = makeCanvas(w, h);
      const c = cv.getContext('2d');
      c.fillStyle = opts.bg || '#1f2a2e';
      c.fillRect(0, 0, w, h);
      if (opts.border !== false) {
        c.strokeStyle = opts.borderColor || 'rgba(255,255,255,0.6)';
        c.lineWidth = 3;
        c.strokeRect(5, 5, w - 10, h - 10);
      }
      if (opts.stripe) { c.fillStyle = opts.stripe; c.fillRect(0, h - 12, w, 6); }
      c.fillStyle = opts.color || '#f1ede0';
      const lines = String(text).split('\n');
      let size = opts.size || Math.floor((h * 0.5) / lines.length);
      const fontOf = (sz) => (opts.weight || 'bold') + ' ' + sz + 'px ' + (opts.font || '"Arial Narrow", Arial, sans-serif');
      c.font = fontOf(size);
      const room = w - (opts.arrow ? 90 : 28);
      while (size > 8 && Math.max.apply(null, lines.map((ln) => c.measureText(ln).width)) > room) {
        size--;
        c.font = fontOf(size);
      }
      c.textAlign = opts.align || 'center';
      c.textBaseline = 'middle';
      const x = opts.align === 'left' ? 16 : w / 2;
      lines.forEach((ln, i) => {
        c.fillText(ln, x, h / 2 + (i - (lines.length - 1) / 2) * size * 1.15);
      });
      if (opts.arrow) {
        c.font = 'bold ' + Math.floor(h * 0.55) + 'px Arial';
        c.textAlign = opts.arrow === 'left' ? 'left' : 'right';
        c.fillText(opts.arrow === 'left' ? '◄' : opts.arrow === 'up' ? '▲' : '►', opts.arrow === 'left' ? 14 : w - 14, h / 2);
      }
      // retro grime
      const r = U.rng(key);
      const img = c.getImageData(0, 0, w, h);
      for (let i = 0; i < img.data.length; i += 4) {
        const n = (r() - 0.5) * 18;
        img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
      }
      c.putImageData(img, 0, 0);
      const tex = new THREE.CanvasTexture(cv);
      Tex.finalize(tex, { wrap: 'clamp' });
      tex.magFilter = THREE.LinearFilter;
      cache[key] = tex;
      return tex;
    },
    emblem(id, color, bg, size) {
      const key = 'emblem:' + id + ':' + color + ':' + bg + ':' + (size || 128);
      if (cache[key]) return cache[key];
      const s = size || 128;
      const cv = makeCanvas(s, s);
      emblem(id, cv.getContext('2d'), s, s, color || '#ffffff', bg);
      const tex = new THREE.CanvasTexture(cv);
      Tex.finalize(tex, { wrap: 'clamp' });
      tex.magFilter = THREE.LinearFilter;
      cache[key] = tex;
      return tex;
    },
    // Draws an emblem onto any 2D canvas (used by the UI).
    drawEmblem(ctx, id, size, color, bg) {
      emblem(id, ctx, size, size, color, bg);
    },
    // Faction banner (tall cloth)
    banner(faction) {
      const key = 'banner:' + faction;
      if (cache[key]) return cache[key];
      const f = DV.Factions.get(faction);
      const w = 64, h = 160;
      const cv = makeCanvas(w, h);
      const c = cv.getContext('2d');
      c.fillStyle = faction === 'candor' ? '#1a1a1a' : f.color;
      c.fillRect(0, 0, w, h);
      c.fillStyle = faction === 'candor' ? '#efede6' : 'rgba(0,0,0,0.25)';
      c.fillRect(0, 0, w, 6); c.fillRect(0, h - 22, w, 4);
      const ecv = makeCanvas(56, 56);
      emblem(faction, ecv.getContext('2d'), 56, 56, faction === 'candor' ? '#efede6' : f.accent);
      c.drawImage(ecv, 4, 30);
      c.fillStyle = faction === 'candor' ? '#efede6' : f.accent;
      c.font = 'bold 9px Arial'; c.textAlign = 'center';
      c.fillText(f.name.toUpperCase(), w / 2, 110);
      // fringe
      for (let x = 0; x < w; x += 4) { c.clearRect(x, h - 10, 2, 10); }
      noise(c, w, h, U.rng(key), 16);
      const tex = new THREE.CanvasTexture(cv);
      Tex.finalize(tex, { wrap: 'clamp', alpha: true });
      cache[key] = tex;
      return tex;
    },
    poster(kind) {
      const key = 'poster:' + kind;
      if (cache[key]) return cache[key];
      const w = 64, h = 96;
      const cv = makeCanvas(w, h);
      const c = cv.getContext('2d');
      const posters = {
        factions: ['#e7e1cf', '#2a2a2a', 'FIVE FACTIONS\nONE CITY'],
        test: ['#2f5f9e', '#e8eef5', 'THE TEST\nIS A GUIDE'],
        quiet: ['#8d8d86', '#20201e', 'PLEASE\nREMAIN\nQUIET'],
        safety: ['#c4432c', '#f5ead8', 'REPORT\nUNUSUAL\nBEHAVIOR'],
        harvest: ['#c9762a', '#fff4d8', 'AMITY\nHARVEST\nFESTIVAL'],
        choose: ['#1b1b1b', '#f0efe9', 'FACTION\nBEFORE\nBLOOD'],
      };
      const p = posters[kind] || posters.factions;
      c.fillStyle = p[0]; c.fillRect(0, 0, w, h);
      const ecv = makeCanvas(40, 40);
      emblem(kind === 'harvest' ? 'amity' : kind === 'test' ? 'erudite' : kind === 'safety' ? 'dauntless' : kind === 'quiet' ? 'abnegation' : 'seal', ecv.getContext('2d'), 40, 40, p[1]);
      c.drawImage(ecv, 12, 6);
      c.fillStyle = p[1]; c.font = 'bold 10px Arial'; c.textAlign = 'center';
      p[2].split('\n').forEach((ln, i) => c.fillText(ln, w / 2, 58 + i * 11));
      c.strokeStyle = p[1]; c.strokeRect(2, 2, w - 4, h - 4);
      noise(c, w, h, U.rng(key), 22);
      const tex = new THREE.CanvasTexture(cv);
      Tex.finalize(tex, { wrap: 'clamp' });
      cache[key] = tex;
      return tex;
    },
    // generic canvas texture from a painter fn (not cached unless key)
    custom(key, w, h, painter, opts) {
      if (key && cache[key]) return cache[key];
      const cv = makeCanvas(w, h);
      const c = cv.getContext('2d');
      painter(c, w, h, U.rng(key || 'custom'));
      const tex = new THREE.CanvasTexture(cv);
      Tex.finalize(tex, opts || { wrap: 'clamp' });
      tex.userData.canvas = cv;
      if (key) cache[key] = tex;
      return tex;
    },
    refreshFilters() {
      const f = Tex.filterMode();
      for (const k in cache) {
        if (cache[k].magFilter !== THREE.LinearFilter || k.indexOf(':') < 0) {
          cache[k].magFilter = k.indexOf(':') >= 0 ? cache[k].magFilter : f;
          cache[k].needsUpdate = true;
        }
      }
    },
  };
  DV.Tex = Tex;
})();
