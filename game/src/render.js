// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred, the margin filled with the backdrop
// colour. The sky is a gradient with soft nebulae and twinkling stars; the game itself is
// glowing shapes and canvas text for the HUD and the panels. Text that holds a number is
// rebuilt only when the number changes, so a frame allocates nothing.
import { CONSTELLATION_COUNT, FIELD, FONT, LIVES, PALETTE } from './config.js';
import { CONSTELLATIONS } from './constellations.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

/** The panel's width; its height grows with its lines: room for the title, the lines and the prompt. */
const PANEL = { width: 640, top: 150, line: 32, bottom: 76 };

function cachedLabel(prefix) {
  let value = null;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Score ');
  const bestLabel = cachedLabel('Best ');
  const finalLabel = cachedLabel('Score ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function glowCircle(x, y, radius, color, alpha) {
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.globalAlpha = alpha;
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
  }

  function drawSky(state) {
    const gradient = context.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, PALETTE.skyTop);
    gradient.addColorStop(1, PALETTE.skyBottom);
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    for (const nebula of state.backdrop.nebulae) {
      const color = nebula.kind === 0 ? PALETTE.nebulaA : nebula.kind === 1 ? PALETTE.nebulaB : PALETTE.nebulaC;
      glowCircle(nebula.x, nebula.y, nebula.radius, color, 1);
    }
    for (const star of state.backdrop.stars) {
      const twinkle = 0.45 + 0.35 * Math.sin(state.elapsed * (1 + star.layer * 0.4) + star.phase);
      context.globalAlpha = twinkle;
      context.fillStyle = '#cdd6f4';
      context.beginPath();
      context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function drawLines(state) {
    if (state.lines.length === 0) return;
    context.strokeStyle = PALETTE.line;
    context.lineWidth = 2.5;
    context.shadowColor = PALETTE.gold;
    context.shadowBlur = 8;
    context.beginPath();
    for (const line of state.lines) {
      context.moveTo(line.x1, line.y1);
      context.lineTo(line.x2, line.y2);
    }
    context.stroke();
    context.shadowBlur = 0;
  }

  function drawStars(state, screen) {
    const playing = screen === SCREEN_PLAY || screen === SCREEN_PAUSED;
    for (const star of state.stars) {
      const isTarget = playing && star.index === state.starsGot && state.between <= 0;
      const twinkle = 0.6 + 0.4 * Math.sin(state.elapsed * 3 + star.twinkle);
      if (star.collected) {
        context.globalAlpha = 0.9;
        context.fillStyle = PALETTE.starDone;
        context.beginPath();
        context.arc(star.x, star.y, 5, 0, Math.PI * 2);
        context.fill();
        context.globalAlpha = 1;
        continue;
      }
      if (isTarget) {
        const pulse = 20 + 5 * Math.sin(state.elapsed * 5);
        glowCircle(star.x, star.y, pulse + 14, 'rgba(255, 215, 106, 0.55)', 1);
        context.strokeStyle = PALETTE.starTarget;
        context.lineWidth = 2.5;
        context.beginPath();
        context.arc(star.x, star.y, pulse, 0, Math.PI * 2);
        context.stroke();
        context.fillStyle = PALETTE.starTarget;
        context.beginPath();
        context.arc(star.x, star.y, 8, 0, Math.PI * 2);
        context.fill();
        text(String(star.index + 1), star.x, star.y - 24, 20, PALETTE.starTarget, 'center');
      } else {
        context.globalAlpha = twinkle * 0.85;
        context.fillStyle = '#aab4d4';
        context.beginPath();
        context.arc(star.x, star.y, 6, 0, Math.PI * 2);
        context.fill();
        context.globalAlpha = 1;
        text(String(star.index + 1), star.x, star.y - 20, 15, PALETTE.muted, 'center');
      }
    }
  }

  function drawMotes(state) {
    for (const mote of state.motes) {
      const twinkle = 0.5 + 0.5 * Math.sin(state.elapsed * 4 + mote.twinkle);
      context.globalAlpha = twinkle;
      context.fillStyle = PALETTE.mote;
      context.beginPath();
      context.arc(mote.x, mote.y, 4, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function drawPowerups(state) {
    for (const powerup of state.powerups) {
      if (powerup.ttl < 3 && Math.floor(powerup.ttl * 4) % 2 === 0) continue;
      const color = powerup.kind === 'shield' ? PALETTE.shield : powerup.kind === 'ember' ? PALETTE.ember : PALETTE.frost;
      const bob = Math.sin(state.elapsed * 3 + powerup.phase) * 3;
      glowCircle(powerup.x, powerup.y + bob, 26, color, 0.5);
      context.strokeStyle = color;
      context.lineWidth = 2.5;
      context.beginPath();
      context.arc(powerup.x, powerup.y + bob, 13, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = color;
      context.beginPath();
      context.arc(powerup.x, powerup.y + bob, 5, 0, Math.PI * 2);
      context.fill();
      text(powerup.kind === 'shield' ? 'S' : powerup.kind === 'ember' ? 'E' : 'F', powerup.x, powerup.y + bob - 20, 16, color, 'center');
    }
  }

  function drawWisps(state) {
    for (const wisp of state.wisps) {
      const wobble = Math.sin(state.elapsed * 2.4 + wisp.phase) * 2;
      glowCircle(wisp.x, wisp.y + wobble, wisp.radius + 18, 'rgba(160, 60, 220, 0.35)', 1);
      context.fillStyle = PALETTE.wisp;
      context.beginPath();
      context.arc(wisp.x, wisp.y + wobble, wisp.radius, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = PALETTE.wispRim;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(wisp.x, wisp.y + wobble, wisp.radius, 0, Math.PI * 2);
      context.stroke();
      // Two pale eyes, so the dark reads as a creature and not a hole.
      context.fillStyle = '#e9d5ff';
      context.beginPath();
      context.arc(wisp.x - 5, wisp.y + wobble - 3, 2.4, 0, Math.PI * 2);
      context.arc(wisp.x + 5, wisp.y + wobble - 3, 2.4, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawComets(state) {
    for (const comet of state.comets) {
      if (comet.warn > 0) {
        const endX = comet.x + Math.cos(comet.angle) * 900;
        const endY = comet.y + Math.sin(comet.angle) * 900;
        context.strokeStyle = 'rgba(255, 157, 92, 0.55)';
        context.lineWidth = 2;
        context.setLineDash([10, 8]);
        context.beginPath();
        context.moveTo(comet.x, comet.y);
        context.lineTo(endX, endY);
        context.stroke();
        context.setLineDash([]);
        if (Math.floor(comet.warn * 6) % 2 === 0) {
          text('!', comet.x, comet.y - 22, 26, PALETTE.comet, 'center');
        }
        continue;
      }
      const tailX = comet.x - Math.cos(comet.angle) * 90;
      const tailY = comet.y - Math.sin(comet.angle) * 90;
      const gradient = context.createLinearGradient(comet.x, comet.y, tailX, tailY);
      gradient.addColorStop(0, 'rgba(255, 220, 160, 0.9)');
      gradient.addColorStop(1, 'rgba(255, 157, 92, 0)');
      context.strokeStyle = gradient;
      context.lineWidth = 5;
      context.beginPath();
      context.moveTo(comet.x, comet.y);
      context.lineTo(tailX, tailY);
      context.stroke();
      glowCircle(comet.x, comet.y, 26, 'rgba(255, 190, 110, 0.7)', 1);
      context.fillStyle = '#fff3d6';
      context.beginPath();
      context.arc(comet.x, comet.y, 7, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawParticles(state) {
    for (const particle of state.particles) {
      context.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      context.fillStyle = particle.color;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function drawPlayer(state) {
    const player = state.player;
    if (player.invulnerable > 0 && Math.floor(player.invulnerable * 10) % 2 === 0) return;
    const flicker = 1 + 0.12 * Math.sin(state.elapsed * 11) + 0.06 * Math.sin(state.elapsed * 23);
    glowCircle(player.x, player.y, 64 * flicker, 'rgba(255, 190, 90, 0.4)', 1);
    glowCircle(player.x, player.y, 30, 'rgba(127, 231, 255, 0.5)', 1);
    // The lantern: a warm core with a little flame on top.
    context.fillStyle = PALETTE.playerCore;
    context.beginPath();
    context.arc(player.x, player.y, 11, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = PALETTE.player;
    context.lineWidth = 2.5;
    context.beginPath();
    context.arc(player.x, player.y, 15, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = PALETTE.flame;
    context.beginPath();
    context.moveTo(player.x, player.y - 26 * flicker);
    context.quadraticCurveTo(player.x + 6, player.y - 16, player.x, player.y - 12);
    context.quadraticCurveTo(player.x - 6, player.y - 16, player.x, player.y - 26 * flicker);
    context.fill();
    if (player.shield) {
      context.strokeStyle = PALETTE.shield;
      context.lineWidth = 2.5;
      context.beginPath();
      context.arc(player.x, player.y, 24 + 2 * Math.sin(state.elapsed * 4), 0, Math.PI * 2);
      context.stroke();
    }
  }

  function drawHud(state) {
    context.textBaseline = 'top';
    text(scoreLabel(state.score), 24, 18, 28, PALETTE.text, 'left');
    text(bestLabel(state.best ?? 0), 24, 50, 16, PALETTE.muted, 'left');
    const definition = CONSTELLATIONS[Math.min(state.constellation, CONSTELLATION_COUNT - 1)];
    const progress = state.won
      ? 'All constellations shine again'
      : `${definition.name}  ·  ${state.starsGot}/${state.stars.length} stars  ·  ${state.constellation + 1}/${CONSTELLATION_COUNT}`;
    text(progress, FIELD.width / 2, 18, 22, PALETTE.gold, 'center');
    // Lives as little flames, top right.
    for (let life = 0; life < LIVES; life += 1) {
      const x = FIELD.width - 28 - life * 30;
      if (life < state.lives) {
        context.fillStyle = PALETTE.flame;
        context.beginPath();
        context.moveTo(x, 18);
        context.quadraticCurveTo(x + 7, 28, x, 34);
        context.quadraticCurveTo(x - 7, 28, x, 18);
        context.fill();
      } else {
        context.strokeStyle = PALETTE.muted;
        context.lineWidth = 2;
        context.beginPath();
        context.arc(x, 26, 7, 0, Math.PI * 2);
        context.stroke();
      }
    }
    // Combo and active power-ups under the score.
    let badgeY = 78;
    if (state.multiplier > 1) {
      text(`Combo x${state.multiplier}`, 24, badgeY, 20, PALETTE.gold, 'left');
      badgeY += 26;
    }
    if (state.emberTimer > 0) {
      text(`Ember x2  ${Math.ceil(state.emberTimer)}s`, 24, badgeY, 18, PALETTE.ember, 'left');
      badgeY += 24;
    }
    if (state.frostTimer > 0) {
      text(`Frost  ${Math.ceil(state.frostTimer)}s`, 24, badgeY, 18, PALETTE.frost, 'left');
      badgeY += 24;
    }
    if (state.player.shield) {
      text('Shield ready', 24, badgeY, 18, PALETTE.shield, 'left');
    }
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 76, 46, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 20, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 22, PALETTE.gold, 'center');
  }

  const TITLE_LINES = [
    'Relight the six lost constellations.',
    'Steer with the mouse or arrow keys / WASD.',
    'Collect the numbered stars in order — dodge the wisps and comets.',
    'Shield eats one hit. Ember doubles points. Frost slows the wisps.',
    '',
  ];
  const PAUSED_LINES = ['The wisps will wait for you.'];
  const OVER_LINES = ['', '', ''];
  const WIN_LINES = ['', '', ''];

  /** Paint one frame: the sky, the game, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawSky(state);
    drawLines(state);
    drawStars(state, screen);
    drawMotes(state);
    drawPowerups(state);
    drawWisps(state);
    drawComets(state);
    drawParticles(state);
    if (screen !== SCREEN_TITLE) drawPlayer(state);
    if (state.flash > 0) {
      context.fillStyle = `rgba(255, 215, 106, ${(state.flash * 0.22).toFixed(3)})`;
      context.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[4] = bestLabel(best);
      drawPanel('Star Shepherd', TITLE_LINES, 'Press Space or click to start  ·  M mutes sound');
      return;
    }
    drawHud({ ...state, best });
    if (screen === SCREEN_PAUSED) drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(state.score);
      OVER_LINES[1] = bestLabel(best);
      OVER_LINES[2] = `${state.constellationsDone} of ${CONSTELLATION_COUNT} constellations lit  ·  ${state.starsCollected} stars gathered`;
      drawPanel('The light went out', OVER_LINES, 'Press Space or click to try again');
    } else if (screen === SCREEN_WIN) {
      WIN_LINES[0] = finalLabel(state.score);
      WIN_LINES[1] = bestLabel(best);
      WIN_LINES[2] = `All ${CONSTELLATION_COUNT} constellations shine again  ·  ${state.starsCollected} stars gathered`;
      drawPanel('Every star shines again', WIN_LINES, 'Press Space or click to play again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return {
    draw,
    /** Convert a client (page) point to logical field pixels. */
    toField(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left - view.x) / view.scale,
        y: (clientY - rect.top - view.y) / view.scale,
      };
    },
  };
}
