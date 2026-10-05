-- ============================================================
-- الأصدقاء + الدردشة اللحظية (Realtime) — شغّل الملف ده مرة واحدة في Supabase SQL Editor
-- ============================================================

create table if not exists public.friend_requests (
  id text primary key,
  sender_id text not null,
  sender_player_id text not null default '',
  sender_name text not null default '',
  sender_avatar text not null default '',
  sender_rating int not null default 1000,
  receiver_id text not null,
  status text not null default 'PENDING' check (status in ('PENDING','ACCEPTED','REJECTED')),
  created_at timestamptz not null default now()
);
create index if not exists friend_requests_sender_idx on public.friend_requests (sender_id);
create index if not exists friend_requests_receiver_idx on public.friend_requests (receiver_id);

create table if not exists public.direct_messages (
  id text primary key,
  conversation_key text not null,
  sender_id text not null,
  sender_name text not null default '',
  recipient_id text not null,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists direct_messages_conv_idx on public.direct_messages (conversation_key, created_at);
create index if not exists direct_messages_recipient_idx on public.direct_messages (recipient_id, created_at desc);

alter table public.friend_requests enable row level security;
alter table public.direct_messages enable row level security;

drop policy if exists "friend_requests read" on public.friend_requests;
create policy "friend_requests read" on public.friend_requests for select using (true);
drop policy if exists "friend_requests insert" on public.friend_requests;
create policy "friend_requests insert" on public.friend_requests for insert with check (true);
drop policy if exists "friend_requests update" on public.friend_requests;
create policy "friend_requests update" on public.friend_requests for update using (true) with check (true);
drop policy if exists "friend_requests delete" on public.friend_requests;
create policy "friend_requests delete" on public.friend_requests for delete using (true);

drop policy if exists "direct_messages read" on public.direct_messages;
create policy "direct_messages read" on public.direct_messages for select using (true);
drop policy if exists "direct_messages insert" on public.direct_messages;
create policy "direct_messages insert" on public.direct_messages for insert with check (true);

-- تفعيل البث اللحظي
do $$ begin
  begin alter publication supabase_realtime add table public.friend_requests; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.direct_messages; exception when duplicate_object then null; end;
end $$;

-- ============================================================
-- المدربين (لوحة الأدمن) + بث لحظي للاعبين والمدربين
-- ============================================================
create table if not exists public.coaches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_ar text not null,
  rating int not null default 75 check (rating between 40 and 99),
  nationality_ar text default '',
  photo_url text not null,
  rarity text not null default 'Rare',
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.coaches enable row level security;
drop policy if exists "public read published coaches" on public.coaches;
create policy "public read published coaches" on public.coaches for select using (is_published = true);
drop policy if exists "admin full access coaches" on public.coaches;
create policy "admin full access coaches" on public.coaches for all using (public.is_admin()) with check (public.is_admin());

do $$ begin
  begin alter publication supabase_realtime add table public.players; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.coaches; exception when duplicate_object then null; end;
end $$;

-- ============================================================
-- تنظيف البطاقات القديمة (اختياري — شغّله لو عايز تبدأ من الصفر)
-- ============================================================
-- delete from public.players;
-- delete from public.coaches;
