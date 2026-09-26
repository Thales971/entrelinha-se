import type { Sql } from "@/lib/db";

const WORDS = [
  "merda",
  "merdinha",
  "porra",
  "caralho",
  "caralha",
  "foder",
  "fodase",
  "fodendo",
  "buceta",
  "putaria",
  "arrombado",
  "arrombada",
  "vadia",
  "punheta",
  "boquete",
  "viado",
  "viada",
  "bicha",
  "bixa",
  "traveco",
  "filho da puta",
  "filha da puta",
  "vai se foder",
  "vai tomar no cu",
  "te mato",
  "vou te matar",
  "vou te estuprar",
  "te estupro",
];

const BOUNDARY = new RegExp(`\\b(?:${WORDS.map(escapeReg).join("|")})\\b`, "i");
const LONG = WORDS.filter((word) => word.length >= 5 && !word.includes(" "));

const MINOR = /\b(crianca|criancinha|menor de idade|pedofil\w*|infantil)\b/;
const SEXUAL = /\b(sexo|nua|nuas|pelad\w*|buceta|penis|transar|porn\w*|estupra\w*|foder|fodendo)\b/;

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

function escapeReg(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[@4]/g, "a")
    .replace(/3/g, "e")
    .replace(/1/g, "i")
    .replace(/0/g, "o")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .toLowerCase();
}

export function rejectText(...parts: string[]): string | null {
  const raw = parts.filter((part) => part.trim()).join("\n");
  if (!raw) return null;
  const folded = fold(raw);
  const spaced = folded.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
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
  const words = spaced.split(" ").filter(Boolean);
  if (words.length >= 8) {
    const counts = new Map<string, number>();
    for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);
    const top = Math.max(...counts.values());
    if (top >= 8 && top / words.length > 0.6) return "Isso parece spam. Escreve de verdade.";
  }
  if (MINOR.test(spaced) && SEXUAL.test(spaced)) {
    return "Esse tipo de texto não entra.";
  }
  if (BOUNDARY.test(spaced) || LONG.some((word) => squeezed.includes(word))) {
    return "Xingamento, ameaça e ódio não passam neste caderno.";
  }
  return null;
}

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
