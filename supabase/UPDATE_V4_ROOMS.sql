-- ============================================================================
-- المواجهة | تحديث V4 — غرف اللعب مع الصحاب + الدعوات اللحظية
-- شغّله مرة واحدة في Supabase → SQL Editor → New query → Run. (آمن لو اتشغّل أكتر من مرة)
-- لازم تكون شغّلت SUPABASE_SETUP.sql و UPDATE_V3_MWAJHA.sql قبله.
-- ============================================================================

-- 1) أعمدة الغرفة: إعدادات (خماسي/11 + كروت)، لاعب الضيف، جاهزية الاتنين، وقت الانتهاء
alter table public.match_invites add column if not exists settings jsonb not null default '{}'::jsonb;
alter table public.match_invites add column if not exists recipient_snapshot jsonb;
alter table public.match_invites add column if not exists sender_ready boolean not null default false;
alter table public.match_invites add column if not exists recipient_ready boolean not null default false;
alter table public.match_invites add column if not exists expires_at timestamptz;
alter table public.match_invites add column if not exists code text;
create unique index if not exists match_invites_code_uidx on public.match_invites (code) where code is not null;

-- 2) حالات إضافية: CANCELLED (اتلغت/طلع) و STARTED (الماتش بدأ)
alter table public.match_invites drop constraint if exists match_invites_status_check;
alter table public.match_invites add constraint match_invites_status_check
  check (status in ('PENDING','ACCEPTED','DECLINED','EXPIRED','CANCELLED','STARTED'));

-- 3) التحديث اللحظي (Realtime): ده اللي كان ناقص — من غيره الدعوة مكانتش بتوصل لحظياً
do $$
declare t text;
begin
  foreach t in array array['match_invites','matchmaking_queue','friend_requests','direct_messages','notifications']
  loop
    if to_regclass('public.' || t) is not null then
      begin
        execute format('alter publication supabase_realtime add table public.%I', t);
      exception when duplicate_object then null; end;
      execute format('alter table public.%I replica identity full', t);
    end if;
  end loop;
end $$;

create index if not exists match_invites_expires_idx on public.match_invites (expires_at);
