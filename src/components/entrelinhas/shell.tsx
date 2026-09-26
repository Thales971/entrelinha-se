import { useEffect, useState } from "react";
import { BookOpen, Layers, Mail, Plus, UserRound } from "lucide-react";
import type { AppUser } from "@/lib/auth/use-current-user";
import { getMe, publishKey } from "@/lib/entrelinhas/api";
import type { PostKind } from "@/lib/entrelinhas/model";
import { Boot } from "@/components/entrelinhas/login-panel";
import { Onboarding } from "@/components/entrelinhas/onboarding";
import { DeskProvider, type DeskApi } from "@/components/entrelinhas/desk";
import { Feed } from "@/components/entrelinhas/feed";
import { Folhear } from "@/components/entrelinhas/folhear";
import { Compose } from "@/components/entrelinhas/compose";
import { StoryViewer } from "@/components/entrelinhas/stories";
import { PostSheet } from "@/components/entrelinhas/post-sheet";
import { ChatList, ChatThread, ProfileView } from "@/components/entrelinhas/people";
import { cx } from "@/components/entrelinhas/book-page";
import { useLang } from "@/lib/entrelinhas/i18n";
import { Lamp } from "@/components/entrelinhas/lamp";
import { localPublicKey, sealOwner } from "@/lib/entrelinhas/seal";

type Tab = "inicio" | "folhear" | "conversas" | "eu";
type Overlay =
  | { type: "compose"; mode: "post" | "story"; kind?: PostKind }
  | { type: "post"; id: string }
  | { type: "story"; userId: string }
  | { type: "chat"; conversationId: string; title: string }
  | { type: "user"; userId: string };

export function Shell({ user }: { user: AppUser }) {
  const [bundle, setBundle] = useState<Awaited<ReturnType<typeof getMe>> | undefined>(undefined);
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState<Tab>("inicio");
  const [feedMode, setFeedMode] = useState<"all" | "following">("all");
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [sealLost, setSealLost] = useState(false);
  const { t } = useLang();
  sealOwner(user.id);

  useEffect(() => {
    let live = true;
    getMe()
      .then((row) => live && setBundle(row))
      .catch(() => live && setBundle(null));
    return () => {
      live = false;
    };
  }, [tick, user.id]);

  useEffect(() => {
    if (!bundle?.profile.userId) return;
    let live = true;
    localPublicKey()
      .then((publicKey) => publishKey({ data: { publicKey } }))
      .then((res) => {
        if (live && res.ok) setSealLost(res.mismatch);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [bundle?.profile.userId]);

  if (bundle === undefined) return <Boot />;
  if (!bundle) return <Onboarding user={user} onDone={() => setTick((n) => n + 1)} />;

  const api: DeskApi = {
    tick,
    meId: user.id,
    refresh: () => setTick((n) => n + 1),
    openPost: (id) => setOverlay({ type: "post", id }),
    openUser: (userId) => setOverlay({ type: "user", userId }),
    openCompose: (mode, kind) => setOverlay({ type: "compose", mode, kind }),
    openStory: (userId) => setOverlay({ type: "story", userId }),
    openChat: (conversationId, title) => setOverlay({ type: "chat", conversationId, title }),
  };

  return (
    <DeskProvider value={api}>
      <div className="relative flex h-full min-h-0 flex-col">
        {tab === "inicio" && !overlay ? (
          <header className="mast">
            <div className="flex items-center justify-between gap-3">
              <h1 className="font-serif text-2xl leading-none tracking-tight">entrelinha-se</h1>
              <Lamp />
            </div>
            <div className="mast-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={feedMode === "all"} className={feedMode === "all" ? "on" : ""} onClick={() => setFeedMode("all")}>
                {t("all")}
              </button>
              <button type="button" role="tab" aria-selected={feedMode === "following"} className={feedMode === "following" ? "on" : ""} onClick={() => setFeedMode("following")}>
                {t("following")}
              </button>
            </div>
          </header>
        ) : !overlay ? (
          <header className="shelf-lip">
            <p className="font-serif text-2xl">
              {tab === "folhear" ? t("navFlip") : tab === "conversas" ? t("navLetters") : t("navMe")}
            </p>
            <Lamp />
          </header>
        ) : null}
        <div className="min-h-0 flex-1">
          {tab === "inicio" ? <Feed mode={feedMode} /> : null}
          {tab === "folhear" ? <Folhear /> : null}
          {tab === "conversas" ? <ChatList sealLost={sealLost} /> : null}
          {tab === "eu" ? <ProfileView userId={user.id} /> : null}
        </div>
        <nav className="nav-bar grid grid-cols-5 place-items-center px-2 pt-2">
          <button type="button" className={cx("nav-btn", tab === "inicio" && "on")} onClick={() => { setOverlay(null); setTab("inicio"); }}>
            <BookOpen className="size-5" />
            {t("navHome")}
          </button>
          <button type="button" className={cx("nav-btn", tab === "folhear" && "on")} onClick={() => { setOverlay(null); setTab("folhear"); }}>
            <Layers className="size-5" />
            {t("navFlip")}
          </button>
          <button type="button" className="nav-btn" onClick={() => setOverlay({ type: "compose", mode: "post" })} aria-label={t("newPage")}>
            <span className="seal-fab"><Plus className="size-5" /></span>
          </button>
          <button type="button" className={cx("nav-btn", tab === "conversas" && "on")} onClick={() => { setOverlay(null); setTab("conversas"); }}>
            <Mail className="size-5" />
            {t("navLetters")}
          </button>
          <button type="button" className={cx("nav-btn", tab === "eu" && "on")} onClick={() => { setOverlay(null); setTab("eu"); }}>
            <UserRound className="size-5" />
            {t("navMe")}
          </button>
        </nav>
        {overlay?.type === "compose" ? (
          <Compose
            profile={bundle.profile}
            mode={overlay.mode}
            initialKind={overlay.kind}
            onClose={() => setOverlay(null)}
            onDone={() => {
              setOverlay(null);
              setTick((n) => n + 1);
            }}
          />
        ) : null}
        {overlay?.type === "post" ? <PostSheet id={overlay.id} onClose={() => setOverlay(null)} /> : null}
        {overlay?.type === "story" ? <StoryViewer userId={overlay.userId} onClose={() => { setOverlay(null); setTick((n) => n + 1); }} /> : null}
        {overlay?.type === "chat" ? (
          <ChatThread conversationId={overlay.conversationId} title={overlay.title} sealLost={sealLost} onClose={() => setOverlay(null)} />
        ) : null}
        {overlay?.type === "user" ? (
          <div className="sheet sheet-wood">
            <ProfileView userId={overlay.userId} onClose={() => setOverlay(null)} />
          </div>
        ) : null}
      </div>
    </DeskProvider>
  );
}
