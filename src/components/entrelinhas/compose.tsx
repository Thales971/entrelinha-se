import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { createPost, createStory } from "@/lib/entrelinhas/api";
import {
  KIND_META,
  POST_KINDS,
  type InkId,
  type MoldId,
  type PostKind,
  type Profile,
} from "@/lib/entrelinhas/model";
import { InkPicker, MoldPicker, cx } from "@/components/entrelinhas/book-page";
import { kindLabel, useLang } from "@/lib/entrelinhas/i18n";

async function fileToCover(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 240 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const first = canvas.toDataURL("image/jpeg", 0.68);
  return first.length > 110_000 ? canvas.toDataURL("image/jpeg", 0.45) : first;
}

export function Compose({
  profile,
  mode,
  initialKind,
  onClose,
  onDone,
}: {
  profile: Profile;
  mode: "post" | "story";
  initialKind?: PostKind;
  onClose: () => void;
  onDone: () => void;
}) {
  const [kind, setKind] = useState<PostKind>(initialKind ?? "poema");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [citedAuthor, setCitedAuthor] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [coverData, setCoverData] = useState("");
  const [moldId, setMoldId] = useState<MoldId>(profile.moldId);
  const [inkId, setInkId] = useState<InkId>(profile.inkId);
  const [align, setAlign] = useState<"left" | "center">(kind === "frase" || kind === "nota" ? "center" : "left");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const meta = KIND_META[kind];
  const { t } = useLang();
  const lines = body.split(/\r?\n/).filter((l) => l.trim()).length;

  async function publish() {
    setBusy(true);
    setError("");
    if (mode === "story") {
      const res = await createStory({ data: { body, moldId } });
      setBusy(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onDone();
      return;
    }
    const res = await createPost({
      data: { kind, title, body, citedAuthor, songTitle, artist, coverData, moldId, inkId, align },
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onDone();
  }

  return (
    <div className="sheet">
      <header className="flex items-center gap-2 px-3 py-3">
        <button type="button" className="tap grid size-11 place-items-center" onClick={onClose} aria-label="Fechar">
          <ChevronLeft />
        </button>
        <h2 className="font-serif text-2xl">{mode === "story" ? t("story") : t("newPage")}</h2>
      </header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-8">
        {mode === "post" ? (
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {POST_KINDS.map((item) => (
              <button
                key={item}
                type="button"
                className={cx("chip-ink shrink-0", kind === item && "on")}
                onClick={() => {
                  setKind(item);
                  if (item === "frase" || item === "nota") setAlign("center");
                }}
              >
                {kindLabel(t, item)}
              </button>
            ))}
          </div>
        ) : null}
        <p className="text-sm text-ink-soft">{mode === "story" ? t("storyHint") : meta.hint}</p>
        {mode === "post" && (kind === "poema" || kind === "reflexao") ? (
          <input className="field" placeholder="Título, se quiser" value={title} onChange={(e) => setTitle(e.target.value)} />
        ) : null}
        {mode === "post" && kind === "musica" ? (
          <>
            <input className="field" placeholder="Nome da música" value={songTitle} onChange={(e) => setSongTitle(e.target.value)} />
            <input className="field" placeholder="Artista" value={artist} onChange={(e) => setArtist(e.target.value)} />
            <p className="text-sm text-ink-soft">
              Só um trecho, até 4 linhas, escrito por você. Sem letra inteira. A foto, se mandar, é sua — não a capa oficial do álbum.
            </p>
            <label className="paper-btn inline-flex items-center">
              Foto pequena
              <input
                className="sr-only"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  void fileToCover(file).then(setCoverData);
                }}
              />
            </label>
            {coverData ? <img src={coverData} alt="" className="h-16 w-16 rounded-md object-cover" /> : null}
          </>
        ) : null}
        <textarea
          className="field field-verse"
          placeholder={mode === "story" ? "A frase da história" : "Escreve aqui"}
          value={body}
          maxLength={mode === "story" ? 140 : meta.max}
          onChange={(e) => setBody(e.target.value)}
        />
        <p className="text-xs text-ink-soft">
          {body.length}/{mode === "story" ? 140 : meta.max}
          {mode === "post" && kind === "musica" ? ` · ${lines}/4 linhas` : ""}
        </p>
        {mode === "post" && (kind === "poema" || kind === "frase") ? (
          <input className="field" placeholder="Autor citado, se não for seu" value={citedAuthor} onChange={(e) => setCitedAuthor(e.target.value)} />
        ) : null}
        <p className="text-sm font-semibold">Molde</p>
        <MoldPicker value={moldId} onChange={setMoldId} />
        {mode === "post" ? (
          <>
            <InkPicker value={inkId} onChange={setInkId} />
            <div className="flex gap-2">
              <button type="button" className={cx("chip-ink", align === "left" && "on")} onClick={() => setAlign("left")}>
                Esquerda
              </button>
              <button type="button" className={cx("chip-ink", align === "center" && "on")} onClick={() => setAlign("center")}>
                Centro
              </button>
            </div>
          </>
        ) : null}
        {error ? <p className="text-sm text-seal">{error}</p> : null}
        <button type="button" className="seal-btn w-full" disabled={busy} onClick={() => void publish()}>
          {busy ? "Publicando…" : mode === "story" ? "Publicar história" : "Publicar página"}
        </button>
      </div>
    </div>
  );
}
