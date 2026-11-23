// ============================================================================
// js/weather.js — Dynamic 24h Time-of-Day, Sky, Rain/Snow/Fog & Lighting
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

  update(dt, focusLocalPos, audio) {
    this.timeOfDay = (this.timeOfDay + dt * 0.02 * this.timeScale) % 24.0;
    const sunAngle = ((this.timeOfDay - 6) / 24) * Math.PI * 2;
    const sunY = Math.sin(sunAngle), sunX = Math.cos(sunAngle), sunZ = 0.32;
    this.isNight = sunY < 0.04;

    this.sunLight.target.position.copy(focusLocalPos);
    const orbitDist = 115;
    if (sunY >= -0.05) {
      this.sunLight.position.set(focusLocalPos.x + sunX * orbitDist, focusLocalPos.y + Math.max(8, sunY * orbitDist), focusLocalPos.z + sunZ * orbitDist);
    } else {
      this.sunLight.position.set(focusLocalPos.x - sunX * orbitDist, focusLocalPos.y + Math.max(12, -sunY * orbitDist), focusLocalPos.z - sunZ * orbitDist);
    }

    this.sunOrb.position.set(focusLocalPos.x + sunX * 400, focusLocalPos.y + sunY * 400, focusLocalPos.z + sunZ * 400);
    this.sunOrb.visible = sunY > -0.15 && this.weather !== "storm" && this.weather !== "fog";

    this.moonOrb.position.set(focusLocalPos.x - sunX * 390, focusLocalPos.y - sunY * 390, focusLocalPos.z - sunZ * 390);
    this.moonOrb.visible = sunY < 0.1 && this.weather !== "storm" && this.weather !== "fog";

    this.stars.position.copy(focusLocalPos);
    this.starMat.opacity = (this.weather === "clear") ? Math.max(0, Math.min(1, (-sunY - 0.05) * 3.5)) : 0;

    const dayFactor = Math.max(0, Math.min(1, (sunY + 0.12) / 0.42));
    const twilight = Math.max(0, 1 - Math.abs(sunY - 0.02) / 0.22);

    const skyColor = new THREE.Color(0x050914).lerp(new THREE.Color(0x6fa6d6), dayFactor);
    skyColor.lerp(new THREE.Color(0xd16c43), twilight * 0.52);

    let fogDensity = 0.0012, lightMult = 1.0;
    if (this.weather === "overcast") { skyColor.lerp(new THREE.Color(0x4b5561), 0.55 * dayFactor + 0.15); fogDensity = 0.0022; lightMult = 0.65; }
    else if (this.weather === "rain") { skyColor.lerp(new THREE.Color(0x283440), 0.72 * dayFactor + 0.25); fogDensity = 0.0038; lightMult = 0.48; }
    else if (this.weather === "storm") { skyColor.lerp(new THREE.Color(0x141b24), 0.85); fogDensity = 0.0052; lightMult = 0.34; }
    else if (this.weather === "fog") { skyColor.lerp(new THREE.Color(0x8c9aa3), 0.78 * dayFactor + 0.12); fogDensity = 0.0135; lightMult = 0.55; }
    else if (this.weather === "snow") { skyColor.lerp(new THREE.Color(0xaab8c4), 0.65 * dayFactor + 0.15); fogDensity = 0.0062; lightMult = 0.62; }

    if (this.weather === "storm") {
      this.nextLightning -= dt;
      if (this.nextLightning <= 0) {
        this.lightningFlash = 1.0;
        this.nextLightning = 5 + Math.random() * 14;
        if (audio) audio.playThunder();
      }
    }
    if (this.lightningFlash > 0) {
      this.lightningFlash = Math.max(0, this.lightningFlash - dt * 3.8);
      skyColor.lerp(new THREE.Color(0xeef6ff), this.lightningFlash * 0.7);
    }

    const sunInt = (sunY > 0) ? (0.15 + dayFactor * 1.35) * lightMult : (0.10 * lightMult);

    if (this.opticMode === 2 || this.opticMode === 3) {
      // v14.2 TRUE LIGHT-AMPLIFYING NIGHT VISION (1PN51 Green NVG or 140A4 Crimson RED NVD!)
      // Amplifies ambient light massively, punches through pitch-black night & fog, and lights 260m around rig!
      const isRed = (this.opticMode === 3);
      const nvgSky = new THREE.Color(isRed ? 0x361418 : 0x16381c);
      this.scene.background = nvgSky;
      this.scene.fog.color.copy(nvgSky);
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
      const flirBg = new THREE.Color(0x1b222c);
      this.scene.background = flirBg;
      this.scene.fog.color.copy(flirBg);
      this.scene.fog.density = Math.min(fogDensity * 0.35, 0.0022);
      this.sunLight.intensity = Math.max(0.95, sunInt + 0.55);
      this.sunLight.color.setHex(0xdce6f2);
      this.hemiLight.intensity = 0.95;
      this.hemiLight.color.setHex(0xb8c8d8);
      this.hemiLight.groundColor.setHex(0x3a424d);
      this.nvgLight.intensity = 0;
    } else {
      this.scene.background = skyColor;
      this.scene.fog.color.copy(skyColor);
      this.scene.fog.density = fogDensity;
      this.sunLight.intensity = sunInt + this.lightningFlash * 2.2;
      this.sunLight.color.setHex(sunY > 0.1 ? 0xfff5e4 : (sunY > -0.05 ? 0xff9e66 : 0x5c7ca8));
      this.hemiLight.intensity = (0.10 + dayFactor * 0.55) * lightMult + this.lightningFlash * 0.6;
      this.hemiLight.color.copy(skyColor);
      this.hemiLight.groundColor.setHex(0x3b352a);
      this.nvgLight.intensity = 0;
    }

    const isRain = (this.weather === "rain" || this.weather === "storm");
    const isSnow = (this.weather === "snow");
    if (isRain || isSnow) {
      this.precipMat.opacity = isRain ? (this.weather === "storm" ? 0.72 : 0.52) : 0.85;
      this.precipMat.size = isRain ? 0.28 : 0.52;
      this.precipMat.color.setHex(isRain ? 0xa9c9e8 : 0xffffff);
      this.precipPoints.position.copy(focusLocalPos);

      const pos = this.precipPoints.geometry.attributes.position;
      const fallSpeed = isRain ? (this.weather === "storm" ? 44 : 30) : 5.5;
      const windX = isRain ? (this.weather === "storm" ? 12 : 4) : Math.sin(this.timeOfDay * 40) * 3;
      for (let i = 0; i < this.precipCount; i++) {
        let px = pos.getX(i) + windX * dt;
        let py = pos.getY(i) - fallSpeed * dt;
        let pz = pos.getZ(i);
        if (py < -4) { py = 36 + Math.random() * 8; px = (Math.random() - 0.5) * 86; pz = (Math.random() - 0.5) * 86; }
        pos.setXYZ(i, px, py, pz);
      }
      pos.needsUpdate = true;
    } else {
      this.precipMat.opacity = 0;
    }
  }
};
