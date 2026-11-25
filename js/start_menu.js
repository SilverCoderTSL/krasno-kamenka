// ============================================================================
// js/start_menu.js (v15.4.3 ONLINE) — Atmospheric 3-Biome Horror Title Menu, Interactive
// Clean Spawn Map (Roads, Rivers & Settlements Only + Survivability Ratings) &
// Account Password Management
// ============================================================================
window.KK = window.KK || {};

KK.StartMenu = class StartMenu {
  constructor(game) {
    this.game = game;
    this.isOpen = true;
    this.activeTab = "deploy"; // deploy | account | settings
    this.deployStep = "rig";   // rig | map
    this.selectedTownId = 0;
    this.selectedPortId = null;
    this.mapZoom = 1.0;
    this.mapPanX = 0;
    this.mapPanZ = 0;
    this._mapDragging = false;
    this._mapDragMoved = false;
    this._mapLastX = 0;
    this._mapLastY = 0;
    this.selectedVehicleId = game.activeVehicleId || "uaz452";
    this.animT = 0;
    this._raf = null;

    this.overlay = document.getElementById("start-menu-overlay");
    this.canvas = document.getElementById("start-menu-canvas");
    this.ctx = this.canvas ? this.canvas.getContext("2d") : null;

    this._seedSceneData();
    this._bindMenuEvents();
    this.open();
  }

  _seedSceneData() {
    this.trees = [];
    for (let i = 0; i < 64; i++) {
      this.trees.push({
        x: (i / 64) + (Math.sin(i * 19.7) * 0.012),
        layer: i % 3,
        h: 0.14 + (Math.abs(Math.sin(i * 7.3)) * 0.18),
        swayOff: i * 0.7
      });
    }
    this.snow = [];
    for (let i = 0; i < 95; i++) {
      this.snow.push({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 2.2, v: 0.05 + Math.random() * 0.12, vx: -0.02 - Math.random() * 0.04 });
    }
    this.sand = [];
    for (let i = 0; i < 75; i++) {
      this.sand.push({ x: Math.random(), y: 0.45 + Math.random() * 0.55, len: 8 + Math.random() * 22, v: 0.14 + Math.random() * 0.22 });
    }
  }

  _bindMenuEvents() {
    window.addEventListener("resize", () => this._resizeCanvas());
    document.querySelectorAll(".sm-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.activeTab = btn.dataset.smtab;
        if (this.activeTab === "deploy") this.deployStep = "rig";
        document.querySelectorAll(".sm-tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
        this.renderTab();
      });
    });
  }

  _resizeCanvas() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  open() {
    this.isOpen = true;
    this.deployStep = "rig";
    this.selectedVehicleId = this.game.activeVehicleId || "uaz452";
    if (document.pointerLockElement && document.exitPointerLock) {
      try { document.exitPointerLock(); } catch (e) {}
    }
    if (this.overlay) this.overlay.classList.remove("hidden");
    document.body.classList.add("start-menu-open");
    this._resizeCanvas();
    this.renderTab();
    if (!this._raf) this._tick(performance.now());
  }

  goToSpawnMap() {
    const g = this.game;
    const csInput = document.getElementById("sm-callsign-input");
    if (csInput && csInput.value.trim()) {
      const cs = csInput.value.trim().slice(0, 18);
      if (g.network) g.network.callsign = cs;
      localStorage.setItem("kk_callsign", cs);
      const hudCs = document.getElementById("lan-callsign-input");
      if (hudCs) hudCs.value = cs;
    }
    const hostInput = document.getElementById("sm-host-input");
    const code = hostInput ? hostInput.value.trim() : "";
    if (code && g.network && g.network.roomCode !== code.toUpperCase()) {
      localStorage.setItem("kk_room_code", code.toUpperCase());
      const hudH = document.getElementById("lan-host-input");
      if (hudH) hudH.value = code.toUpperCase();
      g.network.joinRoom(code, g.network.callsign);
    }
    this.deployStep = "map";
    this.renderTab();
  }

  backToRigStep() {
    this.deployStep = "rig";
    this.renderTab();
  }

  closeAndDeploy() {
    const g = this.game;
    if (this.selectedVehicleId && g.ownedVehicles[this.selectedVehicleId] && g.activeVehicleId !== this.selectedVehicleId) {
      g.switchVehicle(this.selectedVehicleId, true);
    }

    const selPort = this.selectedPortId ? (KK.PORTS || []).find((p) => p.id === this.selectedPortId) : null;
    const tw = KK.TOWNS[this.selectedTownId] || KK.TOWNS[0];
    const destName = selPort ? ("⚓ " + selPort.name) : tw.name;
    const destX = selPort ? (selPort.approachX !== undefined ? selPort.approachX : selPort.x) : tw.x;
    const destZ = selPort ? (selPort.approachZ !== undefined ? selPort.approachZ : selPort.z) : (tw.z + 18);

    if (!this._hasDeployedOnce || this._spawnTownChanged) {
      const sy = g.world.getTerrainInfo(destX, destZ, true).height;
      g.vehicle.pos.set(destX, sy + 1.35, destZ);
      g.vehicle.vel.set(0, 0, 0);
      g.vehicle.angVel.set(0, 0, 0);
      g.vehicle.quat.set(0, 0, 0, 1);
      g.world.updateChunks(destX, destZ, true);
      this._hasDeployedOnce = true;
      this._spawnTownChanged = false;
    }

    this.isOpen = false;
    if (this.overlay) this.overlay.classList.add("hidden");
    document.body.classList.remove("start-menu-open");
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
    g.audio.init();
    g.ui.toast(`Deployed to ${destName} in ${KK.VEHICLES[g.activeVehicleId].name}!`);
  }

  selectStartRig(vid) {
    if (!this.game.ownedVehicles[vid]) return;
    this.selectedVehicleId = vid;
    this.renderTab();
  }

  selectStartTown(tid) {
    this.selectedTownId = parseInt(tid, 10) || 0;
    this._spawnTownChanged = true;
    this._drawSpawnMap();
    this._updateSpawnTownCard();
  }

  _updateSpawnTownCard() {
    const card = document.getElementById("sm-spawn-town-card");
    if (!card) return;
    const rig = KK.VEHICLES[this.selectedVehicleId] || KK.VEHICLES.uaz452;
    const selPort = this.selectedPortId ? (KK.PORTS || []).find((p) => p.id === this.selectedPortId) : null;
    if (selPort) {
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <b style="font-size:15px;color:#00e5ff;">⚓ ${selPort.name}</b>
          <span style="padding:2px 8px;border-radius:4px;font-family:monospace;font-size:11px;font-weight:800;color:#081016;background:#00e5ff;">OCEAN PORT • BOAT SUMMON</span>
        </div>
        <div class="small muted" style="margin-top:5px;">Deploys directly at the coastal pier entrance! Drive onto the glowing cyan pad &amp; press [F] to unlock &amp; summon the Zubr Hovercraft, Serna Barge, Patrol Boat, or Strela-X1 Speedboat.</div>
        <div class="small" style="margin-top:6px;color:#80faff;"><b>Selected Rig:</b> ${rig.name}</div>`;
      return;
    }
    const tw = KK.TOWNS[this.selectedTownId] || KK.TOWNS[0];
    const score = tw.survScore || 50;
    const col = tw.survColor || "#ffd166";
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
        <b style="font-size:15px;color:#f0f6fc;">${tw.name}</b>
        <span style="padding:2px 8px;border-radius:4px;font-family:monospace;font-size:11px;font-weight:800;color:#081016;background:${col};">SURVIVABILITY: ${tw.survivability || "MODERATE"} (${score}%)</span>
      </div>
      <div class="sm-surv-track"><div class="sm-surv-fill" style="width:${score}%;background:${col};"></div></div>
      <div class="small muted" style="margin-top:5px;">${tw.survNote || tw.desc}</div>
      <div class="small" style="margin-top:6px;color:#80faff;"><b>Selected Rig:</b> ${rig.name}</div>`;
  }

  zoomSpawnMap(mult) {
    this.mapZoom = Math.max(0.85, Math.min(8.5, this.mapZoom * mult));
    this._drawSpawnMap();
  }

  resetSpawnMap() {
    this.mapZoom = 1.0;
    this.mapPanX = 0;
    this.mapPanZ = 0;
    this._drawSpawnMap();
  }

  focusSpawnIsland(islandId) {
    const isl = (KK.ISLANDS || []).find((x) => x.id === islandId);
    if (!isl) { this.resetSpawnMap(); return; }
    this.mapPanX = isl.cx;
    this.mapPanZ = isl.cz;
    this.mapZoom = islandId === 0 ? 1.85 : (isl.rx < 7000 ? 6.0 : 3.8);
    this._drawSpawnMap();
  }

  // ZOOMABLE & PANNABLE ARCHIPELAGO SPAWN MAP (Scroll to Zoom, Drag to Pan, Click Town!)
  _drawSpawnMap() {
    const cv = document.getElementById("sm-spawn-map-canvas");
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const W = cv.width, H = cv.height;
    const baseSpanX = 196000 / this.mapZoom;
    const baseSpanZ = (baseSpanX * H) / W;
    const minX = this.mapPanX - baseSpanX * 0.5;
    const minZ = this.mapPanZ - baseSpanZ * 0.5;
    const toPx = (gx, gz) => [
      ((gx - minX) / baseSpanX) * W,
      ((gz - minZ) / baseSpanZ) * H
    ];

    ctx.fillStyle = "#081c2e"; ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(90, 140, 180, 0.10)"; ctx.lineWidth = 1;
    const gridStep = this.mapZoom > 3.5 ? 5000 : (this.mapZoom > 1.8 ? 10000 : 20000);
    const gx0 = Math.floor(minX / gridStep) * gridStep;
    const gz0 = Math.floor(minZ / gridStep) * gridStep;
    for (let x = gx0; x <= minX + baseSpanX; x += gridStep) {
      const [px] = toPx(x, 0);
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
    }
    for (let z = gz0; z <= minZ + baseSpanZ; z += gridStep) {
      const [, py] = toPx(0, z);
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke();
    }

    if (KK.ISLANDS) {
      for (const isl of KK.ISLANDS) {
        const [ix, iy] = toPx(isl.cx, isl.cz);
        const rxPx = (isl.rx / baseSpanX) * W;
        const ryPx = (isl.rz / baseSpanZ) * H;
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(ix, iy, rxPx, ryPx, 0, 0, Math.PI * 2);
        const fillCol = isl.biome === "tropical" ? "rgba(38, 138, 72, 0.44)"
          : (isl.biome === "savanna" ? "rgba(186, 148, 56, 0.42)"
          : (isl.biome === "arctic" ? "rgba(165, 208, 232, 0.40)"
          : (isl.biome === "radioactive" ? "rgba(110, 140, 42, 0.48)" : "rgba(58, 76, 62, 0.44)")));
        ctx.fillStyle = fillCol;
        ctx.fill();
        ctx.strokeStyle = "rgba(120, 205, 230, 0.48)";
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.fillStyle = isl.labelColor || "#cfe3f2";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(isl.name.toUpperCase(), ix, iy - ryPx - 5);
        ctx.restore();
      }
    }

    if (this.game.world && this.game.world.riverSegments) {
      ctx.strokeStyle = "rgba(38, 165, 224, 0.58)"; ctx.lineWidth = Math.max(1.8, 2.2 * Math.sqrt(this.mapZoom)); ctx.lineCap = "round";
      for (const seg of this.game.world.riverSegments) {
        const [x0, y0] = toPx(seg.x0, seg.z0), [x1, y1] = toPx(seg.x1, seg.z1);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
    }

    if (this.game.world && this.game.world.roadSegments) {
      for (const seg of this.game.world.roadSegments) {
        const [x0, y0] = toPx(seg.x0, seg.z0), [x1, y1] = toPx(seg.x1, seg.z1);
        ctx.strokeStyle = seg.isModernHwy ? "rgba(255, 214, 102, 0.72)" : (seg.isTropikaHell ? "rgba(210, 140, 88, 0.65)" : "rgba(195, 210, 225, 0.55)");
        ctx.lineWidth = seg.isModernHwy ? 2.4 : 1.5;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
    }

    this._spawnPts = [];
    const placedLabels = [];
    for (const tw of KK.TOWNS) {
      const [px, py] = toPx(tw.x, tw.z);
      const sel = (tw.id === this.selectedTownId);
      const col = tw.survColor || "#ffd166";
      this._spawnPts.push({ id: tw.id, px, py });

      if (px < -20 || px > W + 20 || py < -20 || py > H + 20) continue;

      if (sel) {
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(px, py, 12, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(px, py, sel ? 7.0 : 5.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#081016"; ctx.lineWidth = 1.5; ctx.stroke();

      const shortName = tw.name.split(" (")[0];
      const lblY = py - 10;
      let overlaps = false;
      if (!sel && this.mapZoom < 2.2) {
        for (const p of placedLabels) {
          if (Math.abs(p.x - px) < 76 && Math.abs(p.y - lblY) < 13) { overlaps = true; break; }
        }
      }
      if (!overlaps) {
        placedLabels.push({ x: px, y: lblY });
        ctx.font = sel ? "bold 11px monospace" : "bold 9.5px monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(8, 16, 24, 0.82)";
        const twW = ctx.measureText(shortName).width + 8;
        ctx.fillRect(px - twW * 0.5, lblY - 10, twW, 13);
        ctx.fillStyle = sel ? "#ffffff" : "#dce8f4";
        ctx.fillText(shortName, px, lblY);
      }
    }

    // Draw all 9 Ocean Ports (Clickable cyan anchor markers!)
    if (KK.PORTS) {
      for (const pt of KK.PORTS) {
        const [px, py] = toPx(pt.x, pt.z);
        const sel = (this.selectedPortId === pt.id);
        this._spawnPts.push({ portId: pt.id, px, py });
        if (px < -20 || px > W + 20 || py < -20 || py > H + 20) continue;
        if (sel) {
          ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.arc(px, py, 12, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.fillStyle = "#00e5ff";
        ctx.beginPath(); ctx.arc(px, py, sel ? 7.0 : 5.2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#041624"; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = "#041624"; ctx.font = "bold 9px monospace"; ctx.textAlign = "center";
        ctx.fillText("⚓", px, py + 3);
        if (sel || this.mapZoom >= 1.5) {
          const lbl = "⚓ " + pt.name.split(" (")[0];
          ctx.font = sel ? "bold 10.5px monospace" : "bold 9px monospace";
          const twW = ctx.measureText(lbl).width + 8;
          ctx.fillStyle = "rgba(4, 22, 36, 0.85)";
          ctx.fillRect(px - twW * 0.5, py + 9, twW, 13);
          ctx.fillStyle = "#80faff";
          ctx.fillText(lbl, px, py + 19);
        }
      }
    }

    ctx.fillStyle = "rgba(8, 16, 24, 0.72)";
    ctx.fillRect(W - 210, H - 22, 204, 18);
    ctx.fillStyle = "#9ab8cf";
    ctx.font = "10px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`ZOOM ${this.mapZoom.toFixed(1)}x • SCROLL / DRAG`, W - 12, H - 9);
  }

  _bindSpawnMapClick() {
    const cv = document.getElementById("sm-spawn-map-canvas");
    if (!cv || cv._kkMapBound) return;
    cv._kkMapBound = true;

    cv.addEventListener("wheel", (e) => {
      e.preventDefault();
      const rect = cv.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (cv.width / rect.width);
      const my = (e.clientY - rect.top) * (cv.height / rect.height);
      const oldSpanX = 196000 / this.mapZoom;
      const oldSpanZ = (oldSpanX * cv.height) / cv.width;
      const wx = this.mapPanX + (mx / cv.width - 0.5) * oldSpanX;
      const wz = this.mapPanZ + (my / cv.height - 0.5) * oldSpanZ;
      const factor = e.deltaY < 0 ? 1.25 : 0.8;
      this.mapZoom = Math.max(0.85, Math.min(8.5, this.mapZoom * factor));
      const newSpanX = 196000 / this.mapZoom;
      const newSpanZ = (newSpanX * cv.height) / cv.width;
      this.mapPanX = wx - (mx / cv.width - 0.5) * newSpanX;
      this.mapPanZ = wz - (my / cv.height - 0.5) * newSpanZ;
      this._drawSpawnMap();
    }, { passive: false });

    cv.addEventListener("mousedown", (e) => {
      this._mapDragging = true;
      this._mapDragMoved = false;
      this._mapLastX = e.clientX;
      this._mapLastY = e.clientY;
      cv.style.cursor = "grabbing";
    });
    window.addEventListener("mousemove", (e) => {
      if (!this._mapDragging) return;
      const dx = e.clientX - this._mapLastX;
      const dy = e.clientY - this._mapLastY;
      if (Math.hypot(dx, dy) > 3) this._mapDragMoved = true;
      this._mapLastX = e.clientX;
      this._mapLastY = e.clientY;
      const rect = cv.getBoundingClientRect();
      const spanX = 196000 / this.mapZoom;
      const spanZ = (spanX * cv.height) / cv.width;
      this.mapPanX -= (dx / rect.width) * spanX;
      this.mapPanZ -= (dy / rect.height) * spanZ;
      this._drawSpawnMap();
    });
    window.addEventListener("mouseup", () => {
      if (this._mapDragging) {
        this._mapDragging = false;
        cv.style.cursor = "grab";
      }
    });

    cv.addEventListener("click", (e) => {
      if (this._mapDragMoved) return;
      const rect = cv.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (cv.width / rect.width);
      const my = (e.clientY - rect.top) * (cv.height / rect.height);
      let bestPt = null, bestD = 30;
      for (const pt of (this._spawnPts || [])) {
        const d = Math.hypot(pt.px - mx, pt.py - my);
        if (d < bestD) { bestD = d; bestPt = pt; }
      }
      if (bestPt) {
        if (bestPt.portId) {
          this.selectedPortId = bestPt.portId;
        } else {
          this.selectedPortId = null;
          this.selectedTownId = bestPt.id;
        }
        this._spawnTownChanged = true;
        this._drawSpawnMap();
        this._updateSpawnTownCard();
      }
    });
  }

  renderTab() {
    const body = document.getElementById("sm-tab-body");
    if (!body) return;
    const g = this.game;
    const acc = g.account;
    const ownedIds = Object.keys(g.ownedVehicles || {});
    if (!g.ownedVehicles[this.selectedVehicleId]) this.selectedVehicleId = ownedIds[0] || "uaz452";

    const balEl = document.getElementById("sm-header-balance");
    if (balEl) balEl.textContent = "$" + Math.floor(g.money).toLocaleString();
    const accEl = document.getElementById("sm-header-account");
    if (accEl) accEl.textContent = acc ? (acc.isDev ? `★ ${acc.username} (DEV)` : `👤 ${acc.username}`) : "👤 GUEST (OFFLINE)";

    if (this.activeTab === "deploy") {
      if (this.deployStep === "rig") {
        const rigChips = ownedIds.map((vid) => {
          const v = KK.VEHICLES[vid];
          if (!v) return "";
          const sel = vid === this.selectedVehicleId;
          const badge = v.devOnly ? `<span class="sm-secret-tag" style="background:#d62828;">DEV ONLY</span>` : (v.secretUnlock ? `<span class="sm-secret-tag">CLASSIFIED</span>` : "");
          return `<div class="sm-rig-chip ${sel ? "selected" : ""}" onclick="window.__GAME__.startMenu.selectStartRig('${vid}')">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
              <b>${v.name}</b>${badge}
            </div>
            <div class="small muted">${v.category}</div>
          </div>`;
        }).join("");

        body.innerHTML = `
          <div class="sm-grid-2">
            <div>
              <label class="sm-lbl">DRIVER CALLSIGN</label>
              <input id="sm-callsign-input" class="sm-input" type="text" maxlength="18" value="${((g.network && g.network.callsign) || localStorage.getItem("kk_callsign") || "DRIVER").replace(/"/g, "&quot;")}" placeholder="Enter callsign..." />
            </div>
            <div>
              <label class="sm-lbl">ONLINE ROOM CODE (OR CLICK HOST)</label>
              <div style="display:flex;gap:6px;">
                <input id="sm-host-input" class="sm-input" type="text" value="${((g.network && g.network.roomCode) || "").replace(/"/g, "&quot;")}" placeholder="Leave blank for Solo, or KK-A1B2" />
                <button class="btn accent small" style="white-space:nowrap;" onclick="window.__GAME__.startMenu.hostOnlineFromMenu()">HOST ROOM</button>
              </div>
            </div>
          </div>
          <div style="margin-top:12px;">
            <label class="sm-lbl">STEP 1/2 — SELECT YOUR VEHICLE (${ownedIds.length} OWNED)</label>
            <div class="sm-rig-grid">${rigChips}</div>
          </div>
          <div style="margin-top:14px;display:flex;gap:12px;align-items:center;">
            <button class="btn primary sm-deploy-btn" onclick="window.__GAME__.startMenu.goToSpawnMap()">NEXT: CHOOSE SPAWN ON MAP ▶</button>
            <div class="small muted" style="line-height:1.35;">
              <b>Online Status:</b> ${(!g.network || g.network.mode === "offline") ? '<span style="color:#ffd166;">SOLO MODE (CLICK HOST TO PLAY ONLINE)</span>' : '<span style="color:#2de08b;">' + (g.network.isHost ? "HOSTING ROOM " : "JOINED ROOM ") + (g.network.roomCode || "") + '</span>'}<br/>
              Pick your rig first, then choose your deployment settlement on the Oblast map.
            </div>
          </div>`;
      } else {
        body.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <label class="sm-lbl" style="margin:0;">STEP 2/2 — CLICK ANY SETTLEMENT ON THE OBLAST MAP TO DEPLOY</label>
            <span class="small muted"><b style="color:#2de08b;">●</b> High &nbsp; <b style="color:#ffd166;">●</b> Moderate &nbsp; <b style="color:#ff9f1c;">●</b> Low &nbsp; <b style="color:#ff3b5c;">●</b> Extreme</span>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px;align-items:center;">
            <button class="btn small" onclick="window.__GAME__.startMenu.focusSpawnIsland(0)">MAINLAND</button>
            <button class="btn small" style="color:#2de08b;" onclick="window.__GAME__.startMenu.focusSpawnIsland(1)">TROPIKA</button>
            <button class="btn small" style="color:#ffd166;" onclick="window.__GAME__.startMenu.focusSpawnIsland(2)">SAVANNA</button>
            <button class="btn small" style="color:#8ecae6;" onclick="window.__GAME__.startMenu.focusSpawnIsland(3)">ARCTIC</button>
            <button class="btn small" style="color:#48cae4;" onclick="window.__GAME__.startMenu.focusSpawnIsland(4)">CORAL CAY</button>
            <button class="btn small" style="color:#b8ff3b;" onclick="window.__GAME__.startMenu.focusSpawnIsland(5)">SITE-140</button>
            <span style="flex:1;"></span>
            <button class="btn small" onclick="window.__GAME__.startMenu.zoomSpawnMap(1.35)">+</button>
            <button class="btn small" onclick="window.__GAME__.startMenu.zoomSpawnMap(0.74)">−</button>
            <button class="btn small" onclick="window.__GAME__.startMenu.resetSpawnMap()">FIT ALL</button>
          </div>
          <canvas id="sm-spawn-map-canvas" width="780" height="320" style="width:100%;height:auto;border:1px solid #30475e;border-radius:8px;cursor:grab;display:block;" title="Scroll to zoom, drag to pan, click any town dot to deploy"></canvas>
          <div id="sm-spawn-town-card" class="sm-acc-box" style="margin-top:8px;"></div>
          <div style="margin-top:10px;display:flex;gap:10px;align-items:center;">
            <button class="btn" onclick="window.__GAME__.startMenu.backToRigStep()">◀ CHANGE VEHICLE</button>
            <button class="btn primary sm-deploy-btn" style="flex:1;" onclick="window.__GAME__.startMenu.closeAndDeploy()">▶ DEPLOY TO SELECTED SETTLEMENT</button>
          </div>`;
        this._drawSpawnMap();
        this._updateSpawnTownCard();
        this._bindSpawnMapClick();
      }
    } else if (this.activeTab === "account") {
      const fleetRows = ownedIds.map((vid) => {
        const v = KK.VEHICLES[vid]; const st = g.ownedVehicles[vid];
        if (!v || !st) return "";
        const eng = KK.ENGINES[st.engineId] || KK.ENGINES[v.stockEngineId];
        return `<div class="sm-fleet-row">
          <div><b>${v.name}</b> ${v.devOnly ? '<span class="sm-secret-tag" style="background:#d62828;">DEV FLAGSHIP</span>' : (v.secretUnlock ? '<span class="sm-secret-tag">RESTORED RELIC</span>' : "")}
            <div class="small muted">${eng ? eng.name : ""} • Fuel ${Math.round((st.fuel / v.fuelCapacity) * 100)}% • Body ${Math.round(st.health.body)}%</div>
          </div>
          <span class="small" style="color:#2de08b;font-weight:700;">OWNED</span>
        </div>`;
      }).join("");

      body.innerHTML = `
        <div class="sm-stat-strip">
          <div><small>CASH BALANCE</small><b style="color:#2de08b;">$${Math.floor(g.money).toLocaleString()}</b></div>
          <div><small>OWNED RIGS</small><b>${ownedIds.length}</b></div>
          <div><small>DELIVERIES</small><b>${g.stats.deliveries || 0}</b></div>
          <div><small>DISTANCE</small><b>${(g.stats.distanceKm || 0).toFixed(1)} km</b></div>
        </div>
        <div class="sm-acc-box">
          ${acc
            ? `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <div><b style="color:#80faff;">SIGNED IN AS: ${acc.username} ${acc.isDev ? '<span class="sm-secret-tag" style="background:#d62828;">VERIFIED DEV</span>' : ""}</b>
                <div class="small muted">Profile saves automatically in your browser (localStorage).</div></div>
                <button class="btn warn small" onclick="window.__GAME__.logoutAccount(); setTimeout(() => window.__GAME__.startMenu.renderTab(), 150);">SIGN OUT</button>
              </div>
              <div class="sm-grid-2" style="margin-top:6px;">
                <input id="sm-old-pin" class="sm-input" type="password" placeholder="Current Password / PIN" />
                <input id="sm-new-pin" class="sm-input" type="password" placeholder="New Password / PIN" />
              </div>
              <div class="btn-row" style="margin-top:6px;">
                <button class="btn small accent" onclick="window.__GAME__.startMenu.doChangePass()">CHANGE PASSWORD</button>
              </div>
              ${(acc && acc.username && acc.username.toLowerCase() === "silver" && !acc.isDev) ? `
                <div style="margin-top:10px;padding-top:8px;border-top:1px solid #2b3e52;">
                  <label class="sm-lbl" style="color:#ff6b6b;">HOST DEV AUTHORIZATION (SILVER ONLY)</label>
                  <div style="display:flex;gap:8px;">
                    <input id="sm-dev-key" class="sm-input" type="password" placeholder="Enter Secret Dev Key..." />
                    <button class="btn warn small" onclick="window.__GAME__.startMenu.doClaimDev()">VERIFY DEV</button>
                  </div>
                </div>` : ""}
              <div id="sm-acc-err" class="small" style="color:#ffd166;margin-top:6px;"></div>`
            : `<div class="sm-grid-2">
                <input id="sm-acc-user" class="sm-input" type="text" placeholder="Username" />
                <input id="sm-acc-pass" class="sm-input" type="password" placeholder="PIN / Password" />
              </div>
              <div class="btn-row" style="margin-top:8px;">
                <button class="btn primary small" onclick="window.__GAME__.startMenu.doAuth('login')">LOGIN ACCOUNT</button>
                <button class="btn accent small" onclick="window.__GAME__.startMenu.doAuth('register')">REGISTER NEW ACCOUNT</button>
              </div>
              <div id="sm-acc-err" class="small" style="color:#ff6b6b;margin-top:6px;"></div>`}
        </div>
        <label class="sm-lbl" style="margin-top:10px;">GARAGE FLEET MANIFEST</label>
        <div class="sm-fleet-list">${fleetRows}</div>`;
    } else {
      body.innerHTML = `
        <div class="sm-grid-2">
          <div class="sm-acc-box">
            <label class="sm-lbl">GRAPHICS &amp; AUDIO</label>
            <div class="btn-row" style="margin-top:6px;">
              <button class="btn small ${g.particles.quality === 'low' ? 'primary' : ''}" onclick="window.__GAME__.setParticleQuality('low'); window.__GAME__.startMenu.renderTab();">LOW</button>
              <button class="btn small ${g.particles.quality === 'medium' ? 'primary' : ''}" onclick="window.__GAME__.setParticleQuality('medium'); window.__GAME__.startMenu.renderTab();">MEDIUM</button>
              <button class="btn small ${g.particles.quality === 'high' ? 'primary' : ''}" onclick="window.__GAME__.setParticleQuality('high'); window.__GAME__.startMenu.renderTab();">HIGH</button>
            </div>
            <div class="btn-row" style="margin-top:8px;">
              <button class="btn small ${g.remoteDustEnabled ? 'primary' : ''}" onclick="window.__GAME__.toggleRemoteDust(); window.__GAME__.startMenu.renderTab();">OTHER PLAYERS DUST: ${g.remoteDustEnabled ? 'ON' : 'OFF'}</button>
              <button class="btn small" onclick="window.__GAME__.toggleAudioMute(); window.__GAME__.startMenu.renderTab();">AUDIO: ${g.audio.muted ? 'MUTED' : 'ON'}</button>
            </div>
          </div>
          <div class="sm-acc-box small" style="line-height:1.5;">
            <label class="sm-lbl">v15.4.3 ONLINE KEYBIND SUMMARY (FULL SORTED LIST IN [O] OPTIONS)</label>
            <b>[F]</b> Universal Interact / Enter-Exit (Front/Rear for Hood • <b>Shift+F</b> Force Exit)<br/>
            <b>[E]</b> On-Foot Inventory • <b>[Q/E]</b> Manual Gears (in car) • <b>[4]</b> Auto/Manual<br/>
            <b>[LMB/RMB/MMB]</b> Fire Primary / Turret Scope / Lock Turret<br/>
            <b>[R]</b> Ammo / Cargo Strap • <b>[Shift]</b> 14.5mm / 40mm • <b>[Z]</b> Vision (FLIR/NVG/Red NVD) • <b>[G]</b> Smoke/APS/Radar/Flare<br/>
            <b>[6]</b> Field Snorkel Deploy • <b>Hold [X]</b> X-Ray &amp; Autoloader • <b>[T/Y]</b> Winch
          </div>
        </div>`;
    }
  }

  async doAuth(mode) {
    const u = document.getElementById("sm-acc-user")?.value?.trim() || "";
    const p = document.getElementById("sm-acc-pass")?.value?.trim() || "";
    if (!u || !p) {
      const e = document.getElementById("sm-acc-err");
      if (e) e.textContent = "Enter both username and PIN/password!";
      return;
    }
    await this.game.submitAccountAuth(mode, u, p);
    this.renderTab();
  }

  hostOnlineFromMenu() {
    const g = this.game;
    const csInput = document.getElementById("sm-callsign-input");
    const cs = (csInput && csInput.value.trim()) ? csInput.value.trim().slice(0, 18) : (g.network ? g.network.callsign : "DRIVER");
    if (g.network) g.network.hostRoom(cs);
  }

  async doClaimDev() {
    const key = document.getElementById("sm-dev-key")?.value?.trim() || "";
    const res = await this.game.claimDevAccount(key);
    const e = document.getElementById("sm-acc-err");
    if (e) e.textContent = res.ok ? 'VERIFIED! PzKpfw 140A4 "Schreckensfürst" unlocked in your fleet!' : (res.error || "Failed.");
    if (res.ok) this.renderTab();
  }

  async doChangePass() {
    const oldP = document.getElementById("sm-old-pin")?.value?.trim() || "";
    const newP = document.getElementById("sm-new-pin")?.value?.trim() || "";
    const res = await this.game.changeAccountPassword(oldP, newP);
    const e = document.getElementById("sm-acc-err");
    if (e) e.textContent = res.ok ? "Password updated successfully!" : (res.error || "Failed.");
  }

  _tick(nowMs) {
    if (!this.isOpen) { this._raf = null; return; }
    this.animT = nowMs * 0.001;
    this._drawBackdrop();
    this._raf = requestAnimationFrame((t) => this._tick(t));
  }

  _drawBackdrop() {
    const ctx = this.ctx, cv = this.canvas;
    if (!ctx || !cv) return;
    const W = cv.width, H = cv.height, t = this.animT;
    const segDur = 9.0, total = segDur * 3;
    const phase = t % total;
    const idx = Math.floor(phase / segDur);
    const localT = phase - idx * segDur;
    const fadeWindow = 2.0;
    const nextIdx = (idx + 1) % 3;
    const blend = localT > (segDur - fadeWindow) ? (localT - (segDur - fadeWindow)) / fadeWindow : 0;

    const drawBiome = (bIdx, alpha) => {
      if (alpha <= 0.005) return;
      ctx.save(); ctx.globalAlpha = alpha;
      if (bIdx === 0) this._drawTaigaScene(ctx, W, H, t);
      else if (bIdx === 1) this._drawSnowPeaksScene(ctx, W, H, t);
      else this._drawDesertScene(ctx, W, H, t);
      ctx.restore();
    };

    ctx.fillStyle = "#06090d"; ctx.fillRect(0, 0, W, H);
    drawBiome(idx, 1.0);
    if (blend > 0) drawBiome(nextIdx, blend);

    const vig = ctx.createRadialGradient(W * 0.5, H * 0.5, H * 0.25, W * 0.5, H * 0.5, Math.max(W, H) * 0.72);
    vig.addColorStop(0, "rgba(0,0,0,0)"); vig.addColorStop(1, "rgba(4,7,11,0.82)");
    ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

    const lbls = [
      "SECTOR 01 // BLACK TIMBER TAIGA — ANOMALOUS BROADCAST DETECTED",
      "SECTOR 02 // NORTHERN ALPINE PEAKS — SEISMIC RADIATION SPIKE",
      "SECTOR 03 // RED SANDS DESERT — SUBTERRANEAN TREMORS ACTIVE"
    ];
    const captionEl = document.getElementById("sm-biome-caption");
    if (captionEl) captionEl.textContent = lbls[blend > 0.5 ? nextIdx : idx];
  }

  _drawTaigaScene(ctx, W, H, t) {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#0b1318"); sky.addColorStop(0.52, "#1c2c2c"); sky.addColorStop(1, "#09100d");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    const moon = ctx.createRadialGradient(W * 0.74, H * 0.24, 6, W * 0.74, H * 0.24, H * 0.26);
    moon.addColorStop(0, "rgba(205, 228, 224, 0.36)"); moon.addColorStop(1, "rgba(28, 44, 44, 0)");
    ctx.fillStyle = moon; ctx.fillRect(0, 0, W, H);

    const shX = W * 0.76 + Math.sin(t * 0.18) * 14, shBaseY = H * 0.72, shH = H * 0.44;
    const shAlpha = 0.22 + 0.10 * Math.sin(t * 0.7);
    ctx.save();
    ctx.fillStyle = `rgba(18, 13, 12, ${shAlpha})`; ctx.strokeStyle = `rgba(26, 18, 16, ${shAlpha + 0.08})`;
    ctx.fillRect(shX - 5, shBaseY - shH * 0.75, 10, shH * 0.75);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(shX - 5, shBaseY - shH * 0.70); ctx.lineTo(shX - 24, shBaseY - shH * 0.22);
    ctx.moveTo(shX + 5, shBaseY - shH * 0.70); ctx.lineTo(shX + 26, shBaseY - shH * 0.20);
    ctx.stroke();
    ctx.fillRect(shX - 3, shBaseY - shH, 6, shH * 0.26);
    ctx.beginPath(); ctx.moveTo(shX - 3, shBaseY - shH * 0.94); ctx.lineTo(shX - 28, shBaseY - shH * 0.99); ctx.lineTo(shX - 28, shBaseY - shH * 0.87); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(shX + 3, shBaseY - shH * 0.86); ctx.lineTo(shX + 28, shBaseY - shH * 0.91); ctx.lineTo(shX + 28, shBaseY - shH * 0.79); ctx.closePath(); ctx.fill();
    ctx.restore();

    const cols = ["#111c19", "#0b1411", "#060b09"];
    for (let layer = 0; layer < 3; layer++) {
      const groundY = H * (0.68 + layer * 0.09);
      ctx.fillStyle = cols[layer]; ctx.fillRect(0, groundY, W, H - groundY);
      for (const tr of this.trees) {
        if (tr.layer !== layer) continue;
        const tx = ((tr.x + t * (0.002 + layer * 0.0015)) % 1.08 - 0.04) * W;
        const th = tr.h * H * (0.85 + layer * 0.28), tw = th * 0.28;
        const sway = Math.sin(t * 0.9 + tr.swayOff) * (3 + layer * 2);
        ctx.beginPath(); ctx.moveTo(tx + sway, groundY - th); ctx.lineTo(tx - tw, groundY + 12); ctx.lineTo(tx + tw, groundY + 12); ctx.closePath(); ctx.fill();
      }
      const mist = ctx.createLinearGradient(0, groundY - 45, 0, groundY + 35);
      mist.addColorStop(0, "rgba(130, 165, 160, 0)"); mist.addColorStop(0.5, `rgba(145, 175, 170, ${0.11 - layer * 0.025})`); mist.addColorStop(1, "rgba(130, 165, 160, 0)");
      ctx.fillStyle = mist; ctx.fillRect(0, groundY - 45, W, 80);
    }
  }

  _drawSnowPeaksScene(ctx, W, H, t) {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#050b16"); sky.addColorStop(0.55, "#112238"); sky.addColorStop(1, "#0a121c");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    const gx = W * 0.72, gy = H * 0.56;
    const pulse = 0.22 + 0.28 * Math.pow(0.5 + 0.5 * Math.sin(t * 1.4), 2);
    ctx.save();
    const aura = ctx.createRadialGradient(gx, gy - H * 0.14, 10, gx, gy - H * 0.14, H * 0.34);
    aura.addColorStop(0, `rgba(0, 229, 255, ${pulse * 0.42})`); aura.addColorStop(1, "rgba(0, 229, 255, 0)");
    ctx.fillStyle = aura; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(8, 16, 26, 0.58)";
    ctx.beginPath(); ctx.moveTo(gx - 95, gy + 60); ctx.lineTo(gx - 58, gy - H * 0.22); ctx.lineTo(gx - 18, gy - H * 0.28); ctx.lineTo(gx + 34, gy - H * 0.24); ctx.lineTo(gx + 16, gy - H * 0.17); ctx.lineTo(gx + 62, gy + 60); ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgba(60, 235, 255, ${pulse * 0.72})`;
    for (let s = 0; s < 4; s++) {
      const sx = gx - 48 - s * 16, sy = gy - H * 0.18 + s * 22;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 24, sy - 16); ctx.lineTo(sx - 6, sy + 14); ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    const drawRidge = (baseY, amp, freq, shift, col) => {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 24) {
        const y = baseY - Math.abs(Math.sin(x * freq + shift)) * amp - Math.abs(Math.cos(x * freq * 1.9 - shift)) * (amp * 0.45);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    };
    drawRidge(H * 0.62, H * 0.22, 0.0042, 1.2 + t * 0.015, "#152538");
    drawRidge(H * 0.74, H * 0.16, 0.0065, 3.4 + t * 0.028, "#0e1a29");
    drawRidge(H * 0.86, H * 0.10, 0.0090, 5.1 + t * 0.045, "#08101a");

    ctx.fillStyle = "rgba(220, 240, 255, 0.48)";
    for (const sf of this.snow) {
      const sx = ((sf.x + t * sf.vx) % 1 + 1) % 1 * W, sy = ((sf.y + t * sf.v) % 1) * H;
      ctx.beginPath(); ctx.arc(sx, sy, sf.r, 0, Math.PI * 2); ctx.fill();
    }
  }

  _drawDesertScene(ctx, W, H, t) {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#1c110c"); sky.addColorStop(0.48, "#5c3318"); sky.addColorStop(0.72, "#9c5c26"); sky.addColorStop(1, "#24140a");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    const sun = ctx.createRadialGradient(W * 0.72, H * 0.46, 12, W * 0.72, H * 0.46, H * 0.30);
    sun.addColorStop(0, "rgba(255, 210, 128, 0.55)"); sun.addColorStop(1, "rgba(156, 92, 38, 0)");
    ctx.fillStyle = sun; ctx.fillRect(0, 0, W, H);

    const drawDune = (baseY, amp, freq, shift, col) => {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 20) {
        const y = baseY + Math.sin(x * freq + shift) * amp + Math.cos(x * freq * 0.5 - shift) * (amp * 0.4);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    };
    drawDune(H * 0.58, 28, 0.0038, t * 0.06, "#693b1a");

    const wx = ((t * 0.032) % 1.3 - 0.15) * W, wy = H * 0.67;
    ctx.save(); ctx.fillStyle = "rgba(42, 22, 10, 0.52)";
    for (let seg = 0; seg < 6; seg++) {
      const sx = wx - seg * 38, sy = wy + Math.sin(t * 2.2 + seg * 0.8) * 9 - (seg === 0 ? 12 : 0);
      ctx.beginPath(); ctx.arc(sx, sy, 26 - seg * 2.5, Math.PI, Math.PI * 2); ctx.fill();
    }
    const dust = ctx.createRadialGradient(wx, wy - 8, 6, wx, wy - 8, 95);
    dust.addColorStop(0, "rgba(218, 148, 76, 0.32)"); dust.addColorStop(1, "rgba(218, 148, 76, 0)");
    ctx.fillStyle = dust; ctx.fillRect(wx - 110, wy - 110, 220, 140);
    ctx.restore();

    drawDune(H * 0.72, 34, 0.0046, 2.2 + t * 0.09, "#472711");
    drawDune(H * 0.85, 26, 0.0060, 4.4 + t * 0.14, "#261409");

    ctx.strokeStyle = "rgba(240, 185, 118, 0.22)"; ctx.lineWidth = 1.4;
    for (const s of this.sand) {
      const sx = ((s.x + t * s.v) % 1.1 - 0.05) * W, sy = s.y * H;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + s.len, sy - 2); ctx.stroke();
    }
  }
};
