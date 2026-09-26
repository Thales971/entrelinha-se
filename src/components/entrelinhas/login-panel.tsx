import { useState } from "react";
import { authClient, GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { LangSwitch, say, useLang } from "@/lib/entrelinhas/i18n";
import { Lamp } from "@/components/entrelinhas/lamp";

const BEARER_KEY = "grok-auth.bearer-token";

function mapAuthError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid email") || m.includes("invalid password") || m.includes("invalid email or password")) {
    return "E-mail ou senha não batem.";
  }
  if (m.includes("already") || m.includes("exists")) return "Já existe um caderno com esse e-mail.";
  if (m.includes("password")) return "A senha precisa ter pelo menos 8 caracteres.";
  if (m.includes("origin")) return "Não deu pra entrar daqui. Tenta de novo.";
  return "Não deu pra entrar agora. Tenta de novo.";
}

async function authFetch(path: string, body: Record<string, string>) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const token = res.headers.get("set-auth-token");
  if (token) sessionStorage.setItem(BEARER_KEY, token);
  const json = (await res.json().catch(() => null)) as { message?: string; token?: string } | null;
  if (json?.token) sessionStorage.setItem(BEARER_KEY, json.token);
  if (!res.ok) throw new Error(mapAuthError(json?.message || ""));
  await authClient.getSession().catch(() => undefined);
  window.location.assign("/");
}

export function OpenBook() {
  return (
    <div className="open-book" aria-hidden="true">
      <div className="open-leaf left">
        <p className="open-word">entre</p>
        <span className="ink-stroke" />
        <span className="ink-stroke short" />
        <span className="ink-stroke mid" />
      </div>
      <div className="open-gutter" />
      <div className="open-leaf right">
        <p className="open-word">linha</p>
        <span className="ink-stroke" />
        <span className="ink-stroke short" />
        <span className="seal-dot" />
      </div>
    </div>
  );
}

export function Boot() {
  const { t } = useLang();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center text-cream">
      <OpenBook />
      <p className="font-serif text-lg text-cream">{t("opening")}</p>
    </div>
  );
}

export function LoginPanel() {
  const { t } = useLang();
  const [mode, setMode] = useState<"in" | "up">("up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.includes("@") || password.length < 8) {
      setError(t("errEmail"));
      return;
    }
    if (mode === "up" && name.trim().length < 2) {
      setError(t("errName"));
      return;
    }
    if (mode === "up" && !terms) {
      setError(t("errTerms"));
      return;
    }
    setBusy(true);
    try {
      if (mode === "up") {
        await authFetch("/api/auth/sign-up/email", {
          email: email.trim(),
          password,
          name: name.trim(),
        });
      } else {
        await authFetch("/api/auth/sign-in/email", { email: email.trim(), password });
      }
    } catch (err) {
      setError(say(t, err instanceof Error ? err.message : t("errEnter")));
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto px-5 py-6 text-cream">
      <div className="flex items-start justify-between gap-3">
        <p className="pt-2 text-xs tracking-[0.18em] uppercase text-cream/70">{t("pocket")}</p>
        <div className="flex items-center gap-2">
          <Lamp />
          <LangSwitch />
        </div>
      </div>
      <div className="mt-4">
        <OpenBook />
      </div>
      <h1 className="mt-4 text-center font-serif text-[2.4rem] leading-none tracking-tight">entrelinha-se</h1>
      <p className="mx-auto mt-2 max-w-sm text-center font-serif text-lg leading-snug text-cream/85">{t("tagline")}</p>

      <div className="mt-6 flex gap-2">
        <button type="button" className={mode === "up" ? "chip chip-on" : "chip"} onClick={() => setMode("up")}>
          {t("signUp")}
        </button>
        <button type="button" className={mode === "in" ? "chip chip-on" : "chip"} onClick={() => setMode("in")}>
          {t("signIn")}
        </button>
      </div>

      <form onSubmit={submit} className="mt-5 space-y-3">
        {mode === "up" ? (
          <input className="field" placeholder={t("namePh")} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        ) : null}
        <input className="field" placeholder={t("emailPh")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <input className="field" placeholder={t("passwordPh")} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "up" ? "new-password" : "current-password"} />
        {mode === "up" ? (
          <label className="flex items-start gap-3 text-sm text-cream/90">
            <input type="checkbox" className="mt-1 size-4" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
            <span>
              {t("accept")}{" "}
              <button type="button" className="underline" onClick={() => setShowTerms((v) => !v)}>
                {t("read")}
              </button>
            </span>
          </label>
        ) : null}
        {showTerms ? (
          <ul className="space-y-2 rounded-2xl bg-paper p-4 text-sm text-ink">
            {(["term1", "term2", "term3", "term4", "term5"] as const).map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
        ) : null}
        {error ? <p className="text-sm text-cream">{error}</p> : null}
        <button className="seal-btn w-full" type="submit" disabled={busy}>
          {busy ? t("openingBtn") : mode === "up" ? t("createBook") : t("enter")}
        </button>
      </form>

      <p className="my-4 text-center text-xs tracking-[0.14em] uppercase text-cream/60">{t("or")}</p>
      <div className="space-y-2">
        {GROK_PROVIDERS.map((provider) => (
          <button
            key={provider.providerId}
            type="button"
            className="paper-btn w-full"
            onClick={() => void signIn(provider.providerId, { callbackURL: "/" })}
          >
            {t("continueWith")} {provider.label}
          </button>
        ))}
      </div>
    </div>
  );
}
