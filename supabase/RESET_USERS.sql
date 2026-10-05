-- ============================================================================
-- المواجهة | مسح كل اللاعبين والبدء من جديد (نسخة مصلّحة)
-- ✅ بيمسح: اللاعبين، حسابات الدخول المجهولة، الأصدقاء، الرسائل، الإشعارات، الغرف، الدعوات، المباريات.
-- 🔒 مبيمسحش أبداً: الكروت والصور اللي ضفتها (players, player_assets, pool_items, game_images)،
--    المدربين (coaches)، السوق (market_items)، الألعاب (games)، والأدمن (admin_users + حساباتهم).
-- شغّله مرة واحدة: Supabase → SQL Editor → Run. هيطبع جدول فيه العدد قبل/بعد.
-- بعد التشغيل: كل جهاز بيمسح بياناته المحلية تلقائياً أول ما يفتح التطبيق (محتاج النسخة الجديدة من التطبيق)،
-- وأول لاعب جديد بياخد ELM1 وبعده ELM2 ... بالتسلسل.
-- ============================================================================

create temp table _reset_before as
select (select count(*) from public.game_users) as users_before,
       (select count(*) from auth.users where is_anonymous) as anon_before;

do $$
declare t text;
begin
  foreach t in array array[
    'match_actions','match_bids','match_wallets','match_private','match_secrets','match_players','matches',
    'room_join_attempts','room_invites','room_members','rooms',
    'match_invites','matchmaking_queue',
    'notification_preferences','player_devices','device_tokens','notifications',
    'direct_messages','friend_requests',
    'profile_links','device_links','game_users'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('truncate table public.%I restart identity cascade', t);
    end if;
  end loop;
end $$;

-- حسابات اللاعبين المجهولة في Authentication (بتظهر في Authentication → Users). حسابات الأدمن (إيميل) مبتتمسحش.
delete from auth.users where coalesce(is_anonymous, false) = true;

-- الترقيم يبدأ من ELM1
do $$
begin
  if to_regclass('public.player_id_seq') is not null then
    perform setval('public.player_id_seq', 1, false);
  end if;
end $$;

-- «رقم الإعادة»: كل جهاز يقارن به ويمسح بياناته المحلية (البروفايل القديم، الـ ID القديم...) مرة واحدة
create table if not exists public.app_meta (key text primary key, value text not null, updated_at timestamptz not null default now());
alter table public.app_meta enable row level security;
drop policy if exists "public read app_meta" on public.app_meta;
create policy "public read app_meta" on public.app_meta for select using (true);
grant select on public.app_meta to anon, authenticated;
insert into public.app_meta (key, value) values ('reset_epoch', to_char(now(), 'YYYYMMDDHH24MISS'))
on conflict (key) do update set value = excluded.value, updated_at = now();

select b.users_before,
       (select count(*) from public.game_users) as users_after,
       b.anon_before,
       (select count(*) from auth.users where is_anonymous) as anon_after,
       (select count(*) from public.players) as cards_kept,
       (select count(*) from public.player_assets) as card_images_kept
from _reset_before b;
