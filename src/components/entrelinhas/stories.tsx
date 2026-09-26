import { useEffect, useRef, useState, type PointerEvent } from "react";
import { X } from "lucide-react";
import { deleteStory, listStoryTray, markStorySeen } from "@/lib/entrelinhas/api";
import { ago, type TrayPerson } from "@/lib/entrelinhas/model";
import { useDesk } from "@/components/entrelinhas/desk";
import { useLang } from "@/lib/entrelinhas/i18n";

const STORY_MS = 6500;

export function StoryViewer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const desk = useDesk();
  const { t } = useLang();
  const [tray, setTray] = useState<TrayPerson[] | null>(null);
  const [pi, setPi] = useState(0);
  const [si, setSi] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const piRef = useRef(0);
  const siRef = useRef(0);
  const peopleRef = useRef<TrayPerson[]>([]);
  const elapsedRef = useRef(0);
  const pausedRef = useRef(false);
  const holdTimer = useRef(0);

  useEffect(() => {
    let live = true;
    listStoryTray()
      .then((rows) => {
        if (!live) return;
        const withStories = rows.filter((person) => person.stories.length);
        const start = Math.max(0, withStories.findIndex((person) => person.userId === userId));
        const unseen = withStories[start]?.stories.findIndex((item) => !item.seen) ?? 0;
        setTray(withStories);
        setPi(start);
        setSi(unseen < 0 ? 0 : unseen);
      })
      .catch(() => live && setTray([]));
    return () => {
      live = false;
    };
  }, [userId]);

  const people = tray ?? [];
  peopleRef.current = people;
  piRef.current = pi;
  siRef.current = si;
  const person = people[pi];
  const story = person?.stories[si];

  function go(dir: 1 | -1) {
    const list = peopleRef.current;
    const personIndex = piRef.current;
    const storyIndex = siRef.current;
    const current = list[personIndex];
    if (!current) {
      onClose();
      return;
    }
    const hop = () => {
      elapsedRef.current = 0;
      setProgress(0);
    };
    if (dir > 0) {
      if (storyIndex < current.stories.length - 1) {
        hop();
        setSi(storyIndex + 1);
      } else if (personIndex < list.length - 1) {
        hop();
        setPi(personIndex + 1);
        setSi(0);
      } else onClose();
      return;
    }
    if (storyIndex > 0) {
      hop();
      setSi(storyIndex - 1);
    } else if (personIndex > 0) {
      const before = list[personIndex - 1];
      hop();
      setPi(personIndex - 1);
      setSi(Math.max(0, (before?.stories.length ?? 1) - 1));
    } else {
      hop();
    }
  }

  useEffect(() => {
    elapsedRef.current = 0;
    setProgress(0);
  }, [story?.id]);

  useEffect(() => {
    if (!story || paused) return;
    void markStorySeen({ data: { id: story.id } });
    const origin = performance.now() - elapsedRef.current;
    let frame = 0;
    const tick = (now: number) => {
      const spent = now - origin;
      elapsedRef.current = spent;
      const ratio = Math.min(1, spent / STORY_MS);
      setProgress(ratio);
      if (ratio >= 1) {
        elapsedRef.current = 0;
        go(1);
        return;
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [story?.id, paused]);

  useEffect(() => () => window.clearTimeout(holdTimer.current), []);

  function press(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => {
      pausedRef.current = true;
      setPaused(true);
    }, 160);
  }

  function release(event: PointerEvent<HTMLDivElement>) {
    window.clearTimeout(holdTimer.current);
    if (pausedRef.current) {
      pausedRef.current = false;
      setPaused(false);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    if (x < rect.width / 3) go(-1);
    else if (x > (rect.width * 2) / 3) go(1);
  }

  if (!tray) return <div className="sheet items-center justify-center font-serif">{t("openingStory")}</div>;
  if (!person || !story) {
    return (
      <div className="sheet items-center justify-center gap-4 px-6 text-center">
        <p className="font-serif text-3xl">{t("storyGone")}</p>
        <button type="button" className="paper-btn" onClick={onClose}>{t("back")}</button>
      </div>
    );
  }

  return (
    <div className={person.moldId === "linho" ? "sheet story-sheet bg-linho text-ink" : "sheet story-sheet"}>
      <div className="flex gap-1 px-3 pt-3">
        {person.stories.map((item, index) => (
          <span key={item.id} className="story-bar">
            <span
              className="block h-full bg-seal"
              style={{ width: index < si ? "100%" : index === si ? `${Math.round(progress * 100)}%` : "0%" }}
            />
          </span>
        ))}
      </div>
      <header className="relative z-10 flex items-center justify-between px-4 py-3">
        <button type="button" className="text-left" onClick={() => desk.openUser(person.userId)}>
          <span className="block font-semibold">{person.penName || person.displayName}</span>
          <span className="text-xs text-ink-soft">@{person.handle} · {ago(story.createdAt)} · {paused ? t("storyPaused") : t("storyHold")}</span>
        </button>
        <button type="button" className="grid size-11 place-items-center" aria-label="Fechar" onClick={onClose}>
          <X />
        </button>
      </header>
      <div
        className="story-stage relative min-h-0 flex-1"
        onPointerDown={press}
        onPointerUp={release}
        onPointerCancel={() => {
          window.clearTimeout(holdTimer.current);
          pausedRef.current = false;
          setPaused(false);
        }}
      >
        <p className="px-8 pt-16 text-center font-serif text-3xl leading-snug text-balance">{story.body}</p>
        {paused ? <span className="story-pause" aria-hidden="true" /> : null}
      </div>
      {person.userId === desk.meId ? (
        <button
          type="button"
          className="ghost-btn relative z-10 m-4"
          onClick={() => {
            void deleteStory({ data: { id: story.id } }).then(() => desk.refresh());
            onClose();
          }}
        >
          {t("deleteStory")}
        </button>
      ) : null}
    </div>
  );
}
