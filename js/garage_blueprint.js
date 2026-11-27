// ============================================================================
// js/garage_blueprint.js (v13.8) — Interactive 2D Car Blueprint Workbench,
// Brand/Material Color-Coded Modules, Contextual Tuning & Quick Presets!
// ============================================================================
window.KK = window.KK || {};

KK.GarageBlueprint = {
  MODULES: [
    // --- FRONT BUMPER & COOLING ---
    { id: "addon_front",     kind: "addon", cat: "addons",       x: 210, y: 34,  w: 136, h: 28, short: "BULLBAR / WINCH",  label: "Front Armor & Winch" },
    { id: "intercooler",     kind: "part",  cat: "engine",       x: 210, y: 74,  w: 108, h: 26, short: "INTERCOOLER" },
    { id: "radiator",        kind: "part",  cat: "engine",       x: 210, y: 106, w: 120, h: 26, short: "RADIATOR" },

    // --- FRONT SUSPENSION, STEERING & BRAKES ---
    { id: "shockFL",         kind: "part",  cat: "suspension",   x: 78,  y: 136, w: 72,  h: 34, short: "FL SHOCK" },
    { id: "shockFR",         kind: "part",  cat: "suspension",   x: 342, y: 136, w: 72,  h: 34, short: "FR SHOCK" },
    { id: "tieRods",         kind: "part",  cat: "suspension",   x: 146, y: 144, w: 80,  h: 26, short: "TIE-RODS" },
    { id: "antiRollBar",     kind: "part",  cat: "suspension",   x: 274, y: 144, w: 80,  h: 26, short: "SWAY BAR" },
    { id: "brakeSystem",     kind: "part",  cat: "suspension",   x: 78,  y: 178, w: 72,  h: 30, short: "BRAKES" },
    { id: "wheelHubs",       kind: "part",  cat: "suspension",   x: 342, y: 178, w: 72,  h: 30, short: "HUBS" },

    // --- ENGINE BAY (LEFT = FUEL/AIR, CENTER = BLOCK/INTERNALS, RIGHT = COOLING/EXHAUST) ---
    { id: "airFilter",       kind: "part",  cat: "engine",       x: 136, y: 184, w: 68,  h: 28, short: "AIR INTAKE" },
    { id: "fuelRails",       kind: "part",  cat: "engine",       x: 136, y: 218, w: 68,  h: 28, short: "FUEL RAIL" },
    { id: "fuelInjectors",   kind: "part",  cat: "engine",       x: 136, y: 252, w: 68,  h: 28, short: "INJECTORS" },
    { id: "sparkPlugs",      kind: "part",  cat: "engine",       x: 136, y: 286, w: 68,  h: 26, short: "SPARKS" },

    { id: "engine_swap",     kind: "swap",  cat: "engine",       x: 210, y: 182, w: 72,  h: 28, short: "ENGINE SWAP", label: "Powerplant & Swaps" },
    { id: "pistons",         kind: "part",  cat: "engine",       x: 210, y: 216, w: 72,  h: 28, short: "PISTONS" },
    { id: "camshaft",        kind: "part",  cat: "engine",       x: 210, y: 250, w: 72,  h: 28, short: "CAMSHAFT" },
    { id: "crankshaft",      kind: "part",  cat: "engine",       x: 210, y: 284, w: 72,  h: 28, short: "CRANK" },

    { id: "waterPump",       kind: "part",  cat: "engine",       x: 284, y: 184, w: 68,  h: 28, short: "W-PUMP" },
    { id: "headGasket",      kind: "part",  cat: "engine",       x: 284, y: 218, w: 68,  h: 28, short: "HEAD GSKT" },
    { id: "exhaustManifold", kind: "part",  cat: "engine",       x: 284, y: 254, w: 68,  h: 34, short: "TURBO / EXH" },

    // --- CENTER DRIVETRAIN TUNNEL ---
    { id: "flywheel",        kind: "part",  cat: "transmission", x: 162, y: 332, w: 76,  h: 28, short: "FLYWHEEL" },
    { id: "clutchPack",      kind: "part",  cat: "transmission", x: 258, y: 332, w: 76,  h: 28, short: "CLUTCH" },
    { id: "gearboxGears",    kind: "part",  cat: "transmission", x: 210, y: 368, w: 106, h: 32, short: "GEARBOX" },
    { id: "transferCase",    kind: "part",  cat: "transmission", x: 210, y: 408, w: 106, h: 30, short: "4WD / DIFFS" },
    { id: "driveshaft",      kind: "part",  cat: "transmission", x: 210, y: 446, w: 94,  h: 26, short: "DRIVESHAFT" },

    // --- EXPEDITION ROOF ADD-ONS ---
    { id: "addon_roof",      kind: "addon", cat: "addons",       x: 342, y: 342, w: 74,  h: 48, short: "ROOF / LED",  label: "Snorkel & LED Bar" },

    // --- REAR SUSPENSION & TIRES ---
    { id: "shockRL",         kind: "part",  cat: "suspension",   x: 78,  y: 472, w: 72,  h: 34, short: "RL SHOCK" },
    { id: "shockRR",         kind: "part",  cat: "suspension",   x: 342, y: 472, w: 72,  h: 34, short: "RR SHOCK" },
    { id: "coilSprings",     kind: "part",  cat: "suspension",   x: 210, y: 486, w: 112, h: 30, short: "COIL SPRINGS" },
    { id: "tires_psi",       kind: "tires", cat: "suspension",   x: 210, y: 534, w: 152, h: 32, short: "TIRES & PSI",  label: "Tires, Spares & PSI" }
  ],

  _hpColor(hp) {
    if (hp < 30) return "#ff3b5c";
    if (hp < 65) return "#ffd166";
    return "#2de08b";
  },

  _materialName(brandId) {
    const map = {
      krasnyscrap: "Salvaged Scrap Iron",
      volgaworks:  "Factory Cast Steel",
      boreal:      "Hardened Siberian Alloy",
      kurogane:    "Forged Rally Chromoly",
      valkyrie:    "CNC Billet Titanium"
    };
    return map[brandId] || "Factory Steel";
  },

  renderWorkbench(ui, vs, spec, totalRepairCost, fuelCost) {
    const filter = ui.bpFilter || "all";
    const selId = ui.selectedModuleId || "pistons";
    const curEng = KK.ENGINES[vs.engineId];

    let avgHp = 0, wornCnt = 0;
    const brandCounts = {};
    for (const pid of Object.keys(KK.PARTS_CATALOG)) {
      const p = vs.parts[pid];
      avgHp += p.hp;
      if (p.hp < 55) wornCnt++;
      brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
    }
    avgHp = Math.round(avgHp / Object.keys(KK.PARTS_CATALOG).length);

    const svgNodes = this.MODULES.map((m) => {
      const isSelected = (m.id === selId);
      const dimmed = (filter !== "all" && m.cat !== filter);
      const opacity = dimmed ? 0.24 : 1.0;

      let strokeCol = "#5c768f";
      let fillCol = "#16202c";
      let badgeTxt = "";
      let hpPct = 100;
      let showHpBar = false;
      let isCritical = false;

      if (m.kind === "part") {
        const pState = vs.parts[m.id];
        const br = KK.BRANDS[pState.brand] || KK.BRANDS.volgaworks;
        strokeCol = br.color;
        fillCol = br.color + "22";
        badgeTxt = br.short;
        hpPct = Math.round(pState.hp);
        showHpBar = true;
        isCritical = hpPct < 35;
      } else if (m.kind === "swap") {
        strokeCol = "#00e5ff";
        fillCol = "#00e5ff1e";
        badgeTxt = curEng.stockHp + " HP";
        hpPct = Math.round(KK.getEngineOverallHealth(vs));
        showHpBar = true;
      } else if (m.kind === "addon") {
        const listIds = (vs.vehicleId === "t72")
          ? (m.id === "addon_front" ? ["t72Kontakt5", "t72EmpShield", "hdWinch"] : ["t72Snorkel", "t72AcousticJammer", "t72SeismicFcs"])
          : (m.id === "addon_front" ? ["bullbar", "hdWinch"] : ["snorkel", "ledLightbar"]);
        const cnt = listIds.filter((id) => !!vs.upgrades[id]).length;
        strokeCol = cnt === listIds.length ? "#2de08b" : (cnt > 0 ? "#ffd166" : "#647a91");
        fillCol = cnt > 0 ? "#2de08b1f" : "#151f2b";
        badgeTxt = `${cnt}/${listIds.length} ON`;
      } else if (m.kind === "tires") {
        const blownCnt = (vs.blownTires || []).filter(Boolean).length;
        const avgT = (vs.tiresHP || [100]).reduce((a, b) => a + b, 0) / Math.max(1, (vs.tiresHP || [100]).length);
        hpPct = Math.round(avgT);
        showHpBar = true;
        isCritical = blownCnt > 0 || hpPct < 35;
        const tb = KK.TIRE_BRANDS[vs.tireBrand] || KK.TIRE_BRANDS.volgaworks;
        const tc = KK.TIRE_COMPOUNDS[vs.tireCompound] || KK.TIRE_COMPOUNDS.all_terrain;
        strokeCol = blownCnt > 0 ? "#ff3b5c" : tb.color;
        fillCol = blownCnt > 0 ? "#ff3b5c2a" : (tb.color + "22");
        badgeTxt = blownCnt > 0 ? `${blownCnt} FLAT!` : `${tb.short} ${tc.short}`;
      }

      const rx = m.x - m.w * 0.5;
      const ry = m.y - m.h * 0.5;
      const hpCol = this._hpColor(hpPct);
      const bw = Math.max(2, ((m.w - 8) * Math.max(0, Math.min(100, hpPct))) / 100);

      return `
        <g class="bp-node ${isSelected ? "selected" : ""} ${isCritical ? "crit" : ""}" style="opacity:${opacity};"
           onclick="window.__GAME__.ui.selectBlueprintModule('${m.id}')">
          ${isSelected ? `<rect x="${rx - 3}" y="${ry - 3}" width="${m.w + 6}" height="${m.h + 6}" rx="8" fill="none" stroke="#00f5ff" stroke-width="2.4"/>` : ""}
          <rect x="${rx}" y="${ry}" width="${m.w}" height="${m.h}" rx="5" fill="${fillCol}" stroke="${strokeCol}" stroke-width="${isSelected ? 2.2 : 1.5}"/>
          <text x="${m.x}" y="${ry + 11}" text-anchor="middle" fill="#f0f6fc" font-family="monospace" font-size="8.6" font-weight="800">${m.short}</text>
          <text x="${m.x}" y="${ry + 21}" text-anchor="middle" fill="${strokeCol}" font-family="monospace" font-size="7.4" font-weight="700">${badgeTxt}</text>
          ${showHpBar ? `
            <rect x="${rx + 4}" y="${ry + m.h - 5}" width="${m.w - 8}" height="3" rx="1.5" fill="#0c1219"/>
            <rect x="${rx + 4}" y="${ry + m.h - 5}" width="${bw}" height="3" rx="1.5" fill="${hpCol}"/>
          ` : ""}
        </g>`;
    }).join("");

    const isTank = !!spec.isTracked;
    const wCount = spec.wheels.length;
    const wheelYPos = isTank ? [115, 185, 255, 325, 395, 465] : (wCount >= 8 ? [138, 224, 396, 474] : (wCount >= 6 ? [142, 412, 480] : [142, 474]));
    const wheelsSvg = (isTank ? `
      <rect x="18"  y="76" width="38" height="442" rx="6" fill="#18201a" stroke="#6b8e4e" stroke-width="2.2"/>
      <rect x="364" y="76" width="38" height="442" rx="6" fill="#18201a" stroke="#6b8e4e" stroke-width="2.2"/>
    ` : "") + wheelYPos.map((wy, rowIdx) => {
      const iL = rowIdx * 2, iR = rowIdx * 2 + 1;
      const bL = !!(vs.blownTires && vs.blownTires[iL]);
      const bR = !!(vs.blownTires && vs.blownTires[iR]);
      return `
        <rect x="22"  y="${wy - 22}" width="26" height="44" rx="5" fill="${bL ? '#4a151f' : '#1b232e'}" stroke="${bL ? '#ff3b5c' : '#4a5f75'}" stroke-width="1.6"/>
        <rect x="372" y="${wy - 22}" width="26" height="44" rx="5" fill="${bR ? '#4a151f' : '#1b232e'}" stroke="${bR ? '#ff3b5c' : '#4a5f75'}" stroke-width="1.6"/>
        <line x1="48" y1="${wy}" x2="372" y2="${wy}" stroke="#2b3d52" stroke-width="2" stroke-dasharray="4 4"/>`;
    }).join("");

    const filterBtn = (fid, lbl) => `<button class="sub-tab-btn ${filter === fid ? "active" : ""}" onclick="window.__GAME__.ui.bpFilter='${fid}'; window.__GAME__.ui.renderGarage();">${lbl}</button>`;
    const inspectorHtml = this._renderInspector(ui, selId, vs, spec);

    const legendHtml = KK.BRAND_ORDER.map((bid) => {
      const b = KK.BRANDS[bid];
      const cnt = brandCounts[bid] || 0;
      return `<span class="bp-legend-item" style="border-color:${b.color};color:${b.color};" title="${b.name} — ${this._materialName(bid)} | Perf ${Math.round(b.perfMult * 100)}% | Wear ${b.wearMult}x">
        <span class="bp-dot" style="background:${b.color};"></span><b>${b.short}</b> <span class="muted">(${cnt})</span>
      </span>`;
    }).join("");

    return `
      <div class="bp-topbar">
        <div class="bp-car-pill">
          <strong style="color:#00e5ff;">${spec.name}</strong>
          <span class="small muted">• ${curEng.name} • Avg Health: <b style="color:${this._hpColor(avgHp)};">${avgHp}%</b>${wornCnt > 0 ? ` • <b style="color:#ff5c77;">${wornCnt} Worn</b>` : ""}</span>
        </div>
        <div class="btn-row">
          <button class="btn accent small" onclick="window.__GAME__.garageFullRepair(${totalRepairCost})">🔧 OVERHAUL ALL ($${totalRepairCost.toLocaleString()})</button>
          <button class="btn small" onclick="window.__GAME__.garageRefuel(${fuelCost})">⛽ REFUEL ($${fuelCost})</button>
          ${vs.vehicleId === "t72" ? `<button class="btn warn small" onclick="window.__GAME__.ui.selectBlueprintModule('addon_roof')">☢ T-72B CLASSIFIED UPGRADES</button>` : ""}
          ${(vs.vehicleId === "t72" || vs.vehicleId === "harimau" || vs.vehicleId === "komodo_turret" || vs.vehicleId === "komodo_std" || vs.vehicleId === "bm21" || vs.vehicleId === "shilka" || vs.vehicleId === "pzkpfw_140a4") ? `<button class="btn primary small" onclick="window.__GAME__.resupplyTankAmmo()">💣 RESUPPLY ORDNANCE ${vs.vehicleId === "pzkpfw_140a4" ? "(FREE)" : "($1,800)"}</button>` : ""}
        </div>
      </div>

      <div class="bp-legend-bar">
        <span class="small muted" style="font-weight:700;">MATERIAL / BRAND KEY:</span>
        ${legendHtml}
      </div>

      <div class="bp-layout">
        <div class="bp-canvas-panel">
          <div class="bp-filter-row">
            ${filterBtn("all", "ALL MODULES")}
            ${filterBtn("engine", "ENGINE")}
            ${filterBtn("transmission", "DRIVETRAIN")}
            ${filterBtn("suspension", "SUSPENSION")}
            ${filterBtn("addons", "ADD-ONS")}
          </div>

          <div class="bp-svg-wrap">
            <svg viewBox="0 0 420 580" class="bp-svg">
              <defs>
                <pattern id="bpGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(75,130,180,0.10)" stroke-width="1"/>
                </pattern>
              </defs>
              <rect x="0" y="0" width="420" height="580" fill="#0b1118"/>
              <rect x="0" y="0" width="420" height="580" fill="url(#bpGrid)"/>

              <line x1="210" y1="10" x2="210" y2="570" stroke="rgba(0,229,255,0.14)" stroke-dasharray="6 4"/>
              <text x="16" y="20" fill="#4f6c8a" font-family="monospace" font-size="9" font-weight="700">▲ FRONT</text>
              <text x="16" y="568" fill="#4f6c8a" font-family="monospace" font-size="9" font-weight="700">▼ REAR</text>
              <text x="404" y="20" text-anchor="end" fill="#4f6c8a" font-family="monospace" font-size="9">${spec.driveType}</text>

              ${wheelsSvg}

              ${isTank ? `
                <!-- T-72B ARMORED HULL, CAST DOME TURRET & 125mm 2A46M BARREL -->
                <rect x="68" y="64" width="284" height="466" rx="14" fill="rgba(34, 46, 28, 0.76)" stroke="#6b8e4e" stroke-width="2.4"/>
                <circle cx="210" cy="272" r="88" fill="rgba(48, 66, 38, 0.35)" stroke="#85b865" stroke-width="2.2" stroke-dasharray="6 3"/>
                <rect x="202" y="10" width="16" height="190" rx="4" fill="rgba(120, 145, 110, 0.42)" stroke="#a3c98a" stroke-width="1.6"/>
                <text x="210" y="52" text-anchor="middle" fill="#a3c98a" font-family="monospace" font-size="8" font-weight="800">125mm 2A46M</text>
              ` : `
                <path d="M 102 48 Q 210 18 318 48 L 350 96 L 356 492 Q 354 548 310 554 L 110 554 Q 66 548 64 492 L 70 96 Z"
                      fill="rgba(22, 34, 48, 0.72)" stroke="#3b5875" stroke-width="2.2"/>
              `}
              <path d="M 96 168 L 324 168 L 336 226 L 84 226 Z" fill="rgba(0, 229, 255, 0.04)" stroke="#2c445c" stroke-width="1.2"/>
              <path d="M 96 312 L 324 312 L 328 456 L 92 456 Z" fill="rgba(16, 26, 36, 0.50)" stroke="#273b4f" stroke-width="1.2" stroke-dasharray="3 3"/>
              <line x1="210" y1="210" x2="210" y2="495" stroke="#425a70" stroke-width="6" stroke-linecap="round"/>
              <line x1="284" y1="265" x2="284" y2="545" stroke="#614232" stroke-width="3.5" stroke-dasharray="5 3"/>

              ${svgNodes}
            </svg>
          </div>
          <div class="small muted" style="text-align:center;margin-top:4px;">Click any module on the car to inspect, repair, swap material quality, or tune!</div>
        </div>

        <div class="bp-inspector-panel">
          ${inspectorHtml}
        </div>
      </div>`;
  },

  _renderInspector(ui, selId, vs, spec) {
    const mod = this.MODULES.find((m) => m.id === selId) || this.MODULES[0];
    const curEng = KK.ENGINES[vs.engineId];

    if (mod.kind === "swap") {
      const compatList = spec.compatibleEngines || Object.keys(KK.ENGINES);
      const maxBoost = vs.upgrades.twinTurboKit ? 30 : (vs.upgrades.turboKit ? 24 : (curEng.stockTurbo ? (curEng.stockBoostPsi || 14) : 0));
      return `
        <div class="insp-head" style="border-color:#00e5ff;">
          <div>
            <div class="insp-kicker" style="color:#00e5ff;">POWERPLANT CORE &amp; FORCED INDUCTION</div>
            <h4>${curEng.name}</h4>
          </div>
          <span class="badge">${curEng.fuelType.toUpperCase()}</span>
        </div>
        <div class="insp-metrics">
          <div><span>Stock Power</span><b>${curEng.stockHp} HP</b></div>
          <div><span>Base Torque</span><b>${curEng.baseTorqueNm} Nm</b></div>
          <div><span>Redline</span><b>${curEng.redlineRpm} RPM</b></div>
          <div><span>Engine Health</span><b style="color:${this._hpColor(KK.getEngineOverallHealth(vs))}">${KK.getEngineOverallHealth(vs).toFixed(0)}%</b></div>
        </div>
        <div class="insp-section">
          <div class="slider-group">
            <label>Turbo Boost Pressure: <b id="val-boost">${vs.tuning.boostPsi.toFixed(1)} PSI</b> ${maxBoost === 0 ? "(Install Turbo below)" : ""}</label>
            <input type="range" min="0" max="${Math.max(1, maxBoost)}" step="0.5" value="${vs.tuning.boostPsi}" ${maxBoost === 0 ? "disabled" : ""}
              oninput="window.__GAME__.setTune('boostPsi', parseFloat(this.value))" />
          </div>
          <div class="btn-row" style="margin-top:6px;">
            ${!vs.upgrades.turboKit && !vs.upgrades.twinTurboKit ? `<button class="btn accent small" onclick="window.__GAME__.buyUpgrade('turboKit')">+ SINGLE TURBO ($${KK.UPGRADES.turboKit.price.toLocaleString()})</button>` : ""}
            ${!vs.upgrades.twinTurboKit ? `<button class="btn warn small" onclick="window.__GAME__.buyUpgrade('twinTurboKit')">+ TWIN-TURBO 30 PSI ($${KK.UPGRADES.twinTurboKit.price.toLocaleString()})</button>` : `<span class="tag-ok">✓ TWIN-TURBO ACTIVE</span>`}
          </div>
        </div>
        <div class="insp-section">
          <div class="insp-sec-title">COMPATIBLE ENGINE SWAPS</div>
          <div class="upgrade-list" style="max-height:245px;">
            ${compatList.map((eid) => {
              const e = KK.ENGINES[eid]; if (!e) return "";
              const inst = (vs.engineId === eid), isFac = (spec.stockEngineId === eid);
              return `<div class="upg-row ${inst ? "installed" : ""}">
                <div><b>${e.name}</b> ${isFac ? '<span class="badge">FACTORY</span>' : ''}
                  <div class="small muted">${e.stockHp} HP • ${e.baseTorqueNm} Nm • ${e.redlineRpm} RPM</div></div>
                ${inst ? `<span class="tag-ok">ACTIVE</span>` : `<button class="btn accent small" onclick="window.__GAME__.installEngine('${eid}')">$${isFac ? 0 : e.price.toLocaleString()}</button>`}
              </div>`;
            }).join("")}
          </div>
        </div>`;
    }

    if (mod.kind === "addon") {
      const uids = (vs.vehicleId === "pzkpfw_140a4") ? (mod.id === "addon_front" ? ["sturmKit", "hdWinch"] : ["ledLightbar"]) : (vs.vehicleId === "t72")
        ? (mod.id === "addon_front" ? ["t72Kontakt5", "t72EmpShield", "hdWinch", "bullbar"] : ["t72Snorkel", "t72AcousticJammer", "t72SeismicFcs", "ledLightbar"])
        : (mod.id === "addon_front" ? ["bullbar", "hdWinch"] : ["snorkel", "ledLightbar"]);
      return `
        <div class="insp-head" style="border-color:#2de08b;">
          <div>
            <div class="insp-kicker" style="color:#2de08b;">CHASSIS EXPEDITION HARDWARE</div>
            <h4>${mod.label}</h4>
          </div>
        </div>
        <div class="insp-section">
          <div class="upgrade-list">
            ${uids.map((uid) => {
              const u = KK.UPGRADES[uid], has = !!vs.upgrades[uid];
              return `<div class="upg-row ${has ? "installed" : ""}">
                <div><b>${(spec.isTracked && uid === "ledLightbar") ? "OU-3GK Turret-Mounted Xenon Searchlight ([K])" : u.name}</b><div class="small muted">${(spec.isTracked && uid === "ledLightbar") ? "Armored turret spotlight with volumetric beam that sweeps with your tank turret (visible on LAN!)" : u.desc}</div></div>
                ${has
                  ? ((uid === "t72Snorkel" || uid === "snorkel" || uid === "sturmKit" || uid === "bullbar")
                    ? `<button class="btn small ${(vs.stowedUpgrades && vs.stowedUpgrades[uid]) ? "primary" : "warn"}" onclick="window.__GAME__.toggleStowUpgrade('${uid}')">${(vs.stowedUpgrades && vs.stowedUpgrades[uid]) ? "MOUNT (FREE)" : "REMOVE / STOW"}</button>`
                    : `<span class="tag-ok">INSTALLED</span>`)
                  : `<button class="btn accent small" onclick="window.__GAME__.buyUpgrade('${uid}')">$${u.price.toLocaleString()}</button>`}
              </div>`;
            }).join("")}
          </div>
        </div>
        <div class="info-box small" style="margin-top:10px;">
          ${vs.vehicleId === "pzkpfw_140a4" ? `
          <div style="margin-bottom:8px;padding:8px;background:#1a1012;border:1px solid #d62828;border-radius:6px;">
            <b style="color:#ff5c77;">PzKpfw 140A4 "SCHRECKENSFÜRST" — SILVER DIRECTIVE SYSTEMS</b><br/>
            • <b>140mm Rh-140/56 ETC:</b> APFSDS ${vs.p140ApAmmo || 0}/14 | HESH ${vs.p140HeshAmmo || 0}/10 | THERM ${vs.p140ThermAmmo || 0}/8 | RLG-140K ${vs.p140RlgAmmo || 0}/8<br/>
            • <b>Remote 40mm AutoKanone:</b> ${vs.p140AutoAmmo || 0}/240 rds &nbsp;|&nbsp; <b>APS:</b> Donnerschild A7 (EMP-Immune)<br/>
            • <b>Optics:</b> Zielfalken-IV Tri-Band FLIR + Crimson RED NVD (<b>[Z]</b>)<br/>
            <button class="btn primary small" style="margin-top:6px;" onclick="window.__GAME__.resupplyTankAmmo()">💣 RESUPPLY 140mm &amp; 40mm ORDNANCE (FREE)</button>
          </div>` : (vs.vehicleId === "t72" ? `
          <div style="margin-bottom:8px;padding:8px;background:#101a12;border:1px solid #6b8e4e;border-radius:6px;">
            <b style="color:#a3c98a;">T-72B ARMORED SYSTEMS &amp; ORDNANCE</b><br/>
            • <b>125mm 3OF26 HE-Frag:</b> ${vs.t72HeAmmo || 0}/18 rds &nbsp;|&nbsp; <b>3BM42 APFSDS:</b> ${vs.t72ApAmmo || 0}/14 rds${vs.upgrades.t72SeismicFcs ? ` &nbsp;|&nbsp; <b style="color:#ff7b1c;">3BK-THERM:</b> ${vs.t72ThermAmmo || 0}/10 rds` : ""}<br/>
            • <b>14.5mm Roof Heavy MG:</b> ${vs.t72CoaxAmmo || 0}/300 rds &nbsp;|&nbsp; <b>81mm Tucha Smoke:</b> ${vs.t72SmokeCharges || 0}/4 salvos<br/>
            • <b>Optics:</b> 1A40 Laser Rangefinder + FLIR White-Hot Thermal + 1PN51 Green NVG (<b>[Z]</b>)<br/>
            <button class="btn primary small" style="margin-top:6px;" onclick="window.__GAME__.resupplyTankAmmo()">💣 RESUPPLY ALL SHELLS &amp; SMOKE ($1,800)</button>
          </div>` : "")}
          <b>Headlight Integrity:</b> Left ${Math.round(vs.health.headlightL ?? 100)}% • Right ${Math.round(vs.health.headlightR ?? 100)}%<br/>
          <i>Installing a Steel Bullbar cuts tree, boulder, deer &amp; Yeti front-end damage by 65%!</i>
        </div>`;
    }

    if (mod.kind === "tires") {
      const t = vs.tuning;
      const curComp = KK.TIRE_COMPOUNDS[vs.tireCompound] || KK.TIRE_COMPOUNDS.all_terrain;
      const curBr   = KK.TIRE_BRANDS[vs.tireBrand] || KK.TIRE_BRANDS.volgaworks;
      const wheelCards = spec.wheels.map((wDef, i) => {
        const blown = !!(vs.blownTires && vs.blownTires[i]);
        const hp = Math.round((vs.tiresHP && vs.tiresHP[i] !== undefined) ? vs.tiresHP[i] : 100);
        return `<div class="tire-mini-chip ${blown ? "blown" : ""}">
          <b>${wDef.id}</b>
          <span style="color:${blown ? '#ff3b5c' : this._hpColor(hp)};">${blown ? "BLOWN!" : hp + "%"}</span>
        </div>`;
      }).join("");

      const compCards = Object.values(KK.TIRE_COMPOUNDS).map((tc) => {
        const isCur = (vs.tireCompound === tc.id);
        return `<div class="insp-brand-card ${isCur ? "current" : ""}" style="border-color:${isCur ? "#00e5ff" : "#2c3e50"};background:${isCur ? "#00e5ff1c" : "#111923"};"
          onclick="window.__GAME__.installTireCompound('${tc.id}')">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong style="color:#eef5fc;font-size:12px;">${tc.name}</strong>
            ${isCur ? `<span class="tag-ok" style="font-size:10px;">MOUNTED</span>` : `<b style="color:#ffd166;font-size:12px;">$${tc.price.toLocaleString()}</b>`}
          </div>
          <div class="small muted">${tc.desc}</div>
        </div>`;
      }).join("");

      const brandCards = KK.BRAND_ORDER.map((bid) => {
        const tb = KK.TIRE_BRANDS[bid];
        const isCur = (vs.tireBrand === bid);
        const price = Math.round(1150 * tb.priceMult);
        return `<div class="insp-brand-card ${isCur ? "current" : ""}" style="border-color:${tb.color};background:${isCur ? tb.color + "26" : "#111923"};"
          onclick="window.__GAME__.installTireBrand('${bid}')">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong style="color:${tb.color};font-size:12px;">${tb.name}</strong>
            ${isCur ? `<span class="tag-ok" style="font-size:10px;">MOUNTED</span>` : `<b style="color:#ffd166;font-size:12px;">$${price.toLocaleString()}</b>`}
          </div>
          <div class="small muted">Grip <b>${Math.round(tb.gripMult * 100)}%</b> • Puncture Resist <b>${Math.round(tb.punctureResist * 100)}%</b> • ${tb.desc}</div>
        </div>`;
      }).join("");

      return `
        <div class="insp-head" style="border-color:${curBr.color};">
          <div>
            <div class="insp-kicker" style="color:${curBr.color};">${curBr.name.toUpperCase()} • ${curComp.short}</div>
            <h4>Tires, Compounds &amp; Brands</h4>
          </div>
          <span class="badge">SPARES: ${vs.spareTires || 0}</span>
        </div>
        <div class="tire-chip-grid">${wheelCards}</div>
        <div class="insp-section">
          <div class="slider-group">
            <label>Front PSI: <b id="val-fpsi">${t.frontPsi}</b> | Rear PSI: <b id="val-rpsi">${t.rearPsi}</b> <span class="small muted">(12=Mud/Sand, 34=Tarmac)</span></label>
            <div style="display:flex;gap:6px;">
              <input type="range" min="10" max="42" step="1" value="${t.frontPsi}" oninput="document.getElementById('val-fpsi').textContent=this.value; window.__GAME__.setTune('frontPsi', parseFloat(this.value))" />
              <input type="range" min="10" max="42" step="1" value="${t.rearPsi}" oninput="document.getElementById('val-rpsi').textContent=this.value; window.__GAME__.setTune('rearPsi', parseFloat(this.value))" />
            </div>
          </div>
          <div class="btn-row" style="margin-top:6px;">
            <button class="btn primary small" onclick="window.__GAME__.garageRestockTires()">FRESH TIRES + SPARES ($300)</button>
            ${!vs.upgrades.mudTires
              ? `<button class="btn accent small ${(!window.__GAME__.tutorialComplete && window.__GAME__.tutorialStep === 4) ? "tut-highlight-pulse" : ""}" onclick="window.__GAME__.buyUpgrade('mudTires')">👉 37" OVERSIZE LIFT TIRES ($${KK.UPGRADES.mudTires.price.toLocaleString()})</button>`
              : `<span class="tag-ok">✓ 37" OVERSIZE CLEARANCE</span>`}
          </div>
        </div>
        <div class="insp-section">
          <div class="insp-sec-title">1. SELECT TREAD COMPOUND (SURFACE SPECIALIZATION)</div>
          <div class="insp-brand-list">${compCards}</div>
        </div>
        <div class="insp-section">
          <div class="insp-sec-title">2. SELECT TIRE BRAND (GRIP &amp; ROCK-PUNCTURE RESISTANCE)</div>
          <div class="insp-brand-list">${brandCards}</div>
        </div>`;
    }

    const def = KK.PARTS_CATALOG[mod.id];
    const cur = vs.parts[mod.id];
    const br = KK.BRANDS[cur.brand] || KK.BRANDS.volgaworks;
    const hp = Math.max(0, Math.min(100, cur.hp));
    const hpCol = this._hpColor(hp);
    const repCost = Math.ceil((100 - hp) * (def.basePrice * 0.008));

    let contextWidget = "";
    if (mod.id === "exhaustManifold" || mod.id === "intercooler") {
      const maxB = vs.upgrades.twinTurboKit ? 30 : (vs.upgrades.turboKit ? 24 : (curEng.stockTurbo ? (curEng.stockBoostPsi || 14) : 0));
      contextWidget = `
        <div class="insp-section">
          <div class="insp-sec-title">TURBO &amp; BOOST CONTROL</div>
          <div class="slider-group">
            <label>Boost Pressure: <b id="val-boost">${vs.tuning.boostPsi.toFixed(1)} PSI</b></label>
            <input type="range" min="0" max="${Math.max(1, maxB)}" step="0.5" value="${vs.tuning.boostPsi}" ${maxB === 0 ? "disabled" : ""}
              oninput="window.__GAME__.setTune('boostPsi', parseFloat(this.value))" />
          </div>
          <div class="btn-row" style="margin-top:6px;">
            ${!vs.upgrades.turboKit && !vs.upgrades.twinTurboKit ? `<button class="btn accent small" onclick="window.__GAME__.buyUpgrade('turboKit')">SINGLE TURBO ($${KK.UPGRADES.turboKit.price.toLocaleString()})</button>` : ""}
            ${!vs.upgrades.twinTurboKit ? `<button class="btn warn small" onclick="window.__GAME__.buyUpgrade('twinTurboKit')">TWIN-TURBO 30 PSI ($${KK.UPGRADES.twinTurboKit.price.toLocaleString()})</button>` : `<span class="tag-ok">✓ TWIN-TURBO ACTIVE</span>`}
          </div>
        </div>`;
    } else if (mod.id === "gearboxGears" || mod.id === "transferCase") {
      contextWidget = `
        <div class="insp-section">
          <div class="insp-sec-title">DRIVETRAIN &amp; DIFF LOCKS</div>
          <div class="slider-group">
            <label>Final Drive Ratio: <b id="val-fd">${vs.tuning.finalDrive.toFixed(2)} : 1</b></label>
            <input type="range" min="2.80" max="7.50" step="0.05" value="${vs.tuning.finalDrive}" oninput="window.__GAME__.setTune('finalDrive', parseFloat(this.value))" />
          </div>
          ${!vs.upgrades.diffLocks ? `<button class="btn accent small" style="margin-top:6px;" onclick="window.__GAME__.buyUpgrade('diffLocks')">INSTALL AIR DIFF LOCKS ($${KK.UPGRADES.diffLocks.price.toLocaleString()})</button>` : `<div class="tag-ok" style="margin-top:6px;">✓ FRONT &amp; REAR DIFF LOCKS ([2]/[3])</div>`}
        </div>`;
    } else if (mod.id === "coilSprings" || mod.id.startsWith("shock")) {
      const maxLift = vs.upgrades.hdSuspension ? 0.28 : 0.16;
      contextWidget = `
        <div class="insp-section">
          <div class="insp-sec-title">QUICK SUSPENSION ADJUSTMENT</div>
          <div class="slider-group">
            <label>Ride Height / Lift: <b id="val-rh">${(vs.tuning.rideHeight * 100).toFixed(0)} cm</b></label>
            <input type="range" min="-0.08" max="${maxLift}" step="0.01" value="${vs.tuning.rideHeight}" oninput="document.getElementById('val-rh').textContent=(this.value*100).toFixed(0)+' cm'; window.__GAME__.setTune('rideHeight', parseFloat(this.value))" />
          </div>
          <div class="slider-group">
            <label>Stiffness: <b id="val-stiff">${(vs.tuning.springStiffness * 100).toFixed(0)}%</b> | Rebound: <b id="val-damp">${(vs.tuning.damperRebound * 100).toFixed(0)}%</b></label>
            <div style="display:flex;gap:6px;">
              <input type="range" min="0.50" max="2.20" step="0.05" value="${vs.tuning.springStiffness}" oninput="document.getElementById('val-stiff').textContent=Math.round(this.value*100)+'%'; window.__GAME__.setTune('springStiffness', parseFloat(this.value))" />
              <input type="range" min="0.40" max="2.20" step="0.05" value="${vs.tuning.damperRebound}" oninput="document.getElementById('val-damp').textContent=Math.round(this.value*100)+'%'; window.__GAME__.setTune('damperRebound', parseFloat(this.value))" />
            </div>
          </div>
          ${!vs.upgrades.hdSuspension ? `<button class="btn accent small" style="margin-top:6px;" onclick="window.__GAME__.buyUpgrade('hdSuspension')">EXTENDED +28cm LIFT KIT ($${KK.UPGRADES.hdSuspension.price.toLocaleString()})</button>` : `<span class="tag-ok" style="margin-top:6px;">✓ EXTENDED LIFT KIT OWNED</span>`}
        </div>`;
    } else if (mod.id === "tieRods" || mod.id === "antiRollBar") {
      contextWidget = `
        <div class="insp-section">
          <div class="insp-sec-title">ALIGNMENT &amp; ROLL GEOMETRY</div>
          <div class="slider-group">
            <label>Camber: <b id="val-camb">${vs.tuning.camberDeg.toFixed(1)}°</b> | Toe: <b id="val-toe">${vs.tuning.toeDeg.toFixed(1)}°</b> | Roll Bar: <b id="val-arb">${Math.round(vs.tuning.antiRoll * 100)}%</b></label>
            <div style="display:flex;gap:6px;">
              <input type="range" min="-8.0" max="4.0" step="0.5" value="${vs.tuning.camberDeg}" oninput="document.getElementById('val-camb').textContent=parseFloat(this.value).toFixed(1)+'°'; window.__GAME__.setTune('camberDeg', parseFloat(this.value))" />
              <input type="range" min="-3.0" max="3.0" step="0.2" value="${vs.tuning.toeDeg}" oninput="document.getElementById('val-toe').textContent=parseFloat(this.value).toFixed(1)+'°'; window.__GAME__.setTune('toeDeg', parseFloat(this.value))" />
              <input type="range" min="0.30" max="2.20" step="0.05" value="${vs.tuning.antiRoll}" oninput="document.getElementById('val-arb').textContent=Math.round(this.value*100)+'%'; window.__GAME__.setTune('antiRoll', parseFloat(this.value))" />
            </div>
          </div>
        </div>`;
    }

    const brandCards = KK.BRAND_ORDER.map((bid) => {
      const b = KK.BRANDS[bid];
      const price = KK.getPartPrice(mod.id, bid);
      const isCur = (cur.brand === bid);
      return `
        <div class="insp-brand-card ${isCur ? "current" : ""}" style="border-color:${b.color};background:${isCur ? b.color + '26' : '#111923'};"
             onclick="window.__GAME__.installBrandedPart('${mod.id}','${bid}')">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong style="color:${b.color};font-size:12px;">${b.name}</strong>
            ${isCur ? `<span class="tag-ok" style="font-size:10px;">INSTALLED</span>` : `<b style="color:#ffd166;font-size:12px;">$${price.toLocaleString()}</b>`}
          </div>
          <div class="small muted">${this._materialName(bid)} • Perf <b>${Math.round(b.perfMult * 100)}%</b> • Wear <b>${b.wearMult}x</b></div>
        </div>`;
    }).join("");

    const catParts = Object.values(KK.PARTS_CATALOG).filter((p) => p.cat === def.cat);
    return `
      <div class="insp-head" style="border-color:${br.color};">
        <div>
          <div class="insp-kicker" style="color:${br.color};">${def.sub.toUpperCase()} • ${br.name.toUpperCase()}</div>
          <h4>${def.name}</h4>
        </div>
        <span class="badge" style="color:${br.color};border:1px solid ${br.color};">${this._materialName(cur.brand)}</span>
      </div>
      <p class="small muted" style="margin:6px 0 8px 0;">${def.effect}</p>

      <div class="insp-hp-box">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span class="small"><b>Condition:</b> <b style="color:${hpCol};">${hp.toFixed(0)}%</b> &nbsp;|&nbsp; Effective Output: <b>${Math.round(KK.getPartPerf(vs, mod.id) * 100)}%</b></span>
          ${hp < 99 ? `<button class="btn primary small" onclick="window.__GAME__.repairSinglePart('${mod.id}', ${repCost})">REPAIR $${repCost}</button>` : `<span class="tag-ok">100% MINT</span>`}
        </div>
        <div class="bar-bg" style="height:8px;"><div class="bar-fill" style="width:${hp}%;background:${hpCol};"></div></div>
      </div>

      ${contextWidget}

      <div class="insp-section">
        <div class="insp-sec-title">SWAP AFTERMARKET BRAND &amp; MATERIAL QUALITY</div>
        <div class="insp-brand-list">${brandCards}</div>
      </div>

      <div class="insp-section" style="border-top:1px solid #223244;padding-top:8px;">
        <div class="small muted" style="margin-bottom:5px;"><b>Batch Install Entire ${def.cat.toUpperCase()} Group (${catParts.length} parts):</b></div>
        <div class="btn-row">
          ${KK.BRAND_ORDER.map((bid) => {
            const b = KK.BRANDS[bid];
            let sum = 0;
            for (const cp of catParts) if (vs.parts[cp.id].brand !== bid) sum += KK.getPartPrice(cp.id, bid);
            if (sum === 0) return "";
            return `<button class="btn small" style="border:1px solid ${b.color};color:${b.color};background:#101822;"
              onclick="window.__GAME__.installCategoryBrand('${def.cat}','${bid}')">${b.short} ALL ($${sum.toLocaleString()})</button>`;
          }).join("")}
        </div>
      </div>`;
  },

  renderTuningStudio(ui, vs, spec) {
    const curEng = KK.ENGINES[vs.engineId];
    const t = vs.tuning;
    const maxLift = vs.upgrades.hdSuspension ? 0.28 : 0.16;
    const maxBoost = vs.upgrades.twinTurboKit ? 30 : (vs.upgrades.turboKit ? 24 : (curEng.stockTurbo ? (curEng.stockBoostPsi || 14) : 0));

    const gearsHtml = t.gears.map((gr, idx) =>
      `<div class="gear-box"><label>G${idx + 1}: <b>${gr.toFixed(2)}</b></label>
       <input type="range" min="0.55" max="8.20" step="0.05" value="${gr}" oninput="window.__GAME__.setGearRatio(${idx}, parseFloat(this.value))" /></div>`
    ).join("");

    return `
      <div class="preset-strip">
        <span class="small" style="font-weight:800;color:#00e5ff;">⚡ 1-CLICK TUNING PRESETS:</span>
        <button class="btn small" onclick="window.__GAME__.applyTuningPreset('stock')">🏭 FACTORY STOCK</button>
        <button class="btn small primary" onclick="window.__GAME__.applyTuningPreset('tarmac')">🏁 TARMAC / DRIFT</button>
        <button class="btn small accent" onclick="window.__GAME__.applyTuningPreset('mud')">🪵 DEEP MUD CRAWL</button>
        <button class="btn small warn" onclick="window.__GAME__.applyTuningPreset('dune')">🏜 DESERT DUNE RAID</button>
      </div>

      <div class="two-col" style="grid-template-columns: 375px 1fr;gap:14px;">
        <div>
          <h4>LIVE DYNO TELEMETRY &amp; POWER</h4>
          <canvas id="dyno-canvas" width="370" height="175"></canvas>
          <div class="slider-group" style="margin-top:8px;">
            <label>Turbo Boost Pressure: <b id="val-boost">${t.boostPsi.toFixed(1)} PSI</b> ${maxBoost === 0 ? "(No Turbo Installed)" : ""}</label>
            <input type="range" min="0" max="${Math.max(1, maxBoost)}" step="0.5" value="${t.boostPsi}" ${maxBoost === 0 ? "disabled" : ""}
              oninput="window.__GAME__.setTune('boostPsi', parseFloat(this.value))" />
          </div>

          <h4 style="margin-top:12px;">GEARBOX RATIOS (${t.gears.length}-SPD)</h4>
          <div class="slider-group">
            <label>Final Drive (Crawl ↔ Top Speed): <b id="val-fd">${t.finalDrive.toFixed(2)} : 1</b></label>
            <input type="range" min="2.80" max="7.50" step="0.05" value="${t.finalDrive}" oninput="window.__GAME__.setTune('finalDrive', parseFloat(this.value))" />
          </div>
          <div class="gears-grid">${gearsHtml}</div>
        </div>

        <div>
          <h4>SUSPENSION GEOMETRY, STANCE &amp; TIRE PRESSURE</h4>
          <div class="tune-card-grid">
            <div class="slider-group"><label>Ride Height / Lift Kit: <b id="val-rh">${(t.rideHeight * 100).toFixed(0)} cm</b></label>
              <input type="range" min="-0.08" max="${maxLift}" step="0.01" value="${t.rideHeight}" oninput="document.getElementById('val-rh').textContent=(this.value*100).toFixed(0)+' cm'; window.__GAME__.setTune('rideHeight', parseFloat(this.value))" /></div>
            <div class="slider-group"><label>Spring Stiffness: <b id="val-stiff">${(t.springStiffness * 100).toFixed(0)}%</b></label>
              <input type="range" min="0.50" max="2.20" step="0.05" value="${t.springStiffness}" oninput="document.getElementById('val-stiff').textContent=Math.round(this.value*100)+'%'; window.__GAME__.setTune('springStiffness', parseFloat(this.value))" /></div>
            <div class="slider-group"><label>Damper Rebound: <b id="val-damp">${(t.damperRebound * 100).toFixed(0)}%</b></label>
              <input type="range" min="0.40" max="2.20" step="0.05" value="${t.damperRebound}" oninput="document.getElementById('val-damp').textContent=Math.round(this.value*100)+'%'; window.__GAME__.setTune('damperRebound', parseFloat(this.value))" /></div>
            <div class="slider-group"><label>Anti-Roll Bar: <b id="val-arb">${(t.antiRoll * 100).toFixed(0)}%</b></label>
              <input type="range" min="0.30" max="2.20" step="0.05" value="${t.antiRoll}" oninput="document.getElementById('val-arb').textContent=Math.round(this.value*100)+'%'; window.__GAME__.setTune('antiRoll', parseFloat(this.value))" /></div>
            <div class="slider-group"><label>Wheel Camber: <b id="val-camb">${t.camberDeg.toFixed(1)}°</b></label>
              <input type="range" min="-8.0" max="4.0" step="0.5" value="${t.camberDeg}" oninput="document.getElementById('val-camb').textContent=parseFloat(this.value).toFixed(1)+'°'; window.__GAME__.setTune('camberDeg', parseFloat(this.value))" /></div>
            <div class="slider-group"><label>Wheel Toe Angle: <b id="val-toe">${t.toeDeg.toFixed(1)}°</b></label>
              <input type="range" min="-3.0" max="3.0" step="0.2" value="${t.toeDeg}" oninput="document.getElementById('val-toe').textContent=parseFloat(this.value).toFixed(1)+'°'; window.__GAME__.setTune('toeDeg', parseFloat(this.value))" /></div>
            <div class="slider-group"><label>Front Tire PSI: <b id="val-fpsi">${t.frontPsi} PSI</b></label>
              <input type="range" min="10" max="42" step="1" value="${t.frontPsi}" oninput="document.getElementById('val-fpsi').textContent=this.value+' PSI'; window.__GAME__.setTune('frontPsi', parseFloat(this.value))" /></div>
            <div class="slider-group"><label>Rear Tire PSI: <b id="val-rpsi">${t.rearPsi} PSI</b></label>
              <input type="range" min="10" max="42" step="1" value="${t.rearPsi}" oninput="document.getElementById('val-rpsi').textContent=this.value+' PSI'; window.__GAME__.setTune('rearPsi', parseFloat(this.value))" /></div>
          </div>

          <div class="info-box small" style="margin-top:10px;line-height:1.55;">
            <b>Straight-Line vs. Drift Tuning Guide (GT-R / WRX / Evo):</b><br/>
            • <b>200+ km/h Straight-Line Stability:</b> Mount <b>Apex Semi-Slick Sport</b> tires (<b>Kurogane/Valkyrie</b>), set <b>Camber -1° to -2°</b>, <b>Toe 0.0°</b>, <b>PSI 32–36</b>, and keep your <b>Tie-Rods</b> repaired to 100% (bent tie-rods pull hard at speed!).<br/>
            • <b>Controlled Drifting:</b> Tap <b>[Space]</b> handbrake above 20 km/h on entry, or raise Rear PSI slightly above Front PSI.<br/>
            • <b>Snow / Mud / Sand:</b> Swap to <b>Arctic Studded</b>, <b>Mud M/T</b>, or <b>Sand Paddle</b> compounds with <b>Boreal 10-Ply</b> or <b>Valkyrie Kevlar</b> sidewalls (stops mountain rock blowouts!) and air down to <b>12–16 PSI</b>.
          </div>
        </div>
      </div>`;
  }
};
