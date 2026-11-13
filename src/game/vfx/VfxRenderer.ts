import { Application, Container, Graphics } from "pixi.js";
import type { Run } from "../sim";

/** GPU VFX pass. Reads the simulation particle pool without changing gameplay state. */
export class VfxRenderer {
  private app: Application | null = null;
  private world = new Container();
  private graphics = new Graphics();
  private ready = false;
  private disposed = false;

  async mount(host: HTMLElement, width: number, height: number): Promise<void> {
    const app = new Application();
    await app.init({
      width: Math.max(1, width),
      height: Math.max(1, height),
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoStart: false,
      preference: "webgl",
    });
    if (this.disposed) {
      app.destroy(true);
      return;
    }
    this.app = app;
    this.world.addChild(this.graphics);
    app.stage.addChild(this.world);
    const canvas = app.canvas;
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1";
    canvas.setAttribute("aria-hidden", "true");
    host.insertBefore(canvas, host.children[1] ?? null);
    this.ready = true;
  }

  resize(width: number, height: number): void {
    if (this.ready && this.app) this.app.renderer.resize(Math.max(1, width), Math.max(1, height));
  }

  render(run: Run, width: number, height: number): void {
    if (!this.ready || !this.app) return;
    const g = this.graphics;
    g.clear();
    this.world.position.set(
      width / 2 + run.shakeX - run.cam.x * run.zoom,
      height / 2 + run.shakeY - run.cam.y * run.zoom,
    );
    this.world.scale.set(run.zoom);

    for (const p of run.particles) {
      if (!p.active) continue;
      const alpha = Math.max(0, Math.min(1, p.life / Math.max(0.001, p.max)));
      if (p.kind === "ring") {
        g.circle(p.x, p.y, Math.max(1, p.size))
          .stroke({ color: p.color, width: Math.max(1.2, p.size * 0.075), alpha: alpha * 0.72 });
        g.circle(p.x, p.y, Math.max(1, p.size * 0.68))
          .stroke({ color: p.color, width: 1, alpha: alpha * 0.24 });
      } else if (p.kind === "bolt") {
        const mx = (p.x + p.x2) * 0.5;
        const my = (p.y + p.y2) * 0.5;
        const dx = p.x2 - p.x;
        const dy = p.y2 - p.y;
        const len = Math.max(1, Math.hypot(dx, dy));
        const offset = Math.min(13, len * 0.08) * Math.sin((p.x + p.y + p.life * 90) * 0.08);
        const px = -dy / len * offset;
        const py = dx / len * offset;
        g.moveTo(p.x, p.y).lineTo(mx + px, my + py).lineTo(p.x2, p.y2)
          .stroke({ color: p.color, width: p.size + 3, alpha: alpha * 0.18 });
        g.moveTo(p.x, p.y).lineTo(mx + px, my + py).lineTo(p.x2, p.y2)
          .stroke({ color: p.color, width: Math.max(1, p.size), alpha: alpha * 0.92 });
      } else if (p.kind === "spark" || p.kind === "muzzle") {
        const radius = Math.max(0.8, p.size * (p.kind === "muzzle" ? 1.65 : 1.15));
        g.circle(p.x, p.y, radius * 2.8).fill({ color: p.color, alpha: alpha * 0.12 });
        g.circle(p.x, p.y, radius).fill({ color: p.color, alpha: alpha * 0.82 });
      } else if (p.kind === "smoke") {
        g.circle(p.x, p.y, Math.max(1, p.size * 1.25))
          .fill({ color: p.color, alpha: alpha * 0.1 });
      }
    }
    this.app.render();
  }

  destroy(): void {
    this.disposed = true;
    this.ready = false;
    if (this.app) {
      this.app.destroy(true, { children: true });
      this.app = null;
    }
  }
}
