import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { MUTATORS, WHEEL_SPIN_MS, rollMutators } from "./mutators";
import { sfxPlay } from "./audio";

const SIZE = 300;
const TURNS = 6;
const END_OFFSET = 0.37;

function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5);
}

function drawWheel(ctx: CanvasRenderingContext2D, angle: number, highlight: boolean) {
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const r = SIZE / 2 - 6;
  const seg = (Math.PI * 2) / MUTATORS.length;
  ctx.clearRect(0, 0, SIZE, SIZE);
  for (let i = 0; i < MUTATORS.length; i++) {
    const m = MUTATORS[i]!;
    const a0 = angle + i * seg;
    const a1 = a0 + seg;
    const base = m.polarity === "plus" ? "#5ea38a" : "#c45c3e";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, a0, a1);
    ctx.closePath();
    ctx.fillStyle = base;
    ctx.globalAlpha = i % 2 === 0 ? 0.85 : 0.6;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(10,10,11,0.8)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // Střed
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, Math.PI * 2);
  ctx.fillStyle = "#141416";
  ctx.fill();
  ctx.strokeStyle = highlight ? "#d6dde4" : "#2a2a30";
  ctx.lineWidth = highlight ? 3 : 2;
  ctx.stroke();
  ctx.fillStyle = highlight ? "#d6dde4" : "#71717a";
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(highlight ? "★" : "?", cx, cy + 1);
  // Ukazatel nahoře
  ctx.beginPath();
  ctx.moveTo(cx - 9, 2);
  ctx.lineTo(cx + 9, 2);
  ctx.lineTo(cx, 20);
  ctx.closePath();
  ctx.fillStyle = "#f4f4f5";
  ctx.fill();
}

export function WheelPopup({
  seed,
  sectorIdx,
  sectorLabel,
  actionLabel,
  onDone,
}: {
  seed: string;
  sectorIdx: number;
  sectorLabel: string;
  actionLabel: string;
  onDone: () => void;
}) {
  const rolled = useMemo(() => rollMutators(seed, sectorIdx), [seed, sectorIdx]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const rafRef = useRef(0);
  const doneRef = useRef(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    doneRef.current = false;
    setFinished(false);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) {
      setFinished(true);
      return;
    }
    const reduced =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced ? 500 : WHEEL_SPIN_MS;
    const total = Math.PI * 2 * (TURNS + END_OFFSET);
    const seg = (Math.PI * 2) / MUTATORS.length;
    const start = performance.now();
    let lastSegIdx = -1;
    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      drawWheel(ctx, total, true);
      sfxPlay.sectorClear();
      setFinished(true);
    };
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const angle = total * easeOutQuint(t);
      drawWheel(ctx, angle, false);
      // Tik při průchodu hranice segmentu pod ukazatelem.
      const idx = Math.floor(((-Math.PI / 2 - angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) / seg);
      if (idx !== lastSegIdx) {
        lastSegIdx = idx;
        if (t < 1) sfxPlay.wheelTick();
      }
      if (t < 1) rafRef.current = requestAnimationFrame(frame);
      else finish();
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafRef.current);
      doneRef.current = true;
    };
  }, [seed, sectorIdx]);

  // Po dokončení losu dej focus na akční tlačítko (keyboard audit).
  useEffect(() => {
    if (finished) actionRef.current?.focus();
  }, [finished]);

  return (
    <div className="absolute inset-0 flex items-end justify-center overflow-y-auto bg-bg/85 p-4 sm:items-center">
      <div className="vb-dialog vb-enter w-full max-w-sm p-5 text-center sm:p-6">
        <p className="font-mono text-[11px] tracking-[0.25em] text-ice">KOLO ŠTĚSTÍ · {sectorLabel}</p>
        <h2 className="mt-1 font-display text-2xl font-semibold">Losování mutátorů</h2>
        <div className="mx-auto mt-4 w-full max-w-[300px]">
          <canvas ref={canvasRef} width={SIZE} height={SIZE} className="h-auto w-full" aria-hidden="true" />
        </div>
        <div className="mt-3 min-h-[76px]">
          {finished ? (
            <ul className="space-y-1.5">
              {rolled.map((m, i) => (
                <li
                  key={m.id}
                  className="vb-stagger flex items-baseline justify-between gap-2 text-sm"
                  style={{ "--vb-i": i } as CSSProperties}
                >
                  <span className={m.polarity === "plus" ? "text-rarity-uncommon" : "text-danger"}>
                    {m.polarity === "plus" ? "+" : "−"} {m.name}
                  </span>
                  <span className="shrink-0 text-xs text-muted">{m.desc}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="vb-pulse-soft text-sm text-muted">Kolo se točí…</p>
          )}
        </div>
        <div className="mt-4 flex flex-col gap-2">
          {finished ? (
            <button ref={actionRef} type="button" onClick={onDone} className="vb-btn-primary w-full">
              {actionLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                cancelAnimationFrame(rafRef.current);
                const canvas = canvasRef.current;
                const ctx = canvas?.getContext("2d");
                if (ctx) drawWheel(ctx, Math.PI * 2 * (TURNS + END_OFFSET), true);
                if (!doneRef.current) {
                  doneRef.current = true;
                  sfxPlay.sectorClear();
                  setFinished(true);
                }
              }}
              className="vb-btn-ghost w-full text-muted"
            >
              Přeskočit
            </button>
          )}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-subtle">
          Stejný seed + sektor = stejné mutátory. Platí pro {sectorLabel}.
        </p>
      </div>
    </div>
  );
}
