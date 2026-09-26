import { useEffect, useState } from "react";
import { ChevronLeft, Trash2 } from "lucide-react";
import { addComment, deleteComment, deletePost, getPost, reportContent, toggleBlock } from "@/lib/entrelinhas/api";
import { REPORT_REASONS, formatWhen, type CommentItem, type PostCard, type ReportReason } from "@/lib/entrelinhas/model";
import { BookPage } from "@/components/entrelinhas/book-page";
import { PageActions } from "@/components/entrelinhas/feed";
import { useDesk } from "@/components/entrelinhas/desk";
import { useLang } from "@/lib/entrelinhas/i18n";

export function PostSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const desk = useDesk();
  const { t } = useLang();
  const [post, setPost] = useState<PostCard | null | undefined>(undefined);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<ReportReason>("assedio");
  const [alsoBlock, setAlsoBlock] = useState(false);

  function load() {
    getPost({ data: { id } })
      .then((res) => {
        setPost(res.post);
        setComments(res.comments);
      })
      .catch(() => setPost(null));
  }

  useEffect(() => {
    load();
  }, [id]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const res = await addComment({ data: { postId: id, body: text } });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setText("");
    setError("");
    load();
    desk.refresh();
  }

  if (post === undefined) return <div className="sheet items-center justify-center font-serif">{t("openingPage")}</div>;
  if (!post) {
    return (
      <div className="sheet items-center justify-center gap-3 px-6 text-center">
        <p className="font-serif text-2xl">{t("pageGone")}</p>
        <button type="button" className="paper-btn" onClick={onClose}>{t("back")}</button>
      </div>
    );
  }

  return (
    <div className="sheet">
      <header className="flex items-center gap-2 px-2 py-2">
        <button type="button" className="grid size-11 place-items-center" aria-label="Voltar" onClick={onClose}>
          <ChevronLeft />
        </button>
        <h2 className="font-serif text-xl">{t("inMargin")}</h2>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <BookPage post={post} />
        <div className="ink-actions">
          <PageActions post={post} tone="ink" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {post.userId === desk.meId ? (
            <button
              type="button"
              className="ghost-btn inline-flex items-center gap-1"
              onClick={() => {
                void deletePost({ data: { id: post.id } }).then(() => {
                  desk.refresh();
                  onClose();
                });
              }}
            >
              <Trash2 className="size-4" /> Apagar
            </button>
          ) : (
            <>
              <button type="button" className="ghost-btn" onClick={() => setReporting((v) => !v)}>Denunciar</button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  void toggleBlock({ data: { userId: post.userId } }).then(() => {
                    desk.refresh();
                    onClose();
                  });
                }}
              >
                Bloquear
              </button>
            </>
          )}
        </div>
        {reporting ? (
          <form
            className="mt-3 space-y-2 rounded-2xl bg-paper-deep p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void reportContent({
                data: { targetType: "post", targetId: post.id, reason, alsoBlock },
              }).then((res) => {
                if (!res.ok) {
                  setError(res.error);
                  return;
                }
                desk.refresh();
                onClose();
              });
            }}
          >
            {REPORT_REASONS.map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-sm">
                <input type="radio" name="reason" checked={reason === item.id} onChange={() => setReason(item.id)} />
                {item.label}
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} />
              Bloquear também
            </label>
            <button className="seal-btn" type="submit">Enviar denúncia</button>
          </form>
        ) : null}
        <h3 className="mt-6 font-serif text-lg">{t("margin")}</h3>
        <ul className="mt-2 space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="text-sm">
              <p className="font-serif">{comment.body}</p>
              <p className="text-xs text-ink-soft">
                {comment.penName || comment.displayName} · @{comment.handle} · {formatWhen(comment.createdAt)}
                {comment.mine ? (
                  <button type="button" className="ml-2 underline" onClick={() => void deleteComment({ data: { id: comment.id } }).then(load)}>
                    apagar
                  </button>
                ) : null}
              </p>
            </li>
          ))}
          {comments.length === 0 ? <li className="text-sm text-ink-soft">{t("marginEmpty")}</li> : null}
        </ul>
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-ink/10 p-3">
        <input className="field" placeholder="Escrever na margem" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="seal-btn shrink-0 px-4" type="submit">Ok</button>
      </form>
      {error ? <p className="px-4 pb-3 text-sm text-seal">{error}</p> : null}
    </div>
  );
}
