// ============================================================================
// js/map_ui.js (v13.8) — Biome-Shaded Topographic Draggable GPS Map,
// Cursor-Centered Zoom, Smart Label Decluttering, Hover Tooltips & POI Search!
// ============================================================================
window.KK = window.KK || {};

KK.MapController = class MapController {
  constructor(game, ui) {
    this.game = game;
    this.ui = ui;

    this.panX = 0;
    this.panZ = 0;
    this.zoom = 1.05;
    this.dragging = false;
    this.dragMoved = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.hoverWorldX = null;
    this.hoverWorldZ = null;
    this.hoverItem = null;
    this.searchQuery = "";

    this.layers = {
      biomes: true,
      towns: true,
      bridges: true,
      fords: true,
      zones: true,
      landmarks: true
    };

    this.biomeCanvas = null;
    this._pois = [];
    this._secretSeq = "";
    this._secretSeqTime = 0;
    this.secretRevealUntil = 0;
    this._secretAnimInterval = null;
    this._bindEvents();
  }

  _ensureBiomeCache() {
    if (this.biomeCanvas) return;
    const size = 400;
    const cv = document.createElement("canvas");
    cv.width = size; cv.height = size;
    const ctx = cv.getContext("2d");
    const img = ctx.createImageData(size, size);
    const data = img.data;
    const world = this.game.world;
    const halfW = KK.HALF_WORLD;
    const step = KK.WORLD_SIZE / size;

    for (let py = 0; py < size; py++) {
      const gz = -halfW + (py + 0.5) * step;
      for (let px = 0; px < size; px++) {
        const gx = -halfW + (px + 0.5) * step;
        const b = world.getBiomeWeights(gx, gz);
        const h = world._computeNaturalGroundHeight(gx, gz);
        const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;

        let r, g, bl, shade = 1.0;
        if (h < seaL) {
          // Open Ocean & Turquoise Coastal Shallows!
          const depth = Math.min(1.0, (seaL - h) / 22.0);
          r  = 28 * (1 - depth) + 10 * depth;
          g  = 112 * (1 - depth) + 34 * depth;
          bl = 142 * (1 - depth) + 64 * depth;
        } else {
          const hE = world._computeNaturalGroundHeight(gx + step * 0.6, gz);
          const hS = world._computeNaturalGroundHeight(gx, gz + step * 0.6);
          shade = Math.max(0.68, Math.min(1.28, 1.0 - (hE - h) * 0.008 - (hS - h) * 0.008));

          r = 46 * b.rust + 24 * b.taiga + 136 * b.desert + 66 * b.mountains + 34 * b.volcanic
            + 32 * (b.tropical || 0) + 178 * (b.savanna || 0) + 188 * (b.arctic || 0) + 92 * (b.radioactive || 0);
          g = 60 * b.rust + 58 * b.taiga + 102 * b.desert + 74 * b.mountains + 28 * b.volcanic
            + 128 * (b.tropical || 0) + 148 * (b.savanna || 0) + 212 * (b.arctic || 0) + 114 * (b.radioactive || 0);
          bl = 42 * b.rust + 38 * b.taiga + 58 * b.desert + 82 * b.mountains + 32 * b.volcanic
            + 52 * (b.tropical || 0) + 62 * (b.savanna || 0) + 232 * (b.arctic || 0) + 46 * (b.radioactive || 0);

          // Sandy coastal beach ribbon
          if (h < seaL + 4.5 && (b.arctic || 0) < 0.4 && b.volcanic < 0.4) {
            r = 186; g = 166; bl = 114;
          } else if (h > 155) {
            const snowF = Math.min(1, (h - 155) / 110);
            r = r * (1 - snowF) + 198 * snowF;
            g = g * (1 - snowF) + 214 * snowF;
            bl = bl * (1 - snowF) + 226 * snowF;
          }
        }
        if (b.volcanic > 0.45 && Math.hypot(gx + 4550, gz - 1350) < 620) {
          r = 185; g = 62; bl = 22;
        }
        const contour = Math.abs(((h % 65) + 65) % 65);
        const cDark = (contour < 2.4) ? 0.84 : 1.0;

        const idx = (py * size + px) * 4;
        data[idx]     = Math.max(0, Math.min(255, Math.round(r * shade * cDark)));
        data[idx + 1] = Math.max(0, Math.min(255, Math.round(g * shade * cDark)));
        data[idx + 2] = Math.max(0, Math.min(255, Math.round(bl * shade * cDark)));
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    this.biomeCanvas = cv;
  }

  _getCanvas() { return document.getElementById("gps-map-canvas"); }

  _toPx(gx, gz, W, H) {
    const spanX = KK.WORLD_SIZE / this.zoom;
    const spanZ = spanX * (H / W);
    return [((gx - this.panX) / spanX + 0.5) * W, ((gz - this.panZ) / spanZ + 0.5) * H];
  }

  _toWorld(px, py, W, H) {
    const spanX = KK.WORLD_SIZE / this.zoom;
    const spanZ = spanX * (H / W);
    return [this.panX + (px / W - 0.5) * spanX, this.panZ + (py / H - 0.5) * spanZ];
  }

  _clampPan() {
    const lim = KK.HALF_WORLD * 1.05;
    this.panX = Math.max(-lim, Math.min(lim, this.panX));
    this.panZ = Math.max(-lim, Math.min(lim, this.panZ));
  }

  _bindEvents() {
    const cv = this._getCanvas();
    if (!cv) return;

    cv.addEventListener("wheel", (e) => {
      e.preventDefault();
      const rect = cv.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (cv.width / rect.width);
      const my = (e.clientY - rect.top) * (cv.height / rect.height);
      const [wxBefore, wzBefore] = this._toWorld(mx, my, cv.width, cv.height);

      const factor = e.deltaY < 0 ? 1.28 : (1 / 1.28);
      this.zoom = Math.max(0.75, Math.min(38.0, this.zoom * factor));

      const spanX = KK.WORLD_SIZE / this.zoom;
      const spanZ = spanX * (cv.height / cv.width);
      this.panX = wxBefore - (mx / cv.width - 0.5) * spanX;
      this.panZ = wzBefore - (my / cv.height - 0.5) * spanZ;
      this._clampPan();
      this.render();
    }, { passive: false });

    cv.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      this.dragging = true;
      this.dragMoved = false;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      cv.style.cursor = "grabbing";
    });

    window.addEventListener("mousemove", (e) => {
      if (this.ui.activeModal !== "map") return;
      const rect = cv.getBoundingClientRect();
      if (this.dragging) {
        const dxCss = e.clientX - this.lastMouseX;
        const dyCss = e.clientY - this.lastMouseY;
        if (Math.hypot(dxCss, dyCss) > 2) this.dragMoved = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;

        const spanX = KK.WORLD_SIZE / this.zoom;
        const spanZ = spanX * (cv.height / cv.width);
        this.panX -= (dxCss / rect.width) * spanX;
        this.panZ -= (dyCss / rect.height) * spanZ;
        this._clampPan();
        this.render();
        return;
      }

      if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        const mx = (e.clientX - rect.left) * (cv.width / rect.width);
        const my = (e.clientY - rect.top) * (cv.height / rect.height);
        const [wx, wz] = this._toWorld(mx, my, cv.width, cv.height);
        this.hoverWorldX = wx; this.hoverWorldZ = wz;
        this._updateHoverItem(mx, my);
        this.render();
      }
    });

    window.addEventListener("mouseup", () => {
      if (this.dragging) {
        this.dragging = false;
        cv.style.cursor = "grab";
      }
    });

    const setPinAtEvent = (e) => {
      e.preventDefault();
      const rect = cv.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (cv.width / rect.width);
      const my = (e.clientY - rect.top) * (cv.height / rect.height);
      this._updateHoverItem(mx, my);
      if (this.hoverItem) {
        this.game.setWaypoint(this.hoverItem.x, this.hoverItem.z, this.hoverItem.name);
      } else {
        const [wx, wz] = this._toWorld(mx, my, cv.width, cv.height);
        this.game.setWaypoint(wx, wz, "Custom GPS Pin");
      }
      this.render();
    };
    cv.addEventListener("dblclick", setPinAtEvent);
    cv.addEventListener("contextmenu", setPinAtEvent);

    const q = (id) => document.getElementById(id);
    if (q("btn-map-center")) q("btn-map-center").onclick = () => { this.focusOn(this.game.vehicle.pos.x, this.game.vehicle.pos.z, Math.max(this.zoom, 4.0)); };
    if (q("btn-map-fit")) q("btn-map-fit").onclick = () => { this.panX = 0; this.panZ = 0; this.zoom = 1.05; this.render(); };
    if (q("btn-map-clear-wp")) q("btn-map-clear-wp").onclick = () => { this.game.waypoint = null; this.ui.toast("GPS Waypoint cleared."); this.render(); };
    if (q("btn-map-zoom-in")) q("btn-map-zoom-in").onclick = () => { this.zoom = Math.min(38, this.zoom * 1.45); this.render(); };
    if (q("btn-map-zoom-out")) q("btn-map-zoom-out").onclick = () => { this.zoom = Math.max(0.75, this.zoom / 1.45); this.render(); };
    if (q("map-search-input")) {
      q("map-search-input").addEventListener("input", (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderSidebar();
      });
    }

    // Secret Dev/Test Combination while Map [M] is open: type T -> 7 -> 2 to intercept exact T-72 Camp for 6.0s!
    window.addEventListener("keydown", (e) => {
      if (this.ui.activeModal !== "map") return;
      if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) return;
      const now = performance.now();
      if (now - this._secretSeqTime > 2500) this._secretSeq = "";
      this._secretSeqTime = now;
      const k = (e.key || "").toLowerCase();
      if (k.length === 1) {
        this._secretSeq = (this._secretSeq + k).slice(-4);
        if (this._secretSeq.endsWith("t72")) {
          this._secretSeq = "";
          this.triggerSecretCampReveal();
        }
      }
    });
  }

  triggerSecretCampReveal() {
    if (!this.game.milCamp) return;
    this.secretRevealUntil = performance.now() + 6000;
    if (this.game.audio && this.game.audio.playThermalClick) this.game.audio.playThermalClick();
    if (this._secretAnimInterval) clearInterval(this._secretAnimInterval);
    this.render();
    this._secretAnimInterval = setInterval(() => {
      if (this.ui.activeModal !== "map" || performance.now() >= this.secretRevealUntil) {
        this.secretRevealUntil = 0;
        clearInterval(this._secretAnimInterval);
        this._secretAnimInterval = null;
        if (this.ui.activeModal === "map") this.render();
        return;
      }
      this.render();
    }, 80);
  }

  open() {
    this._ensureBiomeCache();
    this.panX = this.game.vehicle.pos.x;
    this.panZ = this.game.vehicle.pos.z;
    if (this.zoom < 1.2) this.zoom = 2.4;
    this.renderSidebar();
    this.render();
  }

  focusOn(gx, gz, targetZoom = 7.5) {
    this.panX = gx; this.panZ = gz;
    this.zoom = Math.max(0.75, Math.min(38, targetZoom));
    this._clampPan();
    this.render();
  }

  toggleLayer(key) {
    this.layers[key] = !this.layers[key];
    this.renderSidebar();
    this.render();
  }

  _collectAllPOIs() {
    const list = [];
    if (this.layers.towns) {
      for (const tw of KK.TOWNS) {
        list.push({ type: "town", priority: 100, x: tw.x, z: tw.z, name: tw.name, sub: tw.desc, color: "#2de08b", icon: "●", pinX: tw.dockX, pinZ: tw.dockZ });
      }
    }
    if (this.layers.zones) {
      if (KK.CLARKSON_FARM) {
        list.push({ type: "zone", priority: 95, x: KK.CLARKSON_FARM.x, z: KK.CLARKSON_FARM.z, name: "Clarkson's Farm (Safe)", sub: "Free Repairs & Lambo Tractor — Mind the Sheep!", color: "#80ed99", icon: "🐑", r: KK.CLARKSON_FARM.radius });
      }
      if (KK.JAMES_MAY_BAR) {
        list.push({ type: "zone", priority: 92, x: KK.JAMES_MAY_BAR.x, z: KK.JAMES_MAY_BAR.z, name: "James May's Pub", sub: "Beer Deliveries & Dacia Sandero", color: "#ffb703", icon: "🍺", pinX: KK.JAMES_MAY_BAR.dockX, pinZ: KK.JAMES_MAY_BAR.dockZ });
      }
      if (KK.HAMMOND_MESA) {
        list.push({ type: "zone", priority: 94, x: KK.HAMMOND_MESA.x, z: KK.HAMMOND_MESA.z, name: "Hammond's Mesa (Safe)", sub: "Sandwyrm-Safe Rock Plateau • BTR-80 KPVT Rearm & Oliver!", color: "#f4a261", icon: "🏜", r: KK.HAMMOND_MESA.radius });
      }
      for (const tz of (KK.SMOOTH_TARMAC_ZONES || [])) {
        list.push({ type: "tarmac", priority: 90, x: tz.cx, z: tz.cz, name: "Krasny-Ring Tarmac", sub: "Glass-smooth high-grip oval & drift skidpad", color: "#00f5ff", icon: "🏁", zone: tz });
      }
      for (const bz of (KK.BAD_ROAD_ZONES || [])) {
        list.push({ type: "badroad", priority: 82, x: bz.x, z: bz.z, name: bz.name.split("(")[0].trim(), sub: bz.desc, color: "#ff5c77", icon: "⚠", r: bz.radius });
      }
    }
    if (this.layers.landmarks) {
      for (const lm of KK.LANDMARKS) {
        const claimed = !!(this.game.claimedLandmarks && this.game.claimedLandmarks[lm.id]);
        list.push({
          type: "landmark", priority: claimed ? 50 : 80, x: lm.x, z: lm.z,
          name: (claimed ? "✓ " : "★ ") + lm.name.split("(")[0].trim(),
          sub: claimed ? "Treasure Claimed ✓" : `Treasure Stash: $${lm.rewardCash.toLocaleString()}`,
          color: claimed ? "#8a99a8" : "#ffbe0b", icon: "★"
        });
      }
    }
    if (this.layers.bridges) {
      for (const br of KK.BRIDGES) {
        const bObj = this.game.world.bridgeMeshes.get(br.id);
        const broken = bObj ? bObj.broken.size : 0;
        const tons = ((br.effectiveMaxMassKg || br.baseMaxMassKg) / 1000).toFixed(1);
        const bCol = broken > 0 ? "#ff3b5c" : (br.style === "concrete" ? "#4ea8de" : (br.style === "steel_truss" ? "#80ffdb" : (br.style === "timber_wellmade" ? "#ffd166" : "#ff8c42")));
        list.push({
          type: "bridge", priority: 60, x: br.x, z: br.z,
          name: br.name,
          sub: `${(KK.BRIDGE_TYPES[br.style] || {}).label || br.style} • Max ${tons}T (${br.conditionLabel || "OK"})${broken > 0 ? ` • ${broken} SNAPPED` : ""}`,
          color: bCol, icon: "■"
        });
      }
    }
    if (this.layers.fords) {
      for (const fd of (KK.RIVER_FORDS || [])) {
        list.push({ type: "ford", priority: 45, x: fd.x, z: fd.z, name: fd.name, sub: "Shallow 0.6m Rocky Cobble Crossing", color: "#48cae4", icon: "≈" });
      }
    }
    for (const rp of this.game.network.remotePlayers.values()) {
      list.push({ type: "friend", priority: 110, x: rp.gx, z: rp.gz, name: rp.callsign, sub: `LAN Driver • ${(KK.VEHICLES[rp.vehicleId] || {}).name || rp.vehicleId}`, color: "#ffd166", icon: "👤" });
    }
    return list;
  }

  _updateHoverItem(mx, my) {
    const cv = this._getCanvas(); if (!cv) return;
    let best = null, bestD = 16;
    for (const item of this._pois) {
      const [px, py] = this._toPx(item.x, item.z, cv.width, cv.height);
      const d = Math.hypot(mx - px, my - py);
      if (d < bestD) { bestD = d; best = item; }
    }
    this.hoverItem = best;
  }

  renderSidebar() {
    const listEl = document.getElementById("map-poi-list");
    const layerEl = document.getElementById("map-layer-chips");
    if (layerEl) {
      const defs = [
        ["biomes", "Biomes"], ["towns", "Towns"], ["zones", "Zones"],
        ["landmarks", "Stashes"], ["bridges", "Bridges"], ["fords", "Fords"]
      ];
      layerEl.innerHTML = defs.map(([k, lbl]) =>
        `<button class="map-chip ${this.layers[k] ? "on" : ""}" onclick="window.__GAME__.ui.mapCtrl.toggleLayer('${k}')">${lbl}</button>`
      ).join("");
    }
    if (!listEl) return;

    const q = this.searchQuery;
    const vx = this.game.vehicle.pos.x, vz = this.game.vehicle.pos.z;
    const items = this._collectAllPOIs()
      .filter((it) => !q || it.name.toLowerCase().includes(q) || (it.sub && it.sub.toLowerCase().includes(q)))
      .sort((a, b) => b.priority - a.priority);

    listEl.innerHTML = items.map((it) => {
      const dKm = (Math.hypot(it.x - vx, it.z - vz) / 1000).toFixed(1);
      const px = it.pinX !== undefined ? it.pinX : it.x;
      const pz = it.pinZ !== undefined ? it.pinZ : it.z;
      const safeName = it.name.split("'").join("");
      return `
        <div class="map-poi-row" onclick="window.__GAME__.ui.mapCtrl.focusOn(${it.x}, ${it.z}, ${it.type === 'town' ? 8 : 11})">
          <div style="min-width:0;">
            <div class="map-poi-name" style="color:${it.color};">${it.name}</div>
            <div class="small muted">${dKm} km away</div>
          </div>
          <button class="btn small primary" style="padding:3px 7px;" onclick="event.stopPropagation(); window.__GAME__.setWaypoint(${px}, ${pz}, '${safeName}'); window.__GAME__.ui.mapCtrl.render();">GPS</button>
        </div>`;
    }).join("") || `<div class="small muted" style="padding:10px;">No matching locations.</div>`;
  }

  render() {
    const cv = this._getCanvas();
    if (!cv) return;
    this._ensureBiomeCache();
    const ctx = cv.getContext("2d");
    const W = cv.width, H = cv.height;
    const spanX = KK.WORLD_SIZE / this.zoom;
    const spanZ = spanX * (H / W);

    ctx.fillStyle = "#121a1e";
    ctx.fillRect(0, 0, W, H);
    if (this.layers.biomes && this.biomeCanvas) {
      const [x0, y0] = this._toPx(-KK.HALF_WORLD, -KK.HALF_WORLD, W, H);
      const [x1, y1] = this._toPx( KK.HALF_WORLD,  KK.HALF_WORLD, W, H);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.biomeCanvas, x0, y0, x1 - x0, y1 - y0);
    }

    const gridStep = this.zoom > 10 ? 1000 : (this.zoom > 3 ? 5000 : 10000);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.09)";
    ctx.lineWidth = 1;
    const minGx = Math.floor((this.panX - spanX * 0.5) / gridStep) * gridStep;
    const maxGx = Math.ceil((this.panX + spanX * 0.5) / gridStep) * gridStep;
    const minGz = Math.floor((this.panZ - spanZ * 0.5) / gridStep) * gridStep;
    const maxGz = Math.ceil((this.panZ + spanZ * 0.5) / gridStep) * gridStep;
    ctx.beginPath();
    for (let gx = minGx; gx <= maxGx; gx += gridStep) {
      const [px] = this._toPx(gx, 0, W, H); ctx.moveTo(px, 0); ctx.lineTo(px, H);
    }
    for (let gz = minGz; gz <= maxGz; gz += gridStep) {
      const [, py] = this._toPx(0, gz, W, H); ctx.moveTo(0, py); ctx.lineTo(W, py);
    }
    ctx.stroke();

    if (this.game.world.riverSegments && this.game.world.riverSegments.length > 0) {
      ctx.strokeStyle = "rgba(38, 165, 224, 0.88)";
      ctx.lineWidth = Math.max(2.2, Math.min(10, this.zoom * 1.4));
      ctx.lineCap = "round";
      ctx.beginPath();
      for (const rs of this.game.world.riverSegments) {
        const [x0, y0] = this._toPx(rs.x0, rs.z0, W, H), [x1, y1] = this._toPx(rs.x1, rs.z1, W, H);
        ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
      }
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(38, 155, 210, 0.55)";
    for (const rv of KK.RIVERS) {
      const [rx, ry] = this._toPx(rv.x, rv.z, W, H);
      ctx.beginPath(); ctx.arc(rx, ry, Math.max(4, (rv.rx / spanX) * W), 0, Math.PI * 2); ctx.fill();
    }

    // v13.8X DYNAMIC BIOME-CONTRASTING ROAD COLORS (Always crystal clear on White Snow & Sandy Desert!)
    if (!this._roadBuckets) {
      this._roadBuckets = { snow: [], desert: [], taiga: [], volcanic: [], rust: [] };
      const world = this.game.world;
      for (const seg of world.roadSegments) {
        const mx = (seg.x0 + seg.x1) * 0.5, mz = (seg.z0 + seg.z1) * 0.5;
        const b = world.getBiomeWeights(mx, mz);
        const h = world._computeNaturalGroundHeight(mx, mz);
        if (h > 140 || b.mountains > 0.45) this._roadBuckets.snow.push(seg);
        else if (b.desert > 0.40)          this._roadBuckets.desert.push(seg);
        else if (b.volcanic > 0.36)        this._roadBuckets.volcanic.push(seg);
        else if (b.taiga > 0.40)           this._roadBuckets.taiga.push(seg);
        else                               this._roadBuckets.rust.push(seg);
      }
    }
    const baseRoadW = Math.max(1.8, Math.min(4.8, this.zoom * 0.92));
    ctx.lineCap = "round";
    // Each biome bucket gets a contrasting casing + core road color!
    const roadStyles = [
      ["snow",     "rgba(255, 255, 255, 0.55)", "#182436"], // Dark navy-slate roads on white snow!
      ["desert",   "rgba(255, 232, 185, 0.50)", "#2c1810"], // Deep espresso roads on bright sand!
      ["taiga",    "rgba(12, 22, 16, 0.72)",    "#f5dc9d"], // Bright warm sand-gold roads on dark forest!
      ["volcanic", "rgba(18, 10, 10, 0.75)",    "#e8dfd5"], // Bright pale ash-silver roads on dark basalt!
      ["rust",     "rgba(16, 20, 14, 0.68)",    "#f0e2c2"]  // Bright ivory roads on olive Rust Basin!
    ];
    for (const [key, casingCol, coreCol] of roadStyles) {
      const segs = this._roadBuckets[key];
      if (!segs || segs.length === 0) continue;
      ctx.beginPath();
      for (let i = 0; i < segs.length; i++) {
        const seg = segs[i];
        const [x0, y0] = this._toPx(seg.x0, seg.z0, W, H);
        const [x1, y1] = this._toPx(seg.x1, seg.z1, W, H);
        if ((x0 < -40 && x1 < -40) || (x0 > W + 40 && x1 > W + 40) || (y0 < -40 && y1 < -40) || (y0 > H + 40 && y1 > H + 40)) continue;
        ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
      }
      ctx.strokeStyle = casingCol; ctx.lineWidth = baseRoadW + 2.0; ctx.stroke();
      ctx.strokeStyle = coreCol;   ctx.lineWidth = baseRoadW;       ctx.stroke();
    }

    if (this.layers.zones) {
      if (KK.CLARKSON_FARM) {
        const cf = KK.CLARKSON_FARM, [cx, cy] = this._toPx(cf.x, cf.z, W, H);
        const rPx = Math.max(6, (cf.radius / spanX) * W);
        ctx.fillStyle = "rgba(82, 220, 130, 0.25)"; ctx.beginPath(); ctx.arc(cx, cy, rPx, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#80ed99"; ctx.lineWidth = 2; ctx.stroke();
      }
      if (KK.HAMMOND_MESA) {
        const hm = KK.HAMMOND_MESA, [hx, hy] = this._toPx(hm.x, hm.z, W, H);
        const rPx = Math.max(6, (hm.radius / spanX) * W);
        ctx.fillStyle = "rgba(244, 162, 97, 0.26)"; ctx.beginPath(); ctx.arc(hx, hy, rPx, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#f4a261"; ctx.lineWidth = 2; ctx.stroke();
      }
      for (const tz of (KK.SMOOTH_TARMAC_ZONES || [])) {
        const [tx, ty] = this._toPx(tz.cx, tz.cz, W, H);
        ctx.strokeStyle = "#00f5ff"; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.ellipse(tx, ty, Math.max(6, (tz.rx / spanX) * W), Math.max(4, (tz.rz / spanZ) * H), tz.yaw, 0, Math.PI * 2); ctx.stroke();
      }
      for (const bz of (KK.BAD_ROAD_ZONES || [])) {
        const [bx, by] = this._toPx(bz.x, bz.z, W, H);
        const rPx = Math.max(6, (bz.radius / spanX) * W);
        ctx.fillStyle = "rgba(255, 77, 109, 0.24)"; ctx.beginPath(); ctx.arc(bx, by, rPx, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#ff4d6d"; ctx.lineWidth = 1.6; ctx.stroke();
      }
    }

    this._pois = this._collectAllPOIs();
    const sortedPois = this._pois.slice().sort((a, b) => b.priority - a.priority);
    const placedLabels = [];
    const canPlaceLabel = (x, y, w, h) => {
      if (x < 4 || y < 12 || x + w > W - 4 || y + h > H - 4) return false;
      for (const r of placedLabels) {
        if (x < r.x + r.w + 4 && x + w + 4 > r.x && y < r.y + r.h + 3 && y + h + 3 > r.y) return false;
      }
      placedLabels.push({ x, y, w, h });
      return true;
    };

    for (const item of sortedPois) {
      const [px, py] = this._toPx(item.x, item.z, W, H);
      if (px < -20 || px > W + 20 || py < -20 || py > H + 20) continue;

      const isHov = (this.hoverItem === item);
      ctx.fillStyle = item.color;
      if (item.type === "bridge") {
        const sz = isHov ? 6.5 : 4.5;
        ctx.fillRect(px - sz, py - sz, sz * 2, sz * 2);
      } else {
        ctx.beginPath(); ctx.arc(px, py, isHov ? 7.5 : (item.type === "town" ? 5.5 : 4.8), 0, Math.PI * 2); ctx.fill();
      }
      if (isHov) {
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.arc(px, py, 10, 0, Math.PI * 2); ctx.stroke();
      }

      const showLabel = isHov || item.type === "town" || item.type === "friend"
        || (item.type === "zone" && this.zoom >= 1.8)
        || (item.type === "landmark" && this.zoom >= 2.2)
        || ((item.type === "bridge" || item.type === "ford") && this.zoom >= 4.2);

      if (showLabel) {
        ctx.font = (item.type === "town" || item.type === "friend" || isHov) ? "bold 11px monospace" : "bold 10px monospace";
        const tw = ctx.measureText(item.name).width;
        const lx = px + 8, ly = py - 6;
        if (isHov || canPlaceLabel(lx, ly, tw + 6, 14)) {
          ctx.fillStyle = "rgba(8, 13, 20, 0.78)";
          ctx.fillRect(lx - 2, ly - 1, tw + 6, 14);
          ctx.fillStyle = item.type === "town" ? "#eef6ff" : item.color;
          ctx.fillText(item.name, lx + 1, ly + 10);
        }
      }
    }

    const [vx, vy] = this._toPx(this.game.vehicle.pos.x, this.game.vehicle.pos.z, W, H);
    if (this.game.waypoint) {
      const [wx, wy] = this._toPx(this.game.waypoint.x, this.game.waypoint.z, W, H);
      ctx.strokeStyle = "rgba(0, 245, 212, 0.55)"; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.moveTo(vx, vy); ctx.lineTo(wx, wy); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = "#00f5d4"; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.arc(wx, wy, 9.5, 0, Math.PI * 2); ctx.stroke();
    }

    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.game.vehicle.quat);
    const headAng = Math.atan2(fwd.x, fwd.z);
    ctx.save();
    ctx.translate(vx, vy);
    ctx.rotate(-headAng + Math.PI);
    ctx.fillStyle = "#ff3b5c"; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(6.5, 7); ctx.lineTo(0, 3.5); ctx.lineTo(-6.5, 7); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();

    // SECRET 6-SECOND CLASSIFIED RADAR INTERCEPT — Reveals ALL 3 Hidden Soviet Relics (T-72B, BM-21 Grad, ZSU-23-4 Shilka)!
    const nowMs = performance.now();
    if (this.secretRevealUntil > nowMs) {
      const remSec = Math.max(0, (this.secretRevealUntil - nowMs) / 1000);
      const pulse = (nowMs % 900) / 900;
      const sites = [];
      if (this.game.milCamp)    sites.push({ obj: this.game.milCamp,    tag: "☢ T-72B CAMP",    col: "#ff3b5c" });
      if (this.game.bm21Camp)   sites.push({ obj: this.game.bm21Camp,   tag: "🚀 BM-21 GRAD",   col: "#ff9f1c" });
      if (this.game.shilkaCamp) sites.push({ obj: this.game.shilkaCamp, tag: "📡 ZSU-23 SHILKA", col: "#2de08b" });

      for (const s of sites) {
        const [mx, my] = this._toPx(s.obj.gx, s.obj.gz, W, H);
        const onScreen = (mx >= 12 && mx <= W - 12 && my >= 12 && my <= H - 12);
        if (onScreen) {
          ctx.strokeStyle = s.col; ctx.globalAlpha = (1 - pulse) * 0.9; ctx.lineWidth = 2.2;
          ctx.beginPath(); ctx.arc(mx, my, 8 + pulse * 30, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = 1.0;

          ctx.strokeStyle = "#ffd166"; ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(mx - 14, my); ctx.lineTo(mx - 4, my);
          ctx.moveTo(mx + 4, my);  ctx.lineTo(mx + 14, my);
          ctx.moveTo(mx, my - 14); ctx.lineTo(mx, my - 4);
          ctx.moveTo(mx, my + 4);  ctx.lineTo(mx, my + 14);
          ctx.stroke();

          ctx.fillStyle = s.col; ctx.beginPath(); ctx.arc(mx, my, 4.2, 0, Math.PI * 2); ctx.fill();
          const lbl = `${s.tag} (${(s.obj.gx / 1000).toFixed(1)}, ${(s.obj.gz / 1000).toFixed(1)})`;
          ctx.font = "bold 10.5px monospace";
          const tw = ctx.measureText(lbl).width;
          const lx = Math.min(W - tw - 12, Math.max(8, mx + 12)), ly = Math.max(46, my - 10);
          ctx.fillStyle = "rgba(18, 8, 12, 0.90)"; ctx.fillRect(lx - 3, ly - 11, tw + 8, 16);
          ctx.strokeStyle = s.col; ctx.lineWidth = 1.2; ctx.strokeRect(lx - 3, ly - 11, tw + 8, 16);
          ctx.fillStyle = "#ffd166"; ctx.fillText(lbl, lx + 1, ly + 1);
        } else {
          const ang = Math.atan2(my - H * 0.5, mx - W * 0.5);
          const ex = Math.max(22, Math.min(W - 22, W * 0.5 + Math.cos(ang) * (W * 0.44)));
          const ey = Math.max(22, Math.min(H - 22, H * 0.5 + Math.sin(ang) * (H * 0.44)));
          ctx.save(); ctx.translate(ex, ey); ctx.rotate(ang);
          ctx.fillStyle = s.col; ctx.strokeStyle = "#ffd166"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-7, -6); ctx.lineTo(-3, 0); ctx.lineTo(-7, 6); ctx.closePath();
          ctx.fill(); ctx.stroke(); ctx.restore();
        }
      }

      const bannerTxt = `CLASSIFIED INTERCEPT: 3 SOVIET RELICS LOCATED — VANISHING IN ${remSec.toFixed(1)}s`;
      ctx.font = "bold 11px monospace";
      const bw = ctx.measureText(bannerTxt).width + 20;
      ctx.fillStyle = "rgba(24, 6, 10, 0.92)"; ctx.fillRect(10, 10, bw, 28);
      ctx.strokeStyle = "#ff3b5c"; ctx.lineWidth = 1.5; ctx.strokeRect(10, 10, bw, 28);
      ctx.fillStyle = "#ff3b5c"; ctx.fillRect(12, 33, Math.max(0, (bw - 4) * (remSec / 6.0)), 3);
      ctx.fillStyle = "#ffd166"; ctx.fillText(bannerTxt, 20, 27);
    }

    if (this.hoverItem) {
      const hi = this.hoverItem;
      const [hx, hy] = this._toPx(hi.x, hi.z, W, H);
      const dKm = (Math.hypot(hi.x - this.game.vehicle.pos.x, hi.z - this.game.vehicle.pos.z) / 1000).toFixed(2);
      const line1 = `${hi.name}  (${dKm} km)`;
      const line2 = (hi.sub || "").slice(0, 58);
      ctx.font = "bold 11px monospace";
      const boxW = Math.max(ctx.measureText(line1).width, ctx.measureText(line2).width) + 18;
      const bx = Math.min(W - boxW - 8, Math.max(8, hx + 14));
      const by = Math.max(8, hy - 46);
      ctx.fillStyle = "rgba(9, 15, 24, 0.94)";
      ctx.fillRect(bx, by, boxW, 38);
      ctx.strokeStyle = hi.color; ctx.lineWidth = 1.6;
      ctx.strokeRect(bx, by, boxW, 38);
      ctx.fillStyle = hi.color; ctx.fillText(line1, bx + 9, by + 15);
      ctx.fillStyle = "#c8d6e5"; ctx.font = "10px monospace"; ctx.fillText(line2, bx + 9, by + 30);
    }

    const scaleKm = spanX > 30000 ? 10 : (spanX > 10000 ? 5 : (spanX > 3000 ? 1 : 0.5));
    const scalePx = (scaleKm * 1000 / spanX) * W;
    ctx.fillStyle = "rgba(8, 13, 20, 0.78)"; ctx.fillRect(10, H - 28, scalePx + 24, 20);
    ctx.strokeStyle = "#dce6f0"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(16, H - 15); ctx.lineTo(16 + scalePx, H - 15); ctx.stroke();
    ctx.fillStyle = "#eef6ff"; ctx.font = "bold 10px monospace";
    ctx.fillText(`${scaleKm} km`, 18, H - 19);

    const info = document.getElementById("gps-map-info");
    if (info) {
      const bName = this.hoverWorldX !== null ? this.game.world.getBiomeName(this.hoverWorldX, this.hoverWorldZ) : this.game.world.getBiomeName(this.panX, this.panZ);
      const coordTxt = this.hoverWorldX !== null ? `Cursor: (${Math.round(this.hoverWorldX)}, ${Math.round(this.hoverWorldZ)})` : `Center: (${Math.round(this.panX)}, ${Math.round(this.panZ)})`;
      info.innerHTML = `<b>Zoom:</b> ${this.zoom.toFixed(1)}x (${(spanX / 1000).toFixed(1)} km) &nbsp;|&nbsp; <b>${coordTxt}</b> &nbsp;|&nbsp; <b>Biome:</b> <span style="color:#80faff;">${bName}</span> &nbsp;|&nbsp; <span class="muted">Drag = Pan • Scroll = Zoom • Double-Click / Right-Click = Set GPS</span>`;
    }
  }
};
