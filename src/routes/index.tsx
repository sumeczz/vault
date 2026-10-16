import { createFileRoute, Link } from "@tanstack/react-router";
import { GameView } from "@/game/GameView";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <div className="relative h-full">
      <GameView />
      <div className="absolute top-4 right-4 z-10">
        <Link
          to="/moba"
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-fg)] transition-colors hover:border-[var(--color-accent)]"
        >
          Nexus Arena (MOBA) →
        </Link>
      </div>
    </div>
  );
}
