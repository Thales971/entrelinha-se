import { useEffect, useState } from "react";
import { Download, Heart, MessageCircle, Plus, Search } from "lucide-react";
import { listFeed, listStoryTray, toggleLike } from "@/lib/entrelinhas/api";
import { ago, type PostCard, type TrayPerson } from "@/lib/entrelinhas/model";
import { BookPage, Monogram, cx } from "@/components/entrelinhas/book-page";
import { useDesk } from "@/components/entrelinhas/desk";
import { downloadPage } from "@/lib/entrelinhas/export-page";

function LikeControl({ post }: { post: PostCard }) {
  const [liked, setLiked] = useState(post.liked);
  const [count, setCount] = useState(post.likeCount);
  useEffect(() => {
    setLiked(post.liked);
    setCount(post.likeCount);
  }, [post.id, post.liked, post.likeCount]);

  async function toggle() {
    const next = !liked;
    setLiked(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    const res = await toggleLike({ data: { id: post.id } });
    if (!res.ok) {
      setLiked(!next);
      setCount((c) => Math.max(0, c + (next ? -1 : 1)));
      return;
    }
    setLiked(res.liked);
    setCount(res.likeCount);
    if (next && navigator.vibrate) navigator.vibrate(12);
  }

  return (
    <button type="button" className="tap flex min-h-11 items-center gap-1 px-1 text-paper" onClick={() => void toggle()} aria-pressed={liked}>
      <Heart className={cx("size-6", liked && "fill-seal text-seal")} />
      <span className="tabular-nums text-sm">{count}</span>
    </button>
  );
}

export function StoryTray({ tray }: { tray: TrayPerson[] }) {
  const desk = useDesk();
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
            {mine?.stories.length ? (mine.penName || mine.displayName).charAt(0).toUpperCase() : <Plus className="size-5" />}
          </span>
        </span>
        <span className="mt-1 text-xs text-paper">Sua</span>
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
              <span className="story-face">{(person.penName || person.displayName).charAt(0).toUpperCase()}</span>
            </span>
            <span className="mt-1 max-w-16 truncate text-xs text-paper">{person.handle}</span>
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
      <button type="button" className="mb-2 flex min-h-11 w-full items-center gap-2 text-left text-paper" onClick={() => desk.openUser(post.userId)}>
        <Monogram name={post.penName || post.displayName} />
        <span className="min-w-0">
          <span className="block truncate font-semibold">{post.penName || post.displayName}</span>
          <span className="block text-xs text-paper/70">@{post.handle} · {ago(post.createdAt)}</span>
        </span>
      </button>
      <button type="button" className="block w-full text-left" onClick={() => desk.openPost(post.id)}>
        <BookPage post={post} />
      </button>
      <div className="mt-2 flex items-center gap-1">
        <LikeControl post={post} />
        <button type="button" className="tap flex min-h-11 items-center gap-1 px-2 text-paper" onClick={() => desk.openPost(post.id)}>
          <MessageCircle className="size-6" />
          <span className="tabular-nums text-sm">{post.commentCount}</span>
        </button>
        <button type="button" className="tap grid size-11 place-items-center text-paper" aria-label="Guardar imagem da página" onClick={() => void downloadPage(post)}>
          <Download className="size-5" />
        </button>
      </div>
    </article>
  );
}

export function Feed({ mode }: { mode: "all" | "following" }) {
  const desk = useDesk();
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
        <label className="flex items-center gap-2 rounded-full bg-paper px-3 text-ink">
          <Search className="size-4 text-ink-soft" />
          <input
            className="h-11 w-full bg-transparent outline-none"
            placeholder="Buscar verso, nome, música"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </div>
      <StoryTray tray={tray} />
      {mine?.note ? <p className="px-4 pb-2 text-xs text-paper/70">Sua nota: {mine.note}</p> : null}
      {people.length ? (
        <div className="space-y-1 px-4 pb-3">
          {people.map((person) => (
            <button key={person.userId} type="button" className="flex min-h-11 w-full items-center gap-2 text-left text-paper" onClick={() => desk.openUser(person.userId)}>
              <Monogram name={person.displayName} />
              <span>
                <span className="block font-semibold">{person.displayName}</span>
                <span className="text-xs text-paper/70">@{person.handle}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {error ? <p className="px-4 text-sm text-paper">{error}</p> : null}
      {posts === null ? <p className="px-4 py-8 font-serif text-paper">Virando a página…</p> : null}
      {posts?.length === 0 ? (
        <div className="px-6 py-10 text-paper">
          <p className="font-serif text-3xl leading-none">A mesa está limpa.</p>
          <p className="mt-2 text-paper/80">Publica a primeira página, ou segue alguém pra encher o feed.</p>
        </div>
      ) : null}
      {posts?.map((post) => (
        <PostCardView key={post.id} post={post} />
      ))}
    </div>
  );
}
