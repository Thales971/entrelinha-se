import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { acceptAvatar, acceptImage, markPace, pace, rejectText } from "@/lib/entrelinhas/guard";
import {
  INK_IDS,
  KIND_META,
  MOLD_IDS,
  POST_KINDS,
  REPORT_REASONS,
  type ChatMessage,
  type ChatPreview,
  type CommentItem,
  type InkId,
  type MoldId,
  type Person,
  type PostCard,
  type PostKind,
  type Profile,
  type ReportReason,
  type StoryItem,
  type TrayPerson,
} from "@/lib/entrelinhas/model";

const KIND_SET = new Set<string>(POST_KINDS);
const MOLD_SET = new Set<string>(MOLD_IDS);
const INK_SET = new Set<string>(INK_IDS);
const REASON_SET = new Set<string>(REPORT_REASONS.map((r) => r.id));
const RESERVED = new Set(["casa", "admin", "entrelinhas", "entrelinha-se", "entrelinhase", "suporte"]);

function asRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  return input as Record<string, unknown>;
}

function clip(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "")
    .trim()
    .slice(0, max);
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function moldOf(value: unknown): MoldId {
  return typeof value === "string" && MOLD_SET.has(value) ? (value as MoldId) : "creme";
}

function inkOf(value: unknown): InkId {
  return typeof value === "string" && INK_SET.has(value) ? (value as InkId) : "sepia";
}

function kindOf(value: unknown): PostKind | null {
  return typeof value === "string" && KIND_SET.has(value) ? (value as PostKind) : null;
}

function alignOf(value: unknown, kind: PostKind): "left" | "center" {
  if (value === "center" || value === "left") return value;
  return kind === "frase" || kind === "nota" ? "center" : "left";
}

function safeName(value: string) {
  return rejectText(value) ? "Retido" : value;
}

function duplicate(error: unknown) {
  const msg = error instanceof Error ? error.message.toLowerCase() : "";
  return msg.includes("unique") || msg.includes("duplicate");
}

function err(error: string) {
  return { ok: false as const, error };
}

type PostRow = {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string;
  cited_author: string;
  song_title: string;
  artist: string;
  cover_data: string;
  mold_id: string;
  ink_id: string;
  align: string;
  created_at: string;
  handle: string;
  display_name: string;
  pen_name: string;
  like_count: number;
  comment_count: number;
  liked_by_me: number;
  avatar_data?: string | null;
  saved_by_me?: number;
  reposted_by_me?: number;
  repost_count?: number;
  reposter_name?: string | null;
  reposter_handle?: string | null;
};

function mapPost(r: PostRow): PostCard {
  const kind = kindOf(r.kind) ?? "nota";
  const card: PostCard = {
    id: r.id,
    userId: r.user_id,
    kind,
    title: r.title ?? "",
    body: r.body ?? "",
    citedAuthor: r.cited_author ?? "",
    songTitle: r.song_title ?? "",
    artist: r.artist ?? "",
    coverData: r.cover_data ?? "",
    moldId: moldOf(r.mold_id),
    inkId: inkOf(r.ink_id),
    align: r.align === "center" ? "center" : "left",
    createdAt: r.created_at,
    handle: r.handle,
    displayName: safeName(r.display_name),
    penName: rejectText(r.pen_name) ? "" : r.pen_name,
    likeCount: num(r.like_count),
    commentCount: num(r.comment_count),
    liked: num(r.liked_by_me) > 0,
    saved: num(r.saved_by_me) > 0,
    reposted: num(r.reposted_by_me) > 0,
    repostCount: num(r.repost_count),
    reposterName: r.reposter_name ? safeName(r.reposter_name) : "",
    reposterHandle: r.reposter_handle ?? "",
    avatarData: acceptAvatar(r.avatar_data ?? ""),
  };
  if (card.userId !== "casa" && rejectText(card.title, card.body, card.citedAuthor, card.songTitle, card.artist)) {
    card.title = "";
    card.body = "Esta página foi retida.";
    card.citedAuthor = "";
    card.songTitle = "";
    card.artist = "";
    card.coverData = "";
  }
  return card;
}

async function isBlocked(a: string, b: string) {
  const sql = await getSql();
  const rows = await sql<{ ok: number }>`
    select 1 as ok from blocks
    where (blocker_id = ${a} and blocked_id = ${b})
       or (blocker_id = ${b} and blocked_id = ${a})
    limit 1
  `;
  return rows.length > 0;
}

async function loadBundle(viewerId: string, userId: string) {
  const sql = await getSql();
  const rows = await sql<{
    user_id: string;
    handle: string;
    display_name: string;
    pen_name: string;
    bio: string;
    mold_id: string;
    ink_id: string;
    note_text: string;
    note_fresh: number;
    avatar_data: string;
    followers: number;
    following: number;
    pages: number;
    followed_by_me: number;
    blocked_by_me: number;
  }>`
    select
      p.user_id, p.handle, p.display_name, p.pen_name, p.bio, p.mold_id, p.ink_id, p.avatar_data,
      case
        when p.note_text <> '' and p.note_updated_at > now() - interval '7 days'
        then p.note_text else ''
      end as note_text,
      case
        when p.note_text <> '' and p.note_updated_at > now() - interval '7 days'
        then 1 else 0
      end as note_fresh,
      (select count(*)::int from follows f where f.following_id = p.user_id) as followers,
      (select count(*)::int from follows f where f.follower_id = p.user_id) as following,
      (select count(*)::int from posts po where po.user_id = p.user_id) as pages,
      (select count(*)::int from follows f where f.follower_id = ${viewerId} and f.following_id = p.user_id) as followed_by_me,
      (select count(*)::int from blocks b where b.blocker_id = ${viewerId} and b.blocked_id = p.user_id) as blocked_by_me
    from profiles p
    where p.user_id = ${userId}
  `;
  const row = rows[0];
  if (!row) return null;
  if (viewerId !== userId && (await isBlocked(viewerId, userId))) return null;

  const posts = await sql<PostRow>`
    select
      p.id, p.user_id, p.kind, p.title, p.body, p.cited_author, p.song_title, p.artist,
      p.cover_data, p.mold_id, p.ink_id, p.align,
      to_char(p.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
      pr.handle, pr.display_name, pr.pen_name, pr.avatar_data,
      (select count(*)::int from likes l where l.post_id = p.id) as like_count,
      (select count(*)::int from comments c where c.post_id = p.id) as comment_count,
      (select count(*)::int from likes l where l.post_id = p.id and l.user_id = ${viewerId}) as liked_by_me,
      (select count(*)::int from saves s where s.post_id = p.id and s.user_id = ${viewerId}) as saved_by_me,
      (select count(*)::int from reposts rp where rp.post_id = p.id and rp.user_id = ${viewerId}) as reposted_by_me,
      (select count(*)::int from reposts rp where rp.post_id = p.id) as repost_count,
      '' as reposter_name,
      '' as reposter_handle
    from posts p
    join profiles pr on pr.user_id = p.user_id
    where p.user_id = ${userId}
      and (
        p.user_id = ${viewerId}
        or (
          select count(distinct r2.reporter_id)::int from reports r2
          where r2.target_type = 'post' and r2.target_id = p.id
        ) < 3
      )
      and not exists (
        select 1 from reports r
        where r.reporter_id = ${viewerId} and r.target_type = 'post' and r.target_id = p.id
      )
    order by p.created_at desc
    limit 40
  `;

  const profile: Profile = {
    userId: row.user_id,
    handle: row.handle,
    displayName: rejectText(row.display_name) ? "Retido" : row.display_name,
    penName: rejectText(row.pen_name) ? "" : row.pen_name,
    bio: rejectText(row.bio) ? "" : row.bio,
    avatarData: acceptAvatar(row.avatar_data ?? ""),
    moldId: moldOf(row.mold_id),
    inkId: inkOf(row.ink_id),
    noteText: rejectText(row.note_text ?? "") ? "" : (row.note_text ?? ""),
    noteFresh: num(row.note_fresh) > 0,
    followers: num(row.followers),
    following: num(row.following),
    pages: num(row.pages),
    followedByMe: num(row.followed_by_me) > 0,
    blockedByMe: num(row.blocked_by_me) > 0,
    isMe: viewerId === userId,
    isCasa: userId === "casa",
  };
  return { profile, posts: posts.map(mapPost) };
}

export const getMe = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => loadBundle(context.userId, context.userId));

export const getProfile = createServerFn({ method: "GET" })
  .validator((input: unknown) => {
    const id = clip(asRecord(input).userId, 80);
    if (!id) throw new Error("Perfil inválido");
    return { userId: id };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => loadBundle(context.userId, data.userId));

export const saveProfile = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const o = asRecord(input);
    return {
      handle: clip(o.handle, 20).toLowerCase(),
      displayName: clip(o.displayName, 40),
      penName: clip(o.penName, 40),
      bio: clip(o.bio, 180),
      moldId: moldOf(o.moldId),
      inkId: inkOf(o.inkId),
      noteText: clip(o.noteText, 80),
      acceptTerms: o.acceptTerms === true,
    };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    if (!/^[a-z0-9_]{3,20}$/.test(data.handle)) {
      return err("O @ precisa ter 3 a 20 letras, números ou _.");
    }
    if (RESERVED.has(data.handle)) return err("Esse @ já é da casa.");
    if (data.displayName.length < 2) return err("Falta o nome que aparece na capa.");
    const dirty = rejectText(data.handle, data.displayName, data.penName, data.bio, data.noteText);
    if (dirty) return err(dirty);
    const sql = await getSql();
    const me = context.userId;
    const slow = await pace(sql, me, "profile");
    if (slow) return err(slow);
    const existing = await sql<{ handle: string; accepted_terms_at: string | null }>`
      select handle, accepted_terms_at::text as accepted_terms_at from profiles where user_id = ${me}
    `;
    const taken = await sql<{ user_id: string }>`
      select user_id from profiles where handle = ${data.handle} and user_id <> ${me}
    `;
    if (taken.length) return err("Esse @ já está em outro caderno.");
    if (!existing.length && !data.acceptTerms) {
      return err("Aceita as regras do caderno pra entrar.");
    }
    const pen = data.penName || data.displayName;
    try {
      if (!existing.length) {
        await sql`
          insert into profiles (
            user_id, handle, display_name, pen_name, bio, mold_id, ink_id, note_text, note_updated_at, accepted_terms_at
          ) values (
            ${me}, ${data.handle}, ${data.displayName}, ${pen}, ${data.bio},
            ${data.moldId}, ${data.inkId}, ${data.noteText},
            case when ${data.noteText} = '' then null else now() end,
            now()
          )
        `;
      } else {
        await sql`
          update profiles set
            handle = ${data.handle},
            display_name = ${data.displayName},
            pen_name = ${pen},
            bio = ${data.bio},
            mold_id = ${data.moldId},
            ink_id = ${data.inkId},
            note_text = ${data.noteText},
            note_updated_at = case
              when note_text is distinct from ${data.noteText} then now()
              else note_updated_at
            end,
            accepted_terms_at = coalesce(accepted_terms_at, case when ${data.acceptTerms} then now() else null end)
          where user_id = ${me}
        `;
      }
    } catch (error) {
      if (duplicate(error)) return err("Esse @ já está em outro caderno.");
      throw error;
    }
    await markPace(sql, me, "profile");
    return { ok: true as const };
  });

export const listFeed = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const o = asRecord(input);
    return {
      q: clip(o.q, 60),
      mode: o.mode === "following" ? "following" : "all",
    };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const me = context.userId;
    const pat = `%${data.q.replace(/[\\%_]/g, "")}%`;
    const posts = await sql<PostRow>`
      select * from (
        select
          p.id, p.user_id, p.kind, p.title, p.body, p.cited_author, p.song_title, p.artist,
          p.cover_data, p.mold_id, p.ink_id, p.align,
          to_char(p.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
          pr.handle, pr.display_name, pr.pen_name, pr.avatar_data,
          (select count(*)::int from likes l where l.post_id = p.id) as like_count,
          (select count(*)::int from comments c where c.post_id = p.id) as comment_count,
          (select count(*)::int from likes l where l.post_id = p.id and l.user_id = ${me}) as liked_by_me,
          (select count(*)::int from saves s where s.post_id = p.id and s.user_id = ${me}) as saved_by_me,
          (select count(*)::int from reposts rp where rp.post_id = p.id and rp.user_id = ${me}) as reposted_by_me,
          (select count(*)::int from reposts rp where rp.post_id = p.id) as repost_count,
          '' as reposter_name,
          '' as reposter_handle,
          p.created_at as sort_at
        from posts p
        join profiles pr on pr.user_id = p.user_id
        where not exists (
            select 1 from blocks b
            where (b.blocker_id = ${me} and b.blocked_id = p.user_id)
               or (b.blocker_id = p.user_id and b.blocked_id = ${me})
          )
          and not exists (
            select 1 from reports r
            where r.reporter_id = ${me} and r.target_type = 'post' and r.target_id = p.id
          )
          and (
            p.user_id = ${me}
            or (
              select count(distinct r2.reporter_id)::int from reports r2
              where r2.target_type = 'post' and r2.target_id = p.id
            ) < 3
          )
          and (
            ${data.mode} <> 'following'
            or p.user_id = ${me}
            or exists (
              select 1 from follows f where f.follower_id = ${me} and f.following_id = p.user_id
            )
          )
          and (
            ${data.q} = ''
            or p.body ilike ${pat}
            or p.title ilike ${pat}
            or p.artist ilike ${pat}
            or p.song_title ilike ${pat}
            or pr.display_name ilike ${pat}
            or pr.handle ilike ${pat}
            or pr.pen_name ilike ${pat}
          )
        union all
        select
          p.id, p.user_id, p.kind, p.title, p.body, p.cited_author, p.song_title, p.artist,
          p.cover_data, p.mold_id, p.ink_id, p.align,
          to_char(r.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
          pr.handle, pr.display_name, pr.pen_name, pr.avatar_data,
          (select count(*)::int from likes l where l.post_id = p.id) as like_count,
          (select count(*)::int from comments c where c.post_id = p.id) as comment_count,
          (select count(*)::int from likes l where l.post_id = p.id and l.user_id = ${me}) as liked_by_me,
          (select count(*)::int from saves s where s.post_id = p.id and s.user_id = ${me}) as saved_by_me,
          (select count(*)::int from reposts rp where rp.post_id = p.id and rp.user_id = ${me}) as reposted_by_me,
          (select count(*)::int from reposts rp where rp.post_id = p.id) as repost_count,
          prr.display_name as reposter_name,
          prr.handle as reposter_handle,
          r.created_at as sort_at
        from reposts r
        join posts p on p.id = r.post_id
        join profiles pr on pr.user_id = p.user_id
        join profiles prr on prr.user_id = r.user_id
        where r.user_id <> p.user_id
          and not exists (
            select 1 from blocks b
            where (b.blocker_id = ${me} and b.blocked_id = p.user_id)
               or (b.blocker_id = p.user_id and b.blocked_id = ${me})
               or (b.blocker_id = ${me} and b.blocked_id = r.user_id)
               or (b.blocker_id = r.user_id and b.blocked_id = ${me})
          )
          and not exists (
            select 1 from reports rp2
            where rp2.reporter_id = ${me} and rp2.target_type = 'post' and rp2.target_id = p.id
          )
          and (
            p.user_id = ${me}
            or (
              select count(distinct r2.reporter_id)::int from reports r2
              where r2.target_type = 'post' and r2.target_id = p.id
            ) < 3
          )
          and (
            ${data.mode} <> 'following'
            or r.user_id = ${me}
            or exists (
              select 1 from follows f where f.follower_id = ${me} and f.following_id = r.user_id
            )
          )
          and (
            ${data.q} = ''
            or p.body ilike ${pat}
            or p.title ilike ${pat}
            or prr.handle ilike ${pat}
            or pr.handle ilike ${pat}
          )
      ) feed
      order by sort_at desc
      limit 40
    `;
    let people: Person[] = [];
    if (data.q.length >= 2) {
      const found = await sql<{
        user_id: string;
        handle: string;
        display_name: string;
        pen_name: string;
        bio: string;
        mold_id: string;
      }>`
        select user_id, handle, display_name, pen_name, bio, mold_id
        from profiles p
        where p.user_id <> ${me}
          and (
            p.handle ilike ${pat}
            or p.display_name ilike ${pat}
            or p.pen_name ilike ${pat}
          )
          and not exists (
            select 1 from blocks b
            where (b.blocker_id = ${me} and b.blocked_id = p.user_id)
               or (b.blocker_id = p.user_id and b.blocked_id = ${me})
          )
        order by p.display_name
        limit 8
      `;
      people = found.map((p) => ({
        userId: p.user_id,
        handle: p.handle,
        displayName: safeName(p.display_name),
        penName: rejectText(p.pen_name) ? "" : p.pen_name,
        bio: p.bio,
        moldId: moldOf(p.mold_id),
      }));
    }
    return { posts: posts.map(mapPost), people };
  });

export const listPeople = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const me = context.userId;
    const rows = await sql<{
      user_id: string;
      handle: string;
      display_name: string;
      pen_name: string;
      bio: string;
      mold_id: string;
      followed_by_me: number;
    }>`
      select p.user_id, p.handle, p.display_name, p.pen_name, p.bio, p.mold_id,
        (select count(*)::int from follows f where f.follower_id = ${me} and f.following_id = p.user_id) as followed_by_me
      from profiles p
      where p.user_id <> ${me}
        and not exists (
          select 1 from blocks b
          where (b.blocker_id = ${me} and b.blocked_id = p.user_id)
             or (b.blocker_id = p.user_id and b.blocked_id = ${me})
        )
      order by p.created_at desc
      limit 24
    `;
    return rows.map((p) => ({
      userId: p.user_id,
      handle: p.handle,
      displayName: safeName(p.display_name),
      penName: rejectText(p.pen_name) ? "" : p.pen_name,
      bio: p.bio,
      moldId: moldOf(p.mold_id),
      followedByMe: num(p.followed_by_me) > 0,
    }));
  });

export const createPost = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const o = asRecord(input);
    const kind = kindOf(o.kind);
    return {
      kind,
      title: clip(o.title, 80),
      body: clip(o.body, 4000),
      citedAuthor: clip(o.citedAuthor, 80),
      songTitle: clip(o.songTitle, 80),
      artist: clip(o.artist, 80),
      coverData: typeof o.coverData === "string" ? o.coverData.slice(0, 120_000) : "",
      moldId: moldOf(o.moldId),
      inkId: inkOf(o.inkId),
      align: o.align === "center" || o.align === "left" ? o.align : "",
    };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    if (!data.kind) return err("Escolhe o tipo da página.");
    const meta = KIND_META[data.kind];
    const body = data.body.slice(0, meta.max);
    if (!body) return err("A página está em branco.");
    const lines = body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length > meta.lines) {
      return err(
        data.kind === "musica"
          ? "Música fica em até 4 linhas. É um trecho, não a letra."
          : `Cabe até ${meta.lines} linhas nesse tipo.`,
      );
    }
    if (data.kind === "musica") {
      if (data.songTitle.length < 2 || data.artist.length < 2) {
        return err("Na música, coloca o nome e o artista.");
      }
    }
    const dirty = rejectText(data.title, body, data.citedAuthor, data.songTitle, data.artist);
    if (dirty) return err(dirty);
    let cover = "";
    if (data.kind === "musica" && data.coverData) {
      cover = acceptImage(data.coverData);
      if (!cover) return err("A capa precisa ser jpg, png ou webp, e pequena.");
    }
    const sql = await getSql();
    const me = context.userId;
    const slow = await pace(sql, me, "post");
    if (slow) return err(slow);
    const prof = await sql<{ user_id: string }>`select user_id from profiles where user_id = ${me}`;
    if (!prof.length) return err("Termina o cadastro antes de publicar.");
    const id = crypto.randomUUID();
    const align = alignOf(data.align, data.kind);
    await sql`
      insert into posts (
        id, user_id, kind, title, body, cited_author, song_title, artist, cover_data, mold_id, ink_id, align
      ) values (
        ${id}, ${me}, ${data.kind}, ${data.title}, ${body}, ${data.citedAuthor},
        ${data.kind === "musica" ? data.songTitle : ""},
        ${data.kind === "musica" ? data.artist : ""},
        ${cover}, ${data.moldId}, ${data.inkId}, ${align}
      )
    `;
    await markPace(sql, me, "post");
    return { ok: true as const, id };
  });

export const deletePost = createServerFn({ method: "POST" })
  .validator((input: unknown) => ({ id: clip(asRecord(input).id, 80) }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    if (!data.id) return err("Página inválida.");
    const sql = await getSql();
    const me = context.userId;
    const owned = await sql<{ id: string }>`
      select id from posts where id = ${data.id} and user_id = ${me}
    `;
    if (!owned.length) return err("Essa página não é sua.");
    await sql`delete from comments where post_id = ${data.id}`;
    await sql`delete from likes where post_id = ${data.id}`;
    await sql`delete from saves where post_id = ${data.id}`;
    await sql`delete from reposts where post_id = ${data.id}`;
    await sql`delete from reports where target_type = 'post' and target_id = ${data.id}`;
    await sql`delete from posts where id = ${data.id} and user_id = ${me}`;
    return { ok: true as const };
  });

export const toggleLike = createServerFn({ method: "POST" })
  .validator((input: unknown) => ({ id: clip(asRecord(input).id, 80) }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    if (!data.id) return err("Página inválida.");
    const sql = await getSql();
    const me = context.userId;
    const post = await sql<{ user_id: string }>`select user_id from posts where id = ${data.id}`;
    if (!post[0]) return err("Essa página sumiu.");
    if (await isBlocked(me, post[0].user_id)) return err("Não dá pra curtir quem você bloqueou.");
    const slow = await pace(sql, me, "like");
    if (slow) return err(slow);
    const existing = await sql<{ ok: number }>`
      select 1 as ok from likes where post_id = ${data.id} and user_id = ${me}
    `;
    if (existing.length) {
      await sql`delete from likes where post_id = ${data.id} and user_id = ${me}`;
    } else {
      await sql`insert into likes (post_id, user_id) values (${data.id}, ${me})`;
    }
    const count = await sql<{ n: number }>`
      select count(*)::int as n from likes where post_id = ${data.id}
    `;
    await markPace(sql, me, "like");
    return { ok: true as const, liked: existing.length === 0, likeCount: num(count[0]?.n) };
  });

export const toggleSave = createServerFn({ method: "POST" })
  .validator((input: unknown) => ({ id: clip(asRecord(input).id, 80) }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    if (!data.id) return err("Página inválida.");
    const sql = await getSql();
    const me = context.userId;
    const post = await sql<{ user_id: string }>`select user_id from posts where id = ${data.id}`;
    if (!post[0]) return err("Essa página sumiu.");
    if (await isBlocked(me, post[0].user_id)) return err("Não dá pra guardar.");
    const slow = await pace(sql, me, "save");
    if (slow) return err(slow);
    const existing = await sql<{ ok: number }>`
      select 1 as ok from saves where post_id = ${data.id} and user_id = ${me}
    `;
    if (existing.length) {
      await sql`delete from saves where post_id = ${data.id} and user_id = ${me}`;
    } else {
      await sql`insert into saves (post_id, user_id) values (${data.id}, ${me})`;
    }
    await markPace(sql, me, "save");
    return { ok: true as const, saved: existing.length === 0 };
  });

export const toggleRepost = createServerFn({ method: "POST" })
  .validator((input: unknown) => ({ id: clip(asRecord(input).id, 80) }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    if (!data.id) return err("Página inválida.");
    const sql = await getSql();
    const me = context.userId;
    const post = await sql<{ user_id: string }>`select user_id from posts where id = ${data.id}`;
    if (!post[0]) return err("Essa página sumiu.");
    if (post[0].user_id === me) return err("Essa página já é sua.");
    if (await isBlocked(me, post[0].user_id)) return err("Não dá pra republicar.");
    const slow = await pace(sql, me, "repost");
    if (slow) return err(slow);
    const existing = await sql<{ ok: number }>`
      select 1 as ok from reposts where post_id = ${data.id} and user_id = ${me}
    `;
    if (existing.length) {
      await sql`delete from reposts where post_id = ${data.id} and user_id = ${me}`;
    } else {
      await sql`insert into reposts (post_id, user_id) values (${data.id}, ${me})`;
    }
    const count = await sql<{ n: number }>`
      select count(*)::int as n from reposts where post_id = ${data.id}
    `;
    await markPace(sql, me, "repost");
    return { ok: true as const, reposted: existing.length === 0, repostCount: num(count[0]?.n) };
  });

export const setAvatar = createServerFn({ method: "POST" })
  .validator((input: unknown) => ({ dataUrl: clip(asRecord(input).dataUrl, 60_000) }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const me = context.userId;
    const slow = await pace(sql, me, "avatar");
    if (slow) return err(slow);
    const image = data.dataUrl ? acceptAvatar(data.dataUrl) : "";
    if (data.dataUrl && !image) return err("Essa foto não entra. Manda uma imagem pequena, de verdade.");
    const prof = await sql<{ user_id: string }>`select user_id from profiles where user_id = ${me}`;
    if (!prof.length) return err("Termina o cadastro antes do retrato.");
    await sql`update profiles set avatar_data = ${image} where user_id = ${me}`;
    await markPace(sql, me, "avatar");
    return { ok: true as const, avatarData: image };
  });

export const listShelf = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const shelf = asRecord(input).shelf;
    return { shelf: shelf === "liked" ? "liked" as const : "saved" as const };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const me = context.userId;
    const rows = await sql<PostRow>`
      select
        p.id, p.user_id, p.kind, p.title, p.body, p.cited_author, p.song_title, p.artist,
        p.cover_data, p.mold_id, p.ink_id, p.align,
        to_char(p.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
        pr.handle, pr.display_name, pr.pen_name, pr.avatar_data,
        (select count(*)::int from likes l where l.post_id = p.id) as like_count,
        (select count(*)::int from comments c where c.post_id = p.id) as comment_count,
        (select count(*)::int from likes l where l.post_id = p.id and l.user_id = ${me}) as liked_by_me,
        (select count(*)::int from saves s where s.post_id = p.id and s.user_id = ${me}) as saved_by_me,
        (select count(*)::int from reposts rp where rp.post_id = p.id and rp.user_id = ${me}) as reposted_by_me,
        (select count(*)::int from reposts rp where rp.post_id = p.id) as repost_count,
        '' as reposter_name,
        '' as reposter_handle
      from posts p
      join profiles pr on pr.user_id = p.user_id
      where (
          ${data.shelf} = 'saved' and exists (
            select 1 from saves s where s.post_id = p.id and s.user_id = ${me}
          )
        ) or (
          ${data.shelf} = 'liked' and exists (
            select 1 from likes l where l.post_id = p.id and l.user_id = ${me}
          )
        )
      order by p.created_at desc
      limit 40
    `;
    return rows.map(mapPost);
  });

export const versoDoDia = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const me = context.userId;
    const rows = await sql<{ id: string; body: string; pen_name: string; handle: string }>`
      select p.id, p.body, pr.pen_name, pr.handle
      from posts p
      join profiles pr on pr.user_id = p.user_id
      where p.kind in ('frase', 'nota')
        and char_length(p.body) between 12 and 160
        and not exists (
          select 1 from blocks b
          where (b.blocker_id = ${me} and b.blocked_id = p.user_id)
             or (b.blocker_id = p.user_id and b.blocked_id = ${me})
        )
        and (
          p.user_id = ${me}
          or (
            select count(distinct r2.reporter_id)::int from reports r2
            where r2.target_type = 'post' and r2.target_id = p.id
          ) < 3
        )
      order by p.created_at desc
      limit 24
    `;
    const clean = rows.filter((row) => !rejectText(row.body));
    if (!clean.length) return null;
    const day = Math.floor(Date.now() / 86_400_000);
    const row = clean[day % clean.length];
    return {
      id: row.id,
      body: row.body,
      name: rejectText(row.pen_name) ? row.handle : row.pen_name,
      handle: row.handle,
    };
  });

export const getPost = createServerFn({ method: "GET" })
  .validator((input: unknown) => ({ id: clip(asRecord(input).id, 80) }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const me = context.userId;
    const rows = await sql<PostRow>`
      select
        p.id, p.user_id, p.kind, p.title, p.body, p.cited_author, p.song_title, p.artist,
        p.cover_data, p.mold_id, p.ink_id, p.align,
        to_char(p.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
        pr.handle, pr.display_name, pr.pen_name, pr.avatar_data,
        (select count(*)::int from likes l where l.post_id = p.id) as like_count,
        (select count(*)::int from comments c where c.post_id = p.id) as comment_count,
        (select count(*)::int from likes l where l.post_id = p.id and l.user_id = ${me}) as liked_by_me,
        (select count(*)::int from saves s where s.post_id = p.id and s.user_id = ${me}) as saved_by_me,
        (select count(*)::int from reposts rp where rp.post_id = p.id and rp.user_id = ${me}) as reposted_by_me,
        (select count(*)::int from reposts rp where rp.post_id = p.id) as repost_count,
        '' as reposter_name,
        '' as reposter_handle
      from posts p
      join profiles pr on pr.user_id = p.user_id
      where p.id = ${data.id}
        and (
          p.user_id = ${me}
          or (
            select count(distinct r2.reporter_id)::int from reports r2
            where r2.target_type = 'post' and r2.target_id = p.id
          ) < 3
        )
        and not exists (
          select 1 from blocks b
          where (b.blocker_id = ${me} and b.blocked_id = p.user_id)
             or (b.blocker_id = p.user_id and b.blocked_id = ${me})
        )
    `;
    const post = rows[0] ? mapPost(rows[0]) : null;
    if (!post) return { post: null, comments: [] as CommentItem[] };
    const comments = await sql<{
      id: string;
      user_id: string;
      body: string;
      created_at: string;
      handle: string;
      display_name: string;
      pen_name: string;
    }>`
      select c.id, c.user_id, c.body,
        to_char(c.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
        pr.handle, pr.display_name, pr.pen_name
      from comments c
      join profiles pr on pr.user_id = c.user_id
      where c.post_id = ${data.id}
        and (
          c.user_id = ${me}
          or (
            select count(distinct r2.reporter_id)::int from reports r2
            where r2.target_type = 'comment' and r2.target_id = c.id
          ) < 3
        )
        and not exists (
          select 1 from blocks b
          where (b.blocker_id = ${me} and b.blocked_id = c.user_id)
             or (b.blocker_id = c.user_id and b.blocked_id = ${me})
        )
      order by c.created_at asc
      limit 80
    `;
    return {
      post,
      comments: comments.map((c) => ({
        id: c.id,
        userId: c.user_id,
        body: rejectText(c.body) ? "Comentário retido." : c.body,
        createdAt: c.created_at,
        handle: c.handle,
        displayName: safeName(c.display_name),
        penName: rejectText(c.pen_name) ? "" : c.pen_name,
        mine: c.user_id === me,
      })),
    };
  });

export const addComment = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const o = asRecord(input);
    return { postId: clip(o.postId, 80), body: clip(o.body, 500) };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    if (!data.postId || !data.body) return err("Escreve alguma coisa na margem.");
    const dirty = rejectText(data.body);
    if (dirty) return err(dirty);
    const sql = await getSql();
    const me = context.userId;
    const slow = await pace(sql, me, "comment");
    if (slow) return err(slow);
    const prof = await sql`select user_id from profiles where user_id = ${me}`;
    if (!prof.length) return err("Termina o cadastro antes.");
    const post = await sql<{ user_id: string }>`select user_id from posts where id = ${data.postId}`;
    if (!post[0]) return err("Essa página sumiu.");
    if (await isBlocked(me, post[0].user_id)) return err("Não dá pra comentar.");
    const id = crypto.randomUUID();
    await sql`
      insert into comments (id, post_id, user_id, body) values (${id}, ${data.postId}, ${me}, ${data.body})
    `;
    await markPace(sql, me, "comment");
    return { ok: true as const, id };
  });

export const deleteComment = createServerFn({ method: "POST" })
  .validator((input: unknown) => ({ id: clip(asRecord(input).id, 80) }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from comments where id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const toggleFollow = createServerFn({ method: "POST" })
  .validator((input: unknown) => ({ userId: clip(asRecord(input).userId, 80) }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const me = context.userId;
    if (!data.userId || data.userId === me) return err("Não dá pra seguir você mesmo.");
    if (await isBlocked(me, data.userId)) return err("Desbloqueia antes de seguir.");
    const sql = await getSql();
    const who = await sql`select user_id from profiles where user_id = ${data.userId}`;
    if (!who.length) return err("Esse caderno não existe.");
    const existing = await sql`
      select 1 as ok from follows where follower_id = ${me} and following_id = ${data.userId}
    `;
    if (existing.length) {
      await sql`delete from follows where follower_id = ${me} and following_id = ${data.userId}`;
      return { ok: true as const, following: false };
    }
    const slow = await pace(sql, me, "follow");
    if (slow) return err(slow);
    await sql`insert into follows (follower_id, following_id) values (${me}, ${data.userId})`;
    await markPace(sql, me, "follow");
    return { ok: true as const, following: true };
  });

export const listStoryTray = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const me = context.userId;
    const liveCasa = await sql`select id from stories where user_id = 'casa' and expires_at > now() limit 1`;
    if (!liveCasa.length) {
      await sql`delete from story_views where story_id in ('casa-story-mesa', 'casa-story-frase')`;
      const house = [
        ["casa-story-mesa", "Escreve como quem deixa o livro aberto na mesa."],
        ["casa-story-frase", "Uma frase curta também cabe numa história."],
      ] as const;
      for (const [id, body] of house) {
        await sql`
          insert into stories (id, user_id, body, mold_id, expires_at)
          values (${id}, 'casa', ${body}, 'creme', now() + make_interval(hours => 24))
          on conflict (id) do update set
            body = excluded.body,
            created_at = now(),
            expires_at = now() + make_interval(hours => 24)
        `;
      }
    }
    const people = await sql<{
      user_id: string;
      handle: string;
      display_name: string;
      pen_name: string;
      mold_id: string;
      avatar_data: string;
      note_text: string;
    }>`
      select p.user_id, p.handle, p.display_name, p.pen_name, p.mold_id, p.avatar_data,
        case
          when p.note_text <> '' and p.note_updated_at > now() - interval '7 days'
          then p.note_text else ''
        end as note_text
      from profiles p
      where (
          p.user_id = ${me}
          or p.user_id = 'casa'
          or exists (
            select 1 from follows f where f.follower_id = ${me} and f.following_id = p.user_id
          )
        )
        and not exists (
          select 1 from blocks b
          where (b.blocker_id = ${me} and b.blocked_id = p.user_id)
             or (b.blocker_id = p.user_id and b.blocked_id = ${me})
        )
    `;
    const stories = await sql<{
      id: string;
      user_id: string;
      body: string;
      mold_id: string;
      created_at: string;
      seen: number;
    }>`
      select s.id, s.user_id, s.body, s.mold_id,
        to_char(s.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
        (select count(*)::int from story_views v where v.story_id = s.id and v.user_id = ${me}) as seen
      from stories s
      where s.expires_at > now()
        and (
          s.user_id = ${me}
          or s.user_id = 'casa'
          or exists (
            select 1 from follows f where f.follower_id = ${me} and f.following_id = s.user_id
          )
        )
        and not exists (
          select 1 from blocks b
          where (b.blocker_id = ${me} and b.blocked_id = s.user_id)
             or (b.blocker_id = s.user_id and b.blocked_id = ${me})
        )
        and (
          s.user_id = ${me}
          or (
            select count(distinct r2.reporter_id)::int from reports r2
            where r2.target_type = 'story' and r2.target_id = s.id
          ) < 3
        )
      order by s.created_at asc
    `;
    const byUser = new Map<string, StoryItem[]>();
    for (const s of stories) {
      const list = byUser.get(s.user_id) ?? [];
      list.push({
        id: s.id,
        body: rejectText(s.body) ? "Recado retido." : s.body,
        moldId: moldOf(s.mold_id),
        createdAt: s.created_at,
        seen: num(s.seen) > 0,
      });
      byUser.set(s.user_id, list);
    }
    const tray: TrayPerson[] = people.map((p) => ({
      userId: p.user_id,
      handle: p.handle,
      displayName: safeName(p.display_name),
      penName: rejectText(p.pen_name) ? "" : p.pen_name,
      moldId: moldOf(p.mold_id),
      avatarData: acceptAvatar(p.avatar_data ?? ""),
      note: p.note_text ?? "",
      stories: byUser.get(p.user_id) ?? [],
    }));
    tray.sort((a, b) => {
      if (a.userId === me) return -1;
      if (b.userId === me) return 1;
      const au = a.stories.some((s) => !s.seen) ? 0 : 1;
      const bu = b.stories.some((s) => !s.seen) ? 0 : 1;
      return au - bu;
    });
    return tray;
  });

export const createStory = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const o = asRecord(input);
    return { body: clip(o.body, 140), moldId: moldOf(o.moldId) };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    if (data.body.length < 1) return err("A história está em branco.");
    const dirty = rejectText(data.body);
    if (dirty) return err(dirty);
    const sql = await getSql();
    const me = context.userId;
    const slow = await pace(sql, me, "story");
    if (slow) return err(slow);
    const prof = await sql`select user_id from profiles where user_id = ${me}`;
    if (!prof.length) return err("Termina o cadastro antes.");
    const id = crypto.randomUUID();
    await sql`
      insert into stories (id, user_id, body, mold_id, expires_at)
      values (${id}, ${me}, ${data.body}, ${data.moldId}, now() + make_interval(hours => 24))
    `;
    await markPace(sql, me, "story");
    return { ok: true as const, id };
  });

export const markStorySeen = createServerFn({ method: "POST" })
  .validator((input: unknown) => ({ id: clip(asRecord(input).id, 80) }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    if (!data.id) return { ok: true as const };
    const sql = await getSql();
    await sql`
      insert into story_views (story_id, user_id) values (${data.id}, ${context.userId})
      on conflict do nothing
    `;
    return { ok: true as const };
  });

export const deleteStory = createServerFn({ method: "POST" })
  .validator((input: unknown) => ({ id: clip(asRecord(input).id, 80) }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from story_views where story_id = ${data.id} and exists (
      select 1 from stories s where s.id = ${data.id} and s.user_id = ${context.userId}
    )`;
    await sql`delete from stories where id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const publishKey = createServerFn({ method: "POST" })
  .validator((input: unknown) => ({ publicKey: clip(asRecord(input).publicKey, 800) }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    if (!/^[A-Za-z0-9+/=]+$/.test(data.publicKey) || data.publicKey.length < 80) return err("Chave inválida.");
    const sql = await getSql();
    const rows = await sql<{ public_key: string }>`select public_key from profiles where user_id = ${context.userId}`;
    if (!rows.length) return err("Termina o cadastro antes.");
    const current = rows[0].public_key ?? "";
    if (current && current !== data.publicKey) return { ok: true as const, publicKey: current, mismatch: true as const };
    if (!current) {
      await sql`update profiles set public_key = ${data.publicKey} where user_id = ${context.userId}`;
    }
    return { ok: true as const, publicKey: data.publicKey, mismatch: false as const };
  });

export const listConversations = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const me = context.userId;
    const rows = await sql<{
      id: string;
      other_id: string;
      handle: string;
      display_name: string;
      pen_name: string;
      public_key: string;
      last_body: string;
      last_cipher: string;
      last_sender: string;
      last_at: string;
    }>`
      select c.id,
        case when c.user_a = ${me} then c.user_b else c.user_a end as other_id,
        p.handle, p.display_name, p.pen_name, p.public_key,
        coalesce((
          select m.body from messages m
          where m.conversation_id = c.id
          order by m.created_at desc
          limit 1
        ), '') as last_body,
        coalesce((
          select m.cipher from messages m
          where m.conversation_id = c.id
          order by m.created_at desc
          limit 1
        ), '') as last_cipher,
        coalesce((
          select m.sender_id from messages m
          where m.conversation_id = c.id
          order by m.created_at desc
          limit 1
        ), '') as last_sender,
        coalesce((
          select to_char(m.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
          from messages m
          where m.conversation_id = c.id
          order by m.created_at desc
          limit 1
        ), '') as last_at
      from conversations c
      join profiles p
        on p.user_id = case when c.user_a = ${me} then c.user_b else c.user_a end
      where (c.user_a = ${me} or c.user_b = ${me})
        and not exists (
          select 1 from blocks b
          where (b.blocker_id = ${me} and b.blocked_id = p.user_id)
             or (b.blocker_id = p.user_id and b.blocked_id = ${me})
        )
      order by coalesce(
        (select max(m.created_at) from messages m where m.conversation_id = c.id),
        c.created_at
      ) desc
    `;
    const chats: ChatPreview[] = rows.map((r) => ({
      id: r.id,
      otherUserId: r.other_id,
      handle: r.handle,
      displayName: safeName(r.display_name),
      penName: rejectText(r.pen_name) ? "" : r.pen_name,
      lastBody: r.last_cipher ? "" : rejectText(r.last_body) ? "Mensagem retida." : r.last_body,
      lastCipher: r.last_cipher ?? "",
      lastMine: r.last_sender === me,
      lastAt: r.last_at,
      publicKey: r.public_key ?? "",
    }));
    return chats;
  });

export const openConversation = createServerFn({ method: "POST" })
  .validator((input: unknown) => ({ userId: clip(asRecord(input).userId, 80) }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const me = context.userId;
    if (!data.userId || data.userId === me) return err("Escolhe outra pessoa.");
    if (data.userId === "casa") return err("A casa não responde no chat. Ela fica no feed.");
    if (await isBlocked(me, data.userId)) return err("Não dá pra escrever pra quem está bloqueado.");
    const sql = await getSql();
    const who = await sql`select user_id from profiles where user_id = ${data.userId}`;
    if (!who.length) return err("Esse caderno não existe.");
    const userA = me < data.userId ? me : data.userId;
    const userB = me < data.userId ? data.userId : me;
    const existing = await sql<{ id: string }>`
      select id from conversations where user_a = ${userA} and user_b = ${userB}
    `;
    if (existing[0]) return { ok: true as const, id: existing[0].id };
    const slow = await pace(sql, me, "chat");
    if (slow) return err(slow);
    const id = crypto.randomUUID();
    try {
      await sql`
        insert into conversations (id, user_a, user_b) values (${id}, ${userA}, ${userB})
      `;
    } catch (error) {
      if (!duplicate(error)) throw error;
      const again = await sql<{ id: string }>`
        select id from conversations where user_a = ${userA} and user_b = ${userB}
      `;
      if (again[0]) return { ok: true as const, id: again[0].id };
      return err("Não deu pra abrir a conversa.");
    }
    await markPace(sql, me, "chat");
    return { ok: true as const, id };
  });

async function memberOf(conversationId: string, me: string) {
  const sql = await getSql();
  const rows = await sql<{ user_a: string; user_b: string }>`
    select user_a, user_b from conversations where id = ${conversationId}
  `;
  const row = rows[0];
  if (!row) return null;
  if (row.user_a !== me && row.user_b !== me) return null;
  return row.user_a === me ? row.user_b : row.user_a;
}

export const listMessages = createServerFn({ method: "POST" })
  .validator((input: unknown) => ({ conversationId: clip(asRecord(input).conversationId, 80) }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const other = await memberOf(data.conversationId, context.userId);
    if (!other) return { messages: [] as ChatMessage[], otherKey: "", error: "Conversa fechada." };
    if (await isBlocked(context.userId, other)) {
      return { messages: [] as ChatMessage[], otherKey: "", error: "Conversa bloqueada." };
    }
    const sql = await getSql();
    const keyRows = await sql<{ public_key: string }>`select public_key from profiles where user_id = ${other}`;
    const rows = await sql<{
      id: string;
      sender_id: string;
      body: string;
      cipher: string;
      created_at: string;
    }>`
      select id, sender_id, body, cipher,
        to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at
      from (
        select * from messages
        where conversation_id = ${data.conversationId}
        order by created_at desc
        limit 200
      ) t
      order by created_at asc
    `;
    return {
      messages: rows.map((m) => ({
        id: m.id,
        senderId: m.sender_id,
        body: m.cipher ? "" : rejectText(m.body) ? "Mensagem retida." : m.body,
        cipher: m.cipher ?? "",
        createdAt: m.created_at,
        mine: m.sender_id === context.userId,
      })),
      otherKey: keyRows[0]?.public_key ?? "",
      error: "",
    };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const o = asRecord(input);
    return { conversationId: clip(o.conversationId, 80), cipher: clip(o.cipher, 8000) };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    if (!data.cipher.startsWith("{") || !data.cipher.endsWith("}")) return err("A carta precisa ir lacrada.");
    let packed: { v?: number; forThem?: string; forMe?: string; iv?: string };
    try {
      packed = JSON.parse(data.cipher) as { v?: number; forThem?: string; forMe?: string; iv?: string };
    } catch {
      return err("A carta precisa ir lacrada.");
    }
    if (packed.v !== 1 || !packed.forThem || !packed.forMe || !packed.iv) return err("A carta precisa ir lacrada.");
    const other = await memberOf(data.conversationId, context.userId);
    if (!other) return err("Conversa fechada.");
    if (await isBlocked(context.userId, other)) return err("Não dá pra enviar.");
    const sql = await getSql();
    const slow = await pace(sql, context.userId, "message");
    if (slow) return err(slow);
    const id = crypto.randomUUID();
    await sql`
      insert into messages (id, conversation_id, sender_id, body, cipher)
      values (${id}, ${data.conversationId}, ${context.userId}, '', ${data.cipher})
    `;
    await markPace(sql, context.userId, "message");
    return { ok: true as const, id };
  });

export const reportContent = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const o = asRecord(input);
    const reason = typeof o.reason === "string" && REASON_SET.has(o.reason) ? (o.reason as ReportReason) : null;
    const targetType = clip(o.targetType, 20);
    return {
      targetType,
      targetId: clip(o.targetId, 80),
      reason,
      alsoBlock: o.alsoBlock === true,
    };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    if (!data.reason || !data.targetId) return err("Falta o motivo.");
    const allowed = new Set(["post", "user", "story", "comment", "message"]);
    if (!allowed.has(data.targetType)) return err("Não dá pra denunciar isso.");
    const sql = await getSql();
    const me = context.userId;
    const slow = await pace(sql, me, "report");
    if (slow) return err(slow);
    const found = await sql<{ user_id: string }>`
      select user_id from posts where id = ${data.targetId} and ${data.targetType} = 'post'
      union all
      select user_id from profiles where user_id = ${data.targetId} and ${data.targetType} = 'user'
      union all
      select user_id from stories where id = ${data.targetId} and ${data.targetType} = 'story'
      union all
      select user_id from comments where id = ${data.targetId} and ${data.targetType} = 'comment'
      union all
      select m.sender_id as user_id
      from messages m
      join conversations c on c.id = m.conversation_id
      where m.id = ${data.targetId}
        and ${data.targetType} = 'message'
        and (c.user_a = ${me} or c.user_b = ${me})
    `;
    const owner = found[0]?.user_id ?? "";
    if (!owner) return err("Isso não está mais aqui.");
    if (owner === me) return err("Não precisa denunciar o que é seu. Apaga.");
    await sql`
      insert into reports (id, reporter_id, target_type, target_id, reason)
      values (${crypto.randomUUID()}, ${me}, ${data.targetType}, ${data.targetId}, ${data.reason})
      on conflict (reporter_id, target_type, target_id) do nothing
    `;
    await markPace(sql, me, "report");
    if (data.alsoBlock && owner !== "casa") {
      await sql`
        insert into blocks (blocker_id, blocked_id) values (${me}, ${owner})
        on conflict do nothing
      `;
      await sql`
        delete from follows
        where (follower_id = ${me} and following_id = ${owner})
           or (follower_id = ${owner} and following_id = ${me})
      `;
    }
    return { ok: true as const };
  });

export const toggleBlock = createServerFn({ method: "POST" })
  .validator((input: unknown) => ({ userId: clip(asRecord(input).userId, 80) }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const me = context.userId;
    if (!data.userId || data.userId === me || data.userId === "casa") {
      return err("Não dá pra bloquear essa conta.");
    }
    const sql = await getSql();
    const existing = await sql`
      select 1 as ok from blocks where blocker_id = ${me} and blocked_id = ${data.userId}
    `;
    if (existing.length) {
      await sql`delete from blocks where blocker_id = ${me} and blocked_id = ${data.userId}`;
      return { ok: true as const, blocked: false };
    }
    await sql`
      insert into blocks (blocker_id, blocked_id) values (${me}, ${data.userId})
      on conflict do nothing
    `;
    await sql`
      delete from follows
      where (follower_id = ${me} and following_id = ${data.userId})
         or (follower_id = ${data.userId} and following_id = ${me})
    `;
    return { ok: true as const, blocked: true };
  });

export const listBlocks = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ user_id: string; handle: string; display_name: string }>`
      select p.user_id, p.handle, p.display_name
      from blocks b
      join profiles p on p.user_id = b.blocked_id
      where b.blocker_id = ${context.userId}
      order by b.created_at desc
    `;
    return rows.map((r) => ({
      userId: r.user_id,
      handle: r.handle,
      displayName: safeName(r.display_name),
    }));
  });
