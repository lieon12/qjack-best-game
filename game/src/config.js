// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical
// area; the renderer scales it to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 15,
  accel: 2800,
  maxSpeed: 540,
  arrive: 6,
  invulnerable: 1.5,
};

export const LIVES = 3;

/** How many constellations make a full game: finish them all and you win. */
export const CONSTELLATION_COUNT = 6;

export const STAR = {
  radius: 13,
  collectRadius: 30,
  points: 10,
  jitter: 26,
};

export const MOTE = {
  radius: 5,
  points: 2,
  target: 14,
  interval: 0.9,
};

export const WISP = {
  radius: 16,
  baseSpeed: 72,
  speedPerLevel: 22,
  chaseRange: 320,
  chaseAccel: 280,
  lungeRange: 150,
  lungeAccel: 900,
  lungeSpeed: 430,
  lungeSeconds: 0.55,
  lungeCooldown: 1.6,
  baseCount: 3,
  countPerLevel: 1,
  maxCount: 9,
};

export const COMET = {
  radius: 14,
  speed: 640,
  warn: 0.9,
  interval: 12,
  intervalScale: 0.88,
  minInterval: 6,
};

export const POWERUP = {
  interval: 11,
  intervalJitter: 5,
  ttl: 9,
  emberSeconds: 10,
  frostSeconds: 8,
};

/** A combo grows while you keep collecting; it resets when you are hit or go quiet. */
export const COMBO = { window: 4, perMultiplier: 4, maxMultiplier: 4 };

/** Seconds of grace after a constellation completes before the next one's stars appear. */
export const BETWEEN = 1.6;

export const PALETTE = {
  backdrop: '#0a0d1f',
  skyTop: '#131838',
  skyBottom: '#0a0d1f',
  nebulaA: 'rgba(88, 60, 160, 0.20)',
  nebulaB: 'rgba(24, 110, 130, 0.16)',
  nebulaC: 'rgba(160, 60, 110, 0.12)',
  starDim: '#5a6480',
  starTarget: '#ffd76a',
  starDone: '#ffe9a8',
  line: 'rgba(255, 215, 106, 0.85)',
  mote: '#8fe3ff',
  player: '#7fe7ff',
  playerCore: '#eafcff',
  flame: '#ffb347',
  wisp: '#1a1026',
  wispRim: '#c94bff',
  comet: '#ff9d5c',
  shield: '#7dffb0',
  ember: '#ffb347',
  frost: '#9fd8ff',
  panel: 'rgba(20, 25, 48, 0.94)',
  panelEdge: '#3a4470',
  text: '#f2f4fb',
  muted: '#9aa3c0',
  gold: '#ffd76a',
  danger: '#ff6b6b',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'star-shepherd.best';
