export type TouchControlOpacity = "low" | "medium" | "high";
export type TouchControlHandedness = "right" | "left";

export type TouchUiSettings = {
  opacity: TouchControlOpacity;
  handedness: TouchControlHandedness;
};

export const DEFAULT_TOUCH_UI_SETTINGS: Readonly<TouchUiSettings> = {
  opacity: "medium",
  handedness: "right",
};

const OPACITIES = new Set<TouchControlOpacity>(["low", "medium", "high"]);
const HANDEDNESSES = new Set<TouchControlHandedness>(["right", "left"]);

export function parseTouchUiSettings(raw: string | null): TouchUiSettings {
  if (!raw) return { ...DEFAULT_TOUCH_UI_SETTINGS };
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return { ...DEFAULT_TOUCH_UI_SETTINGS };
    const candidate = value as Record<string, unknown>;
    return {
      opacity: OPACITIES.has(candidate.opacity as TouchControlOpacity)
        ? (candidate.opacity as TouchControlOpacity)
        : DEFAULT_TOUCH_UI_SETTINGS.opacity,
      handedness: HANDEDNESSES.has(candidate.handedness as TouchControlHandedness)
        ? (candidate.handedness as TouchControlHandedness)
        : DEFAULT_TOUCH_UI_SETTINGS.handedness,
    };
  } catch {
    return { ...DEFAULT_TOUCH_UI_SETTINGS };
  }
}
