// ============================================================================
// js/weather.js — Dynamic 24h Time-of-Day, Sky, Rain/Snow/Fog, Hurricanes & Lighting
// Zero per-frame THREE.Color allocations; dynamic coupling to hurricanes & sea dread!
// ============================================================================
window.KK = window.KK || {};

KK.WeatherSystem = class WeatherSystem {
  constructor(scene) {
    this.scene = scene;
    this.timeOfDay = 8.5;
    this.timeScale = 1.0;
    this.weather = "clear";
    this.lightningFlash = 0;
    this.nextLightning = 6;
    this.isNight = false;

    // Pre-allocated scratch colors (ZERO per-frame THREE.Color GC churn!)
    this._skyA        = new THREE.Color(0x050914);
    this._skyB        = new THREE.Color(0x6fa6d6);
    this._twilightCol = new THREE.Color(0xd16c43);
    this._stormCol    = new THREE.Color(0x141b24);
    this._hurricaneCol = new THREE.Color(0x0a1920);
    this._eyeCol      = new THREE.Color(0x4b6a82);
    this._abyssCol    = new THREE.Color(0x071520);
    this._nvgCol      = new THREE.Color(0x16381c);
    this._flirCol     = new THREE.Color(0x1b222c);
    this._flashCol    = new THREE.Color(0xeef6ff);
    this._skyOut      = new THREE.Color(0xa5bed4);

    this.sunLight = new THREE.DirectionalLight(0xfff5e0, 1.3);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 260;
    const d = 85;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.hemiLight = new THREE.HemisphereLight(0x9fc2e6, 0x3b352a, 0.55);
    this.scene.add(this.hemiLight);
    this.opticMode = 0; // 0 = Day, 1 = FLIR Thermal, 2 = Green NVG, 3 = Crimson Red NVD
    this.nvgLight = new THREE.PointLight(0xffffff, 0, 260, 0.55);
    this.scene.add(this.nvgLight);
    this.scene.background = this._skyOut;
    this.scene.fog = new THREE.FogExp2(0xa5bed4, 0.0014);

    this.sunOrb = new THREE.Mesh(new THREE.SphereGeometry(14, 12, 12), new THREE.MeshBasicMaterial({ color: 0xfff0b5, fog: false }));
    this.scene.add(this.sunOrb);
    this.moonOrb = new THREE.Mesh(new THREE.SphereGeometry(10, 10, 10), new THREE.MeshBasicMaterial({ color: 0xd9e6ff, fog: false }));
    this.scene.add(this.moonOrb);

    const starCount = 700, starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(0.15 + Math.random() * 0.85);
      const r = 460;
      starPos[i * 3] = Math.sin(ph) * Math.cos(th) * r;
      starPos[i * 3 + 1] = Math.cos(ph) * r;
      starPos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.1, transparent: true, opacity: 0, fog: false });
    this.stars = new THREE.Points(starGeo, this.starMat);
    this.scene.add(this.stars);

    this.precipCount = 1200;
    const pPos = new Float32Array(this.precipCount * 3);
    for (let i = 0; i < this.precipCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 90;
      pPos[i * 3 + 1] = Math.random() * 42;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 90;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    this.precipMat = new THREE.PointsMaterial({ color: 0xc2dcf5, size: 0.35, transparent: true, opacity: 0.0, depthWrite: false });
    this.precipPoints = new THREE.Points(pGeo, this.precipMat);
    this.scene.add(this.precipPoints);
  }

  getGripModifier() {
    switch (this.weather) {
      case "rain": return 0.78;
      case "storm": return 0.68;
      case "hurricane": return 0.56;
      case "snow": return 0.58;
      case "fog": return 0.90;
      default: return 1.0;
    }
  }

  setEnvironment(timeOfDay, weather, timeScale) {
    if (typeof timeOfDay === "number" && !isNaN(timeOfDay)) this.timeOfDay = timeOfDay % 24;
    if (weather) this.weather = weather;
    if (typeof timeScale === "number") this.timeScale = timeScale;
  }

  getTimeString() {
    const hrs = Math.floor(this.timeOfDay);
    const mins = Math.floor((this.timeOfDay - hrs) * 60);
    return String(hrs).padStart(2, "0") + ":" + String(mins).padStart(2, "0");
  }

  update(dt, focusLocalPos, audio, stormMods = null) {
    this.timeOfDay = (this.timeOfDay + dt * 0.02 * this.timeScale) % 24.0;
    const sunAngle = ((this.timeOfDay - 6) / 24) * Math.PI * 2;
    const sunY = Math.sin(sunAngle), sunX = Math.cos(sunAngle), sunZ = 0.32;
    this.isNight = sunY < 0.04;

    const hIntensity = stormMods && typeof stormMods.hurricaneIntensity === "number"
      ? Math.max(0, Math.min(1, stormMods.hurricaneIntensity)) : 0;
    const inEye = !!(stormMods && stormMods.inEye);
    const seaDread = stormMods && typeof stormMods.seaDread === "number"
      ? Math.max(0, Math.min(1, stormMods.seaDread)) : 0;
    const modWindX = (stormMods && typeof stormMods.windX === "number") ? stormMods.windX : 0;
    const modWindZ = (stormMods && typeof stormMods.windZ === "number") ? stormMods.windZ : 0;

    const isHurricaneWeather = (this.weather === "hurricane");
    const effHurr = inEye ? 0 : Math.max(isHurricaneWeather ? 0.78 : 0, hIntensity);

    this.sunLight.target.position.copy(focusLocalPos);
    const orbitDist = 115;
    if (sunY >= -0.05) {
      this.sunLight.position.set(focusLocalPos.x + sunX * orbitDist, focusLocalPos.y + Math.max(8, sunY * orbitDist), focusLocalPos.z + sunZ * orbitDist);
    } else {
      this.sunLight.position.set(focusLocalPos.x - sunX * orbitDist, focusLocalPos.y + Math.max(12, -sunY * orbitDist), focusLocalPos.z - sunZ * orbitDist);
    }

    const skyBlocked = !inEye && (this.weather === "storm" || this.weather === "fog" || effHurr > 0.35);
    this.sunOrb.position.set(focusLocalPos.x + sunX * 400, focusLocalPos.y + sunY * 400, focusLocalPos.z + sunZ * 400);
    this.sunOrb.visible = sunY > -0.15 && !skyBlocked;

    this.moonOrb.position.set(focusLocalPos.x - sunX * 390, focusLocalPos.y - sunY * 390, focusLocalPos.z - sunZ * 390);
    this.moonOrb.visible = sunY < 0.1 && !skyBlocked;

    this.stars.position.copy(focusLocalPos);
    this.starMat.opacity = (this.weather === "clear" && effHurr < 0.15) || inEye
      ? Math.max(0, Math.min(1, (-sunY - 0.05) * 3.5)) * (inEye ? 0.75 : 1.0)
      : 0;

    const dayFactor = Math.max(0, Math.min(1, (sunY + 0.12) / 0.42));
    const twilight = Math.max(0, 1 - Math.abs(sunY - 0.02) / 0.22);

    // Zero-GC sky color composition
    this._skyA.setHex(0x050914);
    this._skyB.setHex(0x6fa6d6);
    this._skyOut.copy(this._skyA).lerp(this._skyB, dayFactor);
    this._skyOut.lerp(this._twilightCol, twilight * 0.52);

    let fogDensity = 0.0012, lightMult = 1.0;
    if (this.weather === "overcast") {
      this._stormCol.setHex(0x4b5561);
      this._skyOut.lerp(this._stormCol, 0.55 * dayFactor + 0.15);
      fogDensity = 0.0022; lightMult = 0.65;
    } else if (this.weather === "rain") {
      this._stormCol.setHex(0x283440);
      this._skyOut.lerp(this._stormCol, 0.72 * dayFactor + 0.25);
      fogDensity = 0.0038; lightMult = 0.48;
    } else if (this.weather === "storm") {
      this._stormCol.setHex(0x141b24);
      this._skyOut.lerp(this._stormCol, 0.85);
      fogDensity = 0.0052; lightMult = 0.34;
    } else if (this.weather === "hurricane") {
      this._skyOut.lerp(this._hurricaneCol, 0.90);
      fogDensity = 0.0068; lightMult = 0.26;
    } else if (this.weather === "fog") {
      this._stormCol.setHex(0x8c9aa3);
      this._skyOut.lerp(this._stormCol, 0.78 * dayFactor + 0.12);
      fogDensity = 0.0135; lightMult = 0.55;
    } else if (this.weather === "snow") {
      this._stormCol.setHex(0xaab8c4);
      this._skyOut.lerp(this._stormCol, 0.65 * dayFactor + 0.15);
      fogDensity = 0.0062; lightMult = 0.62;
    }

    // Dynamic Hurricane Eyewall vs Calm Eye atmospheric coupling!
    if (inEye) {
      this._eyeCol.setHex(dayFactor > 0.25 ? 0x5c7f99 : 0x162436);
      this._skyOut.lerp(this._eyeCol, 0.62);
      fogDensity = Math.min(fogDensity, 0.0024);
      lightMult = Math.max(lightMult, 0.68);
    } else if (effHurr > 0.01) {
      // Bruised tempest teal-black sky & thickening sea-spray fog!
      const hBlend = Math.min(0.92, effHurr * 0.88);
      this._skyOut.lerp(this._hurricaneCol, hBlend);
      fogDensity = Math.max(fogDensity, 0.0028 + effHurr * 0.0064);
      lightMult = Math.min(lightMult, 1.0 - effHurr * 0.74);
    }

    // Dynamic Abyssal Sea Dread atmospheric coupling (giant cryptids looming from mist!)
    if (seaDread > 0.15) {
      const dreadT = Math.min(1, (seaDread - 0.15) / 0.85);
      this._skyOut.lerp(this._abyssCol, dreadT * 0.52);
      fogDensity += dreadT * 0.0034;
      lightMult *= (1.0 - dreadT * 0.28);
    }

    // Storm & Hurricane Lightning
    if (!inEye && (this.weather === "storm" || effHurr > 0.22)) {
      const rateMult = effHurr > 0.22 ? (1.6 + effHurr * 2.4) : 1.0;
      this.nextLightning -= dt * rateMult;
      if (this.nextLightning <= 0) {
        this.lightningFlash = effHurr > 0.4 ? 1.15 : 1.0;
        this.nextLightning = effHurr > 0.35 ? (2.2 + Math.random() * 5.2) : (5 + Math.random() * 14);
        if (audio && audio.playThunder) audio.playThunder();
      }
    }
    if (this.lightningFlash > 0) {
      this.lightningFlash = Math.max(0, this.lightningFlash - dt * 3.8);
      this._skyOut.lerp(this._flashCol, Math.min(0.85, this.lightningFlash * 0.7));
    }

    const sunInt = (sunY > 0) ? (0.15 + dayFactor * 1.35) * lightMult : (0.10 * lightMult);

    if (this.opticMode === 2 || this.opticMode === 3) {
      // v14.2 TRUE LIGHT-AMPLIFYING NIGHT VISION (1PN51 Green NVG or 140A4 Crimson RED NVD!)
      const isRed = (this.opticMode === 3);
      this._nvgCol.setHex(isRed ? 0x361418 : 0x16381c);
      this.scene.background = this._nvgCol;
      this.scene.fog.color.copy(this._nvgCol);
      this.scene.fog.density = Math.min(fogDensity * 0.32, 0.0024);

      this.sunLight.intensity = Math.max(1.25, sunInt + 0.95);
      this.sunLight.color.setHex(isRed ? 0xffc8c8 : 0xc8ffd0);
      this.hemiLight.intensity = 1.65;
      this.hemiLight.color.setHex(isRed ? 0xffb8be : 0xb8ffc4);
      this.hemiLight.groundColor.setHex(isRed ? 0x5c2a2e : 0x2b5c34);

      this.nvgLight.position.set(focusLocalPos.x, focusLocalPos.y + 18, focusLocalPos.z);
      this.nvgLight.color.setHex(isRed ? 0xffd6d6 : 0xd8ffe0);
      this.nvgLight.intensity = 2.6;
    } else if (this.opticMode === 1) {
      // FLIR White-Hot Thermal: crisp dark-slate background so white-hot targets pop!
      this.scene.background = this._flirCol;
      this.scene.fog.color.copy(this._flirCol);
      this.scene.fog.density = Math.min(fogDensity * 0.35, 0.0022);
      this.sunLight.intensity = Math.max(0.95, sunInt + 0.55);
      this.sunLight.color.setHex(0xdce6f2);
      this.hemiLight.intensity = 0.95;
      this.hemiLight.color.setHex(0xb8c8d8);
      this.hemiLight.groundColor.setHex(0x3a424d);
      this.nvgLight.intensity = 0;
    } else {
      this.scene.background = this._skyOut;
      this.scene.fog.color.copy(this._skyOut);
      this.scene.fog.density = fogDensity;
      this.sunLight.intensity = sunInt + this.lightningFlash * 2.2;
      this.sunLight.color.setHex(sunY > 0.1 ? 0xfff5e4 : (sunY > -0.05 ? 0xff9e66 : 0x5c7ca8));
      this.hemiLight.intensity = (0.10 + dayFactor * 0.55) * lightMult + this.lightningFlash * 0.6;
      this.hemiLight.color.copy(this._skyOut);
      this.hemiLight.groundColor.setHex(effHurr > 0.35 ? 0x16242b : 0x3b352a);
      this.nvgLight.intensity = 0;
    }

    const isRain = !inEye && (this.weather === "rain" || this.weather === "storm" || effHurr > 0.12);
    const isSnow = !inEye && (this.weather === "snow") && effHurr <= 0.12;
    if (isRain || isSnow) {
      if (isRain) {
        const baseOp = this.weather === "storm" ? 0.72 : (this.weather === "rain" ? 0.52 : 0.25);
        this.precipMat.opacity = Math.min(0.95, Math.max(baseOp, 0.38 + effHurr * 0.56));
        this.precipMat.size = 0.28 + effHurr * 0.18;
        this.precipMat.color.setHex(effHurr > 0.35 ? 0xc2e2f2 : 0xa9c9e8);
      } else {
        this.precipMat.opacity = 0.85;
        this.precipMat.size = 0.52;
        this.precipMat.color.setHex(0xffffff);
      }
      this.precipPoints.position.copy(focusLocalPos);

      const pos = this.precipPoints.geometry.attributes.position;
      const fallSpeed = isRain
        ? Math.max(this.weather === "storm" ? 44 : 30, 34 + effHurr * 36)
        : 5.5;
      let windX = isRain ? (this.weather === "storm" ? 12 : 4) : Math.sin(this.timeOfDay * 40) * 3;
      let windZ = 0;
      if (effHurr > 0.05) {
        const hasModWind = (Math.abs(modWindX) + Math.abs(modWindZ)) > 0.5;
        if (hasModWind) {
          // Tilt rain streaks dramatically along hurricane cyclonic wind vector!
          windX = modWindX * 1.35;
          windZ = modWindZ * 1.35;
        } else {
          windX = 18 + effHurr * 24;
          windZ = 10 + effHurr * 16;
        }
      }

      for (let i = 0; i < this.precipCount; i++) {
        let px = pos.getX(i) + windX * dt;
        let py = pos.getY(i) - fallSpeed * dt;
        let pz = pos.getZ(i) + windZ * dt;
        if (py < -4 || px > 46 || px < -46 || pz > 46 || pz < -46) {
          py = 36 + Math.random() * 8;
          px = (Math.random() - 0.5) * 86;
          pz = (Math.random() - 0.5) * 86;
        }
        pos.setXYZ(i, px, py, pz);
      }
      pos.needsUpdate = true;
    } else {
      this.precipMat.opacity = 0;
    }
  }
};
