import { useState, type ReactNode } from "react";
import { KIND_META, MOLDS, INKS, type InkId, type MoldId, type PostCard } from "@/lib/entrelinhas/model";
import { kindLabel, useLang } from "@/lib/entrelinhas/i18n";
import { translateLines } from "@/lib/entrelinhas/translate";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Monogram({ name, className }: { name: string; className?: string }) {
  const letter = (name.trim().charAt(0) || "?").toUpperCase();
  return <span className={cx("monogram", className)}>{letter}</span>;
}

export function Portrait({ name, src, className }: { name: string; src?: string; className?: string }) {
  if (src) return <img className={cx("portrait", className || "size-10")} src={src} alt="" />;
  return <Monogram name={name} className={className} />;
}

export function BookPage({
  post,
  tight = false,
  leaf = false,
  onAuthor,
  footer,
}: {
  post: PostCard;
  tight?: boolean;
  leaf?: boolean;
  onAuthor?: () => void;
  footer?: ReactNode;
}) {
  const { lang, t } = useLang();
  const signature = post.citedAuthor || post.penName || post.displayName;
  const page = (
    <>
      <p className="font-sans text-xs tracking-[0.16em] uppercase text-ink-soft">{kindLabel(t, post.kind)}</p>
      {post.kind === "musica" && post.songTitle ? (
        <header className="mt-2">
          <h3 className="font-serif text-xl leading-tight text-balance">{post.songTitle}</h3>
          <p className="mt-1 text-sm text-ink-soft">{post.artist}</p>
        </header>
      ) : post.title ? (
        <h3 className="mt-2 font-serif text-xl leading-tight text-balance">{post.title}</h3>
      ) : null}
      <div className="ornament" aria-hidden="true" />
      <Verse text={post.body} cover={Boolean(post.coverData)} align={post.align} target={lang} label={t("translate")} back={t("showOriginal")} />
      {post.coverData ? (
        <img className="cover-stamp" src={post.coverData} alt={`Foto enviada por @${post.handle}`} />
      ) : null}
      <footer className={post.align === "center" ? "mt-4 text-center" : "mt-4"}>
        <p className="font-serif italic">— {signature}</p>
        {post.citedAuthor ? (
          <p className="mt-1 font-sans text-xs text-ink-soft">citado por @{post.handle}</p>
        ) : leaf ? null : (
          <p className="mt-1 font-sans text-xs text-ink-soft">@{post.handle}</p>
        )}
      </footer>
    </>
  );
  return (
    <div className={cx("book", `mold-${post.moldId}`, `ink-${post.inkId}`, tight && "scale-[0.98]")}>
      <div className="spine" aria-hidden="true" />
      <article className="page-sheet">
        {post.saved ? <span className="ribbon" aria-hidden="true" /> : null}
        {leaf ? (
          <>
            {onAuthor ? (
              <button type="button" className="leaf-who" onClick={onAuthor}>
                <Portrait name={post.penName || post.displayName} src={post.avatarData} className="size-9" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{post.penName || post.displayName}</span>
                  <span className="block truncate text-xs text-ink-soft">@{post.handle}</span>
                </span>
              </button>
            ) : null}
            <div className="leaf-stage">{page}</div>
            {footer}
          </>
        ) : (
          page
        )}
      </article>
    </div>
  );
}

function Verse({
  text,
  cover,
  align,
  target,
  label,
  back,
}: {
  text: string;
  cover: boolean;
  align: string;
  target: string;
  label: string;
  back: string;
}) {
  const [alt, setAlt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState(false);

  async function go() {
    if (alt) {
      setAlt(null);
      return;
    }
    setBusy(true);
    setFail(false);
    const res = await translateLines({ data: { target: target === "pt" ? "en" : target, texts: [text] } }).catch(() => null);
    setBusy(false);
    if (!res?.ok || !res.lines[0] || res.lines[0] === text) {
      setFail(true);
      return;
    }
    setAlt(res.lines[0]);
  }

  return (
    <>
      <p className={cx("verse", align === "center" ? "align-center" : "align-left", cover && "verse-with-cover")}>{alt ?? text}</p>
      <button type="button" className="translate-btn" onClick={() => void go()}>
        {busy ? "…" : alt ? back : label}
        {target === "pt" && !alt ? " · EN" : ""}
      </button>
      {fail ? <p className="text-xs text-ink-soft">…</p> : null}
    </>
  );
}

export function MoldPicker({ value, onChange }: { value: MoldId; onChange: (id: MoldId) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {MOLDS.map((mold) => (
        <button
          key={mold.id}
          type="button"
          className={cx("mold-pick tap", `swatch-${mold.id}`, value === mold.id && "on")}
          onClick={() => onChange(mold.id)}
        >
          {mold.short}
        </button>
      ))}
    </div>
  );
}

export function InkPicker({ value, onChange }: { value: InkId; onChange: (id: InkId) => void }) {
  return (
    <div className="flex gap-2">
      {INKS.map((ink) => (
        <button
          key={ink.id}
          type="button"
          className={cx("chip-ink tap", value === ink.id && "on")}
          onClick={() => onChange(ink.id)}
        >
          {ink.name}
        </button>
      ))}
    </div>
  );
}
