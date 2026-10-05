-- ============================================================================
-- المواجهة | AL MWAJHA — ملف Supabase الواحد (الإعداد الكامل + منطق اللعب على السيرفر)
-- ============================================================================
-- طريقة التشغيل (مرة واحدة، وآمن تعيد تشغيله أي وقت — كله IF NOT EXISTS / OR REPLACE):
--   1) Supabase → SQL Editor → New query → الصق الملف كله → Run.
--   2) Authentication → Sign In / Providers → فعّل "Allow anonymous sign-ins".
--      (كل لاعب بياخد هوية سرية auth.uid() من غير إيميل/باسورد؛ السيرفر بيعتمد عليها.)
--   3) Authentication → Users → Add user (إيميلك + باسورد) ثم شغّل:
--        insert into public.admin_users (email) values ('you@example.com') on conflict do nothing;
--   4) حط VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في .env
--
-- اللي في الملف:
--   أ) الأساسيات: الأدمن، اللاعبين المنشورين، صور الألعاب، المستخدمين، الإشعارات، المطابقة.
--   ب) المكتبة: pool_items (لاعبين + مدربين) + player_assets (صور الأدمن بمركز صريح).
--   ج) الغرف: عامة/خاصة، كود يتحقق منه السيرفر، دعوات، جاهزية، بدء.
--   د) محرك المباراة العام: مؤقت السيرفر، إعادة الاتصال، منع التكرار، الانسحاب، تسجيل النتيجة.
--   هـ) المزاد (السيرفر هو المرجع: الرصيد، المزايدات، الأدوار، الكروت).
--   و) تاخد اللاعب أو الخفي (الخفي مخفي في السيرفر لحد الاختيار).
--   ز) ديل أور نو ديل (محتوى الصناديق والكروت سري في السيرفر + الحكم).
--
-- مبدأ الأمان: مفيش جدول لعب يقدر العميل يكتب فيه مباشرة. كل الأفعال بتعدي على
-- دوال RPC (security definer) اللي بتتحقق من الهوية والدور والرصيد والوقت داخل
-- معاملة واحدة بقفل صف (FOR UPDATE)، والأسرار في جداول ما ليهاش صلاحية قراءة.
-- ============================================================================

create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

-- ============================================================================
-- أ) الأساسيات
-- ============================================================================

-- ---------- قائمة الأدمن ----------
create table if not exists public.admin_users (
  email text primary key,
  added_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users a where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

drop policy if exists "admin reads admin list" on public.admin_users;
create policy "admin reads admin list" on public.admin_users for select using (public.is_admin());

-- ---------- الألعاب ----------
create table if not exists public.games (
  id text primary key,
  name_ar text not null,
  cover_slot int,
  server_engine boolean not null default false,   -- true = ليها محرك سيرفر (غرف أونلاين)
  sort_order int not null default 0
);
insert into public.games (id, name_ar, cover_slot, server_engine, sort_order) values
  ('AUCTION',          'المزاد',                       1, true,  1),
  ('PLAYER_OR_HIDDEN', 'تاخد اللاعب ده ولا الخفي؟',    2, true,  2),
  ('HOARTAGY_HUNTER',  'الحوارتجي والصياد',            3, false, 3),
  ('PLAYER_GUESS',     'تخمين اللاعب',                 4, false, 4),
  ('SAFI',             'اقف ف صفي عشان بصفي',          5, false, 5),
  ('YOU_ARE_THE_COACH','أنت المدرب',                   6, false, 6),
  ('DEAL_OR_NO_DEAL',  'ديل أور نو ديل',               7, true,  7)
on conflict (id) do update set name_ar = excluded.name_ar, cover_slot = excluded.cover_slot, server_engine = excluded.server_engine;
alter table public.games enable row level security;
drop policy if exists "public read games" on public.games;
create policy "public read games" on public.games for select using (true);
drop policy if exists "admin manage games" on public.games;
create policy "admin manage games" on public.games for all using (public.is_admin()) with check (public.is_admin());

-- ---------- بطاقات اللاعبين الكاملة (الأدمن بينشرها) ----------
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_ar text not null,
  position text not null,
  overall_rating int not null check (overall_rating between 1 and 99),
  nationality text default '',
  nationality_ar text default '',
  country_code text default '',
  era text default '',
  club text default '',
  club_ar text default '',
  rarity text not null default 'Normal' check (rarity in ('Normal','Rare','Elite','Legend','Icon')),
  market_value int default 0,
  photo_url text not null,
  attributes jsonb not null default '{"pace":70,"shooting":70,"passing":70,"dribbling":70,"defending":70,"physical":70}',
  clues text[] default '{}',
  description_ar text default '',
  is_published boolean not null default false,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.players add column if not exists card_image_url text;
alter table public.players drop constraint if exists players_position_check;
alter table public.players add constraint players_position_check
  check (position in ('GK','RB','LB','CB','CB1','CB2','CDM','CM','CM2','CAM','LM','RM','LW','RW','ST','CF'));
create index if not exists players_published_idx on public.players (is_published);
alter table public.players enable row level security;
drop policy if exists "public read published players" on public.players;
create policy "public read published players" on public.players for select using (is_published = true);
drop policy if exists "admin full access players" on public.players;
create policy "admin full access players" on public.players for all using (public.is_admin()) with check (public.is_admin());

-- ---------- صور أغلفة الألعاب ----------
create table if not exists public.game_images (
  slot int primary key,
  game_id text not null default '',
  image_url text,
  updated_at timestamptz not null default now()
);
alter table public.game_images drop constraint if exists game_images_slot_check;
alter table public.game_images add constraint game_images_slot_check check (slot between 1 and 7);
insert into public.game_images (slot, game_id) values
  (1,'AUCTION'),(2,'PLAYER_OR_HIDDEN'),(3,'HOARTAGY_HUNTER'),(4,'PLAYER_GUESS'),(5,'SAFI'),(6,'YOU_ARE_THE_COACH'),(7,'DEAL_OR_NO_DEAL')
on conflict (slot) do nothing;
alter table public.game_images enable row level security;
drop policy if exists "public read game images" on public.game_images;
create policy "public read game images" on public.game_images for select using (true);
drop policy if exists "admin manage game images" on public.game_images;
create policy "admin manage game images" on public.game_images for all using (public.is_admin()) with check (public.is_admin());

-- ---------- التخزين (الصور) ----------
insert into storage.buckets (id, name, public) values ('player-photos', 'player-photos', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('game-images', 'game-images', true) on conflict (id) do nothing;

drop policy if exists "public read player photos" on storage.objects;
create policy "public read player photos" on storage.objects for select using (bucket_id in ('player-photos','game-images'));
drop policy if exists "admin upload player photos" on storage.objects;
create policy "admin upload player photos" on storage.objects for insert with check (bucket_id in ('player-photos','game-images') and public.is_admin());
drop policy if exists "admin update player photos" on storage.objects;
create policy "admin update player photos" on storage.objects for update using (bucket_id in ('player-photos','game-images') and public.is_admin());
drop policy if exists "admin delete player photos" on storage.objects;
create policy "admin delete player photos" on storage.objects for delete using (bucket_id in ('player-photos','game-images') and public.is_admin());

-- ---------- دليل المستخدمين (بحث بالاسم / اللقب / Player ID) ----------
create table if not exists public.game_users (
  id text primary key,
  player_id text not null unique,
  username text not null,
  name_ar text not null,
  avatar text not null default '',
  rating int not null default 1000,
  rank_tier text not null default 'برونزي',
  status text not null default 'ONLINE' check (status in ('ONLINE','OFFLINE','IN_MATCH')),
  wins int not null default 0,
  losses int not null default 0,
  draws int not null default 0,
  games_played int not null default 0,
  win_rate int not null default 0,
  favorite_club text default '',
  favorite_player text default '',
  bio text default '',
  last_active timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists game_users_player_id_idx on public.game_users (player_id);
create index if not exists game_users_username_trgm_idx on public.game_users using gin (username gin_trgm_ops);
create index if not exists game_users_name_ar_trgm_idx on public.game_users using gin (name_ar gin_trgm_ops);
create index if not exists game_users_player_id_trgm_idx on public.game_users using gin (player_id gin_trgm_ops);
alter table public.game_users enable row level security;
drop policy if exists "public read game users" on public.game_users;
create policy "public read game users" on public.game_users for select using (true);
-- الكتابة كانت مفتوحة لأي حد؛ دلوقتي ممنوعة مباشرة وبتتم بس عن طريق claim_profile().
drop policy if exists "public upsert own game user" on public.game_users;
drop policy if exists "public update game user" on public.game_users;

-- ربط هوية Supabase (auth.uid) ببروفايل اللاعب — مقفول تماماً على العميل.
create table if not exists public.profile_links (
  auth_uid uuid primary key,
  game_user_id text not null unique,
  created_at timestamptz not null default now()
);
alter table public.profile_links enable row level security;

create or replace function public.claim_profile(
  p_id text, p_player_id text, p_username text, p_name_ar text, p_avatar text,
  p_rating int default 1000, p_rank_tier text default 'برونزي',
  p_wins int default 0, p_losses int default 0, p_draws int default 0, p_games_played int default 0,
  p_favorite_club text default '', p_favorite_player text default '', p_bio text default ''
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_link public.profile_links%rowtype; v_owner uuid;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'NOT_AUTHENTICATED'); end if;
  if coalesce(p_id,'') = '' or coalesce(p_player_id,'') = '' then return jsonb_build_object('ok', false, 'error', 'INVALID_PROFILE'); end if;

  select * into v_link from public.profile_links where auth_uid = v_uid;
  if found and v_link.game_user_id <> p_id then
    return jsonb_build_object('ok', false, 'error', 'PROFILE_MISMATCH');
  end if;
  select auth_uid into v_owner from public.profile_links where game_user_id = p_id;
  if v_owner is not null and v_owner <> v_uid then
    return jsonb_build_object('ok', false, 'error', 'PROFILE_TAKEN');
  end if;

  insert into public.profile_links (auth_uid, game_user_id) values (v_uid, p_id) on conflict do nothing;
  insert into public.game_users (id, player_id, username, name_ar, avatar, rating, rank_tier, status, wins, losses, draws,
                                 games_played, win_rate, favorite_club, favorite_player, bio, last_active, updated_at)
  values (p_id, p_player_id, left(p_username,60), left(p_name_ar,60), left(coalesce(p_avatar,''),500), greatest(p_rating,0), p_rank_tier, 'ONLINE',
          greatest(p_wins,0), greatest(p_losses,0), greatest(p_draws,0), greatest(p_games_played,0),
          case when p_games_played > 0 then round(100.0 * p_wins / p_games_played)::int else 0 end,
          left(coalesce(p_favorite_club,''),60), left(coalesce(p_favorite_player,''),60), left(coalesce(p_bio,''),300), now(), now())
  on conflict (id) do update set
    username = excluded.username, name_ar = excluded.name_ar, avatar = excluded.avatar, rating = excluded.rating,
    rank_tier = excluded.rank_tier, status = 'ONLINE', wins = excluded.wins, losses = excluded.losses, draws = excluded.draws,
    games_played = excluded.games_played, win_rate = excluded.win_rate, favorite_club = excluded.favorite_club,
    favorite_player = excluded.favorite_player, bio = excluded.bio, last_active = now(), updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

-- ---------- الإشعارات ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id text not null,
  recipient_player_id text,
  type text not null check (type in ('MATCH_RESULT','OPPONENT_FOUND','FRIEND_REQUEST','FRIEND_ACCEPTED','GAME_INVITE','TOURNAMENT_UPDATE','COACH_EVENT','SYSTEM_UPDATE','ANNOUNCEMENT','ADMIN')),
  title text not null,
  body text not null,
  data jsonb not null default '{}',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index if not exists notifications_recipient_unread_idx on public.notifications (recipient_id) where is_read = false;
alter table public.notifications enable row level security;
drop policy if exists "public read notifications" on public.notifications;
create policy "public read notifications" on public.notifications for select using (true);
drop policy if exists "public insert notifications" on public.notifications;
create policy "public insert notifications" on public.notifications for insert with check (true);
drop policy if exists "public update notifications" on public.notifications;
create policy "public update notifications" on public.notifications for update using (true) with check (true);

create table if not exists public.player_devices (
  id uuid primary key default gen_random_uuid(),
  player_id text not null,
  device_token text not null,
  platform text not null check (platform in ('ios','android','web')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_id, device_token)
);
create index if not exists player_devices_player_idx on public.player_devices (player_id);
alter table public.player_devices enable row level security;
drop policy if exists "public upsert own device" on public.player_devices;
create policy "public upsert own device" on public.player_devices for insert with check (true);
drop policy if exists "public update own device" on public.player_devices;
create policy "public update own device" on public.player_devices for update using (true) with check (true);

create table if not exists public.notification_preferences (
  player_id text primary key,
  master_enabled boolean not null default true,
  matches boolean not null default true,
  matchmaking boolean not null default true,
  invites boolean not null default true,
  friends boolean not null default true,
  tournaments boolean not null default true,
  coach_mode boolean not null default true,
  updates boolean not null default false,
  announcements boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.notification_preferences enable row level security;
drop policy if exists "public read own prefs" on public.notification_preferences;
create policy "public read own prefs" on public.notification_preferences for select using (true);
drop policy if exists "public upsert own prefs" on public.notification_preferences;
create policy "public upsert own prefs" on public.notification_preferences for insert with check (true);
drop policy if exists "public update own prefs" on public.notification_preferences;
create policy "public update own prefs" on public.notification_preferences for update using (true) with check (true);

-- ---------- مطابقة سريعة / دعوات الأصدقاء (للألعاب اللي مالهاش محرك سيرفر) ----------
create table if not exists public.matchmaking_queue (
  id uuid primary key default gen_random_uuid(),
  player_id text not null,
  player_snapshot jsonb not null,
  game_mode text not null,
  status text not null default 'SEARCHING' check (status in ('SEARCHING','MATCHED','CANCELLED','EXPIRED')),
  matched_with text,
  opponent_snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists matchmaking_queue_search_idx on public.matchmaking_queue (game_mode, status, created_at);
create index if not exists matchmaking_queue_player_idx on public.matchmaking_queue (player_id, status);
alter table public.matchmaking_queue enable row level security;
drop policy if exists "public read queue" on public.matchmaking_queue;
create policy "public read queue" on public.matchmaking_queue for select using (true);
drop policy if exists "public insert queue" on public.matchmaking_queue;
create policy "public insert queue" on public.matchmaking_queue for insert with check (true);
drop policy if exists "public update queue" on public.matchmaking_queue;
create policy "public update queue" on public.matchmaking_queue for update using (true) with check (true);

create table if not exists public.match_invites (
  id uuid primary key default gen_random_uuid(),
  sender_id text not null,
  sender_snapshot jsonb not null,
  recipient_id text not null,
  game_mode text not null,
  status text not null default 'PENDING' check (status in ('PENDING','ACCEPTED','DECLINED','EXPIRED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists match_invites_recipient_idx on public.match_invites (recipient_id, status);
create index if not exists match_invites_sender_idx on public.match_invites (sender_id, status);
alter table public.match_invites enable row level security;
drop policy if exists "public read invites" on public.match_invites;
create policy "public read invites" on public.match_invites for select using (true);
drop policy if exists "public insert invites" on public.match_invites;
create policy "public insert invites" on public.match_invites for insert with check (true);
drop policy if exists "public update invites" on public.match_invites;
create policy "public update invites" on public.match_invites for update using (true) with check (true);

-- ============================================================================
-- ب) المراكز والمكتبة (لاعبين + مدربين) — الأدمن بيحدد المركز صراحةً، ومحدش بيخمّنه من الصورة
-- ============================================================================

-- المراكز المدعومة: GK RB LB CB1 CB2 CDM CM CM2 LW RW ST COACH
-- (الأكواد القديمة CB / CAM / LM / RM / CF لسه مفهومة للاعبين المدمجين)
create or replace function public.pos_line(p text)
returns text language sql immutable as $$
  select case
    when p = 'GK' then 'GK'
    when p in ('CB','CB1','CB2','LB','RB') then 'DEF'
    when p in ('CDM','CM','CM2','CAM','LM','RM') then 'MID'
    when p in ('LW','RW','ST','CF') then 'ATT'
    when p = 'COACH' then 'COACH'
    else null end
$$;

-- هل اللاعب اللي مركزه p يصلح لخانة التشكيلة slot؟ (مطابقة صريحة، مش بالخط كله)
create or replace function public.slot_accepts(slot text, p text)
returns boolean language sql immutable as $$
  select case slot
    when 'GK'  then p = 'GK'
    when 'RB'  then p = 'RB'
    when 'LB'  then p = 'LB'
    when 'CB1' then p in ('CB1','CB')
    when 'CB2' then p in ('CB2','CB')
    when 'CDM' then p = 'CDM'
    when 'CM'  then p = 'CM'
    when 'CM2' then p in ('CM2','CAM')
    when 'LW'  then p in ('LW','LM')
    when 'RW'  then p in ('RW','RM')
    when 'ST'  then p in ('ST','CF')
    else false end
$$;

-- خانات التشكيلة بالترتيب الفعلي للجولات: خماسي / 11
create or replace function public.formation_slots(p_size int)
returns text[] language sql immutable as $$
  select case p_size
    when 5  then array['GK','CB1','CM','CM2','ST']
    when 11 then array['GK','RB','CB1','CB2','LB','CDM','CM','CM2','RW','ST','LW']
    else null end
$$;

-- ---------- صور اللاعبين اللي بيرفعها الأدمن (لحد 50 في الدفعة) ----------
create table if not exists public.player_assets (
  id uuid primary key default gen_random_uuid(),
  game_id text not null default 'ALL',
  position text not null check (position in ('GK','RB','LB','CB1','CB2','CDM','CM','CM2','LW','RW','ST','COACH')),
  image_url text not null check (image_url ~* '^https?://'),
  rating int check (rating between 1 and 99),
  name_ar text,
  is_active boolean not null default true,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists player_assets_lookup_idx on public.player_assets (game_id, position, is_active);
alter table public.player_assets enable row level security;
drop policy if exists "public read active assets" on public.player_assets;
create policy "public read active assets" on public.player_assets for select using (is_active = true or public.is_admin());
drop policy if exists "admin manage assets" on public.player_assets;
create policy "admin manage assets" on public.player_assets for all using (public.is_admin()) with check (public.is_admin());

-- ---------- المستودع الذي يقرأ منه السيرفر (id + مركز + تقييم بس) ----------
create table if not exists public.pool_items (
  id text primary key,
  kind text not null check (kind in ('PLAYER','COACH')),
  position text not null,
  line text generated always as (public.pos_line(position)) stored,
  rating int not null default 80,
  game_id text not null default 'ALL',
  is_active boolean not null default true,
  source text not null default 'BUILTIN' check (source in ('BUILTIN','ASSET','CARD')),
  created_at timestamptz not null default now()
);
create index if not exists pool_items_lookup_idx on public.pool_items (kind, is_active, game_id, position);
alter table public.pool_items enable row level security;   -- من غير أي policy = مقفول على العميل تماماً

-- المدمجين (نفس ids الموجودة في footballData.ts). تعدّل التقييم لو حبيت من الأدمن.
insert into public.pool_items (id, kind, position, rating, source) values
  ('lionel_messi','PLAYER','RW',95,'BUILTIN'),
  ('cristiano_ronaldo','PLAYER','ST',93,'BUILTIN'),
  ('kylian_mbappe','PLAYER','ST',94,'BUILTIN'),
  ('erling_haaland','PLAYER','ST',94,'BUILTIN'),
  ('mohamed_salah','PLAYER','RW',91,'BUILTIN'),
  ('vinicius_junior','PLAYER','LW',92,'BUILTIN'),
  ('jude_bellingham','PLAYER','CM',92,'BUILTIN'),
  ('kevin_de_bruyne','PLAYER','CAM',90,'BUILTIN'),
  ('rodri','PLAYER','CDM',91,'BUILTIN'),
  ('harry_kane','PLAYER','ST',91,'BUILTIN'),
  ('robert_lewandowski','PLAYER','ST',90,'BUILTIN'),
  ('lamine_yamal','PLAYER','RW',91,'BUILTIN'),
  ('jamal_musiala','PLAYER','CAM',89,'BUILTIN'),
  ('son_heung_min','PLAYER','LW',88,'BUILTIN'),
  ('achraf_hakimi','PLAYER','RB',87,'BUILTIN'),
  ('alisson_becker','PLAYER','GK',90,'BUILTIN'),
  ('gianluigi_donnarumma','PLAYER','GK',90,'BUILTIN'),
  ('omar_marmoush','PLAYER','ST',87,'BUILTIN'),
  ('riyad_mahrez','PLAYER','RW',86,'BUILTIN'),
  ('hakim_ziyech','PLAYER','RW',80,'BUILTIN'),
  ('yassine_bounou','PLAYER','GK',86,'BUILTIN'),
  ('mike_maignan','PLAYER','GK',87,'BUILTIN'),
  ('thiago_silva','PLAYER','CB',88,'BUILTIN'),
  ('luka_modric','PLAYER','CM',90,'BUILTIN'),
  ('toni_kroos','PLAYER','CM',89,'BUILTIN'),
  ('sergio_ramos','PLAYER','CB',89,'BUILTIN'),
  ('andres_iniesta','PLAYER','CM',92,'BUILTIN'),
  ('xavi_hernandez','PLAYER','CM',91,'BUILTIN'),
  ('zinedine_zidane','PLAYER','CAM',94,'BUILTIN'),
  ('ronaldinho','PLAYER','LW',93,'BUILTIN'),
  ('ronaldo_nazario','PLAYER','ST',95,'BUILTIN'),
  ('thierry_henry','PLAYER','ST',94,'BUILTIN'),
  ('paolo_maldini','PLAYER','LB',94,'BUILTIN'),
  ('gianluigi_buffon','PLAYER','GK',93,'BUILTIN'),
  ('iker_casillas','PLAYER','GK',92,'BUILTIN'),
  ('roberto_carlos','PLAYER','LB',93,'BUILTIN'),
  ('franz_beckenbauer','PLAYER','CB',94,'BUILTIN'),
  ('eusebio','PLAYER','ST',94,'BUILTIN'),
  ('johan_cruyff','PLAYER','ST',95,'BUILTIN'),
  ('diego_maradona','PLAYER','CAM',96,'BUILTIN'),
  ('pele','PLAYER','ST',97,'BUILTIN'),
  ('carlos_valderrama','PLAYER','CAM',88,'BUILTIN'),
  ('jay_jay_okocha','PLAYER','CAM',87,'BUILTIN'),
  ('kaka','PLAYER','CAM',91,'BUILTIN'),
  ('george_best','PLAYER','RW',94,'BUILTIN'),
  ('franco_baresi','PLAYER','CB',94,'BUILTIN'),
  ('manuel_neuer','PLAYER','GK',90,'BUILTIN'),
  ('andrea_pirlo','PLAYER','CDM',90,'BUILTIN'),
  ('cafu','PLAYER','RB',92,'BUILTIN'),
  ('thibaut_courtois','PLAYER','GK',90,'BUILTIN'),
  ('pep_guardiola','COACH','COACH',96,'BUILTIN'),
  ('carlo_ancelotti','COACH','COACH',95,'BUILTIN'),
  ('jurgen_klopp','COACH','COACH',94,'BUILTIN'),
  ('jose_mourinho','COACH','COACH',93,'BUILTIN'),
  ('sir_alex_ferguson','COACH','COACH',98,'BUILTIN'),
  ('zinedine_zidane_coach','COACH','COACH',94,'BUILTIN'),
  ('arsene_wenger','COACH','COACH',92,'BUILTIN'),
  ('antonio_conte','COACH','COACH',91,'BUILTIN'),
  ('diego_simeone','COACH','COACH',91,'BUILTIN'),
  ('luis_enrique','COACH','COACH',92,'BUILTIN'),
  ('hansi_flick','COACH','COACH',90,'BUILTIN'),
  ('hassan_shehata','COACH','COACH',89,'BUILTIN')
on conflict (id) do nothing;

-- تزامن تلقائي: صور الأدمن → المستودع
create or replace function public._assets_validate() returns trigger language plpgsql as $$
begin
  if new.game_id <> 'ALL' and not exists (select 1 from public.games g where g.id = new.game_id) then
    raise exception 'UNKNOWN_GAME';
  end if;
  return new;
end $$;
drop trigger if exists player_assets_validate on public.player_assets;
create trigger player_assets_validate before insert or update on public.player_assets for each row execute function public._assets_validate();

create or replace function public._assets_sync() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    delete from public.pool_items where id = 'asset:' || old.id::text;
    return old;
  end if;
  insert into public.pool_items (id, kind, position, rating, game_id, is_active, source)
  values ('asset:' || new.id::text, case when new.position = 'COACH' then 'COACH' else 'PLAYER' end, new.position,
          coalesce(new.rating, 80), new.game_id, new.is_active, 'ASSET')
  on conflict (id) do update set position = excluded.position, rating = excluded.rating, game_id = excluded.game_id, is_active = excluded.is_active;
  return new;
end $$;
drop trigger if exists player_assets_sync on public.player_assets;
create trigger player_assets_sync after insert or update or delete on public.player_assets for each row execute function public._assets_sync();

-- تزامن تلقائي: البطاقات الكاملة المنشورة → المستودع
create or replace function public._players_sync() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    delete from public.pool_items where id = 'admin_' || old.id::text;
    return old;
  end if;
  if new.is_published then
    insert into public.pool_items (id, kind, position, rating, game_id, is_active, source)
    values ('admin_' || new.id::text, 'PLAYER', new.position, new.overall_rating, 'ALL', true, 'CARD')
    on conflict (id) do update set position = excluded.position, rating = excluded.rating, is_active = true;
  else
    delete from public.pool_items where id = 'admin_' || new.id::text;
  end if;
  return new;
end $$;
drop trigger if exists players_sync on public.players;
create trigger players_sync after insert or update or delete on public.players for each row execute function public._players_sync();

-- مزامنة أول مرة للبطاقات المنشورة قبل تركيب الملف ده
insert into public.pool_items (id, kind, position, rating, game_id, is_active, source)
select 'admin_' || id::text, 'PLAYER', position, overall_rating, 'ALL', true, 'CARD' from public.players where is_published
on conflict (id) do nothing;

-- ---------- رفع دفعة صور بمركز صريح (أدمن فقط، لحد 50) ----------
create or replace function public.admin_add_assets(p_game text, p_position text, p_urls text[], p_rating int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_url text; v_ids uuid[] := '{}'; v_id uuid;
begin
  if not public.is_admin() then return jsonb_build_object('ok', false, 'error', 'NOT_ADMIN'); end if;
  if p_position is null or p_position not in ('GK','RB','LB','CB1','CB2','CDM','CM','CM2','LW','RW','ST','COACH') then
    return jsonb_build_object('ok', false, 'error', 'INVALID_POSITION');
  end if;
  if p_game is null or (p_game <> 'ALL' and not exists (select 1 from public.games where id = p_game)) then
    return jsonb_build_object('ok', false, 'error', 'UNKNOWN_GAME');
  end if;
  if p_urls is null or coalesce(array_length(p_urls, 1), 0) = 0 then return jsonb_build_object('ok', false, 'error', 'NO_IMAGES'); end if;
  if array_length(p_urls, 1) > 50 then return jsonb_build_object('ok', false, 'error', 'TOO_MANY_IMAGES', 'max', 50); end if;
  if p_rating is not null and (p_rating < 1 or p_rating > 99) then return jsonb_build_object('ok', false, 'error', 'INVALID_RATING'); end if;

  foreach v_url in array p_urls loop
    if v_url !~* '^https?://' then return jsonb_build_object('ok', false, 'error', 'INVALID_URL'); end if;
  end loop;
  foreach v_url in array p_urls loop
    insert into public.player_assets (game_id, position, image_url, rating, created_by)
    values (p_game, p_position, v_url, p_rating, auth.jwt() ->> 'email') returning id into v_id;
    v_ids := v_ids || v_id;
  end loop;
  return jsonb_build_object('ok', true, 'count', coalesce(array_length(v_ids, 1), 0), 'position', p_position, 'game', p_game, 'ids', to_jsonb(v_ids));
end $$;

-- إحصائية المراكز للأدمن (كام صورة لكل مركز)
create or replace function public.admin_asset_stats(p_game text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then return jsonb_build_object('ok', false, 'error', 'NOT_ADMIN'); end if;
  return jsonb_build_object('ok', true, 'stats', coalesce((
    select jsonb_object_agg(position, cnt) from (
      select position, count(*) cnt from public.player_assets
       where is_active and (p_game is null or game_id in (p_game, 'ALL')) group by position) s), '{}'::jsonb));
end $$;

-- ---------- فحص كفاية المستودع قبل بدء لعبة (يتنادى من الغرف قبل الفتح) ----------
-- kind: 'F5' | 'F11' (مزاد / تاخد اللاعب: كل خانة تحتاج لاعبين اتنين على الأقل) | 'DND' (8 من كل خط + 8 مدربين)
create or replace function public._pool_count(p_game text, p_slot text)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.pool_items
   where is_active and kind = 'PLAYER' and game_id in (p_game, 'ALL') and public.slot_accepts(p_slot, position)
$$;

create or replace function public.pool_check(p_game text, p_kind text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_slots text[]; s text; v_missing jsonb := '[]'::jsonb; v_have int; v_need int; l text;
begin
  if p_kind in ('F5','F11') then
    v_slots := public.formation_slots(case p_kind when 'F5' then 5 else 11 end);
    foreach s in array v_slots loop
      v_have := public._pool_count(p_game, s);
      v_need := 2 * (select count(*) from unnest(v_slots) x where x = s);
      if v_have < v_need then v_missing := v_missing || jsonb_build_object('slot', s, 'need', v_need, 'have', v_have); end if;
    end loop;
    foreach l in array array['GK','DEF','MID','ATT'] loop
      v_need := 2 * (select count(*) from unnest(v_slots) x where public.pos_line(x) = l);
      select count(*)::int into v_have from public.pool_items
       where is_active and kind = 'PLAYER' and game_id in (p_game, 'ALL') and line = l;
      if v_have < v_need then v_missing := v_missing || jsonb_build_object('line', l, 'need', v_need, 'have', v_have); end if;
    end loop;
    select count(*)::int into v_have from public.pool_items where is_active and kind = 'COACH' and game_id in (p_game, 'ALL');
    if v_have < 2 then v_missing := v_missing || jsonb_build_object('line', 'COACH', 'need', 2, 'have', v_have); end if;
  elsif p_kind = 'DND' then
    foreach l in array array['GK','DEF','MID','ATT'] loop
      select count(*)::int into v_have from public.pool_items
       where is_active and kind = 'PLAYER' and game_id in (p_game, 'ALL') and line = l;
      if v_have < 8 then v_missing := v_missing || jsonb_build_object('line', l, 'need', 8, 'have', v_have); end if;
    end loop;
    select count(*)::int into v_have from public.pool_items where is_active and kind = 'COACH' and game_id in (p_game, 'ALL');
    if v_have < 2 then v_missing := v_missing || jsonb_build_object('line', 'COACH', 'need', 2, 'have', v_have); end if;
  else
    return jsonb_build_object('ok', false, 'error', 'INVALID_KIND');
  end if;
  return jsonb_build_object('ok', jsonb_array_length(v_missing) = 0, 'missing', v_missing);
end $$;

-- سحب عشوائي من المستودع: أولاً مطابقة صريحة للخانة، وبعدين (لو ناقص) نفس الخط بس — عمره ما بيعدّي خط تاني.
create or replace function public._pool_draw(p_game text, p_slot text, p_n int, p_exclude text[])
returns text[] language plpgsql volatile security definer set search_path = public as $$
declare v_out text[] := '{}'; v_more text[];
begin
  select coalesce(array_agg(id), '{}') into v_out from (
    select id from public.pool_items
     where is_active and kind = 'PLAYER' and game_id in (p_game, 'ALL')
       and not (id = any(p_exclude)) and public.slot_accepts(p_slot, position)
     order by random() limit p_n) t;
  if coalesce(array_length(v_out, 1), 0) < p_n then
    select coalesce(array_agg(id), '{}') into v_more from (
      select id from public.pool_items
       where is_active and kind = 'PLAYER' and game_id in (p_game, 'ALL')
         and not (id = any(p_exclude)) and not (id = any(v_out)) and line = public.pos_line(p_slot)
       order by random() limit (p_n - coalesce(array_length(v_out, 1), 0))) t;
    v_out := v_out || v_more;
  end if;
  return v_out;
end $$;

create or replace function public._pool_draw_line(p_game text, p_line text, p_n int, p_exclude text[])
returns text[] language sql volatile security definer set search_path = public as $$
  select coalesce(array_agg(id), '{}') from (
    select id from public.pool_items
     where is_active and kind = 'PLAYER' and game_id in (p_game, 'ALL') and line = p_line and not (id = any(p_exclude))
     order by random() limit p_n) t
$$;

create or replace function public._pool_draw_coach(p_game text, p_n int, p_exclude text[])
returns text[] language sql volatile security definer set search_path = public as $$
  select coalesce(array_agg(id), '{}') from (
    select id from public.pool_items
     where is_active and kind = 'COACH' and game_id in (p_game, 'ALL') and not (id = any(p_exclude))
     order by random() limit p_n) t
$$;

-- ============================================================================
-- ج) الغرف (عامة / خاصة) — الكود بيتحقق منه السيرفر، والخاصة عمرها ما بتظهر في القائمة
-- ============================================================================

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  game_id text not null references public.games(id),
  visibility text not null check (visibility in ('PUBLIC','PRIVATE')),
  status text not null default 'WAITING' check (status in ('WAITING','IN_GAME','FINISHED','CANCELLED')),
  host_id uuid not null,
  name text,
  settings jsonb not null default '{}'::jsonb,
  quick boolean not null default false,
  match_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists rooms_public_idx on public.rooms (game_id, status, visibility, created_at desc);

create table if not exists public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'PLAYER' check (role in ('PLAYER','JUDGE')),
  seat int check (seat in (1, 2)),
  display_name text not null default '',
  avatar text not null default '',
  is_ready boolean not null default false,
  is_bot boolean not null default false,
  last_seen timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create unique index if not exists room_members_seat_uq on public.room_members (room_id, seat) where seat is not null;
create index if not exists room_members_user_idx on public.room_members (user_id);

create table if not exists public.room_invites (
  room_id uuid not null references public.rooms(id) on delete cascade,
  to_uid uuid not null,
  from_uid uuid not null,
  created_at timestamptz not null default now(),
  primary key (room_id, to_uid)
);

create table if not exists public.room_join_attempts (
  id bigserial primary key,
  user_id uuid not null,
  created_at timestamptz not null default now()
);
create index if not exists room_join_attempts_idx on public.room_join_attempts (user_id, created_at desc);

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_invites enable row level security;
alter table public.room_join_attempts enable row level security;

create or replace function public.is_room_member(p_room uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.room_members m where m.room_id = p_room and m.user_id = auth.uid())
$$;
create or replace function public.is_room_invited(p_room uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.room_invites i where i.room_id = p_room and i.to_uid = auth.uid())
$$;

drop policy if exists "rooms visible" on public.rooms;
create policy "rooms visible" on public.rooms for select
  using (visibility = 'PUBLIC' or public.is_room_member(id) or public.is_room_invited(id));
drop policy if exists "room members visible" on public.room_members;
create policy "room members visible" on public.room_members for select using (public.is_room_member(room_id));
drop policy if exists "my invites" on public.room_invites;
create policy "my invites" on public.room_invites for select using (to_uid = auth.uid() or from_uid = auth.uid());

-- ---------- أدوات داخلية ----------
create or replace function public._uid() returns uuid language plpgsql stable as $$
declare v uuid := auth.uid();
begin
  if v is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  return v;
end $$;

create or replace function public._err(p_code text, p_extra jsonb default '{}'::jsonb)
returns jsonb language sql immutable as $$ select jsonb_build_object('ok', false, 'error', p_code) || coalesce(p_extra, '{}'::jsonb) $$;

create or replace function public._gen_room_code() returns text language plpgsql volatile as $$
declare v_alpha constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; v_code text; i int;
begin
  loop
    v_code := '';
    for i in 1..6 loop v_code := v_code || substr(v_alpha, 1 + floor(random() * length(v_alpha))::int, 1); end loop;
    exit when not exists (select 1 from public.rooms where code = v_code);
  end loop;
  return v_code;
end $$;

-- تنضيف/تطبيع الإعدادات حسب اللعبة (العميل مش موثوق)
create or replace function public._clean_settings(p_game text, p_settings jsonb)
returns jsonb language plpgsql immutable as $$
declare s jsonb := coalesce(p_settings, '{}'::jsonb); v_timer int; v_out jsonb;
begin
  v_timer := coalesce((s ->> 'timer_seconds')::int, 10);
  if v_timer not in (5, 10, 15) then v_timer := 10; end if;
  v_out := jsonb_build_object('timer_seconds', v_timer);
  if p_game = 'AUCTION' then
    v_out := v_out || jsonb_build_object(
      'mode', case when s ->> 'mode' = '200M' then '200M' else '100M' end,
      'last_bid', coalesce((s ->> 'last_bid')::boolean, false),
      'wild_card', coalesce((s ->> 'wild_card')::boolean, false),
      'no_risk', coalesce((s ->> 'no_risk')::boolean, false));
  elsif p_game = 'PLAYER_OR_HIDDEN' then
    v_out := v_out || jsonb_build_object('format', case when (s ->> 'format') = '11' then 11 else 5 end);
  elsif p_game = 'DEAL_OR_NO_DEAL' then
    v_out := v_out || jsonb_build_object('with_judge', coalesce((s ->> 'with_judge')::boolean, false));
  end if;
  return v_out;
end $$;

create or replace function public._room_json(p_room uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', r.id, 'code', r.code, 'game_id', r.game_id, 'visibility', r.visibility, 'status', r.status,
    'host_id', r.host_id, 'name', r.name, 'settings', r.settings, 'quick', r.quick, 'match_id', r.match_id,
    'members', coalesce((select jsonb_agg(jsonb_build_object(
        'user_id', m.user_id, 'role', m.role, 'seat', m.seat, 'display_name', m.display_name, 'avatar', m.avatar,
        'is_ready', m.is_ready, 'connected', m.last_seen > now() - interval '30 seconds') order by m.seat nulls last, m.joined_at)
      from public.room_members m where m.room_id = r.id), '[]'::jsonb))
  from public.rooms r where r.id = p_room
$$;

create or replace function public._expire_stale_rooms() returns void language sql security definer set search_path = public as $$
  update public.rooms r set status = 'CANCELLED', updated_at = now()
   where r.status = 'WAITING'
     and not exists (select 1 from public.room_members m where m.room_id = r.id and m.last_seen > now() - interval '5 minutes');
$$;

-- ---------- إنشاء غرفة ----------
create or replace function public.room_create(p_game text, p_visibility text, p_settings jsonb, p_name text, p_display_name text, p_avatar text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public._uid(); v_room public.rooms%rowtype; v_settings jsonb;
begin
  if not exists (select 1 from public.games g where g.id = p_game and g.server_engine) then return public._err('GAME_NOT_ONLINE'); end if;
  if p_visibility not in ('PUBLIC','PRIVATE') then return public._err('INVALID_VISIBILITY'); end if;
  v_settings := public._clean_settings(p_game, p_settings);

  -- غرفة واحدة مستنية لكل مضيف: القديمة بتتلغي (منع التكرار)
  update public.rooms set status = 'CANCELLED', updated_at = now() where host_id = v_uid and status = 'WAITING';
  delete from public.room_members m using public.rooms r
   where m.room_id = r.id and m.user_id = v_uid and r.status = 'WAITING' and r.host_id <> v_uid;

  insert into public.rooms (code, game_id, visibility, host_id, name, settings)
  values (public._gen_room_code(), p_game, p_visibility, v_uid, left(nullif(trim(coalesce(p_name, '')), ''), 60), v_settings)
  returning * into v_room;
  insert into public.room_members (room_id, user_id, role, seat, display_name, avatar, is_ready)
  values (v_room.id, v_uid, 'PLAYER', 1, left(coalesce(p_display_name, ''), 60), left(coalesce(p_avatar, ''), 500), true);
  return jsonb_build_object('ok', true, 'room', public._room_json(v_room.id));
end $$;

-- ---------- قائمة الغرف العامة (الخاصة مستحيل تظهر هنا) ----------
create or replace function public.room_list_public(p_game text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public._uid();
begin
  perform public._expire_stale_rooms();
  return jsonb_build_object('ok', true, 'rooms', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id, 'code', r.code, 'game_id', r.game_id, 'name', r.name, 'settings', r.settings, 'quick', r.quick,
      'host_id', r.host_id, 'is_mine', r.host_id = v_uid,
      'host_name', (select h.display_name from public.room_members h where h.room_id = r.id and h.user_id = r.host_id),
      'host_avatar', (select h.avatar from public.room_members h where h.room_id = r.id and h.user_id = r.host_id),
      'players', (select count(*) from public.room_members m where m.room_id = r.id and m.role = 'PLAYER'),
      'created_at', r.created_at) order by r.created_at desc)
    from public.rooms r
    where r.visibility = 'PUBLIC' and r.status = 'WAITING' and (p_game is null or r.game_id = p_game)
      and exists (select 1 from public.room_members m where m.room_id = r.id and m.last_seen > now() - interval '2 minutes')
    limit 50), '[]'::jsonb));
end $$;

-- ---------- الانضمام ----------
create or replace function public._room_join_locked(p_room_id uuid, p_uid uuid, p_name text, p_avatar text, p_as_judge boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_room public.rooms%rowtype; v_players int; v_seat int; v_auto jsonb;
begin
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found or v_room.status <> 'WAITING' then return public._err('ROOM_NOT_FOUND'); end if;
  if exists (select 1 from public.room_members where room_id = v_room.id and user_id = p_uid) then
    update public.room_members set last_seen = now() where room_id = v_room.id and user_id = p_uid;
    return jsonb_build_object('ok', true, 'already', true, 'room', public._room_json(v_room.id));
  end if;
  -- الخاصة: لازم دعوة أو دخول بالكود (اللي بيتحقق منه room_join_by_code قبل ما ينادي هنا)
  if p_as_judge then
    if v_room.game_id <> 'DEAL_OR_NO_DEAL' or not coalesce((v_room.settings ->> 'with_judge')::boolean, false) then return public._err('JUDGE_NOT_ALLOWED'); end if;
    if exists (select 1 from public.room_members where room_id = v_room.id and role = 'JUDGE') then return public._err('JUDGE_TAKEN'); end if;
    insert into public.room_members (room_id, user_id, role, seat, display_name, avatar, is_ready)
    values (v_room.id, p_uid, 'JUDGE', null, left(coalesce(p_name,''),60), left(coalesce(p_avatar,''),500), true);
  else
    select count(*) into v_players from public.room_members where room_id = v_room.id and role = 'PLAYER';
    if v_players >= 2 then return public._err('ROOM_FULL'); end if;
    v_seat := case when exists (select 1 from public.room_members where room_id = v_room.id and seat = 1) then 2 else 1 end;
    insert into public.room_members (room_id, user_id, role, seat, display_name, avatar, is_ready)
    values (v_room.id, p_uid, 'PLAYER', v_seat, left(coalesce(p_name,''),60), left(coalesce(p_avatar,''),500), v_room.quick);
    delete from public.room_invites where room_id = v_room.id and to_uid = p_uid;
    -- الغرفة السريعة بتبدأ لوحدها أول ما التاني يدخل
    if v_room.quick and v_players + 1 = 2 then
      v_auto := public._room_start_locked(v_room.id);
      if not coalesce((v_auto ->> 'ok')::boolean, false) then return v_auto; end if;
    end if;
  end if;
  return jsonb_build_object('ok', true, 'room', public._room_json(v_room.id));
end $$;

create or replace function public.room_join(p_room uuid, p_display_name text, p_avatar text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public._uid(); v_room public.rooms%rowtype;
begin
  select * into v_room from public.rooms where id = p_room;
  if not found then return public._err('ROOM_NOT_FOUND'); end if;
  -- الخاصة: مينفعش تدخلها بالـ id من غير دعوة
  if v_room.visibility = 'PRIVATE' and not public.is_room_invited(p_room) and not public.is_room_member(p_room) then
    return public._err('ROOM_NOT_FOUND');
  end if;
  return public._room_join_locked(p_room, v_uid, p_display_name, p_avatar, false);
end $$;

create or replace function public.room_join_by_code(p_code text, p_display_name text, p_avatar text, p_as_judge boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public._uid(); v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')); v_room_id uuid; v_fails int;
begin
  -- حماية من تخمين الأكواد: 8 محاولات فاشلة في الدقيقة كحد أقصى
  select count(*) into v_fails from public.room_join_attempts where user_id = v_uid and created_at > now() - interval '1 minute';
  if v_fails >= 8 then return public._err('TOO_MANY_ATTEMPTS'); end if;
  delete from public.room_join_attempts where created_at < now() - interval '1 hour';

  select id into v_room_id from public.rooms where code = v_code and status = 'WAITING';
  if v_room_id is null then
    insert into public.room_join_attempts (user_id) values (v_uid);
    return public._err('ROOM_NOT_FOUND');
  end if;
  return public._room_join_locked(v_room_id, v_uid, p_display_name, p_avatar, coalesce(p_as_judge, false));
end $$;

-- ---------- جاهزية / إعدادات / مغادرة / نبض ----------
create or replace function public.room_set_ready(p_room uuid, p_ready boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public._uid(); v_room public.rooms%rowtype;
begin
  select * into v_room from public.rooms where id = p_room for update;
  if not found or v_room.status <> 'WAITING' then return public._err('ROOM_NOT_FOUND'); end if;
  update public.room_members set is_ready = coalesce(p_ready, false), last_seen = now()
   where room_id = p_room and user_id = v_uid and role = 'PLAYER';
  if not found then return public._err('NOT_A_MEMBER'); end if;
  return jsonb_build_object('ok', true, 'room', public._room_json(p_room));
end $$;

create or replace function public.room_set_settings(p_room uuid, p_settings jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public._uid(); v_room public.rooms%rowtype;
begin
  select * into v_room from public.rooms where id = p_room for update;
  if not found or v_room.status <> 'WAITING' then return public._err('ROOM_NOT_FOUND'); end if;
  if v_room.host_id <> v_uid then return public._err('NOT_HOST'); end if;
  update public.rooms set settings = public._clean_settings(v_room.game_id, p_settings), updated_at = now() where id = p_room;
  update public.room_members set is_ready = (user_id = v_room.host_id) where room_id = p_room and role = 'PLAYER';
  return jsonb_build_object('ok', true, 'room', public._room_json(p_room));
end $$;

create or replace function public.room_heartbeat(p_room uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public._uid();
begin
  update public.room_members set last_seen = now() where room_id = p_room and user_id = v_uid;
  if not found then return public._err('NOT_A_MEMBER'); end if;
  return jsonb_build_object('ok', true, 'server_now', now(), 'room', public._room_json(p_room));
end $$;

create or replace function public.room_leave(p_room uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public._uid(); v_room public.rooms%rowtype; v_next uuid;
begin
  select * into v_room from public.rooms where id = p_room for update;
  if not found then return public._err('ROOM_NOT_FOUND'); end if;
  if not exists (select 1 from public.room_members where room_id = p_room and user_id = v_uid) then return public._err('NOT_A_MEMBER'); end if;
  if v_room.status = 'IN_GAME' then
    if v_room.match_id is not null then perform public._match_forfeit_locked(v_room.match_id, v_uid); end if;
    return jsonb_build_object('ok', true, 'forfeit', true);
  end if;
  delete from public.room_members where room_id = p_room and user_id = v_uid;
  if v_room.status = 'WAITING' then
    select user_id into v_next from public.room_members where room_id = p_room and role = 'PLAYER' order by joined_at limit 1;
    if v_next is null then
      update public.rooms set status = 'CANCELLED', updated_at = now() where id = p_room;
    elsif v_room.host_id = v_uid then
      update public.rooms set host_id = v_next, updated_at = now() where id = p_room;
      update public.room_members set is_ready = true, seat = 1 where room_id = p_room and user_id = v_next;
    end if;
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- دعوة صديق (بالـ Player ID) ----------
create or replace function public.room_invite_friend(p_room uuid, p_player_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public._uid(); v_room public.rooms%rowtype; v_target public.game_users%rowtype; v_to uuid; v_from_name text;
begin
  select * into v_room from public.rooms where id = p_room;
  if not found or v_room.status <> 'WAITING' then return public._err('ROOM_NOT_FOUND'); end if;
  if not public.is_room_member(p_room) then return public._err('NOT_A_MEMBER'); end if;
  select * into v_target from public.game_users where player_id = p_player_id or id = p_player_id limit 1;
  if not found then return public._err('PLAYER_NOT_FOUND'); end if;
  select auth_uid into v_to from public.profile_links where game_user_id = v_target.id;
  if v_to is null then return public._err('PLAYER_NOT_LINKED'); end if;
  if v_to = v_uid then return public._err('CANNOT_INVITE_SELF'); end if;
  insert into public.room_invites (room_id, to_uid, from_uid) values (p_room, v_to, v_uid) on conflict do nothing;
  select display_name into v_from_name from public.room_members where room_id = p_room and user_id = v_uid;
  insert into public.notifications (recipient_id, recipient_player_id, type, title, body, data)
  values (v_target.id, v_target.player_id, 'GAME_INVITE', 'دعوة للعب', coalesce(v_from_name, 'لاعب') || ' بيدعوك لمواجهة',
          jsonb_build_object('screen', 'rooms', 'room_id', p_room, 'code', v_room.code, 'game_id', v_room.game_id));
  return jsonb_build_object('ok', true);
end $$;

-- دعوات وصلتني
create or replace function public.room_my_invites()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public._uid();
begin
  return jsonb_build_object('ok', true, 'invites', coalesce((
    select jsonb_agg(jsonb_build_object('room_id', r.id, 'game_id', r.game_id, 'name', r.name, 'settings', r.settings,
        'from_name', (select m.display_name from public.room_members m where m.room_id = r.id and m.user_id = i.from_uid))
      order by i.created_at desc)
    from public.room_invites i join public.rooms r on r.id = i.room_id
    where i.to_uid = v_uid and r.status = 'WAITING'), '[]'::jsonb));
end $$;

-- ---------- بدء الغرفة ----------
create or replace function public._room_start_locked(p_room uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_room public.rooms%rowtype; v_players int; v_ready int; v_check jsonb; v_kind text; v_match uuid;
begin
  select * into v_room from public.rooms where id = p_room;
  if not found or v_room.status <> 'WAITING' then return public._err('ROOM_NOT_FOUND'); end if;
  select count(*), count(*) filter (where is_ready) into v_players, v_ready from public.room_members where room_id = p_room and role = 'PLAYER';
  if v_players <> 2 then return public._err('NEED_TWO_PLAYERS'); end if;
  if v_ready <> 2 then return public._err('PLAYERS_NOT_READY'); end if;

  v_kind := case v_room.game_id
    when 'AUCTION' then case when v_room.settings ->> 'mode' = '200M' then 'F11' else 'F5' end
    when 'PLAYER_OR_HIDDEN' then case when (v_room.settings ->> 'format')::int = 11 then 'F11' else 'F5' end
    when 'DEAL_OR_NO_DEAL' then 'DND' end;
  v_check := public.pool_check(v_room.game_id, v_kind);
  if not coalesce((v_check ->> 'ok')::boolean, false) then return public._err('POOL_INSUFFICIENT', jsonb_build_object('missing', v_check -> 'missing')); end if;

  v_match := case v_room.game_id
    when 'AUCTION' then public._auction_create(v_room)
    when 'PLAYER_OR_HIDDEN' then public._tph_create(v_room)
    when 'DEAL_OR_NO_DEAL' then public._dnd_create(v_room) end;
  update public.rooms set status = 'IN_GAME', match_id = v_match, updated_at = now() where id = p_room;
  return jsonb_build_object('ok', true, 'match_id', v_match, 'room', public._room_json(p_room));
end $$;

create or replace function public.room_start(p_room uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public._uid(); v_room public.rooms%rowtype;
begin
  select * into v_room from public.rooms where id = p_room for update;
  if not found or v_room.status <> 'WAITING' then return public._err('ROOM_NOT_FOUND'); end if;
  if v_room.host_id <> v_uid then return public._err('NOT_HOST'); end if;
  update public.room_members set is_ready = true where room_id = p_room and user_id = v_uid;
  return public._room_start_locked(p_room);
end $$;

-- ---------- غرفة ضد الذكاء الاصطناعي (فورية، مفيش انتظار) ----------
create or replace function public.room_create_vs_ai(p_game text, p_settings jsonb, p_display_name text, p_avatar text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public._uid(); v_settings jsonb; v_room public.rooms%rowtype; v_start jsonb;
begin
  if not exists (select 1 from public.games g where g.id = p_game and g.server_engine) then return public._err('GAME_NOT_ONLINE'); end if;
  v_settings := public._clean_settings(p_game, p_settings);
  update public.rooms set status = 'CANCELLED', updated_at = now() where host_id = v_uid and status = 'WAITING';

  insert into public.rooms (code, game_id, visibility, host_id, name, settings)
  values (public._gen_room_code(), p_game, 'PRIVATE', v_uid, 'ضد الذكاء الاصطناعي', v_settings) returning * into v_room;
  insert into public.room_members (room_id, user_id, role, seat, display_name, avatar, is_ready)
  values (v_room.id, v_uid, 'PLAYER', 1, left(coalesce(p_display_name,''),60), left(coalesce(p_avatar,''),500), true);
  insert into public.room_members (room_id, user_id, role, seat, display_name, avatar, is_ready, is_bot)
  values (v_room.id, public.bot_uid(), 'PLAYER', 2, 'الجهاز', '🤖', true, true);

  v_start := public._room_start_locked(v_room.id);
  return v_start;
end $$;

-- ---------- مباراة سريعة: انضم لأقرب غرفة سريعة مطابقة، وإلا اعمل واحدة ----------
create or replace function public.quick_match(p_game text, p_settings jsonb, p_display_name text, p_avatar text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public._uid(); v_settings jsonb; v_room public.rooms%rowtype; v_res jsonb;
begin
  if not exists (select 1 from public.games g where g.id = p_game and g.server_engine) then return public._err('GAME_NOT_ONLINE'); end if;
  v_settings := public._clean_settings(p_game, p_settings);
  perform public._expire_stale_rooms();

  -- لو أنا أصلاً في غرفة سريعة مستنية → رجّعها (منع تكرار الغرف)
  select r.* into v_room from public.rooms r join public.room_members m on m.room_id = r.id and m.user_id = v_uid
   where r.quick and r.status = 'WAITING' and r.game_id = p_game and r.settings = v_settings limit 1;
  if found then
    update public.room_members set last_seen = now() where room_id = v_room.id and user_id = v_uid;
    return jsonb_build_object('ok', true, 'room', public._room_json(v_room.id));
  end if;

  select r.* into v_room from public.rooms r
   where r.quick and r.visibility = 'PUBLIC' and r.status = 'WAITING' and r.game_id = p_game and r.settings = v_settings
     and r.host_id <> v_uid
     and (select count(*) from public.room_members m where m.room_id = r.id and m.role = 'PLAYER') = 1
     and exists (select 1 from public.room_members m where m.room_id = r.id and m.last_seen > now() - interval '30 seconds')
   order by r.created_at limit 1 for update skip locked;
  if found then
    v_res := public._room_join_locked(v_room.id, v_uid, p_display_name, p_avatar, false);
    return v_res;
  end if;

  update public.rooms set status = 'CANCELLED', updated_at = now() where host_id = v_uid and status = 'WAITING';
  insert into public.rooms (code, game_id, visibility, host_id, name, settings, quick)
  values (public._gen_room_code(), p_game, 'PUBLIC', v_uid, 'مباراة سريعة', v_settings, true) returning * into v_room;
  insert into public.room_members (room_id, user_id, role, seat, display_name, avatar, is_ready)
  values (v_room.id, v_uid, 'PLAYER', 1, left(coalesce(p_display_name,''),60), left(coalesce(p_avatar,''),500), true);
  return jsonb_build_object('ok', true, 'room', public._room_json(v_room.id));
end $$;

-- ============================================================================
-- د) محرك المباراة العام: حالة عامة + أسرار + خاص بكل لاعب + محافظ + مزايدات + منع التكرار
-- ============================================================================
-- الحالة العامة = matches.state (العميل بيسمعها Realtime). الأسرار = match_secrets (مقفولة).
-- الخاص بلاعب واحد (كروته / حمايته) = match_private (اللاعب صاحبه بس يقراه).
-- المؤقت: matches.deadline_at بتوقيت السيرفر. كل دالة بتحسم المهلة المنتهية أولاً (_match_advance).

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  game_id text not null references public.games(id),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','FINISHED','ABANDONED')),
  state jsonb not null default '{}'::jsonb,
  seq int not null default 0,
  deadline_at timestamptz,
  winner_uid uuid,
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists matches_room_idx on public.matches (room_id);

create table if not exists public.match_players (
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null,
  seat int check (seat in (1, 2)),
  role text not null default 'PLAYER' check (role in ('PLAYER','JUDGE')),
  display_name text not null default '',
  avatar text not null default '',
  is_bot boolean not null default false,
  primary key (match_id, user_id)
);

-- هوية ثابتة لخصم الذكاء الاصطناعي (مفيش يوزر حقيقي وراها، السيرفر هو اللي بيتحكم فيها بالكامل)
create or replace function public.bot_uid() returns uuid language sql immutable as $$ select '00000000-0000-0000-0000-0000000b0710'::uuid $$;
create index if not exists match_players_user_idx on public.match_players (user_id);

create table if not exists public.match_secrets (
  match_id uuid primary key references public.matches(id) on delete cascade,
  data jsonb not null default '{}'::jsonb
);
create table if not exists public.match_private (
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null,
  data jsonb not null default '{}'::jsonb,
  primary key (match_id, user_id)
);
-- المحفظة: CHECK على مستوى قاعدة البيانات = مستحيل الرصيد يبقى سالب حتى لو حصل خطأ في الكود.
create table if not exists public.match_wallets (
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null,
  budget numeric(12,1) not null check (budget >= 0),
  spent numeric(12,1) not null default 0 check (spent >= 0),
  primary key (match_id, user_id)
);
create table if not exists public.match_bids (
  id bigserial primary key,
  match_id uuid not null references public.matches(id) on delete cascade,
  round int not null,
  user_id uuid not null,
  amount numeric(12,1) not null check (amount > 0),
  seq int not null,
  created_at timestamptz not null default now(),
  unique (match_id, seq)
);
create table if not exists public.match_actions (
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null,
  request_id uuid not null,
  kind text not null,
  created_at timestamptz not null default now(),
  primary key (match_id, user_id, request_id)
);

alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.match_secrets enable row level security;     -- من غير policy = مقفول
alter table public.match_private enable row level security;
alter table public.match_wallets enable row level security;
alter table public.match_bids enable row level security;
alter table public.match_actions enable row level security;     -- من غير policy = مقفول

create or replace function public.is_match_member(p_match uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.match_players p where p.match_id = p_match and p.user_id = auth.uid())
$$;

drop policy if exists "match members read" on public.matches;
create policy "match members read" on public.matches for select using (public.is_match_member(id));
drop policy if exists "match players read" on public.match_players;
create policy "match players read" on public.match_players for select using (public.is_match_member(match_id));
drop policy if exists "own private read" on public.match_private;
create policy "own private read" on public.match_private for select using (user_id = auth.uid());
drop policy if exists "wallets read" on public.match_wallets;
create policy "wallets read" on public.match_wallets for select using (public.is_match_member(match_id));
drop policy if exists "bids read" on public.match_bids;
create policy "bids read" on public.match_bids for select using (public.is_match_member(match_id));

-- ---------- أدوات ----------
create or replace function public._seat_of(p_match uuid, p_uid uuid)
returns int language sql stable security definer set search_path = public as $$
  select seat from public.match_players where match_id = p_match and user_id = p_uid and role = 'PLAYER'
$$;
create or replace function public._uid_at_seat(p_match uuid, p_seat int)
returns uuid language sql stable security definer set search_path = public as $$
  select user_id from public.match_players where match_id = p_match and seat = p_seat and role = 'PLAYER'
$$;
create or replace function public._other_uid(p_match uuid, p_uid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select user_id from public.match_players where match_id = p_match and role = 'PLAYER' and user_id <> p_uid
$$;

-- يحفظ الحالة الجديدة + يزوّد التسلسل (seq) + يظبط المهلة
create or replace function public._save(p_match uuid, p_state jsonb, p_deadline timestamptz)
returns void language sql security definer set search_path = public as $$
  update public.matches set state = p_state, deadline_at = p_deadline, seq = seq + 1, updated_at = now() where id = p_match
$$;

create or replace function public._secrets(p_match uuid) returns jsonb language sql stable security definer set search_path = public as $$
  select data from public.match_secrets where match_id = p_match
$$;
create or replace function public._set_secrets(p_match uuid, p_data jsonb) returns void language sql security definer set search_path = public as $$
  update public.match_secrets set data = p_data where match_id = p_match
$$;
create or replace function public._private(p_match uuid, p_uid uuid) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((select data from public.match_private where match_id = p_match and user_id = p_uid), '{}'::jsonb)
$$;
create or replace function public._set_private(p_match uuid, p_uid uuid, p_data jsonb) returns void language sql security definer set search_path = public as $$
  insert into public.match_private (match_id, user_id, data) values (p_match, p_uid, p_data)
  on conflict (match_id, user_id) do update set data = excluded.data
$$;

-- ---------- إنشاء الصف الأساسي للمباراة ----------
create or replace function public._match_insert(p_room public.rooms, p_state jsonb, p_deadline timestamptz)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into public.matches (room_id, game_id, state, deadline_at) values (p_room.id, p_room.game_id, p_state, p_deadline) returning id into v_id;
  insert into public.match_players (match_id, user_id, seat, role, display_name, avatar, is_bot)
  select v_id, m.user_id, m.seat, m.role, m.display_name, m.avatar, m.is_bot from public.room_members m
   where m.room_id = p_room.id and m.role = 'PLAYER';   -- الحكم (لو موجود) بينضاف بمعرفة اللعبة نفسها (DND) لتفادي إدخاله مرتين
  insert into public.match_secrets (match_id, data) values (v_id, '{}'::jsonb);
  return v_id;
end $$;

-- ---------- الحسم التلقائي للمهل + الانسحاب بانقطاع طويل (بيتنادى تحت القفل) ----------
create or replace function public._match_advance(p_match uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_m public.matches%rowtype; v_stale uuid;
begin
  select * into v_m from public.matches where id = p_match;
  if not found or v_m.status <> 'ACTIVE' then return; end if;

  -- لاعب مقطوع أكتر من دقيقتين = منسحب (إعادة الاتصال قبل كده بترجعه لنفس الحالة)
  select m.user_id into v_stale from public.room_members m
   where m.room_id = v_m.room_id and m.role = 'PLAYER' and m.last_seen < now() - interval '120 seconds' limit 1;
  if v_stale is not null and coalesce(v_m.state ->> 'phase', '') not in ('FINISHED', 'FORFEIT') then
    perform public._match_forfeit_locked(p_match, v_stale);
    return;
  end if;

  if v_m.game_id = 'AUCTION' then perform public._auction_advance(p_match);
  elsif v_m.game_id = 'PLAYER_OR_HIDDEN' then perform public._tph_advance(p_match);
  elsif v_m.game_id = 'DEAL_OR_NO_DEAL' then perform public._dnd_advance(p_match);
  end if;
  perform public._match_finalize_reports(p_match, false);
end $$;

create or replace function public._match_forfeit_locked(p_match uuid, p_loser uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_m public.matches%rowtype; v_winner uuid;
begin
  select * into v_m from public.matches where id = p_match for update;
  if not found or v_m.status <> 'ACTIVE' then return; end if;
  v_winner := public._other_uid(p_match, p_loser);
  update public.matches set status = 'ABANDONED', winner_uid = v_winner, finished_at = now(), seq = seq + 1, updated_at = now(),
         deadline_at = null,
         state = v_m.state || jsonb_build_object('phase', 'FORFEIT', 'forfeit', jsonb_build_object('loser', p_loser, 'winner', v_winner)),
         result = jsonb_build_object('reason', 'FORFEIT', 'winner', v_winner)
   where id = p_match;
  update public.rooms set status = 'FINISHED', updated_at = now() where id = v_m.room_id;
end $$;

-- ---------- تسجيل النتيجة (المحاكاة deterministic من match_seed عند العميلين) ----------
-- الاتنين لازم يبلّغوا بنفس السكور؛ لو اختلفوا أو واحد بس بلّغ وعدّت 30 ثانية → السيرفر يحسمها بمجموع التقييمات.
create or replace function public._match_score_fallback(p_match uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_m public.matches%rowtype; v_sq jsonb; v_a numeric := 0; v_b numeric := 0; v_id text; v_u1 uuid; v_u2 uuid;
begin
  select * into v_m from public.matches where id = p_match;
  v_u1 := public._uid_at_seat(p_match, 1); v_u2 := public._uid_at_seat(p_match, 2);
  if v_m.game_id = 'DEAL_OR_NO_DEAL' then
    for v_id in select x from jsonb_array_elements_text(coalesce(v_m.state #> '{acquired,A}', '[]'::jsonb)) x loop
      v_a := v_a + coalesce((select rating from public.pool_items where id = v_id), 0);
    end loop;
    for v_id in select x from jsonb_array_elements_text(coalesce(v_m.state #> '{acquired,B}', '[]'::jsonb)) x loop
      v_b := v_b + coalesce((select rating from public.pool_items where id = v_id), 0);
    end loop;
  else
    for v_id in select x from jsonb_array_elements_text(coalesce(v_m.state #> array['squads', v_u1::text], '[]'::jsonb)) x loop
      v_a := v_a + coalesce((select rating from public.pool_items where id = v_id), 0);
    end loop;
    for v_id in select x from jsonb_array_elements_text(coalesce(v_m.state #> array['squads', v_u2::text], '[]'::jsonb)) x loop
      v_b := v_b + coalesce((select rating from public.pool_items where id = v_id), 0);
    end loop;
  end if;
  return jsonb_build_object('s1', case when v_a > v_b then 1 else 0 end, 's2', case when v_b > v_a then 1 else 0 end, 'fallback', true);
end $$;

create or replace function public._match_finalize_reports(p_match uuid, p_force boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_m public.matches%rowtype; v_reports jsonb; v_keys text[]; v_first timestamptz; v_score jsonb; v_win uuid; v_r1 jsonb; v_r2 jsonb;
begin
  select * into v_m from public.matches where id = p_match;
  if not found or v_m.status <> 'ACTIVE' or coalesce(v_m.state ->> 'phase', '') <> 'MATCH' then return; end if;
  v_reports := coalesce(v_m.state -> 'reports', '{}'::jsonb);
  select array_agg(k) into v_keys from jsonb_object_keys(v_reports) k;
  if v_keys is null then return; end if;
  v_first := (v_m.state ->> 'first_report_at')::timestamptz;

  if array_length(v_keys, 1) >= 2 then
    v_r1 := v_reports -> public._uid_at_seat(p_match, 1)::text;
    v_r2 := v_reports -> public._uid_at_seat(p_match, 2)::text;
    if v_r1 = v_r2 then v_score := v_r1; else v_score := public._match_score_fallback(p_match); end if;
  elsif p_force or (v_first is not null and v_first < now() - interval '30 seconds') then
    v_score := v_reports -> v_keys[1];
  else
    return;
  end if;

  v_win := case when (v_score ->> 's1')::int > (v_score ->> 's2')::int then public._uid_at_seat(p_match, 1)
                when (v_score ->> 's2')::int > (v_score ->> 's1')::int then public._uid_at_seat(p_match, 2) else null end;
  update public.matches set status = 'FINISHED', winner_uid = v_win, finished_at = now(), seq = seq + 1, updated_at = now(), deadline_at = null,
         state = v_m.state || jsonb_build_object('phase', 'FINISHED', 'score', v_score, 'winner', v_win),
         result = jsonb_build_object('score', v_score, 'winner', v_win)
   where id = p_match;
  update public.rooms set status = 'FINISHED', updated_at = now() where id = v_m.room_id;
end $$;

-- ---------- RPC عامة ----------
create or replace function public._match_view(p_match uuid, p_uid uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_m public.matches%rowtype; v_me public.match_players%rowtype;
begin
  select * into v_m from public.matches where id = p_match;
  select * into v_me from public.match_players where match_id = p_match and user_id = p_uid;
  return jsonb_build_object('ok', true, 'server_now', now(),
    'match', jsonb_build_object('id', v_m.id, 'room_id', v_m.room_id, 'game_id', v_m.game_id, 'status', v_m.status, 'state', v_m.state,
                                'seq', v_m.seq, 'deadline_at', v_m.deadline_at, 'winner_uid', v_m.winner_uid),
    'me', jsonb_build_object('user_id', p_uid, 'seat', v_me.seat, 'role', v_me.role),
    'players', coalesce((select jsonb_agg(jsonb_build_object('user_id', p.user_id, 'seat', p.seat, 'role', p.role, 'display_name', p.display_name, 'avatar', p.avatar,
                           'connected', coalesce((select rm.last_seen > now() - interval '30 seconds' from public.room_members rm where rm.room_id = v_m.room_id and rm.user_id = p.user_id), false)))
                        from public.match_players p where p.match_id = p_match), '[]'::jsonb),
    'private', case when v_me.role = 'PLAYER' then public._private(p_match, p_uid) else '{}'::jsonb end);
end $$;

-- إعادة الاتصال: بترجّع نفس الحالة بالظبط (المؤقت من السيرفر، التشكيلة، الميزانية، الكروت)
create or replace function public.match_get(p_match uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public._uid(); v_id uuid;
begin
  select id into v_id from public.matches where id = p_match for update;
  if v_id is null or not exists (select 1 from public.match_players where match_id = p_match and user_id = v_uid) then return public._err('MATCH_NOT_FOUND'); end if;
  update public.room_members rm set last_seen = now() from public.matches m where m.id = p_match and rm.room_id = m.room_id and rm.user_id = v_uid;
  perform public._match_advance(p_match);
  return public._match_view(p_match, v_uid);
end $$;

create or replace function public.match_tick(p_match uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public._uid(); v_id uuid; v_seq int;
begin
  select id into v_id from public.matches where id = p_match for update;
  if v_id is null or not exists (select 1 from public.match_players where match_id = p_match and user_id = v_uid) then return public._err('MATCH_NOT_FOUND'); end if;
  perform public._match_advance(p_match);
  select seq into v_seq from public.matches where id = p_match;
  return jsonb_build_object('ok', true, 'seq', v_seq, 'server_now', now());
end $$;

create or replace function public.match_heartbeat(p_match uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public._uid(); v_seq int; v_status text; v_dead timestamptz;
begin
  update public.room_members rm set last_seen = now() from public.matches m where m.id = p_match and rm.room_id = m.room_id and rm.user_id = v_uid;
  if not found then return public._err('MATCH_NOT_FOUND'); end if;
  select seq, status, deadline_at into v_seq, v_status, v_dead from public.matches where id = p_match;
  return jsonb_build_object('ok', true, 'seq', v_seq, 'status', v_status, 'deadline_at', v_dead, 'server_now', now());
end $$;

create or replace function public.match_forfeit(p_match uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public._uid(); v_id uuid;
begin
  select id into v_id from public.matches where id = p_match for update;
  if v_id is null or public._seat_of(p_match, v_uid) is null then return public._err('MATCH_NOT_FOUND'); end if;
  perform public._match_forfeit_locked(p_match, v_uid);
  return public._match_view(p_match, v_uid);
end $$;

create or replace function public.match_report_result(p_match uuid, p_score1 int, p_score2 int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public._uid(); v_m public.matches%rowtype; v_state jsonb;
begin
  select * into v_m from public.matches where id = p_match for update;
  if not found or public._seat_of(p_match, v_uid) is null then return public._err('MATCH_NOT_FOUND'); end if;
  perform public._match_advance(p_match);
  select * into v_m from public.matches where id = p_match;
  if v_m.status <> 'ACTIVE' or coalesce(v_m.state ->> 'phase', '') <> 'MATCH' then return public._err('NOT_IN_MATCH_PHASE'); end if;
  if p_score1 is null or p_score2 is null or p_score1 < 0 or p_score2 < 0 or p_score1 > 30 or p_score2 > 30 then return public._err('INVALID_SCORE'); end if;
  v_state := v_m.state;
  if v_state -> 'reports' ? v_uid::text then return public._match_view(p_match, v_uid); end if;   -- تبليغ مكرر = تجاهل
  v_state := jsonb_set(v_state, array['reports', v_uid::text], jsonb_build_object('s1', p_score1, 's2', p_score2), true);
  if v_state ->> 'first_report_at' is null then v_state := v_state || jsonb_build_object('first_report_at', now()); end if;
  perform public._save(p_match, v_state, v_m.deadline_at);
  perform public._match_finalize_reports(p_match, false);
  return public._match_view(p_match, v_uid);
end $$;

-- منع تكرار الفعل (نفس request_id مرتين) — بيتسجل بعد النجاح بس
create or replace function public._action_seen(p_match uuid, p_uid uuid, p_request uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_request is not null and exists (select 1 from public.match_actions where match_id = p_match and user_id = p_uid and request_id = p_request)
$$;
create or replace function public._action_record(p_match uuid, p_uid uuid, p_request uuid, p_kind text)
returns void language sql security definer set search_path = public as $$
  insert into public.match_actions (match_id, user_id, request_id, kind) select p_match, p_uid, p_request, p_kind where p_request is not null
  on conflict do nothing
$$;

-- ============================================================================
-- هـ) المزاد — الميزانية والمزايدات والأدوار كلها مرجعها السيرفر فقط
-- ============================================================================
-- الحالة (state):
--  phase: DRAFT_OPEN | SETTLING | PRE_MATCH | MATCH | FINISHED | FORFEIT
--  slots: ترتيب الخانات (formation_slots) — كل خانة فيها مزاد منفصل بالتتابع
--  slot_idx: رقم الخانة الحالية
--  candidate: pool_item id المعروض حالياً للمزايدة عليه
--  candidate_rating / candidate_slot: عرض بس (بدون كشف هوية اللاعب الحقيقي لو اللعبة تتطلب كارت مخفي)
--  bid_amount / bid_leader: أعلى مزايدة حالياً وصاحبها
--  no_bid_seat: مين الدور عليه ياخد الخانة مجاناً لو محدش زايد (بيتبادل بالتناوب)
--  squads: { uid: [pool_item id,...] } — التشكيلة النهائية لكل لاعب
--  coach: { uid: pool_item id }
--  cards_used / protected: حسب اللعبة (كروت الحماية/السرقة لو مفعّلة)
--  ready: { uid: true } تأكيد "يلا نشوف مين هيكسب"

create or replace function public._auction_budget(p_mode text) returns numeric language sql immutable as $$
  select case p_mode when '200M' then 200 else 100 end
$$;

create or replace function public._auction_create(p_room public.rooms)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_slots text[]; v_budget numeric; v_u1 uuid; v_u2 uuid; v_state jsonb; v_cand text[]; v_id uuid; v_timer int;
begin
  v_slots := public.formation_slots(case when p_room.settings ->> 'mode' = '200M' then 11 else 5 end);
  v_budget := public._auction_budget(p_room.settings ->> 'mode');
  v_timer := coalesce((p_room.settings ->> 'timer_seconds')::int, 10);
  v_u1 := public._uid_at_seat_from_room(p_room.id, 1);
  v_u2 := public._uid_at_seat_from_room(p_room.id, 2);

  v_cand := public._pool_draw(p_room.game_id, v_slots[1], 1, '{}');
  v_state := jsonb_build_object(
    'phase', 'DRAFT_OPEN', 'slots', to_jsonb(v_slots), 'slot_idx', 0, 'no_bid_seat', 1,
    'candidate', v_cand[1], 'candidate_slot', v_slots[1],
    'bid_amount', 0, 'bid_leader', null, 'raises', 0,
    'squads', jsonb_build_object(v_u1::text, '[]'::jsonb, v_u2::text, '[]'::jsonb),
    'coach', '{}'::jsonb, 'used_ids', to_jsonb(v_cand), 'history', '[]'::jsonb, 'ready', '{}'::jsonb,
    -- مهارة البوت في الماتش ده تتحدد مرة واحدة عشوائياً (0.7 ضعيف يوم سيء .. 1.3 ممتاز يوم قوي)
    -- عشان محدش يبقى نتيجة مضمونة: أحياناً البوت شرس جداً وبيكسب أقوى اللعيبة، وأحياناً يلعب واطي وبيخسر من مبتدئ.
    'ai_skill', 0.7 + random() * 0.6);

  v_id := public._match_insert(p_room, v_state, now() + make_interval(secs => v_timer));
  insert into public.match_wallets (match_id, user_id, budget, spent) values (v_id, v_u1, v_budget, 0), (v_id, v_u2, v_budget, 0);
  return v_id;
end $$;

create or replace function public._uid_at_seat_from_room(p_room uuid, p_seat int)
returns uuid language sql stable security definer set search_path = public as $$
  select user_id from public.room_members where room_id = p_room and seat = p_seat and role = 'PLAYER'
$$;

create or replace function public._auction_min_next(p_current numeric) returns numeric language sql immutable as $$
  select case when p_current < 10 then p_current + 0.5 else p_current + 1 end
$$;

-- ---------- مزايدة بشرية ----------
create or replace function public.auction_bid(p_match uuid, p_request uuid, p_amount numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public._uid(); v_m public.matches%rowtype; v_seat int; v_w public.match_wallets%rowtype; v_state jsonb; v_seq int; v_min numeric;
begin
  select * into v_m from public.matches where id = p_match for update;
  if not found then return public._err('MATCH_NOT_FOUND'); end if;
  if public._action_seen(p_match, v_uid, p_request) then return public._match_view(p_match, v_uid); end if;
  perform public._match_advance(p_match);
  select * into v_m from public.matches where id = p_match;
  v_seat := public._seat_of(p_match, v_uid);
  if v_seat is null then return public._err('NOT_A_PLAYER'); end if;
  if v_m.status <> 'ACTIVE' or coalesce(v_m.state ->> 'phase', '') <> 'DRAFT_OPEN' then return public._err('NOT_BIDDING_PHASE'); end if;
  if v_m.deadline_at is not null and now() > v_m.deadline_at then return public._err('TIME_EXPIRED'); end if;
  if coalesce((v_m.state ->> 'bid_leader'), '') = v_uid::text then return public._err('ALREADY_HIGHEST_BIDDER'); end if;

  select * into v_w from public.match_wallets where match_id = p_match and user_id = v_uid for update;
  v_min := public._auction_min_next(coalesce((v_m.state ->> 'bid_amount')::numeric, 0));
  if p_amount is null or p_amount < v_min then return public._err('BID_TOO_LOW', jsonb_build_object('min', v_min)); end if;
  -- ===== القاعدة الحرجة: مستحيل يزايد بأكتر من رصيده المتبقي فعلياً على السيرفر =====
  if p_amount > (v_w.budget - v_w.spent) then
    return public._err('INSUFFICIENT_BUDGET', jsonb_build_object('remaining', v_w.budget - v_w.spent));
  end if;

  insert into public.match_bids (match_id, round, user_id, amount, seq) values (p_match, coalesce((v_m.state ->> 'slot_idx')::int, 0), v_uid, p_amount, v_m.seq + 1);
  v_state := v_m.state || jsonb_build_object('bid_amount', p_amount, 'bid_leader', v_uid::text, 'raises', coalesce((v_m.state ->> 'raises')::int, 0) + 1);
  v_state := jsonb_set(v_state, '{history}', coalesce(v_state -> 'history', '[]'::jsonb) || jsonb_build_object('uid', v_uid, 'amount', p_amount, 'at', now()));
  -- منع "السنايب": أي مزايدة في آخر 3 ثواني بتمدد المهلة 3 ثواني (مش بتلغي انتهاءها لو الاتنين واقفين)
  perform public._save(p_match, v_state,
    case when v_m.deadline_at - now() < interval '3 seconds' then now() + interval '3 seconds' else v_m.deadline_at end);
  perform public._action_record(p_match, v_uid, p_request, 'BID');
  perform public._auction_ai_respond(p_match);
  return public._match_view(p_match, v_uid);
end $$;

-- تمرير/عدم المزايدة صراحة (اختياري — بيسرّع لو الاتنين مش عايزين يكملوا)
create or replace function public.auction_pass(p_match uuid, p_request uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public._uid(); v_m public.matches%rowtype; v_state jsonb;
begin
  select * into v_m from public.matches where id = p_match for update;
  if not found then return public._err('MATCH_NOT_FOUND'); end if;
  if public._action_seen(p_match, v_uid, p_request) then return public._match_view(p_match, v_uid); end if;
  if public._seat_of(p_match, v_uid) is null then return public._err('NOT_A_PLAYER'); end if;
  if v_m.status <> 'ACTIVE' or coalesce(v_m.state ->> 'phase', '') <> 'DRAFT_OPEN' then return public._err('NOT_BIDDING_PHASE'); end if;
  v_state := jsonb_set(v_m.state, array['passed', v_uid::text], 'true'::jsonb, true);
  perform public._save(p_match, v_state, v_m.deadline_at);
  perform public._action_record(p_match, v_uid, p_request, 'PASS');
  -- لو الاتنين عدّوا (محدش زايد) نقفل الجولة فوراً من غير ما نستنى باقي المؤقت
  select * into v_m from public.matches where id = p_match;
  if (v_m.state -> 'passed' ?& array[public._uid_at_seat(p_match,1)::text, public._uid_at_seat(p_match,2)::text]) then
    perform public._save(p_match, v_m.state, now());
    perform public._match_advance(p_match);
  end if;
  return public._match_view(p_match, v_uid);
end $$;

-- ---------- تسوية خانة وفتح التالية ----------
create or replace function public._auction_settle_slot(p_match uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_m public.matches%rowtype; v_state jsonb; v_slots text[]; v_idx int; v_cand text; v_leader text;
        v_amount numeric; v_free_uid uuid; v_next_idx int; v_next_cand text[]; v_used text[]; v_u1 uuid; v_u2 uuid;
begin
  select * into v_m from public.matches where id = p_match;
  v_state := v_m.state;
  v_slots := array(select jsonb_array_elements_text(v_state -> 'slots'));
  v_idx := (v_state ->> 'slot_idx')::int;
  v_cand := v_state ->> 'candidate';
  v_leader := v_state ->> 'bid_leader';
  v_amount := coalesce((v_state ->> 'bid_amount')::numeric, 0);
  v_u1 := public._uid_at_seat(p_match, 1); v_u2 := public._uid_at_seat(p_match, 2);

  if v_leader is not null then
    update public.match_wallets set spent = spent + v_amount where match_id = p_match and user_id = v_leader::uuid;
    v_state := jsonb_set(v_state, array['squads', v_leader], (v_state #> array['squads', v_leader]) || to_jsonb(v_cand));
    v_state := v_state || jsonb_build_object('last_result', jsonb_build_object('slot', v_slots[v_idx+1], 'id', v_cand, 'winner', v_leader, 'amount', v_amount, 'free', false));
  else
    -- محدش زايد → تاخد الخانة مجاناً بالتبادل (منع محاباة نفس اللاعب كل مرة)
    v_free_uid := case when coalesce((v_state ->> 'no_bid_seat')::int, 1) = 1 then v_u1 else v_u2 end;
    v_state := jsonb_set(v_state, array['squads', v_free_uid::text], (v_state #> array['squads', v_free_uid::text]) || to_jsonb(v_cand));
    v_state := jsonb_set(v_state, '{no_bid_seat}', to_jsonb(case when coalesce((v_state ->> 'no_bid_seat')::int, 1) = 1 then 2 else 1 end));
    v_state := v_state || jsonb_build_object('last_result', jsonb_build_object('slot', v_slots[v_idx+1], 'id', v_cand, 'winner', v_free_uid, 'amount', 0, 'free', true));
  end if;

  v_next_idx := v_idx + 1;
  v_used := array(select jsonb_array_elements_text(v_state -> 'used_ids'));
  if v_next_idx >= array_length(v_slots, 1) then
    -- اكتملت كل الخانات → عيّن مدرب مختلف لكل لاعب وادخل مرحلة ما قبل المباراة
    declare v_coaches text[]; begin
      v_coaches := public._pool_draw_coach((select game_id from public.matches where id = p_match), 2, '{}');
      v_state := v_state || jsonb_build_object('coach', jsonb_build_object(v_u1::text, v_coaches[1], v_u2::text, v_coaches[2]),
                                                 'phase', 'PRE_MATCH', 'candidate', null);
    end;
    perform public._save(p_match, v_state, null);
  else
    v_next_cand := public._pool_draw((select game_id from public.matches where id = p_match), v_slots[v_next_idx+1], 1, v_used);
    v_state := v_state || jsonb_build_object('slot_idx', v_next_idx, 'candidate', v_next_cand[1], 'candidate_slot', v_slots[v_next_idx+1],
                                              'bid_amount', 0, 'bid_leader', null, 'raises', 0, 'passed', '{}'::jsonb,
                                              'used_ids', to_jsonb(v_used || v_next_cand));
    perform public._save(p_match, v_state,
      now() + make_interval(secs => coalesce((select (settings ->> 'timer_seconds')::int from public.rooms where id = v_m.room_id), 10)));
    perform public._auction_ai_respond(p_match);
  end if;
end $$;

create or replace function public._auction_advance(p_match uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_m public.matches%rowtype;
begin
  select * into v_m from public.matches where id = p_match;
  if coalesce(v_m.state ->> 'phase', '') = 'DRAFT_OPEN' and v_m.deadline_at is not null and now() > v_m.deadline_at then
    perform public._auction_settle_slot(p_match);
  end if;
end $$;

-- ---------- تأكيد "يلا نشوف مين هيكسب" — لازم الاتنين يضغطوا قبل أي محاكاة ----------
create or replace function public.match_confirm_ready(p_match uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public._uid(); v_m public.matches%rowtype; v_state jsonb; v_u1 uuid; v_u2 uuid; v_bot uuid;
begin
  select * into v_m from public.matches where id = p_match for update;
  if not found or public._seat_of(p_match, v_uid) is null then return public._err('MATCH_NOT_FOUND'); end if;
  if v_m.status <> 'ACTIVE' or coalesce(v_m.state ->> 'phase', '') <> 'PRE_MATCH' then return public._err('NOT_PRE_MATCH_PHASE'); end if;
  v_state := jsonb_set(v_m.state, array['ready', v_uid::text], 'true'::jsonb, true);
  perform public._save(p_match, v_state, v_m.deadline_at);
  -- لو خصمي بوت، هو بيتأكد لوحده فوراً (مش محتاج زرار حقيقي)
  select user_id into v_bot from public.match_players where match_id = p_match and is_bot and user_id <> v_uid limit 1;
  if v_bot is not null then
    select * into v_m from public.matches where id = p_match;
    perform public._save(p_match, jsonb_set(v_m.state, array['ready', v_bot::text], 'true'::jsonb, true), v_m.deadline_at);
  end if;
  select * into v_m from public.matches where id = p_match;
  v_u1 := public._uid_at_seat(p_match, 1); v_u2 := public._uid_at_seat(p_match, 2);
  -- ===== مفيش محاكاة قبل ما الاتنين يضغطوا الزرار =====
  if (v_m.state -> 'ready' ?& array[v_u1::text, v_u2::text]) then
    perform public._save(p_match, v_m.state || jsonb_build_object('phase', 'MATCH', 'match_seed', floor(random() * 2000000000)::bigint), now() + interval '90 seconds');
  end if;
  return public._match_view(p_match, v_uid);
end $$;

-- ============================================================================
-- الذكاء الاصطناعي — مزاد قوي وتكيّفي (يشتغل داخل السيرفر، مايقدرش يغش)
-- ============================================================================
-- المبدأ: البوت بيشوف بالظبط اللي أي لاعب شرعي يقدر يشوفه (رصيده، رصيد الخصم الظاهر،
-- تقييم اللاعب المطروح، ندرة المركز في المخزون، تاريخ مزايدات الخصم في نفس الماتش)،
-- وممنوع يشوف أي سر (كروت حماية، محتوى صناديق). قراره بيتغيّر مع الماتش (مش نمط ثابت):
--  - لو الخصم بيسحب فلوسه بسرعة على مراكز غير حرجة → البوت يستنتج إنه "مستعجل" ويضغط عليه.
--  - لو مركز نادر في المخزون (باقي منه قليل) → البوت يزوّد استعداده للدفع.
--  - لو البوت قدّام بالتقييم إجمالاً → يلعب دفاعي ويوفّر فلوسه (risk/reward).
--  - نسبة عشوائية تحكم قرار "خداع": يزوّد بايد حتى على لاعب متوسط عشان يستهلك فلوس الخصم.
--  - نسبة عشوائية تانية تحكم "الاستسلام المبكر" عشان القرارات متبقاش متوقعة.

create or replace function public._auction_position_weight(p_slot text) returns numeric language sql immutable as $$
  select case p_slot when 'GK' then 0.85 when 'ST' then 1.15 when 'LW' then 1.05 when 'RW' then 1.05 else 1.0 end
$$;

create or replace function public._auction_scarcity(p_game text, p_slot text, p_used text[]) returns numeric language sql stable security definer set search_path = public as $$
  select greatest(0.05, least(1.0, public._pool_count(p_game, p_slot)::numeric / greatest(1, (select count(*) from public.pool_items where is_active and kind='PLAYER' and game_id in (p_game,'ALL') and public.slot_accepts(p_slot, position)) + 1)))
$$;

create or replace function public._auction_ai_respond(p_match uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_m public.matches%rowtype; v_bot_seat int; v_bot_uid uuid; v_human_uid uuid;
  v_bot_wallet public.match_wallets%rowtype; v_human_wallet public.match_wallets%rowtype;
  v_state jsonb; v_mem jsonb; v_slot text; v_cand text; v_rating int;
  v_bid numeric; v_min numeric; v_weight numeric; v_scarcity numeric; v_own_squad_size int; v_slots_left int;
  v_lead_ratio numeric; v_aggr numeric; v_valuation numeric; v_max_willing numeric; v_noise numeric;
  v_human_bid_count int; v_human_aggr_est numeric; v_deception numeric; v_give_up numeric;
  v_squad_rating_bot numeric; v_squad_rating_human numeric;
begin
  select * into v_m from public.matches where id = p_match;
  if not found or v_m.status <> 'ACTIVE' or coalesce(v_m.state ->> 'phase','') <> 'DRAFT_OPEN' then return; end if;

  select seat, user_id into v_bot_seat, v_bot_uid from public.match_players where match_id = p_match and is_bot limit 1;
  if v_bot_uid is null then return; end if;
  if coalesce((v_m.state ->> 'bid_leader'), '') = v_bot_uid::text then return; end if;   -- البوت أصلاً صاحب أعلى مزايدة

  v_human_uid := public._other_uid(p_match, v_bot_uid);
  select * into v_bot_wallet from public.match_wallets where match_id = p_match and user_id = v_bot_uid for update;
  select * into v_human_wallet from public.match_wallets where match_id = p_match and user_id = v_human_uid;
  v_state := v_m.state;
  v_slot := v_state ->> 'candidate_slot';
  v_cand := v_state ->> 'candidate';
  select rating into v_rating from public.pool_items where id = v_cand;
  v_min := public._auction_min_next(coalesce((v_state ->> 'bid_amount')::numeric, 0));
  if v_min > (v_bot_wallet.budget - v_bot_wallet.spent) then return; end if;   -- البوت عمره ما يزايد بفلوس مالوش

  -- ---- ذاكرة قصيرة عن سلوك الخصم في نفس الماتش (بتتحدث كل مرة) ----
  v_mem := coalesce(v_state -> 'ai_memory', jsonb_build_object('human_bids', 0, 'human_wins', 0, 'human_free_wins', 0));
  select count(*) into v_human_bid_count from jsonb_array_elements(coalesce(v_state -> 'history','[]'::jsonb)) h where h ->> 'uid' = v_human_uid::text;
  v_human_aggr_est := least(1.5, 0.6 + (v_human_bid_count::numeric / 6));   -- كل ما زوّد مزايداته كل الماتش، البوت يقرأه أعدائي

  -- ---- عناصر التقييم ----
  v_weight := public._auction_position_weight(v_slot);
  v_scarcity := public._auction_scarcity((select game_id from public.matches where id = p_match), v_slot, array(select jsonb_array_elements_text(v_state -> 'used_ids')));
  select coalesce(sum(pi.rating),0) into v_squad_rating_bot from public.pool_items pi where pi.id = any(array(select jsonb_array_elements_text(v_state #> array['squads', v_bot_uid::text])));
  select coalesce(sum(pi.rating),0) into v_squad_rating_human from public.pool_items pi where pi.id = any(array(select jsonb_array_elements_text(v_state #> array['squads', v_human_uid::text])));
  v_lead_ratio := (v_squad_rating_bot + 1) / (v_squad_rating_human + 1);    -- >1 يعني البوت قدّام
  v_own_squad_size := jsonb_array_length(v_state #> array['squads', v_bot_uid::text]);
  v_slots_left := jsonb_array_length(v_state -> 'slots') - v_own_squad_size;
  v_noise := 0.85 + random() * 0.35;                                       -- عشوائية تكسر أي نمط ثابت
  v_deception := (random() < 0.12)::int * (0.15 + random() * 0.2);         -- خداع أحياناً: استعداد زيادة لدفع أعلى من قيمة اللاعب الحقيقية
  v_give_up := random() * 0.18;                                            -- أحياناً يستسلم بدري حتى لو معاه فلوس

  -- عدوانية أساسية: لو البوت وراه في القوة يزوّد، لو قدّام يوفّر. لو الخصم شكله يلعب بعصبية (مزايداته كتير) يستفزّه أكتر عشان يستهلك فلوسه.
  -- مضروبة في "يوم البوت" (ai_skill) — نفس البوت ممكن يبقى وحش النهارده ومتواضع بكرة، فمفيش نتيجة مضمونة مسبقاً.
  v_aggr := (1.0 / greatest(0.5, v_lead_ratio)) * (0.7 + 0.3 * v_human_aggr_est) * (0.6 + 0.4 * v_scarcity)
            * coalesce((v_state ->> 'ai_skill')::numeric, 1.0) + v_deception - v_give_up;
  v_aggr := greatest(0.25, least(1.9, v_aggr));

  -- سقف استعداد البوت للدفع على اللاعب ده (بالمليون)، متناسب مع تقييمه ونسبة الميزانية المتبقية على الخانات الباقية
  v_valuation := (v_rating::numeric / 99) * v_weight * v_aggr * v_noise * (v_bot_wallet.budget / greatest(1, v_slots_left));
  v_max_willing := least(v_bot_wallet.budget - v_bot_wallet.spent, greatest(v_min - 0.5, v_valuation));

  if v_min > v_max_willing then
    return;   -- البوت يقرر يبطّل يزايد على اللاعب ده (قرار منطقي مش عشوائي بحت)
  end if;

  -- قفزة أحياناً بدل الحد الأدنى بالظبط، عشان ميبقاش نمط "زيادة تلقائية ثابتة"
  if random() < 0.3 and v_max_willing - v_min > 1 then
    v_bid := least(v_max_willing, v_min + round((random() * (v_max_willing - v_min))::numeric, 1));
  else
    v_bid := v_min;
  end if;
  v_bid := least(v_bid, v_bot_wallet.budget - v_bot_wallet.spent);
  if v_bid < v_min then return; end if;

  insert into public.match_bids (match_id, round, user_id, amount, seq) values (p_match, coalesce((v_state ->> 'slot_idx')::int, 0), v_bot_uid, v_bid, v_m.seq + 1);
  v_state := v_state || jsonb_build_object('bid_amount', v_bid, 'bid_leader', v_bot_uid::text, 'raises', coalesce((v_state ->> 'raises')::int,0) + 1);
  v_state := jsonb_set(v_state, '{history}', coalesce(v_state -> 'history','[]'::jsonb) || jsonb_build_object('uid', v_bot_uid, 'amount', v_bid, 'at', now()));
  v_state := v_state || jsonb_build_object('ai_memory', v_mem || jsonb_build_object('human_bids', v_human_bid_count));
  perform public._save(p_match, v_state,
    case when v_m.deadline_at is null or v_m.deadline_at - now() < interval '3 seconds' then now() + interval '4 seconds' else v_m.deadline_at end);
end $$;

-- ============================================================================
-- و) "تاخد اللاعب ده ولا الخفي؟" — الهوية الحقيقية مخفية في السيرفر لحد لحظة الاختيار
-- ============================================================================
-- كل جولة: تُسحب خانة من formation_slots بالترتيب، وتُعرض للاعب اللي دوره خياران:
--   "المكشوف": pool_item معروف الاسم والتقييم.
--   "الخفي": pool_item موجود فعلاً بنفس المركز لكن هويته مخفية في match_secrets لحد ما اللاعب يختاره.
-- الاختيار ملزم لنفس المركز المطلوب في الخانة الحالية (منطقياً مستحيل غلط مركز).
-- بعد ما الاتنين يكملوا كل الخانات + المدرب → PRE_MATCH ثم زرار "يلا نشوف مين هيكسب" (match_confirm_ready).

create or replace function public._tph_create(p_room public.rooms)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_slots text[]; v_u1 uuid; v_u2 uuid; v_state jsonb; v_id uuid; v_timer int; v_pair jsonb;
begin
  v_slots := public.formation_slots(coalesce((p_room.settings ->> 'format')::int, 5));
  v_timer := coalesce((p_room.settings ->> 'timer_seconds')::int, 10);
  v_u1 := public._uid_at_seat_from_room(p_room.id, 1);
  v_u2 := public._uid_at_seat_from_room(p_room.id, 2);

  v_state := jsonb_build_object(
    'phase', 'PICKING', 'slots', to_jsonb(v_slots), 'slot_idx', 0, 'turn_seat', 1,
    'squads', jsonb_build_object(v_u1::text, '[]'::jsonb, v_u2::text, '[]'::jsonb),
    'coach', '{}'::jsonb, 'used_ids', '[]'::jsonb, 'ready', '{}'::jsonb,
    'ai_skill', 0.7 + random() * 0.6);
  v_id := public._match_insert(p_room, v_state, now() + make_interval(secs => v_timer));
  perform public._tph_new_pair(v_id);
  return v_id;
end $$;

-- يجهّز خيارين (مكشوف + خفي) لنفس مركز الخانة الحالية ويخزن هويتهما سراً
create or replace function public._tph_new_pair(p_match uuid) returns void language plpgsql security definer set search_path = public as $$
declare v_m public.matches%rowtype; v_slots text[]; v_idx int; v_slot text; v_used text[]; v_two text[]; v_secrets jsonb; v_state jsonb; v_timer int;
begin
  select * into v_m from public.matches where id = p_match;
  v_slots := array(select jsonb_array_elements_text(v_m.state -> 'slots'));
  v_idx := (v_m.state ->> 'slot_idx')::int;
  if v_idx >= array_length(v_slots, 1) then return; end if;
  v_slot := v_slots[v_idx + 1];
  v_used := array(select jsonb_array_elements_text(v_m.state -> 'used_ids'));
  v_two := public._pool_draw((select game_id from public.matches where id = p_match), v_slot, 2, v_used);
  if array_length(v_two, 1) < 2 then return; end if;   -- pool_check قبل البدء بيمنع الحالة دي أصلاً

  v_secrets := coalesce(public._secrets(p_match), '{}'::jsonb) || jsonb_build_object('hidden_id', v_two[2]);
  perform public._set_secrets(p_match, v_secrets);
  v_timer := coalesce((select (settings ->> 'timer_seconds')::int from public.rooms where id = v_m.room_id), 10);
  v_state := v_m.state || jsonb_build_object('current_slot', v_slot, 'visible_id', v_two[1],
                          'used_ids', to_jsonb(v_used || v_two));
  perform public._save(p_match, v_state, now() + make_interval(secs => v_timer));
end $$;

-- ---------- اختيار: مكشوف أو خفي ----------
-- تنفيذ داخلي بيتنادى بيوزر محدد صراحة (مش من auth.uid()) — يستخدمه اللاعب البشري وأيضاً
-- الحسم التلقائي عند انتهاء المهلة وقرار الذكاء الاصطناعي، كل واحد بهويته الصحيحة.
create or replace function public._tph_apply_pick(p_match uuid, v_uid uuid, p_choice text, p_request uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_m public.matches%rowtype; v_seat int; v_state jsonb; v_picked text; v_secrets jsonb;
        v_slots text[]; v_idx int; v_u1 uuid; v_u2 uuid; v_coaches text[];
begin
  select * into v_m from public.matches where id = p_match for update;
  if not found then return public._err('MATCH_NOT_FOUND'); end if;
  if public._action_seen(p_match, v_uid, p_request) then return public._match_view(p_match, v_uid); end if;
  v_seat := public._seat_of(p_match, v_uid);
  if v_seat is null then return public._err('NOT_A_PLAYER'); end if;
  if v_m.status <> 'ACTIVE' or coalesce(v_m.state ->> 'phase','') <> 'PICKING' then return public._err('NOT_PICKING_PHASE'); end if;
  if coalesce((v_m.state ->> 'turn_seat')::int, 1) <> v_seat then return public._err('NOT_YOUR_TURN'); end if;
  if p_choice not in ('VISIBLE','HIDDEN') then return public._err('INVALID_CHOICE'); end if;

  v_secrets := public._secrets(p_match);
  v_picked := case when p_choice = 'VISIBLE' then v_m.state ->> 'visible_id' else v_secrets ->> 'hidden_id' end;
  v_state := jsonb_set(v_m.state, array['squads', v_uid::text], (v_m.state #> array['squads', v_uid::text]) || to_jsonb(v_picked));
  v_state := v_state || jsonb_build_object('last_pick', jsonb_build_object('uid', v_uid, 'choice', p_choice, 'id', v_picked));

  v_slots := array(select jsonb_array_elements_text(v_state -> 'slots'));
  v_idx := (v_state ->> 'slot_idx')::int;
  v_u1 := public._uid_at_seat(p_match, 1); v_u2 := public._uid_at_seat(p_match, 2);

  -- التبادل: كل خانة يختار فيها اللاعبان بدورهما (1 يشوف الاختيارين، بعدين 2 على نفس الخانة بخيارين جداد) — يضمن عدالة نفس المركز للاتنين
  if v_seat = 1 then
    v_state := v_state || jsonb_build_object('turn_seat', 2);
    perform public._save(p_match, v_state, v_m.deadline_at);
    perform public._tph_new_pair(p_match);   -- خيارين جداد لنفس المركز لللاعب التاني (مايشوفش اختيار خصمه قبلها)
  else
    v_idx := v_idx + 1;
    if v_idx >= array_length(v_slots, 1) then
      v_coaches := public._pool_draw_coach((select game_id from public.matches where id = p_match), 2, '{}');
      v_state := v_state || jsonb_build_object('coach', jsonb_build_object(v_u1::text, v_coaches[1], v_u2::text, v_coaches[2]),
                                                 'phase', 'PRE_MATCH', 'visible_id', null, 'slot_idx', v_idx);
      perform public._set_secrets(p_match, '{}'::jsonb);
      perform public._save(p_match, v_state, null);
    else
      v_state := v_state || jsonb_build_object('slot_idx', v_idx, 'turn_seat', 1);
      perform public._save(p_match, v_state, v_m.deadline_at);
      perform public._tph_new_pair(p_match);
    end if;
  end if;
  if p_request is not null then perform public._action_record(p_match, v_uid, p_request, 'PICK'); end if;
  perform public._tph_ai_maybe_pick(p_match);
  return public._match_view(p_match, v_uid);
end $$;

-- الواجهة العامة اللي بينادها اللاعب البشري فعلياً (بتاخد هويته من الجلسة نفسها)
create or replace function public.tph_pick(p_match uuid, p_request uuid, p_choice text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public._uid();
begin
  perform public._match_advance(p_match);
  return public._tph_apply_pick(p_match, v_uid, p_choice, p_request);
end $$;

-- انتهاء المهلة من غير اختيار = يتاخد المكشوف تلقائياً لصاحب الدور نفسه (منطقي وعادل، وميسيبش الخانة فاضية)
create or replace function public._tph_advance(p_match uuid) returns void language plpgsql security definer set search_path = public as $$
declare v_m public.matches%rowtype; v_seat int; v_uid uuid;
begin
  select * into v_m from public.matches where id = p_match;
  if coalesce(v_m.state ->> 'phase','') <> 'PICKING' or v_m.deadline_at is null or now() <= v_m.deadline_at then return; end if;
  v_seat := coalesce((v_m.state ->> 'turn_seat')::int, 1);
  v_uid := public._uid_at_seat(p_match, v_seat);
  perform public._tph_apply_pick(p_match, v_uid, 'VISIBLE', null);
end $$;

-- ---------- الذكاء الاصطناعي: يقيّم المكشوف مقابل احتمال الخفي بمنطق حقيقي مش عشوائي ----------
create or replace function public._tph_ai_maybe_pick(p_match uuid) returns void language plpgsql security definer set search_path = public as $$
declare v_m public.matches%rowtype; v_bot_uid uuid; v_seat int; v_visible_rating numeric; v_slot text;
        v_avg_line_rating numeric; v_squad_bot numeric; v_squad_human numeric; v_lead numeric; v_gamble numeric; v_choice text;
begin
  select * into v_m from public.matches where id = p_match;
  if not found or v_m.status <> 'ACTIVE' or coalesce(v_m.state ->> 'phase','') <> 'PICKING' then return; end if;
  select seat, user_id into v_seat, v_bot_uid from public.match_players where match_id = p_match and is_bot limit 1;
  if v_bot_uid is null or coalesce((v_m.state ->> 'turn_seat')::int,1) <> v_seat then return; end if;

  v_slot := v_m.state ->> 'current_slot';
  select rating into v_visible_rating from public.pool_items where id = (v_m.state ->> 'visible_id');
  -- البوت مايشوفش هوية الخفي، بس يعرف متوسط تقييم نفس الخط في المخزون (معلومة عادلة متاحة منطقياً لأي محترف)
  select avg(rating) into v_avg_line_rating from public.pool_items where is_active and kind='PLAYER'
    and game_id in ((select game_id from public.matches where id = p_match), 'ALL') and public.slot_accepts(v_slot, position);
  select coalesce(sum(pi.rating),0) into v_squad_bot from public.pool_items pi where pi.id = any(array(select jsonb_array_elements_text(v_m.state #> array['squads', v_bot_uid::text])));
  select coalesce(sum(pi.rating),0) into v_squad_human from public.pool_items pi where pi.id = any(array(select jsonb_array_elements_text(v_m.state #> array['squads', public._other_uid(p_match, v_bot_uid)::text])));
  v_lead := (v_squad_bot + 1) / (v_squad_human + 1);

  -- لو المكشوف أعلى بوضوح من متوسط الخط ياخده أمان. لو أقل بوضوح يخاطر بالخفي. لو قريب: نسبة مخاطرة متغيرة حسب موقفه في المباراة.
  -- ومضروبة بـ"يوم البوت" (ai_skill): يوم قوي بيقرأ الموقف صح ويخاطر بذكاء، يوم ضعيف بيتخبط وممكن يخسر من مبتدئ.
  v_gamble := 0.5 + (v_avg_line_rating - v_visible_rating) / 40.0 + (case when v_lead < 1 then 0.15 else -0.1 end)
              + (random() * 0.25 - 0.125);
  v_gamble := 0.5 + (v_gamble - 0.5) * coalesce((v_m.state ->> 'ai_skill')::numeric, 1.0);
  v_gamble := greatest(0.05, least(0.9, v_gamble));
  v_choice := case when random() < v_gamble then 'HIDDEN' else 'VISIBLE' end;
  perform public._tph_apply_pick(p_match, v_bot_uid, v_choice, null);
end $$;

-- ============================================================================
-- ز) ديل أور نو ديل — محتوى الصناديق سري 100% في السيرفر لحد الفتح، والحكم بس (لو موجود) يعرف قبل كده
-- ============================================================================
-- 5 مراحل بالترتيب: GK ثم DEF ثم MID ثم ATT ثم COACH.
-- كل مرحلة: كل لاعب معاه 4 صناديق سرية (مركزها/مدربها مطابق للمرحلة، وممكن صندوق فيه كرت حماية/سرقة).
-- كل لاعب يفتح صندوق واحد بدوره داخل المهلة (5/10/15 حسب اختيار الغرفة)، اللاعب التاني بعده.
-- الكرت (لو طلع) بيتضاف لمخزون اللاعب بشكل سري تماماً عن الخصم (لا اسم ولا نوع ولا وجود من عدمه).
-- بعد ما الاتنين يفتحوا صندوق في كل مرحلة، تتقفل المرحلة وتتفتح اللي بعدها تلقائياً (مفيش زرار مطلوب هنا،
-- ده الفلو الأصلي للعبة زي ما هو محدد في المتطلبات).

create or replace function public._dnd_stages() returns text[] language sql immutable as $$ select array['GK','DEF','MID','ATT','COACH'] $$;
create or replace function public._dnd_boxes_per_side() returns int language sql immutable as $$ select 4 $$;

create or replace function public._dnd_create(p_room public.rooms)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_u1 uuid; v_u2 uuid; v_state jsonb; v_id uuid; v_timer int; v_secrets jsonb;
begin
  v_u1 := public._uid_at_seat_from_room(p_room.id, 1);
  v_u2 := public._uid_at_seat_from_room(p_room.id, 2);
  v_timer := coalesce((p_room.settings ->> 'timer_seconds')::int, 10);

  v_state := jsonb_build_object(
    'phase', 'BOXES', 'stages', to_jsonb(public._dnd_stages()), 'stage_idx', 0, 'turn_uid', v_u1::text,
    'boxes', jsonb_build_object(v_u1::text, '[]'::jsonb, v_u2::text, '[]'::jsonb),
    'acquired', jsonb_build_object('A', '[]'::jsonb, 'B', '[]'::jsonb),
    'seat_side', jsonb_build_object(v_u1::text, 'A', v_u2::text, 'B'),
    'cards_public_count', jsonb_build_object(v_u1::text, 0, v_u2::text, 0),
    'protected_of', jsonb_build_object(v_u1::text, '[]'::jsonb, v_u2::text, '[]'::jsonb),
    'used_ids', '[]'::jsonb, 'ready', '{}'::jsonb, 'log', '[]'::jsonb,
    'ai_skill', 0.7 + random() * 0.6);
  v_id := public._match_insert(p_room, v_state, now() + make_interval(secs => v_timer));

  -- الحكم (لو مفعّل من إعدادات الغرفة) بينضاف كعضو محايد شايف كل حاجة سرية
  if coalesce((p_room.settings ->> 'with_judge')::boolean, false) then
    insert into public.match_players (match_id, user_id, seat, role, display_name, avatar)
    select v_id, m.user_id, null, 'JUDGE', m.display_name, m.avatar from public.room_members m where m.room_id = p_room.id and m.role = 'JUDGE';
  end if;

  v_secrets := '{}'::jsonb;
  perform public._dnd_fill_stage_boxes(v_id, v_secrets, v_u1, v_u2);
  return v_id;
end $$;

-- يملأ صناديق المرحلة الحالية سراً (كل صندوق: لاعب/مدرب من نفس المرحلة + احتمال كرت)
create or replace function public._dnd_fill_stage_boxes(p_match uuid, p_secrets jsonb, p_u1 uuid, p_u2 uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_m public.matches%rowtype; v_stage text; v_n int := public._dnd_boxes_per_side();
        v_items1 text[]; v_items2 text[]; v_used text[]; v_secrets jsonb := p_secrets; v_boxes1 jsonb := '[]'::jsonb; v_boxes2 jsonb := '[]'::jsonb;
        i int; v_card text; v_key text; v_state jsonb; v_timer int;
begin
  select * into v_m from public.matches where id = p_match;
  v_stage := (v_m.state -> 'stages') ->> (v_m.state ->> 'stage_idx')::int;
  v_used := array(select jsonb_array_elements_text(v_m.state -> 'used_ids'));
  if v_stage = 'COACH' then
    v_items1 := public._pool_draw_coach((select game_id from public.matches where id = p_match), v_n, v_used);
    v_items2 := public._pool_draw_coach((select game_id from public.matches where id = p_match), v_n, v_used || v_items1);
  else
    v_items1 := public._pool_draw_line((select game_id from public.matches where id = p_match), v_stage, v_n, v_used);
    v_items2 := public._pool_draw_line((select game_id from public.matches where id = p_match), v_stage, v_n, v_used || v_items1);
  end if;

  for i in 1..v_n loop
    v_key := 'b_' || v_m.id::text || '_1_' || i::text;
    v_card := case when random() < 0.18 then (array['SHIELD','STEAL'])[1 + floor(random()*2)::int] else null end;
    v_secrets := jsonb_set(v_secrets, array[v_key], jsonb_build_object('item', v_items1[i], 'card', v_card));
    v_boxes1 := v_boxes1 || jsonb_build_object('key', v_key, 'opened', false);

    v_key := 'b_' || v_m.id::text || '_2_' || i::text;
    v_card := case when random() < 0.18 then (array['SHIELD','STEAL'])[1 + floor(random()*2)::int] else null end;
    v_secrets := jsonb_set(v_secrets, array[v_key], jsonb_build_object('item', v_items2[i], 'card', v_card));
    v_boxes2 := v_boxes2 || jsonb_build_object('key', v_key, 'opened', false);
  end loop;

  perform public._set_secrets(p_match, v_secrets);
  v_timer := coalesce((select (settings ->> 'timer_seconds')::int from public.rooms where id = v_m.room_id), 10);
  v_state := v_m.state || jsonb_build_object('boxes', jsonb_build_object(p_u1::text, v_boxes1, p_u2::text, v_boxes2),
                          'used_ids', to_jsonb(v_used || v_items1 || v_items2));
  perform public._save(p_match, v_state, now() + make_interval(secs => v_timer));
end $$;

-- ---------- فتح صندوق ----------
create or replace function public._dnd_apply_open(p_match uuid, v_uid uuid, p_box_key text, p_request uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_m public.matches%rowtype; v_state jsonb; v_secrets jsonb; v_box jsonb; v_content jsonb;
        v_side text; v_stage text; v_boxes jsonb; v_idx int; v_other uuid; v_u1 uuid; v_u2 uuid;
begin
  select * into v_m from public.matches where id = p_match for update;
  if not found then return public._err('MATCH_NOT_FOUND'); end if;
  if public._action_seen(p_match, v_uid, p_request) then return public._match_view(p_match, v_uid); end if;
  if public._seat_of(p_match, v_uid) is null then return public._err('NOT_A_PLAYER'); end if;
  if v_m.status <> 'ACTIVE' or coalesce(v_m.state ->> 'phase','') <> 'BOXES' then return public._err('NOT_BOXES_PHASE'); end if;
  if coalesce(v_m.state ->> 'turn_uid','') <> v_uid::text then return public._err('NOT_YOUR_TURN'); end if;

  v_boxes := v_m.state #> array['boxes', v_uid::text];
  select b into v_box from jsonb_array_elements(v_boxes) with ordinality as t(b, o) where b ->> 'key' = p_box_key;
  if v_box is null then return public._err('INVALID_BOX'); end if;
  if coalesce((v_box ->> 'opened')::boolean, false) then return public._err('BOX_ALREADY_OPENED'); end if;

  v_secrets := public._secrets(p_match);
  v_content := v_secrets -> p_box_key;
  v_state := v_m.state;
  v_side := v_state #>> array['seat_side', v_uid::text];
  v_stage := (v_state -> 'stages') ->> (v_state ->> 'stage_idx')::int;

  -- المركز مضمون صح: العنصر داخل الصندوق أصلاً من نفس مرحلة/خط الجولة (اتسحب كذلك في _dnd_fill_stage_boxes)
  v_state := jsonb_set(v_state, array['acquired', v_side], (v_state #> array['acquired', v_side]) || to_jsonb(v_content ->> 'item'));

  -- تحديث الصندوق كمفتوح (يبان للاتنين إنه اتفتح، والعنصر يبان لصاحبه بس؛ الكرت سري تماماً عن الخصم)
  v_boxes := (select jsonb_agg(case when b ->> 'key' = p_box_key then b || jsonb_build_object('opened', true) else b end)
              from jsonb_array_elements(v_boxes) b);
  v_state := jsonb_set(v_state, array['boxes', v_uid::text], v_boxes);

  if (v_content ->> 'card') is not null then
    v_state := jsonb_set(v_state, array['cards_public_count', v_uid::text],
      to_jsonb(coalesce((v_state #>> array['cards_public_count', v_uid::text])::int, 0) + 1));
    -- نوع الكرت وامتلاكه بيتسجل سراً في match_private بتاع صاحبه بس (الحكم بس اللي يقدر يشوفه غير كده)
    perform public._set_private(p_match, v_uid, public._private(p_match, v_uid) ||
      jsonb_build_object('cards', coalesce(public._private(p_match, v_uid) -> 'cards', '[]'::jsonb) || to_jsonb(v_content ->> 'card')));
  end if;

  v_state := jsonb_set(v_state, '{log}', coalesce(v_state -> 'log','[]'::jsonb) ||
    jsonb_build_object('uid', v_uid, 'stage', v_stage, 'box', p_box_key, 'had_card', (v_content ->> 'card') is not null));

  v_u1 := public._uid_at_seat(p_match, 1); v_u2 := public._uid_at_seat(p_match, 2);

  -- الاتنين فتحوا صندوق في المرحلة دي؟ لو لأ، الدور يعدي للتاني. لو أه، ادخل المرحلة الجاية أو انهي اللعبة.
  if v_state #>> array['turn_uid'] = v_u1::text then
    v_state := v_state || jsonb_build_object('turn_uid', v_u2::text);
    perform public._save(p_match, v_state, v_m.deadline_at);
    perform public._dnd_ai_maybe_open(p_match);
  else
    if p_request is not null then perform public._action_record(p_match, v_uid, p_request, 'OPEN'); end if;
    perform public._dnd_close_stage(p_match, v_state);
    return public._match_view(p_match, v_uid);
  end if;
  if p_request is not null then perform public._action_record(p_match, v_uid, p_request, 'OPEN'); end if;
  return public._match_view(p_match, v_uid);
end $$;

create or replace function public._dnd_close_stage(p_match uuid, p_state jsonb) returns void language plpgsql security definer set search_path = public as $$
declare v_m public.matches%rowtype; v_state jsonb := p_state; v_idx int; v_stages text[]; v_u1 uuid; v_u2 uuid; v_timer int;
begin
  select * into v_m from public.matches where id = p_match;
  v_idx := (v_state ->> 'stage_idx')::int + 1;
  v_stages := array(select jsonb_array_elements_text(v_state -> 'stages'));
  v_u1 := public._uid_at_seat(p_match, 1); v_u2 := public._uid_at_seat(p_match, 2);
  if v_idx >= array_length(v_stages, 1) then
    perform public._save(p_match, v_state || jsonb_build_object('phase', 'PRE_MATCH'), null);
  else
    v_timer := coalesce((select (settings ->> 'timer_seconds')::int from public.rooms where id = v_m.room_id), 10);
    v_state := v_state || jsonb_build_object('stage_idx', v_idx, 'turn_uid', v_u1::text);
    perform public._save(p_match, v_state, now() + make_interval(secs => v_timer));
    perform public._dnd_fill_stage_boxes(p_match, public._secrets(p_match), v_u1, v_u2);
    perform public._dnd_ai_maybe_open(p_match);
  end if;
end $$;

create or replace function public.dnd_open_box(p_match uuid, p_request uuid, p_box_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public._uid();
begin
  perform public._match_advance(p_match);
  return public._dnd_apply_open(p_match, v_uid, p_box_key, p_request);
end $$;

-- انتهاء المهلة من غير فتح = صندوق عشوائي من صناديق صاحب الدور يتفتح تلقائياً (منطقي، وميوقفش اللعبة)
create or replace function public._dnd_advance(p_match uuid) returns void language plpgsql security definer set search_path = public as $$
declare v_m public.matches%rowtype; v_uid uuid; v_key text;
begin
  select * into v_m from public.matches where id = p_match;
  if coalesce(v_m.state ->> 'phase','') <> 'BOXES' or v_m.deadline_at is null or now() <= v_m.deadline_at then return; end if;
  v_uid := (v_m.state ->> 'turn_uid')::uuid;
  select b ->> 'key' into v_key from jsonb_array_elements(v_m.state #> array['boxes', v_uid::text]) b
   where not coalesce((b ->> 'opened')::boolean, false) order by random() limit 1;
  if v_key is not null then perform public._dnd_apply_open(p_match, v_uid, v_key, null); end if;
end $$;

-- ---------- استخدام كرت (سرقة/حماية) — الحماية مانعة السرقة سيرفرياً مش بس شكلياً ----------
create or replace function public.dnd_use_card(p_match uuid, p_request uuid, p_card text, p_target_item text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public._uid(); v_m public.matches%rowtype; v_priv jsonb; v_cards jsonb; v_idx int; v_state jsonb;
        v_my_side text; v_other_side text; v_other_uid uuid;
begin
  select * into v_m from public.matches where id = p_match for update;
  if not found then return public._err('MATCH_NOT_FOUND'); end if;
  if public._action_seen(p_match, v_uid, p_request) then return public._match_view(p_match, v_uid); end if;
  if public._seat_of(p_match, v_uid) is null then return public._err('NOT_A_PLAYER'); end if;
  if v_m.status <> 'ACTIVE' then return public._err('MATCH_NOT_ACTIVE'); end if;
  v_priv := public._private(p_match, v_uid);
  v_cards := coalesce(v_priv -> 'cards', '[]'::jsonb);
  select ord - 1 into v_idx from jsonb_array_elements_text(v_cards) with ordinality as t(val, ord) where val = p_card limit 1;
  if v_idx is null then return public._err('CARD_NOT_OWNED'); end if;

  v_state := v_m.state;
  v_my_side := v_state #>> array['seat_side', v_uid::text];
  v_other_uid := public._other_uid(p_match, v_uid);
  v_other_side := v_state #>> array['seat_side', v_other_uid::text];

  if p_card = 'SHIELD' then
    if p_target_item is null or not (v_state #> array['acquired', v_my_side] ? p_target_item) then return public._err('INVALID_TARGET'); end if;
    v_state := jsonb_set(v_state, array['protected_of', v_uid::text], (v_state #> array['protected_of', v_uid::text]) || to_jsonb(p_target_item));
  elsif p_card = 'STEAL' then
    if p_target_item is null or not (v_state #> array['acquired', v_other_side] ? p_target_item) then return public._err('INVALID_TARGET'); end if;
    -- ===== ممنوع تسرق لاعب محمي، والتحقق ده على السيرفر مش على الواجهة =====
    if (v_state #> array['protected_of', v_other_uid::text]) ? p_target_item then
      return public._err('PLAYER_PROTECTED');
    end if;
    v_state := jsonb_set(v_state, array['acquired', v_my_side],
      (v_state #> array['acquired', v_my_side]) || to_jsonb(p_target_item));   -- يضاف للسارق
    v_state := jsonb_set(v_state, array['acquired', v_other_side],
      (select coalesce(jsonb_agg(x), '[]'::jsonb) from jsonb_array_elements_text(v_state #> array['acquired', v_other_side]) x where x <> p_target_item));
  else
    return public._err('UNKNOWN_CARD');
  end if;

  v_cards := (v_cards - v_idx);
  perform public._set_private(p_match, v_uid, v_priv || jsonb_build_object('cards', v_cards));
  perform public._save(p_match, v_state, v_m.deadline_at);
  perform public._action_record(p_match, v_uid, p_request, 'CARD');
  return public._match_view(p_match, v_uid);
end $$;

-- هل اللاعب المستهدف محمي؟ (للعرض الفوري "محمي" في الواجهة قبل استخدام الكرت)
create or replace function public.dnd_is_protected(p_match uuid, p_target_uid uuid, p_item text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_state jsonb;
begin
  if public._seat_of(p_match, public._uid()) is null then return public._err('NOT_A_PLAYER'); end if;
  select state into v_state from public.matches where id = p_match;
  return jsonb_build_object('ok', true, 'protected', coalesce((v_state #> array['protected_of', p_target_uid::text]) ? p_item, false));
end $$;

-- ---------- الذكاء الاصطناعي ----------
create or replace function public._dnd_ai_maybe_open(p_match uuid) returns void language plpgsql security definer set search_path = public as $$
declare v_m public.matches%rowtype; v_bot_uid uuid; v_keys text[]; v_key text; v_cards jsonb; v_priv jsonb;
        v_other_uid uuid; v_other_side text; v_other_items text[]; v_target text; v_protected boolean;
begin
  select * into v_m from public.matches where id = p_match;
  if not found or v_m.status <> 'ACTIVE' or coalesce(v_m.state ->> 'phase','') <> 'BOXES' then return; end if;
  select user_id into v_bot_uid from public.match_players where match_id = p_match and is_bot limit 1;
  if v_bot_uid is null or coalesce(v_m.state ->> 'turn_uid','') <> v_bot_uid::text then return; end if;

  -- قبل ما يفتح صندوق جديد، يقيّم لو عنده كرت يستخدمه استراتيجياً (سرقة لاعب أعلى تقييم من غير حماية)
  -- احتمالات الاستخدام مضروبة في "يوم البوت" (ai_skill) — يوم قوي يستغل الكروت بذكاء، يوم ضعيف يفوّت فرص واضحة.
  v_priv := public._private(p_match, v_bot_uid);
  v_cards := coalesce(v_priv -> 'cards', '[]'::jsonb);
  if v_cards ? 'STEAL' and random() < least(0.9, 0.7 * coalesce((v_m.state ->> 'ai_skill')::numeric, 1.0)) then
    v_other_uid := public._other_uid(p_match, v_bot_uid);
    v_other_side := v_m.state #>> array['seat_side', v_other_uid::text];
    v_other_items := array(select jsonb_array_elements_text(v_m.state #> array['acquired', v_other_side]));
    select pi.id into v_target from public.pool_items pi where pi.id = any(v_other_items)
      and not ((v_m.state #> array['protected_of', v_other_uid::text]) ? pi.id)
      order by pi.rating desc limit 1;
    if v_target is not null then
      perform public.dnd_use_card(p_match, gen_random_uuid(), 'STEAL', v_target);
      select * into v_m from public.matches where id = p_match;
    end if;
  end if;

  -- أول عنصر مكتسب حالياً للبوت في المرحلة دي: لو أعلاه من متوسط الخط، رجّح استخدام SHIELD عليه
  if v_cards ? 'SHIELD' and random() < least(0.9, 0.4 * coalesce((v_m.state ->> 'ai_skill')::numeric, 1.0)) then
    select pi.id into v_target from public.pool_items pi
     where pi.id = any(array(select jsonb_array_elements_text(v_m.state #> array['acquired', (v_m.state #>> array['seat_side', v_bot_uid::text])])))
       and not ((v_m.state #> array['protected_of', v_bot_uid::text]) ? pi.id)
     order by pi.rating desc limit 1;
    if v_target is not null then
      perform public.dnd_use_card(p_match, gen_random_uuid(), 'SHIELD', v_target);
      select * into v_m from public.matches where id = p_match;
    end if;
  end if;

  select b ->> 'key' into v_key from jsonb_array_elements(v_m.state #> array['boxes', v_bot_uid::text]) b
   where not coalesce((b ->> 'opened')::boolean, false) order by random() limit 1;
  if v_key is not null then perform public._dnd_apply_open(p_match, v_bot_uid, v_key, null); end if;
end $$;

-- ---------- الحكم (بشري أو نظامي) بيشوف محتوى كل حاجة سرية أول بأول ----------
-- المهم: الدالة دي بترفض أي حد role مش 'JUDGE' في الماتش ده تحديداً، حتى لو هو أحد اللاعبين نفسهم.
-- لو مفيش حكم بشري متعيّن في الغرفة (with_judge = false)، النظام نفسه هو "الحكم" (السيرفر عارف
-- المحتوى داخلياً في match_secrets وبيستخدمه في الحسم/المنع، من غير ما يوصل لأي متصفح غير حكم موثّق).
create or replace function public.dnd_judge_view(p_match uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := public._uid(); v_role text; v_m public.matches%rowtype; v_secrets jsonb; v_state jsonb;
        v_u1 uuid; v_u2 uuid; v_out jsonb := '[]'::jsonb; v_side1 text; v_side2 text;
begin
  select role into v_role from public.match_players where match_id = p_match and user_id = v_uid;
  if v_role is null then return public._err('MATCH_NOT_FOUND'); end if;
  if v_role <> 'JUDGE' then return public._err('NOT_A_JUDGE'); end if;   -- ===== لاعب عادي عمره ما ياخد الرد ده =====

  select * into v_m from public.matches where id = p_match;
  v_secrets := public._secrets(p_match);
  v_state := v_m.state;
  v_u1 := public._uid_at_seat(p_match, 1); v_u2 := public._uid_at_seat(p_match, 2);
  v_side1 := v_state #>> array['seat_side', v_u1::text];
  v_side2 := v_state #>> array['seat_side', v_u2::text];

  -- كل صندوق لسه مقفول لصاحبه: هوية اللاعب/المدرب جواه + هل فيه كرت ونوعه، للحكم بس
  select coalesce(jsonb_agg(jsonb_build_object(
      'owner_uid', v_u1, 'key', b ->> 'key', 'opened', b ->> 'opened',
      'item', v_secrets #>> array[b ->> 'key', 'item'], 'card', v_secrets #>> array[b ->> 'key', 'card'])),
    '[]'::jsonb) into v_out from jsonb_array_elements(coalesce(v_state #> array['boxes', v_u1::text], '[]'::jsonb)) b;
  v_out := v_out || coalesce((select jsonb_agg(jsonb_build_object(
      'owner_uid', v_u2, 'key', b ->> 'key', 'opened', b ->> 'opened',
      'item', v_secrets #>> array[b ->> 'key', 'item'], 'card', v_secrets #>> array[b ->> 'key', 'card']))
    from jsonb_array_elements(coalesce(v_state #> array['boxes', v_u2::text], '[]'::jsonb)) b), '[]'::jsonb);

  return jsonb_build_object('ok', true, 'server_now', now(), 'match_id', p_match, 'phase', v_state ->> 'phase',
    'boxes', v_out,
    -- الكروت المملوكة فعلياً (بعد الفتح) لكل لاعب، والحماية الفعلية سارية، عشان الحكم يقدر يحسم أي نزاع فوراً
    'cards_owned', jsonb_build_object(v_u1::text, coalesce(public._private(p_match, v_u1) -> 'cards', '[]'::jsonb),
                                       v_u2::text, coalesce(public._private(p_match, v_u2) -> 'cards', '[]'::jsonb)),
    'protected', v_state -> 'protected_of');
end $$;

-- ============================================================================
-- خاتمة: النشر اللحظي (Realtime) + الصلاحيات + فهارس أداء إضافية
-- ============================================================================

-- الجداول اللي لازم العميل يسمعها لحظياً (اللي معاها RLS بترجع بس اللي يحق له يشوفه)
do $$ begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

do $$
declare t text;
begin
  foreach t in array array['rooms','room_members','room_invites','matches','match_players','match_private',
                            'match_wallets','match_bids','notifications','game_users','games','game_images','players']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null; end;
  end loop;
end $$;

alter table public.rooms replica identity full;
alter table public.matches replica identity full;
alter table public.match_wallets replica identity full;
alter table public.match_private replica identity full;

-- صلاحيات تنفيذ الدوال العامة لأي مستخدم موقّع دخول مجهول (anonymous auth)
grant execute on all functions in schema public to authenticated;
grant select, insert, update on public.game_users, public.notifications, public.player_devices,
  public.notification_preferences, public.matchmaking_queue, public.match_invites to authenticated;
grant select on public.games, public.game_images, public.players, public.rooms, public.room_members,
  public.room_invites, public.matches, public.match_players, public.match_wallets, public.match_bids,
  public.match_private, public.admin_users to authenticated;
grant select, insert, update, delete on public.players, public.game_images, public.player_assets, public.admin_users to authenticated;

-- فهارس إضافية للأداء تحت الحمل
create index if not exists matches_status_deadline_idx on public.matches (status, deadline_at) where status = 'ACTIVE';
create index if not exists room_members_lastseen_idx on public.room_members (last_seen);

-- ============================================================================
-- تم. الخطوة الوحيدة المتبقية بعد تشغيل الملف: تفعيل "Allow anonymous sign-ins"
-- من Authentication → Providers، وإضافة إيميلك في admin_users (سطر في الأعلى).
-- ============================================================================
