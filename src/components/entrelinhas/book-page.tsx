import { KIND_META, MOLDS, INKS, type InkId, type MoldId, type PostCard } from "@/lib/entrelinhas/model";

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

export function BookPage({ post, tight = false }: { post: PostCard; tight?: boolean }) {
  const signature = post.citedAuthor || post.penName || post.displayName;
  return (
    <div className={cx("book", `mold-${post.moldId}`, `ink-${post.inkId}`, tight && "scale-[0.98]")}>
      <div className="spine" aria-hidden="true" />
      <article className="page-sheet">
        {post.saved ? <span className="ribbon" aria-hidden="true" /> : null}
        <p className="font-sans text-xs tracking-[0.16em] uppercase text-ink-soft">{KIND_META[post.kind].label}</p>
        {post.kind === "musica" && post.songTitle ? (
          <header className="mt-2">
            <h3 className="font-serif text-xl leading-tight text-balance">{post.songTitle}</h3>
            <p className="mt-1 text-sm text-ink-soft">{post.artist}</p>
          </header>
        ) : post.title ? (
          <h3 className="mt-2 font-serif text-xl leading-tight text-balance">{post.title}</h3>
        ) : null}
        <div className="ornament" aria-hidden="true" />
        <p className={cx("verse", post.align === "center" ? "align-center" : "align-left", post.coverData && "verse-with-cover")}>
          {post.body}
        </p>
        {post.coverData ? (
          <img className="cover-stamp" src={post.coverData} alt={`Foto enviada por @${post.handle}`} />
        ) : null}
        <footer className={cx("mt-4", post.align === "center" && "text-center")}>
          <p className="font-serif italic">— {signature}</p>
          <p className="mt-1 font-sans text-xs text-ink-soft">
            {post.citedAuthor ? `citado por @${post.handle}` : `@${post.handle}`}
          </p>
        </footer>
      </article>
    </div>
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
