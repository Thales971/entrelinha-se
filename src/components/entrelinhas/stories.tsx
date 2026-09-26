import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { deleteStory, listStoryTray, markStorySeen } from "@/lib/entrelinhas/api";
import { ago, type TrayPerson } from "@/lib/entrelinhas/model";
import { useDesk } from "@/components/entrelinhas/desk";

export function StoryViewer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const desk = useDesk();
  const [tray, setTray] = useState<TrayPerson[] | null>(null);
  const [pi, setPi] = useState(0);
  const [si, setSi] = useState(0);
  const piRef = useRef(0);
  const siRef = useRef(0);

  useEffect(() => {
    let live = true;
    listStoryTray()
      .then((rows) => {
        if (!live) return;
        const withStories = rows.filter((p) => p.stories.length);
        const start = Math.max(0, withStories.findIndex((p) => p.userId === userId));
        setTray(withStories);
        setPi(start);
        piRef.current = start;
      })
      .catch(() => live && setTray([]));
    return () => {
      live = false;
    };
  }, [userId]);

  const people = tray ?? [];
  piRef.current = pi;
  siRef.current = si;
  const person = people[pi];
  const story = person?.stories[si];

  const next = useCallback(() => {
    const current = people[piRef.current];
    if (!current) {
      onClose();
      return;
    }
    if (siRef.current < current.stories.length - 1) setSi(siRef.current + 1);
    else if (piRef.current < people.length - 1) {
      setPi(piRef.current + 1);
      setSi(0);
    } else onClose();
  }, [onClose, people]);

  const prev = useCallback(() => {
    if (siRef.current > 0) setSi(siRef.current - 1);
    else if (piRef.current > 0) {
      const before = people[piRef.current - 1];
      setPi(piRef.current - 1);
      setSi(Math.max(0, (before?.stories.length ?? 1) - 1));
    }
  }, [people]);

  useEffect(() => {
    if (!story) return;
    void markStorySeen({ data: { id: story.id } });
    const timer = window.setTimeout(() => next(), 5200);
    return () => window.clearTimeout(timer);
  }, [story, next]);

  if (!tray) return <div className="sheet items-center justify-center font-serif">Abrindo…</div>;
  if (!person || !story) {
    return (
      <div className="sheet items-center justify-center gap-4 px-6 text-center">
        <p className="font-serif text-3xl">Essa história já saiu do ar.</p>
        <button type="button" className="paper-btn" onClick={onClose}>Voltar</button>
      </div>
    );
  }

  return (
    <div className={person.moldId === "linho" ? "sheet bg-linho text-ink" : "sheet"}>
      <div className="flex gap-1 px-3 pt-3">
        {person.stories.map((item, index) => (
          <span key={item.id} className="h-1 flex-1 overflow-hidden rounded-full bg-ink/15">
            <span
              className="block h-full bg-seal transition-[width] duration-200"
              style={{ width: index <= si ? "100%" : "0%" }}
            />
          </span>
        ))}
      </div>
      <header className="flex items-center justify-between px-4 py-3">
        <button type="button" className="text-left" onClick={() => desk.openUser(person.userId)}>
          <span className="block font-semibold">{person.penName || person.displayName}</span>
          <span className="text-xs text-ink-soft">@{person.handle} · {ago(story.createdAt)}</span>
        </button>
        <button type="button" className="grid size-11 place-items-center" aria-label="Fechar" onClick={onClose}>
          <X />
        </button>
      </header>
      <div className="relative min-h-0 flex-1">
        <p className="px-8 pt-10 text-center font-serif text-3xl leading-snug text-balance">{story.body}</p>
        <button type="button" className="absolute inset-y-0 left-0 w-1/3" aria-label="Anterior" onClick={prev} />
        <button type="button" className="absolute inset-y-0 right-0 w-2/3" aria-label="Próxima" onClick={next} />
      </div>
      {person.userId === desk.meId ? (
        <button
          type="button"
          className="ghost-btn m-4"
          onClick={() => {
            void deleteStory({ data: { id: story.id } }).then(() => desk.refresh());
            onClose();
          }}
        >
          Apagar esta história
        </button>
      ) : null}
    </div>
  );
}
