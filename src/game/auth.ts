const PROFILE_KEY = "vaultbreak-profile-v1";
const DEVICE_KEY = "vaultbreak-device-id-v1";

export type Profile = {
  nickname: string;
  pin: string;
  createdAt: number;
  lastLoginAt: number;
  deviceId: string;
};

export type AuthMode = "register" | "login";

function deviceId(): string {
  if (typeof localStorage === "undefined") return "dev";
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)) + "-" + Date.now().toString(36);
    try {
      localStorage.setItem(DEVICE_KEY, id);
    } catch {
      /* ignore quota */
    }
  }
  return id;
}

export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Profile>;
    if (!p.nickname || !p.pin || !p.deviceId) return null;
    return {
      nickname: String(p.nickname),
      pin: String(p.pin),
      createdAt: Number(p.createdAt) || Date.now(),
      lastLoginAt: Number(p.lastLoginAt) || Date.now(),
      deviceId: String(p.deviceId),
    };
  } catch {
    return null;
  }
}

export function saveProfile(p: Profile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {
    /* ignore quota */
  }
}

export function createProfile(nickname: string, pin: string): Profile {
  const now = Date.now();
  return {
    nickname: nickname.trim(),
    pin,
    createdAt: now,
    lastLoginAt: now,
    deviceId: deviceId(),
  };
}

export function verifyPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

export function verifyNickname(nick: string): boolean {
  const trimmed = nick.trim();
  return trimmed.length >= 2 && trimmed.length <= 16 && /^[A-Za-z0-9_ěščřžýáíéůú\s-]+$/.test(trimmed);
}

export function authenticate(pin: string): boolean {
  const profile = loadProfile();
  if (!profile) return false;
  if (profile.pin !== pin) return false;
  profile.lastLoginAt = Date.now();
  saveProfile(profile);
  return true;
}

export function getProfileNickname(): string | null {
  const p = loadProfile();
  return p ? p.nickname : null;
}
