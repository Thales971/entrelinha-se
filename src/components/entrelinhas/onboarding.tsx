import { useState } from "react";
import type { AppUser } from "@/lib/auth/use-current-user";
import { saveProfile } from "@/lib/entrelinhas/api";
import { MOLDS, slugHandle, type InkId, type MoldId } from "@/lib/entrelinhas/model";
import { LangSwitch, useLang } from "@/lib/entrelinhas/i18n";
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
  const { t } = useLang();

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
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs tracking-[0.16em] uppercase text-ink-soft">{t("firstPage")}</p>
        <LangSwitch ink />
      </div>
      <h1 className="mt-1 font-serif text-4xl leading-none text-balance">{t("howSign")}</h1>
      <p className="mt-2 text-sm text-ink-soft">{t("signHint")}</p>
      <div className="mt-5 space-y-3">
        <input className="field" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t("namePh")} />
        <input className="field" value={penName} onChange={(e) => setPenName(e.target.value)} placeholder={t("penName")} />
        <input className="field" value={handle} onChange={(e) => setHandle(slugHandle(e.target.value))} placeholder={t("userPh")} />
        <p className="text-xs text-ink-soft">@{handle || "usuario"}</p>
        <p className="pt-2 text-sm font-semibold">{t("mold")}</p>
        <MoldPicker value={moldId} onChange={setMoldId} />
        <InkPicker value={inkId} onChange={setInkId} />
        <label className="flex items-start gap-3 pt-2 text-sm">
          <input className="mt-1 size-4" type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
          <span>{t("accept")}</span>
        </label>
        <ul className="space-y-1 text-sm text-ink-soft">
          {(["term1", "term2", "term3", "term4", "term5"] as const).map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
        {error ? <p className="text-sm text-seal">{error}</p> : null}
        <button className="seal-btn w-full" type="submit" disabled={busy}>
          {busy ? t("saving") : t("enterShelf")}
        </button>
        <p className="text-center text-xs text-ink-soft">{MOLDS.find((m) => m.id === moldId)?.name}</p>
      </div>
    </form>
  );
}
