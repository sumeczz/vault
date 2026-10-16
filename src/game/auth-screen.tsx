import { useState } from "react";
import { Lock, User, Zap, ArrowLeft } from "lucide-react";
import { createProfile, authenticate, loadProfile, saveProfile, verifyNickname, verifyPin } from "./auth";

type Mode = "register" | "login";

export function AuthScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [mode, setMode] = useState<Mode>(loadProfile() ? "login" : "register");
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const profileExists = loadProfile() !== null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 300));
    try {
      if (mode === "register") {
        if (!verifyNickname(nickname)) {
          setError("Přezdívka musí mít 2–16 znaků (písmena, čísla, _ -).");
          setLoading(false);
          return;
        }
        if (!verifyPin(pin)) {
          setError("PIN musí být přesně 4 číslice.");
          setLoading(false);
          return;
        }
        if (pin !== pinConfirm) {
          setError("PINy se neshodují.");
          setLoading(false);
          return;
        }
        saveProfile(createProfile(nickname, pin));
      } else {
        if (!authenticate(pin)) {
          setError("Špatný PIN.");
          setLoading(false);
          return;
        }
      }
      onAuthenticated();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-bg/90 p-6 sm:p-10">
      <div className="vb-dialog w-full max-w-sm p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3 mb-4">
          <button
            type="button"
            onClick={() => setMode(profileExists ? "login" : "register")}
            disabled={mode === (profileExists ? "login" : "register")}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-muted transition-colors hover:border-accent disabled:opacity-40"
          >
            <ArrowLeft className="size-4" />
            {mode === "login" ? "Vytvořit účet" : "Mám účet"}
          </button>
          <div className="flex items-center gap-1.5 text-[11px] tracking-widest font-medium text-subtle uppercase">
            <Lock className="size-3.5" /> VAULT BREAK
          </div>
        </div>

        <h2 className="font-display text-2xl font-semibold mb-1">
          {mode === "register" ? "Vytvořit účet" : "Přihlásit se"}
        </h2>
        <p className="text-xs text-muted mb-6">
          {mode === "register"
            ? "Zvol si přezdívku a 4místný PIN. Účet je uložen pouze v tomto zařízení."
            : "Zadej svůj 4místný PIN pro vstup do trezoru."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "register" ? (
            <>
              <label className="flex flex-col gap-1.5 text-xs font-medium tracking-wide text-subtle uppercase">
                Přezdívka
              </label>
              <input
                autoFocus
                maxLength={16}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Hráč01"
                className="h-11 rounded-xl border border-border bg-surface px-3.5 font-mono text-sm text-fg outline-none focus:border-accent"
                disabled={loading}
              />
            </>
          ) : null}
          <label className="flex flex-col gap-1.5 text-xs font-medium tracking-wide text-subtle uppercase">
            4místný PIN
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={mode === "register" ? pin : ""}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 4);
              if (mode === "register") setPin(v);
            }}
            placeholder="····"
            className="h-11 rounded-xl border border-border bg-surface px-3.5 font-mono text-xl letter-spacing-wider text-fg outline-none focus:border-accent"
            disabled={loading}
          />
          {mode === "register" ? (
            <>
              <label className="flex flex-col gap-1.5 text-xs font-medium tracking-wide text-subtle uppercase">
                Potvrď PIN
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={pinConfirm}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setPinConfirm(v);
                }}
                placeholder="····"
                className="h-11 rounded-xl border border-border bg-surface px-3.5 font-mono text-xl letter-spacing-wider text-fg outline-none focus:border-accent"
                disabled={loading}
              />
            </>
          ) : null}
          {error ? (
            <div className="rounded-xl border border-danger/50 bg-danger/10 px-3 py-2 text-xs text-danger">
              {error}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={loading || (mode === "register" && (!nickname || !pin || !pinConfirm))}
            className="vb-btn-primary w-full disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? <Zap className="size-5 animate-spin" /> : mode === "register" ? <User className="size-5" /> : <Lock className="size-5" />}
            <span>{loading ? "Zpracovávám…" : mode === "register" ? "Vytvořit účet" : "Odemknout trezor"}</span>
          </button>
        </form>

        <p className="mt-5 text-center text-[11px] text-subtle">
          Údaje jsou uloženy lokálně v tomto prohlížeči/zařízení. Nelze je obnovit po smazání dat.
        </p>
      </div>
    </div>
  );
}
