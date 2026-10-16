import { createFileRoute } from "@tanstack/react-router";
import { MobaGameView } from "@/game/moba/GameView";

export const Route = createFileRoute("/moba")({
  component: MobaPage,
});

function MobaPage() {
  return <MobaGameView />;
}
