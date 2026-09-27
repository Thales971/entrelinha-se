import { BookPage, InkPicker, MoldPicker, Portrait } from "@/components/entrelinhas/book-page";
import { useDesk } from "@/components/entrelinhas/desk";
import { UserButton } from "@/lib/auth/gates";
import {
  getProfile,
  listBlocks,
  listConversations,
  listMessages,
  listPeople,
  listShelf,
  openConversation,
  saveProfile,
  sendMessage,
  setAvatar,
  toggleBlock,
  toggleFollow,
} from "@/lib/entrelinhas/api";
import { rejectText } from "@/lib/entrelinhas/guard";
import { LangSwitch, useLang } from "@/lib/entrelinhas/i18n";
import {
  slugHandle,
  type ChatMessage,
  type ChatPreview,
  type InkId,
  type MoldId,
  type PostCard,
  type Profile,
} from "@/lib/entrelinhas/model";
import { openLetter, sealLetter } from "@/lib/entrelinhas/seal";
import { translateLines } from "@/lib/entrelinhas/translate";
import { ChevronLeft, Lock, Mail, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function ProfileView({ userId, onClose }: { userId: string; onClose?: () => void }) {
  const desk = useDesk();
  const { t } = useLang();
  const [bundle, setBundle] = useState<{ profile: Profile; posts: PostCard[] } | null | undefined>(
    undefined,
  );
  const [editing, setEditing] = useState(false);
  const [shelf, setShelf] = useState<"pages" | "saved" | "liked">("pages");
  const [kept, setKept] = useState<PostCard[]>([]);
  const [people, setPeople] = useState<Awaited<ReturnType<typeof listPeople>>>([]);
  const [blocked, setBlocked] = useState<{ userId: string; handle: string; displayName: string }[]>(
    [],
  );
  const [error, setError] = useState("");
  const [openingChat, setOpeningChat] = useState(false);

  function load() {
    getProfile({ data: { userId } })
      .then((res) => setBundle(res))
      .catch(() => setBundle(null));
  }

  useEffect(() => {
    load();
    if (userId === desk.meId) {
      listPeople()
        .then(setPeople)
        .catch(() => undefined);
      listBlocks()
        .then(setBlocked)
        .catch(() => undefined);
    }
  }, [userId, desk.tick]);

  useEffect(() => {
    if (userId !== desk.meId || shelf === "pages") return;
    listShelf({ data: { shelf } })
      .then(setKept)
      .catch(() => setKept([]));
  }, [shelf, userId, desk.meId, desk.tick]);

  if (bundle === undefined)
    return <p className="px-5 py-10 font-serif text-2xl text-cream">{t("openingBook")}</p>;
  if (!bundle) {
    return (
      <div className="px-5 py-10 text-cream">
        <p className="font-serif text-3xl">{t("bookGone")}</p>
        {onClose ? (
          <button type="button" className="paper-btn mt-4" onClick={onClose}>
            {t("back")}
          </button>
        ) : null}
      </div>
    );
  }
  const { profile, posts } = bundle;

  return (
    <div className="h-full overflow-y-auto px-4 pb-8 text-cream">
      {onClose ? (
        <button
          type="button"
          className="mt-2 grid size-11 place-items-center"
          aria-label="Voltar"
          onClick={onClose}
        >
          <ChevronLeft />
        </button>
      ) : null}
      <div className="profile-plate">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-serif text-4xl leading-none">
              {profile.penName || profile.displayName}
            </p>
            <p className="mt-2 text-sm text-ink-soft">@{profile.handle}</p>
          </div>
          <Portrait
            name={profile.penName || profile.displayName}
            src={profile.avatarData}
            className="size-16 text-2xl"
          />
        </div>
        <p className="mt-3 font-serif text-lg">
          {profile.bio || (profile.isMe ? t("blankBio") : "")}
        </p>
        {profile.noteFresh && profile.noteText ? (
          <p className="mt-3 inline-block rounded-2xl bg-paper-deep px-3 py-2 font-serif text-sm">
            {t("note")}: {profile.noteText}
          </p>
        ) : null}
        <div className="mt-4 flex gap-4 text-sm">
          <span>
            <b className="tabular-nums">{profile.pages}</b> {t("pagesWord")}
          </span>
          <span>
            <b className="tabular-nums">{profile.followers}</b> {t("readers")}
          </span>
          <span>
            <b className="tabular-nums">{profile.following}</b> {t("followingCount")}
          </span>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        {profile.isMe ? (
          <button type="button" className="paper-btn" onClick={() => setEditing((v) => !v)}>
            {t("editBook")}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="seal-btn"
              onClick={() =>
                void toggleFollow({ data: { userId: profile.userId } }).then(() => {
                  load();
                  desk.refresh();
                })
              }
            >
              {profile.followedByMe ? t("following") : t("follow")}
            </button>
            {!profile.isCasa ? (
              <button
                type="button"
                className="seal-btn inline-flex flex-1 items-center justify-center gap-2"
                disabled={openingChat}
                onClick={() => {
                  setOpeningChat(true);
                  setError("");
                  void openConversation({ data: { userId: profile.userId } })
                    .then((res) => {
                      if (!res.ok) {
                        setError(res.error);
                        setOpeningChat(false);
                        return;
                      }
                      desk.openChat(res.id, profile.penName || profile.displayName);
                      setOpeningChat(false);
                    })
                    .catch(() => {
                      setError("Não deu pra abrir a carta. Tenta de novo.");
                      setOpeningChat(false);
                    });
                }}
              >
                <Mail className="size-4" />
                {openingChat ? "Abrindo…" : t("sendLetter")}
              </button>
            ) : null}
            {!profile.isCasa ? (
              <button
                type="button"
                className="ghost-btn text-cream"
                onClick={() =>
                  void toggleBlock({ data: { userId: profile.userId } }).then(() => desk.refresh())
                }
              >
                {t("block")}
              </button>
            ) : null}
          </>
        )}
      </div>
      {error ? <p className="mt-2 text-sm">{error}</p> : null}
      {editing && profile.isMe ? (
        <Editor
          profile={profile}
          onSaved={() => {
            setEditing(false);
            load();
            desk.refresh();
          }}
        />
      ) : null}
      <div className="mt-5 flex gap-4 border-b border-paper/20">
        <button
          type="button"
          className={shelf === "pages" ? "shelf-tab on text-cream" : "shelf-tab text-cream/70"}
          onClick={() => setShelf("pages")}
        >
          {t("pages")}
        </button>
        {profile.isMe ? (
          <>
            <button
              type="button"
              className={shelf === "saved" ? "shelf-tab on text-cream" : "shelf-tab text-cream/70"}
              onClick={() => setShelf("saved")}
            >
              {t("ribbon")}
            </button>
            <button
              type="button"
              className={shelf === "liked" ? "shelf-tab on text-cream" : "shelf-tab text-cream/70"}
              onClick={() => setShelf("liked")}
            >
              {t("likes")}
            </button>
          </>
        ) : null}
      </div>
      <div className="mt-4 space-y-5">
        {(shelf === "pages" ? posts : kept).map((post) => (
          <button
            key={post.id}
            type="button"
            className="block w-full text-left"
            onClick={() => desk.openPost(post.id)}
          >
            <BookPage post={post} />
          </button>
        ))}
        {(shelf === "pages" ? posts : kept).length === 0 ? (
          <p className="font-serif text-xl text-cream/80">
            {shelf === "saved"
              ? t("emptyRibbon")
              : shelf === "liked"
                ? t("emptyLikes")
                : t("noPages")}
          </p>
        ) : null}
      </div>
      {profile.isMe ? (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-serif text-2xl text-cream">{t("peopleNear")}</h3>
            <LangSwitch />
          </div>
          <ul className="mt-3 space-y-2">
            {people.map((person) => (
              <li key={person.userId} className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="min-h-11 text-left"
                  onClick={() => desk.openUser(person.userId)}
                >
                  <span className="block font-semibold">{person.displayName}</span>
                  <span className="text-xs text-cream/70">@{person.handle}</span>
                </button>
                <button
                  type="button"
                  className="paper-btn"
                  onClick={() =>
                    void toggleFollow({ data: { userId: person.userId } }).then(() => {
                      desk.refresh();
                      listPeople().then(setPeople);
                    })
                  }
                >
                  {person.followedByMe ? t("following") : t("follow")}
                </button>
              </li>
            ))}
          </ul>
          {blocked.length ? (
            <div className="mt-6">
              <h3 className="font-serif text-xl">{t("blocked")}</h3>
              <ul className="mt-2 space-y-2">
                {blocked.map((person) => (
                  <li key={person.userId} className="flex items-center justify-between">
                    <span>@{person.handle}</span>
                    <button
                      type="button"
                      className="ghost-btn text-cream"
                      onClick={() =>
                        void toggleBlock({ data: { userId: person.userId } }).then(() =>
                          listBlocks().then(setBlocked),
                        )
                      }
                    >
                      {t("unblock")}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="mt-8 rounded-2xl bg-paper p-4 text-ink">
            <h3 className="font-serif text-xl">{t("rules")}</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {(["term1", "term2", "term3", "term4", "term5"] as const).map((key) => (
                <li key={key}>{t(key)}</li>
              ))}
            </ul>
            <div className="mt-4">
              <UserButton />
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function PortraitField({ current }: { current: string }) {
  const desk = useDesk();
  const [preview, setPreview] = useState(current);
  const [error, setError] = useState("");

  async function pick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 4_000_000) {
      setError("Manda uma foto de até 4 MB.");
      return;
    }
    const bmp = await createImageBitmap(file).catch(() => null);
    if (!bmp) {
      setError("Não consegui ler essa imagem.");
      return;
    }
    const size = 96;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const scale = Math.max(size / bmp.width, size / bmp.height);
    const w = bmp.width * scale;
    const h = bmp.height * scale;
    ctx.drawImage(bmp, (size - w) / 2, (size - h) / 2, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
    const res = await setAvatar({ data: { dataUrl } });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setPreview(res.avatarData);
    setError("");
    desk.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <Portrait name="Eu" src={preview} className="size-14 text-xl" />
      <div>
        <label className="paper-btn inline-flex cursor-pointer items-center">
          Retrato
          <input
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => void pick(e.target.files?.[0])}
          />
        </label>
        {preview ? (
          <button
            type="button"
            className="ghost-btn ml-1"
            onClick={() => {
              void setAvatar({ data: { dataUrl: "" } }).then((res) => {
                if (!res.ok) {
                  setError(res.error);
                  return;
                }
                setPreview("");
                desk.refresh();
              });
            }}
          >
            Tirar
          </button>
        ) : null}
        <p className="mt-1 text-xs text-ink-soft">
          Só entra foto de verdade, pequena. Sem link e sem arquivo estranho.
        </p>
        {error ? <p className="text-sm text-seal">{error}</p> : null}
      </div>
    </div>
  );
}

function Editor({ profile, onSaved }: { profile: Profile; onSaved: () => void }) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [penName, setPenName] = useState(profile.penName);
  const [handle, setHandle] = useState(profile.handle);
  const [bio, setBio] = useState(profile.bio);
  const [noteText, setNoteText] = useState(profile.noteText);
  const [moldId, setMoldId] = useState<MoldId>(profile.moldId);
  const [inkId, setInkId] = useState<InkId>(profile.inkId);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="mt-4 space-y-3 rounded-2xl bg-paper p-3 text-ink"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        void saveProfile({
          data: { handle, displayName, penName, bio, moldId, inkId, noteText, acceptTerms: true },
        }).then((res) => {
          setBusy(false);
          if (!res.ok) {
            setError(res.error);
            return;
          }
          onSaved();
        });
      }}
    >
      <input
        className="field"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Nome"
      />
      <input
        className="field"
        value={penName}
        onChange={(e) => setPenName(e.target.value)}
        placeholder="Nome de pena"
      />
      <input
        className="field"
        value={handle}
        onChange={(e) => setHandle(slugHandle(e.target.value))}
        placeholder="usuario"
      />
      <label className="block text-sm">
        Descrição do caderno
        <textarea
          className="field mt-1"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Uma linha sobre você"
          maxLength={180}
        />
      </label>
      <PortraitField current={profile.avatarData} />
      <input
        className="field"
        value={noteText}
        onChange={(e) => setNoteText(e.target.value)}
        placeholder="Nota no topo, fica uma semana"
        maxLength={80}
      />
      <MoldPicker value={moldId} onChange={setMoldId} />
      <InkPicker value={inkId} onChange={setInkId} />
      {error ? <p className="text-sm text-seal">{error}</p> : null}
      <button className="seal-btn w-full" disabled={busy} type="submit">
        {busy ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}

function clock(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

function LetterPreview({ row, fallback }: { row: ChatPreview; fallback: string }) {
  const [text, setText] = useState(row.lastBody || fallback);
  useEffect(() => {
    if (!row.lastCipher) {
      setText(row.lastBody || fallback);
      return;
    }
    let live = true;
    openLetter(row.lastCipher, row.publicKey, row.lastMine).then((clear) => {
      if (live) setText(clear || fallback);
    });
    return () => {
      live = false;
    };
  }, [row.lastCipher, row.lastBody, row.lastMine, row.publicKey, fallback]);
  return (
    <span className="mt-0.5 flex min-w-0 items-center gap-1 text-sm text-cream/70">
      {row.lastCipher ? <Lock className="size-3 shrink-0" /> : null}
      <span className="truncate">{text}</span>
    </span>
  );
}

export function ChatList({ sealLost }: { sealLost: boolean }) {
  const desk = useDesk();
  const { t } = useLang();
  const [rows, setRows] = useState<ChatPreview[] | null>(null);
  const [people, setPeople] = useState<Awaited<ReturnType<typeof listPeople>>>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    listConversations()
      .then(setRows)
      .catch(() => setRows([]));
    listPeople()
      .then(setPeople)
      .catch(() => setPeople([]));
  }, [desk.tick]);

  function writeTo(userId: string, name: string) {
    setError("");
    void openConversation({ data: { userId } }).then((res) => {
      if (!res.ok) {
        setError(res.error);
        return;
      }
      desk.openChat(res.id, name);
    });
  }

  if (!rows) return <p className="px-5 py-10 font-serif text-cream">{t("openingLetters")}</p>;
  return (
    <div className="h-full overflow-y-auto px-4 py-4 text-cream">
      <p className="max-w-sm text-sm text-cream/75">{sealLost ? t("sealLost") : t("letterHint")}</p>
      {rows.length === 0 ? <p className="mt-4 font-serif text-xl">{t("noLetters")}</p> : null}
      <ul className="mt-4 space-y-2">
        {rows.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              className="letter-row"
              onClick={() => desk.openChat(row.id, row.penName || row.displayName)}
            >
              <Portrait name={row.penName || row.displayName} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-semibold">{row.penName || row.displayName}</span>
                  <span className="shrink-0 text-xs text-cream/60">{clock(row.lastAt)}</span>
                </span>
                <LetterPreview row={row} fallback={t("letterOpen")} />
              </span>
              <span className="letter-open">{t("openLetter")}</span>
            </button>
          </li>
        ))}
      </ul>
      <h3 className="mt-8 font-serif text-2xl">{t("pickSomeone")}</h3>
      {people.length === 0 ? <p className="mt-2 text-sm text-cream/70">{t("noPeople")}</p> : null}
      <ul className="mt-3 space-y-2">
        {people
          .filter((person) => person.userId !== "casa")
          .slice(0, 8)
          .map((person) => (
            <li key={person.userId}>
              <button
                type="button"
                className="letter-row"
                onClick={() => writeTo(person.userId, person.penName || person.displayName)}
              >
                <Portrait name={person.penName || person.displayName} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {person.penName || person.displayName}
                  </span>
                  <span className="block text-xs text-cream/70">@{person.handle}</span>
                </span>
                <span className="letter-open seal">{t("sendLetter")}</span>
              </button>
            </li>
          ))}
      </ul>
      {error ? <p className="mt-3 text-sm">{error}</p> : null}
    </div>
  );
}

export function ChatThread({
  conversationId,
  title,
  sealLost,
  onClose,
}: {
  conversationId: string;
  title: string;
  sealLost: boolean;
  onClose: () => void;
}) {
  const { t, lang } = useLang();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [plain, setPlain] = useState<Record<string, string>>({});
  const [otherKey, setOtherKey] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [freshId, setFreshId] = useState("");
  const [alts, setAlts] = useState<Record<string, string>>({});
  const end = useRef<HTMLDivElement>(null);

  function load() {
    listMessages({ data: { conversationId } })
      .then(async (res) => {
        setMessages(res.messages);
        setOtherKey(res.otherKey || "");
        if (res.error) setError(res.error);
        const next: Record<string, string> = {};
        for (const message of res.messages) {
          if (!message.cipher) {
            next[message.id] = message.body;
            continue;
          }
          next[message.id] =
            (await openLetter(message.cipher, res.otherKey || "", message.mine)) ||
            t("sealedLetter");
        }
        setPlain(next);
      })
      .catch(() => setError("Não deu pra abrir a carta."));
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 4000);
    return () => window.clearInterval(timer);
  }, [conversationId]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  let lastDay = "";

  return (
    <div className="sheet chat-sheet">
      <header className="chat-head">
        <button
          type="button"
          className="grid size-11 place-items-center"
          aria-label={t("back")}
          onClick={onClose}
        >
          <ChevronLeft />
        </button>
        <Portrait name={title} />
        <div className="min-w-0">
          <h2 className="truncate font-serif text-xl leading-none">{title}</h2>
          <p className="mt-1 flex items-center gap-1 text-xs text-cream/70">
            <Lock className="size-3" /> {t("sealedNote")}
          </p>
        </div>
      </header>
      <div className="chat-wall min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <div className="folded-letter">
            <p className="font-serif text-2xl">{t("startLetter")}</p>
            <p className="mt-1 text-sm">{t("letterHint")}</p>
          </div>
        ) : null}
        {messages.map((message) => {
          const day = dayLabel(message.createdAt);
          const showDay = day !== lastDay;
          lastDay = day;
          return (
            <div key={message.id}>
              {showDay && day ? <p className="chat-day">{day}</p> : null}
              <div className={message.mine ? "bubble-me" : "bubble-them"}>
                {message.id === freshId ? <span className="wax-pop" aria-hidden="true" /> : null}
                <p>{alts[message.id] || plain[message.id] || message.body}</p>
                <span className="bubble-meta">
                  <button
                    type="button"
                    onClick={() => {
                      if (alts[message.id]) {
                        setAlts((prev) => {
                          const next = { ...prev };
                          delete next[message.id];
                          return next;
                        });
                        return;
                      }
                      const source = plain[message.id] || message.body;
                      const target = lang === "pt" ? "en" : lang;
                      void translateLines({ data: { target, texts: [source] } }).then((res) => {
                        if (res.ok && res.lines[0] && res.lines[0] !== message.body) {
                          setAlts((prev) => ({ ...prev, [message.id]: res.lines[0] }));
                        }
                      });
                    }}
                  >
                    {alts[message.id] ? t("showOriginal") : t("translate")}
                  </button>
                  <span>{clock(message.createdAt)}</span>
                  {message.mine ? <span>{t("sent")}</span> : null}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>
      {error ? <p className="px-4 pt-2 text-sm text-cream">{error}</p> : null}
      <form
        className="chat-compose"
        onSubmit={(event) => {
          event.preventDefault();
          const body = text.trim();
          if (!body) return;
          if (sealLost) {
            setError(t("sealLost"));
            return;
          }
          if (!otherKey) {
            setError(t("sealOther"));
            return;
          }
          const dirty = rejectText(body);
          if (dirty) {
            setError(dirty);
            return;
          }
          setText("");
          setError("");
          void sealLetter(body, otherKey)
            .then((cipher) => sendMessage({ data: { conversationId, cipher } }))
            .then((res) => {
              if (!res.ok) {
                setError(res.error);
                setText(body);
                return;
              }
              setFreshId(res.id);
              load();
            })
            .catch(() => {
              setError(t("sealFail"));
              setText(body);
            });
        }}
      >
        <input
          className="field chat-input"
          placeholder={t("writeHere")}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <button className="seal-fab shrink-0" type="submit" aria-label={t("sendLetter")}>
          <Send className="size-5" />
        </button>
      </form>
    </div>
  );
}
