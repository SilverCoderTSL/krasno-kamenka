// ============================================================================
// js/network.js (v14.2 ONLINE) — Serverless PeerJS WebRTC Online Multiplayer
// + Browser LocalStorage Driver Accounts (`kk_accounts_v14`) + SHA-256 Dev Auth
// Works 100% natively on GitHub Pages (HTTPS) with zero backend server!
// ============================================================================
window.KK = window.KK || {};

KK.LanNetwork = class LanNetwork {
  constructor(callbacks) {
    this.cb = callbacks || {};
    this.peer = null;
    this.mode = "offline"; // offline | peer_host | peer_client
    this.peerId = null;
    this.roomCode = "";
    this.isHost = false;
    this.callsign = localStorage.getItem("kk_callsign") || ("COMRADE-" + Math.floor(10 + Math.random() * 89));
    this.hostAddr = "";
    this.roster = [];
    this.remotePlayers = new Map();
    this.convoys = [];
    this.sendAccum = 0;

    // PeerJS Host structures
    this.hostConns = new Map(); // peerId -> { conn, peerId, callsign }
    this.hostConn = null;       // Client -> Host DataConnection
    this.worldClockTimer = null;
    this.hostWorldState = null;

    // Salted SHA-256 hash of Silver's Dev Key (raw key is NEVER stored in public source!)
    this._devKeySalt = "kk-dev-v14:";
    this._devKeyHash = "40e3962198517b21a3a977f83d248e88325c116e877c8023caa12f5e9a2a26f1";
    this._accountsKey = "kk_accounts_v14";
  }

  // ==========================================================================
  // SHA-256 HELPER (Web Crypto on HTTPS/localhost + Pure-JS Fallback for HTTP)
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
        username: clean,
        pinHash,
        isDev: false,
        createdAt: Date.now(),
        lastLogin: Date.now(),
        saveData: initialSave || null
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
  // PEERJS ONLINE MULTIPLAYER (HOST ROOM / JOIN ROOM / WORLD CLOCK)
  // ==========================================================================
  _randCode(len = 4) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  _getPeerConfig() {
    return {
      debug: 1,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" }
        ]
      }
    };
  }

  getShareInviteUrl() {
    if (!this.roomCode) return window.location.href;
    const base = window.location.origin + window.location.pathname;
    return `${base}?room=${encodeURIComponent(this.roomCode)}`;
  }

  disconnect() {
    if (this.worldClockTimer) { clearInterval(this.worldClockTimer); this.worldClockTimer = null; }
    for (const c of this.hostConns.values()) { try { c.conn.close(); } catch (e) {} }
    this.hostConns.clear();
    if (this.hostConn) { try { this.hostConn.close(); } catch (e) {} this.hostConn = null; }
    if (this.peer) { try { this.peer.destroy(); } catch (e) {} this.peer = null; }

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

  _buildHostSnapshot() {
    const ws = this.hostWorldState;
    const now = Date.now();
    const gasOut = {};
    for (const [k, exp] of Object.entries(ws.gasOutages)) {
      if (exp > now) gasOut[k] = +((exp - now) / 1000).toFixed(1);
    }
    return {
      type: "server_snapshot",
      seed: ws.seed,
      bridgeSeed: ws.bridgeSeed,
      timeOfDay: +ws.timeOfDay.toFixed(3),
      timeScale: ws.timeScale,
      weather: ws.weather,
      brokenPlanks: ws.brokenPlanks,
      brokenTrees: ws.brokenTrees.slice(-1500),
      brokenFences: ws.brokenFences.slice(-1500),
      milCamp: ws.milCamp,
      bm21Camp: ws.bm21Camp,
      shilkaCamp: ws.shilkaCamp,
      craters: ws.craters.slice(-120),
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
    for (const entry of this.hostConns.values()) {
      peers.push({ peerId: entry.peerId, callsign: entry.callsign || entry.peerId, isHost: false });
    }
    return { type: "roster", hostId: this.peerId, peers };
  }

  _broadcastFromHost(msg, excludePeerId = null) {
    for (const [pid, entry] of this.hostConns.entries()) {
      if (excludePeerId && pid === excludePeerId) continue;
      if (entry.conn && entry.conn.open) {
        try { entry.conn.send(msg); } catch (e) {}
      }
    }
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
        fromTown: msg.fromTown || 0, toTown: msg.toTown || 2,
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
        if (ws.brokenTrees.length > 1500) ws.brokenTrees = ws.brokenTrees.slice(-1500);
      }
    } else if (mtype === "fence_break") {
      const fid = String(msg.fenceId || "");
      if (fid && !ws.brokenFences.includes(fid)) {
        ws.brokenFences.push(fid);
        if (ws.brokenFences.length > 1500) ws.brokenFences = ws.brokenFences.slice(-1500);
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
      if (ws.craters.length > 120) ws.craters = ws.craters.slice(-120);
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

      let weatherChanged = false;
      if (now >= ws.weatherNextChange) {
        const nextW = weathers[Math.floor(Math.random() * weathers.length)];
        ws.weather = nextW;
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
      this._broadcastFromHost(pkt);
      if (weatherChanged && this.cb.onEnvSync) this.cb.onEnvSync(pkt);
    }, 2000);
  }

  hostRoom(callsign = null) {
    if (typeof Peer === "undefined") {
      if (this.cb.onStatus) this.cb.onStatus("PeerJS CDN failed to load (offline)", false);
      return;
    }
    if (callsign) {
      this.callsign = callsign.slice(0, 20);
      localStorage.setItem("kk_callsign", this.callsign);
    }
    this.disconnect();

    const roomCode = "KK-" + this._randCode(4);
    if (this.cb.onStatus) this.cb.onStatus("CREATING ONLINE ROOM...", false);

    try {
      const peer = new Peer(roomCode, this._getPeerConfig());
      this.peer = peer;

      peer.on("open", (id) => {
        this.mode = "peer_host";
        this.isHost = true;
        this.peerId = id;
        this.roomCode = id;
        this.hostAddr = id;
        this.hostWorldState = this._initHostWorldState();

        const hostIn = document.getElementById("lan-host-input");
        if (hostIn) hostIn.value = id;
        const smIn = document.getElementById("sm-host-input");
        if (smIn) smIn.value = id;

        if (this.cb.onStatus) this.cb.onStatus("HOSTING: " + id + " (COPY)", true);
        if (this.cb.onWelcome) this.cb.onWelcome({ type: "welcome", peerId: id, isHost: true, roomCode: id });
        if (this.cb.onSnapshot) this.cb.onSnapshot(this._buildHostSnapshot());
        const rPkt = this._buildHostRosterPacket();
        this.roster = rPkt.peers;
        if (this.cb.onRoster) this.cb.onRoster(this.roster, true);
        this._startHostWorldClock();
      });

      peer.on("connection", (conn) => {
        const cid = conn.peer;
        conn.on("open", () => {
          this.hostConns.set(cid, { conn, peerId: cid, callsign: "DRIVER" });
          try {
            conn.send({ type: "welcome", peerId: cid, isHost: false, roomCode: this.roomCode });
            conn.send(this._buildHostSnapshot());
          } catch (e) {}
          const rPkt = this._buildHostRosterPacket();
          this.roster = rPkt.peers;
          if (this.cb.onRoster) this.cb.onRoster(this.roster, true);
          this._broadcastFromHost(rPkt);
        });

        conn.on("data", (raw) => {
          const msg = (typeof raw === "string") ? (() => { try { return JSON.parse(raw); } catch (e) { return null; } })() : raw;
          if (!msg || !msg.type) return;
          msg.peerId = cid;

          if (msg.type === "join_hello") {
            const entry = this.hostConns.get(cid);
            if (entry && msg.callsign) entry.callsign = String(msg.callsign).slice(0, 20);
            const rPkt = this._buildHostRosterPacket();
            this.roster = rPkt.peers;
            if (this.cb.onRoster) this.cb.onRoster(this.roster, true);
            this._broadcastFromHost(rPkt);
            const joinChat = { type: "chat_msg", sender: "DISPATCH", text: `${entry ? entry.callsign : cid} joined room ${this.roomCode}!`, system: true };
            this._handleMessage(joinChat);
            this._broadcastFromHost(joinChat);
            return;
          }

          this._applyHostWorldState(msg);
          this._handleMessage(msg);
          this._broadcastFromHost(msg, cid);
        });

        const cleanupPeer = () => {
          const entry = this.hostConns.get(cid);
          if (!entry) return;
          const oldName = entry.callsign || cid;
          this.hostConns.delete(cid);
          if (this.hostWorldState) {
            delete this.hostWorldState.players[cid];
            delete this.hostWorldState.winches[cid];
          }
          const leftPkt = { type: "peer_left", peerId: cid, callsign: oldName };
          this._handleMessage(leftPkt);
          this._broadcastFromHost(leftPkt);
          const rPkt = this._buildHostRosterPacket();
          this.roster = rPkt.peers;
          if (this.cb.onRoster) this.cb.onRoster(this.roster, true);
          this._broadcastFromHost(rPkt);
        };
        conn.on("close", cleanupPeer);
        conn.on("error", cleanupPeer);
      });

      peer.on("error", (err) => {
        if (this.cb.onStatus) this.cb.onStatus("PEER ERROR (" + (err.type || "retry") + ")", false);
      });
    } catch (e) {
      if (this.cb.onStatus) this.cb.onStatus("HOST FAILED — SOLO MODE", false);
    }
  }

  joinRoom(rawCode, callsign = null) {
    if (typeof Peer === "undefined") {
      if (this.cb.onStatus) this.cb.onStatus("PeerJS CDN failed to load (offline)", false);
      return;
    }
    if (callsign) {
      this.callsign = callsign.slice(0, 20);
      localStorage.setItem("kk_callsign", this.callsign);
    }
    let code = String(rawCode || "").trim().toUpperCase();
    if (!code) {
      this.disconnect();
      return;
    }
    // Convenience: if a friend types just the 4-char code like "A1B2", auto-prefix "KK-"!
    if (/^[A-Z0-9]{4}$/.test(code)) code = "KK-" + code;

    this.disconnect();
    this.hostAddr = code;
    this.roomCode = code;
    localStorage.setItem("kk_room_code", code);

    const hostIn = document.getElementById("lan-host-input");
    if (hostIn) hostIn.value = code;
    const smIn = document.getElementById("sm-host-input");
    if (smIn) smIn.value = code;

    if (this.cb.onStatus) this.cb.onStatus("JOINING " + code + "...", false);

    try {
      const clientId = "KK-P-" + this._randCode(6);
      const peer = new Peer(clientId, this._getPeerConfig());
      this.peer = peer;

      peer.on("open", (myId) => {
        this.peerId = myId;
        const conn = peer.connect(code, { reliable: true });
        this.hostConn = conn;

        const connTimeout = setTimeout(() => {
          if (this.mode !== "peer_client") {
            if (this.cb.onStatus) this.cb.onStatus("ROOM " + code + " NOT FOUND", false);
          }
        }, 8500);

        conn.on("open", () => {
          clearTimeout(connTimeout);
          this.mode = "peer_client";
          this.isHost = false;
          if (this.cb.onStatus) this.cb.onStatus("ONLINE: " + code, true);
          try { conn.send({ type: "join_hello", callsign: this.callsign }); } catch (e) {}
        });

        conn.on("data", (raw) => {
          const msg = (typeof raw === "string") ? (() => { try { return JSON.parse(raw); } catch (e) { return null; } })() : raw;
          if (msg) this._handleMessage(msg);
        });

        conn.on("close", () => {
          clearTimeout(connTimeout);
          this.mode = "offline";
          this.isHost = false;
          for (const [pid, rp] of this.remotePlayers.entries()) {
            if (this.cb.onPeerLeft) this.cb.onPeerLeft(pid, rp.callsign);
          }
          this.remotePlayers.clear();
          this.roster = [];
          if (this.cb.onRoster) this.cb.onRoster([], false);
          if (this.cb.onStatus) this.cb.onStatus("HOST DISCONNECTED (SOLO)", false);
        });

        conn.on("error", () => {
          clearTimeout(connTimeout);
          if (this.cb.onStatus) this.cb.onStatus("CONNECTION FAILED — SOLO", false);
        });
      });

      peer.on("error", (err) => {
        const msg = err && err.type === "peer-unavailable" ? ("ROOM " + code + " NOT FOUND") : ("PEER ERROR (" + (err.type || "offline") + ")");
        if (this.cb.onStatus) this.cb.onStatus(msg, false);
      });
    } catch (e) {
      if (this.cb.onStatus) this.cb.onStatus("JOIN FAILED — SOLO MODE", false);
    }
  }

  // Compatibility wrapper so any existing calls to `network.connect(code, cs)` work seamlessly
  connect(roomCode, callsign) {
    if (callsign) {
      this.callsign = callsign.slice(0, 20);
      localStorage.setItem("kk_callsign", this.callsign);
    }
    const clean = String(roomCode || "").trim();
    if (!clean || clean.includes(":") || clean.includes(".")) {
      // Ignore legacy IP:port strings cleanly on boot -> stay in Solo mode ready to HOST/JOIN!
      if (this.cb.onStatus) this.cb.onStatus("SOLO MODE — CLICK HOST OR JOIN", false);
      return;
    }
    this.joinRoom(clean, this.callsign);
  }

  send(msg) {
    if (!msg || !msg.type) return;
    if (this.mode === "peer_host") {
      const out = Object.assign({}, msg, { peerId: this.peerId });
      if (out.type === "join_hello" && out.callsign) {
        this.callsign = String(out.callsign).slice(0, 20);
        const rPkt = this._buildHostRosterPacket();
        this.roster = rPkt.peers;
        if (this.cb.onRoster) this.cb.onRoster(this.roster, true);
        this._broadcastFromHost(rPkt);
        return;
      }
      this._applyHostWorldState(out);
      this._broadcastFromHost(out);
      if (out.type === "convoy_create" || out.type === "convoy_join" || out.type === "convoy_complete") {
        this._handleMessage(out);
      }
    } else if (this.mode === "peer_client" && this.hostConn && this.hostConn.open) {
      try { this.hostConn.send(msg); } catch (e) {}
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
        headlights: !!pkt.hl, lightbar: !!pkt.lb, hasLightbar: !!pkt.ulb, headlightL: pkt.hll !== undefined ? pkt.hll : 100, headlightR: pkt.hlr !== undefined ? pkt.hlr : 100, engOn: pkt.eng !== undefined ? !!pkt.eng : true, rpm: pkt.rpm || 800, engineId: pkt.eid || null, throttle: pkt.thr || 0, hornActive: !!pkt.hrn, rwsYaw: pkt.rwsy !== undefined ? pkt.rwsy : (pkt.tyaw || 0), rwsPitch: pkt.rwsp || 0, wipersOn: !!pkt.wp, repairing: !!pkt.rep, hasBtrTurret: !!pkt.btur, turretYaw: pkt.tyaw || 0, carriedByPeerId: pkt.cbp || null, braking: !!pkt.br, hazards: !!pkt.hz,
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
      entry.trailer = pkt.tr || null;
      entry.tqx = pkt.qx; entry.tqy = pkt.qy; entry.tqz = pkt.qz; entry.tqw = pkt.qw;
      if (pkt.vid && pkt.vid !== entry.vehicleId) {
        entry.vehicleId = pkt.vid; entry.paintColor = pkt.col || entry.paintColor;
        if (this.cb.onRemoteVehicleChange) this.cb.onRemoteVehicleChange(entry);
      }
      entry.paintColor = pkt.col || entry.paintColor;
      entry.onFoot = !!pkt.foot; entry.footX = pkt.fx || pkt.x; entry.footY = pkt.fy || pkt.y; entry.footZ = pkt.fz || pkt.z; entry.footYaw = pkt.fyaw || 0;
      entry.wheelOffsets = pkt.wo || entry.wheelOffsets; entry.wheelSpins = pkt.ws || entry.wheelSpins; entry.blownTires = pkt.bt || entry.blownTires;
      entry.steerAngle = pkt.st || 0; entry.headlights = !!pkt.hl; entry.lightbar = !!pkt.lb; entry.hasLightbar = !!pkt.ulb; entry.headlightL = pkt.hll !== undefined ? pkt.hll : 100; entry.headlightR = pkt.hlr !== undefined ? pkt.hlr : 100; entry.engOn = pkt.eng !== undefined ? !!pkt.eng : true; entry.rpm = pkt.rpm || 800; entry.engineId = pkt.eid || entry.engineId; entry.throttle = pkt.thr || 0; entry.hornActive = !!pkt.hrn; entry.rwsYaw = pkt.rwsy !== undefined ? pkt.rwsy : (pkt.tyaw || 0); entry.rwsPitch = pkt.rwsp || 0; entry.wipersOn = !!pkt.wp; entry.repairing = !!pkt.rep; entry.hasBtrTurret = !!pkt.btur; entry.turretYaw = pkt.tyaw || 0; entry.carriedByPeerId = pkt.cbp || null;
      entry.braking = !!pkt.br; entry.hazards = !!pkt.hz; entry.smokeLevel = pkt.smk || 0;
      entry.dirtLevel = pkt.dirt || 0; entry.backfireTimer = pkt.bf || 0; entry.coolantTemp = pkt.etmp !== undefined ? pkt.etmp : 82; entry.egtTemp = pkt.egt !== undefined ? pkt.egt : 320; entry.barrelHeat = pkt.bh || 0;
      entry.cargoCount = pkt.cc || 0; entry.cargoType = pkt.ct || "standard";
      entry.rideHeight = pkt.rh || 0; entry.camberDeg = pkt.cb || 0; entry.lastSeen = performance.now();
    }
  }

  broadcastPlayerState(dt, vehicle, playerFoot, onFoot, trailer, wipersOn = false, repairing = false, turretYaw = 0, carriedByPeerId = null, force = false, barrelHeat = 0, rwsYaw = 0, rwsPitch = 0) {
    this.sendAccum += dt;
    if (!force && this.sendAccum < 0.05) return;
    this.sendAccum = 0;
    const engHp = KK.getEngineOverallHealth(vehicle.vState);
    const smoke = Math.max(0, (vehicle.coolantTemp - 112) / 18, (55 - engHp) / 55);
    this.send({
      type: "player_state", callsign: this.callsign,
      x: +vehicle.pos.x.toFixed(2), y: +vehicle.pos.y.toFixed(2), z: +vehicle.pos.z.toFixed(2),
      vx: +vehicle.vel.x.toFixed(2), vz: +vehicle.vel.z.toFixed(2),
      tr: trailer ? { id: trailer.trailerId, x: +trailer.pos.x.toFixed(2), y: +trailer.pos.y.toFixed(2), z: +trailer.pos.z.toFixed(2), yaw: +trailer.yaw.toFixed(2), p: +trailer.pitch.toFixed(2), r: +trailer.roll.toFixed(2), cc: trailer.cargoCount, ct: trailer.cargoType, car: (trailer.carriedCar && !trailer.carriedCar.peerId) ? { vid: trailer.carriedCar.vid, col: trailer.carriedCar.col, isT72Relic: !!trailer.carriedCar.isT72Relic, isBm21Relic: !!trailer.carriedCar.isBm21Relic, isShilkaRelic: !!trailer.carriedCar.isShilkaRelic } : null } : null,
      qx: +vehicle.quat.x.toFixed(3), qy: +vehicle.quat.y.toFixed(3), qz: +vehicle.quat.z.toFixed(3), qw: +vehicle.quat.w.toFixed(3),
      vid: vehicle.vState.vehicleId, col: vehicle.vState.paintColor,
      foot: onFoot ? 1 : 0, fx: +playerFoot.x.toFixed(2), fy: +playerFoot.y.toFixed(2), fz: +playerFoot.z.toFixed(2), fyaw: +playerFoot.yaw.toFixed(2),
      wo: vehicle.wheels.map((w) => +w.visualOffsetY.toFixed(2)),
      ws: vehicle.wheels.map((w) => +w.spinAngle.toFixed(2)),
      bt: (vehicle.vState.blownTires || []).map((b) => (b ? 1 : 0)),
      st: +vehicle.steerAngle.toFixed(2), hl: vehicle.headlights ? 1 : 0, lb: vehicle.lightbar ? 1 : 0, ulb: vehicle.vState.upgrades.ledLightbar ? 1 : 0, hll: Math.round(vehicle.vState.health.headlightL ?? 100), hlr: Math.round(vehicle.vState.health.headlightR ?? 100), eng: vehicle.engineRunning ? 1 : 0, rpm: Math.round(vehicle.rpm || 0), eid: vehicle.vState.engineId, thr: +(vehicle.throttle || 0).toFixed(2), hrn: vehicle.hornActive ? 1 : 0, wp: wipersOn ? 1 : 0, rep: repairing ? 1 : 0, btur: vehicle.vState.upgrades.btrTurret ? 1 : 0, tyaw: +(turretYaw || 0).toFixed(2), rwsy: +(rwsYaw || 0).toFixed(2), rwsp: +(rwsPitch || 0).toFixed(2), cbp: carriedByPeerId || null,
      br: vehicle.braking ? 1 : 0, hz: vehicle.hazards ? 1 : 0, smk: +Math.max(0, smoke).toFixed(2), etmp: Math.round(vehicle.coolantTemp || 82), egt: Math.round(vehicle.egtTemp || 320), bh: +(barrelHeat || 0).toFixed(2),
      dirt: +(vehicle.vState.dirtLevel || 0).toFixed(2),
      bf: vehicle.backfireTimer > 0 ? 1 : 0,
      cc: vehicle.cargoCount, ct: vehicle.cargoType,
      rh: +vehicle.vState.tuning.rideHeight.toFixed(2), cb: +vehicle.vState.tuning.camberDeg.toFixed(1)
    });
  }
};
