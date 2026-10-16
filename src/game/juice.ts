export type Particle = {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: "spark" | "smoke" | "ring" | "debris" | "muzzle" | "bolt";
  /** Koncový bod pro kind "bolt" (blesk mezi dvěma body). */
  x2: number;
  y2: number;
};

export type Floater = {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  life: number;
  text: string;
  color: string;
  crit: boolean;
};

export function makePool<T>(n: number, factory: () => T): T[] {
  const a: T[] = [];
  for (let i = 0; i < n; i++) a.push(factory());
  return a;
}

export function alloc<T extends { active: boolean }>(pool: T[]): T | null {
  for (let i = 0; i < pool.length; i++) {
    if (!pool[i]!.active) return pool[i]!;
  }
  return null;
}

export function spawnParticle(
  pool: Particle[],
  x: number,
  y: number,
  color: string,
  kind: Particle["kind"] = "spark",
) {
  const p = alloc(pool);
  if (!p) return;
  const a = Math.random() * Math.PI * 2;
  const s = kind === "smoke" ? 20 + Math.random() * 40 : 60 + Math.random() * 220;
  p.active = true;
  p.x = x;
  p.y = y;
  p.vx = Math.cos(a) * s;
  p.vy = Math.sin(a) * s;
  p.life = kind === "ring" ? 0.28 : kind === "muzzle" ? 0.06 : 0.28 + Math.random() * 0.35;
  p.max = p.life;
  p.size = kind === "ring" ? 8 : kind === "muzzle" ? 10 : 2 + Math.random() * 3.5;
  p.color = color;
  p.kind = kind;
}

/** Blesk mezi dvěma body (schopnost Lightning, chain) — krátký život, nehýbe se. */
export function spawnBolt(
  pool: Particle[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 2.5,
) {
  const p = alloc(pool);
  if (!p) return;
  p.active = true;
  p.x = x1;
  p.y = y1;
  p.x2 = x2;
  p.y2 = y2;
  p.vx = 0;
  p.vy = 0;
  p.life = 0.22;
  p.max = 0.22;
  p.size = width;
  p.color = color;
  p.kind = "bolt";
}

export function burst(
  pool: Particle[],
  x: number,
  y: number,
  color: string,
  n: number,
  kind: Particle["kind"] = "spark",
) {
  for (let i = 0; i < n; i++) spawnParticle(pool, x, y, color, kind);
}

export function spawnFloater(pool: Floater[], x: number, y: number, text: string, color: string, crit = false) {
  const f = alloc(pool);
  if (!f) return;
  f.active = true;
  f.x = x + (Math.random() - 0.5) * 12;
  f.y = y;
  f.vy = crit ? -70 : -52;
  f.life = crit ? 0.85 : 0.6;
  f.text = text;
  f.color = color;
  f.crit = crit;
}

export function updateJuice(particles: Particle[], floats: Floater[], dt: number) {
  for (const p of particles) {
    if (!p.active) continue;
    p.life -= dt;
    if (p.life <= 0) {
      p.active = false;
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.92;
    p.vy *= 0.92;
    if (p.kind === "smoke") p.size += 18 * dt;
    if (p.kind === "ring") p.size += 90 * dt;
  }
  for (const f of floats) {
    if (!f.active) continue;
    f.life -= dt;
    if (f.life <= 0) {
      f.active = false;
      continue;
    }
    f.y += f.vy * dt;
    f.vy *= 0.94;
  }
}
