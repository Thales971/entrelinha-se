import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Heart } from "lucide-react";
import { listFeed } from "@/lib/entrelinhas/api";
import type { PostCard } from "@/lib/entrelinhas/model";
import { BookPage } from "@/components/entrelinhas/book-page";
import { useDesk } from "@/components/entrelinhas/desk";
import { PageActions } from "@/components/entrelinhas/feed";
import { useLang } from "@/lib/entrelinhas/i18n";

function shortEnough(post: PostCard) {
  return post.kind === "frase" || post.kind === "nota" || post.kind === "musica" || post.body.length <= 420;
}

export function Folhear() {
  const desk = useDesk();
  const { t } = useLang();
  const [posts, setPosts] = useState<PostCard[] | null>(null);
  const [burst, setBurst] = useState<string | null>(null);
  const loves = useRef(new Map<string, () => void>());
  const lastTap = useRef(0);

  useEffect(() => {
    let live = true;
    listFeed({ data: { q: "", mode: "all" } })
      .then((res) => live && setPosts(res.posts.filter(shortEnough)))
      .catch(() => live && setPosts([]));
    return () => {
      live = false;
    };
  }, [desk.tick]);

  function tapPage(event: MouseEvent, post: PostCard) {
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, textarea, label")) return;
    const now = Date.now();
    if (now - lastTap.current < 280) {
      loves.current.get(post.id)?.();
      setBurst(post.id);
      window.setTimeout(() => setBurst((id) => (id === post.id ? null : id)), 700);
      if (navigator.vibrate) navigator.vibrate(12);
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;
  }

  if (!posts) return <p className="px-6 py-16 font-serif text-2xl text-cream">{t("browsing")}</p>;
  if (!posts.length) {
    return (
      <div className="flex h-full flex-col justify-end px-6 pb-10 text-cream">
        <p className="font-serif text-4xl leading-none">{t("nothingShort")}</p>
        <button type="button" className="seal-btn mt-5" onClick={() => desk.openCompose("post", "frase")}>
          {t("writePhrase")}
        </button>
      </div>
    );
  }

  return (
    <div className="folhear no-scrollbar">
      {posts.map((post) => (
        <section
          key={`${post.id}-${post.reposterHandle || "origem"}`}
          className="folhear-slide"
          onClick={(event) => tapPage(event, post)}
        >
          {post.reposterHandle ? <p className="leaf-pass">Repassada por @{post.reposterHandle}</p> : null}
          <div className="leaf-fit">
            <BookPage
              post={post}
              leaf
              onAuthor={() => desk.openUser(post.userId)}
              footer={
                <PageActions
                  post={post}
                  layout="leaf"
                  tone="ink"
                  onLove={(love) => {
                    loves.current.set(post.id, love);
                  }}
                />
              }
            />
          </div>
          {burst === post.id ? <Heart className="pop-heart size-24 fill-seal" /> : null}
        </section>
      ))}
    </div>
  );
}