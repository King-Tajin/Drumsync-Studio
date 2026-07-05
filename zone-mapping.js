import {
  ZONES,
  noteLabel,
  instrumentLabel,
  autoZoneForNote,
} from "./gm-data.js";
import { ensureAudio, getAudioContext, playDrumSound } from "./audio-engine.js";

const mapping = {};
ZONES.forEach((zone) => {
  mapping[zone.id] = [];
});

const palette = document.getElementById("palette");
const melodicDropdown = document.getElementById("melodicDropdown");
const melodicList = document.getElementById("melodicList");
const melodicCount = document.getElementById("melodicCount");
const rigSvg = document.getElementById("rigSvg");

let fileLoaded = false;
let songDrumNotes = [];
let songMelodicPrograms = [];

export function resetMapping(drumNotes, melodicPrograms) {
  ZONES.forEach((zone) => {
    mapping[zone.id] = [];
  });
  songDrumNotes = drumNotes;
  songMelodicPrograms = melodicPrograms;
  fileLoaded = true;
  songDrumNotes.forEach((note) => {
    const zoneId = autoZoneForNote(note);
    if (mapping[zoneId] && !mapping[zoneId].includes(note)) {
      mapping[zoneId].push(note);
    }
  });
}

export function zonesForNote(note) {
  return ZONES.filter((zone) => mapping[zone.id].includes(note)).map(
    (zone) => zone.id
  );
}

export function flashZone(zoneId) {
  const el = rigSvg.querySelector(`[data-zone="${zoneId}"]`);
  if (!el) return;
  el.classList.add("lit");
  setTimeout(() => el.classList.remove("lit"), 200);
}

function previewZone(zoneId) {
  ensureAudio();
  const when = getAudioContext().currentTime;
  flashZone(zoneId);
  mapping[zoneId].forEach((note) => playDrumSound(note, when, 0.9));
}

function moveNoteToZone(note, targetZoneId) {
  ZONES.forEach((zone) => {
    const idx = mapping[zone.id].indexOf(note);
    if (idx !== -1) mapping[zone.id].splice(idx, 1);
  });
  if (targetZoneId && !mapping[targetZoneId].includes(note)) {
    mapping[targetZoneId].push(note);
  }
  renderMappingUI();
}

function makeChip(note, label, zoneId) {
  const chip = document.createElement("div");
  chip.className = "chip";
  chip.draggable = true;
  chip.dataset.note = note;

  const span = document.createElement("span");
  span.textContent = `${note} ${label}`;
  chip.appendChild(span);

  if (zoneId) {
    const remove = document.createElement("button");
    remove.className = "chip-remove";
    remove.textContent = "×";
    remove.addEventListener("click", (e) => {
      e.stopPropagation();
      moveNoteToZone(note, null);
    });
    chip.appendChild(remove);
  }

  chip.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData(
      "text/plain",
      JSON.stringify({ note, from: zoneId || "" })
    );
    chip.classList.add("dragging");
  });
  chip.addEventListener("dragend", () => chip.classList.remove("dragging"));

  return chip;
}

function makeInstrumentChip(label) {
  const chip = document.createElement("div");
  chip.className = "chip chip-static";

  const span = document.createElement("span");
  span.textContent = label;
  chip.appendChild(span);

  return chip;
}

function renderPalette() {
  palette.innerHTML = "";
  if (!fileLoaded) return;
  const assigned = new Set();
  ZONES.forEach((zone) => mapping[zone.id].forEach((n) => assigned.add(n)));
  songDrumNotes.forEach((note) => {
    if (assigned.has(note)) return;
    palette.appendChild(makeChip(note, noteLabel(note), null));
  });
}

function renderZoneLists() {
  ZONES.forEach((zone) => {
    const list = document.querySelector(`.chip-list[data-zone="${zone.id}"]`);
    if (!list) return;
    list.innerHTML = "";
    mapping[zone.id].forEach((note) => {
      list.appendChild(makeChip(note, noteLabel(note), zone.id));
    });
  });
}

function renderMelodicList() {
  melodicList.innerHTML = "";
  songMelodicPrograms.forEach((program) => {
    melodicList.appendChild(makeInstrumentChip(instrumentLabel(program)));
  });
  melodicCount.textContent = `(${songMelodicPrograms.length})`;
  melodicDropdown.hidden = songMelodicPrograms.length === 0;
}

export function renderMappingUI() {
  renderPalette();
  renderZoneLists();
  renderMelodicList();
}

function wireDropTarget(el, targetZoneId) {
  el.addEventListener("dragover", (e) => {
    e.preventDefault();
    el.classList.add("drag-over");
  });
  el.addEventListener("dragleave", () => el.classList.remove("drag-over"));
  el.addEventListener("drop", (e) => {
    e.preventDefault();
    el.classList.remove("drag-over");
    const data = JSON.parse(e.dataTransfer.getData("text/plain"));
    moveNoteToZone(data.note, targetZoneId);
  });
}

export function wireMappingEvents() {
  document.querySelectorAll(".chip-list[data-zone]").forEach((list) => {
    wireDropTarget(list, list.dataset.zone);
  });

  wireDropTarget(palette, null);

  rigSvg.querySelectorAll(".drum").forEach((el) => {
    el.addEventListener("click", () => previewZone(el.dataset.zone));
  });
}
