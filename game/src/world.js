// The game's rules and state, with no drawing and no browser in it: the lantern, the stars
// of the current constellation, the wisps and comets that hunt it, the power-ups, the motes,
// score, combo, lives and the win. step() advances one fixed step and returns what happened
// as bit flags, so the caller can react without the world knowing about screens or sound.
// Nothing here allocates after createWorld returns, except the short particle bursts.
import { BETWEEN, COMBO, COMET, CONSTELLATION_COUNT, FIELD, LIVES, MOTE, PLAYER, POWERUP, STAR, WISP } from './config.js';
import { CONSTELLATIONS, constellationBonus } from './constellations.js';

export const EVENT_STAR = 1;
export const EVENT_MOTE = 2;
export const EVENT_CONSTELLATION = 4;
export const EVENT_HIT = 8;
export const EVENT_POWERUP = 16;
export const EVENT_WIN = 32;
export const EVENT_OVER = 64;

const POWERUP_KINDS = ['shield', 'ember', 'frost'];

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function createWorld(random) {
  const player = { x: FIELD.width / 2, y: FIELD.height / 2, vx: 0, vy: 0, invulnerable: 0, shield: false };
  const stars = [];
  const wisps = [];
  const comets = [];
  const powerups = [];
  const motes = [];
  const particles = [];
  const lines = [];
  const state = {
    player,
    stars,
    wisps,
    comets,
    powerups,
    motes,
    particles,
    lines,
    backdrop: { stars: [], nebulae: [] },
    score: 0,
    combo: 0,
    comboTimer: 0,
    multiplier: 1,
    lives: LIVES,
    constellation: 0,
    starsGot: 0,
    elapsed: 0,
    emberTimer: 0,
    frostTimer: 0,
    between: 0,
    flash: 0,
    won: false,
    over: false,
    starsCollected: 0,
    constellationsDone: 0,
    hitsTaken: 0,
  };
  let wispTimer = 2;
  let cometTimer = COMET.interval;
  let powerupTimer = POWERUP.interval;
  let moteTimer = 0.5;

  // The night sky itself: three layers of still stars and three soft nebulae, drawn once
  // from the world's seed so the sky is the same every visit.
  for (let layer = 0; layer < 3; layer += 1) {
    const count = 46 - layer * 12;
    for (let index = 0; index < count; index += 1) {
      state.backdrop.stars.push({
        x: random() * FIELD.width,
        y: random() * FIELD.height,
        radius: 0.8 + (2 - layer) * 0.5,
        phase: random() * Math.PI * 2,
        layer,
      });
    }
  }
  for (let index = 0; index < 3; index += 1) {
    state.backdrop.nebulae.push({
      x: random() * FIELD.width,
      y: random() * FIELD.height,
      radius: 220 + random() * 180,
      kind: index,
    });
  }

  function burst(x, y, color, count, speed) {
    for (let index = 0; index < count; index += 1) {
      const angle = random() * Math.PI * 2;
      const velocity = (0.3 + random() * 0.7) * speed;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: 0.5 + random() * 0.4,
        maxLife: 0.9,
        size: 2 + random() * 3,
        color,
      });
    }
    if (particles.length > 220) particles.splice(0, particles.length - 220);
  }

  function setupConstellation(index) {
    const definition = CONSTELLATIONS[index];
    stars.length = 0;
    for (let i = 0; i < definition.stars.length; i += 1) {
      const [fx, fy] = definition.stars[i];
      stars.push({
        x: Math.min(FIELD.width - 40, Math.max(40, fx * FIELD.width + (random() - 0.5) * 2 * STAR.jitter)),
        y: Math.min(FIELD.height - 60, Math.max(50, fy * FIELD.height + (random() - 0.5) * 2 * STAR.jitter)),
        index: i,
        collected: false,
        twinkle: random() * Math.PI * 2,
      });
    }
    state.starsGot = 0;
  }

  function reset() {
    player.x = FIELD.width / 2;
    player.y = FIELD.height / 2;
    player.vx = 0;
    player.vy = 0;
    player.invulnerable = 0;
    player.shield = false;
    wisps.length = 0;
    comets.length = 0;
    powerups.length = 0;
    motes.length = 0;
    particles.length = 0;
    lines.length = 0;
    state.score = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.multiplier = 1;
    state.lives = LIVES;
    state.constellation = 0;
    state.elapsed = 0;
    state.emberTimer = 0;
    state.frostTimer = 0;
    state.between = 0;
    state.flash = 0;
    state.won = false;
    state.over = false;
    state.starsCollected = 0;
    state.constellationsDone = 0;
    state.hitsTaken = 0;
    wispTimer = 2;
    cometTimer = COMET.interval;
    powerupTimer = POWERUP.interval;
    moteTimer = 0.5;
    setupConstellation(0);
    for (let index = 0; index < 8; index += 1) {
      motes.push({ x: 60 + random() * (FIELD.width - 120), y: 60 + random() * (FIELD.height - 120), twinkle: random() * Math.PI * 2 });
    }
    for (let index = 0; index < WISP.baseCount; index += 1) spawnWisp();  }

  function edgePoint(minFromPlayer) {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const side = Math.floor(random() * 4);
      let x = 0;
      let y = 0;
      if (side === 0) { x = random() * FIELD.width; y = -30; }
      else if (side === 1) { x = FIELD.width + 30; y = random() * FIELD.height; }
      else if (side === 2) { x = random() * FIELD.width; y = FIELD.height + 30; }
      else { x = -30; y = random() * FIELD.height; }
      if (distance(x, y, player.x, player.y) >= minFromPlayer) return { x, y };
    }
    return { x: -30, y: random() * FIELD.height };
  }

  function spawnWisp() {
    const point = edgePoint(200);
    const angle = random() * Math.PI * 2;
    wisps.push({
      x: point.x,
      y: point.y,
      vx: Math.cos(angle) * 30,
      vy: Math.sin(angle) * 30,
      radius: WISP.radius,
      phase: random() * Math.PI * 2,
      lunge: 0,
      cooldown: 1 + random(),
    });
  }

  function spawnComet() {
    const start = edgePoint(0);
    const target = { x: random() * FIELD.width, y: random() * FIELD.height };
    const angle = Math.atan2(target.y - start.y, target.x - start.x);
    comets.push({
      x: start.x,
      y: start.y,
      vx: Math.cos(angle) * COMET.speed,
      vy: Math.sin(angle) * COMET.speed,
      radius: COMET.radius,
      warn: COMET.warn,
      angle,
    });
  }

  function spawnPowerup() {
    const kind = POWERUP_KINDS[Math.floor(random() * POWERUP_KINDS.length)];
    powerups.push({
      x: 70 + random() * (FIELD.width - 140),
      y: 70 + random() * (FIELD.height - 140),
      kind,
      ttl: POWERUP.ttl,
      phase: random() * Math.PI * 2,
    });
  }

  function spawnMote() {
    motes.push({
      x: 40 + random() * (FIELD.width - 80),
      y: 40 + random() * (FIELD.height - 80),
      twinkle: random() * Math.PI * 2,
    });
  }

  function multiplier() {
    const base = 1 + Math.floor(state.combo / COMBO.perMultiplier);
    const capped = Math.min(COMBO.maxMultiplier, base);
    return state.emberTimer > 0 ? capped * 2 : capped;
  }

  function takeHit(source) {
    if (player.invulnerable > 0 || state.won || state.over) return 0;
    if (player.shield) {
      player.shield = false;
      player.invulnerable = 1;
      burst(player.x, player.y, '#7dffb0', 18, 220);
      return EVENT_HIT;
    }
    state.lives -= 1;
    state.hitsTaken += 1;
    state.combo = 0;
    state.comboTimer = 0;
    state.multiplier = 1;
    player.invulnerable = PLAYER.invulnerable;
    burst(player.x, player.y, '#ff6b6b', 22, 260);
    if (state.lives <= 0) {
      state.over = true;
      return EVENT_HIT | EVENT_OVER;
    }
    return EVENT_HIT;
  }

  function completeConstellation() {
    const bonus = constellationBonus(state.constellation);
    state.score += bonus;
    for (let index = 0; index < stars.length; index += 1) {
      stars[index].collected = true;
      if (index > 0) {
        lines.push({ x1: stars[index - 1].x, y1: stars[index - 1].y, x2: stars[index].x, y2: stars[index].y });
      }
      burst(stars[index].x, stars[index].y, '#ffd76a', 10, 160);
    }
    state.constellationsDone += 1;
    state.flash = 1;
    state.constellation += 1;
    if (state.constellation >= CONSTELLATION_COUNT) {
      state.won = true;
      return EVENT_CONSTELLATION | EVENT_WIN;
    }
    state.between = BETWEEN;
    return EVENT_CONSTELLATION;
  }

  /**
   * One fixed step. `target` is the point the lantern steers toward ({x, y} in field
   * pixels) or null to stay. With `harmless` set (the title screen's backdrop) things
   * drift but nothing touches the player and nothing scores.
   */
  function step(dt, target, harmless) {
    let events = 0;
    state.elapsed += dt;
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 1.4);
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) {
        state.combo = 0;
        state.multiplier = multiplier();
      }
    }
    if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);
    if (state.emberTimer > 0) state.emberTimer = Math.max(0, state.emberTimer - dt);
    if (state.frostTimer > 0) state.frostTimer = Math.max(0, state.frostTimer - dt);

    // The lantern steers toward its target with an arrive easing, so it answers at once
    // and still settles instead of orbiting the point.
    if (target !== null && !state.won && !state.over) {
      const dx = target.x - player.x;
      const dy = target.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 2) {
        const speed = Math.min(PLAYER.maxSpeed, dist * 8);
        const wantX = (dx / dist) * speed;
        const wantY = (dy / dist) * speed;
        const ease = Math.min(1, 12 * dt);
        player.vx += (wantX - player.vx) * ease;
        player.vy += (wantY - player.vy) * ease;
      } else {
        player.vx *= Math.max(0, 1 - 10 * dt);
        player.vy *= Math.max(0, 1 - 10 * dt);
      }
    } else {
      player.vx *= Math.max(0, 1 - 6 * dt);
      player.vy *= Math.max(0, 1 - 6 * dt);
    }
    player.x = Math.min(FIELD.width - PLAYER.radius, Math.max(PLAYER.radius, player.x + player.vx * dt));
    player.y = Math.min(FIELD.height - PLAYER.radius, Math.max(PLAYER.radius, player.y + player.vy * dt));

    // Between constellations: the next one's stars appear after a short breath.
    if (state.between > 0 && !state.won) {
      state.between -= dt;
      if (state.between <= 0) setupConstellation(state.constellation);
    }

    // Spawning (not on the title screen).
    if (!harmless && !state.won && !state.over) {
      const wispTarget = Math.min(WISP.maxCount, WISP.baseCount + WISP.countPerLevel * state.constellation);
      wispTimer -= dt;
      if (wispTimer <= 0) {
        if (wisps.length < wispTarget) spawnWisp();
        wispTimer = 1.2;
      }
      cometTimer -= dt;
      if (cometTimer <= 0) {
        spawnComet();
        cometTimer = Math.max(COMET.minInterval, COMET.interval * COMET.intervalScale ** state.constellation);
      }
      powerupTimer -= dt;
      if (powerupTimer <= 0) {
        spawnPowerup();
        powerupTimer = POWERUP.interval + random() * POWERUP.intervalJitter;
      }
      moteTimer -= dt;
      if (moteTimer <= 0) {
        if (motes.length < MOTE.target) spawnMote();
        moteTimer = MOTE.interval;
      }
    }

    // Wisps drift and, close in, lean toward the lantern; near enough, they lunge at it.
    // A lunge is a short fast dart, so a lantern that blunders into a wisp's reach is
    // caught, while one that keeps its distance stays safe.
    const wispSpeed = (WISP.baseSpeed + WISP.speedPerLevel * state.constellation) * (state.frostTimer > 0 ? 0.5 : 1);
    for (let index = wisps.length - 1; index >= 0; index -= 1) {
      const wisp = wisps[index];
      const toPlayer = distance(wisp.x, wisp.y, player.x, player.y);
      if (wisp.cooldown > 0) wisp.cooldown -= dt;
      if (wisp.lunge > 0) {
        wisp.lunge -= dt;
        wisp.vx += ((player.x - wisp.x) / Math.max(1, toPlayer)) * WISP.lungeAccel * dt;
        wisp.vy += ((player.y - wisp.y) / Math.max(1, toPlayer)) * WISP.lungeAccel * dt;
      } else if (toPlayer < WISP.lungeRange && wisp.cooldown <= 0 && !harmless) {
        wisp.lunge = WISP.lungeSeconds;
        wisp.cooldown = WISP.lungeCooldown;
      } else if (toPlayer < WISP.chaseRange && !harmless) {
        const chase = WISP.chaseAccel * (state.frostTimer > 0 ? 0.5 : 1);
        wisp.vx += ((player.x - wisp.x) / Math.max(1, toPlayer)) * chase * dt;
        wisp.vy += ((player.y - wisp.y) / Math.max(1, toPlayer)) * chase * dt;
      }
      const cap = wisp.lunge > 0 ? WISP.lungeSpeed : wispSpeed;
      const speed = Math.hypot(wisp.vx, wisp.vy);
      if (speed > cap) {
        wisp.vx = (wisp.vx / speed) * cap;
        wisp.vy = (wisp.vy / speed) * cap;
      }
      wisp.x += wisp.vx * dt;
      wisp.y += wisp.vy * dt;
      if (wisp.x < -60 || wisp.x > FIELD.width + 60 || wisp.y < -60 || wisp.y > FIELD.height + 60) {
        wisps.splice(index, 1);
      }
    }

    // Comets warn with a line, then streak across.
    for (let index = comets.length - 1; index >= 0; index -= 1) {
      const comet = comets[index];
      if (comet.warn > 0) {
        comet.warn -= dt;
        continue;
      }
      comet.x += comet.vx * dt;
      comet.y += comet.vy * dt;
      if (comet.x < -80 || comet.x > FIELD.width + 80 || comet.y < -80 || comet.y > FIELD.height + 80) {
        comets.splice(index, 1);
      }
    }

    // Power-ups fade out when their time runs out.
    for (let index = powerups.length - 1; index >= 0; index -= 1) {
      powerups[index].ttl -= dt;
      if (powerups[index].ttl <= 0) powerups.splice(index, 1);
    }

    // Particles fade.
    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.max(0, 1 - 2 * dt);
      particle.vy *= Math.max(0, 1 - 2 * dt);
      if (particle.life <= 0) particles.splice(index, 1);
    }

    if (harmless || state.won || state.over) return events;

    // The next star in the constellation's order is the one that counts.
    if (state.between <= 0 && state.starsGot < stars.length) {
      const star = stars[state.starsGot];
      if (distance(player.x, player.y, star.x, star.y) < STAR.collectRadius) {
        star.collected = true;
        state.starsGot += 1;
        state.starsCollected += 1;
        state.combo += 1;
        state.comboTimer = COMBO.window;
        state.multiplier = multiplier();
        state.score += STAR.points * state.multiplier;
        burst(star.x, star.y, '#ffd76a', 12, 180);
        events |= EVENT_STAR;
        if (state.starsGot >= stars.length) events |= completeConstellation();
      }
    }

    // Motes are worth a little, and keep the combo warm between stars.
    for (let index = motes.length - 1; index >= 0; index -= 1) {
      const mote = motes[index];
      if (distance(player.x, player.y, mote.x, mote.y) < PLAYER.radius + MOTE.radius + 4) {
        motes.splice(index, 1);
        state.combo += 1;
        state.comboTimer = COMBO.window;
        state.multiplier = multiplier();
        state.score += MOTE.points * state.multiplier;
        burst(mote.x, mote.y, '#8fe3ff', 6, 120);
        events |= EVENT_MOTE;
      }
    }

    // Power-ups: a shield that eats one hit, ember that doubles points, frost that slows wisps.
    for (let index = powerups.length - 1; index >= 0; index -= 1) {
      const powerup = powerups[index];
      if (distance(player.x, player.y, powerup.x, powerup.y) < PLAYER.radius + 16) {
        powerups.splice(index, 1);
        if (powerup.kind === 'shield') player.shield = true;
        else if (powerup.kind === 'ember') state.emberTimer = POWERUP.emberSeconds;
        else state.frostTimer = POWERUP.frostSeconds;
        burst(powerup.x, powerup.y, '#7dffb0', 14, 180);
        events |= EVENT_POWERUP;
      }
    }

    // Hazards, skipped during the breath between constellations.
    if (state.between <= 0) {
      for (let index = wisps.length - 1; index >= 0; index -= 1) {
        const wisp = wisps[index];
        if (distance(player.x, player.y, wisp.x, wisp.y) < PLAYER.radius + wisp.radius - 4) {
          if (player.shield) {
            player.shield = false;
            player.invulnerable = 1;
            wisps.splice(index, 1);
            burst(player.x, player.y, '#7dffb0', 18, 220);
            events |= EVENT_HIT;
          } else {
            events |= takeHit('wisp');
          }
          if (state.over) return events;
        }
      }
      for (let index = comets.length - 1; index >= 0; index -= 1) {
        const comet = comets[index];
        if (comet.warn > 0) continue;
        if (distance(player.x, player.y, comet.x, comet.y) < PLAYER.radius + comet.radius - 4) {
          comets.splice(index, 1);
          events |= takeHit('comet');
          if (state.over) return events;
        }
      }
    }

    return events;
  }

  reset();
  return { state, reset, step };
}
