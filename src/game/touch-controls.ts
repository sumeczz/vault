export type TouchControlSize = "compact" | "normal" | "large";
export type TouchControlOpacity = "low" | "medium" | "high";
export type TouchControlHandedness = "right" | "left";

export type TouchUiSettings = {
  size: TouchControlSize;
  opacity: TouchControlOpacity;
  handedness: TouchControlHandedness;
};

export const DEFAULT_TOUCH_UI_SETTINGS: Readonly<TouchUiSettings> = {
  size: "normal",
  opacity: "medium",
  handedness: "right",
};

const SIZES = new Set<TouchControlSize>(["compact", "normal", "large"]);
const OPACITIES = new Set<TouchControlOpacity>(["low", "medium", "high"]);
const HANDEDNESSES = new Set<TouchControlHandedness>(["right", "left"]);

export function parseTouchUiSettings(raw: string | null): TouchUiSettings {
  if (!raw) return { ...DEFAULT_TOUCH_UI_SETTINGS };
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return { ...DEFAULT_TOUCH_UI_SETTINGS };
    const candidate = value as Record<string, unknown>;
    return {
      size: SIZES.has(candidate.size as TouchControlSize)
        ? (candidate.size as TouchControlSize)
        : DEFAULT_TOUCH_UI_SETTINGS.size,
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
