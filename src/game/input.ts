export type Actions = {
  moveX: number;
  moveY: number;
  aimStickX: number;
  aimStickY: number;
  useStickAim: boolean;
  mouseScreenX: number;
  mouseScreenY: number;
  mouseInside: boolean;
  fire: boolean;
  justDash: boolean;
  justAbility: boolean;
  justSwap: boolean;
  justPause: boolean;
  justStats: boolean;
  justCharacter: boolean;
};

const keys = new Set<string>();
let injected: string[] | null = null;
let prevDash = false;
let prevAbility = false;
let prevSwap = false;
let prevPause = false;
let prevStats = false;
let prevCharacter = false;

let touchMove = { x: 0, y: 0, active: false };
let touchAim = { x: 0, y: 0, active: false };
let mouse = { x: 0, y: 0, down: false, inside: false };
let dashTap = false;
let abilityTap = false;
let swapTap = false;

const GAME_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowLeft",
  "ArrowDown",
  "ArrowRight",
  "Space",
  "ShiftLeft",
  "ShiftRight",
  "KeyF",
  "KeyQ",
  "KeyE",
  "Digit1",
  "Digit2",
  "Escape",
  "KeyP",
  "KeyT",
  "KeyC",
]);

function held(): Set<string> {
  if (injected) return new Set(injected);
  return keys;
}

export function bindInput(target: HTMLElement): () => void {
  const onDown = (e: KeyboardEvent) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    keys.add(e.code);
  };
  const onUp = (e: KeyboardEvent) => {
    keys.delete(e.code);
  };
  const onBlur = () => keys.clear();
  const onVis = () => {
    if (document.hidden) keys.clear();
  };
  const onPointer = (e: PointerEvent) => {
    const rect = target.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.inside = true;
    if (e.buttons & 1) mouse.down = true;
  };
  const onDownP = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button === 0) mouse.down = true;
    onPointer(e);
  };
  const onUpP = (e: PointerEvent) => {
    if (e.pointerType === "mouse") mouse.down = false;
    onPointer(e);
  };
  const onLeave = () => {
    mouse.inside = false;
    mouse.down = false;
  };

  window.addEventListener("keydown", onDown);
  window.addEventListener("keyup", onUp);
  window.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", onVis);
  target.addEventListener("pointermove", onPointer);
  target.addEventListener("pointerdown", onDownP);
  window.addEventListener("pointerup", onUpP);
  target.addEventListener("pointerleave", onLeave);

  return () => {
    window.removeEventListener("keydown", onDown);
    window.removeEventListener("keyup", onUp);
    window.removeEventListener("blur", onBlur);
    document.removeEventListener("visibilitychange", onVis);
    target.removeEventListener("pointermove", onPointer);
    target.removeEventListener("pointerdown", onDownP);
    window.removeEventListener("pointerup", onUpP);
    target.removeEventListener("pointerleave", onLeave);
  };
}

export function setInjectedKeys(codes: string[]): void {
  injected = codes;
}

export function clearInjectedKeys(): void {
  injected = null;
}

export function setTouchMove(x: number, y: number, active: boolean): void {
  touchMove = { x, y, active };
}

export function setTouchAim(x: number, y: number, active: boolean): void {
  touchAim = { x, y, active };
}

export function tapDash(): void {
  dashTap = true;
}
export function tapAbility(): void {
  abilityTap = true;
}
export function tapSwap(): void {
  swapTap = true;
}

function radial(x: number, y: number, dz = 0.18): { x: number; y: number } {
  const m = Math.hypot(x, y);
  if (m < dz) return { x: 0, y: 0 };
  const scale = ((m - dz) / (1 - dz)) / m;
  return { x: x * scale, y: y * scale };
}

export function sampleInput(): Actions {
  const k = held();
  let moveX = 0;
  let moveY = 0;
  if (k.has("KeyA") || k.has("ArrowLeft")) moveX -= 1;
  if (k.has("KeyD") || k.has("ArrowRight")) moveX += 1;
  if (k.has("KeyW") || k.has("ArrowUp")) moveY -= 1;
  if (k.has("KeyS") || k.has("ArrowDown")) moveY += 1;

  const pads = typeof navigator !== "undefined" ? navigator.getGamepads?.() ?? [] : [];
  for (const pad of pads) {
    if (!pad) continue;
    const ls = radial(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
    if (Math.hypot(ls.x, ls.y) > 0.01) {
      moveX = ls.x;
      moveY = ls.y;
    }
  }

  if (touchMove.active) {
    moveX = touchMove.x;
    moveY = touchMove.y;
  }

  const len = Math.hypot(moveX, moveY);
  if (len > 1) {
    moveX /= len;
    moveY /= len;
  }

  let aimStickX = 0;
  let aimStickY = 0;
  let useStickAim = false;
  if (touchAim.active) {
    aimStickX = touchAim.x;
    aimStickY = touchAim.y;
    useStickAim = Math.hypot(aimStickX, aimStickY) > 0.2;
  }
  for (const pad of pads) {
    if (!pad) continue;
    const rs = radial(pad.axes[2] ?? 0, pad.axes[3] ?? 0, 0.22);
    if (Math.hypot(rs.x, rs.y) > 0.01) {
      aimStickX = rs.x;
      aimStickY = rs.y;
      useStickAim = true;
    }
  }

  const dashHeld = k.has("Space") || dashTap;
  const abilityHeld = k.has("KeyF") || k.has("ShiftLeft") || k.has("ShiftRight") || abilityTap;
  const swapHeld = k.has("KeyQ") || k.has("KeyE") || k.has("Digit1") || k.has("Digit2") || swapTap;
  const pauseHeld = k.has("Escape") || k.has("KeyP");
  const statsHeld = k.has("KeyT");
  const characterHeld = k.has("KeyC");

  let fire = mouse.down || (useStickAim && touchAim.active);
  for (const pad of pads) {
    if (!pad) continue;
    if (pad.buttons[7]?.pressed || pad.buttons[0]?.pressed) fire = true;
    if (pad.buttons[2]?.pressed) {
      /* ability analog */
    }
    if (useStickAim && Math.hypot(aimStickX, aimStickY) > 0.35) fire = true;
  }

  const justDash = dashHeld && !prevDash;
  const justAbility = abilityHeld && !prevAbility;
  const justSwap = swapHeld && !prevSwap;
  const justPause = pauseHeld && !prevPause;
  const justStats = statsHeld && !prevStats;
  const justCharacter = characterHeld && !prevCharacter;
  prevDash = dashHeld;
  prevAbility = abilityHeld;
  prevSwap = swapHeld;
  prevPause = pauseHeld;
  prevStats = statsHeld;
  prevCharacter = characterHeld;
  dashTap = false;
  abilityTap = false;
  swapTap = false;

  return {
    moveX,
    moveY,
    aimStickX,
    aimStickY,
    useStickAim,
    mouseScreenX: mouse.x,
    mouseScreenY: mouse.y,
    mouseInside: mouse.inside,
    fire,
    justDash,
    justAbility,
    justSwap,
    justPause,
    justStats,
    justCharacter,
  };
}

export function getInjected(): string[] | null {
  return injected;
}
