import { useEffect, useState } from "react";
import { BookOpen, Layers, Mail, Plus, UserRound } from "lucide-react";
import type { AppUser } from "@/lib/auth/use-current-user";
import { getMe, versoDoDia } from "@/lib/entrelinhas/api";
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
  const [verso, setVerso] = useState<{ id: string; body: string; name: string } | null>(null);
  const [feedMode, setFeedMode] = useState<"all" | "following">("all");
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const { t } = useLang();

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
    let live = true;
    versoDoDia()
      .then((row) => live && setVerso(row))
      .catch(() => live && setVerso(null));
    return () => {
      live = false;
    };
  }, [tick]);

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
          <header className="topbar px-4 pb-3 pt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs tracking-[0.16em] uppercase text-ink-soft">{t("shelf")}</p>
              <div className="flex items-center gap-2">
                <button type="button" className={cx("chip-ink", feedMode === "all" && "on")} onClick={() => setFeedMode("all")}>
                  {t("all")}
                </button>
                <button type="button" className={cx("chip-ink", feedMode === "following" && "on")} onClick={() => setFeedMode("following")}>
                  {t("following")}
                </button>
                <Lamp />
              </div>
            </div>
            <h1 className="mt-1 font-serif text-[2rem] leading-none tracking-tight">entrelinha-se</h1>
            {verso ? (
              <button type="button" className="verso-slip" onClick={() => setOverlay({ type: "post", id: verso.id })}>
                <p>{verso.body}</p>
                <span className="mt-1 block text-xs text-ink-soft">{t("dayVerse")} · {verso.name}</span>
              </button>
            ) : null}
          </header>
        ) : !overlay ? (
          <div className="flex justify-end px-3 pt-3">
            <Lamp />
          </div>
        ) : null}
        <div className="min-h-0 flex-1">
          {tab === "inicio" ? <Feed mode={feedMode} /> : null}
          {tab === "folhear" ? <Folhear /> : null}
          {tab === "conversas" ? <ChatList /> : null}
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
          <ChatThread conversationId={overlay.conversationId} title={overlay.title} onClose={() => setOverlay(null)} />
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
