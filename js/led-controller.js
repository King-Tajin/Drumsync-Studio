import { ZONES } from "./gm-data.js";

const STORAGE_KEY = "drumsync-led-config-v1";
const DEFAULT_TOTAL_LEDS = 0;
const DEFAULT_COLOR = "#ffb13d";
const HOLD_MS = 40;
const DECAY_MS = 180;
const BAUD_RATE = 115200;

let totalLeds = DEFAULT_TOTAL_LEDS;
const zoneConfig = {};
ZONES.forEach((zone) => {
  zoneConfig[zone.id] = { start: 0, count: 0, color: DEFAULT_COLOR };
});

const zoneState = {};
ZONES.forEach((zone) => {
  zoneState[zone.id] = { level: 0, startedAt: 0 };
});

let port = null;
let writer = null;
let frameBuffer = new Uint8Array(0);
let rafId = null;
let writePending = false;

let els = null;

function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (typeof parsed.totalLeds === "number" && parsed.totalLeds >= 0) {
      totalLeds = parsed.totalLeds;
    }
    if (parsed.zones) {
      ZONES.forEach((zone) => {
        const saved = parsed.zones[zone.id];
        if (!saved) return;
        zoneConfig[zone.id] = {
          start: Number(saved.start) || 0,
          count: Number(saved.count) || 0,
          color: saved.color || DEFAULT_COLOR,
        };
      });
    }
  } catch {}
}

function saveConfig() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ totalLeds, zones: zoneConfig })
    );
  } catch {}
}

function rebuildFrameBuffer() {
  frameBuffer = new Uint8Array(Math.max(totalLeds, 0) * 3);
}

function hexToRgb(hex) {
  const clean = (hex || DEFAULT_COLOR).replace("#", "");
  const value = parseInt(
    clean.length === 3 ? clean.replace(/./g, "$&$&") : clean,
    16
  );
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function isSupported() {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

function isConnected() {
  return port !== null && writer !== null;
}

function renderFrame() {
  frameBuffer.fill(0);
  const now = performance.now();
  ZONES.forEach((zone) => {
    const cfg = zoneConfig[zone.id];
    const state = zoneState[zone.id];
    if (!cfg.count || state.level <= 0) return;
    const elapsed = now - state.startedAt;
    let brightness = state.level;
    if (elapsed > HOLD_MS) {
      brightness =
        state.level * Math.max(0, 1 - (elapsed - HOLD_MS) / DECAY_MS);
    }
    if (brightness <= 0.002) {
      state.level = 0;
      return;
    }
    const [r, g, b] = hexToRgb(cfg.color);
    for (let i = 0; i < cfg.count; i++) {
      const idx = (cfg.start + i) * 3;
      if (idx < 0 || idx + 2 >= frameBuffer.length) continue;
      frameBuffer[idx] = Math.round(r * brightness);
      frameBuffer[idx + 1] = Math.round(g * brightness);
      frameBuffer[idx + 2] = Math.round(b * brightness);
    }
  });
}

function buildAdalightPacket() {
  const countMinusOne = Math.max(0, totalLeds - 1);
  const hi = (countMinusOne >> 8) & 0xff;
  const lo = countMinusOne & 0xff;
  const chk = (hi ^ lo ^ 0x55) & 0xff;
  const packet = new Uint8Array(6 + frameBuffer.length);
  packet.set([0x41, 0x64, 0x61, hi, lo, chk], 0);
  packet.set(frameBuffer, 6);
  return packet;
}

async function sendFrame() {
  if (!writer || frameBuffer.length === 0 || writePending) return;
  writePending = true;
  try {
    await writer.write(buildAdalightPacket());
  } catch (err) {
    console.error("LED serial write failed", err);
    await disconnect();
  } finally {
    writePending = false;
  }
}

function loop() {
  renderFrame();
  void sendFrame();
  rafId = requestAnimationFrame(loop);
}

function startLoop() {
  if (rafId === null) rafId = requestAnimationFrame(loop);
}

function stopLoop() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

export function pulseZone(zoneId, velocity = 1) {
  const state = zoneState[zoneId];
  if (!state) return;
  state.level = Math.min(1, Math.max(state.level, velocity));
  state.startedAt = performance.now();
}

export async function connect() {
  if (!isSupported()) {
    throw new Error("Web Serial API not supported in this browser.");
  }
  port = await navigator.serial.requestPort();
  await port.open({ baudRate: BAUD_RATE });
  writer = port.writable.getWriter();
  rebuildFrameBuffer();
  startLoop();
  updateStatus();
}

export async function disconnect() {
  stopLoop();
  if (writer) {
    try {
      await writer.close();
    } catch {}
    writer = null;
  }
  if (port) {
    try {
      await port.close();
    } catch {}
    port = null;
  }
  updateStatus();
}

function updateStatus() {
  if (!els) return;
  if (!isSupported()) {
    els.status.textContent =
      "Web Serial isn't supported in this browser (use Chrome or Edge).";
    els.connectBtn.disabled = true;
    return;
  }
  if (isConnected()) {
    els.status.textContent = "Connected, streaming to WLED.";
    els.connectBtn.textContent = "Disconnect LEDs";
  } else {
    els.status.textContent = "Not connected.";
    els.connectBtn.textContent = "Connect LEDs";
  }
}

function makeZoneRow(zone) {
  const row = document.createElement("div");
  row.className = "led-zone-row";
  row.dataset.zone = zone.id;

  const label = document.createElement("span");
  label.className = "led-zone-label";
  label.textContent = zone.label;

  const start = document.createElement("input");
  start.type = "number";
  start.className = "led-zone-start";
  start.min = "0";
  start.step = "1";
  start.value = String(zoneConfig[zone.id].start);
  start.setAttribute("aria-label", `${zone.label} start index`);

  const count = document.createElement("input");
  count.type = "number";
  count.className = "led-zone-count";
  count.min = "0";
  count.step = "1";
  count.value = String(zoneConfig[zone.id].count);
  count.setAttribute("aria-label", `${zone.label} LED count`);

  const color = document.createElement("input");
  color.type = "color";
  color.className = "led-zone-color";
  color.value = zoneConfig[zone.id].color;
  color.setAttribute("aria-label", `${zone.label} color`);

  start.addEventListener("change", () => {
    zoneConfig[zone.id].start = Math.max(0, parseInt(start.value, 10) || 0);
    saveConfig();
  });
  count.addEventListener("change", () => {
    zoneConfig[zone.id].count = Math.max(0, parseInt(count.value, 10) || 0);
    saveConfig();
  });
  color.addEventListener("input", () => {
    zoneConfig[zone.id].color = color.value;
    saveConfig();
  });

  row.append(label, start, count, color);
  return row;
}

export function renderLedPanel() {
  els.zoneList.innerHTML = "";
  ZONES.forEach((zone) => els.zoneList.appendChild(makeZoneRow(zone)));
  els.totalInput.value = String(totalLeds);
  updateStatus();
}

export function wireLedEvents() {
  els = {
    status: document.getElementById("ledStatus"),
    connectBtn: document.getElementById("ledConnectBtn"),
    totalInput: document.getElementById("ledTotalInput"),
    zoneList: document.getElementById("ledZoneList"),
  };

  loadConfig();
  renderLedPanel();

  els.connectBtn.addEventListener("click", () => {
    if (isConnected()) {
      void disconnect();
      return;
    }
    connect().catch((err) => {
      console.error(err);
      els.status.textContent =
        err.message || "Couldn't connect to the LED controller.";
    });
  });

  els.totalInput.addEventListener("change", () => {
    totalLeds = Math.max(0, parseInt(els.totalInput.value, 10) || 0);
    saveConfig();
    if (isConnected()) rebuildFrameBuffer();
  });
}
