import { useState } from "react";
import { authClient, GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { TERMS } from "@/lib/entrelinhas/model";

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

export function Boot() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-8 text-center text-paper">
      <div className="boot-book">
        <p className="font-serif text-xl leading-none tracking-tight">entrelinha-se</p>
        <p className="mt-2 text-xs tracking-[0.14em] uppercase text-ink-soft">caderno aberto</p>
      </div>
      <p className="font-serif text-lg text-paper">Abrindo o caderno…</p>
    </div>
  );
}

export function LoginPanel() {
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
      setError("Usa um e-mail válido e uma senha com 8 caracteres ou mais.");
      return;
    }
    if (mode === "up" && name.trim().length < 2) {
      setError("Como a gente te chama?");
      return;
    }
    if (mode === "up" && !terms) {
      setError("Aceita as regras do caderno pra criar a conta.");
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
      setError(err instanceof Error ? err.message : "Não deu pra entrar.");
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto px-5 py-8 text-paper">
      <p className="text-xs tracking-[0.18em] uppercase text-paper/70">um livro no bolso</p>
      <h1 className="mt-2 font-serif text-[2.65rem] leading-none tracking-tight">entrelinha-se</h1>
      <p className="mt-3 max-w-sm font-serif text-lg leading-snug text-paper/85">
        Feed pra ler sentado. Folhear pra frase curta. A página continua sendo um livro.
      </p>

      <div className="mt-6 flex gap-2">
        <button type="button" className={mode === "up" ? "chip chip-on" : "chip"} onClick={() => setMode("up")}>
          Criar conta
        </button>
        <button type="button" className={mode === "in" ? "chip chip-on" : "chip"} onClick={() => setMode("in")}>
          Entrar
        </button>
      </div>

      <form onSubmit={submit} className="mt-5 space-y-3">
        {mode === "up" ? (
          <input className="field" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        ) : null}
        <input className="field" placeholder="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <input className="field" placeholder="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "up" ? "new-password" : "current-password"} />
        {mode === "up" ? (
          <label className="flex items-start gap-3 text-sm text-paper/90">
            <input type="checkbox" className="mt-1 size-4" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
            <span>
              Li e aceito as regras do caderno.{" "}
              <button type="button" className="underline" onClick={() => setShowTerms((v) => !v)}>
                Ler
              </button>
            </span>
          </label>
        ) : null}
        {showTerms ? (
          <ul className="space-y-2 rounded-2xl bg-paper p-4 text-sm text-ink">
            {TERMS.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
        {error ? <p className="text-sm text-paper">{error}</p> : null}
        <button className="seal-btn w-full" type="submit" disabled={busy}>
          {busy ? "Abrindo…" : mode === "up" ? "Criar meu caderno" : "Entrar"}
        </button>
      </form>

      <p className="my-4 text-center text-xs tracking-[0.14em] uppercase text-paper/60">ou</p>
      <div className="space-y-2">
        {GROK_PROVIDERS.map((provider) => (
          <button
            key={provider.providerId}
            type="button"
            className="paper-btn w-full"
            onClick={() => void signIn(provider.providerId, { callbackURL: "/" })}
          >
            Continuar com {provider.label}
          </button>
        ))}
      </div>
    </div>
  );
}
