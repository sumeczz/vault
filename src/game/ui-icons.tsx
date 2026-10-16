import {
  Anchor,
  Atom,
  Bomb,
  Bot,
  Bug,
  CircleDot,
  Crosshair,
  Dna,
  Eye,
  Flame,
  Gauge,
  HeartPulse,
  Orbit,
  Radio,
  Radar,
  Rocket,
  ScanLine,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Target,
  Waves,
  Wind,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { ArchetypeId, Element, EnemyKind } from "./types";
import type { CharacterTalentId } from "./characters";

const WEAPON_ICONS: Record<ArchetypeId, LucideIcon> = {
  pistol: Crosshair,
  smg: Radio,
  shotgun: CircleDot,
  rifle: Target,
  sniper: ScanLine,
  launcher: Rocket,
  beam: Zap,
  flamer: Flame,
  bouncer: Orbit,
  minigun: Gauge,
  rail: Crosshair,
  helix: Atom,
  mortar: Bomb,
  arc: Waves,
  swarm: Dna,
  harpoon: Anchor,
};

const ENEMY_ICONS: Record<EnemyKind, LucideIcon> = {
  grunt: Swords,
  rusher: Wind,
  shooter: Crosshair,
  tank: Shield,
  splitter: CircleDot,
  bomber: Bomb,
  sniper: ScanLine,
  lezec: Bug,
  drtic: Wrench,
  stin: Eye,
  stopar: Radar,
  des: Skull,
  cepel: Swords,
  nosorozec: Shield,
  kopi: Target,
  kanonyr: Rocket,
  ostrostrelec: Crosshair,
  jiskra: Zap,
  vrhac: Flame,
  gardista: Shield,
  srsen: Bug,
  spravce: Bot,
  tekavka: Wind,
  bourak: Bomb,
  roztoc: Orbit,
  medik: HeartPulse,
  matka: Dna,
  boss: Skull,
};

const TALENT_ICONS: Record<CharacterTalentId, LucideIcon> = {
  vitality: HeartPulse,
  ballistics: Crosshair,
  scavenging: Sparkles,
};

const ELEMENT_ICONS: Record<Element, LucideIcon> = {
  kinetic: CircleDot,
  fire: Flame,
  ice: Waves,
  shock: Zap,
  void: Orbit,
  toxic: Dna,
};

export function WeaponIcon({
  archetype,
  className = "size-5",
}: {
  archetype: ArchetypeId;
  className?: string;
}) {
  const Icon = WEAPON_ICONS[archetype];
  return <Icon className={className} aria-hidden="true" />;
}

export function EnemyIcon({
  kind,
  className = "size-4",
}: {
  kind: EnemyKind;
  className?: string;
}) {
  const Icon = ENEMY_ICONS[kind];
  return <Icon className={className} aria-hidden="true" />;
}

export function TalentIcon({
  talent,
  className = "size-5",
}: {
  talent: CharacterTalentId;
  className?: string;
}) {
  const Icon = TALENT_ICONS[talent];
  return <Icon className={className} aria-hidden="true" />;
}

export function MaterialIcon({
  material,
  className = "size-4",
}: {
  material: "scrap" | "alloy" | "core" | "fragment" | Element;
  className?: string;
}) {
  const Icon =
    material === "scrap"
      ? Wrench
      : material === "alloy"
        ? Shield
        : material === "core"
          ? Atom
          : material === "fragment"
            ? CircleDot
            : ELEMENT_ICONS[material];
  return <Icon className={className} aria-hidden="true" />;
}
