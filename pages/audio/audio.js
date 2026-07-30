let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playTone(freq, type, duration, vol, delay = 0) {
  if (!audioCtx) return;
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);

  gainNode.gain.setValueAtTime(0, audioCtx.currentTime + delay);
  gainNode.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + delay + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + duration);

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.start(audioCtx.currentTime + delay);
  oscillator.stop(audioCtx.currentTime + delay + duration);
}

export function playClick() {
  try {
    initAudio();
    playTone(600, 'sine', 0.1, 0.1);
  } catch (e) {
    console.error('Audio playClick failed', e);
  }
}

export function playSuccess() {
  try {
    initAudio();
    // C5 (523.25), E5 (659.25), G5 (783.99)
    playTone(523.25, 'sine', 0.4, 0.1, 0);
    playTone(659.25, 'sine', 0.4, 0.1, 0.1);
    playTone(783.99, 'sine', 0.6, 0.1, 0.2);
  } catch (e) {
    console.error('Audio playSuccess failed', e);
  }
}

export function playReady() {
  try {
    initAudio();
    // A nice bright resonant bell sound
    // Fundamental + harmonics
    playTone(880, 'sine', 1.5, 0.15, 0);
    playTone(1760, 'sine', 1.0, 0.05, 0);
    playTone(2640, 'triangle', 0.5, 0.02, 0);
  } catch (e) {
    console.error('Audio playReady failed', e);
  }
}

export function playAlert() {
  try {
    initAudio();
    // A4 (440) -> C5 (523.25)
    playTone(440, 'sine', 0.4, 0.1, 0);
    playTone(523.25, 'sine', 0.5, 0.1, 0.15);
  } catch (e) {
    console.error('Audio playAlert failed', e);
  }
}
