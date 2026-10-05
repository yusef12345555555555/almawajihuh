-- ============================================================================
-- المواجهة | AL MWAJHA — تحديث قاعدة البيانات V3
-- شغّله مرة واحدة في Supabase → SQL Editor → New query → Run.
-- آمن تماماً لو اتشغّل أكتر من مرة (idempotent) ولا يحذف أي بيانات موجودة.
-- لازم تكون شغّلت SUPABASE_SETUP.sql قبله (مرة واحدة فقط من البداية).
-- ============================================================================

create extension if not exists pg_trgm;

-- ============================================================================
-- 1) هوية اللاعب: أرقام متسلسلة ELM1, ELM2, ELM3 ... + مزامنة من غير حساب
--    كل جهاز عنده "مفتاح سري" عشوائي بيتخزن عليه بس. السيرفر بيحفظ بصمته
--    فقط، وده بيمنع أي حد من انتحال لاعب تاني — ومش محتاج Anonymous Auth.
-- ============================================================================
create sequence if not exists public.player_id_seq start 1;

alter table public.game_users add column if not exists points int not null default 0;
alter table public.game_users add column if not exists equipped jsonb not null default '{}'::jsonb;

create table if not exists public.device_links (
  secret_hash text primary key,
  game_user_id text not null unique,
  created_at timestamptz not null default now()
);
alter table public.device_links enable row level security;   -- مقفول على العميل تماماً (من غير policies)

create or replace function public._next_player_id() returns text
language plpgsql set search_path = public as $$
declare v_id text;
begin
  loop
    v_id := 'ELM' || nextval('public.player_id_seq')::text;
    exit when not exists (select 1 from public.game_users where player_id = v_id);
  end loop;
  return v_id;
end $$;

-- تسجيل لاعب جديد وإرجاع رقمه (ELM#). لو نفس الجهاز كرر الطلب يرجّع نفس الرقم.
create or replace function public.mw_register_player(
  p_secret text, p_id text, p_username text, p_name_ar text, p_avatar text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_hash text; v_link public.device_links%rowtype; v_pid text;
begin
  if coalesce(length(p_secret), 0) < 16 or coalesce(p_id, '') = '' then
    return jsonb_build_object('ok', false, 'error', 'INVALID');
  end if;
  v_hash := encode(sha256(convert_to(p_secret, 'utf8')), 'hex');

  select * into v_link from public.device_links where secret_hash = v_hash;
  if found then
    select player_id into v_pid from public.game_users where id = v_link.game_user_id;
    if v_pid is not null then
      return jsonb_build_object('ok', true, 'player_id', v_pid, 'id', v_link.game_user_id);
    end if;
  end if;

  if exists (select 1 from public.game_users where id = p_id) then
    return jsonb_build_object('ok', false, 'error', 'ID_TAKEN');
  end if;

  v_pid := public._next_player_id();
  insert into public.game_users (id, player_id, username, name_ar, avatar, status, last_active, updated_at)
  values (p_id, v_pid, left(p_username, 60), left(p_name_ar, 60), left(coalesce(p_avatar, ''), 40000), 'ONLINE', now(), now());
  insert into public.device_links (secret_hash, game_user_id) values (v_hash, p_id)
    on conflict (secret_hash) do update set game_user_id = excluded.game_user_id;
  return jsonb_build_object('ok', true, 'player_id', v_pid, 'id', p_id);
end $$;

-- مزامنة بيانات اللاعب (الاسم/الصورة/النتائج/النقاط/العناصر المجهزة) ليظهر في البحث والمتصدرين.
create or replace function public.mw_sync_profile(
  p_secret text, p_id text, p_player_id text, p_username text, p_name_ar text, p_avatar text,
  p_rating int default 1000, p_rank_tier text default 'برونزي',
  p_wins int default 0, p_losses int default 0, p_draws int default 0, p_games_played int default 0,
  p_points int default 0, p_favorite_club text default '', p_favorite_player text default '',
  p_bio text default '', p_equipped jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_hash text; v_gid text; v_other text; v_pid text; v_exists boolean;
begin
  if coalesce(length(p_secret), 0) < 16 or coalesce(p_id, '') = '' then
    return jsonb_build_object('ok', false, 'error', 'INVALID');
  end if;
  v_hash := encode(sha256(convert_to(p_secret, 'utf8')), 'hex');

  select game_user_id into v_gid from public.device_links where secret_hash = v_hash;
  if v_gid is not null and v_gid <> p_id then
    return jsonb_build_object('ok', false, 'error', 'PROFILE_MISMATCH');
  end if;
  select secret_hash into v_other from public.device_links where game_user_id = p_id and secret_hash <> v_hash;
  if v_other is not null then
    return jsonb_build_object('ok', false, 'error', 'PROFILE_TAKEN');
  end if;

  select player_id into v_pid from public.game_users where id = p_id;
  v_exists := v_pid is not null;
  -- رقم قديم بشكل مختلف (مش ELM + رقم متسلسل) → نعيد ترقيمه بالشكل الجديد.
  if v_exists and v_pid !~ '^ELM[0-9]+$' then
    v_pid := public._next_player_id();
    update public.game_users set player_id = v_pid where id = p_id;
  end if;

  if not v_exists then
    -- الرقم دايماً من السيرفر بالتسلسل (ELM1, ELM2...) — بنتجاهل أي رقم قديم/عشوائي جاي من الجهاز.
    v_pid := public._next_player_id();
    insert into public.game_users (id, player_id, username, name_ar, avatar, rating, rank_tier, status,
      wins, losses, draws, games_played, win_rate, points, favorite_club, favorite_player, bio, equipped, last_active, updated_at)
    values (p_id, v_pid, left(p_username, 60), left(p_name_ar, 60), left(coalesce(p_avatar, ''), 40000),
      greatest(p_rating, 0), p_rank_tier, 'ONLINE', greatest(p_wins, 0), greatest(p_losses, 0), greatest(p_draws, 0),
      greatest(p_games_played, 0),
      case when p_games_played > 0 then round(100.0 * p_wins / p_games_played)::int else 0 end,
      greatest(p_points, 0), left(coalesce(p_favorite_club, ''), 60), left(coalesce(p_favorite_player, ''), 60),
      left(coalesce(p_bio, ''), 300), coalesce(p_equipped, '{}'::jsonb), now(), now());
  else
    update public.game_users set
      username = left(p_username, 60), name_ar = left(p_name_ar, 60), avatar = left(coalesce(p_avatar, ''), 40000),
      rating = greatest(p_rating, 0), rank_tier = p_rank_tier, status = 'ONLINE',
      wins = greatest(p_wins, 0), losses = greatest(p_losses, 0), draws = greatest(p_draws, 0),
      games_played = greatest(p_games_played, 0),
      win_rate = case when p_games_played > 0 then round(100.0 * p_wins / p_games_played)::int else 0 end,
      points = greatest(p_points, 0), favorite_club = left(coalesce(p_favorite_club, ''), 60),
      favorite_player = left(coalesce(p_favorite_player, ''), 60), bio = left(coalesce(p_bio, ''), 300),
      equipped = coalesce(p_equipped, '{}'::jsonb), last_active = now(), updated_at = now()
    where id = p_id;
  end if;

  insert into public.device_links (secret_hash, game_user_id) values (v_hash, p_id) on conflict (secret_hash) do nothing;
  return jsonb_build_object('ok', true, 'player_id', v_pid);
end $$;

-- نبضة حضور خفيفة: بتخلي اللاعب "متصل الآن" (آخر نشاط خلال 3 دقايق).
create or replace function public.mw_heartbeat(p_secret text, p_id text) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_hash text;
begin
  if coalesce(length(p_secret), 0) < 16 then return false; end if;
  v_hash := encode(sha256(convert_to(p_secret, 'utf8')), 'hex');
  update public.game_users set status = 'ONLINE', last_active = now()
   where id = p_id and exists (select 1 from public.device_links where secret_hash = v_hash and game_user_id = p_id);
  return found;
end $$;

grant execute on function public.mw_register_player(text, text, text, text, text) to anon, authenticated;
grant execute on function public.mw_sync_profile(text, text, text, text, text, text, int, text, int, int, int, int, int, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.mw_heartbeat(text, text) to anon, authenticated;


-- ============================================================================
-- 2) السوق: عناصر بيضيفها الأدمن (شكل الصورة • شكل الاسم • الدخلة • أرضية التشكيلة)
-- ============================================================================
create table if not exists public.market_items (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('AVATAR_FRAME','NAME_FRAME','ENTRANCE','PITCH_SKIN')),
  name_ar text not null,
  price int not null default 0 check (price >= 0),
  image_url text not null,
  image_url_alt text,
  scale numeric not null default 1.3,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists market_items_cat_idx on public.market_items (category, sort_order);
alter table public.market_items enable row level security;
drop policy if exists "public read market" on public.market_items;
create policy "public read market" on public.market_items for select using (is_active = true or public.is_admin());
drop policy if exists "admin manage market" on public.market_items;
create policy "admin manage market" on public.market_items for all using (public.is_admin()) with check (public.is_admin());
grant select on public.market_items to anon, authenticated;
grant insert, update, delete on public.market_items to authenticated;

insert into storage.buckets (id, name, public) values ('market-items', 'market-items', true) on conflict (id) do nothing;
drop policy if exists "public read market files" on storage.objects;
create policy "public read market files" on storage.objects for select using (bucket_id = 'market-items');
drop policy if exists "admin upload market files" on storage.objects;
create policy "admin upload market files" on storage.objects for insert with check (bucket_id = 'market-items' and public.is_admin());
drop policy if exists "admin update market files" on storage.objects;
create policy "admin update market files" on storage.objects for update using (bucket_id = 'market-items' and public.is_admin());
drop policy if exists "admin delete market files" on storage.objects;
create policy "admin delete market files" on storage.objects for delete using (bucket_id = 'market-items' and public.is_admin());

do $$ begin
  alter publication supabase_realtime add table public.market_items;
exception when others then null; end $$;

-- ============================================================================
-- 3) المتصدرين: قراءة عامة آمنة (من غير بيانات حساسة) + فهرس
-- ============================================================================
create index if not exists game_users_rating_idx on public.game_users (rating desc, wins desc);
do $$ begin
  begin
    alter table public.game_users enable row level security;
  exception when others then null; end;
end $$;
drop policy if exists "mw public read players" on public.game_users;
create policy "mw public read players" on public.game_users for select using (true);
grant select on public.game_users to anon, authenticated;

-- ============================================================================
-- 4) البحث بالاسم/اللقب/الرقم يشتغل لكل اللاعبين
-- ============================================================================
create index if not exists game_users_player_id_idx on public.game_users (player_id);
create index if not exists game_users_username_trgm on public.game_users using gin (username gin_trgm_ops);
create index if not exists game_users_name_ar_trgm on public.game_users using gin (name_ar gin_trgm_ops);

-- ============================================================================
-- 5) الإشعارات الفورية (والتطبيق مقفول): توكنات الأجهزة + تريجر يستدعي دالة send-push
-- ============================================================================
create table if not exists public.device_tokens (
  token text primary key,
  game_user_id text not null,
  platform text not null default 'android',
  updated_at timestamptz not null default now()
);
create index if not exists device_tokens_user_idx on public.device_tokens (game_user_id);
alter table public.device_tokens enable row level security;  -- مقفول على العميل (يُكتب عبر الدالة فقط)

create or replace function public.mw_register_device_token(p_secret text, p_id text, p_token text, p_platform text default 'android')
returns boolean language plpgsql security definer set search_path = public as $$
declare v_hash text;
begin
  if coalesce(length(p_secret), 0) < 16 or coalesce(p_token, '') = '' then return false; end if;
  v_hash := encode(sha256(convert_to(p_secret, 'utf8')), 'hex');
  if not exists (select 1 from public.device_links where secret_hash = v_hash and game_user_id = p_id) then return false; end if;
  insert into public.device_tokens (token, game_user_id, platform, updated_at) values (p_token, p_id, p_platform, now())
  on conflict (token) do update set game_user_id = excluded.game_user_id, updated_at = now();
  return true;
end $$;
grant execute on function public.mw_register_device_token(text, text, text, text) to anon, authenticated;
