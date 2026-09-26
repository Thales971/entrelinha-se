import { useState } from "react";
import type { AppUser } from "@/lib/auth/use-current-user";
import { saveProfile } from "@/lib/entrelinhas/api";
import { MOLDS, TERMS, slugHandle, type InkId, type MoldId } from "@/lib/entrelinhas/model";
import { InkPicker, MoldPicker } from "@/components/entrelinhas/book-page";

export function Onboarding({ user, onDone }: { user: AppUser; onDone: () => void }) {
  const suggested = slugHandle(user.displayName || user.primaryEmail?.split("@")[0] || "leitor");
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [penName, setPenName] = useState(user.displayName || "");
  const [handle, setHandle] = useState(suggested.length >= 3 ? suggested : "leitor");
  const [moldId, setMoldId] = useState<MoldId>("creme");
  const [inkId, setInkId] = useState<InkId>("sepia");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await saveProfile({
      data: {
        handle,
        displayName,
        penName,
        bio: "",
        moldId,
        inkId,
        noteText: "",
        acceptTerms: terms,
      },
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={submit} className="flex h-full flex-col overflow-y-auto bg-paper px-5 py-6 text-ink">
      <p className="text-xs tracking-[0.16em] uppercase text-ink-soft">primeira página</p>
      <h1 className="mt-1 font-serif text-4xl leading-none text-balance">Como você assina?</h1>
      <p className="mt-2 text-sm text-ink-soft">Isso aparece embaixo do verso. O @ é o seu lugar na estante.</p>
      <div className="mt-5 space-y-3">
        <input className="field" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nome" />
        <input className="field" value={penName} onChange={(e) => setPenName(e.target.value)} placeholder="Nome de pena" />
        <input className="field" value={handle} onChange={(e) => setHandle(slugHandle(e.target.value))} placeholder="usuario" />
        <p className="text-xs text-ink-soft">@{handle || "usuario"}</p>
        <p className="pt-2 text-sm font-semibold">Molde do livro</p>
        <MoldPicker value={moldId} onChange={setMoldId} />
        <InkPicker value={inkId} onChange={setInkId} />
        <label className="flex items-start gap-3 pt-2 text-sm">
          <input className="mt-1 size-4" type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
          <span>Li e aceito as regras do caderno.</span>
        </label>
        <ul className="space-y-1 text-sm text-ink-soft">
          {TERMS.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {error ? <p className="text-sm text-seal">{error}</p> : null}
        <button className="seal-btn w-full" type="submit" disabled={busy}>
          {busy ? "Guardando…" : "Entrar na estante"}
        </button>
        <p className="text-center text-xs text-ink-soft">{MOLDS.find((m) => m.id === moldId)?.name}</p>
      </div>
    </form>
  );
}
