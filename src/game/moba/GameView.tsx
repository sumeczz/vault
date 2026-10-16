import { useEffect, useRef, useCallback } from "react";
import { createInitialState, updateGame, type InputState } from "./engine";
import { render } from "./render";
import { MobaHud } from "./MobaHud";
import type { GameState } from "./types";

const FIXED_DT = 1 / 60;
const MAX_FRAME_TIME = 0.1;

export function MobaGameView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const inputRef = useRef<InputState>({ up: false, down: false, left: false, right: false, ability1: false, ability2: false, ability3: false });
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  useEffect(() => {
    const keyMap: Record<string, keyof InputState> = {
      KeyW: "up",
      ArrowUp: "up",
      KeyS: "down",
      ArrowDown: "down",
      KeyA: "left",
      ArrowLeft: "left",
      KeyD: "right",
      ArrowRight: "right",
      Digit1: "ability1",
      Digit2: "ability2",
      Digit3: "ability3",
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const action = keyMap[e.code];
      if (action) {
        inputRef.current[action] = true;
        e.preventDefault();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const action = keyMap[e.code];
      if (action) {
        inputRef.current[action] = false;
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    (window as unknown as { __MOBA_STATE__: GameState }).__MOBA_STATE__ = stateRef.current;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      const frameTime = Math.min((now - lastTimeRef.current) / 1000, MAX_FRAME_TIME);
      lastTimeRef.current = now;
      accumulatorRef.current += frameTime;

      while (accumulatorRef.current >= FIXED_DT) {
        updateGame(stateRef.current, inputRef.current, FIXED_DT);
        accumulatorRef.current -= FIXED_DT;
      }

      const rect = canvas.getBoundingClientRect();
      render(ctx, stateRef.current, rect.width, rect.height);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0a0a0b]">
      <canvas ref={canvasRef} className="block h-full w-full" />
      <MobaHud state={stateRef.current} />
      <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 rounded-lg bg-black/60 px-3 py-1 text-xs text-white/60">
        WASD pohyb · 1/2/3 moduly · 2 moduly do 1.5s = combo
      </div>
    </div>
  );
}
