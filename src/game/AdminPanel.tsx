import { useMemo, useRef, useState } from "react";
import { Download, Plus, RotateCcw, Trash2, Upload } from "lucide-react";
import {
  ABILITY_KIND_LABELS,
  ABILITY_KINDS,
  ENEMY_KIND_LABELS,
  ENEMY_KINDS,
  PASSIVE_KIND_LABELS,
  PASSIVE_KINDS,
  WEAPON_ARCHETYPES,
  WEAPON_BEHAVIOR_LABELS,
  WEAPON_BEHAVIORS,
  WEAPON_ELEMENT_LABELS,
  WEAPON_ELEMENTS,
  defaultGameContent,
  parseImportedCatalogs,
  roomEditorDefault,
  serializeCatalogs,
  validateCatalogs,
  type CatalogReport,
  type GameContentCatalogs,
  type ParsedCatalogs,
} from "./content-settings";
import type { ActiveDef, PassiveDef } from "./abilities";
import { rarityMult } from "./abilities";
import {
  DIFFICULTY_FIELDS,
  difficultyForLevel,
  type DifficultySettings,
} from "./difficulty";
import { simulateLoot, type LootSimResult } from "./loot-sim";
import { RARITY_ORDER, rarityChances, type RarityWeights } from "./rarity-settings";
import { RARITY_LABEL, type Affix, type ArchetypeId, type BehaviorId, type Element, type Rarity, type WeaponStats } from "./types";
import { ARCHETYPE_LABEL } from "./types";
import type { UniqueDef, WeaponDef } from "./weapons";
import type { RoomPlan } from "./dungeon";

const RARITY_CLASSES: Record<Rarity, string> = {
  common: "text-rarity-common",
  uncommon: "text-rarity-uncommon",
  rare: "text-rarity-rare",
  epic: "text-rarity-epic",
  legendary: "text-rarity-legendary",
  mythic: "text-rarity-mythic",
};

type AdminTab = "rewards" | "abilities" | "passives" | "weapons" | "affixes" | "rooms" | "sim" | "difficulty" | "data";

const ARCHETYPE_NAMES = Object.fromEntries(
  WEAPON_ARCHETYPES.map((archetype) => [archetype, ARCHETYPE_LABEL[archetype].name]),
) as Record<ArchetypeId, string>;

type AdminPanelProps = {
  weights: RarityWeights;
  content: GameContentCatalogs;
  difficulty: DifficultySettings;
  onChangeWeights: (rarity: Rarity, weight: number) => void;
  onChangeContent: (content: GameContentCatalogs) => void;
  onChangeDifficulty: (patch: Partial<DifficultySettings>) => void;
  onResetDifficulty: () => void;
  onReplaceAll: (content: GameContentCatalogs, weights: RarityWeights | null) => void;
  onReset: () => void;
  onBack: () => void;
};

function makeId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`;
}

function newAbility(): ActiveDef {
  return {
    id: makeId("ability"),
    kind: "shockwave",
    weight: 1,
    names: ["Nová schopnost", "Vylepšená schopnost", "Mistrovská schopnost"],
    desc: "Kruhový ráz, který odhodí a zraní okolí.",
    cooldown: [6, 8],
    damage: [30, 55],
    radius: [80, 120],
    duration: [0.2, 0.2],
  };
}

function newPassive(): PassiveDef {
  return {
    id: makeId("passive"),
    kind: "vitality",
    weight: 1,
    name: "Nová pasivka",
    descTemplate: "+{value} max HP",
    valueFormat: "integer",
    range: [12, 24],
  };
}

function newWeapon(): WeaponDef {
  const base = defaultGameContent().weapons[0]!;
  return {
    ...base,
    id: makeId("weapon"),
    name: "Nová zbraň",
    weight: 1,
    element: "kinetic",
    behaviors: {},
    stats: { ...base.stats },
  };
}

function newAffix(slot: "prefix" | "suffix"): Affix {
  return {
    id: makeId("affix"),
    slot,
    nameM: slot === "prefix" ? "Nový" : "novoty",
    nameF: slot === "prefix" ? "Nová" : "novoty",
    weight: 1,
    stats: { damage: 1.1 },
    behaviors: {},
  };
}

function newUnique(): UniqueDef {
  return {
    id: makeId("unique"),
    name: "Nový unikát",
    arch: "pistol",
    element: "kinetic",
    rarity: "legendary",
    weight: 1,
    stats: { damage: 40, rpm: 240 },
    behaviors: {},
  };
}

function updatePair(pair: [number, number], index: 0 | 1, value: number): [number, number] {
  const next: [number, number] = [...pair];
  next[index] = value;
  if (index === 0 && next[0] > next[1]) next[1] = next[0];
  if (index === 1 && next[1] < next[0]) next[0] = next[1];
  return next;
}

function NumericField({
  label,
  value,
  min = 0,
  max = 999,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs text-subtle">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => {
          const value = Number(event.currentTarget.value);
          onChange(Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min);
        }}
        className="h-10 min-w-0 rounded-lg border border-border bg-surface px-2 text-sm text-fg outline-none focus:border-accent"
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  const className = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent";
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs text-subtle">
      <span>{label}</span>
      {multiline ? (
        <textarea
          value={value}
          rows={2}
          onChange={(event) => onChange(event.currentTarget.value)}
          className={`${className} resize-y`}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          className={`${className} h-10`}
        />
      )}
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  optionLabels,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  optionLabels: Record<T, string>;
  onChange: (value: T) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs text-subtle">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.currentTarget.value as T)}
        className="h-10 w-full rounded-lg border border-border bg-surface px-2 text-sm text-fg outline-none focus:border-accent"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabels[option]}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AdminPanel({
  weights,
  content,
  difficulty,
  onChangeWeights,
  onChangeContent,
  onChangeDifficulty,
  onResetDifficulty,
  onReplaceAll,
  onReset,
  onBack,
}: AdminPanelProps) {
  const [tab, setTab] = useState<AdminTab>("rewards");
  const chances = rarityChances(weights);

  function updateAbility(id: string, update: (item: ActiveDef) => ActiveDef) {
    onChangeContent({
      ...content,
      abilities: content.abilities.map((item) => (item.id === id ? update(item) : item)),
    });
  }

  function updatePassive(id: string, update: (item: PassiveDef) => PassiveDef) {
    onChangeContent({
      ...content,
      passives: content.passives.map((item) => (item.id === id ? update(item) : item)),
    });
  }

  function updateWeapon(id: string, update: (item: WeaponDef) => WeaponDef) {
    onChangeContent({
      ...content,
      weapons: content.weapons.map((item) => (item.id === id ? update(item) : item)),
    });
  }

  function updateAffix(id: string, update: (item: Affix) => Affix) {
    onChangeContent({
      ...content,
      affixes: content.affixes.map((item) => (item.id === id ? update(item) : item)),
    });
  }

  function updateUnique(id: string, update: (item: UniqueDef) => UniqueDef) {
    onChangeContent({
      ...content,
      uniques: content.uniques.map((item) => (item.id === id ? update(item) : item)),
    });
  }

  function updateRoom(index: number, update: (plan: RoomPlan) => RoomPlan) {
    const roomPlans = [...content.roomPlans];
    roomPlans[index] = update(roomPlans[index] ?? roomEditorDefault(index));
    onChangeContent({ ...content, roomPlans });
  }

  return (
    <div className="absolute inset-0 z-10 flex items-end justify-center overflow-y-auto bg-bg/85 p-3 sm:items-center">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-panel-title"
        className="max-h-[calc(100dvh-24px)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-2xl sm:p-5"
      >
        <header className="flex items-center justify-between gap-3">
          <h2 id="admin-panel-title" className="font-display text-xl font-semibold">
            Panel správce
          </h2>
          <button
            type="button"
            onClick={onReset}
            aria-label="Obnovit výchozí nastavení"
            title="Obnovit výchozí nastavení"
            className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted"
          >
            <RotateCcw className="size-4" />
          </button>
        </header>

        <div role="tablist" aria-label="Nastavení hry" className="mt-4 grid grid-cols-2 gap-1 rounded-lg border border-border bg-bg p-1 sm:grid-cols-3">
          {([
            ["rewards", "Odměny"],
            ["abilities", "Schopnosti"],
            ["passives", "Pasivky"],
            ["weapons", "Zbraně"],
            ["affixes", "Affixy"],
            ["rooms", "Místnosti"],
            ["sim", "Simulátor"],
            ["difficulty", "Obtížnost"],
            ["data", "Data"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`min-h-10 rounded-md px-2 text-xs font-medium transition-colors ${
                tab === key ? "bg-elevated text-fg" : "text-muted hover:text-fg"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "rewards" ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {RARITY_ORDER.map((rarity) => (
              <div key={rarity} className="rounded-xl border border-border bg-elevated p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-medium ${RARITY_CLASSES[rarity]}`}>{RARITY_LABEL[rarity]}</span>
                  <span className="font-mono text-xs tabular-nums text-muted">
                    Šance {chances[rarity].toFixed(1)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={weights[rarity]}
                  aria-label={`${RARITY_LABEL[rarity]} váha`}
                  onChange={(event) => {
                    const value = Number(event.currentTarget.value);
                    if (RARITY_ORDER.some((item) => (item === rarity ? value : weights[item]) > 0)) {
                      onChangeWeights(rarity, value);
                    }
                  }}
                  className="mt-2 w-full accent-accent"
                />
                <div className="mt-1 flex items-center justify-between text-xs text-subtle">
                  <span>Váha</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={weights[rarity]}
                    aria-label={RARITY_LABEL[rarity]}
                    onChange={(event) => {
                      const value = Math.round(Math.min(100, Math.max(0, Number(event.currentTarget.value) || 0)));
                      if (RARITY_ORDER.some((item) => (item === rarity ? value : weights[item]) > 0)) {
                        onChangeWeights(rarity, value);
                      }
                    }}
                    className="h-8 w-16 rounded-md border border-border bg-surface px-2 text-right font-mono text-xs text-fg outline-none focus:border-accent"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {tab === "abilities" ? (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted">Vytvoř variantu existujícího schopnostního efektu.</p>
              <button
                type="button"
                onClick={() => onChangeContent({ ...content, abilities: [...content.abilities, newAbility()] })}
                className="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-accent px-3 text-xs font-semibold text-accent-fg"
              >
                <Plus className="size-4" /> Přidat
              </button>
            </div>
            {content.abilities.map((item) => (
              <details key={item.id} className="rounded-xl border border-border bg-elevated">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0 truncate text-sm font-medium">{item.names[0] || "Bez názvu"}</span>
                  <span className="shrink-0 text-xs text-muted">{ABILITY_KIND_LABELS[item.kind]}</span>
                </summary>
                <div className="grid gap-3 border-t border-border p-3 sm:grid-cols-2">
                  <SelectField
                    label="Herní efekt"
                    value={item.kind}
                    options={ABILITY_KINDS}
                    optionLabels={ABILITY_KIND_LABELS}
                    onChange={(kind) => updateAbility(item.id, (current) => ({ ...current, kind }))}
                  />
                  <NumericField
                    label="Váha výskytu"
                    value={item.weight}
                    min={0}
                    max={100}
                    onChange={(weight) => updateAbility(item.id, (current) => ({ ...current, weight }))}
                  />
                  {item.names.map((name, index) => (
                    <TextField
                      key={`${item.id}-name-${index}`}
                      label={["Název běžný/vzácný", "Název vzácný/epický", "Název legendární/mýtický"][index]!}
                      value={name}
                      onChange={(value) =>
                        updateAbility(item.id, (current) => {
                          const names: [string, string, string] = [...current.names];
                          names[index] = value;
                          return { ...current, names };
                        })
                      }
                    />
                  ))}
                  <div className="sm:col-span-2">
                    <TextField
                      label="Popis"
                      value={item.desc}
                      multiline
                      onChange={(desc) => updateAbility(item.id, (current) => ({ ...current, desc }))}
                    />
                  </div>
                  {([
                    ["cooldown", "Obnova (s)", 0.1, 30, 0.1],
                    ["damage", "Poškození", 0, 1000, 1],
                    ["radius", "Dosah", 0, 1000, 1],
                    ["duration", "Trvání (s)", 0, 60, 0.1],
                  ] as const).map(([key, label, min, max, step]) => (
                    <div key={key} className="grid grid-cols-2 gap-2">
                      <NumericField
                        label={`${label} min.`}
                        value={item[key][0]}
                        min={min}
                        max={max}
                        step={step}
                        onChange={(value) =>
                          updateAbility(item.id, (current) => ({ ...current, [key]: updatePair(current[key], 0, value) }))
                        }
                      />
                      <NumericField
                        label={`${label} max.`}
                        value={item[key][1]}
                        min={min}
                        max={max}
                        step={step}
                        onChange={(value) =>
                          updateAbility(item.id, (current) => ({ ...current, [key]: updatePair(current[key], 1, value) }))
                        }
                      />
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      disabled={content.abilities.length <= 1}
                      onClick={() =>
                        onChangeContent({
                          ...content,
                          abilities: content.abilities.filter((ability) => ability.id !== item.id),
                        })
                      }
                      className="flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-xs text-muted disabled:opacity-40"
                    >
                      <Trash2 className="size-4" /> Odebrat schopnost
                    </button>
                  </div>
                </div>
              </details>
            ))}
          </div>
        ) : null}

        {tab === "passives" ? (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted">Vytvoř variantu existujícího pasivního efektu.</p>
              <button
                type="button"
                onClick={() => onChangeContent({ ...content, passives: [...content.passives, newPassive()] })}
                className="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-accent px-3 text-xs font-semibold text-accent-fg"
              >
                <Plus className="size-4" /> Přidat
              </button>
            </div>
            {content.passives.map((item) => (
              <details key={item.id} className="rounded-xl border border-border bg-elevated">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0 truncate text-sm font-medium">{item.name || "Bez názvu"}</span>
                  <span className="shrink-0 text-xs text-muted">{PASSIVE_KIND_LABELS[item.kind]}</span>
                </summary>
                <div className="grid gap-3 border-t border-border p-3 sm:grid-cols-2">
                  <SelectField
                    label="Herní efekt"
                    value={item.kind}
                    options={PASSIVE_KINDS}
                    optionLabels={PASSIVE_KIND_LABELS}
                    onChange={(kind) => updatePassive(item.id, (current) => ({ ...current, kind }))}
                  />
                  <NumericField
                    label="Váha výskytu"
                    value={item.weight}
                    min={0}
                    max={100}
                    onChange={(weight) => updatePassive(item.id, (current) => ({ ...current, weight }))}
                  />
                  <TextField
                    label="Název"
                    value={item.name}
                    onChange={(name) => updatePassive(item.id, (current) => ({ ...current, name }))}
                  />
                  <SelectField
                    label="Formát hodnoty"
                    value={item.valueFormat}
                    options={["integer", "percent", "none"] as const}
                    optionLabels={{ integer: "Číslo", percent: "Procenta", none: "Bez hodnoty" }}
                    onChange={(valueFormat) => updatePassive(item.id, (current) => ({ ...current, valueFormat }))}
                  />
                  <div className="sm:col-span-2">
                    <TextField
                      label="Popis (hodnotu vlož pomocí {value})"
                      value={item.descTemplate}
                      multiline
                      onChange={(descTemplate) =>
                        updatePassive(item.id, (current) => ({ ...current, descTemplate }))
                      }
                    />
                  </div>
                  <NumericField
                    label="Hodnota min."
                    value={item.range[0]}
                    min={0}
                    max={1000}
                    step={0.01}
                    onChange={(value) =>
                      updatePassive(item.id, (current) => ({ ...current, range: updatePair(current.range, 0, value) }))
                    }
                  />
                  <NumericField
                    label="Hodnota max."
                    value={item.range[1]}
                    min={0}
                    max={1000}
                    step={0.01}
                    onChange={(value) =>
                      updatePassive(item.id, (current) => ({ ...current, range: updatePair(current.range, 1, value) }))
                    }
                  />
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      disabled={content.passives.length <= 1}
                      onClick={() =>
                        onChangeContent({
                          ...content,
                          passives: content.passives.filter((passive) => passive.id !== item.id),
                        })
                      }
                      className="flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-xs text-muted disabled:opacity-40"
                    >
                      <Trash2 className="size-4" /> Odebrat pasivku
                    </button>
                  </div>
                </div>
              </details>
            ))}
          </div>
        ) : null}

        {tab === "weapons" ? (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted">Uprav zbraň nebo vytvoř variantu existujícího archetypu.</p>
              <button
                type="button"
                onClick={() => onChangeContent({ ...content, weapons: [...content.weapons, newWeapon()] })}
                className="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-accent px-3 text-xs font-semibold text-accent-fg"
              >
                <Plus className="size-4" /> Přidat
              </button>
            </div>
            {content.weapons.map((item) => (
              <details key={item.id} className="rounded-xl border border-border bg-elevated">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0 truncate text-sm font-medium">{item.name || "Bez názvu"}</span>
                  <span className="shrink-0 text-xs text-muted">{ARCHETYPE_LABEL[item.archetype].name}</span>
                </summary>
                <div className="grid gap-3 border-t border-border p-3 sm:grid-cols-2">
                  <TextField
                    label="Název"
                    value={item.name}
                    onChange={(name) => updateWeapon(item.id, (current) => ({ ...current, name }))}
                  />
                  <SelectField
                    label="Archetyp a herní chování"
                    value={item.archetype}
                    options={WEAPON_ARCHETYPES}
                    optionLabels={ARCHETYPE_NAMES}
                    onChange={(archetype) => updateWeapon(item.id, (current) => ({ ...current, archetype }))}
                  />
                  <SelectField
                    label="Základní element"
                    value={item.element}
                    options={WEAPON_ELEMENTS}
                    optionLabels={WEAPON_ELEMENT_LABELS}
                    onChange={(element) => updateWeapon(item.id, (current) => ({ ...current, element }))}
                  />
                  <NumericField
                    label="Váha výskytu"
                    value={item.weight}
                    min={0}
                    max={100}
                    onChange={(weight) => updateWeapon(item.id, (current) => ({ ...current, weight }))}
                  />
                  {([
                    ["damage", "Poškození", 0.1, 1000, 0.1],
                    ["rpm", "Kadence (RPM)", 1, 3000, 1],
                    ["pellets", "Projektily", 1, 100, 1],
                    ["mag", "Zásobník", 1, 500, 1],
                    ["reload", "Přebití (s)", 0.1, 30, 0.1],
                    ["speed", "Rychlost střely", 1, 5000, 1],
                    ["size", "Velikost střely", 0.1, 100, 0.1],
                    ["range", "Dosah", 1, 5000, 1],
                  ] as const).map(([key, label, min, max, step]) => (
                    <div key={key} className="grid grid-cols-2 gap-2">
                      <NumericField
                        label={`${label} min.`}
                        value={item.stats[key][0]}
                        min={min}
                        max={max}
                        step={step}
                        onChange={(value) =>
                          updateWeapon(item.id, (current) => ({
                            ...current,
                            stats: { ...current.stats, [key]: updatePair(current.stats[key], 0, value) },
                          }))
                        }
                      />
                      <NumericField
                        label={`${label} max.`}
                        value={item.stats[key][1]}
                        min={min}
                        max={max}
                        step={step}
                        onChange={(value) =>
                          updateWeapon(item.id, (current) => ({
                            ...current,
                            stats: { ...current.stats, [key]: updatePair(current.stats[key], 1, value) },
                          }))
                        }
                      />
                    </div>
                  ))}
                  <NumericField
                    label="Rozptyl"
                    value={item.stats.spread}
                    min={0}
                    max={3.14}
                    step={0.01}
                    onChange={(spread) =>
                      updateWeapon(item.id, (current) => ({ ...current, stats: { ...current.stats, spread } }))
                    }
                  />
                  <NumericField
                    label="Odhazovací síla"
                    value={item.stats.knockback}
                    min={0}
                    max={2000}
                    onChange={(knockback) =>
                      updateWeapon(item.id, (current) => ({ ...current, stats: { ...current.stats, knockback } }))
                    }
                  />
                  <NumericField
                    label="Kritická šance (0–1)"
                    value={item.critChance}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(critChance) => updateWeapon(item.id, (current) => ({ ...current, critChance }))}
                  />
                  <NumericField
                    label="Násobitel kritického zásahu"
                    value={item.critMult}
                    min={1}
                    max={20}
                    step={0.1}
                    onChange={(critMult) => updateWeapon(item.id, (current) => ({ ...current, critMult }))}
                  />
                  <fieldset className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
                    <legend className="mb-2 text-xs text-subtle">Vlastnosti střel</legend>
                    {WEAPON_BEHAVIORS.map((behavior) => {
                      const amount = item.behaviors[behavior] ?? 0;
                      const enabled = amount > 0;
                      return (
                        <div key={behavior} className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-border bg-surface px-2">
                          <label className="flex min-w-0 items-center gap-2 text-xs text-muted">
                            <input
                              type="checkbox"
                              checked={enabled}
                              onChange={(event) =>
                                updateWeapon(item.id, (current) => {
                                  const behaviors: Partial<Record<BehaviorId, number>> = { ...current.behaviors };
                                  if (event.currentTarget.checked) behaviors[behavior] = 1;
                                  else delete behaviors[behavior];
                                  return { ...current, behaviors };
                                })
                              }
                              className="size-4 accent-accent"
                            />
                            <span className="truncate">{WEAPON_BEHAVIOR_LABELS[behavior]}</span>
                          </label>
                          {enabled ? (
                            <input
                              type="number"
                              min="0.01"
                              max="1000"
                              step="0.1"
                              value={amount}
                              aria-label={`${WEAPON_BEHAVIOR_LABELS[behavior]} hodnota`}
                              onChange={(event) => {
                                const value = Math.max(0.01, Math.min(1000, Number(event.currentTarget.value) || 0.01));
                                updateWeapon(item.id, (current) => ({
                                  ...current,
                                  behaviors: { ...current.behaviors, [behavior]: value },
                                }));
                              }}
                              className="h-8 w-20 rounded-md border border-border bg-elevated px-2 text-right font-mono text-xs text-fg outline-none focus:border-accent"
                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </fieldset>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      disabled={content.weapons.length <= 1}
                      onClick={() =>
                        onChangeContent({
                          ...content,
                          weapons: content.weapons.filter((weapon) => weapon.id !== item.id),
                        })
                      }
                      className="flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-xs text-muted disabled:opacity-40"
                    >
                      <Trash2 className="size-4" /> Odebrat zbraň
                    </button>
                  </div>
                </div>
              </details>
            ))}
          </div>
        ) : null}

        {tab === "affixes" ? (
          <AffixesTab
            content={content}
            onChangeContent={onChangeContent}
            onUpdateAffix={updateAffix}
            onUpdateUnique={updateUnique}
          />
        ) : null}

        {tab === "rooms" ? (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-muted">Vypnutý vlastní plán používá původní procedurální generování.</p>
            {content.roomPlans.map((override, roomIndex) => {
              const plan = override ?? roomEditorDefault(roomIndex);
              return (
                <details key={roomIndex} className="rounded-xl border border-border bg-elevated">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2">
                    <span className="text-sm font-medium">Místnost {roomIndex + 1}</span>
                    <span className="shrink-0 text-xs text-muted">
                      {override ? "Vlastní plán" : "Procedurální"}
                      {override?.isBoss ? " · Boss" : override?.isElite ? " · Elite" : ""}
                    </span>
                  </summary>
                  <div className="space-y-3 border-t border-border p-3">
                    <label className="flex min-h-11 items-center gap-3 text-sm text-fg">
                      <input
                        type="checkbox"
                        checked={override !== null}
                        onChange={(event) => {
                          const roomPlans = [...content.roomPlans];
                          roomPlans[roomIndex] = event.currentTarget.checked ? roomEditorDefault(roomIndex) : null;
                          onChangeContent({ ...content, roomPlans });
                        }}
                        className="size-5 accent-accent"
                      />
                      Použít vlastní plán
                    </label>
                    {override ? (
                      <>
                        <div className="grid gap-2 sm:grid-cols-3">
                          <label className="flex min-h-11 items-center gap-2 text-sm text-fg">
                            <input
                              type="checkbox"
                              checked={plan.isElite}
                              onChange={(event) => updateRoom(roomIndex, (current) => ({ ...current, isElite: event.currentTarget.checked }))}
                              className="size-5 accent-accent"
                            />
                            Elite
                          </label>
                          <label className="flex min-h-11 items-center gap-2 text-sm text-fg">
                            <input
                              type="checkbox"
                              checked={plan.isBoss}
                              onChange={(event) => updateRoom(roomIndex, (current) => ({ ...current, isBoss: event.currentTarget.checked }))}
                              className="size-5 accent-accent"
                            />
                            Boss místnost
                          </label>
                          <NumericField
                            label="Počet překážek"
                            value={plan.obstacleCount}
                            min={0}
                            max={12}
                            onChange={(obstacleCount) => updateRoom(roomIndex, (current) => ({ ...current, obstacleCount }))}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-muted">Vlny v pořadí</span>
                          <button
                            type="button"
                            onClick={() => updateRoom(roomIndex, (current) => ({
                              ...current,
                              waves: [...current.waves, { delay: 0.5, spawns: [{ kind: "grunt", count: 2 }] }],
                            }))}
                            className="flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-xs text-fg"
                          >
                            <Plus className="size-4" /> Přidat vlnu
                          </button>
                        </div>
                        {plan.waves.map((wave, waveIndex) => (
                          <section key={waveIndex} className="space-y-2 rounded-lg border border-border bg-surface p-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium">Vlna {waveIndex + 1}</span>
                              <button
                                type="button"
                                disabled={plan.waves.length <= 1}
                                aria-label={`Odebrat vlnu ${waveIndex + 1}`}
                                onClick={() => updateRoom(roomIndex, (current) => ({
                                  ...current,
                                  waves: current.waves.filter((_, index) => index !== waveIndex),
                                }))}
                                className="flex size-10 items-center justify-center rounded-lg border border-border text-muted disabled:opacity-40"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                            <NumericField
                              label="Zpoždění před vlnou (s)"
                              value={wave.delay}
                              min={0}
                              max={60}
                              step={0.1}
                              onChange={(delay) => updateRoom(roomIndex, (current) => ({
                                ...current,
                                waves: current.waves.map((item, index) => index === waveIndex ? { ...item, delay } : item),
                              }))}
                            />
                            <div className="space-y-2">
                              {wave.spawns.map((spawn, spawnIndex) => (
                                <div key={spawnIndex} className="grid grid-cols-[minmax(0,1fr)_84px_40px] items-end gap-2">
                                  <SelectField
                                    label={`Typ nepřítele ${spawnIndex + 1}`}
                                    value={spawn.kind}
                                    options={ENEMY_KINDS}
                                    optionLabels={ENEMY_KIND_LABELS}
                                    onChange={(kind) => updateRoom(roomIndex, (current) => ({
                                      ...current,
                                      waves: current.waves.map((item, index) => index === waveIndex ? {
                                        ...item,
                                        spawns: item.spawns.map((entry, position) => position === spawnIndex ? { ...entry, kind } : entry),
                                      } : item),
                                    }))}
                                  />
                                  <NumericField
                                    label="Počet"
                                    value={spawn.count}
                                    min={1}
                                    max={100}
                                    onChange={(count) => updateRoom(roomIndex, (current) => ({
                                      ...current,
                                      waves: current.waves.map((item, index) => index === waveIndex ? {
                                        ...item,
                                        spawns: item.spawns.map((entry, position) => position === spawnIndex ? { ...entry, count } : entry),
                                      } : item),
                                    }))}
                                  />
                                  <button
                                    type="button"
                                    disabled={wave.spawns.length <= 1}
                                    aria-label={`Odebrat nepřítele ${spawnIndex + 1} z vlny ${waveIndex + 1}`}
                                    onClick={() => updateRoom(roomIndex, (current) => ({
                                      ...current,
                                      waves: current.waves.map((item, index) => index === waveIndex ? {
                                        ...item,
                                        spawns: item.spawns.filter((_, position) => position !== spawnIndex),
                                      } : item),
                                    }))}
                                    className="flex size-10 items-center justify-center rounded-lg border border-border text-muted disabled:opacity-40"
                                  >
                                    <Trash2 className="size-4" />
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => updateRoom(roomIndex, (current) => ({
                                  ...current,
                                  waves: current.waves.map((item, index) => index === waveIndex ? {
                                    ...item,
                                    spawns: [...item.spawns, { kind: "grunt", count: 1 }],
                                  } : item),
                                }))}
                                className="flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-xs text-muted"
                              >
                                <Plus className="size-4" /> Přidat typ nepřítele
                              </button>
                            </div>
                          </section>
                        ))}
                      </>
                    ) : (
                      <p className="text-xs text-subtle">Použije se výchozí obtížnost a skladba vln podle seedu běhu.</p>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        ) : null}

        {tab === "sim" ? (
          <LootSimulator weights={weights} content={content} />
        ) : null}

        {tab === "difficulty" ? (
          <DifficultyEditor difficulty={difficulty} onChange={onChangeDifficulty} onReset={onResetDifficulty} />
        ) : null}

        {tab === "data" ? (
          <CatalogData weights={weights} content={content} onReplaceAll={onReplaceAll} />
        ) : null}

        <button
          type="button"
          onClick={onBack}
          className="mt-4 flex h-11 w-full items-center justify-center rounded-lg bg-accent text-sm font-semibold text-accent-fg"
        >
          Zpět do menu
        </button>
      </section>
    </div>
  );
}

type StatFieldDef = {
  key: keyof WeaponStats;
  label: string;
  min: number;
  max: number;
  step: number;
  enableValue: number;
};

/** Volitelné číselné staty: checkbox + hodnota (prázdné = bez modu). */
function OptStatRows({
  value,
  fields,
  onChange,
}: {
  value: Partial<WeaponStats> | undefined;
  fields: StatFieldDef[];
  onChange: (next: Partial<WeaponStats> | undefined) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {fields.map(({ key, label, min, max, step, enableValue }) => {
        const current = value?.[key];
        const enabled = current !== undefined;
        return (
          <div
            key={key}
            className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-border bg-surface px-2"
          >
            <label className="flex min-w-0 items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => {
                  const next: Partial<WeaponStats> = { ...(value ?? {}) };
                  if (event.currentTarget.checked) next[key] = enableValue;
                  else delete next[key];
                  onChange(Object.keys(next).length > 0 ? next : undefined);
                }}
                className="size-4 accent-accent"
              />
              <span className="truncate">{label}</span>
            </label>
            {enabled ? (
              <input
                type="number"
                min={min}
                max={max}
                step={step}
                value={current}
                aria-label={label}
                onChange={(event) => {
                  const v = Number(event.currentTarget.value);
                  const clamped = Math.min(max, Math.max(min, Number.isFinite(v) ? v : min));
                  onChange({ ...(value ?? {}), [key]: clamped });
                }}
                className="h-8 w-20 rounded-md border border-border bg-elevated px-2 text-right font-mono text-xs text-fg outline-none focus:border-accent"
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

const AFFIX_STAT_FIELDS: StatFieldDef[] = [
  { key: "damage", label: "Poškození ×", min: 0.01, max: 20, step: 0.01, enableValue: 1 },
  { key: "rpm", label: "Kadence ×", min: 0.01, max: 20, step: 0.01, enableValue: 1 },
  { key: "spread", label: "Rozptyl ×", min: 0.01, max: 5, step: 0.01, enableValue: 1 },
  { key: "pellets", label: "Projektily +", min: 0, max: 20, step: 1, enableValue: 1 },
  { key: "magSize", label: "Zásobník ×", min: 0.01, max: 20, step: 0.01, enableValue: 1 },
  { key: "reload", label: "Přebití ×", min: 0.01, max: 20, step: 0.01, enableValue: 1 },
  { key: "projSpeed", label: "Rychlost střel ×", min: 0.01, max: 20, step: 0.01, enableValue: 1 },
  { key: "projSize", label: "Velikost střel ×", min: 0.01, max: 20, step: 0.01, enableValue: 1 },
  { key: "range", label: "Dostřel ×", min: 0.01, max: 20, step: 0.01, enableValue: 1 },
  { key: "knockback", label: "Knockback ×", min: 0, max: 50, step: 0.1, enableValue: 1 },
  { key: "critChance", label: "Krit šance +", min: 0, max: 1, step: 0.01, enableValue: 0.05 },
  { key: "critMult", label: "Krit násobitel +", min: 0, max: 20, step: 0.1, enableValue: 0.2 },
];

const UNIQUE_STAT_FIELDS: StatFieldDef[] = [
  { key: "damage", label: "Poškození", min: 0.1, max: 2000, step: 1, enableValue: 30 },
  { key: "rpm", label: "Kadence", min: 1, max: 3000, step: 1, enableValue: 200 },
  { key: "pellets", label: "Projektily", min: 1, max: 20, step: 1, enableValue: 1 },
  { key: "magSize", label: "Zásobník", min: 1, max: 500, step: 1, enableValue: 10 },
  { key: "reload", label: "Přebití (s)", min: 0.1, max: 10, step: 0.1, enableValue: 1 },
  { key: "projSize", label: "Velikost střel", min: 0.1, max: 40, step: 0.5, enableValue: 5 },
  { key: "range", label: "Dostřel", min: 1, max: 3000, step: 10, enableValue: 600 },
  { key: "critChance", label: "Krit šance (0–1)", min: 0, max: 1, step: 0.01, enableValue: 0.2 },
  { key: "critMult", label: "Krit násobitel", min: 1, max: 20, step: 0.1, enableValue: 2 },
];

/** Editor vlastností střel (checkbox + hodnota), sdílený pro affixy a unikáty. */
function BehaviorsEditor({
  value,
  onChange,
}: {
  value: Partial<Record<BehaviorId, number>>;
  onChange: (next: Partial<Record<BehaviorId, number>>) => void;
}) {
  return (
    <fieldset className="grid gap-2 sm:grid-cols-2">
      <legend className="mb-2 text-xs text-subtle">Vlastnosti střel</legend>
      {WEAPON_BEHAVIORS.map((behavior) => {
        const amount = value[behavior] ?? 0;
        const enabled = amount > 0;
        return (
          <div
            key={behavior}
            className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-border bg-surface px-2"
          >
            <label className="flex min-w-0 items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => {
                  const next: Partial<Record<BehaviorId, number>> = { ...value };
                  if (event.currentTarget.checked) next[behavior] = 1;
                  else delete next[behavior];
                  onChange(next);
                }}
                className="size-4 accent-accent"
              />
              <span className="truncate">{WEAPON_BEHAVIOR_LABELS[behavior]}</span>
            </label>
            {enabled ? (
              <input
                type="number"
                min="0.01"
                max="1000"
                step="0.1"
                value={amount}
                aria-label={`${WEAPON_BEHAVIOR_LABELS[behavior]} hodnota`}
                onChange={(event) => {
                  const v = Math.max(0.01, Math.min(1000, Number(event.currentTarget.value) || 0.01));
                  onChange({ ...value, [behavior]: v });
                }}
                className="h-8 w-20 rounded-md border border-border bg-elevated px-2 text-right font-mono text-xs text-fg outline-none focus:border-accent"
              />
            ) : null}
          </div>
        );
      })}
    </fieldset>
  );
}

function ElementSelect({
  label,
  value,
  allowNone,
  onChange,
}: {
  label: string;
  value: Element | undefined;
  allowNone: boolean;
  onChange: (value: Element | undefined) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs text-subtle">
      <span>{label}</span>
      <select
        value={value ?? ""}
        onChange={(event) => onChange((event.currentTarget.value as Element) || undefined)}
        className="h-10 w-full rounded-lg border border-border bg-surface px-2 text-sm text-fg outline-none focus:border-accent"
      >
        {allowNone ? <option value="">Bez elementu</option> : null}
        {WEAPON_ELEMENTS.map((element) => (
          <option key={element} value={element}>
            {WEAPON_ELEMENT_LABELS[element]}
          </option>
        ))}
      </select>
    </label>
  );
}

function AffixesTab({
  content,
  onChangeContent,
  onUpdateAffix,
  onUpdateUnique,
}: {
  content: GameContentCatalogs;
  onChangeContent: (content: GameContentCatalogs) => void;
  onUpdateAffix: (id: string, update: (item: Affix) => Affix) => void;
  onUpdateUnique: (id: string, update: (item: UniqueDef) => UniqueDef) => void;
}) {
  return (
    <div className="mt-3 space-y-4">
      <section>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted">
            Prefixy a suffixy: element, násobiče statistik a chování střel + váha výskytu.
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => onChangeContent({ ...content, affixes: [...content.affixes, newAffix("prefix")] })}
              className="flex h-10 items-center gap-1 rounded-lg bg-accent px-3 text-xs font-semibold text-accent-fg"
            >
              <Plus className="size-4" /> Prefix
            </button>
            <button
              type="button"
              onClick={() => onChangeContent({ ...content, affixes: [...content.affixes, newAffix("suffix")] })}
              className="flex h-10 items-center gap-1 rounded-lg bg-accent px-3 text-xs font-semibold text-accent-fg"
            >
              <Plus className="size-4" /> Suffix
            </button>
          </div>
        </div>
        <div className="mt-2 space-y-2">
          {content.affixes.map((item) => (
            <details key={item.id} className="rounded-xl border border-border bg-elevated">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0 truncate text-sm font-medium">{item.nameM || "Bez názvu"}</span>
                <span className="shrink-0 text-xs text-muted">
                  {item.slot === "prefix" ? "Prefix" : "Suffix"} · váha {item.weight}
                </span>
              </summary>
              <div className="grid gap-3 border-t border-border p-3 sm:grid-cols-2">
                <SelectField
                  label="Slot"
                  value={item.slot}
                  options={["prefix", "suffix"] as const}
                  optionLabels={{ prefix: "Prefix", suffix: "Suffix" }}
                  onChange={(slot) => onUpdateAffix(item.id, (current) => ({ ...current, slot }))}
                />
                <NumericField
                  label="Váha výskytu"
                  value={item.weight}
                  min={0}
                  max={100}
                  onChange={(weight) => onUpdateAffix(item.id, (current) => ({ ...current, weight }))}
                />
                <TextField
                  label="Název (rod mužský)"
                  value={item.nameM}
                  onChange={(nameM) => onUpdateAffix(item.id, (current) => ({ ...current, nameM }))}
                />
                <TextField
                  label="Název (rod ženský)"
                  value={item.nameF}
                  onChange={(nameF) => onUpdateAffix(item.id, (current) => ({ ...current, nameF }))}
                />
                <div className="sm:col-span-2">
                  <ElementSelect
                    label="Element"
                    value={item.element}
                    allowNone
                    onChange={(element) => onUpdateAffix(item.id, (current) => ({ ...current, element }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <p className="mb-2 text-xs text-subtle">Modifikátory statistik (× násobič, + přičtení)</p>
                  <OptStatRows
                    value={item.stats}
                    fields={AFFIX_STAT_FIELDS}
                    onChange={(stats) => onUpdateAffix(item.id, (current) => ({ ...current, stats }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <BehaviorsEditor
                    value={item.behaviors ?? {}}
                    onChange={(behaviors) => onUpdateAffix(item.id, (current) => ({ ...current, behaviors }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={() =>
                      onChangeContent({ ...content, affixes: content.affixes.filter((a) => a.id !== item.id) })
                    }
                    className="flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-xs text-muted"
                  >
                    <Trash2 className="size-4" /> Odebrat affix
                  </button>
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted">Unikátní zbraně padají z legendárních a mýtických dropů.</p>
          <button
            type="button"
            onClick={() => onChangeContent({ ...content, uniques: [...content.uniques, newUnique()] })}
            className="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-accent px-3 text-xs font-semibold text-accent-fg"
          >
            <Plus className="size-4" /> Přidat
          </button>
        </div>
        <div className="mt-2 space-y-2">
          {content.uniques.map((item) => (
            <details key={item.id} className="rounded-xl border border-border bg-elevated">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0 truncate text-sm font-medium">{item.name || "Bez názvu"}</span>
                <span className={`shrink-0 text-xs ${RARITY_CLASSES[item.rarity]}`}>{RARITY_LABEL[item.rarity]}</span>
              </summary>
              <div className="grid gap-3 border-t border-border p-3 sm:grid-cols-2">
                <TextField
                  label="Název"
                  value={item.name}
                  onChange={(name) => onUpdateUnique(item.id, (current) => ({ ...current, name }))}
                />
                <NumericField
                  label="Váha výskytu"
                  value={item.weight}
                  min={0}
                  max={100}
                  onChange={(weight) => onUpdateUnique(item.id, (current) => ({ ...current, weight }))}
                />
                <SelectField
                  label="Archetyp"
                  value={item.arch}
                  options={WEAPON_ARCHETYPES}
                  optionLabels={ARCHETYPE_NAMES}
                  onChange={(arch) => onUpdateUnique(item.id, (current) => ({ ...current, arch }))}
                />
                <ElementSelect
                  label="Element"
                  value={item.element}
                  allowNone={false}
                  onChange={(element) => onUpdateUnique(item.id, (current) => ({ ...current, element: element ?? "kinetic" }))}
                />
                <SelectField
                  label="Rarita"
                  value={item.rarity}
                  options={["legendary", "mythic"] as const}
                  optionLabels={RARITY_LABEL}
                  onChange={(rarity) => onUpdateUnique(item.id, (current) => ({ ...current, rarity: rarity as "legendary" | "mythic" }))}
                />
                <div className="sm:col-span-2">
                  <p className="mb-2 text-xs text-subtle">Statistiky (prázdné = základ archetypu)</p>
                  <OptStatRows
                    value={item.stats}
                    fields={UNIQUE_STAT_FIELDS}
                    onChange={(stats) => onUpdateUnique(item.id, (current) => ({ ...current, stats: stats ?? {} }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <BehaviorsEditor
                    value={item.behaviors}
                    onChange={(behaviors) => onUpdateUnique(item.id, (current) => ({ ...current, behaviors }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    disabled={content.uniques.length <= 1}
                    onClick={() =>
                      onChangeContent({ ...content, uniques: content.uniques.filter((u) => u.id !== item.id) })
                    }
                    className="flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-xs text-muted disabled:opacity-40"
                  >
                    <Trash2 className="size-4" /> Odebrat unikát
                  </button>
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

function LootSimulator({ weights, content }: { weights: RarityWeights; content: GameContentCatalogs }) {
  const [level, setLevel] = useState(5);
  const [count, setCount] = useState(100);
  const [boss, setBoss] = useState(false);
  const result: LootSimResult = useMemo(
    () => simulateLoot(content, weights, level, count, `SIM-${level}-${count}`, boss),
    [content, weights, level, count, boss],
  );
  const totalItems = RARITY_ORDER.reduce((s, r) => s + result.byRarity[r], 0) || 1;
  return (
    <div className="mt-3 space-y-3">
      <p className="text-xs text-muted">
        Vygeneruje {count} nabídek z aktuální konfigurace bez spuštění běhu. Třetí nabídka se počítá jako pasivka
        (plné HP); medkit ve hře padá jen při HP pod 60 %.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <NumericField label="Úroveň (1–30)" value={level} min={1} max={30} onChange={setLevel} />
        <NumericField label="Počet nabídek" value={count} min={10} max={500} step={10} onChange={setCount} />
        <label className="flex min-h-11 items-center gap-2 text-sm text-fg">
          <input
            type="checkbox"
            checked={boss}
            onChange={(e) => setBoss(e.currentTarget.checked)}
            className="size-5 accent-accent"
          />
          Boss loot
        </label>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {(
          [
            ["Zbraně", result.byType.weapon],
            ["Schopnosti", result.byType.ability],
            ["Pasivky", result.byType.passive],
            ["Mody", result.byType.mod],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-elevated p-3 text-center">
            <div className="font-display text-lg font-semibold tabular-nums">{value}</div>
            <div className="text-[11px] text-subtle">{label}</div>
          </div>
        ))}
      </div>
      <table className="w-full text-xs tabular-nums">
        <thead>
          <tr className="text-left text-subtle">
            <th className="py-1 font-normal">Rarita</th>
            <th className="py-1 text-right font-normal">Podíl</th>
            <th className="py-1 text-right font-normal">Ø DPS zbraní</th>
          </tr>
        </thead>
        <tbody>
          {RARITY_ORDER.map((rarity) => (
            <tr key={rarity} className="border-t border-border/60">
              <td className={`py-1 ${RARITY_CLASSES[rarity]}`}>{RARITY_LABEL[rarity]}</td>
              <td className="py-1 text-right">{((result.byRarity[rarity] / totalItems) * 100).toFixed(1)}%</td>
              <td className="py-1 text-right">
                {result.dpsCountByRarity[rarity] > 0 ? Math.round(result.avgDpsByRarity[rarity]) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {result.topWeapons.length > 0 ? (
        <div>
          <h3 className="mb-1 text-xs font-medium text-subtle">TOP 5 zbraní (DPS)</h3>
          <ul className="space-y-1 text-xs">
            {result.topWeapons.map((w, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className={`truncate ${RARITY_CLASSES[w.rarity]}`}>{w.name}</span>
                <span className="shrink-0 font-mono tabular-nums text-muted">{Math.round(w.dps)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <ImpactOverview content={content} />
    </div>
  );
}

const ABILITY_IMPACT: Record<string, string> = {
  shockwave: "plošný zásah kolem hráče",
  grenade: "projektil + střepiny",
  timestop: "slow 0,28×",
  orbitals: "DPS aura",
  shield: "imunita",
  blink: "teleport + ráz",
  drone: "DPS spojenec",
  lightning: "řetězový zásah",
  well: "kontrola + DoT",
  overclock: "kadence ×1,55",
  mirror: "dvojité střely",
};

const PASSIVE_IMPACT: Record<string, { use: string; format: "integer" | "percent" | "none" }> = {
  vitality: { use: "+max HP", format: "integer" },
  haste: { use: "× rychlost", format: "percent" },
  magnet: { use: "+dosah sběru", format: "integer" },
  ricochet: { use: "+odraz", format: "integer" },
  extraPellet: { use: "+projektil", format: "integer" },
  vampirism: { use: "zlomek dmg → HP", format: "percent" },
  dashBattery: { use: "+nabití", format: "integer" },
  reloadKill: { use: "kill → plný zásobník", format: "none" },
  frostbite: { use: "šance na 1,2 s mráz", format: "percent" },
  overloaded: { use: "× kadence", format: "percent" },
  splinter: { use: "šance split", format: "percent" },
    thickSkin: { use: "− dmg (cap 30 %)", format: "percent" },
};

/** Dopad schopností/pasivek při raritách + kontrola shody popisu se simulací (§3.3). */
function ImpactOverview({ content }: { content: GameContentCatalogs }) {
  const qMythic = rarityMult("mythic");
  const fmtVal = (v: number, format: "integer" | "percent" | "none") =>
    format === "percent" ? `${Math.round(v * 100)}%` : format === "integer" ? `${Math.round(v)}` : "—";
  return (
    <details className="rounded-xl border border-border bg-elevated">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2">
        <span className="text-sm font-medium">Dopad při raritách</span>
        <span className="shrink-0 text-xs text-muted">common → mythic</span>
      </summary>
      <div className="space-y-3 border-t border-border p-3">
        <div>
          <h3 className="mb-1 text-xs font-medium text-subtle">Schopnosti (dmg / obnova)</h3>
          <table className="w-full text-xs tabular-nums">
            <tbody>
              {content.abilities.map((a) => (
                <tr key={a.id} className="border-t border-border/60">
                  <td className="py-1 pr-1">
                    <span className="block truncate">{a.names[0] || a.id}</span>
                    <span className="block text-[11px] text-subtle">{ABILITY_IMPACT[a.kind] ?? a.kind}</span>
                  </td>
                  <td className="py-1 text-right">
                    {Math.round(a.damage[0])}–{Math.round(a.damage[1])} →{" "}
                    {Math.round(a.damage[0] * (1 + qMythic * 0.18))}–{Math.round(a.damage[1] * (1 + qMythic * 0.18))}
                  </td>
                  <td className="py-1 text-right">
                    {a.cooldown[0].toFixed(1)}s → {(a.cooldown[0] * (1 - qMythic * 0.06)).toFixed(1)}s
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h3 className="mb-1 text-xs font-medium text-subtle">Pasivky (hodnota + kontrola popisu)</h3>
          <table className="w-full text-xs tabular-nums">
            <tbody>
              {content.passives.map((p) => {
                const expected = PASSIVE_IMPACT[p.kind]?.format;
                const mismatch = expected !== undefined && expected !== p.valueFormat;
                return (
                  <tr key={p.id} className="border-t border-border/60">
                    <td className="py-1 pr-1">
                      <span className="block truncate">{p.name || p.id}</span>
                      <span className="block text-[11px] text-subtle">{PASSIVE_IMPACT[p.kind]?.use ?? p.kind}</span>
                      {mismatch ? (
                        <span className="block text-[11px] text-danger">
                          ✕ formát má být {expected}, je {p.valueFormat}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-1 text-right">
                      {fmtVal(p.range[0], p.valueFormat)}–{fmtVal(p.range[1], p.valueFormat)} →{" "}
                      {fmtVal(p.range[0] * (1 + qMythic * 0.15), p.valueFormat)}–
                      {fmtVal(p.range[1] * (1 + qMythic * 0.15), p.valueFormat)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  );
}

function DifficultyEditor({
  difficulty,
  onChange,
  onReset,
}: {
  difficulty: DifficultySettings;
  onChange: (patch: Partial<DifficultySettings>) => void;
  onReset: () => void;
}) {
  const preview = [1, 10, 20, 30].map((level) => ({ level, d: difficultyForLevel(level, difficulty) }));
  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted">Křivka HP / poškození / rychlosti. Změny se projeví okamžitě i ve hře.</p>
        <button
          type="button"
          onClick={onReset}
          className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-border px-3 text-xs text-muted"
        >
          <RotateCcw className="size-3.5" /> Výchozí
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {DIFFICULTY_FIELDS.map(({ key, label, step }) => (
          <NumericField
            key={key}
            label={label}
            value={difficulty[key]}
            step={step}
            max={9999}
            onChange={(value) => onChange({ [key]: value })}
          />
        ))}
      </div>
      <table className="w-full text-xs tabular-nums">
        <thead>
          <tr className="text-left text-subtle">
            <th className="py-1 font-normal">LVL</th>
            <th className="py-1 text-right font-normal">HP ×</th>
            <th className="py-1 text-right font-normal">DMG ×</th>
            <th className="py-1 text-right font-normal">SPD ×</th>
          </tr>
        </thead>
        <tbody>
          {preview.map(({ level, d }) => (
            <tr key={level} className="border-t border-border/60">
              <td className="py-1">{level}</td>
              <td className="py-1 text-right">{d.hpMult.toFixed(2)}</td>
              <td className="py-1 text-right">{d.dmgMult.toFixed(2)}</td>
              <td className="py-1 text-right">{d.speedMult.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CatalogData({
  weights,
  content,
  onReplaceAll,
}: {
  weights: RarityWeights;
  content: GameContentCatalogs;
  onReplaceAll: (content: GameContentCatalogs, weights: RarityWeights | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [report, setReport] = useState<CatalogReport | null>(null);
  const [pending, setPending] = useState<ParsedCatalogs | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  function download() {
    const blob = new Blob([serializeCatalogs(content, weights)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vaultbreak-katalog.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function loadFile(file: File) {
    setImportError(null);
    setPending(null);
    try {
      const parsed = parseImportedCatalogs(JSON.parse(await file.text()));
      if (!parsed) {
        setImportError("Soubor nemá platný formát (chybí schopnosti, pasivky nebo zbraně).");
        return;
      }
      setPending(parsed);
      setReport(validateCatalogs(parsed.content, parsed.weights ?? undefined));
    } catch {
      setImportError("Soubor není platný JSON.");
    }
  }

  return (
    <div className="mt-3 space-y-3">
      <p className="text-xs text-muted">
        Export stáhne celý katalog (schopnosti, pasivky, zbraně, místnosti + váhy rarit) jako JSON. Import soubor
        zkontroluje a před nahrazením ukáže výsledek.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={download}
          className="flex h-11 items-center gap-2 rounded-lg bg-accent px-4 text-xs font-semibold text-accent-fg"
        >
          <Download className="size-4" /> Exportovat JSON
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-11 items-center gap-2 rounded-lg border border-border px-4 text-xs font-medium"
        >
          <Upload className="size-4" /> Importovat JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void loadFile(file);
          }}
        />
        <button
          type="button"
          onClick={() => {
            setPending(null);
            setImportError(null);
            setReport(validateCatalogs(content, weights));
          }}
          className="flex h-11 items-center rounded-lg border border-border px-4 text-xs font-medium text-muted"
        >
          Zkontrolovat aktuální
        </button>
      </div>

      {importError ? <p className="text-xs text-danger">{importError}</p> : null}

      {pending ? (
        <div className="rounded-xl border border-accent bg-elevated p-3 text-xs">
          <p className="font-medium">
            Import: {pending.content.abilities.length} schopností, {pending.content.passives.length} pasivek,{" "}
            {pending.content.weapons.length} zbraní, {pending.content.affixes.length} affixů,{" "}
            {pending.content.uniques.length} unikátů{pending.weights ? " + váhy rarit" : ""}.
          </p>
          {Object.values(pending.dropped).some((n) => n > 0) ? (
            <p className="mt-1 text-muted">
              Zahozeno neplatných: schopnosti {pending.dropped.abilities}, pasivky {pending.dropped.passives}, zbraně{" "}
              {pending.dropped.weapons}, affixy {pending.dropped.affixes}, unikáty {pending.dropped.uniques}.
            </p>
          ) : null}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                onReplaceAll(pending.content, pending.weights);
                setPending(null);
              }}
              className="flex h-10 items-center rounded-lg bg-accent px-4 text-xs font-semibold text-accent-fg"
            >
              Nahradit katalog
            </button>
            <button
              type="button"
              onClick={() => {
                setPending(null);
                setReport(null);
              }}
              className="flex h-10 items-center rounded-lg border border-border px-4 text-xs"
            >
              Zrušit
            </button>
          </div>
        </div>
      ) : null}

      {report ? (
        <div className="space-y-1 text-xs">
          {report.errors.length === 0 && report.warnings.length === 0 ? (
            <p className="text-muted">Katalog je v pořádku, žádné nálezy.</p>
          ) : null}
          {report.errors.map((e, i) => (
            <p key={`e${i}`} className="text-danger">
              ✕ {e}
            </p>
          ))}
          {report.warnings.map((w, i) => (
            <p key={`w${i}`} className="text-muted">
              ⚠ {w}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
