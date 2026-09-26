import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { listFeed, toggleLike } from "@/lib/entrelinhas/api";
import type { PostCard } from "@/lib/entrelinhas/model";
import { BookPage } from "@/components/entrelinhas/book-page";
import { useDesk } from "@/components/entrelinhas/desk";
import { PageActions } from "@/components/entrelinhas/feed";

function shortEnough(post: PostCard) {
  return post.kind === "frase" || post.kind === "nota" || post.kind === "musica" || post.body.length <= 420;
}

export function Folhear() {
  const desk = useDesk();
  const [posts, setPosts] = useState<PostCard[] | null>(null);
  const [burst, setBurst] = useState<string | null>(null);
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

  async function like(post: PostCard) {
    setBurst(post.id);
    window.setTimeout(() => setBurst((id) => (id === post.id ? null : id)), 700);
    await toggleLike({ data: { id: post.id } });
    desk.refresh();
    if (navigator.vibrate) navigator.vibrate(12);
  }

  if (!posts) return <p className="px-6 py-16 font-serif text-2xl text-paper">Folheando…</p>;
  if (!posts.length) {
    return (
      <div className="flex h-full flex-col justify-end px-6 pb-10 text-paper">
        <p className="font-serif text-4xl leading-none">Nada curto pra folhear.</p>
        <button type="button" className="seal-btn mt-5" onClick={() => desk.openCompose("post", "frase")}>
          Escrever uma frase
        </button>
      </div>
    );
  }

  return (
    <div className="folhear no-scrollbar">
      {posts.map((post) => (
        <section
          key={`${post.id}-${post.reposterHandle || "origem"}`}
          className="folhear-slide flex items-stretch px-3 py-3"
          onClick={() => {
            const now = Date.now();
            if (now - lastTap.current < 280) void like(post);
            lastTap.current = now;
          }}
        >
          <div className="flex h-full w-full items-stretch pr-14">
            <div className="h-full min-w-0 flex-1">
              <BookPage post={post} />
            </div>
          </div>
          <div className="absolute bottom-8 right-3" onClick={(e) => e.stopPropagation()}>
            <PageActions post={post} layout="rail" />
          </div>
          {burst === post.id ? <Heart className="pop-heart size-24 fill-seal" /> : null}
        </section>
      ))}
    </div>
  );
}
