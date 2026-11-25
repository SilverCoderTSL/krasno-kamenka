// ============================================================================
// js/network.js (v14.2 ONLINE — WSS Relay Edition)
// Zero-Dependency Pure-JS WebSocket-over-TLS Multiplayer (Works on GitHub Pages,
// UAE ISPs, CGNAT, Mobile Data, Strict Firewalls & Same-PC Multi-Tab!)
// + Browser LocalStorage Accounts (`kk_accounts_v14`) + SHA-256 Dev Auth
// ============================================================================
window.KK = window.KK || {};

// ============================================================================
// Minimal RFC/OASIS-Compliant MQTT 3.1.1 over WebSocket Binary Client (QoS 0)
// ============================================================================
KK._MiniMqttWss = class MiniMqttWss {
  constructor(url, clientId, handlers) {
    this.url = url;
    this.clientId = clientId;
    this.h = handlers || {};
    this.ws = null;
    this.connected = false;
    this.closed = false;
    this.pingTimer = null;
    this.rxBuf = new Uint8Array(0);
    this.enc = new TextEncoder();
    this.dec = new TextDecoder();
    this._pktId = 1;
  }

  connect() {
    try {
      const ws = new WebSocket(this.url, ["mqtt"]);
      ws.binaryType = "arraybuffer";
      this.ws = ws;

      ws.onopen = () => {
        if (this.closed) { try { ws.close(); } catch (e) {} return; }
        this._sendConnect();
      };

      ws.onmessage = (ev) => {
        if (this.closed || !(ev.data instanceof ArrayBuffer)) return;
        const chunk = new Uint8Array(ev.data);
        const merged = new Uint8Array(this.rxBuf.length + chunk.length);
        merged.set(this.rxBuf, 0);
        merged.set(chunk, this.rxBuf.length);
        this.rxBuf = merged;
        this._drainRx();
      };

      ws.onerror = () => {
        if (this.h.onError) this.h.onError();
      };

      ws.onclose = () => {
        this._stopPing();
        const wasConn = this.connected;
        this.connected = false;
        if (!this.closed && this.h.onClose) this.h.onClose(wasConn);
      };
    } catch (e) {
      if (this.h.onError) this.h.onError(e);
    }
  }

  close() {
    this.closed = true;
    this.connected = false;
    this._stopPing();
    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN) this.ws.send(new Uint8Array([0xe0, 0x00])); // DISCONNECT
      } catch (e) {}
      try { this.ws.close(); } catch (e) {}
      this.ws = null;
    }
  }

  _stopPing() {
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
  }

  _encodeVarInt(n) {
    const out = [];
    let x = n;
    do {
      let b = x % 128;
      x = Math.floor(x / 128);
      if (x > 0) b |= 128;
      out.push(b);
    } while (x > 0);
    return out;
  }

  _encodeStr(str) {
    const b = this.enc.encode(str);
    const out = new Uint8Array(2 + b.length);
    out[0] = (b.length >> 8) & 0xff;
    out[1] = b.length & 0xff;
    out.set(b, 2);
    return out;
  }

  _buildPacket(firstByte, parts) {
    let bodyLen = 0;
    for (const p of parts) bodyLen += p.length;
    const varLen = this._encodeVarInt(bodyLen);
    const out = new Uint8Array(1 + varLen.length + bodyLen);
    out[0] = firstByte;
    for (let i = 0; i < varLen.length; i++) out[1 + i] = varLen[i];
    let off = 1 + varLen.length;
    for (const p of parts) { out.set(p, off); off += p.length; }
    return out;
  }

  _sendConnect() {
    // MQTT 3.1.1 CONNECT: Protocol "MQTT", Level 4, Clean Session (0x02), KeepAlive 45s
    const varHdr = new Uint8Array([0x00, 0x04, 0x4d, 0x51, 0x54, 0x54, 0x04, 0x02, 0x00, 0x2d]);
    const cidBytes = this._encodeStr(this.clientId);
    const pkt = this._buildPacket(0x10, [varHdr, cidBytes]);
    try { this.ws.send(pkt); } catch (e) {}
  }

  subscribe(topic) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const pid = (this._pktId++ % 65000) + 1;
    const idBytes = new Uint8Array([(pid >> 8) & 0xff, pid & 0xff]);
    const tBytes = this._encodeStr(topic);
    const qosByte = new Uint8Array([0x00]); // QoS 0
    const pkt = this._buildPacket(0x82, [idBytes, tBytes, qosByte]);
    try { this.ws.send(pkt); } catch (e) {}
  }

  publish(topic, textPayload) {
    if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const tBytes = this._encodeStr(topic);
    const pBytes = this.enc.encode(textPayload);
    const pkt = this._buildPacket(0x30, [tBytes, pBytes]); // QoS 0, Retain 0
    try { this.ws.send(pkt); } catch (e) {}
  }

  _drainRx() {
    while (this.rxBuf.length >= 2) {
      let mult = 1, remLen = 0, idx = 1, hasLen = false;
      while (idx < this.rxBuf.length && idx <= 4) {
        const b = this.rxBuf[idx++];
        remLen += (b & 127) * mult;
        if ((b & 128) === 0) { hasLen = true; break; }
        mult *= 128;
      }
      if (!hasLen) return;
      const totalLen = idx + remLen;
      if (this.rxBuf.length < totalLen) return;

      const firstByte = this.rxBuf[0];
      const pktType = firstByte >> 4;
      const flags = firstByte & 0x0f;
      const body = this.rxBuf.subarray(idx, totalLen);
      this.rxBuf = this.rxBuf.slice(totalLen);

      if (pktType === 2) {
        // CONNACK
        if (body.length >= 2 && body[1] === 0) {
          this.connected = true;
          this._stopPing();
          this.pingTimer = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              try { this.ws.send(new Uint8Array([0xc0, 0x00])); } catch (e) {} // PINGREQ
            }
          }, 22000);
          if (this.h.onConnect) this.h.onConnect();
        } else {
          if (this.h.onError) this.h.onError(new Error("CONNACK rejected: " + (body[1] || -1)));
        }
      } else if (pktType === 3) {
        // PUBLISH
        if (body.length < 2) continue;
        const qos = (flags >> 1) & 3;
        const tLen = (body[0] << 8) | body[1];
        const pStart = 2 + tLen + (qos > 0 ? 2 : 0);
        if (pStart > body.length) continue;
        const topic = this.dec.decode(body.subarray(2, 2 + tLen));
        const text = this.dec.decode(body.subarray(pStart));
        if (this.h.onMessage) this.h.onMessage(topic, text);
      } else if (pktType === 9) {
        // SUBACK — broker confirmed our topic subscription is live!
        if (this.h.onSuback) this.h.onSuback();
      }
    }
  }
};

// ============================================================================
// MAIN ONLINE NETWORK CONTROLLER (Drop-in Replacement for KK.LanNetwork)
// ============================================================================
KK.LanNetwork = class LanNetwork {
  constructor(callbacks) {
    this.cb = callbacks || {};
    this.mode = "offline"; // offline | wss_host | wss_client
    this.peerId = null;
    this.roomCode = "";
    this.isHost = false;
    this.callsign = localStorage.getItem("kk_callsign") || ("COMRADE-" + Math.floor(10 + Math.random() * 89));
    this.hostAddr = "";
    this.roster = [];
    this.remotePlayers = new Map();
    this.convoys = [];
    this.sendAccum = 0;

    // WSS Relay Broker Pool (Auto-failover; prefix encodes broker so Host & Joiner ALWAYS meet on the same relay!)
    this._brokers = [
      { prefix: "KK", name: "HIVEMQ-TLS",  url: "wss://broker.hivemq.com:8884/mqtt" },
      { prefix: "K2", name: "EMQX-TLS",    url: "wss://broker.emqx.io:8084/mqtt" },
      { prefix: "K3", name: "ECLIPSE-443", url: "wss://mqtt.eclipseprojects.io/mqtt" }
    ];
    this.mqtt = null;
    this.topicToHost = "";
    this.topicFromHost = "";
    this.hostPeers = new Map(); // peerId -> { peerId, callsign, lastSeen }
    this.worldClockTimer = null;
    this.hostWorldState = null;
    this._joinRetryTimer = null;
    this._joinTimeout = null;
    this._clientPingTimer = null;

    // Salted SHA-256 hash of Silver's Dev Key (raw key is NEVER stored in public JS!)
    this._devKeySalt = "kk-dev-v14:";
    this._devKeyHash = "40e3962198517b21a3a977f83d248e88325c116e877c8023caa12f5e9a2a26f1";
    this._accountsKey = "kk_accounts_v14";

    window.addEventListener("beforeunload", () => {
      if (this.mode === "wss_client" && this.mqtt && this.mqtt.connected && this.peerId) {
        this.mqtt.publish(this.topicToHost, JSON.stringify({ type: "client_bye", peerId: this.peerId, callsign: this.callsign }));
      }
    });
  }

  // ==========================================================================
  // SHA-256 HELPER (Web Crypto on HTTPS + Pure-JS Fallback for HTTP)
  // ==========================================================================
  async _sha256Hex(str) {
    try {
      if (window.crypto && window.crypto.subtle && window.TextEncoder) {
        const buf = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
        return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
      }
    } catch (e) {}
    return this._sha256Fallback(str);
  }

  _sha256Fallback(ascii) {
    const rightRotate = (v, amt) => (v >>> amt) | (v << (32 - amt));
    const maxWord = Math.pow(2, 32);
    let result = "";
    const words = [];
    const asciiBitLength = ascii.length * 8;
    const hash = [];
    const k = [];
    let primeCounter = 0;
    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    let s = ascii + "\x80";
    while (s.length % 64 - 56) s += "\x00";
    for (let i = 0; i < s.length; i++) {
      const j = s.charCodeAt(i);
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = ((asciiBitLength / maxWord) | 0);
    words[words.length] = (asciiBitLength | 0);
    for (let j = 0; j < words.length;) {
      const w = words.slice(j, j += 16);
      const oldHash = hash.slice(0);
      for (let i = 0; i < 64; i++) {
        const w15 = w[i - 15], w2 = w[i - 2];
        const a = hash[0], e = hash[4];
        const temp1 = hash[7] + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
          ((e & hash[5]) ^ ((~e) & hash[6])) + k[i] +
          (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
            w[i - 7] + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) | 0);
        const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
          ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash.unshift((temp1 + temp2) | 0);
        hash[4] = (hash[4] + temp1) | 0;
        hash.pop();
      }
      for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (let i = 0; i < 8; i++) {
      for (let j = 3; j + 1; j--) {
        const b = (hash[i] >> (j * 8)) & 255;
        result += ((b < 16) ? "0" : "") + b.toString(16);
      }
    }
    return result;
  }

  // ==========================================================================
  // LOCALSTORAGE DRIVER ACCOUNTS (`kk_accounts_v14`) + SHA-256 DEV UNLOCK
  // ==========================================================================
  _loadAccountsDb() {
    try {
      const raw = localStorage.getItem(this._accountsKey);
      const parsed = raw ? JSON.parse(raw) : {};
      return (parsed && typeof parsed === "object") ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  _saveAccountsDb(db) {
    try { localStorage.setItem(this._accountsKey, JSON.stringify(db)); } catch (e) {}
  }

  _cleanUser(raw) {
    return String(raw || "").replace(/[^A-Za-z0-9_\- ]/g, "").trim().slice(0, 20);
  }

  async accountLogin(username, pin, action = "login", initialSave = null) {
    const clean = this._cleanUser(username);
    const cleanPin = String(pin || "").trim();
    if (clean.length < 2) return { ok: false, error: "Username must be at least 2 characters." };
    if (cleanPin.length < 2) return { ok: false, error: "PIN / Password must be at least 2 characters." };

    const key = clean.toLowerCase();
    const pinHash = await this._sha256Hex("kk-pin:" + key + ":" + cleanPin);
    const db = this._loadAccountsDb();
    const act = String(action || "login").toLowerCase();

    if (act === "register") {
      if (db[key]) return { ok: false, error: `Account '${clean}' already exists in this browser! Click LOGIN instead.` };
      db[key] = {
        username: clean, pinHash, isDev: false,
        createdAt: Date.now(), lastLogin: Date.now(), saveData: initialSave || null
      };
      this._saveAccountsDb(db);
      return { ok: true, username: clean, isNew: true, isDev: false, saveData: db[key].saveData };
    }

    const acc = db[key];
    if (!acc) {
      if (act === "auto") {
        db[key] = {
          username: clean, pinHash, isDev: false,
          createdAt: Date.now(), lastLogin: Date.now(), saveData: initialSave || null
        };
        this._saveAccountsDb(db);
        return { ok: true, username: clean, isNew: true, isDev: false, saveData: db[key].saveData };
      }
      return { ok: false, error: `Account '${clean}' not found in this browser. Click REGISTER to create it!` };
    }

    if (acc.pinHash !== pinHash) {
      return { ok: false, error: "Wrong PIN / Password for this account!" };
    }
    acc.lastLogin = Date.now();
    this._saveAccountsDb(db);
    return { ok: true, username: acc.username, isNew: false, isDev: !!acc.isDev, saveData: acc.saveData || null };
  }

  async accountChangePassword(username, oldPin, newPin) {
    const clean = this._cleanUser(username);
    const oPin = String(oldPin || "").trim();
    const nPin = String(newPin || "").trim();
    if (nPin.length < 2) return { ok: false, error: "New PIN / Password must be at least 2 characters." };
    const key = clean.toLowerCase();
    const db = this._loadAccountsDb();
    const acc = db[key];
    if (!acc) return { ok: false, error: "Account not found." };
    const oldHash = await this._sha256Hex("kk-pin:" + key + ":" + oPin);
    if (acc.pinHash !== oldHash) return { ok: false, error: "Current PIN / Password is incorrect!" };
    acc.pinHash = await this._sha256Hex("kk-pin:" + key + ":" + nPin);
    this._saveAccountsDb(db);
    return { ok: true, username: acc.username };
  }

  async accountClaimDev(username, pin, devKey) {
    const clean = this._cleanUser(username);
    const key = clean.toLowerCase();
    const db = this._loadAccountsDb();
    const acc = db[key];
    if (!acc) return { ok: false, error: "Register & login to your Silver account first!" };
    const pinHash = await this._sha256Hex("kk-pin:" + key + ":" + String(pin || "").trim());
    if (acc.pinHash !== pinHash) return { ok: false, error: "Invalid account credentials." };
    if (key !== "silver") return { ok: false, error: "Dev authorization is strictly restricted to the Silver account." };

    const enteredHash = await this._sha256Hex(this._devKeySalt + String(devKey || "").trim());
    if (enteredHash !== this._devKeyHash) {
      return { ok: false, error: "Invalid Secret Dev Key!" };
    }
    for (const k of Object.keys(db)) {
      if (k !== key && db[k]) db[k].isDev = false;
    }
    acc.isDev = true;
    this._saveAccountsDb(db);
    return { ok: true, username: acc.username, isDev: true };
  }

  async accountSave(username, pin, saveData) {
    const clean = this._cleanUser(username);
    if (!clean || !pin) return { ok: false };
    const key = clean.toLowerCase();
    const db = this._loadAccountsDb();
    const acc = db[key];
    if (!acc) return { ok: false };
    const pinHash = await this._sha256Hex("kk-pin:" + key + ":" + String(pin || "").trim());
    if (acc.pinHash !== pinHash) return { ok: false };
    acc.saveData = saveData;
    acc.lastLogin = Date.now();
    this._saveAccountsDb(db);
    return { ok: true };
  }

  async fetchLeaderboard() {
    const db = this._loadAccountsDb();
    const drivers = [];
    for (const acc of Object.values(db)) {
      if (!acc || !acc.username) continue;
      const sd = acc.saveData || {};
      const st = sd.stats || {};
      drivers.push({
        username: acc.username,
        money: Math.round(Number(sd.money) || 18000),
        deliveries: Number(st.deliveries) || 0,
        distanceKm: +(Number(st.distanceKm) || 0).toFixed(1),
        carsOwned: sd.ownedVehicles ? Object.keys(sd.ownedVehicles).length : 1
      });
    }
    drivers.sort((a, b) => (b.money - a.money) || (b.deliveries - a.deliveries));
    return { ok: true, drivers };
  }

  // ==========================================================================
  // WSS RELAY MULTIPLAYER (HOST / JOIN / AUTHORITATIVE WORLD CLOCK)
  // ==========================================================================
  _randCode(len = 4) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  getShareInviteUrl() {
    if (!this.roomCode) return window.location.href;
    const base = window.location.origin + window.location.pathname;
    return `${base}?room=${encodeURIComponent(this.roomCode)}`;
  }

  disconnect() {
    if (this.worldClockTimer) { clearInterval(this.worldClockTimer); this.worldClockTimer = null; }
    if (this._joinRetryTimer) { clearInterval(this._joinRetryTimer); this._joinRetryTimer = null; }
    if (this._joinTimeout) { clearTimeout(this._joinTimeout); this._joinTimeout = null; }
    if (this._clientPingTimer) { clearInterval(this._clientPingTimer); this._clientPingTimer = null; }
    if (this.mqtt) { this.mqtt.close(); this.mqtt = null; }

    this.hostPeers.clear();
    for (const [pid, rp] of this.remotePlayers.entries()) {
      if (this.cb.onPeerLeft) this.cb.onPeerLeft(pid, rp.callsign);
    }
    this.remotePlayers.clear();
    this.roster = [];
    this.mode = "offline";
    this.isHost = false;
    this.roomCode = "";
    this.peerId = null;
    if (this.cb.onRoster) this.cb.onRoster([], false);
    if (this.cb.onStatus) this.cb.onStatus("SOLO MODE — CLICK HOST OR JOIN", false);
  }

  _initHostWorldState() {
    const g = window.__GAME__;
    const curTime = (g && g.weather) ? g.weather.timeOfDay : 8.5;
    const curW = (g && g.weather) ? g.weather.weather : "clear";
    const curTs = (g && g.weather) ? g.weather.timeScale : 1.0;
    return {
      seed: 404911,
      bridgeSeed: Math.floor(100000 + Math.random() * 899999),
      timeOfDay: curTime,
      timeScale: curTs,
      weather: curW,
      weatherNextChange: Date.now() + 180000,
      brokenPlanks: {},
      brokenTrees: [],
      brokenFences: [],
      milCamp: { x: +(5200 + Math.random() * 10000).toFixed(1), z: +(-7100 + Math.random() * 2700).toFixed(1) },
      bm21Camp: { x: +(5400 + Math.random() * 8000).toFixed(1), z: +(7600 + Math.random() * 7000).toFixed(1) },
      shilkaCamp: { x: +(-11400 + Math.random() * 5600).toFixed(1), z: +(-3800 + Math.random() * 5400).toFixed(1) },
      craters: [],
      gasOutages: {},
      cryptids: {},
      tornado: null,
      players: {},
      winches: {},
      convoys: {},
      lastTick: Date.now()
    };
  }

  _buildHostSnapshot(targetPeerId = null) {
    const ws = this.hostWorldState;
    const now = Date.now();
    const gasOut = {};
    for (const [k, exp] of Object.entries(ws.gasOutages)) {
      if (exp > now) gasOut[k] = +((exp - now) / 1000).toFixed(1);
    }
    return {
      type: "server_snapshot",
      _to: targetPeerId || undefined,
      seed: ws.seed,
      bridgeSeed: ws.bridgeSeed,
      timeOfDay: +ws.timeOfDay.toFixed(3),
      timeScale: ws.timeScale,
      weather: ws.weather,
      brokenPlanks: ws.brokenPlanks,
      brokenTrees: ws.brokenTrees.slice(-800),
      brokenFences: ws.brokenFences.slice(-800),
      milCamp: ws.milCamp,
      bm21Camp: ws.bm21Camp,
      shilkaCamp: ws.shilkaCamp,
      craters: ws.craters.slice(-100),
      gasOutages: gasOut,
      cryptids: ws.cryptids,
      tornado: ws.tornado,
      players: Object.values(ws.players),
      winches: Object.values(ws.winches),
      convoys: Object.values(ws.convoys)
    };
  }

  _buildHostRosterPacket() {
    const peers = [{ peerId: this.peerId, callsign: this.callsign, isHost: true }];
    for (const entry of this.hostPeers.values()) {
      peers.push({ peerId: entry.peerId, callsign: entry.callsign || entry.peerId, isHost: false });
    }
    return { type: "roster", hostId: this.peerId, peers };
  }

  _publishFromHost(msg) {
    if (!this.mqtt || !this.mqtt.connected || !this.topicFromHost) return;
    try { this.mqtt.publish(this.topicFromHost, JSON.stringify(msg)); } catch (e) {}
  }

  _applyHostWorldState(msg) {
    const ws = this.hostWorldState;
    if (!ws || !msg || !msg.type) return;
    const mtype = msg.type, pid = msg.peerId;
    const weathers = ["clear", "overcast", "rain", "storm", "fog", "snow"];

    if (mtype === "player_state" && pid) {
      ws.players[pid] = msg;
    } else if (mtype === "plank_break") {
      const bid = String(msg.bridgeId || "");
      const pidx = msg.plankIdx;
      if (bid && typeof pidx === "number") {
        if (!ws.brokenPlanks[bid]) ws.brokenPlanks[bid] = [];
        if (!ws.brokenPlanks[bid].includes(pidx)) ws.brokenPlanks[bid].push(pidx);
      }
    } else if (mtype === "bridge_repair") {
      const bid = String(msg.bridgeId || "");
      if (bid === "__ALL__") ws.brokenPlanks = {};
      else if (ws.brokenPlanks[bid]) ws.brokenPlanks[bid] = [];
    } else if (mtype === "env_control") {
      if (typeof msg.timeOfDay === "number" && !isNaN(msg.timeOfDay)) ws.timeOfDay = ((msg.timeOfDay % 24) + 24) % 24;
      if (msg.weather && weathers.includes(msg.weather)) {
        ws.weather = msg.weather;
        ws.weatherNextChange = Date.now() + 210000;
        msg.weatherChanged = true;
      }
      if (typeof msg.timeScale === "number" && !isNaN(msg.timeScale)) ws.timeScale = Math.max(0, Math.min(20, msg.timeScale));
    } else if (mtype === "winch_update" && pid) {
      if (msg.active) {
        ws.winches[pid] = {
          ownerPeerId: pid, targetPeerId: msg.targetPeerId,
          anchorPos: msg.anchorPos, length: Number(msg.length) || 25, reeling: Number(msg.reeling) || 0
        };
      } else {
        delete ws.winches[pid];
      }
    } else if (mtype === "convoy_create" && pid) {
      const cid = String(msg.convoyId || ("CONV-" + Math.floor(1000 + Math.random() * 9000)));
      ws.convoys[cid] = {
        id: cid, title: String(msg.title || "Convoy Haul").slice(0, 60),
        fromTown: msg.fromTown || 0, toTown: msg.toTown || 2, toBar: !!msg.toBar,
        reward: Math.round(Number(msg.reward) || 8500),
        cargoType: msg.cargoType || "standard",
        hostPeer: pid, participants: [pid], completedBy: []
      };
      msg.convoy = ws.convoys[cid];
    } else if (mtype === "convoy_join" && pid) {
      const cv = ws.convoys[String(msg.convoyId || "")];
      if (cv && !cv.participants.includes(pid)) cv.participants.push(pid);
      msg.convoy = cv;
    } else if (mtype === "convoy_complete" && pid) {
      const cv = ws.convoys[String(msg.convoyId || "")];
      if (cv && !cv.completedBy.includes(pid)) cv.completedBy.push(pid);
      msg.convoy = cv;
    } else if (mtype === "tree_break") {
      const tid = String(msg.treeId || "");
      if (tid && !ws.brokenTrees.includes(tid)) {
        ws.brokenTrees.push(tid);
        if (ws.brokenTrees.length > 800) ws.brokenTrees = ws.brokenTrees.slice(-800);
      }
    } else if (mtype === "fence_break") {
      const fid = String(msg.fenceId || "");
      if (fid && !ws.brokenFences.includes(fid)) {
        ws.brokenFences.push(fid);
        if (ws.brokenFences.length > 800) ws.brokenFences = ws.brokenFences.slice(-800);
      }
    } else if (mtype === "gas_explode") {
      const tid = String(parseInt(msg.townId, 10));
      if (tid !== "NaN") ws.gasOutages[tid] = Date.now() + 60000;
    } else if (mtype === "crater_add") {
      ws.craters.push({
        x: +(Number(msg.x) || 0).toFixed(1),
        z: +(Number(msg.z) || 0).toFixed(1),
        r: Math.max(2, Math.min(14, +(Number(msg.r) || 5.5).toFixed(1))),
        d: Math.max(0.4, Math.min(3.8, +(Number(msg.d) || 1.6).toFixed(2)))
      });
      if (ws.craters.length > 100) ws.craters = ws.craters.slice(-100);
    } else if (mtype === "cryptid_sync" && msg.cryptids) {
      ws.cryptids = msg.cryptids;
    } else if (mtype === "hazard_sync") {
      ws.tornado = msg.tornado || null;
    }
  }

  _startHostWorldClock() {
    if (this.worldClockTimer) clearInterval(this.worldClockTimer);
    const weathers = ["clear", "overcast", "rain", "storm", "fog", "snow"];
    this.worldClockTimer = setInterval(() => {
      if (!this.isHost || !this.hostWorldState) return;
      const ws = this.hostWorldState;
      const now = Date.now();
      const dt = Math.min(5.0, Math.max(0.1, (now - ws.lastTick) / 1000));
      ws.lastTick = now;
      ws.timeOfDay = (ws.timeOfDay + dt * 0.02 * ws.timeScale) % 24.0;

      // Prune timed-out disconnected clients (> 14s silent)
      let rosterDirty = false;
      for (const [cid, entry] of this.hostPeers.entries()) {
        if (now - entry.lastSeen > 14000) {
          this.hostPeers.delete(cid);
          delete ws.players[cid];
          delete ws.winches[cid];
          const leftPkt = { type: "peer_left", peerId: cid, callsign: entry.callsign || cid };
          this._handleMessage(leftPkt);
          this._publishFromHost(leftPkt);
          rosterDirty = true;
        }
      }
      if (rosterDirty) {
        const rPkt = this._buildHostRosterPacket();
        this.roster = rPkt.peers;
        if (this.cb.onRoster) this.cb.onRoster(this.roster, true);
        this._publishFromHost(rPkt);
      }

      let weatherChanged = false;
      if (now >= ws.weatherNextChange) {
        ws.weather = weathers[Math.floor(Math.random() * weathers.length)];
        ws.weatherNextChange = now + (170 + Math.random() * 110) * 1000;
        weatherChanged = true;
      }

      const pkt = {
        type: "env_sync",
        timeOfDay: +ws.timeOfDay.toFixed(3),
        weather: ws.weather,
        timeScale: ws.timeScale,
        weatherChanged
      };
      if (this.hostPeers.size > 0) this._publishFromHost(pkt);
      if (weatherChanged && this.cb.onEnvSync) this.cb.onEnvSync(pkt);
    }, 2000);
  }

  hostRoom(callsign = null) {
    if (callsign) {
      this.callsign = callsign.slice(0, 20);
      localStorage.setItem("kk_callsign", this.callsign);
    }
    this.disconnect();
    const suffix = this._randCode(4);
    this._tryHostBroker(0, suffix);
  }

  _tryHostBroker(brokerIdx, suffix) {
    if (brokerIdx >= this._brokers.length) {
      if (this.cb.onStatus) this.cb.onStatus("ALL ONLINE RELAYS BLOCKED — SOLO MODE", false);
      return;
    }
    const br = this._brokers[brokerIdx];
    const roomCode = `${br.prefix}-${suffix}`;
    const myPeerId = `HOST-${this._randCode(5)}`;
    const clientId = `kk_h_${this._randCode(8)}`;

    if (this.cb.onStatus) this.cb.onStatus(`CONNECTING RELAY (${br.name})...`, false);
    console.log(`[ONLINE] Attempting Host via ${br.name} (${br.url}) for room ${roomCode}...`);

    let settled = false;
    const mqtt = new KK._MiniMqttWss(br.url, clientId, {
      onConnect: () => {
        if (settled) return;
        settled = true;
        clearTimeout(failTimer);

        this.mqtt = mqtt;
        this.mode = "wss_host";
        this.isHost = true;
        this.peerId = myPeerId;
        this.roomCode = roomCode;
        this.hostAddr = roomCode;
        this.topicToHost = `kk_oblast_v14/${roomCode}/to_host`;
        this.topicFromHost = `kk_oblast_v14/${roomCode}/from_host`;
        this.hostWorldState = this._initHostWorldState();

        mqtt.subscribe(this.topicToHost);
        console.log(`[ONLINE] Hosting Room ${roomCode} on ${br.name}!`);

        const hostIn = document.getElementById("lan-host-input");
        if (hostIn) hostIn.value = roomCode;
        const smIn = document.getElementById("sm-host-input");
        if (smIn) smIn.value = roomCode;

        if (this.cb.onStatus) this.cb.onStatus("HOSTING: " + roomCode + " (COPY)", true);
        if (this.cb.onWelcome) this.cb.onWelcome({ type: "welcome", peerId: myPeerId, isHost: true, roomCode });
        if (this.cb.onSnapshot) this.cb.onSnapshot(this._buildHostSnapshot());
        const rPkt = this._buildHostRosterPacket();
        this.roster = rPkt.peers;
        if (this.cb.onRoster) this.cb.onRoster(this.roster, true);
        this._startHostWorldClock();
      },
      onSuback: () => {
        console.log(`[ONLINE] Host subscription confirmed (SUBACK) on ${this.topicToHost}`);
      },
      onMessage: (_topic, text) => {
        let msg = null;
        try { msg = JSON.parse(text); } catch (e) { return; }
        if (!msg || !msg.type || !msg.peerId || msg.peerId === this.peerId) return;
        const cid = msg.peerId;

        if (msg.type === "client_bye") {
          const old = this.hostPeers.get(cid);
          if (old) {
            this.hostPeers.delete(cid);
            if (this.hostWorldState) { delete this.hostWorldState.players[cid]; delete this.hostWorldState.winches[cid]; }
            const leftPkt = { type: "peer_left", peerId: cid, callsign: old.callsign || cid };
            this._handleMessage(leftPkt);
            this._publishFromHost(leftPkt);
            const rPkt = this._buildHostRosterPacket();
            this.roster = rPkt.peers;
            if (this.cb.onRoster) this.cb.onRoster(this.roster, true);
            this._publishFromHost(rPkt);
          }
          return;
        }

        const isNewPeer = !this.hostPeers.has(cid);
        const entry = this.hostPeers.get(cid) || { peerId: cid, callsign: msg.callsign || "DRIVER", lastSeen: Date.now() };
        entry.lastSeen = Date.now();
        if (msg.callsign) entry.callsign = String(msg.callsign).slice(0, 20);
        this.hostPeers.set(cid, entry);

        if (msg.type === "join_hello" || isNewPeer) {
          console.log(`[ONLINE] Host received ${msg.type} from ${entry.callsign} (${cid}) — sending welcome & snapshot!`);
          this._publishFromHost({ type: "welcome", _to: cid, peerId: cid, isHost: false, roomCode: this.roomCode });
          setTimeout(() => {
            if (this.mode !== "wss_host") return;
            this._publishFromHost(this._buildHostSnapshot(cid));
            const rPkt = this._buildHostRosterPacket();
            this.roster = rPkt.peers;
            if (this.cb.onRoster) this.cb.onRoster(this.roster, true);
            this._publishFromHost(rPkt);
          }, 80);
          if (isNewPeer) {
            const joinChat = { type: "chat_msg", sender: "DISPATCH", text: `${entry.callsign} joined room ${this.roomCode}!`, system: true };
            this._handleMessage(joinChat);
            setTimeout(() => { if (this.mode === "wss_host") this._publishFromHost(joinChat); }, 140);
          }
          if (msg.type === "join_hello") return;
        }

        if (msg.type === "client_ping") return;

        this._applyHostWorldState(msg);
        this._handleMessage(msg);
        this._publishFromHost(msg);
      },
      onError: () => {
        if (settled) return;
        settled = true;
        clearTimeout(failTimer);
        mqtt.close();
        this._tryHostBroker(brokerIdx + 1, suffix);
      },
      onClose: (wasConn) => {
        if (!settled) {
          settled = true;
          clearTimeout(failTimer);
          this._tryHostBroker(brokerIdx + 1, suffix);
        } else if (wasConn && this.mode === "wss_host") {
          if (this.cb.onStatus) this.cb.onStatus("RELAY DROPPED — CLICK HOST TO RE-OPEN", false);
        }
      }
    });

    const failTimer = setTimeout(() => {
      if (!settled) {
        settled = true;
        mqtt.close();
        this._tryHostBroker(brokerIdx + 1, suffix);
      }
    }, 4000);

    mqtt.connect();
  }

  joinRoom(rawCode, callsign = null) {
    if (callsign) {
      this.callsign = callsign.slice(0, 20);
      localStorage.setItem("kk_callsign", this.callsign);
    }
    let code = String(rawCode || "").trim().toUpperCase();
    if (!code) { this.disconnect(); return; }
    if (/^[A-Z0-9]{4}$/.test(code)) code = "KK-" + code;

    if (this.isHost && this.mode === "wss_host" && this.roomCode === code) {
      if (this.cb.onStatus) this.cb.onStatus("ALREADY HOSTING: " + code + " (COPY)", true);
      return;
    }
    this.disconnect();
    this.roomCode = code;
    this.hostAddr = code;
    localStorage.setItem("kk_room_code", code);

    const hostIn = document.getElementById("lan-host-input");
    if (hostIn) hostIn.value = code;
    const smIn = document.getElementById("sm-host-input");
    if (smIn) smIn.value = code;

    // Pick exact broker encoded by room prefix (`KK-` -> EMQX, `K2-` -> HiveMQ, `K3-` -> Eclipse 443)
    const prefix = code.split("-")[0];
    const br = this._brokers.find((b) => b.prefix === prefix) || this._brokers[0];
    const myPeerId = `P-${this._randCode(6)}`;
    const clientId = `kk_c_${this._randCode(8)}`;

    if (this.cb.onStatus) this.cb.onStatus(`JOINING ${code} (${br.name})...`, false);
    console.log(`[ONLINE] Joining Room ${code} via ${br.name} (${br.url})...`);

    const topicToHost = `kk_oblast_v14/${code}/to_host`;
    const topicFromHost = `kk_oblast_v14/${code}/from_host`;
    this.topicToHost = topicToHost;
    this.topicFromHost = topicFromHost;
    this.peerId = myPeerId;

    let handshakeOk = false;
    const mqtt = new KK._MiniMqttWss(br.url, clientId, {
      onConnect: () => {
        this.mqtt = mqtt;
        mqtt.subscribe(topicFromHost);
        console.log(`[ONLINE] Relay connected (${br.name})! Waiting for SUBACK on ${topicFromHost}...`);

        let helloStarted = false;
        const startHelloLoop = () => {
          if (helloStarted || handshakeOk) return;
          helloStarted = true;
          const sendHello = () => {
            if (mqtt.connected && !handshakeOk) {
              mqtt.publish(topicToHost, JSON.stringify({ type: "join_hello", peerId: myPeerId, callsign: this.callsign }));
            }
          };
          console.log(`[ONLINE] Subscribed! Sending join_hello for ${code}...`);
          sendHello();
          this._joinRetryTimer = setInterval(sendHello, 1600);
        };
        mqtt._startHelloLoop = startHelloLoop;
        // Fallback start if broker doesn't send SUBACK promptly
        setTimeout(startHelloLoop, 700);

        this._joinTimeout = setTimeout(() => {
          if (!handshakeOk) {
            if (this._joinRetryTimer) { clearInterval(this._joinRetryTimer); this._joinRetryTimer = null; }
            if (this.cb.onStatus) this.cb.onStatus(`HOST OF ${code} NOT RESPONDING`, false);
            console.log(`[ONLINE] Timed out waiting for Host of ${code} to reply.`);
          }
        }, 10000);
      },
      onSuback: () => {
        if (mqtt._startHelloLoop) mqtt._startHelloLoop();
      },
      onMessage: (_topic, text) => {
        let msg = null;
        try { msg = JSON.parse(text); } catch (e) { return; }
        if (!msg || !msg.type) return;
        // Filter directed packets (`welcome`, `server_snapshot`) meant for another client
        if (msg._to && msg._to !== this.peerId) return;
        // Ignore our own echoed packets relayed back by Host
        if (msg.peerId && msg.peerId === this.peerId && msg.type !== "welcome" && msg.type !== "convoy_create" && msg.type !== "convoy_join" && msg.type !== "convoy_complete") {
          return;
        }

        if (msg.type === "welcome" && !handshakeOk) {
          handshakeOk = true;
          if (this._joinRetryTimer) { clearInterval(this._joinRetryTimer); this._joinRetryTimer = null; }
          if (this._joinTimeout) { clearTimeout(this._joinTimeout); this._joinTimeout = null; }
          this.mode = "wss_client";
          this.isHost = false;
          if (this.cb.onStatus) this.cb.onStatus("ONLINE: " + code, true);
          console.log(`[ONLINE] Joined Room ${code} successfully!`);
          this._clientPingTimer = setInterval(() => {
            if (this.mqtt && this.mqtt.connected && this.mode === "wss_client") {
              this.mqtt.publish(this.topicToHost, JSON.stringify({ type: "client_ping", peerId: this.peerId, callsign: this.callsign }));
            }
          }, 5000);
        }

        this._handleMessage(msg);
      },
      onError: () => {
        if (!handshakeOk && this.cb.onStatus) {
          this.cb.onStatus(`RELAY ${br.name} BLOCKED / OFFLINE`, false);
        }
      },
      onClose: () => {
        if (this._joinRetryTimer) { clearInterval(this._joinRetryTimer); this._joinRetryTimer = null; }
        if (this._joinTimeout) { clearTimeout(this._joinTimeout); this._joinTimeout = null; }
        if (this._clientPingTimer) { clearInterval(this._clientPingTimer); this._clientPingTimer = null; }
        if (this.mode === "wss_client") {
          this.mode = "offline";
          for (const [pid, rp] of this.remotePlayers.entries()) {
            if (this.cb.onPeerLeft) this.cb.onPeerLeft(pid, rp.callsign);
          }
          this.remotePlayers.clear();
          this.roster = [];
          if (this.cb.onRoster) this.cb.onRoster([], false);
          if (this.cb.onStatus) this.cb.onStatus("DISCONNECTED FROM RELAY (SOLO)", false);
        }
      }
    });

    this.mqtt = mqtt;
    mqtt.connect();
  }

  connect(roomCode, callsign) {
    if (callsign) {
      this.callsign = callsign.slice(0, 20);
      localStorage.setItem("kk_callsign", this.callsign);
    }
    const clean = String(roomCode || "").trim();
    if (!clean || clean.includes(":") || clean.includes(".")) {
      if (this.cb.onStatus) this.cb.onStatus("SOLO MODE — CLICK HOST OR JOIN", false);
      return;
    }
    this.joinRoom(clean, this.callsign);
  }

  send(msg) {
    if (!msg || !msg.type || !this.mqtt || !this.mqtt.connected) return;
    const out = Object.assign({}, msg, { peerId: this.peerId });

    if (this.mode === "wss_host") {
      if (out.type === "join_hello" && out.callsign) {
        this.callsign = String(out.callsign).slice(0, 20);
        const rPkt = this._buildHostRosterPacket();
        this.roster = rPkt.peers;
        if (this.cb.onRoster) this.cb.onRoster(this.roster, true);
        this._publishFromHost(rPkt);
        return;
      }
      this._applyHostWorldState(out);
      this._publishFromHost(out);
      if (out.type === "convoy_create" || out.type === "convoy_join" || out.type === "convoy_complete") {
        this._handleMessage(out);
      }
    } else if (this.mode === "wss_client") {
      try { this.mqtt.publish(this.topicToHost, JSON.stringify(out)); } catch (e) {}
    }
  }

  _handleMessage(msg) {
    if (!msg || !msg.type) return;
    switch (msg.type) {
      case "welcome":
        this.peerId = msg.peerId; this.isHost = !!msg.isHost;
        if (msg.roomCode) this.roomCode = msg.roomCode;
        if (this.cb.onWelcome) this.cb.onWelcome(msg);
        break;
      case "server_snapshot":
        if (this.cb.onSnapshot) this.cb.onSnapshot(msg);
        if (Array.isArray(msg.players)) for (const p of msg.players) if (p.peerId && p.peerId !== this.peerId) this._upsertRemotePlayer(p);
        if (Array.isArray(msg.convoys)) { this.convoys = msg.convoys; if (this.cb.onConvoys) this.cb.onConvoys(this.convoys); }
        break;
      case "roster":
        this.roster = msg.peers || []; this.isHost = (msg.hostId === this.peerId);
        if (this.cb.onRoster) this.cb.onRoster(this.roster, this.isHost);
        break;
      case "player_state":
        if (msg.peerId && msg.peerId !== this.peerId) this._upsertRemotePlayer(msg);
        break;
      case "peer_left":
        if (msg.peerId && this.cb.onPeerLeft) this.cb.onPeerLeft(msg.peerId, msg.callsign);
        this.remotePlayers.delete(msg.peerId);
        break;
      case "env_sync":
      case "env_control":
        if (this.cb.onEnvSync) this.cb.onEnvSync(msg);
        break;
      case "plank_break":
        if (this.cb.onPlankBreak) this.cb.onPlankBreak(msg);
        break;
      case "bridge_repair":
        if (this.cb.onBridgeRepair) this.cb.onBridgeRepair(msg);
        break;
      case "tree_break":
        if (this.cb.onTreeBreak) this.cb.onTreeBreak(msg);
        break;
      case "cryptid_sync":
        if (this.cb.onCryptidSync) this.cb.onCryptidSync(msg);
        break;
      case "cryptid_counter":
        if (this.cb.onCryptidCounter) this.cb.onCryptidCounter(msg);
        break;
      case "vehicle_ram":
        if (msg.targetPeerId === this.peerId && this.cb.onVehicleRam) this.cb.onVehicleRam(msg);
        break;
      case "flare_throw":
        if (this.cb.onFlareThrow) this.cb.onFlareThrow(msg);
        break;
      case "hazard_sync":
        if (this.cb.onHazardSync) this.cb.onHazardSync(msg);
        break;
      case "hazard_event":
        if (this.cb.onHazardEvent) this.cb.onHazardEvent(msg);
        break;
      case "fence_break":
        if (this.cb.onFenceBreak) this.cb.onFenceBreak(msg);
        break;
      case "coop_assist":
        if (msg.targetPeerId === this.peerId && this.cb.onCoopAssist) this.cb.onCoopAssist(msg);
        break;
      case "carrier_sync":
        if (msg.targetPeerId === this.peerId && this.cb.onCarrierSync) this.cb.onCarrierSync(msg);
        break;
      case "weapon_fire":
        if (this.cb.onWeaponFire) this.cb.onWeaponFire(msg);
        break;
      case "cannon_fire":
        if (this.cb.onCannonFire) this.cb.onCannonFire(msg);
        break;
      case "smoke_pop":
        if (this.cb.onSmokePop) this.cb.onSmokePop(msg);
        break;
      case "crater_add":
        if (this.cb.onCraterAdd) this.cb.onCraterAdd(msg);
        break;
      case "rocket_fire":
        if (this.cb.onRocketFire) this.cb.onRocketFire(msg);
        break;
      case "gas_explode":
        if (this.cb.onGasExplode) this.cb.onGasExplode(msg);
        break;
      case "chat_msg":
        if (!msg.system && msg.peerId && msg.peerId === this.peerId) break;
        if (this.cb.onChat) this.cb.onChat(msg);
        break;
      case "winch_update":
        if (this.cb.onRemoteWinch) this.cb.onRemoteWinch(msg);
        break;
      case "winch_pull":
        if (msg.targetPeerId === this.peerId && this.cb.onWinchPull) this.cb.onWinchPull(msg);
        break;
      case "james_event":
        if (msg.peerId !== this.peerId && this.cb.onJamesEvent) this.cb.onJamesEvent(msg);
        break;
      case "clarkson_event":
        if (msg.peerId !== this.peerId && this.cb.onClarksonEvent) this.cb.onClarksonEvent(msg);
        break;
      case "skinwalker_sync":
        if (msg.peerId !== this.peerId && this.cb.onSkinwalkerSync) this.cb.onSkinwalkerSync(msg);
        break;
      case "skinwalker_repel":
        if (msg.ownerPeerId === this.peerId && this.cb.onSkinwalkerRepel) this.cb.onSkinwalkerRepel(msg);
        break;
      case "convoy_create":
      case "convoy_join":
      case "convoy_complete":
        if (msg.convoy) {
          const idx = this.convoys.findIndex((c) => c.id === msg.convoy.id);
          if (idx >= 0) this.convoys[idx] = msg.convoy; else this.convoys.push(msg.convoy);
          if (this.cb.onConvoys) this.cb.onConvoys(this.convoys, msg);
        }
        break;
    }
  }

  _upsertRemotePlayer(pkt) {
    let entry = this.remotePlayers.get(pkt.peerId);
    if (!entry) {
      entry = {
        peerId: pkt.peerId, callsign: pkt.callsign || pkt.peerId,
        gx: pkt.x || 0, gy: pkt.y || 5, gz: pkt.z || 0, tx: pkt.x || 0, ty: pkt.y || 5, tz: pkt.z || 0,
        vx: pkt.vx || 0, vz: pkt.vz || 0, trailer: pkt.tr || null, trailerRig: null,
        qx: pkt.qx || 0, qy: pkt.qy || 0, qz: pkt.qz || 0, qw: pkt.qw || 1,
        tqx: pkt.qx || 0, tqy: pkt.qy || 0, tqz: pkt.qz || 0, tqw: pkt.qw || 1,
        vehicleId: pkt.vid || "uaz452", paintColor: pkt.col || "#5b6d5b",
        onFoot: !!pkt.foot, footX: pkt.fx || 0, footY: pkt.fy || 5, footZ: pkt.fz || 0, footYaw: pkt.fyaw || 0,
        wheelOffsets: pkt.wo || [], wheelSpins: pkt.ws || [], blownTires: pkt.bt || [], steerAngle: pkt.st || 0,
        headlights: !!pkt.hl, lightbar: !!pkt.lb, hasLightbar: !!pkt.ulb, headlightL: pkt.hll !== undefined ? pkt.hll : 100, headlightR: pkt.hlr !== undefined ? pkt.hlr : 100, engOn: pkt.eng !== undefined ? !!pkt.eng : true, rpm: pkt.rpm || 800, engineId: pkt.eid || null, throttle: pkt.thr || 0, hornActive: !!pkt.hrn, rwsYaw: pkt.rwsy !== undefined ? pkt.rwsy : (pkt.tyaw || 0), rwsPitch: pkt.rwsp || 0, gunPitch: pkt.gp || 0, autoBarrelHeat: pkt.abh || 0, wipersOn: !!pkt.wp, repairing: !!pkt.rep, hasBtrTurret: !!pkt.btur, turretYaw: pkt.tyaw || 0, carriedByPeerId: pkt.cbp || null, braking: !!pkt.br, hazards: !!pkt.hz,
        smokeLevel: pkt.smk || 0, dirtLevel: pkt.dirt || 0, backfireTimer: pkt.bf || 0, coolantTemp: pkt.etmp !== undefined ? pkt.etmp : 82, egtTemp: pkt.egt !== undefined ? pkt.egt : 320, barrelHeat: pkt.bh || 0,
        cargoCount: pkt.cc || 0, cargoType: pkt.ct || "standard",
        rideHeight: pkt.rh || 0, camberDeg: pkt.cb || 0, lastSeen: performance.now(), rig: null, avatar: null
      };
      this.remotePlayers.set(pkt.peerId, entry);
      if (this.cb.onRemoteSpawn) this.cb.onRemoteSpawn(entry);
    } else {
      entry.callsign = pkt.callsign || entry.callsign;
      entry.tx = pkt.x; entry.ty = pkt.y; entry.tz = pkt.z;
      entry.vx = pkt.vx || 0; entry.vz = pkt.vz || 0;
      entry.trailer = pkt.tr || null; entry.boat = pkt.boat || null;
      entry.tqx = pkt.qx; entry.tqy = pkt.qy; entry.tqz = pkt.qz; entry.tqw = pkt.qw;
      if (pkt.vid && pkt.vid !== entry.vehicleId) {
        entry.vehicleId = pkt.vid; entry.paintColor = pkt.col || entry.paintColor;
        if (this.cb.onRemoteVehicleChange) this.cb.onRemoteVehicleChange(entry);
      }
      entry.paintColor = pkt.col || entry.paintColor;
      entry.onFoot = !!pkt.foot; entry.footX = pkt.fx || pkt.x; entry.footY = pkt.fy || pkt.y; entry.footZ = pkt.fz || pkt.z; entry.footYaw = pkt.fyaw || 0;
      entry.wheelOffsets = pkt.wo || entry.wheelOffsets; entry.wheelSpins = pkt.ws || entry.wheelSpins; entry.blownTires = pkt.bt || entry.blownTires;
      entry.steerAngle = pkt.st || 0; entry.headlights = !!pkt.hl; entry.lightbar = !!pkt.lb; entry.hasLightbar = !!pkt.ulb; entry.headlightL = pkt.hll !== undefined ? pkt.hll : 100; entry.headlightR = pkt.hlr !== undefined ? pkt.hlr : 100; entry.engOn = pkt.eng !== undefined ? !!pkt.eng : true; entry.rpm = pkt.rpm || 800; entry.engineId = pkt.eid || entry.engineId; entry.throttle = pkt.thr || 0; entry.hornActive = !!pkt.hrn; entry.rwsYaw = pkt.rwsy !== undefined ? pkt.rwsy : (pkt.tyaw || 0); entry.rwsPitch = pkt.rwsp || 0; entry.gunPitch = pkt.gp || 0; entry.autoBarrelHeat = pkt.abh || 0; entry.wipersOn = !!pkt.wp; entry.repairing = !!pkt.rep; entry.hasBtrTurret = !!pkt.btur; entry.turretYaw = pkt.tyaw || 0; entry.carriedByPeerId = pkt.cbp || null;
      entry.braking = !!pkt.br; entry.hazards = !!pkt.hz; entry.smokeLevel = pkt.smk || 0;
      entry.dirtLevel = pkt.dirt || 0; entry.backfireTimer = pkt.bf || 0; entry.coolantTemp = pkt.etmp !== undefined ? pkt.etmp : 82; entry.egtTemp = pkt.egt !== undefined ? pkt.egt : 320; entry.barrelHeat = pkt.bh || 0;
      entry.cargoCount = pkt.cc || 0; entry.cargoType = pkt.ct || "standard";
      entry.rideHeight = pkt.rh || 0; entry.camberDeg = pkt.cb || 0; entry.lastSeen = performance.now();
    }
  }

  broadcastPlayerState(dt, vehicle, playerFoot, onFoot, trailer, wipersOn = false, repairing = false, turretYaw = 0, carriedByPeerId = null, force = false, barrelHeat = 0, rwsYaw = 0, rwsPitch = 0, gunPitch = 0, autoBarrelHeat = 0, activeBoat = null) {
    this.sendAccum += dt;
    if (!force && this.sendAccum < 0.10) return; // Broker-friendly 10 Hz over WSS (smoothly lerped!)
    this.sendAccum = 0;
    if (this.mode === "offline") return;
    // Save bandwidth & prevent public broker throttling while Host is alone waiting for friends!
    if (this.mode === "wss_host" && this.hostPeers.size === 0) return;
    const engHp = KK.getEngineOverallHealth(vehicle.vState);
    const smoke = Math.max(0, (vehicle.coolantTemp - 112) / 18, (55 - engHp) / 55);
    this.send({
      type: "player_state", callsign: this.callsign,
      x: +vehicle.pos.x.toFixed(2), y: +vehicle.pos.y.toFixed(2), z: +vehicle.pos.z.toFixed(2),
      vx: +vehicle.vel.x.toFixed(2), vz: +vehicle.vel.z.toFixed(2),
      boat: activeBoat ? { id: activeBoat.id, x: +activeBoat.gx.toFixed(1), y: +activeBoat.gy.toFixed(2), z: +activeBoat.gz.toFixed(1), yaw: +activeBoat.yaw.toFixed(2), spd: +activeBoat.speedKmh.toFixed(1) } : null,
      tr: trailer ? { id: trailer.trailerId, x: +trailer.pos.x.toFixed(2), y: +trailer.pos.y.toFixed(2), z: +trailer.pos.z.toFixed(2), yaw: +trailer.yaw.toFixed(2), p: +trailer.pitch.toFixed(2), r: +trailer.roll.toFixed(2), cc: trailer.cargoCount, ct: trailer.cargoType, car: (trailer.carriedCar && !trailer.carriedCar.peerId) ? { vid: trailer.carriedCar.vid, col: trailer.carriedCar.col, isT72Relic: !!trailer.carriedCar.isT72Relic, isBm21Relic: !!trailer.carriedCar.isBm21Relic, isShilkaRelic: !!trailer.carriedCar.isShilkaRelic } : null } : null,
      qx: +vehicle.quat.x.toFixed(3), qy: +vehicle.quat.y.toFixed(3), qz: +vehicle.quat.z.toFixed(3), qw: +vehicle.quat.w.toFixed(3),
      vid: vehicle.vState.vehicleId, col: vehicle.vState.paintColor,
      foot: onFoot ? 1 : 0, fx: +playerFoot.x.toFixed(2), fy: +playerFoot.y.toFixed(2), fz: +playerFoot.z.toFixed(2), fyaw: +playerFoot.yaw.toFixed(2),
      wo: vehicle.wheels.map((w) => +w.visualOffsetY.toFixed(2)),
      ws: vehicle.wheels.map((w) => +w.spinAngle.toFixed(2)),
      bt: (vehicle.vState.blownTires || []).map((b) => (b ? 1 : 0)),
      st: +vehicle.steerAngle.toFixed(2), hl: vehicle.headlights ? 1 : 0, lb: vehicle.lightbar ? 1 : 0, ulb: vehicle.vState.upgrades.ledLightbar ? 1 : 0, hll: Math.round(vehicle.vState.health.headlightL ?? 100), hlr: Math.round(vehicle.vState.health.headlightR ?? 100), eng: vehicle.engineRunning ? 1 : 0, rpm: Math.round(vehicle.rpm || 0), eid: vehicle.vState.engineId, thr: +(vehicle.throttle || 0).toFixed(2), hrn: vehicle.hornActive ? 1 : 0, wp: wipersOn ? 1 : 0, rep: repairing ? 1 : 0, btur: vehicle.vState.upgrades.btrTurret ? 1 : 0, tyaw: +(turretYaw || 0).toFixed(2), gp: +(gunPitch || 0).toFixed(3), rwsy: +(rwsYaw || 0).toFixed(2), rwsp: +(rwsPitch || 0).toFixed(2), cbp: carriedByPeerId || null,
      br: vehicle.braking ? 1 : 0, hz: vehicle.hazards ? 1 : 0, smk: +Math.max(0, smoke).toFixed(2), etmp: Math.round(vehicle.coolantTemp || 82), egt: Math.round(vehicle.egtTemp || 320), bh: +(barrelHeat || 0).toFixed(2), abh: +(autoBarrelHeat || 0).toFixed(2),
      dirt: +(vehicle.vState.dirtLevel || 0).toFixed(2),
      bf: vehicle.backfireTimer > 0 ? 1 : 0,
      cc: vehicle.cargoCount, ct: vehicle.cargoType,
      rh: +vehicle.vState.tuning.rideHeight.toFixed(2), cb: +vehicle.vState.tuning.camberDeg.toFixed(1)
    });
  }
};
