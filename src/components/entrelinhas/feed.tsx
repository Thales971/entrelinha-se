import { useEffect, useState } from "react";
import { Bookmark, Download, Heart, MessageCircle, Plus, Repeat2, Search } from "lucide-react";
import { listFeed, listStoryTray, toggleLike, toggleRepost, toggleSave } from "@/lib/entrelinhas/api";
import { ago, type PostCard, type TrayPerson } from "@/lib/entrelinhas/model";
import { BookPage, Portrait, cx } from "@/components/entrelinhas/book-page";
import { useDesk } from "@/components/entrelinhas/desk";
import { useLang } from "@/lib/entrelinhas/i18n";
import { downloadPage } from "@/lib/entrelinhas/export-page";

export function PageActions({ post, layout = "row", tone = "paper" }: { post: PostCard; layout?: "row" | "rail"; tone?: "paper" | "ink" }) {
  const [liked, setLiked] = useState(post.liked);
  const [count, setCount] = useState(post.likeCount);
  const [saved, setSaved] = useState(post.saved);
  const [reposted, setReposted] = useState(post.reposted);
  const [reposts, setReposts] = useState(post.repostCount);
  const [note, setNote] = useState("");
  const desk = useDesk();
  const mine = post.userId === desk.meId;

  useEffect(() => {
    setLiked(post.liked);
    setCount(post.likeCount);
    setSaved(post.saved);
    setReposted(post.reposted);
    setReposts(post.repostCount);
  }, [post.id, post.liked, post.likeCount, post.saved, post.reposted, post.repostCount, post.reposterHandle]);

  async function like() {
    const next = !liked;
    setLiked(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    const res = await toggleLike({ data: { id: post.id } });
    if (!res.ok) {
      setLiked(!next);
      setCount((c) => Math.max(0, c + (next ? -1 : 1)));
      setNote(res.error);
      return;
    }
    setLiked(res.liked);
    setCount(res.likeCount);
    setNote("");
    if (next && navigator.vibrate) navigator.vibrate(12);
  }

  async function save() {
    const next = !saved;
    setSaved(next);
    const res = await toggleSave({ data: { id: post.id } });
    if (!res.ok) {
      setSaved(!next);
      setNote(res.error);
      return;
    }
    setSaved(res.saved);
    setNote(res.saved ? "Na fita." : "");
  }

  async function repost() {
    const next = !reposted;
    setReposted(next);
    setReposts((c) => Math.max(0, c + (next ? 1 : -1)));
    const res = await toggleRepost({ data: { id: post.id } });
    if (!res.ok) {
      setReposted(!next);
      setReposts((c) => Math.max(0, c + (next ? -1 : 1)));
      setNote(res.error);
      return;
    }
    setReposted(res.reposted);
    setReposts(res.repostCount);
    setNote(res.reposted ? "Repassada." : "");
  }

  const item = layout === "rail" ? "rail-btn" : `tap flex min-h-11 items-center gap-1 px-1 ${tone === "ink" ? "text-ink" : "text-cream"}`;
  return (
    <div className={layout === "rail" ? "flex flex-col gap-3" : "mt-2"}>
      <div className={layout === "rail" ? "flex flex-col gap-3" : "flex items-center gap-1"}>
        <button type="button" className={item} onClick={() => void like()} aria-pressed={liked} aria-label="Curtir">
          <Heart className={cx("size-5", liked && "fill-seal text-seal")} />
          {layout === "row" ? <span className="tabular-nums text-sm">{count}</span> : null}
        </button>
        <button type="button" className={item} onClick={() => void save()} aria-pressed={saved} aria-label="Guardar na fita">
          <Bookmark className={cx("size-5", saved && "fill-seal text-seal")} />
        </button>
        {mine ? null : (
          <button type="button" className={item} onClick={() => void repost()} aria-pressed={reposted} aria-label="Republicar">
            <Repeat2 className={cx("size-5", reposted && "text-seal")} />
            {layout === "row" ? <span className="tabular-nums text-sm">{reposts}</span> : null}
          </button>
        )}
        {layout === "rail" ? (
          <button type="button" className={item} aria-label="Comentários" onClick={() => desk.openPost(post.id)}>
            <MessageCircle className="size-5" />
          </button>
        ) : null}
        {layout === "rail" ? (
          <button type="button" className={item} aria-label="Guardar imagem da página" onClick={() => void downloadPage(post)}>
            <Download className="size-5" />
          </button>
        ) : null}
        {layout === "row" ? (
          <button type="button" className={`tap grid size-11 place-items-center ${tone === "ink" ? "text-ink" : "text-cream"}`} aria-label="Guardar imagem da página" onClick={() => void downloadPage(post)}>
            <Download className="size-5" />
          </button>
        ) : null}
      </div>
      {note ? <p className={cx("text-xs", layout === "rail" ? "sr-only" : "px-1 text-cream/80")}>{note}</p> : null}
    </div>
  );
}

export function StoryTray({ tray }: { tray: TrayPerson[] }) {
  const desk = useDesk();
  const { t } = useLang();
  const mine = tray.find((p) => p.userId === desk.meId);
  return (
    <div className="flex gap-3 overflow-x-auto px-4 pb-3 pt-4 no-scrollbar">
      <button
        type="button"
        className="relative flex w-16 shrink-0 flex-col items-center"
        onClick={() => (mine?.stories.length ? desk.openStory(desk.meId) : desk.openCompose("story"))}
      >
        {mine?.note ? <span className="note-chip">{mine.note}</span> : null}
        <span className={cx("story-ring", mine?.stories.some((s) => !s.seen) && "story-ring-new")}>
          <span className="story-face">
            {mine?.avatarData ? (
              <Portrait name={mine.penName || mine.displayName} src={mine.avatarData} className="size-full" />
            ) : mine?.stories.length ? (
              (mine.penName || mine.displayName).charAt(0).toUpperCase()
            ) : (
              <Plus className="size-5" />
            )}
          </span>
        </span>
        <span className="mt-1 text-xs text-cream">{t("yours")}</span>
      </button>
      {tray.map((person) => {
        const unseen = person.stories.some((s) => !s.seen);
        const mine = person.userId === desk.meId;
        if (mine) return null;
        return (
          <button
            key={person.userId}
            type="button"
            className="relative flex w-16 shrink-0 flex-col items-center"
            onClick={() => person.stories.length && desk.openStory(person.userId)}
          >
            {person.note ? <span className="note-chip">{person.note}</span> : null}
            <span className={cx("story-ring", unseen && "story-ring-new")}>
              <span className="story-face">
                {person.avatarData ? (
                  <Portrait name={person.penName || person.displayName} src={person.avatarData} className="size-full" />
                ) : (
                  (person.penName || person.displayName).charAt(0).toUpperCase()
                )}
              </span>
            </span>
            <span className="mt-1 max-w-16 truncate text-xs text-cream">{person.handle}</span>
          </button>
        );
      })}
    </div>
  );
}

export function PostCardView({ post }: { post: PostCard }) {
  const desk = useDesk();
  return (
    <article className="page-in px-4 pb-6">
      {post.reposterHandle ? (
        <p className="mb-1 text-xs text-cream/75">Repassada por @{post.reposterHandle}</p>
      ) : null}
      <button type="button" className="mb-2 flex min-h-11 w-full items-center gap-2 text-left text-cream" onClick={() => desk.openUser(post.userId)}>
        <Portrait name={post.penName || post.displayName} src={post.avatarData} />
        <span className="min-w-0">
          <span className="block truncate font-semibold">{post.penName || post.displayName}</span>
          <span className="block text-xs text-cream/70">@{post.handle} · {ago(post.createdAt)}</span>
        </span>
      </button>
      <button type="button" className="block w-full text-left" onClick={() => desk.openPost(post.id)}>
        <BookPage post={post} />
      </button>
      <div className="flex items-center">
        <PageActions post={post} />
        <button type="button" className="tap flex min-h-11 items-center gap-1 px-2 text-cream" onClick={() => desk.openPost(post.id)}>
          <MessageCircle className="size-5" />
          <span className="tabular-nums text-sm">{post.commentCount}</span>
        </button>
      </div>
    </article>
  );
}

export function Feed({ mode }: { mode: "all" | "following" }) {
  const desk = useDesk();
  const { t } = useLang();
  const [q, setQ] = useState("");
  const [posts, setPosts] = useState<PostCard[] | null>(null);
  const [people, setPeople] = useState<{ userId: string; handle: string; displayName: string }[]>([]);
  const [tray, setTray] = useState<TrayPerson[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    const t = window.setTimeout(() => {
      listFeed({ data: { q, mode } })
        .then((res) => {
          if (!live) return;
          setPosts(res.posts);
          setPeople(res.people);
          setError("");
        })
        .catch(() => live && setError("Não deu pra abrir o feed."));
      listStoryTray()
        .then((rows) => live && setTray(rows))
        .catch(() => undefined);
    }, q ? 220 : 0);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [q, mode, desk.tick]);

  const mine = tray.find((p) => p.userId === desk.meId);

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 pt-3">
        <label className="search-pill flex items-center gap-2 rounded-full bg-paper px-3 text-ink">
          <Search className="size-4 text-ink-soft" />
          <input
            className="h-11 w-full bg-transparent outline-none"
            placeholder={t("searchPh")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </div>
      <StoryTray tray={tray} />
      {mine?.note ? <p className="px-4 pb-2 text-xs text-cream/70">Sua nota: {mine.note}</p> : null}
      {people.length ? (
        <div className="space-y-1 px-4 pb-3">
          {people.map((person) => (
            <button key={person.userId} type="button" className="flex min-h-11 w-full items-center gap-2 text-left text-cream" onClick={() => desk.openUser(person.userId)}>
              <Portrait name={person.displayName} />
              <span>
                <span className="block font-semibold">{person.displayName}</span>
                <span className="text-xs text-cream/70">@{person.handle}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {error ? <p className="px-4 text-sm text-cream">{error}</p> : null}
      {posts === null ? <p className="px-4 py-8 font-serif text-cream">{t("turning")}</p> : null}
      {posts?.length === 0 ? (
        <div className="px-6 py-10 text-cream">
          <p className="font-serif text-3xl leading-none">{t("deskClean")}</p>
          <p className="mt-2 text-cream/80">{t("deskCleanHint")}</p>
        </div>
      ) : null}
      {posts?.map((post) => (
        <PostCardView key={`${post.id}-${post.reposterHandle || "origem"}`} post={post} />
      ))}
    </div>
  );
}
