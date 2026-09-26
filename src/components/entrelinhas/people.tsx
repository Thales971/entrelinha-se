import { useEffect, useState } from "react";
import { ChevronLeft, Send } from "lucide-react";
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
import {
  slugHandle,
  type ChatMessage,
  type ChatPreview,
  type InkId,
  type MoldId,
  type PostCard,
  type Profile,
} from "@/lib/entrelinhas/model";
import { BookPage, InkPicker, MoldPicker, Portrait } from "@/components/entrelinhas/book-page";
import { LangSwitch, useLang } from "@/lib/entrelinhas/i18n";
import { useDesk } from "@/components/entrelinhas/desk";
import { UserButton } from "@/lib/auth/gates";

export function ProfileView({ userId, onClose }: { userId: string; onClose?: () => void }) {
  const desk = useDesk();
  const { t } = useLang();
  const [bundle, setBundle] = useState<{ profile: Profile; posts: PostCard[] } | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [shelf, setShelf] = useState<"pages" | "saved" | "liked">("pages");
  const [kept, setKept] = useState<PostCard[]>([]);
  const [people, setPeople] = useState<Awaited<ReturnType<typeof listPeople>>>([]);
  const [blocked, setBlocked] = useState<{ userId: string; handle: string; displayName: string }[]>([]);
  const [error, setError] = useState("");

  function load() {
    getProfile({ data: { userId } })
      .then((res) => setBundle(res))
      .catch(() => setBundle(null));
  }

  useEffect(() => {
    load();
    if (userId === desk.meId) {
      listPeople().then(setPeople).catch(() => undefined);
      listBlocks().then(setBlocked).catch(() => undefined);
    }
  }, [userId, desk.tick]);

  useEffect(() => {
    if (userId !== desk.meId || shelf === "pages") return;
    listShelf({ data: { shelf } }).then(setKept).catch(() => setKept([]));
  }, [shelf, userId, desk.meId, desk.tick]);

  if (bundle === undefined) return <p className="px-5 py-10 font-serif text-2xl text-cream">{t("openingBook")}</p>;
  if (!bundle) {
    return (
      <div className="px-5 py-10 text-cream">
        <p className="font-serif text-3xl">{t("bookGone")}</p>
        {onClose ? <button type="button" className="paper-btn mt-4" onClick={onClose}>{t("back")}</button> : null}
      </div>
    );
  }
  const { profile, posts } = bundle;

  return (
    <div className="h-full overflow-y-auto px-4 pb-8 text-cream">
      {onClose ? (
        <button type="button" className="mt-2 grid size-11 place-items-center" aria-label="Voltar" onClick={onClose}>
          <ChevronLeft />
        </button>
      ) : null}
      <div className="profile-plate">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-serif text-4xl leading-none">{profile.penName || profile.displayName}</p>
            <p className="mt-2 text-sm text-ink-soft">@{profile.handle}</p>
          </div>
          <Portrait name={profile.penName || profile.displayName} src={profile.avatarData} className="size-16 text-2xl" />
        </div>
        <p className="mt-3 font-serif text-lg">{profile.bio || (profile.isMe ? t("blankBio") : "")}</p>
        {profile.noteFresh && profile.noteText ? (
          <p className="mt-3 inline-block rounded-2xl bg-paper-deep px-3 py-2 font-serif text-sm">{t("note")}: {profile.noteText}</p>
        ) : null}
        <div className="mt-4 flex gap-4 text-sm">
          <span><b className="tabular-nums">{profile.pages}</b> {t("pagesWord")}</span>
          <span><b className="tabular-nums">{profile.followers}</b> {t("readers")}</span>
          <span><b className="tabular-nums">{profile.following}</b> {t("followingCount")}</span>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        {profile.isMe ? (
          <button type="button" className="paper-btn" onClick={() => setEditing((v) => !v)}>{t("editBook")}</button>
        ) : (
          <>
            <button
              type="button"
              className="seal-btn"
              onClick={() => void toggleFollow({ data: { userId: profile.userId } }).then(() => { load(); desk.refresh(); })}
            >
              {profile.followedByMe ? t("following") : t("follow")}
            </button>
            {!profile.isCasa ? (
              <button
                type="button"
                className="paper-btn"
                onClick={() => {
                  void openConversation({ data: { userId: profile.userId } }).then((res) => {
                    if (!res.ok) {
                      setError(res.error);
                      return;
                    }
                    desk.openChat(res.id, profile.penName || profile.displayName);
                  });
                }}
              >
                {t("write")}
              </button>
            ) : null}
            {!profile.isCasa ? (
              <button
                type="button"
                className="ghost-btn text-cream"
                onClick={() => void toggleBlock({ data: { userId: profile.userId } }).then(() => desk.refresh())}
              >
                {t("block")}
              </button>
            ) : null}
          </>
        )}
      </div>
      {error ? <p className="mt-2 text-sm">{error}</p> : null}
      {editing && profile.isMe ? (
        <Editor profile={profile} onSaved={() => { setEditing(false); load(); desk.refresh(); }} />
      ) : null}
      <div className="mt-5 flex gap-4 border-b border-paper/20">
        <button type="button" className={shelf === "pages" ? "shelf-tab on text-cream" : "shelf-tab text-cream/70"} onClick={() => setShelf("pages")}>{t("pages")}</button>
        {profile.isMe ? (
          <>
            <button type="button" className={shelf === "saved" ? "shelf-tab on text-cream" : "shelf-tab text-cream/70"} onClick={() => setShelf("saved")}>{t("ribbon")}</button>
            <button type="button" className={shelf === "liked" ? "shelf-tab on text-cream" : "shelf-tab text-cream/70"} onClick={() => setShelf("liked")}>{t("likes")}</button>
          </>
        ) : null}
      </div>
      <div className="mt-4 space-y-5">
        {(shelf === "pages" ? posts : kept).map((post) => (
          <button key={post.id} type="button" className="block w-full text-left" onClick={() => desk.openPost(post.id)}>
            <BookPage post={post} />
          </button>
        ))}
        {(shelf === "pages" ? posts : kept).length === 0 ? (
          <p className="font-serif text-xl text-cream/80">
            {shelf === "saved" ? t("emptyRibbon") : shelf === "liked" ? t("emptyLikes") : t("noPages")}
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
                <button type="button" className="min-h-11 text-left" onClick={() => desk.openUser(person.userId)}>
                  <span className="block font-semibold">{person.displayName}</span>
                  <span className="text-xs text-cream/70">@{person.handle}</span>
                </button>
                <button
                  type="button"
                  className="paper-btn"
                  onClick={() => void toggleFollow({ data: { userId: person.userId } }).then(() => { desk.refresh(); listPeople().then(setPeople); })}
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
                    <button type="button" className="ghost-btn text-cream" onClick={() => void toggleBlock({ data: { userId: person.userId } }).then(() => listBlocks().then(setBlocked))}>
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
        <p className="mt-1 text-xs text-ink-soft">Só entra foto de verdade, pequena. Sem link e sem arquivo estranho.</p>
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
      <input className="field" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nome" />
      <input className="field" value={penName} onChange={(e) => setPenName(e.target.value)} placeholder="Nome de pena" />
      <input className="field" value={handle} onChange={(e) => setHandle(slugHandle(e.target.value))} placeholder="usuario" />
      <label className="block text-sm">
        Descrição do caderno
        <textarea className="field mt-1" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Uma linha sobre você" maxLength={180} />
      </label>
      <PortraitField current={profile.avatarData} />
      <input className="field" value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Nota no topo, fica uma semana" maxLength={80} />
      <MoldPicker value={moldId} onChange={setMoldId} />
      <InkPicker value={inkId} onChange={setInkId} />
      {error ? <p className="text-sm text-seal">{error}</p> : null}
      <button className="seal-btn w-full" disabled={busy} type="submit">{busy ? "Salvando…" : "Salvar"}</button>
    </form>
  );
}

export function ChatList() {
  const desk = useDesk();
  const { t } = useLang();
  const [rows, setRows] = useState<ChatPreview[] | null>(null);
  useEffect(() => {
    listConversations().then(setRows).catch(() => setRows([]));
  }, [desk.tick]);
  if (!rows) return <p className="px-5 py-10 font-serif text-cream">{t("openingLetters")}</p>;
  return (
    <div className="h-full overflow-y-auto px-4 py-4 text-cream">
      <h2 className="font-serif text-4xl">{t("letters")}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-cream/80">{t("noLetters")}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((row) => (
            <li key={row.id}>
              <button type="button" className="flex min-h-14 w-full items-center gap-3 text-left" onClick={() => desk.openChat(row.id, row.penName || row.displayName)}>
                <Portrait name={row.penName || row.displayName} />
                <span className="min-w-0">
                  <span className="block font-semibold">{row.penName || row.displayName}</span>
                  <span className="block truncate text-sm text-cream/70">{row.lastBody || t("letterOpen")}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ChatThread({ conversationId, title, onClose }: { conversationId: string; title: string; onClose: () => void }) {
  const { t } = useLang();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  function load() {
    listMessages({ data: { conversationId } }).then((res) => {
      setMessages(res.messages);
      if (res.error) setError(res.error);
    }).catch(() => setError("Não deu pra abrir a carta."));
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 4000);
    return () => window.clearInterval(timer);
  }, [conversationId]);

  return (
    <div className="sheet sheet-wood">
      <header className="flex items-center gap-2 px-2 py-2">
        <button type="button" className="grid size-11 place-items-center" aria-label="Voltar" onClick={onClose}>
          <ChevronLeft />
        </button>
        <h2 className="font-serif text-2xl">{title}</h2>
      </header>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {messages.map((message) => (
          <p key={message.id} className={message.mine ? "bubble-me" : "bubble-them"}>{message.body}</p>
        ))}
        {messages.length === 0 ? <p className="text-sm text-cream/70">{t("startLetter")}</p> : null}
      </div>
      <form
        className="flex gap-2 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          const body = text.trim();
          if (!body) return;
          setText("");
          void sendMessage({ data: { conversationId, body } }).then((res) => {
            if (!res.ok) {
              setError(res.error);
              return;
            }
            load();
          });
        }}
      >
        <input className="field" placeholder="Escrever" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="seal-fab shrink-0" type="submit" aria-label="Enviar">
          <Send className="size-5" />
        </button>
      </form>
      {error ? <p className="px-4 pb-3 text-sm text-cream">{error}</p> : null}
    </div>
  );
}
