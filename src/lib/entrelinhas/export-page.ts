import type { PostCard } from "@/lib/entrelinhas/model";
import { KIND_META } from "@/lib/entrelinhas/model";

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let cur = "";
    for (const word of words) {
      const next = cur ? `${cur} ${word}` : word;
      if (ctx.measureText(next).width > max && cur) {
        lines.push(cur);
        cur = word;
      } else {
        cur = next;
      }
    }
    if (cur) lines.push(cur);
  }
  return lines;
}

export async function downloadPage(post: PostCard) {
  await document.fonts.ready.catch(() => undefined);
  const canvas = document.createElement("canvas");
  const w = 1080;
  const h = 1440;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const paper = post.moldId === "linho" ? "#e4eee6" : "#f3eadc";
  const ink = post.inkId === "verde" ? "#1e3a32" : post.inkId === "preta" ? "#1a1614" : "#3a2a1c";
  ctx.fillStyle = "#2e2118";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = paper;
  ctx.beginPath();
  ctx.roundRect(80, 80, w - 160, h - 160, 28);
  ctx.fill();
  ctx.fillStyle = "#6e4634";
  ctx.fillRect(80, 80, 26, h - 160);
  ctx.fillStyle = ink;
  ctx.font = "600 22px \"Familjen Grotesk\", sans-serif";
  ctx.fillText(KIND_META[post.kind].label.toUpperCase(), 150, 170);
  let y = 240;
  ctx.font = "600 54px \"EB Garamond\", Palatino, serif";
  const heading = post.kind === "musica" ? post.songTitle : post.title;
  if (heading) {
    for (const line of wrap(ctx, heading, 780).slice(0, 3)) {
      ctx.fillText(line, 150, y);
      y += 64;
    }
    y += 10;
  }
  if (post.kind === "musica" && post.artist) {
    ctx.font = "500 26px \"Familjen Grotesk\", sans-serif";
    ctx.fillText(post.artist, 150, y);
    y += 56;
  }
  ctx.font = "500 42px \"EB Garamond\", Palatino, serif";
  const body = wrap(ctx, post.body, 780).slice(0, 16);
  for (const line of body) {
    ctx.fillText(line, post.align === "center" ? (w - ctx.measureText(line).width) / 2 : 150, y);
    y += 56;
  }
  y = Math.max(y + 40, h - 280);
  ctx.font = "italic 500 36px \"EB Garamond\", Palatino, serif";
  const signature = post.citedAuthor || post.penName || post.displayName;
  ctx.fillText(`— ${signature}`, 150, y);
  ctx.font = "400 22px \"Familjen Grotesk\", sans-serif";
  ctx.fillText(post.citedAuthor ? `citado por @${post.handle}` : `@${post.handle}`, 150, y + 42);
  ctx.fillText("entrelinha-se", 150, h - 130);
  if (post.coverData) {
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, w - 310, h - 390, 160, 160);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = post.coverData;
    });
  }
  try {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((file) => resolve(file), "image/png"));
    if (!blob) return false;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `entrelinha-se-${post.handle}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch {
    return false;
  }
}
