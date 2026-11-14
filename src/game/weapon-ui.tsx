import type { Weapon } from "./types";
import { dpsEstimate, weaponBehaviorsList } from "./weapons";
import { ARCHETYPE_LABEL, RARITY_COLOR, RARITY_LABEL } from "./types";
import { WeaponIcon } from "./ui-icons";
import { Badge } from "@/components/ui";
import type { CSSProperties } from "react";

type WeaponPanelProps = {
  weapon: Weapon;
  title?: string;
  subtitle?: string;
  density?: "compact" | "normal";
  showBehaviors?: boolean;
};

export function WeaponStatGrid({ weapon, density = "normal" }: { weapon: Weapon; density?: "compact" | "normal" }) {
  const stats = [
    ["DMG", weapon.stats.damage.toFixed(1)], ["DPS", dpsEstimate(weapon).toFixed(1)], ["RPM", weapon.stats.rpm.toFixed(0)],
    ["ZÁSOBNÍK", weapon.stats.magSize.toFixed(0)], ["PŘEBITÍ", `${weapon.stats.reload.toFixed(2)} s`], ["KRIT", `${(weapon.stats.critChance * 100).toFixed(0)} %`],
  ];
  return <div className={`grid grid-cols-3 gap-1.5 ${density === "compact" ? "text-[10px]" : "text-xs"}`}>
    {stats.map(([label, value]) => <div key={label} className="rounded-md border border-border/70 bg-elevated px-1.5 py-1.5 text-center"><span className="block font-mono text-[9px] tracking-wider text-subtle">{label}</span><span className="mt-0.5 block font-mono font-semibold tabular-nums text-fg">{value}</span></div>)}
  </div>;
}

export function WeaponPanel({ weapon, title, subtitle, density = "normal", showBehaviors = false }: WeaponPanelProps) {
  const compact = density === "compact";
  const behaviors = weaponBehaviorsList(weapon);
  return (
    <section className={compact ? "rounded-lg border border-border bg-surface p-2.5" : "rounded-xl border border-border bg-elevated p-3"}>
      <div className="flex min-w-0 items-center gap-2">
        <span className={`flex shrink-0 items-center justify-center rounded-lg border border-border bg-elevated ${compact ? "size-9" : "size-11"}`} style={{ color: weapon.colors.accent }}>
          <WeaponIcon archetype={weapon.archetype} className={compact ? "size-5" : "size-6"} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <Badge tone="rarity" dot style={{ "--vb-rarity-color": RARITY_COLOR[weapon.rarity] } as CSSProperties}>{RARITY_LABEL[weapon.rarity]}</Badge>
            {weapon.unique ? <Badge tone="neutral">UNIKÁT</Badge> : null}
          </span>
          <strong className="mt-0.5 block truncate text-sm font-semibold text-fg">{title ?? weapon.name}</strong>
          <span className="block truncate text-[11px] text-muted">{subtitle ?? `${ARCHETYPE_LABEL[weapon.archetype].name} · ${weapon.element}`}</span>
        </span>
      </div>
      <div className="mt-2"><WeaponStatGrid weapon={weapon} density={density} /></div>
      {showBehaviors && behaviors.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {behaviors.slice(0, 4).map((behavior) => <span key={behavior} className="rounded-md border border-border bg-elevated px-1.5 py-1 text-[10px] text-subtle">{behavior}</span>)}
        </div>
      ) : null}
    </section>
  );
}
