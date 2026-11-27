// ============================================================================
// js/ui.js (v5) — Revamped CPM2 Tuning (Engine/Transmission/Suspension),
// 5 Fictional Brands, Accounts & Leaderboard, Compass Strip & Mini-Radar
// ============================================================================
window.KK = window.KK || {};

KK.UIManager = class UIManager {
  constructor(game) {
    this.game = game;
    this.activeModal = null;
    this.garageTab = "fleet"; // fleet | blueprint | tuning
    this.selectedBrand = null; // null = Brand Logos Grid | "owned" | "all" | manufacturerId
    this.bpFilter = "all"; // all | engine | transmission | suspension | addons
    this.selectedModuleId = "pistons";
    this.envTab = "world"; // world | audio | tools | gps
    this.envSearch = "";
    this.availableContracts = [];
    this.toastTimeout = null;
    this._hudCache = {};
    this._bindButtons();
    this.mapCtrl = KK.MapController ? new KK.MapController(game, this) : null;
    this.generateContracts();
  }

  _bindButtons() {
    const q = (id) => document.getElementById(id);
    if (q("btn-open-garage")) q("btn-open-garage").onclick = () => this.openModal("garage");
    if (q("btn-open-contracts")) q("btn-open-contracts").onclick = () => this.openModal("contracts");
    if (q("btn-open-map")) q("btn-open-map").onclick = () => this.openModal("map");
    if (q("btn-open-env")) q("btn-open-env").onclick = () => this.openModal("env");
    if (q("btn-open-account")) q("btn-open-account").onclick = () => this.openModal("account");
    if (q("btn-close-modal")) q("btn-close-modal").onclick = () => this.closeModal();

    document.querySelectorAll(".garage-tab-btn").forEach((btn) => {
      btn.onclick = () => {
        this.garageTab = btn.dataset.tab;
        document.querySelectorAll(".garage-tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
        this.renderGarage();
      };
    });

    const chatIn = q("chat-input");
    if (chatIn) {
      chatIn.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          const txt = chatIn.value.trim();
          if (txt) {
            this.game.network.send({ type: "chat_msg", sender: this.game.network.callsign, text: txt });
            this.addChatLine(this.game.network.callsign, txt, false);
            chatIn.value = "";
          }
          chatIn.blur();
        } else if (e.key === "Escape") { chatIn.blur(); }
      });
    }

    if (q("btn-lan-host")) {
      q("btn-lan-host").onclick = () => {
        const cs = q("lan-callsign-input") ? q("lan-callsign-input").value.trim() : "";
        this.game.network.hostRoom(cs || this.game.network.callsign);
        this.toast("Connecting Online Relay & creating Room...");
      };
    }
    if (q("btn-lan-connect")) {
      q("btn-lan-connect").onclick = () => {
        const code = q("lan-host-input") ? q("lan-host-input").value.trim() : "";
        const cs = q("lan-callsign-input") ? q("lan-callsign-input").value.trim() : "";
        if (!code) { this.toast("Enter a Room Code (e.g. KK-A1B2) or click HOST!", true); return; }
        this.game.network.joinRoom(code, cs || this.game.network.callsign);
        this.toast("Joining Online Room: " + code.toUpperCase());
      };
    }
    if (q("lan-status-pill")) {
      q("lan-status-pill").onclick = () => {
        const rc = this.game.network.roomCode;
        if (!rc) return;
        const url = this.game.network.getShareInviteUrl();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(() => {
            this.toast(`Copied Invite Link for Room ${rc}! Send it to your friends!`);
          }).catch(() => this.toast(`Room Code: ${rc}`));
        } else {
          this.toast(`Room Code: ${rc} — Share link: ${url}`);
        }
      };
    }

  }

  toast(msg, isWarn = false) {
    const el = document.getElementById("toast-banner");
    if (!el) return;
    el.textContent = msg;
    el.className = "toast-banner show" + (isWarn ? " warn" : "");
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => { el.classList.remove("show"); }, 3800);
  }

  addChatLine(sender, text, isSystem = false) {
    const log = document.getElementById("chat-log");
    if (!log) return;
    const div = document.createElement("div");
    div.className = isSystem ? "chat-line sys" : "chat-line";
    div.textContent = `[${sender}] ${text}`;
    log.appendChild(div);
    while (log.children.length > 28) log.removeChild(log.firstChild);
    log.scrollTop = log.scrollHeight;
  }

  updateRoster(peers) {
    const el = document.getElementById("lan-roster");
    if (!el) return;
    if (!peers || peers.length === 0) { el.innerHTML = `<span class="muted">Solo / Click HOST to play online</span>`; return; }
    el.innerHTML = peers.map((p) => `<span class="peer-pill ${p.isHost ? "host" : ""}">${p.callsign}${p.isHost ? " ★" : ""}</span>`).join("");
  }

  openModal(name) {
    if (name === "garage") {
      if (!this.game.isInGarageZone()) {
        this.toast("GARAGE ACCESS DENIED! Drive to a Town Garage Bay, Clarkson's Farm, or Hammond's Mesa & press [F]!", true);
        return;
      }
    }
    if (document.pointerLockElement && document.exitPointerLock) { try { document.exitPointerLock(); } catch (e) {} }
    this.activeModal = name;
    document.getElementById("modal-overlay").classList.remove("hidden");
    document.querySelectorAll(".modal-pane").forEach((p) => p.classList.add("hidden"));
    const pane = document.getElementById("pane-" + name);
    if (pane) pane.classList.remove("hidden");
    const titles = {
      garage: "GARAGE — DEALERSHIP, 2D CAR BLUEPRINT & DYNO TUNING",
      contracts: "KRASNO-KAMENKA DISPATCH & LAN CONVOYS",
      map: "200KM × 200KM ARCHIPELAGO GPS SATELLITE MAP",
      field_repair: "UNDER-THE-HOOD ROADSIDE FIELD REPAIRS",
      env: "OPTIONS, CONTROLS & WORLD COMMAND [O]",
      account: "DRIVER ACCOUNT, PASSWORD & LEADERBOARD",
      coop_pit: "CO-OP PIT CREW & FIELD ASSISTANCE",
      inventory: "ON-FOOT FIELD INVENTORY [E]",
      harbor: "OCEAN PORT — BOAT DOCK & HOVERCRAFT SUMMON",
      players: "ONLINE PLAYERS — FRIENDS & CASH TRANSFER [TAB]"
    };
    document.getElementById("modal-title").textContent = titles[name] || "MENU";
    if (name === "garage") this.renderGarage();
    if (name === "contracts") this.renderContracts();
    if (name === "harbor") this.renderHarbor();
    if (name === "players") this.renderOnlinePlayers();
    if (name === "map") { if (this.mapCtrl) this.mapCtrl.open(); else this.renderMap(); }
    if (name === "field_repair") this.renderFieldRepair();
    if (name === "coop_pit") this.renderCoopPitCrew();
    if (name === "env") this.renderEnvControls();
    if (name === "account") this.renderAccountModal();
  }

  closeModal() {
    this.activeModal = null;
    document.getElementById("modal-overlay").classList.add("hidden");
  }

  // ==========================================================================
  // LIVE TOP COMPASS TAPE + ROTATING 1.6KM MINI-RADAR
  // ==========================================================================
  drawCompassAndRadar(game) {
    const ab = game.boats ? game.boats.activeBoat : null;
    const px = ab ? ab.gx : (game.onFoot ? game.playerFoot.x : game.vehicle.pos.x);
    const pz = ab ? ab.gz : (game.onFoot ? game.playerFoot.z : game.vehicle.pos.z);

    let headingDeg = 0;
    if (ab) {
      headingDeg = (Math.atan2(Math.sin(ab.yaw), -Math.cos(ab.yaw)) * 180 / Math.PI + 360) % 360;
    } else if (game.onFoot) {
      headingDeg = (Math.atan2(Math.sin(game.playerFoot.yaw), -Math.cos(game.playerFoot.yaw)) * 180 / Math.PI + 360) % 360;
    } else {
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(game.vehicle.quat);
      headingDeg = (Math.atan2(fwd.x, -fwd.z) * 180 / Math.PI + 360) % 360;
    }

    const cv = document.getElementById("compass-canvas");
    if (cv) {
      const ctx = cv.getContext("2d"), W = cv.width, H = cv.height;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(10, 16, 24, 0.84)";
      ctx.fillRect(0, 0, W, H);
      const fovDeg = 130, pxPerDeg = W / fovDeg;
      const startDeg = Math.floor((headingDeg - fovDeg * 0.5) / 5) * 5;
      const endDeg = Math.ceil((headingDeg + fovDeg * 0.5) / 5) * 5;
      const cardinals = { 0: "N", 45: "NE", 90: "E", 135: "SE", 180: "S", 225: "SW", 270: "W", 315: "NW" };
      ctx.textAlign = "center";

      for (let d = startDeg; d <= endDeg; d += 5) {
        const normD = ((d % 360) + 360) % 360;
        const screenX = W * 0.5 + (d - headingDeg) * pxPerDeg;
        const isCard = (normD % 45 === 0), isMajor = (normD % 15 === 0);
        ctx.strokeStyle = isCard ? "#ffd166" : (isMajor ? "#7b93ab" : "#3a4b5c");
        ctx.lineWidth = isCard ? 2 : 1;
        ctx.beginPath(); ctx.moveTo(screenX, H - 2); ctx.lineTo(screenX, H - (isCard ? 12 : (isMajor ? 9 : 5))); ctx.stroke();
        if (isCard) {
          ctx.fillStyle = normD === 0 ? "#ff5c77" : "#ffd166";
          ctx.font = "bold 12px monospace"; ctx.fillText(cardinals[normD], screenX, 14);
        } else if (isMajor) {
          ctx.fillStyle = "#9db4c9"; ctx.font = "10px monospace"; ctx.fillText(String(normD).padStart(3, "0"), screenX, 13);
        }
      }

      const plotMarker = (gx, gz, label, color, isDiamond = false) => {
        const dx = gx - px, dz = gz - pz, dist = Math.hypot(dx, dz);
        const targetDeg = (Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360;
        let diff = targetDeg - headingDeg;
        while (diff > 180) diff -= 360; while (diff < -180) diff += 360;
        const mx = W * 0.5 + Math.max(-fovDeg * 0.48, Math.min(fovDeg * 0.48, diff)) * pxPerDeg;
        ctx.fillStyle = color;
        if (isDiamond) {
          ctx.beginPath(); ctx.moveTo(mx, 17); ctx.lineTo(mx + 5, 23); ctx.lineTo(mx, 29); ctx.lineTo(mx - 5, 23); ctx.closePath(); ctx.fill();
        } else { ctx.beginPath(); ctx.arc(mx, 23, 3.5, 0, Math.PI * 2); ctx.fill(); }
        if (Math.abs(diff) < fovDeg * 0.46) {
          ctx.font = "bold 9.5px monospace";
          ctx.fillText(`${label} ${dist >= 1000 ? (dist / 1000).toFixed(1) + "k" : Math.round(dist) + "m"}`, mx, 39);
        }
      };

      const sortedTowns = KK.TOWNS.map((t) => ({ t, d: Math.hypot(t.x - px, t.z - pz) })).sort((a, b) => a.d - b.d).slice(0, 2);
      for (const item of sortedTowns) plotMarker(item.t.x, item.t.z, item.t.name.split(" ")[0], "#2de08b", false);
      const nearLm = KK.LANDMARKS.map((l) => ({ l, d: Math.hypot(l.x - px, l.z - pz) })).sort((a, b) => a.d - b.d)[0];
      if (nearLm && nearLm.d < 6500) plotMarker(nearLm.l.x, nearLm.l.z, "★" + nearLm.l.type.toUpperCase(), "#ffbe0b", true);
      if (KK.CLARKSON_FARM && Math.hypot(KK.CLARKSON_FARM.x - px, KK.CLARKSON_FARM.z - pz) < 4500) {
        plotMarker(KK.CLARKSON_FARM.x, KK.CLARKSON_FARM.z, "FARM", "#80ed99", false);
      }
      if (KK.JAMES_MAY_BAR && Math.hypot(KK.JAMES_MAY_BAR.x - px, KK.JAMES_MAY_BAR.z - pz) < 4500) {
        plotMarker(KK.JAMES_MAY_BAR.x, KK.JAMES_MAY_BAR.z, "PUB", "#ffb703", false);
      }
      if (KK.HAMMOND_MESA && Math.hypot(KK.HAMMOND_MESA.x - px, KK.HAMMOND_MESA.z - pz) < 5500) {
        plotMarker(KK.HAMMOND_MESA.x, KK.HAMMOND_MESA.z, "MESA", "#f4a261", false);
      }
      for (const rp of game.network.remotePlayers.values()) plotMarker(rp.gx, rp.gz, rp.callsign, "#ffd166", false);
      if (game.waypoint) plotMarker(game.waypoint.x, game.waypoint.z, "GPS", "#00f5d4", true);

      ctx.fillStyle = "#ff4d6d";
      ctx.beginPath(); ctx.moveTo(W * 0.5, 2); ctx.lineTo(W * 0.5 - 5, 9); ctx.lineTo(W * 0.5 + 5, 9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(10,16,24,0.92)"; ctx.fillRect(W * 0.5 - 22, H - 15, 44, 14);
      ctx.fillStyle = "#ffffff"; ctx.font = "bold 11px monospace";
      ctx.fillText(String(Math.round(headingDeg)).padStart(3, "0") + "°", W * 0.5, H - 4);
    }

    const rcv = document.getElementById("mini-radar-canvas");
    if (rcv) {
      const rctx = rcv.getContext("2d"), RW = rcv.width, RH = rcv.height;
      const cx = RW * 0.5, cy = RH * 0.5, R = RW * 0.46, radarRange = 1600, headRad = (headingDeg * Math.PI) / 180;
      rctx.clearRect(0, 0, RW, RH); rctx.save();
      rctx.beginPath(); rctx.arc(cx, cy, R, 0, Math.PI * 2); rctx.clip();
      rctx.fillStyle = "rgba(11, 18, 25, 0.88)"; rctx.fillRect(0, 0, RW, RH);
      rctx.strokeStyle = "rgba(120, 160, 195, 0.16)"; rctx.lineWidth = 1;
      rctx.beginPath(); rctx.arc(cx, cy, R * 0.5, 0, Math.PI * 2); rctx.stroke();

      const worldToRadar = (gx, gz) => {
        const dx = gx - px, dz = gz - pz, cosH = Math.cos(headRad), sinH = Math.sin(headRad);
        return [cx + ((dx * cosH + dz * sinH) / radarRange) * R, cy + ((-dx * sinH + dz * cosH) / radarRange) * R];
      };
      // Draw Great Krasnaya Continuous Canyon River on Mini-Radar!
      if (game.world.riverSegments && game.world.riverSegments.length > 0) {
        rctx.strokeStyle = "rgba(36, 148, 198, 0.85)";
        rctx.lineWidth = 5.5;
        rctx.lineCap = "round";
        rctx.beginPath();
        for (const rs of game.world.riverSegments) {
          if (Math.hypot(rs.x0 - px, rs.z0 - pz) > radarRange + 1200 && Math.hypot(rs.x1 - px, rs.z1 - pz) > radarRange + 1200) continue;
          const [x0, y0] = worldToRadar(rs.x0, rs.z0), [x1, y1] = worldToRadar(rs.x1, rs.z1);
          rctx.moveTo(x0, y0); rctx.lineTo(x1, y1);
        }
        rctx.stroke();
      }
      rctx.fillStyle = "rgba(38, 130, 175, 0.55)";
      for (const rv of KK.RIVERS) {
        if (Math.hypot(rv.x - px, rv.z - pz) > radarRange + rv.rx) continue;
        const [rx, ry] = worldToRadar(rv.x, rv.z);
        rctx.beginPath(); rctx.arc(rx, ry, Math.max(4, (rv.rx / radarRange) * R), 0, Math.PI * 2); rctx.fill();
      }
      rctx.strokeStyle = "#b89f78"; rctx.lineWidth = 2.4; rctx.beginPath();
      for (const seg of game.world.roadSegments) {
        if (Math.hypot(seg.x0 - px, seg.z0 - pz) > radarRange + 1000 && Math.hypot(seg.x1 - px, seg.z1 - pz) > radarRange + 1000) continue;
        const [x0, y0] = worldToRadar(seg.x0, seg.z0), [x1, y1] = worldToRadar(seg.x1, seg.z1);
        rctx.moveTo(x0, y0); rctx.lineTo(x1, y1);
      }
      rctx.stroke();
      if (KK.RIVER_FORDS) {
        for (const fd of KK.RIVER_FORDS) {
          if (Math.hypot(fd.x - px, fd.z - pz) > radarRange) continue;
          const [fx, fy] = worldToRadar(fd.x, fd.z);
          rctx.fillStyle = "#48cae4"; rctx.beginPath(); rctx.arc(fx, fy, 3.6, 0, Math.PI * 2); rctx.fill();
        }
      }
      for (const br of KK.BRIDGES) {
        if (Math.hypot(br.x - px, br.z - pz) > radarRange) continue;
        const [bx, by] = worldToRadar(br.x, br.z); rctx.fillStyle = "#ff9f1c"; rctx.fillRect(bx - 3, by - 3, 6, 6);
      }
      for (const tw of KK.TOWNS) {
        if (Math.hypot(tw.x - px, tw.z - pz) > radarRange) continue;
        const [tx, ty] = worldToRadar(tw.x, tw.z); rctx.fillStyle = "#2de08b"; rctx.beginPath(); rctx.arc(tx, ty, 4.2, 0, Math.PI * 2); rctx.fill();
      }
        if (KK.CLARKSON_FARM && Math.hypot(KK.CLARKSON_FARM.x - px, KK.CLARKSON_FARM.z - pz) < radarRange) {
        const [cfx, cfy] = worldToRadar(KK.CLARKSON_FARM.x, KK.CLARKSON_FARM.z);
        rctx.fillStyle = "#80ed99"; rctx.beginPath(); rctx.arc(cfx, cfy, 5.2, 0, Math.PI * 2); rctx.fill();
      }
      if (KK.JAMES_MAY_BAR && Math.hypot(KK.JAMES_MAY_BAR.x - px, KK.JAMES_MAY_BAR.z - pz) < radarRange) {
        const [jbx, jby] = worldToRadar(KK.JAMES_MAY_BAR.x, KK.JAMES_MAY_BAR.z);
        rctx.fillStyle = "#ffb703"; rctx.beginPath(); rctx.arc(jbx, jby, 4.8, 0, Math.PI * 2); rctx.fill();
      }
      for (const lm of KK.LANDMARKS) {
        if (Math.hypot(lm.x - px, lm.z - pz) > radarRange) continue;
        const [lx, ly] = worldToRadar(lm.x, lm.z); rctx.fillStyle = "#ffbe0b"; rctx.beginPath(); rctx.arc(lx, ly, 4.0, 0, Math.PI * 2); rctx.fill();
      }
      if (game.waypoint) {
        let [wx, wy] = worldToRadar(game.waypoint.x, game.waypoint.z);
        const dCenter = Math.hypot(wx - cx, wy - cy);
        if (dCenter > R - 6) { wx = cx + ((wx - cx) / dCenter) * (R - 6); wy = cy + ((wy - cy) / dCenter) * (R - 6); }
        const flOn = (game.radarFlashTimer > 0) && (Math.floor(game.radarFlashTimer * 5) % 2 === 0);
        rctx.fillStyle = flOn ? "#ffffff" : "#a855f7";
        rctx.beginPath(); rctx.arc(wx, wy, flOn ? 7.0 : 5.2, 0, Math.PI * 2); rctx.fill();
        rctx.strokeStyle = "#c084fc"; rctx.lineWidth = flOn ? 2.5 : 1.4; rctx.stroke();
      }
      const [nx, ny] = worldToRadar(px, pz - radarRange * 0.88);
      rctx.fillStyle = "#ff5c77"; rctx.font = "bold 10px monospace"; rctx.textAlign = "center"; rctx.fillText("N", nx, ny + 3);
      rctx.fillStyle = "#ffffff"; rctx.beginPath();
      rctx.moveTo(cx, cy - 6); rctx.lineTo(cx + 4.5, cy + 5); rctx.lineTo(cx, cy + 2.5); rctx.lineTo(cx - 4.5, cy + 5); rctx.closePath(); rctx.fill();
      rctx.restore();
      const ringFlash = (game.radarFlashTimer > 0) && (Math.floor(game.radarFlashTimer * 5) % 2 === 0);
      rctx.strokeStyle = ringFlash ? "#a855f7" : "rgba(0, 229, 255, 0.45)";
      rctx.lineWidth = ringFlash ? 4.5 : 2;
      rctx.beginPath(); rctx.arc(cx, cy, R, 0, Math.PI * 2); rctx.stroke();
    }
  }

  // ==========================================================================
  // HELPER: RENDER CPM2 BRANDED PART ROW WITH WEAR BAR & 5-BRAND SELECTOR
  // ==========================================================================
  _renderPartRow(partId, vs) {
    const def = KK.PARTS_CATALOG[partId];
    const cur = vs.parts[partId];
    const br = KK.BRANDS[cur.brand] || KK.BRANDS.volgaworks;
    const hp = Math.max(0, Math.min(100, cur.hp));
    const col = hp < 30 ? "#ef476f" : (hp < 65 ? "#ffd166" : "#06d6a0");
    const repairCost = Math.ceil((100 - hp) * (def.basePrice * 0.008));

    const brandButtons = KK.BRAND_ORDER.map((bid) => {
      const b = KK.BRANDS[bid];
      const price = KK.getPartPrice(partId, bid);
      const isCur = (cur.brand === bid);
      return `<button class="brand-btn ${isCur ? "current" : ""}" style="border-color:${b.color};color:${isCur ? "#fff" : b.color};background:${isCur ? b.color + "33" : "#111922"}"
        title="${b.name}: Perf ${Math.round(b.perfMult * 100)}% | Wear ${b.wearMult}x | ${b.desc}"
        onclick="window.__GAME__.installBrandedPart('${partId}','${bid}')">
        ${b.short} $${price.toLocaleString()}
      </button>`;
    }).join("");

    return `
      <div class="part-card">
        <div class="part-top">
          <div>
            <b>${def.name}</b>
            <span class="brand-tag" style="border-color:${br.color};color:${br.color};">${br.name}</span>
            <div class="small muted">${def.effect}</div>
          </div>
          <div class="part-hp-wrap">
            <div class="bar-bg" style="width:110px;"><div class="bar-fill" style="width:${hp}%;background:${col}"></div></div>
            <b style="color:${col};font-family:monospace;font-size:12px;">${hp.toFixed(0)}%</b>
            ${hp < 99 ? `<button class="btn small primary" onclick="window.__GAME__.repairSinglePart('${partId}', ${repairCost})">FIX $${repairCost}</button>` : ""}
          </div>
        </div>
        <div class="brand-row">${brandButtons}</div>
      </div>`;
  }

  _renderBrandLegend() {
    return `<div class="brand-legend">
      ${KK.BRAND_ORDER.map((bid) => {
        const b = KK.BRANDS[bid];
        return `<span class="legend-chip" style="border-color:${b.color};color:${b.color};" title="${b.desc}">
          <b>${b.short}</b> (${Math.round(b.perfMult * 100)}% Perf / ${b.wearMult}x Wear)
        </span>`;
      }).join("")}
    </div>`;
  }

  // ==========================================================================
  // REVAMPED CPM2 GARAGE: FLEET | ENGINE | TRANSMISSION | SUSPENSION
  // ==========================================================================
  renderGarage() {
    const body = document.getElementById("garage-content");
    if (!body) return;
    const g = this.game, vs = KK.ensurePartsInitialized(g.vehicle.vState), spec = KK.VEHICLES[vs.vehicleId];
    document.getElementById("garage-cash").textContent = "$" + Math.floor(g.money).toLocaleString();

    // Calculate quick full-service repair & fuel costs
    let totalRepairCost = Math.ceil(vs.health.mudClog * 2 + Math.abs(vs.health.tieRodBias) * 900 + (100 - vs.health.body) * 4 + (100 - vs.health.tires) * 5);
    for (const pid of Object.keys(KK.PARTS_CATALOG)) {
      totalRepairCost += Math.ceil((100 - vs.parts[pid].hp) * (KK.PARTS_CATALOG[pid].basePrice * 0.008));
    }
    const fuelCost = Math.ceil(Math.max(0, spec.fuelCapacity - vs.fuel) * 3.5);
    const dirtPct = Math.round((vs.dirtLevel || 0) * 100);

    // 1. MANUFACTURER DEALERSHIP, PERSONAL GARAGE & CAR WASH TAB
    if (this.garageTab === "fleet") {
      const sb = this.selectedBrand;
      const renderVehicleCard = (vid) => {
        const s = KK.VEHICLES[vid], owned = !!g.ownedVehicles[vid], active = (vs.vehicleId === vid);
        const eng = KK.ENGINES[s.stockEngineId];
        const ownedState = g.ownedVehicles[vid];
        const installedEng = ownedState ? (KK.ENGINES[ownedState.engineId] || eng) : eng;
        const mfr = KK.MANUFACTURERS[s.brand];
        return `<div class="card ${active ? "selected" : ""}">
          <div class="card-head">
            <div style="display:flex;align-items:center;gap:7px;">
              ${mfr ? `<span class="mini-brand-logo">${mfr.logoSvg}</span>` : ""}
              <strong>${s.name}</strong>
            </div>
            <span class="badge">${s.category}</span>
          </div>
          <p class="small muted">${s.desc}</p>
          <div class="stat-row"><span>Engine: <b style="color:#00e5ff;">${installedEng.layout}</b></span></div>
          <div class="stat-row"><span>Power: <b>${installedEng.stockHp} HP / ${installedEng.baseTorqueNm} Nm</b></span><span>Steer: <b>${s.maxSteerDeg}°</b></span></div>
          <div class="stat-row"><span>Susp: <b style="color:#ffd166;">${s.suspensionType.split("(")[0].trim()}</b></span></div>
          <div class="stat-row"><span>Mass: <b>${s.massKg} kg</b></span><span>Bed: <b>${s.cargoSlots}</b></span><span>Gears: <b>${s.defaultGears.length}-Spd</b></span></div>
          <div class="card-actions">${active ? `<span class="tag-ok">ACTIVE RIG</span>` : (owned
            ? `<button class="btn primary" onclick="window.__GAME__.switchVehicle('${vid}')">SELECT RIG</button>`
            : `<button class="btn accent" onclick="window.__GAME__.buyVehicle('${vid}')">BUY $${s.price.toLocaleString()}</button>`)}</div></div>`;
      };

      const hlL = Math.round(vs.health.headlightL ?? 100);
      const hlR = Math.round(vs.health.headlightR ?? 100);

      let html = `
        <div class="service-bar">
          <div class="paint-inline">
            <label><b>Paint:</b></label>
            <input type="color" value="${vs.paintColor}" onchange="window.__GAME__.setPaintColor(this.value)" />
            <select style="margin-left:8px;padding:4px 6px;background:#101820;color:#e2e8f0;border:1px solid #334155;border-radius:5px;font-size:11px;" onchange="window.__GAME__.setRimStyle(this.value)">
              ${Object.values(KK.RIM_STYLES || {}).map(r => `<option value="${r.id}" ${(vs.rimStyle || (KK.getDefaultRimStyle ? KK.getDefaultRimStyle(vs.vehicleId) : "sport5")) === r.id ? "selected" : ""}>Rims: ${r.name}</option>`).join("")}
            </select>
            <label style="margin-left:8px;font-size:11px;color:#94a3b8;">Rim <input type="color" value="${vs.rimColor || "#c8d0d8"}" onchange="window.__GAME__.setRimColor(this.value)" style="width:26px;height:20px;vertical-align:middle;" /></label>
            <label style="margin-left:6px;font-size:11px;color:#94a3b8;">Caliper <input type="color" value="${vs.caliperColor || "#d92626"}" onchange="window.__GAME__.setCaliperColor(this.value)" style="width:26px;height:20px;vertical-align:middle;" /></label>
          </div>
          <button class="btn primary small" onclick="window.__GAME__.washVehicle()">WASH (${dirtPct}% — $50)</button>
          <button class="btn accent small" onclick="window.__GAME__.garageFullRepair(${totalRepairCost})">OVERHAUL ALL + LIGHTS ($${totalRepairCost.toLocaleString()})</button>
          <button class="btn small" onclick="window.__GAME__.garageRefuel(${fuelCost})">REFUEL ${vs.fuel.toFixed(0)}/${spec.fuelCapacity}L ($${fuelCost})</button>
          <button class="btn small" onclick="window.__GAME__.garageRestockTires()">TIRES &amp; SPARES (${vs.spareTires || 0} — $300)</button>
          ${(g.ownedVehicles.t72 || g.ownedVehicles.bm21 || g.ownedVehicles.shilka || g.ownedVehicles.pzkpfw_140a4 || g.ownedVehicles.harimau || g.ownedVehicles.komodo_std || g.ownedVehicles.komodo_turret || g.ownedVehicles.btr80) ? `<button class="btn primary small" onclick="window.__GAME__.resupplyTankAmmo()">💣 RESUPPLY ORDNANCE ${g.vehicle.vState.vehicleId === "pzkpfw_140a4" ? "(FREE)" : "($1,800)"}</button>` : ""}
          <span class="small muted">Headlights L:${hlL}% R:${hlR}%</span>
        </div>
        <div class="sub-tabs" style="margin-bottom:10px;">
          <button class="sub-tab-btn ${sb === null ? "active" : ""}" onclick="window.__GAME__.ui.selectedBrand=null; window.__GAME__.ui.renderGarage();">🏢 BRAND DEALERSHIPS</button>
          <button class="sub-tab-btn ${sb === "owned" ? "active" : ""}" onclick="window.__GAME__.ui.selectedBrand='owned'; window.__GAME__.ui.renderGarage();">🔑 MY GARAGE (${Object.keys(g.ownedVehicles).length})</button>
          <button class="sub-tab-btn ${sb === "all" ? "active" : ""}" onclick="window.__GAME__.ui.selectedBrand='all'; window.__GAME__.ui.renderGarage();">🚘 ALL ${Object.keys(KK.VEHICLES).length} VEHICLES</button>
          ${sb && sb !== "owned" && sb !== "all" && KK.MANUFACTURERS[sb] ? `<span class="badge" style="margin-left:auto;">SHOWROOM: ${KK.MANUFACTURERS[sb].name.toUpperCase()}</span>` : ""}
        </div>`;

      if (sb === null) {
        // Clickable Manufacturer Brand Cards with Custom SVG Logos!
        html += `<div class="brand-dealer-grid">`;
        for (const bid of Object.keys(KK.MANUFACTURERS)) {
          const m = KK.MANUFACTURERS[bid];
          const models = Object.values(KK.VEHICLES).filter((v) => v.brand === bid && (!v.secretUnlock || !!g.ownedVehicles[v.id]));
          if (m.secretOnly && models.length === 0) continue;
          const ownedCnt = models.filter((v) => !!g.ownedVehicles[v.id]).length;
          html += `
            <div class="brand-dealer-card" style="border-color:${m.color}66;" onclick="window.__GAME__.ui.selectedBrand='${bid}'; window.__GAME__.ui.renderGarage();">
              <div class="brand-logo-wrap">${m.logoSvg}</div>
              <div class="brand-dealer-name">${m.name}</div>
              <div class="small muted">${m.country} • ${models.length} model${models.length > 1 ? "s" : ""}</div>
              <div class="small" style="color:${m.color};margin-top:2px;">${m.tagline}</div>
              ${ownedCnt > 0 ? `<span class="tag-ok" style="margin-top:4px;">${ownedCnt} OWNED</span>` : ""}
            </div>`;
        }
        html += `</div>`;
      } else {
        const list = Object.keys(KK.VEHICLES).filter((vid) => {
          const vDef = KK.VEHICLES[vid];
          if (vDef.secretUnlock && !g.ownedVehicles[vid]) return false;
          if (sb === "all") return true;
          if (sb === "owned") return !!g.ownedVehicles[vid];
          return vDef.brand === sb;
        });
        html += `<div class="fleet-grid">` + list.map(renderVehicleCard).join("") + `</div>`;
      }
      body.innerHTML = html;
      return;
    }

    // 2. INTERACTIVE 2D CAR BLUEPRINT & MODULE WORKBENCH TAB
    if (this.garageTab === "blueprint" || this.garageTab === "engine" || this.garageTab === "transmission" || this.garageTab === "suspension") {
      if (this.garageTab !== "blueprint") this.garageTab = "blueprint";
      body.innerHTML = KK.GarageBlueprint.renderWorkbench(this, vs, spec, totalRepairCost, fuelCost);
      return;
    }

    // 3. UNIFIED TUNING STUDIO, LIVE DYNO & 1-CLICK PRESETS TAB
    if (this.garageTab === "tuning") {
      body.innerHTML = KK.GarageBlueprint.renderTuningStudio(this, vs, spec);
      this.drawDynoChart();
      return;
    }
  }

  selectBlueprintModule(modId) {
    this.selectedModuleId = modId;
    this.renderGarage();
  }

  drawDynoChart() {
    const cv = document.getElementById("dyno-canvas");
    if (!cv) return;
    const ctx = cv.getContext("2d"), w = cv.width, h = cv.height;
    ctx.fillStyle = "#0e141b"; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#1f2c3a"; ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += 35) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    const vs = this.game.vehicle.vState, eng = KK.ENGINES[vs.engineId];
    const maxB = (vs.upgrades.turboKit || vs.upgrades.twinTurboKit) ? vs.tuning.boostPsi : (eng.stockTurbo ? Math.min(eng.stockBoostPsi || 14, vs.tuning.boostPsi) : 0);
    const probe = KK.computeEngineOutput(vs, eng.idleRpm, 1.0, 0);
    const effRed = probe.redline;

    let peakHp = 0, peakTq = 0; const ptsHp = [], ptsTq = [];
    for (let i = 0; i <= 45; i++) {
      const rpm = eng.idleRpm + (i / 45) * (effRed - eng.idleRpm);
      const spool = Math.min(1, Math.max(0, (rpm - eng.idleRpm * 1.2) / (effRed * 0.4)));
      const out = KK.computeEngineOutput(vs, rpm, 1.0, maxB * spool);
      if (out.hp > peakHp) peakHp = out.hp;
      if (out.torqueNm > peakTq) peakTq = out.torqueNm;
      ptsHp.push(out.hp); ptsTq.push(out.torqueNm);
    }
    const maxScale = Math.max(300, Math.ceil(Math.max(peakHp, peakTq) / 100) * 100 + 80);
    const drawCurve = (arr, color) => {
      ctx.strokeStyle = color; ctx.lineWidth = 2.6; ctx.beginPath();
      for (let i = 0; i < arr.length; i++) {
        const px = 12 + (i / (arr.length - 1)) * (w - 24), py = h - 20 - (arr[i] / maxScale) * (h - 40);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    };
    drawCurve(ptsTq, "#ffb703"); drawCurve(ptsHp, "#00e5ff");
    ctx.fillStyle = "#00e5ff"; ctx.font = "bold 12px monospace"; ctx.fillText(`PEAK: ${Math.round(peakHp)} HP`, 12, 16);
    ctx.fillStyle = "#ffb703"; ctx.fillText(`TORQUE: ${Math.round(peakTq)} Nm`, 145, 16);
    ctx.fillStyle = "#8a9bae"; ctx.font = "10.5px monospace";
    ctx.fillText(`${eng.idleRpm} RPM`, 10, h - 5); ctx.fillText(`REDLINE ${effRed} RPM`, w - 122, h - 5);
  }

  // ==========================================================================
  // PERSISTENT ACCOUNTS & LAN LEADERBOARD MODAL
  // ==========================================================================
  async renderAccountModal() {
    const el = document.getElementById("account-content");
    if (!el) return;
    const g = this.game;
    const acc = g.account;
    const loggedIn = !!(acc && acc.username);

    el.innerHTML = `
      <div class="two-col">
        <div>
          <h4>${loggedIn ? "LOGGED IN DRIVER PROFILE" : "LOGIN OR REGISTER ACCOUNT"}</h4>
          <div class="info-box" style="margin-bottom:10px;">
            ${loggedIn
              ? `<div><b>Account:</b> <span style="color:#2de08b;">${acc.username}</span></div>
                 <div><b>Balance:</b> $${Math.floor(g.money).toLocaleString()}</div>
                 <div><b>Deliveries Completed:</b> ${g.stats.deliveries}</div>
                 <div><b>Odometer:</b> ${g.stats.distanceKm.toFixed(1)} km</div>
                 <div class="small muted" style="margin-top:4px;">Progress auto-saves to server <code>accounts.json</code> &amp; browser!</div>
                 <div class="btn-row" style="margin-top:10px;">
                   <button class="btn primary small" onclick="window.__GAME__.syncAccountSave(true)">SAVE PROFILE</button>${(acc && acc.isDev) ? `<button class="btn accent small" onclick="window.__GAME__.grantDevTestFunds()">DEV +$2,000,000</button>` : ""}
                   <button class="btn warn small" onclick="window.__GAME__.logoutAccount()">SWITCH / LOGOUT</button>
                 </div>
                 <div style="margin-top:12px;padding-top:10px;border-top:1px solid #2a3a4d;">
                   <b class="small" style="color:#ffd166;">CHANGE ACCOUNT PASSWORD / PIN</b>
                   <div style="display:flex;gap:6px;margin-top:6px;">
                     <input id="acc-old-pin" class="admin-search" type="password" placeholder="Current PIN" style="margin:0;" />
                     <input id="acc-new-pin" class="admin-search" type="password" placeholder="New PIN" style="margin:0;" />
                     <button class="btn accent small" onclick="window.__GAME__.submitChangePassword()">UPDATE</button>
                   </div>
                   <div id="acc-pw-msg" class="small" style="color:#2de08b;margin-top:4px;"></div>
                 </div>
                 ${(acc && acc.username && acc.username.toLowerCase() === "silver" && !acc.isDev) ? `
                   <div style="margin-top:10px;padding-top:10px;border-top:1px solid #4a2328;">
                     <b class="small" style="color:#ff6b6b;">DEV AUTHORIZATION (SILVER ONLY)</b>
                     <div style="display:flex;gap:6px;margin-top:6px;">
                       <input id="acc-dev-key" class="admin-search" type="password" placeholder="Enter Secret Dev Key" style="margin:0;" />
                       <button class="btn warn small" onclick="window.__GAME__.submitClaimDev()">UNLOCK DEV</button>
                     </div>
                     <div id="acc-dev-msg" class="small" style="color:#ffd166;margin-top:4px;"></div>
                   </div>` : ""}`
              : `<p class="small muted" style="margin-bottom:8px;">Register or Login to save your cash balance, garage fleet, and branded CPM2 parts persistently on the LAN host server (<code>accounts.json</code>)!</p>
                 <div class="slider-group"><label>Driver Username:</label>
                   <input id="acc-user-in" class="text-in" type="text" placeholder="e.g. ComradeDrift" value="${g.network.callsign}" /></div>
                 <div class="slider-group"><label>4+ Char PIN / Password:</label>
                   <input id="acc-pin-in" class="text-in" type="password" placeholder="e.g. 1234" /></div>
                 <div id="acc-err-msg" class="small" style="color:#ff5c77;margin-bottom:8px;"></div>
                 <div class="btn-row">
                   <button class="btn primary" onclick="window.__GAME__.submitAccountAuth('login')">LOGIN ACCOUNT</button>
                   <button class="btn accent" onclick="window.__GAME__.submitAccountAuth('register')">REGISTER NEW ACCOUNT</button>
                 </div>`}
          </div>
        </div>
        <div>
          <h4>BROWSER DRIVER LEADERBOARD</h4>
          <div id="leaderboard-box" class="upgrade-list"><span class="small muted">Loading local leaderboard...</span></div>
        </div>
      </div>`;

    const lb = await g.network.fetchLeaderboard();
    const box = document.getElementById("leaderboard-box");
    if (!box) return;
    if (!lb.ok || !lb.drivers || lb.drivers.length === 0) {
      box.innerHTML = `<div class="small muted">No registered server accounts yet — register yours on the left to claim #1!</div>`;
      return;
    }
    box.innerHTML = lb.drivers.map((d, idx) => `
      <div class="upg-row ${loggedIn && d.username.toLowerCase() === acc.username.toLowerCase() ? "installed" : ""}">
        <div>
          <b>#${idx + 1} ${d.username}</b>
          <div class="small muted">${d.deliveries} deliveries • ${d.distanceKm} km • ${d.carsOwned} car(s)</div>
        </div>
        <b style="color:#6be89b;font-family:monospace;">$${d.money.toLocaleString()}</b>
      </div>`).join("");
  }

  // ==========================================================================
  // CONTRACTS, MAP, FIELD REPAIR, ENV CONTROLS
  // ==========================================================================
  generateContracts() {
    this.availableContracts = [
      { id: "starter_bridge", title: "Devil's Bridge Test Haul (Starter)", fromTown: 0, toTown: 1, cargoType: "standard", units: 2, reward: 5200, desc: "Haul 2 crates 1.4 km East across the rickety wooden ravine bridge. Watch weight & speed!" },
      { id: "rzhavsk_drums", title: "Flooded Basin Diesel Run", fromTown: 0, toTown: 2, cargoType: "fuel_drums", units: 3, reward: 15500, desc: "Heavy diesel drums to Rzhavsk Depot across Kamenka Creek Ford. Bring a Snorkel!" },
      { id: "klyuchi_fragile", title: "Razorback Seismograph Precision Run", fromTown: 0, toTown: 5, cargoType: "fragile", units: 2, reward: 31000, desc: "Ultra-fragile lab instruments up sheer cliff switchbacks. Every pothole slam cuts payout!" },
      { id: "gorge_med_sprint", title: "Rally Express Medical Sprint — Gorge", fromTown: 0, toTown: 3, cargoType: "medical", units: 2, reward: 26000, desc: "Perfect for WRX STI / Evo IX / Range Rover — high-speed medical sprint across Krasny Gorge!" },
      { id: "taiga_timber_gen", title: "Heavy Generator Expedition — Black Timber", fromTown: 1, toTown: 4, cargoType: "generator", units: 4, reward: 38000, desc: "Massive multi-ton generator haul through knee-deep mud bogs & deer-infested taiga." },
      { id: "volchya_extreme", title: "45km Extreme Frontier Run — Volchya Outpost", fromTown: 0, toTown: 7, cargoType: "generator", units: 3, reward: 62000, desc: "True long-haul 100km-scale Slavic madness across rivers, mud, and mountain passes." },
      { id: "taiga_log_haul", title: "Heavy Timber Log Run (Requires Log Trailer or KamAZ)", fromTown: 1, toTown: 0, cargoType: "logs", units: 4, reward: 22500, desc: "Haul giant felled pine logs out of Siren Head forest! Buy/hitch a Log Trailer below OR drive a KamAZ-4310!" },
      { id: "vulkan_log_expedition", title: "Volcanic Geothermal Timber & Drill Haul (T-Rex Zone)", fromTown: 0, toTown: 9, cargoType: "logs", units: 4, reward: 34000, desc: "Deliver massive support logs into smoking Mt. Vulkan Caldera! Requires Log Trailer or KamAZ." },
      { id: "james_beer_run", title: "Captain Slow's Craft Beer Run (To James May's Pub)", fromTown: 0, toTown: 0, toBar: true, cargoType: "beer", units: 3, reward: 7800, desc: "Haul 3 kegs of cold craft ale 1.3 km West from Kamenka HQ to James May's Pub! Smooth driving keeps the beer intact." },
      { id: "james_beer_long", title: "Alpine Oktoberfest Keg Convoy (Cherny Les -> James May's Pub)", fromTown: 4, toTown: 0, toBar: true, cargoType: "beer", units: 5, reward: 32500, desc: "Long-haul 25 km beer convoy across forests & bridges to resupply Captain Slow's Pub!" }
    ];
  }

  renderOnlinePlayers() {
    const el = document.getElementById("players-content");
    if (!el) return;
    const g = this.game;
    const net = g.network;
    const friends = g.friendsList || {};
    const myX = g.onFoot ? g.playerFoot.x : g.vehicle.pos.x;
    const myZ = g.onFoot ? g.playerFoot.z : g.vehicle.pos.z;
    const myRig = (KK.VEHICLES[g.activeVehicleId] && KK.VEHICLES[g.activeVehicleId].name) || g.activeVehicleId;
    const myBiome = g.world ? g.world.getBiomeName(myX, myZ) : "Oblast";

    // Merge roster + remotePlayers so every connected driver appears cleanly!
    const peerMap = new Map();
    if (net && Array.isArray(net.roster)) {
      for (const r of net.roster) {
        if (!r || !r.peerId || r.peerId === net.peerId) continue;
        peerMap.set(r.peerId, { peerId: r.peerId, callsign: r.callsign || r.peerId, isHost: !!r.isHost, rp: null });
      }
    }
    if (net && net.remotePlayers) {
      for (const [pid, rp] of net.remotePlayers.entries()) {
        const cur = peerMap.get(pid) || { peerId: pid, callsign: rp.callsign || pid, isHost: false, rp: null };
        cur.callsign = rp.callsign || cur.callsign;
        cur.rp = rp;
        peerMap.set(pid, cur);
      }
    }

    const totalOnline = 1 + peerMap.size;
    const roomBadge = (net && net.mode !== "offline")
      ? `<span style="padding:2px 8px;border-radius:4px;background:#163d2d;color:#2de08b;font-family:monospace;font-size:11px;font-weight:800;">ONLINE • ROOM ${net.roomCode || "LIVE"} (${totalOnline} DRIVER${totalOnline === 1 ? "" : "S"})</span>`
      : `<span style="padding:2px 8px;border-radius:4px;background:#3a2818;color:#ffd166;font-family:monospace;font-size:11px;font-weight:800;">OFFLINE SOLO — JOIN OR HOST IN [O] OPTIONS</span>`;

    const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

    // Row 0: Local Player (YOU)
    let rowsHtml = `
      <div class="card" style="padding:10px 12px;border:1px solid #2de08b88;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
        <div>
          <b style="font-size:15px;color:#2de08b;">${esc((net && net.callsign) || "YOU")}</b>
          <span style="margin-left:6px;padding:1px 6px;border-radius:4px;background:#2de08b;color:#081016;font-size:10px;font-weight:900;">YOU</span>
          ${net && net.isHost ? '<span style="margin-left:4px;padding:1px 6px;border-radius:4px;background:#ffd166;color:#081016;font-size:10px;font-weight:900;">HOST</span>' : ""}
          <div class="small muted" style="margin-top:3px;">${esc(myRig)} &nbsp;•&nbsp; ${esc(myBiome)}</div>
        </div>
        <div style="font-family:monospace;font-size:15px;font-weight:800;color:#2de08b;">$${Math.floor(g.money).toLocaleString()}</div>
      </div>`;

    if (peerMap.size === 0) {
      rowsHtml += `
        <div class="card" style="padding:16px;text-align:center;color:#9ab0c4;border:1px dashed #2b3e52;margin-bottom:10px;">
          No other drivers connected right now. Share your Room Code from <b>[O] Options</b> so friends can join!
        </div>`;
    } else {
      for (const p of peerMap.values()) {
        const rp = p.rp;
        const safePid = esc(p.peerId);
        const safeCs  = esc(p.callsign);
        const fKey    = String(p.callsign || p.peerId).trim().toLowerCase();
        const isFr    = !!friends[fKey];
        const vName   = rp ? ((KK.VEHICLES[rp.vehicleId] && KK.VEHICLES[rp.vehicleId].name) || rp.vehicleId) : "Connecting...";
        const boatTag = (rp && rp.boat && KK.BOATS && KK.BOATS[rp.boat.id]) ? ` • ⚓ ${KK.BOATS[rp.boat.id].name}` : "";
        const distM   = rp ? Math.hypot(rp.gx - myX, rp.gz - myZ) : null;
        const distTxt = distM !== null ? (distM >= 1000 ? `${(distM / 1000).toFixed(1)} km away` : `${Math.round(distM)} m away`) : "Syncing...";
        const locTxt  = (rp && g.world) ? g.world.getBiomeName(rp.gx, rp.gz) : "";
        const inpId   = "cash-amt-" + p.peerId.replace(/[^a-zA-Z0-9_-]/g, "");

        rowsHtml += `
          <div class="card" style="padding:10px 12px;border:1px solid ${isFr ? '#ffd166' : '#2b3e52'};margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
            <div style="min-width:210px;flex:1;">
              <b style="font-size:15px;color:#f0f6fc;">${safeCs}</b>
              ${p.isHost ? '<span style="margin-left:5px;padding:1px 6px;border-radius:4px;background:#ffd166;color:#081016;font-size:10px;font-weight:900;">HOST</span>' : ""}
              ${isFr ? '<span style="margin-left:5px;padding:1px 6px;border-radius:4px;background:#2b4a2f;color:#80ed99;font-size:10px;font-weight:800;">★ FRIEND</span>' : ""}
              <div class="small muted" style="margin-top:3px;">${esc(vName)}${esc(boatTag)}</div>
              <div class="small" style="color:#80faff;margin-top:2px;">${distTxt}${locTxt ? " • " + esc(locTxt) : ""}</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
              <button class="btn small ${isFr ? 'warn' : 'accent'}" onclick="window.__GAME__.toggleFriend('${safePid}', '${safeCs}')">
                ${isFr ? '★ UNFRIEND' : '+ ADD FRIEND'}
              </button>
              <div style="display:flex;align-items:center;gap:4px;background:#0d1620;padding:4px 6px;border-radius:6px;border:1px solid #26394d;">
                <span class="small" style="color:#ffd166;font-weight:800;">$</span>
                <input id="${inpId}" type="number" min="1000" step="500" value="1000" style="width:78px;background:#142230;color:#f0f6fc;border:1px solid #304963;border-radius:4px;padding:3px 5px;font-family:monospace;font-size:12px;" />
                <button class="btn primary small" onclick="window.__GAME__.sendCashToPeer('${safePid}', '${safeCs}', document.getElementById('${inpId}').value)">SEND</button>
                <button class="btn small" title="Quick-send $1,000" onclick="window.__GAME__.sendCashToPeer('${safePid}', '${safeCs}', 1000)">$1K</button>
                <button class="btn small" title="Quick-send $5,000" onclick="window.__GAME__.sendCashToPeer('${safePid}', '${safeCs}', 5000)">$5K</button>
              </div>
            </div>
          </div>`;
      }
    }

    // Saved Friends Summary
    const frEntries = Object.values(friends);
    const frSummary = frEntries.length > 0
      ? frEntries.map((f) => `<span style="display:inline-block;padding:2px 8px;margin:2px;border-radius:12px;background:#192b3c;border:1px solid #2e4a63;color:#cfe4f5;font-size:11px;font-family:monospace;">★ ${esc(f.callsign)}</span>`).join("")
      : `<span class="small muted">None yet — click <b>+ ADD FRIEND</b> beside any online driver!</span>`;

    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
        <div>${roomBadge}</div>
        <div class="small muted">Cash transfer minimum: <b style="color:#ffd166;">$1,000</b> &nbsp;•&nbsp; Press <b>[TAB]</b> or <b>[ESC]</b> to close</div>
      </div>
      ${rowsHtml}
      <div class="card" style="padding:10px 12px;margin-top:8px;border:1px solid #24384c;">
        <div class="small" style="color:#ffd166;font-weight:800;margin-bottom:4px;">SAVED FRIENDS (${frEntries.length})</div>
        <div>${frSummary}</div>
      </div>
      <div class="small muted" style="margin-top:8px;">
        Tip: Photo Mode (hide HUD) is now on <b>[F8]</b> • Screenshot stays on <b>[F9]</b> or <b>[9]</b>.
      </div>`;
  }

  renderHarbor() {
    const el = document.getElementById("harbor-content");
    if (!el) return;
    const g = this.game;
    const portInfo = g.activeHarborPort || (g.boats && g.boats.findNearbyPort(
      g.onFoot ? g.playerFoot.x : g.vehicle.pos.x,
      g.onFoot ? g.playerFoot.z : g.vehicle.pos.z, 80
    ));
    const portName = portInfo && portInfo.port ? portInfo.port.name : "Ocean Port";
    const owned = g.ownedBoats || {};
    const curRig = g.vehicle ? g.vehicle.spec : null;

    let cards = "";
    for (const bid of ["patrol", "strela", "serna", "zubr"]) {
      const b = KK.BOATS[bid];
      if (!b) continue;
      const isOwned = !!owned[bid];
      const spawned = g.boats ? g.boats.spawnedBoats.find((x) => x.id === bid) : null;
      const curLoadT = spawned ? (g.boats.getPayloadKg(spawned, g.network ? g.network.remotePlayers : null) / 1000).toFixed(1) : "0.0";
      const maxT = Math.round((b.maxPayloadKg || 0) / 1000);
      const bayCnt = (b.bays || []).length;
      const carCap = maxT > 0
        ? `${maxT}t Payload (${bayCnt} Bay${bayCnt === 1 ? "" : "s"}${spawned ? ` • Loaded: ${curLoadT}t` : ""})`
        : "1 Person Only (No Vehicles)";
      const amphTag = b.amphibious ? ' <span style="color:#2de08b;font-weight:800;">• AMPHIBIOUS</span>' : "";
      cards += `
        <div class="card" style="padding:12px;border:1px solid ${isOwned ? '#2de08b' : '#2b3e52'};margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
            <div>
              <b style="font-size:15px;color:#f0f6fc;">${b.name}</b> <span class="small muted">(${b.len}m × ${b.width}m)</span>${amphTag}
              <div class="small muted" style="margin-top:3px;">${b.desc}</div>
              <div class="small" style="margin-top:5px;color:#80faff;">
                Top Speed: <b>${b.topSpeedKmh} km/h (${Math.round(b.topSpeedKmh / 1.852)} kts)</b> &nbsp;|&nbsp; Deck: <b>${carCap}</b>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;min-width:185px;align-items:flex-end;">
              ${isOwned
                ? `<button class="btn primary small" onclick="window.__GAME__.summonAndOptionallyBoardBoat('${bid}', false)">SUMMON TO WATER</button>
                   <button class="btn accent small" onclick="window.__GAME__.summonAndOptionallyBoardBoat('${bid}', true)">SUMMON &amp; BOARD HELM</button>
                   ${spawned && maxT > 0 && curRig ? `<button class="btn small" onclick="window.__GAME__.mountCurrentCarOnBoat('${bid}')">LOAD ${curRig.name.split(' ')[0].toUpperCase()} ON DECK</button>` : ""}`
                : `<button class="btn warn small" onclick="window.__GAME__.buyBoat('${bid}')">UNLOCK ($${b.price.toLocaleString()})</button>`}
            </div>
          </div>
        </div>`;
    }

    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <div>
          <b style="font-size:16px;color:#00e5ff;">⚓ ${portName.toUpperCase()}</b>
          <div class="small muted">Summoned vessels launch anchored in harbor water — your vehicle stays parked safely on shore!</div>
        </div>
        <div style="font-family:monospace;font-size:15px;color:#2de08b;font-weight:800;">$${Math.floor(g.money).toLocaleString()}</div>
      </div>
      ${cards}
      <div class="small muted" style="margin-top:6px;">
        <b>Helm Controls:</b> [W/S] Throttle • [A/D] Rudder • [Shift] Flank • [SPACE] Anchor/Cushion • [U] Deck Lock/Ramp • [L] Nav Lights • [K] Searchlight • [N] Foghorn • [V] Load/Unload Car • [E] Walk on Deck
      </div>`;
  }

  renderContracts() {
    const el = document.getElementById("contracts-content");
    if (!el) return;
    const g = this.game, active = g.activeContract;
    let html = "";
    if (active) {
      const orig = KK.TOWNS[active.fromTown] || KK.TOWNS[0];
      const dest = active.toBar ? { name: KK.JAMES_MAY_BAR.name, x: KK.JAMES_MAY_BAR.dockX, z: KK.JAMES_MAY_BAR.dockZ } : KK.TOWNS[active.toTown];
      const target = active.pickedUp ? dest : orig;
      const distKm = (Math.hypot(target.x - g.vehicle.pos.x, target.z - g.vehicle.pos.z) / 1000).toFixed(2);
      const loadedCnt = g.vehicle.cargoCount + (g.trailer && g.trailer.hitched ? g.trailer.cargoCount : 0);
      const stepTxt = active.pickedUp
        ? `<span style="color:#2de08b;">STEP 2/2 — IN TRANSIT TO ${dest.name.toUpperCase()}</span> (${distKm} km) • Loaded: ${loadedCnt}/${active.units} • Integrity: ${g.vehicle.cargoIntegrity.toFixed(0)}%`
        : `<span style="color:#ffd166;">STEP 1/2 — DRIVE TO ${orig.name.toUpperCase()} DOCK &amp; PRESS [F] TO LOAD CARGO!</span> (${distKm} km)`;
      html += `<div class="active-contract-banner"><div><b>ACTIVE CONTRACT: ${active.title} ($${active.reward.toLocaleString()})</b>
        <div class="small">${stepTxt}</div></div>
        <div style="display:flex;gap:8px;">
          <button class="btn primary small" onclick="window.__GAME__.setWaypoint(${target.x}, ${target.z}, '${target.name.replace(/'/g, "")}'); window.__GAME__.ui.closeModal();">PIN GPS</button>
          <button class="btn warn small" onclick="window.__GAME__.abandonContract()">ABANDON</button>
        </div></div>`;
    }
    const curTr = g.trailer;
    html += `<div class="service-bar" style="border-color:#c47d1e;margin-bottom:12px;">
      <div><b>HITCHABLE TRAILERS (Press [1] to Hitch/Unhitch):</b>
        <div class="small muted">${curTr ? (curTr.spec.name + (curTr.hitched ? " — HITCHED ✓" : " — UNHITCHED")) : "No trailer spawned — buy & hitch a Log Trailer to haul Giant Logs in ANY car!"}</div>
      </div>
      <div class="btn-row" style="margin-left:auto;">
        ${Object.values(KK.TRAILERS).map((tr) => {
          const owned = !!(g.ownedTrailers && g.ownedTrailers[tr.id]);
          return `<button class="btn small ${owned ? "primary" : "accent"}" onclick="window.__GAME__.buyOrSpawnTrailer('${tr.id}')">${owned ? "SPAWN & HITCH " : "BUY $" + tr.price.toLocaleString() + " "}${tr.id === "log_trailer" ? "LOG TRAILER" : (tr.id === "support_trailer" ? "FUEL & REPAIR TRAILER" : (tr.id === "car_carrier" ? "CAR-CARRIER [5]" : "FLATBED TRAILER"))}</button>`;
        }).join("")}
        ${curTr ? `<button class="btn small warn" onclick="window.__GAME__.despawnTrailer()">STORE TRAILER</button>` : ""}
      </div>
    </div>
    <h4>SOLO &amp; SHARED DISPATCH CONTRACTS</h4><div class="fleet-grid">`;
    const cList = (g && !g.tutorialComplete)
      ? this.availableContracts.filter((ct) => ct.id === "starter_bridge")
      : this.availableContracts;
    for (const c of cList) {
      const tFrom = KK.TOWNS[c.fromTown], tTo = c.toBar ? { name: "James May's Pub", x: KK.JAMES_MAY_BAR.dockX, z: KK.JAMES_MAY_BAR.dockZ } : KK.TOWNS[c.toTown], cDef = KK.CARGO_TYPES[c.cargoType];
      const distKm = (Math.hypot(tTo.x - tFrom.x, tTo.z - tFrom.z) / 1000).toFixed(1);
      html += `<div class="card"><div class="card-head"><strong>${c.title}</strong><span class="badge">$${c.reward.toLocaleString()}</span></div>
        <p class="small muted">${c.desc}</p>
        <div class="stat-row"><span>From: <b>${tFrom.name}</b></span><span>To: <b>${tTo.name}</b></span><span>Dist: <b>${distKm} km</b></span></div>
        <div class="stat-row"><span>Cargo: <b>${c.units}x ${cDef.name}</b></span><span>Weight: <b>${c.units * cDef.massPerUnitKg} kg</b></span></div>
        <div class="card-actions"><button class="btn primary small" onclick="window.__GAME__.acceptContract('${c.id}', false)">ACCEPT SOLO</button>
        <button class="btn accent small" onclick="window.__GAME__.acceptContract('${c.id}', true)">LAUNCH LAN CONVOY (+35%)</button></div></div>`;
    }
    html += `</div>`;
    if (g.network.convoys.length > 0) {
      html += `<h4 style="margin-top:14px;">ACTIVE LAN CO-OP CONVOYS</h4><div class="upgrade-list">`;
      for (const cv of g.network.convoys) {
        const tTo = KK.TOWNS[cv.toTown] || KK.TOWNS[1];
        html += `<div class="upg-row"><div><b>${cv.title}</b> (${cv.participants.length} driver(s) | ${cv.completedBy.length} delivered)
          <div class="small muted">To: ${tTo.name} | Shared Payout: $${Math.round(cv.reward * 1.35).toLocaleString()}</div></div>
          <button class="btn primary small" onclick="window.__GAME__.joinLanConvoy('${cv.id}')">JOIN CONVOY</button></div>`;
      }
      html += `</div>`;
    }
    el.innerHTML = html;
  }

  renderMap() {
    if (this.mapCtrl) this.mapCtrl.render();
  }

  renderFieldRepair() {
    const el = document.getElementById("field-repair-content");
    if (!el) return;
    const v = this.game.vehicle, vs = v.vState, p = vs.parts;
    el.innerHTML = `<p class="small muted">Roadside Soviet field engineering. Patch critical worn subsystems right under the hood so you can limp to the nearest Garage!</p>
      <div class="upgrade-list">
        <div class="upg-row"><div><b>Drain Hydrolock &amp; Patch Engine Internals (Avg ${KK.getEngineOverallHealth(vs).toFixed(0)}%)</b>
          <div class="small muted">${v.hydrolocked ? "ENGINE HYDROLOCKED — Drain water now!" : "Patches Head Gasket, Pistons, Crank, Spark Plugs & Injectors to 65%"}</div></div>
          <button class="btn primary small" onclick="window.__GAME__.doFieldRepair('engine')">WRENCH IT</button></div>
        <div class="upg-row"><div><b>Scrape Mud off Radiator &amp; Patch Cooling (Mud: ${vs.health.mudClog.toFixed(0)}% | Rad: ${p.radiator.hp.toFixed(0)}%)</b>
          <div class="small muted">Clears swamp mud, patches Water Pump &amp; replaces shattered Headlight bulbs!</div></div>
          <button class="btn primary small" onclick="window.__GAME__.doFieldRepair('radiator')">CLEAN &amp; COOL</button></div>
        <div class="upg-row"><div><b>Patch Transmission &amp; Clutch (Clutch: ${p.clutchPack.hp.toFixed(0)}% | Gearbox: ${p.gearboxGears.hp.toFixed(0)}%)</b>
          <div class="small muted">Roadside linkage &amp; clutch adjustment up to 65%</div></div>
          <button class="btn primary small" onclick="window.__GAME__.doFieldRepair('transmission')">ADJUST</button></div>
        <div class="upg-row"><div><b>Straighten Tie-Rod &amp; Patch Shocks/Brakes (Bend: ${(vs.health.tieRodBias * 57.3).toFixed(1)}°)</b>
          <div class="small muted">Restores steering alignment &amp; patches blown shocks/brakes to 65%</div></div>
          <button class="btn primary small" onclick="window.__GAME__.doFieldRepair('suspension')">HAMMER IT</button></div>
        <div class="upg-row"><div><b>Swap Blown Tire(s) with Spare (Spares left: ${vs.spareTires || 0})</b>
          <div class="small muted">Blown: ${(vs.blownTires || []).map((b, i) => b ? v.spec.wheels[i].id : null).filter(Boolean).join(", ") || "None (All inflated!)"} — Or walk directly to a flat wheel on foot &amp; press [E]!</div></div>
          <button class="btn primary small" onclick="window.__GAME__.doFieldRepair('tires')">SWAP SPARE</button></div>
        <div class="upg-row"><div><b>Emergency Jerrycan Fuel (+18 Liters)</b>
          <div class="small muted">Current Fuel: ${vs.fuel.toFixed(1)} L</div></div>
          <button class="btn accent small" onclick="window.__GAME__.doFieldRepair('fuel')">POUR ($120)</button></div></div>`;
  }

  renderCoopPitCrew() {
    const pane = document.getElementById("pane-coop_pit");
    if (!pane) return;
    const g = this.game;
    const rp = g.coopTargetPeerId ? g.network.remotePlayers.get(g.coopTargetPeerId) : null;
    if (!rp) {
      pane.innerHTML = `<div class="info-box">No LAN friend vehicle nearby! Walk within 6.5m of a friend's rig and press [F].</div>`;
      return;
    }
    const rSpec = KK.VEHICLES[rp.vehicleId] || KK.VEHICLES.uaz452;
    const myVs = g.vehicle.vState;
    const blownIdx = (rp.blownTires || []).findIndex((b) => !!b);
    const blownLbl = blownIdx >= 0 && rSpec.wheels[blownIdx] ? rSpec.wheels[blownIdx].id : null;

    pane.innerHTML = `
      <div class="info-box" style="margin-bottom:10px;border-color:#00e5ff;">
        <b>CO-OP PIT CREW — ASSISTING ${rp.callsign.toUpperCase()}</b><br/>
        <span class="small muted">Vehicle: ${rSpec.name} • ${rp.repairing ? "<b style='color:#2de08b;'>ACTIVELY REPAIRING (HELP FOR 2x SPEED!)</b>" : "Parked / Standing By"}</span>
      </div>
      <div class="upgrade-list">
        ${rp.repairing ? `
        <div class="upg-row" style="border-color:#2de08b;">
          <div><b>⚡ Lend a Hand — 2x Repair Speed Boost!</b><div class="small muted">Grab a wrench together and cut ${rp.callsign}'s remaining repair timer in HALF!</div></div>
          <button class="btn primary small" onclick="window.__GAME__.sendCoopAssist('${rp.peerId}','repair_boost')">HELP (2x)</button>
        </div>` : ""}
        ${blownLbl ? `
        <div class="upg-row" style="border-color:#ff9f1c;">
          <div><b>🛞 Co-op Fast Tire Swap (${blownLbl} Flat!) — 5s</b><div class="small muted">Jack up &amp; bolt a fresh tire onto ${rp.callsign}'s ${blownLbl} hub in half the solo time!</div></div>
          <button class="btn accent small" onclick="window.__GAME__.assistFriendTireSwapById('${rp.peerId}', ${blownIdx})">SWAP (5s)</button>
        </div>` : ""}
        <div class="upg-row">
          <div><b>🔧 Field-Wrench Friend's Rig (Patch to 85%) — 5s</b><div class="small muted">Clears hydrolock, mud clog, shattered headlights &amp; patches worn engine/gearbox/shocks to 85%!</div></div>
          <button class="btn primary small" onclick="window.__GAME__.startCoopFieldRepair('${rp.peerId}')">REPAIR (5s)</button>
        </div>
        <div class="upg-row">
          <div><b>⛽ Siphon &amp; Share Fuel (-15L yours → +20L ${rp.callsign})</b><div class="small muted">Your tank: ${myVs.fuel.toFixed(0)}L / ${g.vehicle.spec.fuelCapacity}L</div></div>
          <button class="btn small" onclick="window.__GAME__.sendCoopAssist('${rp.peerId}','fuel_share')">SHARE FUEL</button>
        </div>
        <div class="upg-row">
          <div><b>🛞 Hand Over a Spare Tire (Your spares: ${myVs.spareTires || 0})</b><div class="small muted">Gives ${rp.callsign} +1 spare tire for their rack.</div></div>
          <button class="btn small" onclick="window.__GAME__.sendCoopAssist('${rp.peerId}','spare_give')">GIVE SPARE</button>
        </div>
        <div class="upg-row">
          <div><b>💵 Wire Emergency Tow/Parts Cash ($1,000)</b><div class="small muted">Your balance: $${g.money.toLocaleString()}</div></div>
          <button class="btn accent small" onclick="window.__GAME__.sendCoopAssist('${rp.peerId}','cash_wire')">WIRE $1,000</button>
        </div>
      </div>`;
  }

  // Live 2D Windshield Raindrops, Mud Splatters & Sweeping Wiper Arcs (Cockpit Cam ONLY!)
  updateWindshieldOverlay(dt, game) {
    // v15.9.1: Strictly NO 2D screen-space wipers or mud — all wipers & mud live on the 3D windshield glass!
    const cv = document.getElementById("windshield-canvas");
    if (cv) cv.classList.add("hidden");
    return;
    const inCockpit = (!game.onFoot && !game.ridingWithPeerId && game.camMode === 3);
    cv.classList.toggle("hidden", !inCockpit);
    if (!inCockpit) return;

    if (cv.width !== window.innerWidth || cv.height !== window.innerHeight) {
      cv.width = window.innerWidth;
      cv.height = window.innerHeight;
    }
    const ctx = cv.getContext("2d");
    const W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);

    // Initialize persistent mud blotches & rain streaks once
    if (!this._wsMudDrops) {
      this._wsMudDrops = [];
      for (let i = 0; i < 42; i++) {
        this._wsMudDrops.push({
          x: Math.random(), y: 0.08 + Math.random() * 0.80,
          r: 12 + Math.random() * 34,
          rot: Math.random() * Math.PI * 2,
          inWiperArc: false
        });
      }
      this._wsRainDrops = [];
      for (let i = 0; i < 75; i++) {
        this._wsRainDrops.push({ x: Math.random(), y: Math.random(), len: 14 + Math.random() * 24, spd: 0.35 + Math.random() * 0.55 });
      }
    }

    const mudAmt = Math.max(0, Math.min(1, game.windshieldMud || 0));
    const isRain = (game.weather.weather === "rain" || game.weather.weather === "storm");
    const isSnow = (game.weather.weather === "snow");
    const wiperAngle = game.vehicleRig && game.vehicleRig.cockpit ? Math.sin(game.vehicleRig.cockpit.wiperPhase) : -1;

    // Subtle tinted windshield perimeter vignette
    const vg = ctx.createRadialGradient(W * 0.5, H * 0.48, Math.min(W, H) * 0.35, W * 0.5, H * 0.5, Math.max(W, H) * 0.72);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(6, 12, 18, 0.34)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    // Draw mud splatters proportional to windshieldMud (cleared in wiper zone when wipers sweep!)
    if (mudAmt > 0.02) {
      const count = Math.floor(mudAmt * this._wsMudDrops.length);
      for (let i = 0; i < count; i++) {
        const d = this._wsMudDrops[i];
        const px = d.x * W, py = d.y * H;
        // Leave edges muddier than the center wiper sweep zone!
        const distFromBottomCenter = Math.hypot(px - W * 0.5, py - H * 0.95);
        const inSweep = distFromBottomCenter < H * 0.72 && py > H * 0.20;
        const alpha = (inSweep ? 0.42 : 0.62) * mudAmt;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(d.rot);
        ctx.fillStyle = `rgba(68, 46, 26, ${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, d.r * 1.2, d.r * 0.72, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Draw live rain streaks / snowflakes clinging to windshield glass!
    if (isRain || isSnow) {
      const spdBoost = 1.0 + Math.min(2.2, game.vehicle.speedKmh / 50);
      ctx.strokeStyle = isSnow ? "rgba(235, 248, 255, 0.55)" : "rgba(185, 225, 250, 0.42)";
      ctx.lineWidth = isSnow ? 3.2 : 1.8;
      ctx.beginPath();
      for (let i = 0; i < this._wsRainDrops.length; i++) {
        const r = this._wsRainDrops[i];
        r.y += dt * r.spd * (isSnow ? 0.35 : 0.75) * spdBoost;
        if (r.y > 1.05) { r.y = -0.05; r.x = Math.random(); }
        const rx = r.x * W, ry = r.y * H;
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + (isSnow ? 2 : 0), ry + (isSnow ? 4 : r.len));
      }
      ctx.stroke();
    }

    // Draw subtle sweeping wiper streak glow when wipers are ON!
    if (game.wipersOn) {
      const ang = -Math.PI * 0.5 + wiperAngle * 0.78;
      const pivotY = H * 0.96;
      const bladeLen = H * 0.62;
      ctx.strokeStyle = "rgba(15, 20, 26, 0.75)";
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      for (const px of [W * 0.34, W * 0.66]) {
        ctx.beginPath();
        ctx.moveTo(px, pivotY);
        ctx.lineTo(px + Math.cos(ang) * bladeLen, pivotY + Math.sin(ang) * bladeLen);
        ctx.stroke();
      }
    }
  }

  renderInventory() {
    const el = document.getElementById("inventory-content");
    if (!el) return;
    const g = this.game, vs = g.vehicle.vState;
    const carrying = g.playerFoot && g.playerFoot.carryingCrate ? g.playerFoot.carryingCrate.cargoType : null;
    el.innerHTML = `
      <div class="info-box small" style="margin-bottom:10px;">
        <b>FIELD EXPEDITION PACK</b> — Press <b>[E]</b> while on foot to inspect supplies &amp; deploy gear.
      </div>
      <div class="upgrade-list">
        <div class="upg-row">
          <div><b>🔥 Road Flares (${g.flareCount || 0} remaining)</b>
            <div class="small muted">Illuminates dense fog/night, lures Vulkan T-Rex &amp; repels Skinwalkers. Restocks in towns.</div>
          </div>
          <button class="btn accent small" onclick="window.__GAME__.throwRoadFlare(); window.__GAME__.ui.renderInventory();" ${(g.flareCount || 0) <= 0 ? "disabled" : ""}>THROW FLARE [G]</button>
        </div>
        <div class="upg-row">
          <div><b>🛞 Spare Tires (${vs.spareTires || 0} stored on rig)</b>
            <div class="small muted">Walk beside any blown wheel &amp; press [F] to mount a fresh tire.</div>
          </div>
          <span class="tag-ok">${vs.spareTires || 0}x READY</span>
        </div>
        <div class="upg-row">
          <div><b>⛽ Emergency Field Jerrycan (+18L)</b>
            <div class="small muted">Walk strictly to the vehicle's Front or Rear engine bay &amp; press [F] to refuel/repair.</div>
          </div>
          <span class="tag-ok">$120 / USE</span>
        </div>
        <div class="upg-row">
          <div><b>🔧 Soviet Field Wrench Kit</b>
            <div class="small muted">Patches engine, radiator, headlights/roof/taillights, tie-rods &amp; hydrolock in the field.</div>
          </div>
          <span class="tag-ok">EQUIPPED</span>
        </div>
        <div class="upg-row">
          <div><b>📦 Hands / Carried Cargo</b>
            <div class="small muted">${carrying ? "Holding crate (" + carrying.toUpperCase() + ") — walk to truck bed & press [F] to load." : "Hands empty."}</div>
          </div>
          <span class="small muted">${carrying ? "HOLDING" : "EMPTY"}</span>
        </div>
      </div>`;
  }

  renderEnvControls() {
    const el = document.getElementById("env-content");
    if (!el) return;
    const g = this.game, w = g.weather, ps = g.particles;
    const tab = this.envTab || "world";
    const tabBtn = (id, lbl) => `<button class="sub-tab-btn ${tab === id ? "active" : ""}" onclick="window.__GAME__.ui.envTab='${id}'; window.__GAME__.ui.renderEnvControls();">${lbl}</button>`;

    let bodyHtml = "";

    if (tab === "world") {
      const weathers = [
        ["clear", "☀", "Clear Sky"],
        ["overcast", "☁", "Overcast"],
        ["rain", "🌧", "Heavy Rain"],
        ["storm", "⛈", "Thunderstorm"],
        ["fog", "🌫", "Dense Fog"],
        ["snow", "❄", "Alpine Snow"]
      ];
      const times = [
        [5.8,  "🌅", "DAWN",     "05:48"],
        [12.5, "☀", "NOON",     "12:30"],
        [18.6, "🌇", "SUNSET",   "18:36"],
        [23.2, "🌙", "MIDNIGHT", "23:12"]
      ];
      const speeds = [[0, "PAUSED (0x)"], [0.5, "SLOW (0.5x)"], [1, "NORMAL (1x)"], [3, "FAST (3x)"]];

      bodyHtml = `
        <div class="admin-grid">
          <div class="admin-card">
            <div class="admin-card-title">🕒 TIME OF DAY &amp; SKY CLOCK (LAN SYNCED)</div>
            <div class="admin-clock-readout">
              <span class="clock-big" id="env-time-lbl">${w.getTimeString()}</span>
              <span class="badge">${w.isNight ? "NIGHTTIME" : "DAYLIGHT"} • ${w.timeScale}x SPEED</span>
            </div>
            <div class="slider-group" style="margin:8px 0 12px 0;">
              <input type="range" min="0" max="23.95" step="0.15" value="${w.timeOfDay.toFixed(2)}"
                oninput="document.getElementById('env-time-lbl').textContent=parseFloat(this.value).toFixed(1)+'h'; window.__GAME__.setServerEnv({ timeOfDay: parseFloat(this.value) })" />
            </div>
            <div class="admin-pill-grid4">
              ${times.map(([hr, ic, nm, sub]) => `
                <button class="admin-tile" onclick="window.__GAME__.setServerEnv({ timeOfDay: ${hr} })">
                  <span class="tile-ic">${ic}</span><b>${nm}</b><span class="small muted">${sub}</span>
                </button>`).join("")}
            </div>
            <div class="small muted" style="margin:10px 0 5px 0;"><b>Day/Night Cycle Speed:</b></div>
            <div class="btn-row">
              ${speeds.map(([sp, lbl]) => `<button class="btn small ${Math.abs((w.timeScale ?? 1) - sp) < 0.05 ? "primary" : ""}" onclick="window.__GAME__.setServerEnv({ timeScale: ${sp} })">${lbl}</button>`).join("")}
            </div>
          </div>

          <div class="admin-card">
            <div class="admin-card-title">🌦 DYNAMIC WEATHER CONTROL (LAN SYNCED)</div>
            <div class="admin-pill-grid3">
              ${weathers.map(([id, ic, nm]) => `
                <button class="admin-tile ${w.weather === id ? "active" : ""}" onclick="window.__GAME__.setServerEnv({ weather: '${id}' })">
                  <span class="tile-ic">${ic}</span><b>${nm}</b>
                </button>`).join("")}
            </div>
            <div class="admin-card-title" style="margin-top:14px;">🎬 1-CLICK ATMOSPHERE PRESETS</div>
            <div class="btn-row">
              <button class="btn small primary" onclick="window.__GAME__.setServerEnv({ timeOfDay: 12.5, weather: 'clear' })">☀ SUNNY CRUISE</button>
              <button class="btn small warn" onclick="window.__GAME__.setServerEnv({ timeOfDay: 23.0, weather: 'fog' })">👻 HORROR FOG NIGHT</button>
              <button class="btn small accent" onclick="window.__GAME__.setServerEnv({ timeOfDay: 22.0, weather: 'storm' })">⛈ MONSOON STORM</button>
              <button class="btn small" onclick="window.__GAME__.setServerEnv({ timeOfDay: 16.5, weather: 'snow' })">❄ BLIZZARD EXPEDITION</button>
            </div>
          </div>
        </div>`;
    } else if (tab === "audio") {
      bodyHtml = `
        <div class="admin-grid">
          <div class="admin-card">
            <div class="admin-card-title">🔊 HEADPHONE-SAFE MASTER AUDIO</div>
            <div class="slider-group" style="margin-bottom:12px;">
              <label>Master Output Volume: <b id="env-vol-lbl">${Math.round(g.audio.volume * 100)}%</b> ${g.audio.muted ? '<span style="color:#ff5c77;">(MUTED)</span>' : ""}</label>
              <div style="display:flex;gap:8px;align-items:center;margin-top:4px;">
                <input type="range" min="0" max="1" step="0.05" value="${g.audio.volume.toFixed(2)}"
                  oninput="document.getElementById('env-vol-lbl').textContent=Math.round(this.value*100)+'%'; window.__GAME__.setAudioVolume(parseFloat(this.value))" />
                <button class="btn small ${g.audio.muted ? "warn" : "primary"}" onclick="window.__GAME__.toggleAudioMute()">${g.audio.muted ? "UNMUTE" : "MUTE"}</button>
              </div>
            </div>
            <div class="info-box small" style="line-height:1.5;">
              <b>Active Protection:</b> Built-in dynamics limiter + 3.4 kHz harshness notch keeps twin-turbos &amp; alarms comfortable on headphones.<br/>
              <b>Cockpit Wipers:</b> Currently <b>${g.wipersOn ? "ON" : "OFF"}</b> (Toggle with <b>[B]</b>).
            </div>
          </div>

          <div class="admin-card">
            <div class="admin-card-title">🖥 PERFORMANCE &amp; ENGINE TELEMETRY</div>
            <div class="admin-stat-strip">
              <div><span>LIVE FPS</span><b style="color:${ps.fpsSmooth < 35 ? '#ff5c77' : '#2de08b'}">${Math.round(ps.fpsSmooth)}</b></div>
              <div><span>DRAW CALLS</span><b style="color:#00e5ff;">${g.renderer && g.renderer.info ? g.renderer.info.render.calls : 0}</b></div>
              <div><span>PARTICLES</span><b>${ps.activeCount}/${ps.budget}</b></div>
              <div><span>CHUNKS</span><b>${g.world.chunks.size}</b></div>
            </div>
            <div class="small muted" style="margin:10px 0 6px 0;"><b>Graphics &amp; Laptop Optimization Preset (Zero Quality Loss on HIGH):</b></div>
            <div class="btn-row" style="margin-bottom:10px;">
              <button class="btn small ${g.gfxPreset === 'potato' ? 'accent' : ''}" onclick="window.__GAME__.setGraphicsPreset('potato')">POTATO (Max FPS)</button>
              <button class="btn small ${g.gfxPreset === 'low' ? 'primary' : ''}" onclick="window.__GAME__.setGraphicsPreset('low')">LOW</button>
              <button class="btn small ${g.gfxPreset === 'med' ? 'primary' : ''}" onclick="window.__GAME__.setGraphicsPreset('med')">MEDIUM</button>
              <button class="btn small ${g.gfxPreset === 'high' ? 'primary' : ''}" onclick="window.__GAME__.setGraphicsPreset('high')">HIGH (Full)</button>
            </div>
            <div class="small muted" style="margin:10px 0 6px 0;"><b>Particle Budget Quality:</b></div>
            <div class="btn-row" style="margin-bottom:10px;">
              <button class="btn small ${ps.quality === 'low' ? 'primary' : ''}" onclick="window.__GAME__.setParticleQuality('low')">LOW (Max FPS)</button>
              <button class="btn small ${ps.quality === 'med' ? 'primary' : ''}" onclick="window.__GAME__.setParticleQuality('med')">MEDIUM</button>
              <button class="btn small ${ps.quality === 'high' ? 'primary' : ''}" onclick="window.__GAME__.setParticleQuality('high')">HIGH</button>
              <button class="btn warn small" onclick="window.__GAME__.clearParticlesNow()">FLUSH PARTICLES</button>
            </div>
            <div class="small muted" style="margin:6px 0 5px 0;"><b>Multiplayer Visuals &amp; Screenshots:</b></div>
            <div class="btn-row">
              <button class="btn small ${g.remoteDustEnabled ? 'primary' : ''}" onclick="window.__GAME__.toggleRemoteDust()">OTHER PLAYERS MUD/DUST: ${g.remoteDustEnabled ? 'ON' : 'OFF'}</button>
              <button class="btn small" onclick="window.__GAME__.togglePhotoMode(); window.__GAME__.ui.closeModal();">📷 PHOTO MODE [F8]</button>
              <button class="btn accent small" onclick="window.__GAME__.ui.closeModal(); setTimeout(() => window.__GAME__.captureScreenshot(), 120);">📸 SNAP PNG [F9]</button>
            </div>
          </div>
        </div>`;
    } else if (tab === "tools") {
      bodyHtml = `
        <div class="admin-grid">
          <div class="admin-card">
            <div class="admin-card-title">🛠 FLEET RECOVERY &amp; INFRASTRUCTURE</div>
            <div class="admin-action-list">
              <div class="admin-action-row">
                <div><b>Emergency Tow to Nearest Town Garage</b><div class="small muted">Extracts your rig out of ravines or rivers cleanly ($350)</div></div>
                <button class="btn accent small" onclick="window.__GAME__.emergencyTowNearestTown()">TOW ($350)</button>
              </div>
              <div class="admin-action-row">
                <div><b>Right Flipped Vehicle (Jack Recovery)</b><div class="small muted">Same as pressing [U] in the field</div></div>
                <button class="btn primary small" onclick="window.__GAME__.vehicle.flipUpright(window.__GAME__.world); window.__GAME__.ui.closeModal();">FLIP RIG</button>
              </div>
              <div class="admin-action-row">
                <div><b>Return to Title &amp; Deployment Menu</b><div class="small muted">Switch spawn town, inspect balance/fleet, or view atmospheric biome menu</div></div>
                <button class="btn primary small" onclick="window.__GAME__.ui.closeModal(); window.__GAME__.startMenu.open();">OPEN TITLE MENU</button>
              </div>
              <div class="admin-action-row">
                <div><b>Freeze / Lock Turret for Screenshots [MMB]</b><div class="small muted">Locks turret aim while you orbit &amp; zoom camera freely</div></div>
                <button class="btn small ${g.turretFrozen ? 'warn' : 'primary'}" onclick="window.__GAME__.toggleTurretFreeze(); window.__GAME__.ui.renderEnvControls();">${g.turretFrozen ? 'UNLOCK [MMB]' : 'FREEZE [MMB]'}</button>
              </div>
              <div class="admin-action-row">
                <div><b>Mount / Stow Snorkel Tube (Free)</b><div class="small muted">Hide bulky snorkel when not wading deep water</div></div>
                <button class="btn small" onclick="window.__GAME__.toggleActiveSnorkel(); window.__GAME__.ui.renderEnvControls();">TOGGLE SNORKEL</button>
              </div>
              <div class="admin-action-row">
                <div><b>Rebuild All Broken Wooden Bridges (LAN)</b><div class="small muted">Restores every snapped plank across the Oblast for all players</div></div>
                <button class="btn small" onclick="window.__GAME__.repairAllBridgesLAN()">REBUILD ALL</button>
              </div>
              <div class="admin-action-row">
                <div><b>Teleport to Connected LAN Friend</b><div class="small muted">Instantly regroup next to a buddy on the 100 km map</div></div>
                <button class="btn primary small" onclick="window.__GAME__.teleportToFriend()">TELEPORT</button>
              </div>
            </div>
          </div>

          <div class="admin-card" style="border-color:#ff5c7744;">
            <div class="admin-card-title" style="color:#ff8fa3;">🌪 DISASTER &amp; SHENANIGANS TRIGGERS</div>
            <div class="admin-action-list">
              <div class="admin-action-row">
                <div><b>Spawn Realistic Tornado (LAN Synced)</b><div class="small muted">Touches down near a random driver with mass-scaled suction</div></div>
                <button class="btn warn small" onclick="window.__GAME__.spawnTornadoNow()">🌪 TORNADO</button>
              </div>
              <div class="admin-action-row">
                <div><b>Trigger Mountain Snow Avalanche</b><div class="small muted">Sends cascading snow &amp; ice rolling downhill across your path</div></div>
                <button class="btn small" onclick="window.__GAME__.triggerAvalancheNow()">❄ AVALANCHE</button>
              </div>
            </div>
            <div class="info-box small" style="margin-top:12px;line-height:1.5;">
              <b>Radio Folklore:</b> Listen closely to wind shifts, sudden bird silence, earth tremors, and distant static. Southwest of HQ lies <b>Clarkson's Farm Sanctuary</b>—nothing unnatural crosses his fence, and Jeremy repairs rigs for free if his sheep stay safe.
            </div>
          </div>
        </div>`;
    } else if (tab === "gps") {
      const q = (this.envSearch || "").toLowerCase();
      const rows = [
        { name: "🐑 Clarkson's Farm (Free Repairs & Sanctuary)", sub: "Diddly Squat Oblast — Don't run over his sheep!", x: KK.CLARKSON_FARM.x, z: KK.CLARKSON_FARM.z, col: "#80ed99" },
        { name: "🍺 James May's Pub (Beer Deliveries & Sandero)", sub: "The Slow & Steady Arms", x: KK.JAMES_MAY_BAR.dockX, z: KK.JAMES_MAY_BAR.dockZ, col: "#ffb703" },
        { name: "🏜 Hammond's Rocky Mesa (BTR-80 Rearm & Oliver)", sub: "Sandwyrm-Safe Desert Plateau — Rearm BTR-80 KPVT 14.5mm!", x: KK.HAMMOND_MESA.x, z: KK.HAMMOND_MESA.z, col: "#f4a261" },
        ...(KK.SMOOTH_TARMAC_ZONES || []).map((tz) => ({ name: "🏁 " + tz.name, sub: "Glass-smooth high-grip tarmac & drift skidpad", x: tz.cx, z: tz.cz, col: "#00f5ff" })),
        ...(KK.BAD_ROAD_ZONES || []).map((bz) => ({ name: "⚠ " + bz.name, sub: "Brutal craters, washboard ruts & broken concrete", x: bz.x, z: bz.z, col: "#ff5c77" })),
        ...KK.TOWNS.map((tw) => ({ name: "🏙 " + tw.name, sub: tw.desc, x: tw.dockX, z: tw.dockZ, col: "#2de08b" })),
        ...KK.LANDMARKS.map((lm) => {
          const cl = !!(g.claimedLandmarks && g.claimedLandmarks[lm.id]);
          return { name: (cl ? "✓ " : "★ ") + lm.name, sub: cl ? "Stash Claimed ✓" : "Treasure Stash: $" + lm.rewardCash.toLocaleString(), x: lm.x, z: lm.z, col: cl ? "#8a99a8" : "#ffbe0b" };
        })
      ].filter((r) => !q || r.name.toLowerCase().includes(q) || r.sub.toLowerCase().includes(q));

      bodyHtml = `
        <div class="admin-card">
          <div style="display:flex;gap:10px;align-items:center;margin-bottom:10px;">
            <input type="text" class="admin-search" placeholder="Search towns, farms, pubs, tracks, landmarks..." value="${this.envSearch || ""}"
              oninput="window.__GAME__.ui.envSearch=this.value; window.__GAME__.ui.renderEnvControls();" />
            <button class="btn small" onclick="window.__GAME__.ui.openModal('map')">OPEN FULL BIOME MAP [M]</button>
          </div>
          <div class="upgrade-list" style="max-height:360px;">
            ${rows.map((r) => {
              const dKm = (Math.hypot(r.x - g.vehicle.pos.x, r.z - g.vehicle.pos.z) / 1000).toFixed(1);
              const safeN = r.name.split("'").join("");
              return `<div class="upg-row">
                <div><b style="color:${r.col};">${r.name}</b> <span class="small muted">(${dKm} km)</span>
                  <div class="small muted">${r.sub}</div></div>
                <button class="btn small primary" onclick="window.__GAME__.setWaypoint(${r.x}, ${r.z}, '${safeN}'); window.__GAME__.ui.closeModal();">SET GPS</button>
              </div>`;
            }).join("")}
          </div>
        </div>`;
    }

    if (tab === "guide") {
      const steps = [
        ["1", "START & DRIVE", "Press <b>[I]</b> to crank the engine, <b>[WASD]</b> to drive, <b>[C]</b> to switch cameras, and <b>[F]</b> to interact with warehouses, garages, fuel pumps, and NPCs."],
        ["2", "HAUL CONTRACTS FOR CASH", "Pull up to any Town Warehouse (<b>[F]</b>) and accept a delivery. Follow the <b style=\"color:#c084fc;\">PURPLE GPS dot</b> on your mini-radar to the drop-off zone to get paid."],
        ["3", "MAINTAIN & REPAIR YOUR RIG", "Every vehicle simulates real individual parts (radiator, shocks, pistons, brakes, tires). Hold <b>[X]</b> for live X-Ray diagnostics, or exit (<b>[F]</b>) and inspect the front/rear engine bay (<b>[F]</b>) to patch parts."],
        ["4", "UPGRADE & EXPAND YOUR FLEET", "Visit any Town Garage (<b>[F]</b>) to fit Mud Tires, Snorkels, Suspension Lifts, Engines &amp; 25 Rim Styles — or buy Trailers, Landing Barges, Supercars &amp; Armored Military Vehicles."],
        ["5", "EXPLORE 100 KM² OF BIOMES", "Cross wooden ravine bridges, deep mud bogs, desert canyons, alpine switchbacks, Zolotoy GP racetrack, and outer ocean islands via drive-on barges."],
        ["6", "SURVIVE THE CRYPTIDS", "The Oblast isn't empty. Watch out for the Forest Yeti, Siren Head, Desert Sandwyrm, Volcanic T-Rex (and neutral Brachiosaurus), and Godzilla in the frozen north. Don't stop to say hi."]
      ];
      bodyHtml = `
        <div class="admin-card" style="border-color:rgba(168,85,247,0.55); background:linear-gradient(135deg,rgba(20,16,38,0.92),rgba(10,15,24,0.94));">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <div class="admin-card-title" style="color:#c084fc;margin:0;">📖 WHAT THE HECK AM I DOING HERE? — OBLAST FIELD MANUAL</div>
            <button class="btn small primary" onclick="window.__GAME__.restartTutorial(); window.__GAME__.ui.closeModal();">▶ REPLAY HQ TUTORIAL</button>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;">
            ${steps.map(([num, title, desc]) => `
              <div style="background:rgba(15,23,36,0.88);border:1px solid rgba(168,85,247,0.38);border-radius:8px;padding:10px 12px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
                  <span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:#a855f7;color:#070a0f;font-weight:900;font-size:12px;">${num}</span>
                  <span style="color:#e9d5ff;font-weight:900;font-size:12px;letter-spacing:0.5px;">${title}</span>
                </div>
                <div style="font-size:12px;line-height:1.48;color:#cbd5e1;">${desc}</div>
              </div>
            `).join("")}
          </div>
        </div>`;
    } else if (tab === "controls") {
      bodyHtml = `
        <div class="admin-grid2">
          <div class="admin-card">
            <div class="admin-card-title">🚗 DRIVING &amp; DRIVETRAIN</div>
            <div class="ctrl-list small">
              <div><b>W / A / S / D</b><span>Drive / Steer</span></div>
              <div><b>Space</b><span>Handbrake / Drift</span></div>
              <div><b>Q / E</b><span>Manual Gear Down / Up</span></div>
              <div><b>4</b><span>Toggle Auto / Manual Gearbox</span></div>
              <div><b>I</b><span>Engine Ignition ON / OFF</span></div>
              <div><b>P</b><span>Parking Brake (Hill Hold)</span></div>
              <div><b>V</b><span>Transfer Case (2H / 4H / 4L)</span></div>
              <div><b>2 / 3</b><span>Front / Rear Diff Locks</span></div>
              <div><b>L / K / H / B</b><span>Headlights / Roof &amp; Searchlight / Hazards / Wipers</span></div>
              <div><b>6</b><span>Deploy / Stow Snorkel Anywhere (T-72B / Safari)</span></div>
              <div><b>U</b><span>Flip / Right Overturned Rig</span></div>
              <div><b>1 / 5</b><span>Hitch Trailer / Car-Carrier Hoist</span></div>
            </div>
          </div>
          <div class="admin-card">
            <div class="admin-card-title">⚔ BATTLE &amp; MILITARY SYSTEMS</div>
            <div class="ctrl-list small">
              <div><b>Left Click (LMB)</b><span>Fire Primary Cannon / Rockets / Quad-23mm / KPVT</span></div>
              <div><b>Right Click (Hold)</b><span>360° Turret-Mounted Gunner Scope</span></div>
              <div><b>Middle Click (MMB)</b><span>Freeze / Unlock Turret Tracking</span></div>
              <div><b>Mouse Move</b><span>Continuous War Thunder Yaw &amp; Barrel Elevation</span></div>
              <div><b>R</b><span>Switch Shell / Fire Mode (Strap Cargo on Trucks)</span></div>
              <div><b>Shift (Hold)</b><span>Secondary 14.5mm Roof MG / 40mm AutoKanone</span></div>
              <div><b>Z</b><span>Cycle Optics (Day / FLIR Thermal / Green or Crimson Red NVD)</span></div>
              <div><b>G</b><span>81mm Smoke / Shilka Radar / Donnerschild APS / Road Flare</span></div>
              <div><b>Hold X</b><span>Live X-Ray Mechanical &amp; Autoloader View</span></div>
            </div>
          </div>
          <div class="admin-card">
            <div class="admin-card-title">🚶 INTERACTION &amp; ON-FOOT</div>
            <div class="ctrl-list small">
              <div><b>F</b><span>Universal Interact (Garage at Bay, Dock, Gas Pump, NPCs, Hoist, Enter/Exit)</span></div>
              <div><b>Shift + F</b><span>Force Exit Vehicle Anywhere</span></div>
              <div><b>1 / 2 / 3 / 4 / 5</b><span>On-Foot Actions: Wave, Kick (Yeet!), Slav Squat, Dance, Salute</span></div>
              <div><b>F (Front / Rear Bay)</b><span>Open Engine Repair Menu (strictly Front or Rear bay!)</span></div>
              <div><b>E (On Foot)</b><span>Open / Close On-Foot Inventory</span></div>
              <div><b>T / Y</b><span>Attach &amp; Reel Winch (Shift+T Slack) / Cut Winch</span></div>
            </div>
          </div>
          <div class="admin-card">
            <div class="admin-card-title">📷 CAMERA &amp; MENUS</div>
            <div class="ctrl-list small">
              <div><b>C / Scroll Wheel</b><span>Cycle Camera (Chase/Hood/Convoy/Cockpit) / Zoom</span></div>
              <div><b>M / J / O</b><span>100km GPS Map / Contracts Board / Options Menu</span></div>
              <div><b>Tab / F9</b><span>Clean Photo Mode (Hide HUD) / Instant PNG Snap</span></div>
              <div><b>Enter / Esc</b><span>LAN Radio Chat / Close Modal</span></div>
            </div>
          </div>
        </div>`;
    }

    el.innerHTML = `
      <div class="sub-tabs" style="margin-bottom:12px;">
        ${tabBtn("world",    "🌍 WORLD & WEATHER")}
        ${tabBtn("audio",    "🔊 AUDIO & GRAPHICS")}
        ${tabBtn("guide", "📖 WHAT AM I DOING?")}
          ${tabBtn("controls", "🎮 CONTROLS")}
        ${tabBtn("tools",    "⚡ RECOVERY & CHAOS")}
        ${tabBtn("gps",      "🧭 QUICK GPS DIRECTORY")}
      </div>
      ${bodyHtml}`;
  }

  updateHUD(game) {
    const v = game.vehicle, vs = v.vState, spec = v.spec, eng = KK.ENGINES[vs.engineId];
    const getEl = (id) => this._hudCache[id] || (this._hudCache[id] = document.getElementById(id));
    const setTxt = (id, val) => { const e = getEl(id); if (e) e.textContent = val; };
    const engOverall = KK.getEngineOverallHealth(vs);

    const activeBoat = game.boats ? game.boats.activeBoat : null;
    const dashEl = getEl("hud-dash");
    const helmEl = getEl("hud-helm");
    if (dashEl) dashEl.classList.toggle("hidden", !!activeBoat);
    if (helmEl) helmEl.classList.toggle("hidden", !activeBoat);

    if (activeBoat) {
      const sp = activeBoat.spec;
      const kts = Math.round((activeBoat.speedKmh || 0) / 1.852);
      const hdg = Math.round(((Math.atan2(Math.sin(activeBoat.yaw), -Math.cos(activeBoat.yaw)) * 180 / Math.PI) + 360) % 360);
      const thr = activeBoat.throttleCmd || 0;
      const boatCr = !!(game.boatCruiseOn && !activeBoat.anchored);
      const tele = activeBoat.anchored ? (sp.amphibious ? "CUSHION OFF" : "ANCHORED")
        : (boatCr ? `CRUISE ${Math.round((game.boatCruiseKmh || 0) / 1.852)}K` : (thr > 0.1 ? (activeBoat.boostCmd ? "FLANK" : "AHEAD") : (thr < -0.1 ? "ASTERN" : "STOP")));
      const depthTxt = activeBoat.isBeached ? "BEACHED" : (activeBoat.waterDepth < 3.5 ? `SHOAL ${activeBoat.waterDepth.toFixed(1)}m` : `${Math.round(activeBoat.waterDepth)}m`);
      const loadT = (game.boats.getPayloadKg(activeBoat, game.network ? game.network.remotePlayers : null) / 1000).toFixed(1);
      const maxT = Math.round((sp.maxPayloadKg || 0) / 1000);

      setTxt("helm-vessel-name", "⚓ " + sp.name.toUpperCase());
      setTxt("helm-telegraph", tele);
      setTxt("helm-kts", String(kts));
      setTxt("helm-kmh", `${Math.round(activeBoat.speedKmh || 0)} KM/H`);
      setTxt("helm-hdg", `HDG ${String(hdg).padStart(3, "0")}°`);
      setTxt("helm-depth", depthTxt);
      setTxt("helm-payload", maxT > 0 ? `${loadT}/${maxT}t` : "SOLO 1P");
      const lockEl = getEl("helm-lock");
      if (lockEl) {
        lockEl.textContent = maxT > 0 ? (activeBoat.deckLocked ? "LOCKED" : "OPEN") : "N/A";
        lockEl.style.color = activeBoat.deckLocked ? "#ffd166" : "#2de08b";
      }
      const ancEl = getEl("helm-anchor");
      if (ancEl) {
        ancEl.textContent = sp.amphibious ? (activeBoat.anchored ? "DUMPED" : "HOVER") : (activeBoat.anchored ? "DROPPED" : "WEIGHED");
        ancEl.style.color = activeBoat.anchored ? "#ff9f1c" : "#2de08b";
      }
      const bNav = getEl("helm-badge-nav"); if (bNav) bNav.classList.toggle("on", !!activeBoat.navLightsOn);
      const bSpot = getEl("helm-badge-spot"); if (bSpot) bSpot.classList.toggle("on", !!activeBoat.spotLightOn);
      const bAnc = getEl("helm-badge-anc"); if (bAnc) bAnc.classList.toggle("warn", !!activeBoat.anchored);
      const bCr = getEl("helm-badge-cruise"); if (bCr) bCr.classList.toggle("on", boatCr);

      setTxt("hud-coords", `${(activeBoat.gx / 1000).toFixed(2)}km, ${(activeBoat.gz / 1000).toFixed(2)}km | SEA HELM`);
      setTxt("hud-cash", "$" + Math.floor(game.money).toLocaleString());
      setTxt("hud-time", game.weather.getTimeString());
      setTxt("hud-weather", game.weather.weather.toUpperCase());
      setTxt("hud-biome", game.world.getBiomeName(activeBoat.gx, activeBoat.gz));
      setTxt("hud-account-pill", game.account && game.account.username ? ("👤 " + game.account.username) : "👤 GUEST (LOGIN)");
      const cargoBox = getEl("hud-cargo-box"); if (cargoBox) cargoBox.classList.add("hidden");
      const wpEl = getEl("hud-waypoint");
      if (wpEl) {
        if (game.waypoint) {
          const dx = game.waypoint.x - activeBoat.gx, dz = game.waypoint.z - activeBoat.gz;
          const bearing = (Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360;
          wpEl.textContent = `GPS: ${game.waypoint.label} — ${(Math.hypot(dx, dz) / 1000).toFixed(2)} km (HDG ${Math.round(bearing)}°)`;
          wpEl.classList.remove("hidden");
        } else { wpEl.classList.add("hidden"); }
      }
      this.drawCompassAndRadar(game);
      return;
    }

    const isHaywire = (game.empGlitchTimer || 0) > 0;
    const isRad = (game.empKind === "radiation");
    if (isHaywire) {
      // ELECTRONICS HAYWIRE — Speedometer, RPM, Gear, Boost, Temp, Fuel & Coords go completely scrambled!
      const glGear = ["E", "?", "9", "X", "R", "0", "#"][Math.floor(Math.random() * 7)];
      setTxt("hud-speed", Math.random() < 0.25 ? "ERR" : String(Math.floor(Math.random() * 999)));
      setTxt("hud-gear", glGear);
      setTxt("hud-rpm", Math.floor(Math.random() * 14999) + " RPM");
      setTxt("hud-boost", (Math.random() * 88 - 10).toFixed(1) + " PSI");
      setTxt("hud-drivemode", isRad ? "RAD-EMP" : "STATIC");
      setTxt("hud-temp", Math.floor(Math.random() * 499) + "°C");
      setTxt("hud-egt", Math.floor(Math.random() * 1999) + "°C");
      setTxt("hud-fuel", Math.floor(Math.random() * 199) + "%");
      setTxt("hud-engine-hp", Math.random() < 0.4 ? "ERR" : (Math.floor(Math.random() * 100) + "%"));
      const rpmBar = document.getElementById("hud-rpm-bar");
      if (rpmBar) { rpmBar.style.width = Math.floor(Math.random() * 100) + "%"; rpmBar.style.background = isRad ? "#00e5ff" : "#ff3b5c"; }
      setTxt("hud-coords", `???.??km, ???.??km | SIGNAL LOST`);
    } else {
      setTxt("hud-speed", Math.round(v.speedKmh));
      setTxt("hud-gear", v.gear === -1 ? "R" : (v.gear === 0 ? "N" : String(v.gear)));
      setTxt("hud-rpm", Math.round(v.rpm) + " RPM");
      setTxt("hud-boost", v.boostPsi.toFixed(1) + " PSI");
      setTxt("hud-drivemode", v.driveMode + (v.rearLock ? " +RLOCK" : "") + (v.frontLock ? " +FLOCK" : "") + (game.carCruiseOn ? ` • CC ${Math.round(game.carCruiseKmh)}` : ""));
      const rpmPct = Math.min(100, (v.rpm / eng.redlineRpm) * 100);
      const rpmBar = document.getElementById("hud-rpm-bar");
      if (rpmBar) { rpmBar.style.width = rpmPct + "%"; rpmBar.style.background = rpmPct > 86 ? "#ef476f" : "#00e5ff"; }
      // v16.7 CPM2 Analog RPM Needle (-135° -> +125°), Fuel Needle (-65° -> +65°), CEL & Odometer!
      const rpmNeedle = document.getElementById("hud-rpm-needle");
      if (rpmNeedle) {
        const rpmNorm10 = Math.max(0, Math.min(1.0, (v.rpm || 0) / Math.max(7000, eng.redlineRpm * 1.15)));
        const deg = -135 + rpmNorm10 * 260;
        rpmNeedle.setAttribute("transform", `rotate(${deg.toFixed(1)} 110 108)`);
      }
      const fuelNeedle = document.getElementById("hud-fuel-needle");
      if (fuelNeedle) {
        const fFrac = Math.max(0, Math.min(1, (vs.fuel || 0) / Math.max(1, spec.fuelCapacity || 60)));
        fuelNeedle.setAttribute("transform", `rotate(${(-65 + fFrac * 130).toFixed(1)} 110 194)`);
      }
      const celIcon = document.getElementById("hud-cel-icon");
      if (celIcon) {
        const celOn = (engOverall < 68 || v.coolantTemp > 110 || v.hydrolocked);
        celIcon.setAttribute("opacity", celOn ? "1.0" : "0.18");
      }
      const odoKm = (((vs.odometerM || 0) / 1000) || (game.stats ? game.stats.distanceKm : 0)).toFixed(1).padStart(6, "0");
      setTxt("hud-odo", odoKm);
      setTxt("hud-temp", Math.round(v.coolantTemp) + "°C");
      const tempEl = document.getElementById("hud-temp"); if (tempEl) tempEl.style.color = v.coolantTemp > 112 ? "#ff4d6d" : "#dce6f2";
      setTxt("hud-egt", Math.round(v.egtTemp) + "°C");
      const egtEl = document.getElementById("hud-egt"); if (egtEl) egtEl.style.color = v.egtTemp > 890 ? "#ff4d6d" : "#ffb703";
      setTxt("hud-fuel", `${Math.round((vs.fuel / spec.fuelCapacity) * 100)}%`);
      setTxt("hud-engine-hp", `${Math.round(engOverall)}%`);
      setTxt("hud-coords", `${(v.pos.x / 1000).toFixed(2)}km, ${(v.pos.z / 1000).toFixed(2)}km | Dirt ${Math.round((vs.dirtLevel || 0) * 100)}%`);
    }
    setTxt("hud-cash", "$" + Math.floor(game.money).toLocaleString());
    setTxt("hud-time", game.weather.getTimeString());
    setTxt("hud-weather", game.weather.weather.toUpperCase());
    setTxt("hud-biome", game.world.getBiomeName(v.pos.x, v.pos.z));
    setTxt("hud-account-pill", game.account && game.account.username ? ("👤 " + game.account.username) : "👤 GUEST (LOGIN)");

    const cargoBox = document.getElementById("hud-cargo-box");
    if (cargoBox) {
      const totalCargo = v.cargoCount + (game.trailer ? game.trailer.cargoCount : 0);
      if (totalCargo > 0 || game.activeContract || game.trailer) {
        cargoBox.classList.remove("hidden");
        const ac = game.activeContract;
        const needPickup = !!(ac && !ac.pickedUp);
        const targetTown = ac ? (needPickup ? (KK.TOWNS[ac.fromTown] || KK.TOWNS[0]) : (ac.toBar ? { name: "James May's Pub", x: KK.JAMES_MAY_BAR.dockX, z: KK.JAMES_MAY_BAR.dockZ } : KK.TOWNS[ac.toTown])) : null;
        const distTxt = targetTown ? `${(Math.hypot(targetTown.x - v.pos.x, targetTown.z - v.pos.z) / 1000).toFixed(2)} km` : (game.trailer ? `Trailer: ${game.trailer.hitched ? "HITCHED [1]" : "UNHITCHED [1]"}` : "--");
        const trTag = game.trailer ? ` + Tr:${game.trailer.cargoCount}` : "";
        setTxt("hud-cargo-info", needPickup ? `Awaiting Pickup at Origin Dock [F]` : `Load: ${v.cargoCount}${trTag} | ${v.cargoStrapped ? "STRAPPED" : "UNSTRAPPED!"} | Intact: ${v.cargoIntegrity.toFixed(0)}%`);
        setTxt("hud-cargo-dest", targetTown ? `${needPickup ? "PICKUP" : "To"} ${targetTown.name} (${distTxt})` : "Free Cargo Haul");
        const gBar = document.getElementById("hud-gforce-bar");
        if (gBar) { const gp = Math.min(100, (v.peakGForce / 4.0) * 100); gBar.style.width = gp + "%"; gBar.style.background = gp > 55 ? "#ff3b5c" : "#ffd166"; }
      } else { cargoBox.classList.add("hidden"); }
    }

    const wpEl = document.getElementById("hud-waypoint");
    if (wpEl) {
      if (game.waypoint) {
        const dx = game.waypoint.x - v.pos.x, dz = game.waypoint.z - v.pos.z;
        const bearing = (Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360;
        wpEl.textContent = `GPS: ${game.waypoint.label} — ${(Math.hypot(dx, dz) / 1000).toFixed(2)} km (HDG ${Math.round(bearing)}°)`;
        wpEl.classList.remove("hidden");
      } else { wpEl.classList.add("hidden"); }
    }

    this.drawCompassAndRadar(game);

    const cAlert = document.getElementById("cryptid-alert"); if (cAlert) cAlert.classList.add("hidden");

    // Live Multi-Step Timed Repair / Tire-Swap Progress Bar!
    const wBox = document.getElementById("work-progress-box");
    if (wBox) {
      const tw = game.timedWork;
      if (tw) {
        const pct = Math.min(100, Math.round((tw.elapsed / tw.totalDur) * 100));
        const curStep = tw.steps[tw.stepIdx] || tw.steps[tw.steps.length - 1];
        wBox.innerHTML = `<div class="work-title">${tw.title} (${pct}%)</div>
          <div class="work-step">Step ${tw.stepIdx + 1}/${tw.steps.length}: ${curStep.label}</div>
          <div class="work-bar-bg"><div class="work-bar-fill" style="width:${pct}%"></div></div>
          <div class="small muted" style="margin-top:3px;">Press [ESC] to cancel</div>`;
        wBox.classList.remove("hidden");
      } else {
        wBox.classList.add("hidden");
      }
    }

    // Live X-Ray Mechanical Overlay while holding [X]!
    const xPanel = document.getElementById("xray-hud-panel");
    if (xPanel) { xPanel.classList.add("hidden"); return; }
    if (xPanel) {
      if (game.xrayActive) {
        const p = vs.parts;
        const badge = (lbl, val) => {
          const c = val > 68 ? "#00ff88" : (val > 36 ? "#ffd166" : "#ff2a4a");
          return `<div class="xray-item"><span>${lbl}</span><b style="color:${c}">${Math.round(val)}%</b></div>`;
        };
        xPanel.innerHTML = `<div class="xray-title">X-RAY MECHANICAL TELEMETRY (HOLD [X])</div>
          <div class="xray-grid">
            ${badge("Engine/Pistons", (p.pistons.hp + p.headGasket.hp + p.crankshaft.hp) / 3)}
            ${badge("Fuel/Sparks", (p.fuelInjectors.hp + p.sparkPlugs.hp + p.airFilter.hp) / 3)}
            ${badge("Radiator", p.radiator.hp)}
            ${badge("Intercooler", p.intercooler.hp)}
            ${badge("Gearbox/Clutch", (p.gearboxGears.hp + p.clutchPack.hp) / 2)}
            ${badge("Transfer/Shaft", (p.transferCase.hp + p.driveshaft.hp) / 2)}
            ${badge("Shocks Avg", (p.shockFL.hp + p.shockFR.hp + p.shockRL.hp + p.shockRR.hp) / 4)}
            ${badge("Tie-Rods/Brakes", (p.tieRods.hp + p.brakeSystem.hp) / 2)}
          </div>`;
        xPanel.classList.remove("hidden");
      } else {
        xPanel.classList.add("hidden");
      }
    }

    // v14.0B: TOP RED STRIP (#hud-warnings) SHOWS STRICTLY BROKEN / CRITICAL CAR FAULTS ONLY!
    // Zero keybind hints, zero "how to fix" instructions, zero environmental/cryptid warnings!
    this.drawShilkaRadar(game);
    const warns = [];
    const blownList = (vs.blownTires || []).map((b, i) => b ? spec.wheels[i].id : null).filter(Boolean);
    if (blownList.length > 0) warns.push(`BLOWN TIRE (${blownList.join(", ")})`);
    if (vs.burnedOut) warns.push("VEHICLE BURNED OUT — Repair at Garage [F] or Field Repair [F]");
    if (v.hydrolocked) warns.push("ENGINE HYDROLOCKED");
    if (engOverall < 20) warns.push("ENGINE FAILURE");
    if (v.coolantTemp > 114) warns.push("COOLANT OVERHEATING");
    if (v.egtTemp > 895) warns.push("CRITICAL EGT");
    if (v.misfireTimer > 0) warns.push("ENGINE MISFIRE");
    if (Math.abs(vs.health.tieRodBias) > 0.025) warns.push("BENT TIE-ROD");
    if (vs.health.mudClog > 55) warns.push("RADIATOR MUD CLOG");
    if (vs.parts.brakeSystem.hp < 30) warns.push("WORN BRAKES");
    if (vs.parts.clutchPack.hp < 30) warns.push("CLUTCH SLIPPING");
    if ((vs.health.headlightL ?? 100) <= 2 || (vs.health.headlightR ?? 100) <= 2) warns.push("BROKEN HEADLIGHT");
    if (vs.upgrades.ledLightbar && (vs.health.lightbar ?? 100) <= 2) warns.push("ROOF LAMP BROKEN");
    if ((vs.health.taillightL ?? 100) <= 2 || (vs.health.taillightR ?? 100) <= 2) warns.push("BROKEN TAILLIGHT");
    if ((vs.fuel / spec.fuelCapacity) < 0.12) warns.push("CRITICAL FUEL");

    // v14.1A: DEDICATED BOTTOM-RIGHT MILITARY / TANK INTERFACE (Replaces old controls strip!)
    const milEl = getEl("hud-military-panel");
    if (milEl) {
      const vid = vs.vehicleId;
      const isMil = !game.onFoot && (vid === "t72" || vid === "pzkpfw_140a4" || vid === "bm21" || vid === "shilka" || (vid === "btr80" && !!vs.upgrades.btrTurret));
      if (isMil) {
        milEl.classList.remove("hidden");
        let htmlM = "";
        const thMode = game.thermalMode || 0;
        const slewErr = Math.round(game.turretSlewErrorDeg || 0);
        const lockPill = game.turretFrozen ? `<span class="mil-chip warn">🔒 LOCKED</span>` : (slewErr > 2 ? `<span class="mil-chip warn">↻ ${slewErr}°</span>` : `<span class="mil-chip active">⌖ ALIGNED</span>`);

        if (vid === "pzkpfw_140a4") {
          const curSh = vs.p140ShellType || "ap140";
          const shells = [
            ["ap140",    "APFSDS",   vs.p140ApAmmo || 0],
            ["hesh140",  "HESH",     vs.p140HeshAmmo || 0],
            ["therm140", "THERM",    vs.p140ThermAmmo || 0],
            ["rlg140",   "RLG-140K", vs.p140RlgAmmo || 0]
          ];
          const rRem = game.t72ReloadTimer || 0, rTot = game.t72ReloadTotal || 4.8;
          const rPct = rRem > 0 ? Math.max(0, Math.min(100, (1 - rRem / rTot) * 100)) : 100;
          const thLbl = ["DAY", "TRI-FLIR", "RED NVD"][thMode];
          htmlM = `
            <div class="mil-row-top">
              <span class="mil-title" style="color:#ff5c77;">Rh-140/56 ETC</span>
              <div class="mil-bar-wrap"><div class="mil-bar-fill" style="width:${rPct.toFixed(0)}%;background:${rRem > 0 ? "#ffb703" : "#2de08b"};"></div><span>${rRem > 0 ? "RAM " + rRem.toFixed(1) + "s" : "READY"}</span></div>
              ${lockPill}
            </div>
            <div class="mil-chips">${shells.map(([id, nm, cnt]) => `<span class="mil-chip ${curSh === id ? "active" : ""}">${nm} <b>${cnt}</b></span>`).join("")}</div>
            <div class="mil-sub">40mm AutoKanone: <b>${vs.p140AutoAmmo || 0}</b> • APS: <b style="color:#00f5ff;">DONNERSCHILD A7</b> • <b>${thLbl}</b></div>`;
        } else if (vid === "t72") {
          const curSh = vs.t72ShellType || "he";
          const shells = [["he", "HE-FRAG", vs.t72HeAmmo || 0], ["ap", "APFSDS", vs.t72ApAmmo || 0]];
          if (vs.upgrades.t72SeismicFcs) shells.push(["therm", "3BK-THERM", vs.t72ThermAmmo || 0]);
          const rRem = game.t72ReloadTimer || 0, rTot = game.t72ReloadTotal || 6.5;
          const rPct = rRem > 0 ? Math.max(0, Math.min(100, (1 - rRem / rTot) * 100)) : 100;
          const thLbl = ["DAY", "FLIR", "NVG"][thMode];
          const snOn = !!(vs.upgrades.t72Snorkel && !(vs.stowedUpgrades && vs.stowedUpgrades.t72Snorkel));
          htmlM = `
            <div class="mil-row-top">
              <span class="mil-title">2A46M 125mm</span>
              <div class="mil-bar-wrap"><div class="mil-bar-fill" style="width:${rPct.toFixed(0)}%;background:${rRem > 0 ? "#ffb703" : "#2de08b"};"></div><span>${rRem > 0 ? "LOAD " + rRem.toFixed(1) + "s" : "READY"}</span></div>
              ${lockPill}
            </div>
            <div class="mil-chips">${shells.map(([id, nm, cnt]) => `<span class="mil-chip ${curSh === id ? "active" : ""}">${nm} <b>${cnt}</b></span>`).join("")}</div>
            <div class="mil-sub">14.5mm: <b>${vs.t72CoaxAmmo || 0}</b> • Smoke: <b>${vs.t72SmokeCharges || 0}</b> • ${thLbl}${vs.upgrades.t72Snorkel ? ` • Snorkel [6]: <b>${snOn ? "UP" : "STOWED"}</b>` : ""}</div>`;
        } else if (vid === "bm21") {
          const fm = vs.bm21FireMode === "salvo" ? "10-ROCKET SALVO" : "SINGLE SHOT";
          htmlM = `
            <div class="mil-row-top"><span class="mil-title">BM-21 GRAD 122mm</span>${lockPill}</div>
            <div class="mil-chips"><span class="mil-chip active">ROCKETS <b>${vs.bm21Rockets || 0}/40</b></span><span class="mil-chip">${fm}</span></div>`;
        } else if (vid === "shilka") {
          const thLbl = ["DAY", "FLIR", "NVG"][thMode];
          htmlM = `
            <div class="mil-row-top"><span class="mil-title">ZSU-23-4 QUAD-23mm</span>${lockPill}</div>
            <div class="mil-chips"><span class="mil-chip active">23mm <b>${vs.shilkaAmmo || 0}/800</b></span><span class="mil-chip ${game.shilkaRadarOn ? "active" : ""}">RADAR ${game.shilkaRadarOn ? "ON" : "OFF"}</span><span class="mil-chip">${thLbl}</span></div>`;
        } else {
          const thLbl = ["DAY", "FLIR", "NVG"][thMode];
          htmlM = `
            <div class="mil-row-top"><span class="mil-title">BTR-80 KPVT 14.5mm</span>${lockPill}</div>
            <div class="mil-chips"><span class="mil-chip active">14.5mm <b>${vs.btrAmmo || 0}/120</b></span><span class="mil-chip">${thLbl}</span></div>`;
        }
        milEl.innerHTML = htmlM;
      } else {
        milEl.classList.add("hidden");
      }
    }
    const warnEl = document.getElementById("hud-warnings");
    if (warnEl) warnEl.textContent = warns.join("  •  ");
  }


  // LIVE 360° ZSU-23-4 "SHILKA" 1RL33 MOVING-TARGET CRYPTID & TORNADO RADAR SCOPE (1,200m range!)
  drawShilkaRadar(game) {
    const wrap = document.getElementById("shilka-radar-wrap");
    const cv = document.getElementById("shilka-radar-canvas");
    if (!wrap || !cv) return;
    const show = (!game.photoMode && !game.onFoot && !game.ridingWithPeerId &&
                  game.vehicle && game.vehicle.vState.vehicleId === "shilka" && !!game.shilkaRadarOn);
    wrap.classList.toggle("hidden", !show);
    if (!show) return;

    const ctx = cv.getContext("2d");
    const W = cv.width, H = cv.height, cx = W * 0.5, cy = H * 0.5, R = W * 0.45;
    const rangeM = 1200;

    ctx.fillStyle = "#04130a"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(45, 224, 139, 0.28)"; ctx.lineWidth = 1;
    for (const frac of [0.33, 0.66, 1.0]) {
      ctx.beginPath(); ctx.arc(cx, cy, R * frac, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy);
    ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R);
    ctx.stroke();

    // Rotating phosphor radar sweep cone
    const sweepAng = (performance.now() * 0.0038) % (Math.PI * 2);
    ctx.fillStyle = "rgba(45, 224, 139, 0.20)";
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, sweepAng - 0.55, sweepAng);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#45ff9a"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweepAng) * R, cy + Math.sin(sweepAng) * R); ctx.stroke();

    // Plot active cryptids & tornadoes relative to Shilka heading!
    const px = game.vehicle.pos.x, pz = game.vehicle.pos.z;
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(game.vehicle.quat);
    const headAng = Math.atan2(fwd.x, fwd.z);
    let hits = 0;

    const plotTarget = (tx, tz, lbl, col) => {
      const dx = tx - px, dz = tz - pz;
      const dist = Math.hypot(dx, dz);
      if (dist > rangeM) return;
      hits++;
      const worldAng = Math.atan2(dx, dz);
      const relAng = worldAng - headAng;
      const rr = (dist / rangeM) * R;
      const bx = cx - Math.sin(relAng) * rr;
      const by = cy - Math.cos(relAng) * rr;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(bx, by, 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.font = "bold 9px monospace";
      ctx.fillText(`${lbl} ${Math.round(dist)}m`, bx + 6, by + 3);
    };

    if (game.cryptids && game.cryptids.allList) {
      for (const c of game.cryptids.allList) {
        if (c.state === "dormant") continue;
        const lbl = c.kind === "sirenhead" ? "SIREN" : (c.kind === "godzilla" ? "KAIJU" : (c.kind === "sandworm" ? "WYRM" : c.kind.toUpperCase()));
        plotTarget(c.gx, c.gz, lbl, c.kind === "godzilla" ? "#00f5ff" : "#ff3b5c");
      }
    }
    if (game.hazards && game.hazards.tornado) {
      plotTarget(game.hazards.tornado.gx, game.hazards.tornado.gz, `EF${game.hazards.tornado.ef || 3}`, "#ffd166");
    }

    ctx.fillStyle = "#63ff9f"; ctx.font = "bold 9.5px monospace";
    ctx.fillText(`1RL33 RPK-2 • 1.2KM • ${hits} CONTACTS`, 8, H - 6);
  }
};
