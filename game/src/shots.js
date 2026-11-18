// The screenshot scenes behind ?shot=start|play|win|end. Each one plays the real rules
// forward from a fresh world for a fixed time or until the game ends, steered by an
// autopilot, so the frame is what a real game looks like and the same seed always gives
// the same frame. The careful pilot scores candidate points by how close they take the
// lantern to the next star and how far they keep it from wisps and comet paths; the
// careless pilot flies straight at the star, as a hurried player does, and gets caught.
import { FIELD, STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const LIMIT_SECONDS = 900;
/** How far out the careful pilot samples detour points around the lantern. */
const SAMPLE_RADIUS = 140;

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

/** Distance from a point to the comet's warned path (a ray from its start, its angle). */
function distanceToCometPath(px, py, comet) {
  const dx = Math.cos(comet.angle);
  const dy = Math.sin(comet.angle);
  const along = (px - comet.x) * dx + (py - comet.y) * dy;
  if (along < 0) return distance(px, py, comet.x, comet.y);
  const cx = comet.x + dx * along;
  const cy = comet.y + dy * along;
  return distance(px, py, cx, cy);
}

function nextStarTarget(state) {
  if (state.between > 0 || state.starsGot >= state.stars.length) return null;
  return state.stars[state.starsGot];
}

function dangerAt(state, x, y) {
  let danger = 0;
  for (const wisp of state.wisps) {
    const d = distance(x, y, wisp.x, wisp.y);
    if (d < 180) danger += (180 - d) * 8;
  }
  for (const comet of state.comets) {
    if (comet.warn > 0) {
      if (distanceToCometPath(x, y, comet) < 46) danger += 320;
    } else {
      const d = distance(x, y, comet.x, comet.y);
      if (d < 110) danger += (110 - d) * 6;
    }
  }
  return danger;
}

function carefulPilot(state) {
  const player = state.player;
  const star = nextStarTarget(state);
  let target = star;
  if (star === null) {
    // Between constellations: drift toward the nearest mote, else the centre.
    let mote = null;
    for (const candidate of state.motes) {
      if (mote === null || distance(player.x, player.y, candidate.x, candidate.y) < distance(player.x, player.y, mote.x, mote.y)) mote = candidate;
    }
    target = mote ?? { x: FIELD.width / 2, y: FIELD.height / 2 };
  }
  const candidates = [{ x: target.x, y: target.y }];
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    candidates.push({
      x: player.x + Math.cos(angle) * SAMPLE_RADIUS,
      y: player.y + Math.sin(angle) * SAMPLE_RADIUS,
    });
  }
  // A shield nearby is worth a small detour when the lantern has none.
  if (!player.shield) {
    for (const powerup of state.powerups) {
      if (powerup.kind === 'shield' && distance(player.x, player.y, powerup.x, powerup.y) < 220) {
        candidates.push({ x: powerup.x, y: powerup.y });
      }
    }
  }
  let best = candidates[0];
  let bestCost = Infinity;
  for (const point of candidates) {
    const clamped = {
      x: Math.min(FIELD.width - 20, Math.max(20, point.x)),
      y: Math.min(FIELD.height - 20, Math.max(20, point.y)),
    };
    const cost =
      distance(clamped.x, clamped.y, target.x, target.y) +
      dangerAt(state, clamped.x, clamped.y) +
      distance(clamped.x, clamped.y, player.x, player.y) * 0.1;
    if (cost < bestCost) {
      bestCost = cost;
      best = clamped;
    }
  }
  return best;
}

function carelessPilot(state) {
  const star = nextStarTarget(state);
  if (star !== null) return { x: star.x, y: star.y };
  return { x: FIELD.width / 2, y: FIELD.height / 2 };
}

/**
 * Set `world` to the named scene (start, play, win or end; any other name is start) and
 * return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'win' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      const angle = world.state.elapsed * 0.5;
      world.step(STEP, { x: FIELD.width / 2 + Math.cos(angle) * 200, y: FIELD.height / 2 + Math.sin(angle) * 120 }, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const careful = name !== 'end';
  for (let index = 0; index < LIMIT_SECONDS / STEP; index += 1) {
    const state = world.state;
    if (state.won || state.over) break;
    if (name === 'play' && index >= PLAY_SECONDS / STEP) break;
    const pilot = careful ? carefulPilot(state) : carelessPilot(state);
    world.step(STEP, pilot, false);
  }
  const state = world.state;
  if (state.won) return { screen: SCREEN_WIN, best: state.score };
  if (state.over) return { screen: SCREEN_OVER, best: state.score };
  return { screen: SCREEN_PLAY, best: state.score };
}
