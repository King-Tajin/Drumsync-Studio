import {
  ensureAudio,
  getAudioContext,
  setMasterVolume,
  preloadInstruments,
  playDrumSound,
  playMelodic,
  stopAllSounds,
  SOUNDFONT_KITS,
  getSoundfontKit,
  setSoundfontKit,
  MAIN_INSTRUMENT_COUNT,
  listUncachedPrograms,
  cacheMissingInstruments,
} from "./audio-engine.js";
import {
  resetMapping,
  zonesForNote,
  flashZone,
  renderMappingUI,
  wireMappingEvents,
} from "./zone-mapping.js";
import { pulseZone, wireLedEvents } from "./led-controller.js";
import { wireLayoutEvents } from "./rig-layout.js";
import { initNoteLanes, setLaneNotes, setLanesEnabled } from "./note-lanes.js";
import {
  MidiLoadError,
  PARSER_MISSING_MESSAGE,
  isMidiFile,
  isParserAvailable,
  parseMidiBuffer,
  pickMidiFile,
} from "./midi-parser.js";

const els = {
  fileStatus: document.getElementById("fileStatus"),
  dropZone: document.getElementById("dropZone"),
  fileInput: document.getElementById("fileInput"),
  dropLabel: document.getElementById("dropLabel"),
  fileMeta: document.getElementById("fileMeta"),
  fileError: document.getElementById("fileError"),
  playBtn: document.getElementById("playBtn"),
  stopBtn: document.getElementById("stopBtn"),
  seekBar: document.getElementById("seekBar"),
  timeDisplay: document.getElementById("timeDisplay"),
  volumeSlider: document.getElementById("volumeSlider"),
  speedInput: document.getElementById("speedInput"),
  speedGroup: document.getElementById("speedGroup"),
  audioModeToggle: document.getElementById("audioModeToggle"),
  soundfontSelect: document.getElementById("soundfontSelect"),
  cacheSoundsBtn: document.getElementById("cacheSoundsBtn"),
  lanesToggle: document.getElementById("lanesToggle"),
};

const LOOKAHEAD_SECONDS = 0.2;
const TICK_MS = 25;
const MIN_SPEED = 40;
const MAX_SPEED = 100;
const SYNTH_FALLBACK_MESSAGE =
  "Some instrument sounds couldn't load, using basic synth. Reload the file to retry.";
const APPROX_INSTRUMENT_MB = 2.7;
const UNREADABLE_MESSAGE = "That file couldn't be read as a MIDI file.";

let audioMode = "all";
let notesFlat = [];
let duration = 0;
let bpm = 120;
let isPlaying = false;
let nextNoteIndex = 0;
let ctxStartTime = 0;
let startOffset = 0;
let playbackSpeed = 1;
let pendingFlashes = [];
let timerId = null;
let isScrubbing = false;
let pausedByVisibility = false;
let loadToken = 0;
let hasFile = false;
let currentPrograms = new Set();
let isLoadingSounds = false;
let isCachingSounds = false;
let cacheCancelled = false;
let cacheProgress = { done: 0, total: 0 };
let missingPrograms = null;
let cacheUnavailable = false;
let cacheStatusToken = 0;

function formatTime(t) {
  const safe = Number.isFinite(t) && t > 0 ? t : 0;
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function updateTimeDisplay(elapsed) {
  els.timeDisplay.textContent = `${formatTime(elapsed)} / ${formatTime(duration)}`;
  if (!isScrubbing && duration > 0) {
    els.seekBar.value = Math.floor((elapsed / duration) * 1000);
  }
}

function currentVisualPosition() {
  if (!isPlaying) return startOffset;
  const audioCtx = getAudioContext();
  const latency = audioCtx.outputLatency || audioCtx.baseLatency || 0;
  const elapsed =
    startOffset +
    (audioCtx.currentTime - ctxStartTime - latency) * playbackSpeed;
  return Math.min(elapsed, duration);
}

function clearTimer() {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
}

function startTimer() {
  clearTimer();
  timerId = setInterval(tick, TICK_MS);
}

function rewindToPosition(position) {
  let index = Math.min(nextNoteIndex, notesFlat.length);
  while (index > 0 && notesFlat[index - 1].time >= position) index--;
  nextNoteIndex = index;
}

function stopPlayback(resetPosition, silence = true) {
  if (isPlaying && !resetPosition) {
    const now = getAudioContext().currentTime;
    startOffset += (now - ctxStartTime) * playbackSpeed;
    flushFlashes(now);
  }
  isPlaying = false;
  clearTimer();
  pendingFlashes = [];
  if (silence) stopAllSounds();
  els.playBtn.textContent = "Play";
  if (resetPosition) {
    startOffset = 0;
    nextNoteIndex = 0;
    updateTimeDisplay(0);
    return;
  }
  startOffset = Math.min(startOffset, duration);
  if (silence) rewindToPosition(startOffset);
  updateTimeDisplay(startOffset);
}

function scheduleTrigger(note, vel, when, isDrum, noteDuration, program) {
  if (isDrum) {
    const zoneIds = zonesForNote(note);
    if (audioMode === "all" || zoneIds.length > 0) {
      playDrumSound(note, when, vel);
    }
    if (zoneIds.length > 0) pendingFlashes.push({ when, zoneIds, vel });
  } else if (audioMode === "all") {
    playMelodic(note, when, vel, noteDuration, program);
  }
}

function flushFlashes(now) {
  const audioCtx = getAudioContext();
  const latency = audioCtx.outputLatency || audioCtx.baseLatency || 0;
  const remaining = [];
  pendingFlashes.forEach((flash) => {
    if (flash.when + latency <= now) {
      flash.zoneIds.forEach((zoneId) => {
        flashZone(zoneId);
        pulseZone(zoneId, flash.vel);
      });
    } else {
      remaining.push(flash);
    }
  });
  pendingFlashes = remaining;
}

function tick() {
  if (!isPlaying) return;
  const now = getAudioContext().currentTime;
  const elapsed = startOffset + (now - ctxStartTime) * playbackSpeed;

  while (
    nextNoteIndex < notesFlat.length &&
    notesFlat[nextNoteIndex].time <= elapsed + LOOKAHEAD_SECONDS * playbackSpeed
  ) {
    const n = notesFlat[nextNoteIndex];
    const when = Math.max(
      now,
      ctxStartTime + (n.time - startOffset) / playbackSpeed
    );
    scheduleTrigger(
      n.midi,
      n.velocity || 0.8,
      when,
      n.isDrum,
      n.duration / playbackSpeed,
      n.program
    );
    nextNoteIndex++;
  }

  flushFlashes(now);
  updateTimeDisplay(Math.min(elapsed, duration));

  if (elapsed >= duration && pendingFlashes.length === 0) {
    stopPlayback(true, false);
  }
}

function startPlayback() {
  const audioCtx = ensureAudio();
  ctxStartTime = audioCtx.currentTime;
  isPlaying = true;
  els.playBtn.textContent = "Pause";
  startTimer();
}

function applySpeed(percent) {
  const next = percent / 100;
  if (next === playbackSpeed) return;
  if (isPlaying) {
    const now = getAudioContext().currentTime;
    startOffset += (now - ctxStartTime) * playbackSpeed;
    ctxStartTime = now;
  }
  playbackSpeed = next;
}

function commitSpeedInput() {
  const parsed = parseInt(els.speedInput.value, 10);
  els.speedInput.value = String(
    Number.isFinite(parsed)
      ? Math.min(MAX_SPEED, Math.max(MIN_SPEED, parsed))
      : MAX_SPEED
  );
  syncSpeed();
}

function syncSpeed() {
  if (audioMode !== "mapped") {
    applySpeed(MAX_SPEED);
    return;
  }
  const value = parseInt(els.speedInput.value, 10);
  if (value >= MIN_SPEED && value <= MAX_SPEED) applySpeed(value);
}

function seekTo(fraction) {
  const wasPlaying = isPlaying;
  stopPlayback(false);
  startOffset = fraction * duration;
  nextNoteIndex = notesFlat.findIndex((n) => n.time >= startOffset);
  if (nextNoteIndex === -1) nextNoteIndex = notesFlat.length;
  updateTimeDisplay(startOffset);
  if (wasPlaying) startPlayback();
}

function baseFileMeta() {
  return `Duration ${formatTime(duration)}\nTempo ${Math.round(bpm)} BPM\nNotes ${notesFlat.length}`;
}

function showLoadError(message) {
  els.fileError.textContent = message;
  els.fileError.hidden = false;
}

function clearLoadError() {
  els.fileError.textContent = "";
  els.fileError.hidden = true;
}

function renderSoundfontControls() {
  const button = els.cacheSoundsBtn;
  els.soundfontSelect.disabled = isLoadingSounds || isCachingSounds;
  button.hidden = cacheUnavailable;
  if (cacheUnavailable) return;
  if (isCachingSounds) {
    button.disabled = cacheCancelled;
    button.textContent = cacheCancelled
      ? "Stopping..."
      : `Caching ${cacheProgress.done}/${cacheProgress.total} (click to cancel)`;
    return;
  }
  if (missingPrograms === null) {
    button.disabled = true;
    button.textContent = "Checking cache...";
    return;
  }
  if (missingPrograms.length === 0) {
    button.disabled = true;
    button.textContent = `All ${MAIN_INSTRUMENT_COUNT} instruments cached`;
    return;
  }
  const megabytes = Math.round(missingPrograms.length * APPROX_INSTRUMENT_MB);
  button.disabled = isLoadingSounds;
  button.textContent = `Cache ${missingPrograms.length} remaining (~${megabytes} MB)`;
}

function refreshCacheStatus() {
  const token = ++cacheStatusToken;
  listUncachedPrograms().then((missing) => {
    if (token !== cacheStatusToken) return;
    cacheUnavailable = missing === null;
    missingPrograms = missing;
    renderSoundfontControls();
  });
}

async function cacheRemainingSounds() {
  if (isCachingSounds) {
    cacheCancelled = true;
    renderSoundfontControls();
    return;
  }
  if (!missingPrograms || missingPrograms.length === 0) return;
  isCachingSounds = true;
  cacheCancelled = false;
  cacheProgress = { done: 0, total: missingPrograms.length };
  renderSoundfontControls();
  try {
    await cacheMissingInstruments(
      missingPrograms,
      (done, total) => {
        cacheProgress = { done, total };
        renderSoundfontControls();
      },
      () => cacheCancelled
    );
  } catch (err) {
    console.warn("Caching instruments failed", err);
  } finally {
    isCachingSounds = false;
    cacheCancelled = false;
    missingPrograms = null;
    renderSoundfontControls();
    refreshCacheStatus();
  }
}

function loadInstrumentSounds() {
  const token = ++loadToken;
  if (currentPrograms.size === 0) {
    els.playBtn.disabled = false;
    isLoadingSounds = false;
    renderSoundfontControls();
    els.fileMeta.textContent = baseFileMeta();
    return;
  }
  els.playBtn.disabled = true;
  isLoadingSounds = true;
  renderSoundfontControls();
  els.fileMeta.textContent = `${baseFileMeta()}\nLoading instrument sounds...`;
  preloadInstruments(currentPrograms).then((instruments) => {
    if (token !== loadToken) return;
    els.playBtn.disabled = false;
    isLoadingSounds = false;
    renderSoundfontControls();
    refreshCacheStatus();
    els.fileMeta.textContent = instruments.every(Boolean)
      ? baseFileMeta()
      : `${baseFileMeta()}\n${SYNTH_FALLBACK_MESSAGE}`;
  });
}

function applyParsedMidi(file, parsed) {
  notesFlat = parsed.notes;
  duration = parsed.duration;
  bpm = parsed.bpm;
  hasFile = true;
  currentPrograms = parsed.programSet;
  setLaneNotes(notesFlat);
  els.lanesToggle.checked = false;
  setLanesEnabled(false);

  resetMapping(
    [...parsed.drumNoteSet].sort((a, b) => a - b),
    [...parsed.programSet].sort((a, b) => a - b)
  );

  stopPlayback(true);
  els.speedInput.value = String(MAX_SPEED);
  syncSpeed();
  els.fileStatus.textContent = file.name;
  els.dropLabel.textContent = file.name;
  els.fileMeta.textContent = baseFileMeta();
  els.playBtn.disabled = true;
  els.stopBtn.disabled = false;
  els.seekBar.disabled = false;

  renderMappingUI();
  loadInstrumentSounds();
}

function populateSoundfontSelect() {
  SOUNDFONT_KITS.forEach((kit) => {
    const option = document.createElement("option");
    option.value = kit.id;
    option.textContent = kit.label;
    els.soundfontSelect.appendChild(option);
  });
  els.soundfontSelect.value = getSoundfontKit();
}

function loadMidiFile(file) {
  if (!isMidiFile(file)) {
    showLoadError("Please choose a .mid or .midi file.");
    return;
  }
  const reader = new FileReader();
  reader.onerror = () => showLoadError("That file couldn't be read.");
  reader.onload = () => {
    let parsed;
    try {
      parsed = parseMidiBuffer(reader.result);
    } catch (error) {
      showLoadError(
        error instanceof MidiLoadError ? error.message : UNREADABLE_MESSAGE
      );
      return;
    }
    clearLoadError();
    applyParsedMidi(file, parsed);
  };
  reader.readAsArrayBuffer(file);
}

function handleVisibilityChange() {
  const audioCtx = getAudioContext();
  if (!audioCtx) return;
  if (document.hidden) {
    if (!isPlaying) return;
    pausedByVisibility = true;
    clearTimer();
    audioCtx.suspend();
    return;
  }
  if (!pausedByVisibility) return;
  pausedByVisibility = false;
  audioCtx.resume();
  if (isPlaying) startTimer();
}

function wireEvents() {
  els.fileInput.addEventListener("change", () => {
    const file = pickMidiFile(els.fileInput.files);
    els.fileInput.value = "";
    if (file) loadMidiFile(file);
  });
  ["dragover", "dragleave", "drop"].forEach((evt) => {
    els.dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      if (evt === "dragover") els.dropZone.classList.add("drag-over");
      else els.dropZone.classList.remove("drag-over");
      if (evt === "drop") {
        const file = pickMidiFile(e.dataTransfer.files);
        if (file) loadMidiFile(file);
      }
    });
  });
  ["dragover", "drop"].forEach((evt) => {
    window.addEventListener(evt, (e) => {
      if (
        !e.dataTransfer ||
        !Array.from(e.dataTransfer.types).includes("Files")
      ) {
        return;
      }
      e.preventDefault();
      if (evt === "dragover" && !els.dropZone.contains(e.target)) {
        e.dataTransfer.dropEffect = "none";
      }
    });
  });

  els.playBtn.addEventListener("click", () => {
    ensureAudio();
    if (isPlaying) stopPlayback(false);
    else startPlayback();
  });

  els.stopBtn.addEventListener("click", () => stopPlayback(true));

  els.seekBar.addEventListener("input", () => {
    isScrubbing = true;
  });
  els.seekBar.addEventListener("change", () => {
    isScrubbing = false;
    seekTo(parseInt(els.seekBar.value, 10) / 1000);
  });

  els.volumeSlider.addEventListener("input", () => {
    setMasterVolume(parseFloat(els.volumeSlider.value));
  });

  els.speedInput.addEventListener("input", () => {
    syncSpeed();
  });
  els.speedInput.addEventListener("change", commitSpeedInput);
  els.speedInput.addEventListener("blur", commitSpeedInput);

  els.audioModeToggle.querySelectorAll(".segment").forEach((btn) => {
    btn.addEventListener("click", () => {
      els.audioModeToggle
        .querySelectorAll(".segment")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      audioMode = btn.dataset.mode;
      els.speedGroup.hidden = audioMode !== "mapped";
      syncSpeed();
    });
  });

  els.soundfontSelect.addEventListener("change", () => {
    if (isPlaying) stopPlayback(false);
    setSoundfontKit(els.soundfontSelect.value);
    missingPrograms = null;
    renderSoundfontControls();
    refreshCacheStatus();
    if (hasFile) loadInstrumentSounds();
  });

  els.cacheSoundsBtn.addEventListener("click", cacheRemainingSounds);

  els.lanesToggle.addEventListener("change", () => {
    setLanesEnabled(els.lanesToggle.checked);
  });

  document.addEventListener("visibilitychange", handleVisibilityChange);

  wireMappingEvents();
}

populateSoundfontSelect();
renderSoundfontControls();
refreshCacheStatus();
renderMappingUI();
wireEvents();
wireLedEvents();
wireLayoutEvents();
els.lanesToggle.checked = false;
initNoteLanes({
  getPosition: currentVisualPosition,
  getSpeed: () => playbackSpeed,
});
if (!isParserAvailable()) showLoadError(PARSER_MISSING_MESSAGE);
