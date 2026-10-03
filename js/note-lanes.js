import { ZONES } from "./gm-data.js";
import { zonesForNote } from "./zone-mapping.js";

const FALL_SECONDS = 1.75;
const HIT_SECONDS = 0.18;
const TOP_MARGIN = 36;
const MIN_LIGHT_RADIUS = 6;
const MAX_LIGHT_RADIUS = 12;
const TAIL_LENGTH = 75;

const stage = document.getElementById("rigStage");
const rigSvg = document.getElementById("rigSvg");
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

let laneNotes = [];
let enabled = false;
let getPosition = () => 0;
let getSpeed = () => 1;
let rafId = null;
let accent = "#ffb13d";
let canvasWidth = 0;
let canvasHeight = 0;
let canvasScale = 1;

function readTheme() {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue("--accent")
    .trim();
  if (value) accent = value;
}

function targetElement(zoneId) {
  const group = rigSvg.querySelector(`[data-zone="${zoneId}"]`);
  if (!group) return null;
  return group.querySelector(".drum-rim") || group.querySelector(".rod-cymbal");
}

function measureLanes() {
  const stageRect = stage.getBoundingClientRect();
  const lanes = {};
  ZONES.forEach((zone) => {
    const el = targetElement(zone.id);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    lanes[zone.id] = {
      x: rect.left + rect.width / 2 - stageRect.left,
      top: TOP_MARGIN,
      bottom: rect.top - stageRect.top,
    };
  });
  return lanes;
}

function syncCanvasSize() {
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  const scale = window.devicePixelRatio || 1;
  if (
    width === canvasWidth &&
    height === canvasHeight &&
    scale === canvasScale
  ) {
    return;
  }
  canvasWidth = width;
  canvasHeight = height;
  canvasScale = scale;
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
}

function firstIndexAtOrAfter(time) {
  let low = 0;
  let high = laneNotes.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (laneNotes[mid].time < time) low = mid + 1;
    else high = mid;
  }
  return low;
}

function drawLaneLines(lanes) {
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ZONES.forEach((zone) => {
    const lane = lanes[zone.id];
    if (!lane) return;
    const gradient = ctx.createLinearGradient(0, lane.top, 0, lane.bottom);
    gradient.addColorStop(0, "rgba(139, 143, 148, 0)");
    gradient.addColorStop(0.25, "rgba(139, 143, 148, 0.35)");
    gradient.addColorStop(1, "rgba(139, 143, 148, 0.5)");
    ctx.strokeStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(lane.x, lane.top);
    ctx.lineTo(lane.x, lane.bottom);
    ctx.stroke();

    ctx.fillStyle = "rgba(139, 143, 148, 0.55)";
    ctx.beginPath();
    ctx.arc(lane.x, lane.bottom, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawLight(lane, progress, velocity) {
  const y = lane.top + progress * (lane.bottom - lane.top);
  const radius =
    MIN_LIGHT_RADIUS + (MAX_LIGHT_RADIUS - MIN_LIGHT_RADIUS) * velocity;
  const tailTop = Math.max(lane.top, y - TAIL_LENGTH);

  const tail = ctx.createLinearGradient(0, tailTop, 0, y);
  tail.addColorStop(0, "rgba(255, 177, 61, 0)");
  tail.addColorStop(1, "rgba(255, 177, 61, 0.55)");
  ctx.strokeStyle = tail;
  ctx.lineWidth = radius * 0.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(lane.x, tailTop);
  ctx.lineTo(lane.x, y);
  ctx.stroke();

  ctx.save();
  ctx.shadowColor = accent;
  ctx.shadowBlur = 18;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(lane.x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.beginPath();
  ctx.arc(lane.x, y, radius * 0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawHit(lane, age) {
  const t = age / HIT_SECONDS;
  ctx.save();
  ctx.globalAlpha = 1 - t;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(lane.x, lane.bottom, 8 + t * 22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawFrame() {
  rafId = requestAnimationFrame(drawFrame);
  syncCanvasSize();
  ctx.setTransform(canvasScale, 0, 0, canvasScale, 0, 0);
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  if (!enabled || laneNotes.length === 0) return;

  const lanes = measureLanes();
  drawLaneLines(lanes);

  const position = getPosition();
  const speed = getSpeed();
  const lead = FALL_SECONDS * speed;
  const hitWindow = HIT_SECONDS * speed;
  let index = firstIndexAtOrAfter(position - hitWindow);

  for (; index < laneNotes.length; index++) {
    const note = laneNotes[index];
    if (note.time > position + lead) break;
    const zoneIds = zonesForNote(note.midi);
    if (zoneIds.length === 0) continue;
    const progress = 1 - (note.time - position) / lead;
    zoneIds.forEach((zoneId) => {
      const lane = lanes[zoneId];
      if (!lane) return;
      if (progress <= 1) {
        drawLight(lane, Math.max(0, progress), note.velocity || 0.8);
      } else {
        drawHit(lane, (position - note.time) / speed);
      }
    });
  }
}

export function setLanesEnabled(value) {
  enabled = value;
  document.getElementById("rigPanel").classList.toggle("lanes-active", value);
}

export function setLaneNotes(notes) {
  laneNotes = notes.filter((note) => note.isDrum);
}

export function initNoteLanes(options) {
  getPosition = options.getPosition;
  getSpeed = options.getSpeed;
  readTheme();
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.position = "absolute";
  canvas.style.inset = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.pointerEvents = "none";
  rigSvg.after(canvas);
  if (rafId === null) rafId = requestAnimationFrame(drawFrame);
}
