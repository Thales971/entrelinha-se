import type { Sql } from "@/lib/db";

const EXACT = new Set([
  "merda",
  "porra",
  "caralho",
  "caralha",
  "foder",
  "foda",
  "fodase",
  "buceta",
  "puta",
  "putaria",
  "arrombado",
  "arrombada",
  "vadia",
  "vadio",
  "punheta",
  "boquete",
  "viado",
  "viada",
  "bicha",
  "bixa",
  "traveco",
  "baitola",
  "boiola",
  "maricas",
  "sapatao",
  "sapatona",
  "piroca",
  "cacete",
  "bosta",
  "otario",
  "babaca",
  "imbecil",
  "retardado",
  "mongoloide",
  "cuzao",
  "cu",
  "fdp",
  "pqp",
  "vsf",
  "vsfd",
  "tnc",
  "vtnc",
  "krl",
  "kct",
  "sfd",
  "fdc",
  "pnc",
  "vtmnc",
  "nigger",
  "nigga",
  "crioulo",
]);

const STEMS = [
  "merd",
  "puta",
  "porr",
  "fod",
  "arrombad",
  "caralh",
  "merdin",
  "bucet",
  "piroca",
  "putinh",
  "otari",
  "retardad",
  "mongoloid",
  "fodid",
  "foded",
  "cuza",
];

const PHRASES = [
  "filho da puta",
  "filha da puta",
  "vai se foder",
  "vai tomar no cu",
  "te mato",
  "vou te matar",
  "vou te estuprar",
  "te estupro",
  "sieg heil",
  "heil hitler",
  "white power",
  "ku klux",
  "morte aos",
  "seu macaco",
];

const HATE_ATTACK = /\b(odeio|odio|extermin\w*|linchar|queimar os|matar os|morte aos)\b/;
const HATE_GROUP =
  /\b(judeus?|negros?|pretos?|gays?|lesbicas?|travestis?|nordestinos?|indios|ciganos?|mulheres|muculmanos?|refugiados|cristaos?|deficientes)\b/;

const MINOR = /\b(crianca|criancinha|menor de idade|pedofil\w*|infantil)\b/;
const SEXUAL = /\b(sexo|nua|nuas|pelad\w*|buceta|penis|transar|porn\w*|estupra\w*|foder|fodendo)\b/;

const BLOCKED = "Xingamento e discurso de ódio não entram. Nada disso foi salvo.";

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[@4]/g, "a")
    .replace(/3/g, "e")
    .replace(/1/g, "i")
    .replace(/!/g, "i")
    .replace(/0/g, "o")
    .replace(/[5$]/g, "s")
    .replace(/7/g, "t")
    .toLowerCase();
}

function soften(token: string) {
  return token.replace(/(.)\1{2,}/g, "$1$1");
}

function forms(token: string) {
  const mild = soften(token);
  return [token, mild, token.replace(/k/g, "c"), mild.replace(/k/g, "c")];
}

function bannedToken(token: string) {
  for (const form of forms(token)) {
    if (EXACT.has(form)) return true;
    if (STEMS.some((stem) => form.startsWith(stem))) return true;
  }
  return false;
}

function sentenceOf(folded: string) {
  const parts = folded.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const tokens: string[] = [];
  let singles = "";
  const flush = () => {
    if (singles.length >= 2) tokens.push(singles);
    singles = "";
  };
  for (const part of parts) {
    const token = soften(part);
    if (token.length === 1) singles += token;
    else {
      flush();
      tokens.push(token);
    }
  }
  flush();
  return tokens;
}

export function rejectText(...parts: string[]): string | null {
  const raw = parts.filter((part) => part.trim()).join("\n");
  if (!raw) return null;
  if (/[卐卍]/.test(raw)) return BLOCKED;
  const folded = fold(raw);
  const tokens = sentenceOf(folded);
  const spaced = tokens.join(" ");
  const squeezed = spaced.replace(/\s/g, "");

  if (
    /https?:\/\//.test(folded) ||
    /\bwww\./.test(folded) ||
    /\b[a-z0-9-]{2,}\.(com|net|org|gg|xyz|link|me|io|br|app)\b/.test(folded) ||
    /[\w.+-]+@[\w-]+\.[a-z]{2,}/.test(folded)
  ) {
    return "Link, site e e-mail não entram no caderno.";
  }
  if (/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/.test(raw) || /\(\d{2}\)\s?9?\d{4}-?\d{4}/.test(raw)) {
    return "Não publica CPF, telefone nem dado de outra pessoa.";
  }
  if (/(.)\1{14,}/.test(squeezed)) return "Isso parece spam. Escreve de verdade.";
  if (tokens.length >= 8) {
    const counts = new Map<string, number>();
    for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
    const top = Math.max(...counts.values());
    if (top >= 8 && top / tokens.length > 0.6) return "Isso parece spam. Escreve de verdade.";
  }
  if (MINOR.test(spaced) && SEXUAL.test(spaced)) return "Esse tipo de texto não entra.";
  if (/\b1488\b/.test(spaced) || /\b14 88\b/.test(spaced)) return BLOCKED;
  if (PHRASES.some((phrase) => spaced.includes(phrase))) return BLOCKED;
  if (HATE_ATTACK.test(spaced) && HATE_GROUP.test(spaced)) return BLOCKED;
  if (tokens.some(bannedToken)) return BLOCKED;
  return null;
}

const PACE: Record<string, { limit: number; seconds: number; message: string }> = {
  post: { limit: 6, seconds: 60 * 60, message: "Calma com as páginas. Espera um pouco pra publicar de novo." },
  comment: { limit: 20, seconds: 10 * 60, message: "Muitos comentários seguidos. Espera um instante." },
  story: { limit: 8, seconds: 60 * 60, message: "Muitos recados seguidos. Espera um pouco." },
  message: { limit: 40, seconds: 10 * 60, message: "Mensagens demais agora. Espera um instante." },
  follow: { limit: 30, seconds: 60 * 60, message: "Seguir em massa não passa. Espera um pouco." },
  report: { limit: 12, seconds: 60 * 60, message: "Denúncias demais agora. Espera um pouco." },
  profile: { limit: 20, seconds: 60 * 60, message: "Você alterou o caderno rápido demais. Espera um pouco." },
  like: { limit: 60, seconds: 10 * 60, message: "Curtidas demais agora. Espera um instante." },
  chat: { limit: 15, seconds: 60 * 60, message: "Abrir conversa em massa não passa." },
};

export function acceptImage(value: string): string {
  if (!value) return "";
  if (value.length > 120_000) return "";
  const kind = value.startsWith("data:image/jpeg;base64,")
    ? "jpeg"
    : value.startsWith("data:image/png;base64,")
      ? "png"
      : value.startsWith("data:image/webp;base64,")
        ? "webp"
        : "";
  if (!kind) return "";
  const b64 = value.slice(value.indexOf(",") + 1).replace(/\s/g, "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return "";
  let bytes: Uint8Array;
  try {
    const bin = atob(b64);
    if (bin.length < 16 || bin.length > 90_000) return "";
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  } catch {
    return "";
  }
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const webp =
    String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) === "RIFF" &&
    String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) === "WEBP";
  if (kind === "jpeg" && !jpeg) return "";
  if (kind === "png" && !png) return "";
  if (kind === "webp" && !webp) return "";
  return value;
}

export async function pace(sql: Sql, userId: string, kind: string): Promise<string | null> {
  const rule = PACE[kind];
  if (!rule) return null;
  const rows = await sql<{ n: number }>`
    select count(*)::int as n
    from safety_events
    where user_id = ${userId}
      and kind = ${kind}
      and created_at > now() - (${rule.seconds} * interval '1 second')
  `;
  const n = Number(rows[0]?.n ?? 0);
  if (Number.isFinite(n) && n >= rule.limit) return rule.message;
  return null;
}

export async function markPace(sql: Sql, userId: string, kind: string) {
  if (!PACE[kind]) return;
  await sql`
    insert into safety_events (id, user_id, kind)
    values (${crypto.randomUUID()}, ${userId}, ${kind})
  `;
  await sql`
    delete from safety_events
    where user_id = ${userId}
      and created_at < now() - interval '2 days'
  `;
}