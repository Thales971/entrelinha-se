export const POST_KINDS = ["poema", "frase", "reflexao", "musica", "nota"] as const;
export type PostKind = (typeof POST_KINDS)[number];

export const MOLD_IDS = ["creme", "couro", "madeira", "linho"] as const;
export type MoldId = (typeof MOLD_IDS)[number];

export const INK_IDS = ["sepia", "preta", "verde"] as const;
export type InkId = (typeof INK_IDS)[number];

export const KIND_META: Record<
  PostKind,
  { label: string; hint: string; max: number; lines: number }
> = {
  poema: { label: "Poema", hint: "Versos. Título se quiser.", max: 2500, lines: 80 },
  frase: { label: "Frase", hint: "Curta, pra folhear de pé.", max: 180, lines: 6 },
  reflexao: { label: "Reflexão", hint: "Um texto um pouco maior.", max: 1200, lines: 40 },
  musica: { label: "Música", hint: "Até 4 linhas. Trecho, não a letra.", max: 280, lines: 4 },
  nota: { label: "Nota", hint: "Uma linha na margem.", max: 80, lines: 2 },
};

export const MOLDS: { id: MoldId; name: string; short: string }[] = [
  { id: "creme", name: "Caderno creme", short: "Creme" },
  { id: "couro", name: "Couro", short: "Couro" },
  { id: "madeira", name: "Madeira", short: "Madeira" },
  { id: "linho", name: "Linho", short: "Linho" },
];

export const INKS: { id: InkId; name: string }[] = [
  { id: "sepia", name: "Sépia" },
  { id: "preta", name: "Preta" },
  { id: "verde", name: "Verde" },
];

export const REPORT_REASONS = [
  { id: "spam", label: "Spam ou golpe" },
  { id: "assedio", label: "Assédio ou ódio" },
  { id: "autoral", label: "Letra inteira ou coisa de terceiros" },
  { id: "outro", label: "Outra coisa" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["id"];

export const TERMS = [
  "Você entra com o seu nome e responde pelo que publica.",
  "Não cabe assédio, ameaça, nudez, golpe nem conteúdo ilegal.",
  "Música é só um trecho curto, de até 4 linhas, escrito por você. Sem letra inteira e sem capa oficial de álbum.",
  "Dá para denunciar e bloquear. Três pessoas diferentes denunciando a mesma página escondem ela dos outros.",
  "Xingamento, ameaça, discurso de ódio, link, spam e dado pessoal não são publicados, nem disfarçados.",
];

export type PostCard = {
  id: string;
  userId: string;
  kind: PostKind;
  title: string;
  body: string;
  citedAuthor: string;
  songTitle: string;
  artist: string;
  coverData: string;
  moldId: MoldId;
  inkId: InkId;
  align: "left" | "center";
  createdAt: string;
  handle: string;
  displayName: string;
  penName: string;
  likeCount: number;
  commentCount: number;
  liked: boolean;
};

export type Profile = {
  userId: string;
  handle: string;
  displayName: string;
  penName: string;
  bio: string;
  moldId: MoldId;
  inkId: InkId;
  noteText: string;
  noteFresh: boolean;
  followers: number;
  following: number;
  pages: number;
  followedByMe: boolean;
  blockedByMe: boolean;
  isMe: boolean;
  isCasa: boolean;
};

export type Person = {
  userId: string;
  handle: string;
  displayName: string;
  penName: string;
  bio: string;
  moldId: MoldId;
};

export type StoryItem = {
  id: string;
  body: string;
  moldId: MoldId;
  createdAt: string;
  seen: boolean;
};

export type TrayPerson = {
  userId: string;
  handle: string;
  displayName: string;
  penName: string;
  moldId: MoldId;
  note: string;
  stories: StoryItem[];
};

export type ChatPreview = {
  id: string;
  otherUserId: string;
  handle: string;
  displayName: string;
  penName: string;
  lastBody: string;
  lastAt: string;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  mine: boolean;
};

export type CommentItem = {
  id: string;
  userId: string;
  body: string;
  createdAt: string;
  handle: string;
  displayName: string;
  penName: string;
  mine: boolean;
};

export function slugHandle(value: string): string {
  const raw = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "")
    .slice(0, 20);
  return raw;
}

export function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
    .format(d)
    .replace(".", "");
}

export function ago(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "agora";
  const m = Math.max(1, Math.round(ms / 60000));
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h`;
  return `${Math.round(h / 24)} d`;
}
