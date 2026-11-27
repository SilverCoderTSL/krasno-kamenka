// ============================================================================
// js/particles.js (v6) — Zero-Allocation Ring Buffer Particle System
// Crash-Proof, Auto-FPS Throttling, Fast Memory Cleanup & Quality Presets!
// ============================================================================
window.KK = window.KK || {};

KK.ParticleSystem = class ParticleSystem {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.maxCount = 240;         // Fixed compact GPU vertex buffer (zero resizing!)
    this.quality = "med";        // low (75) | med (150) | high (240)
    this.budget = 150;
    this.activeCount = 0;
    this.cursor = 0;
    this.emitCooldown = 0;
    this.fpsSmooth = 60;

    // Pre-allocated scratch vector (ZERO per-frame garbage collection!)
    this._backDir = new THREE.Vector3();

    // Soft radial puff texture
    const cv = document.createElement("canvas");
    cv.width = 48; cv.height = 48;
    const ctx = cv.getContext("2d");
    const grad = ctx.createRadialGradient(24, 24, 3, 24, 24, 22);
    grad.addColorStop(0, "rgba(255,255,255,0.92)");
    grad.addColorStop(0.5, "rgba(255,255,255,0.42)");
    grad.addColorStop(1, "rgba(255,255,255,0.0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 48, 48);
    this.tex = new THREE.CanvasTexture(cv);

    // Flat typed arrays (zero per-particle JS object GC churn!)
    const N = this.maxCount;
    this.positions = new Float32Array(N * 3);
    this.colors = new Float32Array(N * 3);
    this.active = new Uint8Array(N);
    this.gx = new Float64Array(N);
    this.gy = new Float32Array(N);
    this.gz = new Float64Array(N);
    this.vx = new Float32Array(N);
    this.vy = new Float32Array(N);
    this.vz = new Float32Array(N);
    this.life = new Float32Array(N);
    this.maxLife = new Float32Array(N);
    this.gravity = new Float32Array(N);
    this.drag = new Float32Array(N);
    this.cr = new Float32Array(N);
    this.cg = new Float32Array(N);
    this.cb = new Float32Array(N);

    for (let i = 0; i < N; i++) this.positions[i * 3 + 1] = -9999;

    this.geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.positions, 3);
    this.colAttr = new THREE.BufferAttribute(this.colors, 3);
    this.posAttr.setUsage(THREE.DynamicDrawUsage);
    this.colAttr.setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute("position", this.posAttr);
    this.geo.setAttribute("color", this.colAttr);

    this.mat = new THREE.PointsMaterial({
      size: 2.0,
      map: this.tex,
      vertexColors: true,
      transparent: true,
      opacity: 0.76,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  setQuality(mode) {
    this.quality = mode;
    if (mode === "low") this.budget = 70;
    else if (mode === "high") this.budget = 240;
    else this.budget = 150;
    // Immediately prune excess active particles above new budget
    if (this.activeCount > this.budget) this.clearAll();
  }

  // Instant zero-GC memory & GPU buffer purge!
  clearAll() {
    for (let i = 0; i < this.maxCount; i++) {
      this.active[i] = 0;
      this.life[i] = 0;
      this.positions[i * 3 + 1] = -9999;
    }
    this.activeCount = 0;
    this.cursor = 0;
    this.posAttr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
  }

  emitRGB(gx, gy, gz, vx, vy, vz, r, g, b, life = 0.65, gravity = -3.0, drag = 1.8) {
    // Dynamic FPS safety cap: if FPS dips below 26, strictly halve particle budget!
    const effBudget = this.fpsSmooth < 26 ? Math.min(45, this.budget) : this.budget;
    if (effBudget <= 0) return;

    const i = this.cursor;
    this.cursor = (this.cursor + 1) % effBudget;
    if (!this.active[i]) this.activeCount++;
    this.active[i] = 1;
    this.gx[i] = gx; this.gy[i] = gy; this.gz[i] = gz;
    this.vx[i] = vx; this.vy[i] = vy; this.vz[i] = vz;
    this.life[i] = life; this.maxLife[i] = life;
    this.gravity[i] = gravity; this.drag[i] = drag;
    this.cr[i] = r; this.cg[i] = g; this.cb[i] = b;
  }

  emitWheelSpray(wheels, vehicle, weather, dt) {
    this.emitCooldown -= dt;
    // Throttle wheel emissions so we never flood memory even at 160 km/h!
    const minInterval = this.quality === "low" ? 0.075 : (this.quality === "high" ? 0.028 : 0.045);
    if (this.emitCooldown > 0) return;
    const spd = vehicle.vel.length();
    if (spd < 2.6) return;
    this.emitCooldown = minInterval;

    this._backDir.set(0, 0, -1).applyQuaternion(vehicle.quat);
    const kick = Math.min(8.5, spd * 0.30);

    for (let wi = 0; wi < wheels.length; wi++) {
      const wheel = wheels[wi];
      if (!wheel.grounded) continue;
      if (Math.random() > 0.58) continue;

      const c = wheel.worldContact;
      const jx = (Math.random() - 0.5) * 2.0;
      const jz = (Math.random() - 0.5) * 2.0;

      if (wheel.waterDepth > 0.12) {
        this.emitRGB(c.x, c.y + wheel.waterDepth + 0.12, c.z,
          this._backDir.x * kick * 0.6 + jx, 2.2 + Math.random() * 3.0, this._backDir.z * kick * 0.6 + jz,
          0.84, 0.94, 1.0, 0.52, -8.5, 1.3);
      } else if (wheel.surface === "mud" || weather === "rain" || weather === "storm") {
        this.emitRGB(c.x, c.y + 0.15, c.z,
          this._backDir.x * kick + jx, 1.7 + Math.random() * 2.8, this._backDir.z * kick + jz,
          0.32, 0.21, 0.12, 0.55, -9.2, 1.2);
      } else if (weather === "snow" || c.y > 250) {
        this.emitRGB(c.x, c.y + 0.18, c.z,
          this._backDir.x * kick * 0.7 + jx, 1.3 + Math.random() * 1.9, this._backDir.z * kick * 0.7 + jz,
          0.93, 0.97, 1.0, 0.78, -1.8, 1.8);
      } else if (wheel.surface === "sand") {
        this.emitRGB(c.x, c.y + 0.20, c.z,
          this._backDir.x * kick * 0.55 + jx, 1.1 + Math.random() * 1.8, this._backDir.z * kick * 0.55 + jz,
          0.86, 0.64, 0.38, 0.78, -1.0, 1.9);
      } else if (wheel.surface === "gravel" || wheel.surface === "shale" || wheel.surface === "grass") {
        const isShale = (wheel.surface === "shale");
        this.emitRGB(c.x, c.y + 0.20, c.z,
          this._backDir.x * kick * 0.45 + jx * 0.8, 0.9 + Math.random() * 1.4, this._backDir.z * kick * 0.45 + jz * 0.8,
          isShale ? 0.60 : 0.72, isShale ? 0.56 : 0.62, isShale ? 0.50 : 0.48,
          0.75, 0.2, 2.2);
      }
    }
  }

  emitCrashBurst(gx, gy, gz, strength, surface, weather) {
    const cap = this.quality === "low" ? 8 : (this.quality === "high" ? 20 : 14);
    const count = Math.min(cap, Math.floor(6 + strength * 12));
    let r = 0.72, g = 0.62, b = 0.47;
    if (weather === "snow" || gy > 250) { r = 0.94; g = 0.97; b = 1.0; }
    else if (surface === "sand") { r = 0.88; g = 0.64; b = 0.36; }
    else if (surface === "mud") { r = 0.31; g = 0.21; b = 0.12; }
    else if (surface === "rock" || surface === "shale") { r = 0.55; g = 0.53; b = 0.49; }

    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 2.0 + Math.random() * (5.5 + strength * 5.5);
      this.emitRGB(
        gx + (Math.random() - 0.5) * 1.6, gy + 0.35 + Math.random() * 0.7, gz + (Math.random() - 0.5) * 1.6,
        Math.cos(ang) * spd, 2.2 + Math.random() * (4.0 + strength * 3.5), Math.sin(ang) * spd,
        r, g, b, 0.65 + Math.random() * 0.45, -5.0, 1.6
      );
    }
  }

  emitBackfire(gx, gy, gz, backDir) {
    for (let i = 0; i < 4; i++) {
      const isFlame = i < 2;
      this.emitRGB(gx, gy, gz,
        backDir.x * (5 + i) + (Math.random() - 0.5), 0.4 + Math.random() * 0.8, backDir.z * (5 + i) + (Math.random() - 0.5),
        isFlame ? 1.0 : 0.25, isFlame ? 0.52 : 0.26, isFlame ? 0.12 : 0.28,
        isFlame ? 0.18 : 0.45, 0.5, 2.6
      );
    }
  }

  // Zero-GC ocean wave / hurricane / sea-cryptid water splash & foam spray!
  emitWaterSplash(gx, gy, gz, strength = 1.0) {
    const s = Math.max(0.25, Math.min(4.0, Number(strength) || 1.0));
    const maxCap = this.quality === "low" ? 4 : (this.quality === "high" ? 12 : 8);
    const count = Math.min(maxCap, Math.max(2, Math.round(2 + s * 2.5)));
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (1.4 + Math.random() * (2.6 + s * 2.4));
      const foam = 0.78 + Math.random() * 0.20;
      this.emitRGB(
        gx + (Math.random() - 0.5) * (1.2 + s * 0.9),
        gy + 0.15 + Math.random() * 0.45,
        gz + (Math.random() - 0.5) * (1.2 + s * 0.9),
        Math.cos(ang) * spd,
        1.8 + Math.random() * (2.4 + s * 2.6),
        Math.sin(ang) * spd,
        foam * 0.88, foam * 0.96, Math.min(1.0, foam * 1.05),
        0.48 + Math.random() * 0.36, -8.8, 1.35
      );
    }
  }

  emitFrostOrSand(gx, gy, gz, isFrost, count = 8) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 1.8 + Math.random() * 5.5;
      this.emitRGB(
        gx + (Math.random() - 0.5) * 2.5, gy + 0.5 + Math.random() * 1.2, gz + (Math.random() - 0.5) * 2.5,
        Math.cos(ang) * spd, 2.0 + Math.random() * 4.5, Math.sin(ang) * spd,
        isFrost ? 0.72 : 0.88, isFrost ? 0.92 : 0.64, isFrost ? 1.0 : 0.34,
        0.58 + Math.random() * 0.35, isFrost ? -1.5 : -6.5, 1.5
      );
    }
  }

  update(dt) {
    if (dt > 0.001) {
      this.fpsSmooth = this.fpsSmooth * 0.92 + Math.min(120, 1 / dt) * 0.08;
    }
    if (this.activeCount <= 0) return;

    const ox = this.world.originX;
    const oz = this.world.originZ;
    let alive = 0;

    for (let i = 0; i < this.maxCount; i++) {
      if (!this.active[i]) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.active[i] = 0;
        this.positions[i * 3 + 1] = -9999;
        continue;
      }
      alive++;
      const dmp = Math.exp(-this.drag[i] * dt);
      this.vx[i] *= dmp;
      this.vz[i] *= dmp;
      this.vy[i] += this.gravity[i] * dt;
      this.gx[i] += this.vx[i] * dt;
      this.gy[i] += this.vy[i] * dt;
      this.gz[i] += this.vz[i] * dt;

      const fade = this.life[i] / this.maxLife[i];
      const idx = i * 3;
      this.positions[idx] = this.gx[i] - ox;
      this.positions[idx + 1] = this.gy[i];
      this.positions[idx + 2] = this.gz[i] - oz;
      this.colors[idx] = this.cr[i] * fade;
      this.colors[idx + 1] = this.cg[i] * fade;
      this.colors[idx + 2] = this.cb[i] * fade;
    }
    this.activeCount = alive;
    this.posAttr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
  }

  // v13.99: Toggleable Dust / Mud / Snow / Water Spray behind other LAN players!
  emitRemoteWheelSpray(rp, world, weather, dt) {
    if (!rp || rp.onFoot) return;
    const spd = Math.hypot(rp.vx || 0, rp.vz || 0);
    if (spd < 3.0) return;
    rp._dustCd = (rp._dustCd || 0) - dt;
    const minInt = this.quality === "low" ? 0.14 : (this.quality === "high" ? 0.055 : 0.085);
    if (rp._dustCd > 0) return;
    rp._dustCd = minInt;

    const ti = world.getTerrainInfo(rp.gx, rp.gz, false);
    const surf = ti.waterDepth > 0.18 ? "water" : (ti.mudDepth > 0.12 ? "mud" : (ti.surface || "dirt"));
    let r = 0.56, g = 0.45, b = 0.34, cnt = 2;
    if (surf === "water") { r = 0.72; g = 0.88; b = 0.96; cnt = 3; }
    else if (surf === "mud") { r = 0.25; g = 0.18; b = 0.12; cnt = 3; }
    else if (surf === "snow" || weather === "snow") { r = 0.92; g = 0.95; b = 0.99; cnt = 2; }
    else if (surf === "sand") { r = 0.84; g = 0.67; b = 0.42; cnt = 3; }
    else if (surf === "asphalt" || surf === "race_tarmac") {
      if (weather !== "rain" && weather !== "storm") return;
      r = 0.78; g = 0.84; b = 0.90; cnt = 1;
    }

    const backX = -(rp.vx || 0) / spd, backZ = -(rp.vz || 0) / spd;
    const sideX = -backZ, sideZ = backX;
    for (let k = 0; k < cnt; k++) {
      const side = (k % 2 === 0 ? -0.95 : 0.95);
      const px = rp.gx + backX * 2.1 + sideX * side + (Math.random() - 0.5) * 0.4;
      const pz = rp.gz + backZ * 2.1 + sideZ * side + (Math.random() - 0.5) * 0.4;
      const py = ti.height + 0.32;
      const kick = Math.min(6.0, spd * 0.24);
      this.emitRGB(
        px, py, pz,
        backX * kick + (Math.random() - 0.5) * 1.6,
        1.1 + Math.random() * 1.8 + spd * 0.05,
        backZ * kick + (Math.random() - 0.5) * 1.6,
        r, g, b, 0.55 + Math.random() * 0.45, -3.5, 1.8
      );
    }
  }

  // v13.995: DIRECTIONAL TERRAIN-AWARE MUZZLE BLAST SHOCKWAVE!
  emitMuzzleShockwave(muzzlePos, aimDir, world, weather, power = 1.0, isBackblast = false) {
    if (!world || !muzzlePos || !aimDir) return;
    const dirX = isBackblast ? -aimDir.x : aimDir.x;
    const dirY = isBackblast ? -aimDir.y : aimDir.y;
    const dirZ = isBackblast ? -aimDir.z : aimDir.z;

    const hLen = Math.hypot(dirX, dirZ) || 1.0;
    const fwdX = dirX / hLen, fwdZ = dirZ / hLen;
    const rightX = -fwdZ, rightZ = fwdX;

    const groundInfo0 = world.getTerrainInfo(muzzlePos.x, muzzlePos.z, false);
    const hAbove = Math.max(0.6, muzzlePos.y - groundInfo0.height);
    const elevFactor = Math.max(0.28, Math.min(1.45, (1.18 - dirY * 1.35) * (2.8 / Math.max(1.8, hAbove))));

    const maxCap = this.quality === "low" ? 14 : (this.quality === "high" ? 42 : 28);
    const totalCount = Math.min(maxCap, Math.max(6, Math.round((10 + power * 24) * elevFactor)));

    // 1. Hot muzzle propellant flash/smoke puff right at the muzzle brake
    const flashCnt = Math.min(8, Math.max(2, Math.round(3 + power * 4)));
    for (let f = 0; f < flashCnt; f++) {
      const fSpd = (3.5 + Math.random() * 8.5) * (0.6 + power * 0.6);
      const spX = (Math.random() - 0.5) * 2.8, spY = (Math.random() - 0.5) * 2.2, spZ = (Math.random() - 0.5) * 2.8;
      this.emitRGB(
        muzzlePos.x + dirX * 0.4, muzzlePos.y + dirY * 0.4, muzzlePos.z + dirZ * 0.4,
        dirX * fSpd + spX, dirY * fSpd + spY + 0.6, dirZ * fSpd + spZ,
        isBackblast ? 0.92 : 0.78, isBackblast ? 0.52 : 0.76, isBackblast ? 0.24 : 0.72,
        0.55 + Math.random() * 0.55, 0.35, 2.8
      );
    }

    // 2. Terrain Shockwave Concentrated DIRECTLY UNDER THE BARREL TIP & Blowing Outward Along Gun Axis!
    for (let i = 0; i < totalCount; i++) {
      // 45% directly under muzzle tip (0..2.8m radius), 35% forward cone along barrel, 20% side muzzle-brake jets!
      const modeRoll = i / totalCount;
      let px, pz, wx, wz;
      if (modeRoll < 0.45) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * (1.5 + power * 1.4);
        px = muzzlePos.x + Math.cos(a) * r;
        pz = muzzlePos.z + Math.sin(a) * r;
        // Blow radially outward from directly under the muzzle tip, biased forward along barrel!
        wx = Math.cos(a) * 0.72 + fwdX * 0.65;
        wz = Math.sin(a) * 0.72 + fwdZ * 0.65;
      } else if (modeRoll < 0.80) {
        const angOff = (Math.random() - 0.5) * 1.15;
        const ca = Math.cos(angOff), sa = Math.sin(angOff);
        wx = fwdX * ca + rightX * sa;
        wz = fwdZ * ca + rightZ * sa;
        const reach = 0.6 + Math.random() * (3.6 + power * 4.5);
        px = muzzlePos.x + wx * reach;
        pz = muzzlePos.z + wz * reach;
      } else {
        // Crisp perpendicular muzzle-brake side blasts directly under the barrel tip!
        const side = (i % 2 === 0) ? 1 : -1;
        wx = rightX * side + fwdX * 0.25 + (Math.random() - 0.5) * 0.25;
        wz = rightZ * side + fwdZ * 0.25 + (Math.random() - 0.5) * 0.25;
        const reach = 0.4 + Math.random() * (2.2 + power * 2.2);
        px = muzzlePos.x + wx * reach;
        pz = muzzlePos.z + wz * reach;
      }
      const wNorm = Math.hypot(wx, wz) || 1.0;
      wx /= wNorm; wz /= wNorm;
      const ti = world.getTerrainInfo(px, pz, false);
      const py = ti.height + 0.22;

      let r = 0.62, g = 0.52, b = 0.38, grav = -2.6, life = 0.85 + Math.random() * 0.65;
      const surf = ti.waterDepth > 0.16 ? "water" : (ti.mudDepth > 0.12 ? "mud" : (ti.surface || "dirt"));
      if (surf === "water") {
        r = 0.76; g = 0.90; b = 0.98; grav = -4.2;
      } else if (surf === "snow" || weather === "snow" || py > 245) {
        r = 0.94; g = 0.97; b = 1.00; grav = -1.6; life += 0.35;
      } else if (surf === "sand") {
        r = 0.88; g = 0.69; b = 0.40; grav = -1.7; life += 0.35;
      } else if (surf === "mud") {
        r = 0.28; g = 0.19; b = 0.12; grav = -5.5;
      } else if (surf === "volcanic" || surf === "rock" || surf === "shale" || surf === "asphalt" || surf === "race_tarmac") {
        r = 0.48; g = 0.46; b = 0.44; grav = -2.2;
      } else {
        r = 0.58; g = 0.48; b = 0.34; grav = -2.8;
      }

      const blastSpd = (3.6 + Math.random() * (4.8 + power * 6.8)) * elevFactor;
      const upKick = (1.6 + Math.random() * (2.4 + power * 3.2)) * elevFactor;
      this.emitRGB(
        px, py, pz,
        wx * blastSpd, upKick, wz * blastSpd,
        r, g, b, life, grav, 1.9
      );
    }
  }

  // v13.995: WISPY CORDITE SMOKE CURLING FROM HOT GUN BARREL & BORE EVACUATOR AFTER FIRING!
  emitBarrelSmoke(gx, gy, gz, dirX, dirY, dirZ, intensity = 1.0) {
    const shade = 0.66 + Math.random() * 0.20;
    const drift = 0.45 + Math.random() * 0.95;
    this.emitRGB(
      gx + (Math.random() - 0.5) * 0.14,
      gy + (Math.random() - 0.5) * 0.10,
      gz + (Math.random() - 0.5) * 0.14,
      dirX * drift + (Math.random() - 0.5) * 0.55,
      0.85 + Math.random() * 0.95 + dirY * 0.4,
      dirZ * drift + (Math.random() - 0.5) * 0.55,
      shade, shade, shade + 0.03,
      (0.85 + Math.random() * 0.65) * Math.max(0.55, intensity),
      0.42,
      1.6
    );
  }
};
