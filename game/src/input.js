// Keyboard and pointer input. The lantern steers toward a point: the mouse pointer when the
// mouse is used, or a point ahead of the lantern in the held key's direction. One-shot
// presses (start or restart, pause, mute) are queued as bit flags and taken once by the loop,
// so a press between two frames is never lost and never counted twice.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);

/** How far ahead of the lantern a held key points it, in logical pixels. */
const KEY_LEAD = 260;

export function createInput(canvas, toField) {
  let left = false;
  let right = false;
  let up = false;
  let down = false;
  let actions = 0;
  let pointer = null;
  let pointerUsed = false;

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    left = false;
    right = false;
    up = false;
    down = false;
  });
  canvas.addEventListener('pointermove', (event) => {
    pointer = toField(event.clientX, event.clientY);
    pointerUsed = true;
  });
  canvas.addEventListener('pointerdown', (event) => {
    pointer = toField(event.clientX, event.clientY);
    pointerUsed = true;
    actions |= ACTION_CONFIRM;
  });

  return {
    /**
     * The point the lantern steers toward, in logical field pixels: a point ahead in
     * the held keys' direction while a key is held (keys win while they are down),
     * else the pointer when the mouse was used, else null (stay).
     */
    target(playerX, playerY) {
      const dx = (right ? 1 : 0) - (left ? 1 : 0);
      const dy = (down ? 1 : 0) - (up ? 1 : 0);
      if (dx !== 0 || dy !== 0) {
        const length = Math.hypot(dx, dy);
        return { x: playerX + (dx / length) * KEY_LEAD, y: playerY + (dy / length) * KEY_LEAD };
      }
      if (pointerUsed && pointer !== null) return pointer;
      return null;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
