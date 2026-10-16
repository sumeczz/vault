import type { GameState } from "./types";

interface MobaHudProps {
  state: GameState;
}

export function MobaHud({ state }: MobaHudProps) {
  const { player } = state;
  const hpPct = player.hp / player.maxHp;
  const energyPct = player.energy / player.maxEnergy;
  const xpPct = player.xp / player.xpToNext;

  return (
    <>
      <div className="pointer-events-none absolute top-4 left-4 flex flex-col gap-2">
        <div className="rounded-lg bg-black/70 px-3 py-2 backdrop-blur-sm">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-medium text-white/70">Lv.{player.level}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#4a9eff] transition-all duration-200"
                style={{ width: `${xpPct * 100}%` }}
              />
            </div>
          </div>
          <div className="mb-1 h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#5ea38a] transition-all duration-200"
              style={{ width: `${hpPct * 100}%` }}
            />
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#ffd700] transition-all duration-200"
              style={{ width: `${energyPct * 100}%` }}
            />
          </div>
        </div>
        <div className="flex gap-1">
          {(["1", "2", "3"] as const).map((key) => (
            <div
              key={key}
              className="flex h-8 w-8 items-center justify-center rounded border border-white/20 bg-black/60 text-xs font-bold text-white/80"
            >
              {key}
            </div>
          ))}
        </div>
        {state.comboActive && (
          <div className="animate-pulse rounded bg-[#ffd700]/20 px-2 py-1 text-xs font-bold text-[#ffd700]">
            COMBO!
          </div>
        )}
        {state.shieldActive && (
          <div className="rounded bg-[#5ea38a]/20 px-2 py-1 text-xs font-bold text-[#5ea38a]">
            ŠTÍT
          </div>
        )}
      </div>

      <Minimap state={state} />

      {state.gameOver && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="mb-2 text-4xl font-bold text-white">
              {state.winner === "blue" ? "VÍTĚZSTVÍ" : "PORÁŽKA"}
            </div>
            <div className="text-lg text-white/60">
              {state.winner === "blue" ? "Nexus nepřítele zničen!" : "Tvůj Nexus byl zničen"}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 rounded-lg bg-[#4a9eff] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#2d6bcc]"
            >
              Hrát znovu
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Minimap({ state }: MobaHudProps) {
  const mapSize = 120;
  const scale = mapSize / 2560;

  const dot = (x: number, y: number, color: string, size = 3) => (
    <div
      className="absolute rounded-full"
      style={{
        left: x * scale - size / 2,
        top: y * scale - size / 2,
        width: size,
        height: size,
        backgroundColor: color,
      }}
    />
  );

  return (
    <div className="pointer-events-none absolute right-4 bottom-4 overflow-hidden rounded-lg border border-white/20 bg-black/70">
      <div className="relative" style={{ width: mapSize, height: mapSize }}>
        <div className="absolute inset-0 bg-[#1a2e1a]" />
        <div
          className="absolute bg-[#3d5c3d]"
          style={{
            left: 350 * scale - 2,
            top: 350 * scale - 2,
            width: 1860 * scale + 4,
            height: 1860 * scale + 4,
            transform: "rotate(45deg)",
            transformOrigin: "center",
            opacity: 0.5,
          }}
        />
        {dot(350, 2210, "#4a9eff", 6)}
        {dot(2210, 350, "#ff4a4a", 6)}
        {state.turrets.map((t) =>
          t.alive ? (
            <div key={t.id}>
              {dot(t.pos.x, t.pos.y, t.team === "blue" ? "#4a9eff" : "#ff4a4a")}
            </div>
          ) : null,
        )}
        {state.minions.map((m) =>
          m.alive ? (
            <div key={m.id}>
              {dot(m.pos.x, m.pos.y, m.team === "blue" ? "#6bb3ff" : "#ff6b6b", 2)}
            </div>
          ) : null,
        )}
        {state.player.alive && dot(state.player.pos.x, state.player.pos.y, "#ffffff", 4)}
      </div>
    </div>
  );
}
