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
    this._liveMapInterval = null;
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
        this.game.setWaypoint(this.hoverItem.x, this.hoverItem.z, this.hoverItem.name, this.hoverItem.isPatrol ? this.hoverItem.mechaId : null);
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
    // v18.1.2 Live 8Hz map refresh while [M] is open so EINHEIT-03 & players move smoothly in real time!
    if (this._liveMapInterval) clearInterval(this._liveMapInterval);
    this._liveMapInterval = setInterval(() => {
      if (this.ui.activeModal !== "map") {
        clearInterval(this._liveMapInterval);
        this._liveMapInterval = null;
        return;
      }
      if (!this.dragging) this.render();
    }, 125);
  }

  focusLiveMecha(mechaId) {
    const sm = this.game.savannaMechas;
    const m = sm && sm.mechas ? sm.mechas.find((x) => x.id === mechaId) : null;
    if (m) this.focusOn(m.gx, m.gz, 6.5);
  }

  trackLiveMecha(mechaId) {
    const sm = this.game.savannaMechas;
    const m = sm && sm.mechas ? sm.mechas.find((x) => x.id === mechaId) : null;
    if (!m) return;
    const lbl = m.isPatrol ? "EINHEIT-03 (Live Mecha)" : (m.id === "einheit_01" ? "EINHEIT-01 (Dormant Mecha)" : "EINHEIT-02 (Dormant Mecha)");
    this.game.setWaypoint(m.gx, m.gz, lbl, m.isPatrol ? m.id : null);
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

  _getMegaBridge() {
    const mb = (this.game && this.game.world && this.game.world.megaBridge) || KK.MEGA_BRIDGE || null;
    if (!mb || typeof mb.startX !== "number" || typeof mb.endX !== "number") return null;
    const midX = typeof mb.midX === "number" ? mb.midX : (mb.startX + mb.endX) * 0.5;
    const midZ = typeof mb.midZ === "number" ? mb.midZ : (mb.startZ + mb.endZ) * 0.5;
    return {
      startX: mb.startX,
      startZ: mb.startZ,
      endX: mb.endX,
      endZ: mb.endZ,
      midX,
      midZ
    };
  }

  _collectAllPOIs() {
    const list = [];
    const mb = this._getMegaBridge();
    if (mb && this.layers.bridges) {
      list.push({
        type: "megabridge", priority: 106,
        x: mb.midX, z: mb.midZ,
        name: "Savanna 6-Lane Mega-Bridge",
        sub: "6-Lane Cable-Stayed Ocean Highway (Mainland ↔ Zolotoy Savanna) • 200+ km/h Surreal Echo Corridor",
        color: "#00f5ff", icon: "🌉",
        pinX: mb.midX, pinZ: mb.midZ
      });
    }
    if (this.layers.towns) {
      for (const tw of KK.TOWNS) {
        const isZolotoyMetro = (tw.id === 11 || !!tw.isMetro);
        list.push({
          type: "town",
          priority: isZolotoyMetro ? 105 : 100,
          x: tw.x, z: tw.z,
          name: isZolotoyMetro ? "Zolotoy City Metropolis" : tw.name,
          sub: isZolotoyMetro
            ? "Savanna 6x6 Metropolis • Monument Plaza, Overpasses, Live Electric Tram & AI Traffic"
            : tw.desc,
          color: isZolotoyMetro ? "#ffd166" : "#2de08b",
          icon: isZolotoyMetro ? "🏙" : "●",
          pinX: tw.dockX !== undefined ? tw.dockX : tw.x,
          pinZ: tw.dockZ !== undefined ? tw.dockZ : tw.z
        });
      }
    }
    if (this.layers.towns && KK.PORTS) {
      for (const pt of KK.PORTS) {
        list.push({
          type: "port", priority: 98, x: pt.x, z: pt.z,
          name: "⚓ " + pt.name,
          sub: "Ocean Port • Drive to glowing cyan pier pad & press [F] to unlock & summon boats (Zubr, Serna, Patrol, Strela-X1)!",
          color: "#00e5ff", icon: "⚓",
          pinX: pt.approachX !== undefined ? pt.approachX : pt.x,
          pinZ: pt.approachZ !== undefined ? pt.approachZ : pt.z
        });
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
        list.push({
          type: "tarmac", priority: 104,
          x: tz.cx, z: tz.cz,
          name: "Krasny-Ring GP Circuit",
          sub: tz.desc || "5.6 km High-Grip Grand Prix Circuit • Pit Garages, Grandstands & Floodlights",
          color: "#00f5ff", icon: "🏁", zone: tz
        });
      }
      if (this.game.world && this.game.world.gpGaragePos) {
        const gpG = this.game.world.gpGaragePos;
        list.push({
          type: "gp_garage", priority: 103,
          x: gpG.x, z: gpG.z,
          name: "GP Paddock Garage & Wash",
          sub: "Zolotoy GP Circuit Pit Lane • Swap, Tune, Repair & Pressure-Wash Cars On-Site",
          color: "#ffd166", icon: "🔧",
          pinX: gpG.x, pinZ: gpG.z
        });
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
    // v18.1.2 3 Colossal Zolotoy Savanna Stahlhelm Mechas (2 Dormant Statues + 1 Live Patrol EINHEIT-03!)
    if ((this.layers.zones || this.layers.landmarks) && this.game.savannaMechas && Array.isArray(this.game.savannaMechas.mechas)) {
      for (const m of this.game.savannaMechas.mechas) {
        if (m.isPatrol) {
          list.push({
            type: "mecha_patrol", priority: 107,
            x: m.gx, z: m.gz, yaw: m.yaw || 0,
            mechaId: m.id, isPatrol: true,
            name: "EINHEIT-03 (Active Mecha)",
            sub: "68m Coastal Defense Mecha • Live Patrol • Fires Rockets at Megalodon & Kraken",
            color: "#ffa61a", icon: "🤖"
          });
        } else {
          const is01 = (m.id === "einheit_01");
          list.push({
            type: "mecha_dormant", priority: 97,
            x: m.gx, z: m.gz, yaw: m.yaw || 0,
            mechaId: m.id, isPatrol: false,
            name: is01 ? "EINHEIT-01 (Dormant Mecha)" : "EINHEIT-02 (Dormant Mecha)",
            sub: "68m Deactivated Stahlhelm Mecha Monument • Zolotoy Savanna Lore Site",
            color: "#cbd5e1", icon: "🗿"
          });
        }
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
      const focusZ = it.type === "megabridge" ? 3.2 : (it.type === "mecha_patrol" || it.type === "mecha_dormant" ? 6.5 : (it.type === "gp_garage" ? 12 : (it.type === "town" ? 8 : 11)));
      const prefix = (it.type === "megabridge" || it.type === "tarmac" || it.type === "gp_garage" || it.type === "mecha_patrol" || it.type === "mecha_dormant" || it.icon === "🏙") ? (it.icon + " ") : "";
      const rowClick = (it.type === "mecha_patrol" || it.type === "mecha_dormant")
        ? `window.__GAME__.ui.mapCtrl.focusLiveMecha('${it.mechaId}')`
        : `window.__GAME__.ui.mapCtrl.focusOn(${it.x}, ${it.z}, ${focusZ})`;
      const gpsClick = (it.type === "mecha_patrol" || it.type === "mecha_dormant")
        ? `event.stopPropagation(); window.__GAME__.ui.mapCtrl.trackLiveMecha('${it.mechaId}');`
        : `event.stopPropagation(); window.__GAME__.setWaypoint(${px}, ${pz}, '${safeName}'); window.__GAME__.ui.mapCtrl.render();`;
      return `
        <div class="map-poi-row" onclick="${rowClick}">
          <div style="min-width:0;">
            <div class="map-poi-name" style="color:${it.color};">${prefix}${it.name}</div>
            <div class="small muted">${dKm} km away</div>
          </div>
          <button class="btn small primary" style="padding:3px 7px;" onclick="${gpsClick}">GPS</button>
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

    // 6-Lane Savanna Mega-Bridge Ocean Span (Mainland ↔ Zolotoy Savanna)
    const mb = this._getMegaBridge();
    if (mb && this.layers.bridges) {
      const [sx, sy] = this._toPx(mb.startX, mb.startZ, W, H);
      const [ex, ey] = this._toPx(mb.endX, mb.endZ, W, H);
      const [mx, my] = this._toPx(mb.midX, mb.midZ, W, H);
      const segLen = Math.hypot(ex - sx, ey - sy);
      if (segLen > 1) {
        const nx = -(ey - sy) / segLen;
        const ny = (ex - sx) / segLen;
        const railOff = Math.max(2.6, Math.min(6.2, this.zoom * 1.15 + 1.4));

        ctx.save();
        ctx.lineCap = "round";
        // Outer luminous cyan aura
        ctx.strokeStyle = "rgba(0, 229, 255, 0.30)";
        ctx.lineWidth = Math.max(10, Math.min(20, this.zoom * 3.0 + 6));
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();

        // Dark 6-lane bridge deck casing
        ctx.strokeStyle = "#081826";
        ctx.lineWidth = Math.max(6.0, Math.min(13, this.zoom * 2.1 + 3.5));
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();

        // Twin glowing cyan outer lanes/rails
        ctx.strokeStyle = "#00f5ff";
        ctx.lineWidth = Math.max(1.5, Math.min(2.8, this.zoom * 0.52 + 0.9));
        ctx.beginPath();
        ctx.moveTo(sx + nx * railOff, sy + ny * railOff);
        ctx.lineTo(ex + nx * railOff, ey + ny * railOff);
        ctx.moveTo(sx - nx * railOff, sy - ny * railOff);
        ctx.lineTo(ex - nx * railOff, ey - ny * railOff);
        ctx.stroke();

        // Crisp glowing gold center highway span
        ctx.strokeStyle = "#ffd166";
        ctx.lineWidth = Math.max(1.9, Math.min(3.6, this.zoom * 0.72 + 1.0));
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();

        // Cable-stayed pylon ticks along the span
        const pylonCount = Math.min(18, Math.max(5, Math.round(segLen / 28)));
        const tickHalf = railOff + 2.4;
        ctx.strokeStyle = "rgba(128, 250, 255, 0.85)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let pi = 1; pi < pylonCount; pi++) {
          const frac = pi / pylonCount;
          const pxP = sx + (ex - sx) * frac;
          const pyP = sy + (ey - sy) * frac;
          if (pxP < -16 || pxP > W + 16 || pyP < -16 || pyP > H + 16) continue;
          ctx.moveTo(pxP - nx * tickHalf, pyP - ny * tickHalf);
          ctx.lineTo(pxP + nx * tickHalf, pyP + ny * tickHalf);
        }
        ctx.stroke();

        // Glowing cyan-gold bridgehead anchor beacons
        for (const [ax, ay] of [[sx, sy], [ex, ey]]) {
          if (ax < -20 || ax > W + 20 || ay < -20 || ay > H + 20) continue;
          ctx.fillStyle = "#ffd166";
          ctx.beginPath(); ctx.arc(ax, ay, 4.2, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "#00f5ff";
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }

        // Crisp pill label: "6-LANE SAVANNA MEGA-BRIDGE"
        let lx = mx, ly = my;
        if (lx < 50 || lx > W - 50 || ly < 24 || ly > H - 24) {
          const tC = Math.max(0.12, Math.min(0.88, ((W * 0.5 - sx) * (ex - sx) + (H * 0.5 - sy) * (ey - sy)) / (segLen * segLen)));
          lx = sx + (ex - sx) * tC;
          ly = sy + (ey - sy) * tC;
        }
        if (lx >= -60 && lx <= W + 60 && ly >= -24 && ly <= H + 24) {
          const lbl = "6-LANE SAVANNA MEGA-BRIDGE";
          ctx.font = "bold 10.5px monospace";
          const tw = ctx.measureText(lbl).width + 14;
          const bx = Math.max(8, Math.min(W - tw - 8, lx - tw * 0.5));
          const by = Math.max(8, Math.min(H - 36, ly - 22));
          ctx.fillStyle = "rgba(6, 18, 30, 0.90)";
          ctx.fillRect(bx, by, tw, 17);
          ctx.strokeStyle = "#00f5ff";
          ctx.lineWidth = 1.3;
          ctx.strokeRect(bx, by, tw, 17);
          ctx.fillStyle = "#ffd166";
          ctx.fillText(lbl, bx + 7, by + 12);
        }
        ctx.restore();
      }
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
        if (tz.waypoints && tz.waypoints.length >= 3) {
          const cyaw = Math.cos(tz.yaw || 0), syaw = Math.sin(tz.yaw || 0);
          ctx.beginPath();
          for (let wi = 0; wi < tz.waypoints.length; wi++) {
            const [lx, lz] = tz.waypoints[wi];
            const wx = tz.cx + lx * cyaw - lz * syaw;
            const wz = tz.cz + lx * syaw + lz * cyaw;
            const [tx, ty] = this._toPx(wx, wz, W, H);
            if (wi === 0) ctx.moveTo(tx, ty); else ctx.lineTo(tx, ty);
          }
          ctx.closePath();
          ctx.strokeStyle = "rgba(6, 18, 28, 0.85)"; ctx.lineWidth = Math.max(4.4, Math.min(9, this.zoom * 1.4)); ctx.stroke();
          ctx.strokeStyle = "#00f5ff"; ctx.lineWidth = Math.max(2.2, Math.min(4.6, this.zoom * 0.8)); ctx.stroke();
        } else {
          const [tx, ty] = this._toPx(tz.cx, tz.cz, W, H);
          ctx.strokeStyle = "#00f5ff"; ctx.lineWidth = 2.6;
          ctx.beginPath(); ctx.ellipse(tx, ty, Math.max(6, (tz.rx / spanX) * W), Math.max(4, (tz.rz / spanZ) * H), tz.yaw, 0, Math.PI * 2); ctx.stroke();
        }
      }
      for (const bz of (KK.BAD_ROAD_ZONES || [])) {
        const [bx, by] = this._toPx(bz.x, bz.z, W, H);
        const rPx = Math.max(6, (bz.radius / spanX) * W);
        ctx.fillStyle = "rgba(255, 77, 109, 0.24)"; ctx.beginPath(); ctx.arc(bx, by, rPx, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#ff4d6d"; ctx.lineWidth = 1.6; ctx.stroke();
      }
    }

    // v18.1.2 Draw EINHEIT-03 dashed amber coastal patrol loop around Zolotoy Savanna!
    if ((this.layers.zones || this.layers.landmarks) && this.game.savannaMechas && Array.isArray(this.game.savannaMechas.mechas)) {
      const patrolM = this.game.savannaMechas.mechas.find((m) => m.isPatrol && m.patrolWaypoints && m.patrolWaypoints.length >= 3);
      if (patrolM) {
        ctx.save();
        ctx.beginPath();
        for (let wi = 0; wi < patrolM.patrolWaypoints.length; wi++) {
          const [wx, wz] = patrolM.patrolWaypoints[wi];
          const [ppx, ppy] = this._toPx(wx, wz, W, H);
          if (wi === 0) ctx.moveTo(ppx, ppy); else ctx.lineTo(ppx, ppy);
        }
        ctx.closePath();
        ctx.strokeStyle = "rgba(255, 166, 26, 0.42)";
        ctx.lineWidth = Math.max(1.4, Math.min(2.6, this.zoom * 0.45));
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }

    const prevHoverName = this.hoverItem ? this.hoverItem.name : null;
    this._pois = this._collectAllPOIs();
    if (prevHoverName) {
      this.hoverItem = this._pois.find((it) => it.name === prevHoverName) || null;
    }
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
      if (item.type === "megabridge") {
        const sz = isHov ? 7.5 : 5.2;
        ctx.fillStyle = "#ffd166";
        ctx.strokeStyle = "#00f5ff";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(px, py - sz); ctx.lineTo(px + sz, py); ctx.lineTo(px, py + sz); ctx.lineTo(px - sz, py);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (item.type === "mecha_patrol") {
        // Pulsing amber radar ring + heading arrow + Stahlhelm silhouette with glowing visor!
        const pulseM = (performance.now() % 1400) / 1400;
        ctx.strokeStyle = "#ffa61a";
        ctx.globalAlpha = (1 - pulseM) * 0.85;
        ctx.lineWidth = 2.0;
        ctx.beginPath(); ctx.arc(px, py, 7 + pulseM * 18, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1.0;

        // Live heading chevron showing patrol direction
        const hAng = item.yaw || 0;
        const hxDir = Math.sin(hAng), hyDir = Math.cos(hAng);
        ctx.save();
        ctx.translate(px + hxDir * 11, py + hyDir * 11);
        ctx.rotate(Math.atan2(hyDir, hxDir));
        ctx.fillStyle = "#ffa61a";
        ctx.beginPath(); ctx.moveTo(5.5, 0); ctx.lineTo(-3.5, -3.5); ctx.lineTo(-1.5, 0); ctx.lineTo(-3.5, 3.5); ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Stahlhelm badge + glowing amber visor slit
        const rM = isHov ? 9.0 : 7.2;
        ctx.fillStyle = "#1e2428";
        ctx.strokeStyle = "#ffa61a";
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(px, py - 1, rM * 0.85, Math.PI, 0);
        ctx.lineTo(px + rM * 1.12, py + rM * 0.45);
        ctx.lineTo(px - rM * 1.12, py + rM * 0.45);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#ffbe0b";
        ctx.fillRect(px - rM * 0.56, py - 0.8, rM * 1.12, 2.6);
      } else if (item.type === "mecha_dormant") {
        // Dormant steel-grey Stahlhelm monument icon
        const rD = isHov ? 8.2 : 6.4;
        ctx.fillStyle = "#334155";
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(px, py - 1, rD * 0.85, Math.PI, 0);
        ctx.lineTo(px + rD * 1.08, py + rD * 0.42);
        ctx.lineTo(px - rD * 1.08, py + rD * 0.42);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(px - rD * 0.52, py - 0.6, rD * 1.04, 2.2);
      } else if (item.type === "gp_garage") {
        // Bright gold/cyan GP Circuit Paddock Garage & Car Wash badge!
        const szG = isHov ? 8.0 : 6.4;
        ctx.fillStyle = "#ffd166";
        ctx.strokeStyle = "#00f5ff";
        ctx.lineWidth = 2.0;
        ctx.fillRect(px - szG, py - szG, szG * 2, szG * 2);
        ctx.strokeRect(px - szG, py - szG, szG * 2, szG * 2);
        ctx.fillStyle = "#0b1118";
        ctx.font = "900 9.5px monospace";
        ctx.textAlign = "center";
        ctx.fillText("G", px, py + 3.5);
        ctx.textAlign = "left";
      } else if (item.type === "bridge") {
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
        || (item.type === "mecha_patrol" && this.zoom >= 1.05)
        || (item.type === "mecha_dormant" && this.zoom >= 1.45)
        || (item.type === "gp_garage" && this.zoom >= 1.8)
        || (item.type === "tarmac" && this.zoom >= 1.4)
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
