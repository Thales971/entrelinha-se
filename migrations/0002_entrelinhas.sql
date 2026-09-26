create table if not exists profiles (
  user_id text primary key,
  handle text not null unique,
  display_name text not null,
  pen_name text not null default '',
  bio text not null default '',
  mold_id text not null default 'creme',
  ink_id text not null default 'sepia',
  note_text text not null default '',
  note_updated_at timestamptz,
  accepted_terms_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists posts (
  id text primary key,
  user_id text not null,
  kind text not null,
  title text not null default '',
  body text not null,
  cited_author text not null default '',
  song_title text not null default '',
  artist text not null default '',
  cover_data text not null default '',
  mold_id text not null default 'creme',
  ink_id text not null default 'sepia',
  align text not null default 'left',
  created_at timestamptz not null default now()
);

create index if not exists posts_created_idx on posts (created_at desc);
create index if not exists posts_user_idx on posts (user_id, created_at desc);

create table if not exists likes (
  post_id text not null,
  user_id text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists comments (
  id text primary key,
  post_id text not null,
  user_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists comments_post_idx on comments (post_id, created_at);

create table if not exists follows (
  follower_id text not null,
  following_id text not null,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);

create index if not exists follows_following_idx on follows (following_id);

create table if not exists stories (
  id text primary key,
  user_id text not null,
  body text not null,
  mold_id text not null default 'creme',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists stories_live_idx on stories (expires_at, user_id);

create table if not exists story_views (
  story_id text not null,
  user_id text not null,
  primary key (story_id, user_id)
);

create table if not exists conversations (
  id text primary key,
  user_a text not null,
  user_b text not null,
  created_at timestamptz not null default now(),
  unique (user_a, user_b)
);

create table if not exists messages (
  id text primary key,
  conversation_id text not null,
  sender_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_conv_idx on messages (conversation_id, created_at);

create table if not exists blocks (
  blocker_id text not null,
  blocked_id text not null,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create table if not exists reports (
  id text primary key,
  reporter_id text not null,
  target_type text not null,
  target_id text not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists reports_by_reporter_idx on reports (reporter_id, target_type, target_id);

insert into profiles (
  user_id, handle, display_name, pen_name, bio, mold_id, ink_id, note_text, note_updated_at, accepted_terms_at
) values (
  'casa',
  'casa',
  'Casa Entrelinhas',
  'A Casa',
  'Páginas de domínio público e bilhetes da casa, pra estante não começar muda.',
  'creme',
  'sepia',
  'deixa o livro aberto',
  now(),
  now()
) on conflict (user_id) do nothing;

insert into posts (
  id, user_id, kind, title, body, cited_author, song_title, artist, cover_data, mold_id, ink_id, align, created_at
) values
(
  'casa-carolina',
  'casa',
  'poema',
  'A Carolina',
  E'Querida, ao pé do leito derradeiro\nEm que descansas dessa longa vida,\nAqui venho e virei, pobre querida,\nTrazer-te o coração do companheiro.',
  'Machado de Assis',
  '',
  '',
  '',
  'couro',
  'sepia',
  'left',
  now() - interval '4 days'
),
(
  'casa-sabia',
  'casa',
  'frase',
  '',
  'Minha terra tem palmeiras onde canta o sabiá.',
  'Gonçalves Dias',
  '',
  '',
  '',
  'linho',
  'verde',
  'center',
  now() - interval '3 days'
),
(
  'casa-pressa',
  'casa',
  'reflexao',
  'A pressa e a página',
  'A pressa pede uma frase. O verso pede uma página. Os dois cabem neste caderno: um pra folhear de pé, outro pra ler sentado.',
  '',
  '',
  '',
  '',
  'creme',
  'sepia',
  'left',
  now() - interval '2 days'
),
(
  'casa-luar',
  'casa',
  'musica',
  '',
  E'Não há, ó gente, ó não,\nluar como este do sertão.\nOh que saudade do luar da minha terra,\nlá na serra branquejando folhas secas.',
  '',
  'Luar do Sertão',
  'Catulo da Paixão Cearense',
  '',
  'madeira',
  'preta',
  'left',
  now() - interval '1 day'
),
(
  'casa-nota',
  'casa',
  'nota',
  '',
  'Escreve como quem deixa o livro aberto na mesa.',
  '',
  '',
  '',
  '',
  'creme',
  'sepia',
  'center',
  now() - interval '8 hours'
),
(
  'casa-margem',
  'casa',
  'frase',
  '',
  'O que não cabe no status, cabe na margem.',
  '',
  '',
  '',
  '',
  'couro',
  'preta',
  'center',
  now() - interval '2 hours'
)
on conflict (id) do nothing;
