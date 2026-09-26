import { createServerFn } from "@tanstack/react-start";
import { rejectText } from "@/lib/entrelinhas/guard";

const memory = new Map<string, string>();

function cleanCode(value: string) {
  const code = value.toLowerCase().trim();
  return /^[a-z]{2,3}$/.test(code) ? code : "";
}

async function translateOne(text: string, target: string) {
  const key = `${target}\n${text}`;
  const hit = memory.get(key);
  if (hit) return hit;
  const params = new URLSearchParams({ client: "dict-chrome-ex", sl: "pt", tl: target, q: text });
  const res = await fetch(`https://translate.googleapis.com/translate_a/t?${params}`, {
    headers: { accept: "application/json", "user-agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error("traducao");
  const json: unknown = await res.json();
  const line = Array.isArray(json) ? String(json[0] ?? "") : String(json ?? "");
  if (!line || rejectText(line)) return text;
  if (memory.size > 500) memory.clear();
  memory.set(key, line);
  return line;
}

export const translateLines = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const record = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
    const target = cleanCode(typeof record.target === "string" ? record.target : "");
    const texts = Array.isArray(record.texts)
      ? record.texts.filter((item): item is string => typeof item === "string").slice(0, 40).map((item) => item.slice(0, 700))
      : [];
    return { target, texts };
  })
  .handler(async ({ data }) => {
    if (!data.target) return { ok: false as const, error: "Idioma inválido.", lines: [] as string[] };
    if (!data.texts.length) return { ok: true as const, error: "", lines: [] as string[] };
    if (data.target === "pt") return { ok: true as const, error: "", lines: data.texts };
    try {
      const lines: string[] = [];
      for (let index = 0; index < data.texts.length; index += 8) {
        const chunk = data.texts.slice(index, index + 8);
        const done = await Promise.all(chunk.map((text) => translateOne(text, data.target).catch(() => text)));
        lines.push(...done);
      }
      return { ok: true as const, error: "", lines };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não deu pra traduzir agora.";
      return { ok: false as const, error: message.slice(0, 180), lines: [] as string[] };
    }
  });
