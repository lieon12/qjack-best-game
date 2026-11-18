// Sound, synthesised with WebAudio: no audio files, no network. The context is created
// lazily on the first sound after a user gesture; until then (or in a headless screenshot
// run) every call is a silent no-op, so sound can never break the game.

function tone(context, frequency, duration, type, gain, when) {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  envelope.gain.setValueAtTime(0, when);
  envelope.gain.linearRampToValueAtTime(gain, when + 0.01);
  envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  oscillator.connect(envelope).connect(context.destination);
  oscillator.start(when);
  oscillator.stop(when + duration + 0.05);
}

export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context !== null) return context;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  function play(name, value) {
    if (muted) return;
    const audio = ensure();
    if (audio === null) return;
    if (audio.state === 'suspended') void audio.resume();
    const now = audio.currentTime;
    if (name === 'collect') {
      // A pluck that climbs with the combo, so a hot streak sounds like one.
      const step = Math.min(value ?? 0, 12);
      tone(audio, 523 * 2 ** (step / 12), 0.22, 'sine', 0.22, now);
      tone(audio, 1046 * 2 ** (step / 12), 0.14, 'triangle', 0.08, now);
    } else if (name === 'mote') {
      tone(audio, 880, 0.1, 'sine', 0.08, now);
    } else if (name === 'constellation') {
      [523, 659, 784, 1046].forEach((frequency, index) => {
        tone(audio, frequency, 0.35, 'triangle', 0.18, now + index * 0.09);
      });
    } else if (name === 'hit') {
      tone(audio, 130, 0.3, 'sawtooth', 0.2, now);
      tone(audio, 65, 0.35, 'sine', 0.25, now);
    } else if (name === 'shield') {
      tone(audio, 392, 0.25, 'triangle', 0.16, now);
      tone(audio, 587, 0.3, 'triangle', 0.16, now + 0.08);
    } else if (name === 'powerup') {
      tone(audio, 660, 0.16, 'sine', 0.16, now);
      tone(audio, 990, 0.22, 'sine', 0.16, now + 0.07);
    } else if (name === 'win') {
      [523, 659, 784, 1046, 1318, 1568].forEach((frequency, index) => {
        tone(audio, frequency, 0.5, 'triangle', 0.18, now + index * 0.12);
      });
    } else if (name === 'lose') {
      [392, 330, 262, 196].forEach((frequency, index) => {
        tone(audio, frequency, 0.4, 'sine', 0.16, now + index * 0.14);
      });
    } else if (name === 'click') {
      tone(audio, 700, 0.07, 'sine', 0.12, now);
    }
  }

  return {
    play,
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
  };
}
