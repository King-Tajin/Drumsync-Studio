import {
  ensureAudio,
  getAudioContext,
  setMasterVolume,
  preloadInstruments,
  playDrumSound,
  playMelodic,
  stopAllSounds,
} from "./audio-engine.js";
import {
  resetMapping,
  zonesForNote,
  flashZone,
  renderMappingUI,
  wireMappingEvents,
} from "./zone-mapping.js";

/* global Midi */

/**
 * @typedef {Object} MidiNote
 * @property {number} time
 * @property {number} midi
 * @property {number} velocity
 * @property {number} duration
 */

/**
 * @typedef {Object} MidiInstrument
 * @property {number} number
 * @property {boolean} percussion
 */

/**
 * @typedef {Object} MidiTrack
 * @property {number} channel
 * @property {MidiInstrument} instrument
 * @property {MidiNote[]} notes
 */

/**
 * @typedef {Object} MidiTempo
 * @property {number} bpm
 */

/**
 * @typedef {Object} MidiHeader
 * @property {MidiTempo[]} tempos
 */

/**
 * @typedef {Object} MidiFile
 * @property {MidiTrack[]} tracks
 * @property {number} duration
 * @property {MidiHeader} header
 */

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
  audioModeToggle: document.getElementById("audioModeToggle"),
};

const LOOKAHEAD_SECONDS = 0.2;
const TICK_MS = 25;
const PARSER_MISSING_MESSAGE =
  "The MIDI parser failed to load. Check your connection and reload the page.";
const SYNTH_FALLBACK_MESSAGE =
  "Some instrument sounds couldn't load, using basic synth. Reload the file to retry.";
const UNREADABLE_MESSAGE = "That file couldn't be read as a MIDI file.";

class MidiLoadError extends Error {}

let audioMode = "all";
let notesFlat = [];
let duration = 0;
let bpm = 120;
let isPlaying = false;
let nextNoteIndex = 0;
let ctxStartTime = 0;
let startOffset = 0;
let pendingFlashes = [];
let timerId = null;
let isScrubbing = false;
let pausedByVisibility = false;
let loadToken = 0;

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
    startOffset += now - ctxStartTime;
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
    if (zoneIds.length > 0) pendingFlashes.push({ when, zoneIds });
  } else if (audioMode === "all") {
    playMelodic(note, when, vel, noteDuration, program);
  }
}

function flushFlashes(now) {
  const audioCtx = getAudioContext();
  const latency = audioCtx.outputLatency || audioCtx.baseLatency || 0;
  const remaining = [];
  pendingFlashes.forEach((flash) => {
    if (flash.when + latency <= now) flash.zoneIds.forEach(flashZone);
    else remaining.push(flash);
  });
  pendingFlashes = remaining;
}

function tick() {
  if (!isPlaying) return;
  const now = getAudioContext().currentTime;
  const elapsed = startOffset + (now - ctxStartTime);

  while (
    nextNoteIndex < notesFlat.length &&
    notesFlat[nextNoteIndex].time <= elapsed + LOOKAHEAD_SECONDS
  ) {
    const n = notesFlat[nextNoteIndex];
    const when = Math.max(now, ctxStartTime + (n.time - startOffset));
    scheduleTrigger(
      n.midi,
      n.velocity || 0.8,
      when,
      n.isDrum,
      n.duration,
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

function isMidiFile(file) {
  return /\.midi?$/i.test(file.name);
}

function pickMidiFile(fileList) {
  const files = Array.from(fileList);
  return files.find(isMidiFile) || files[0] || null;
}

function parseMidiBuffer(buffer) {
  if (typeof Midi === "undefined") {
    throw new MidiLoadError(PARSER_MISSING_MESSAGE);
  }
  /** @type {MidiFile} */
  const midi = new Midi(buffer);
  const notes = [];
  const drumNoteSet = new Set();
  const programSet = new Set();

  midi.tracks.forEach((track) => {
    const isDrum =
      track.channel === 9 || (track.instrument && track.instrument.percussion);
    const program = track.instrument ? track.instrument.number : 0;
    track.notes.forEach((n) => {
      notes.push({
        time: n.time,
        midi: n.midi,
        velocity: n.velocity,
        duration: n.duration,
        isDrum,
        program,
      });
      if (isDrum) drumNoteSet.add(n.midi);
      else programSet.add(program);
    });
  });

  if (notes.length === 0) {
    throw new MidiLoadError("This MIDI file doesn't contain any notes.");
  }
  notes.sort((a, b) => a.time - b.time);

  const lastEnd = notes.reduce(
    (max, n) => Math.max(max, n.time + n.duration),
    0
  );
  const tempo = midi.header.tempos[0];
  return {
    notes,
    drumNoteSet,
    programSet,
    duration:
      Number.isFinite(midi.duration) && midi.duration > 0
        ? midi.duration
        : lastEnd,
    bpm: (tempo && tempo.bpm) || 120,
  };
}

function applyParsedMidi(file, parsed) {
  const token = ++loadToken;
  notesFlat = parsed.notes;
  duration = parsed.duration;
  bpm = parsed.bpm;

  resetMapping(
    [...parsed.drumNoteSet].sort((a, b) => a - b),
    [...parsed.programSet].sort((a, b) => a - b)
  );

  stopPlayback(true);
  els.fileStatus.textContent = file.name;
  els.dropLabel.textContent = file.name;
  els.fileMeta.textContent = baseFileMeta();
  els.playBtn.disabled = true;
  els.stopBtn.disabled = false;
  els.seekBar.disabled = false;

  renderMappingUI();

  if (parsed.programSet.size === 0) {
    els.playBtn.disabled = false;
    return;
  }
  els.fileMeta.textContent = `${baseFileMeta()}\nLoading instrument sounds...`;
  preloadInstruments(parsed.programSet).then((instruments) => {
    if (token !== loadToken) return;
    els.playBtn.disabled = false;
    els.fileMeta.textContent = instruments.every(Boolean)
      ? baseFileMeta()
      : `${baseFileMeta()}\n${SYNTH_FALLBACK_MESSAGE}`;
  });
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

  els.audioModeToggle.querySelectorAll(".segment").forEach((btn) => {
    btn.addEventListener("click", () => {
      els.audioModeToggle
        .querySelectorAll(".segment")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      audioMode = btn.dataset.mode;
    });
  });

  document.addEventListener("visibilitychange", handleVisibilityChange);

  wireMappingEvents();
}

renderMappingUI();
wireEvents();
if (typeof Midi === "undefined") showLoadError(PARSER_MISSING_MESSAGE);
