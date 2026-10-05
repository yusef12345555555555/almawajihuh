-- ============================================================================
-- المواجهة | إصلاح دخول لوحة الإدارة (/admin)
-- افتح Supabase → SQL Editor → غيّر السطرين اللي تحت (الإيميل والباسورد) → Run.
-- بيعمل 3 حاجات مرة واحدة:
--   1) يعمل المستخدم لو مش موجود، أو يضبط له الباسورد الجديد لو موجود
--   2) يأكد الإيميل (السبب الأشهر لرسالة "كلمة السر غلط")
--   3) يضيفه في قائمة الأدمن admin_users
-- بعدها ادخل على /admin بنفس الإيميل والباسورد دول.
-- ============================================================================
create extension if not exists pgcrypto;

do $$
declare
  v_email text := lower(trim('PUT_YOUR_EMAIL_HERE@example.com'));   -- ← غيّر الإيميل
  v_pass  text := 'PUT_A_STRONG_PASSWORD_HERE';                      -- ← غيّر الباسورد (8 حروف أو أكتر)
  v_uid   uuid;
begin
  select id into v_uid from auth.users where lower(email) = v_email limit 1;

  if v_uid is null then
    v_uid := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_email,
      crypt(v_pass, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
      '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_uid, v_uid::text,
            jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
            'email', now(), now(), now());
  else
    update auth.users
       set encrypted_password = crypt(v_pass, gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           updated_at = now()
     where id = v_uid;
  end if;

  insert into public.admin_users (email) values (v_email) on conflict do nothing;
end $$;

-- تأكيد: لازم يرجّع صف واحد فيه confirmed = true و is_admin = true
select u.email,
       (u.email_confirmed_at is not null) as confirmed,
       exists (select 1 from public.admin_users a where lower(a.email) = lower(u.email)) as is_admin
from auth.users u
where lower(u.email) = lower(trim('PUT_YOUR_EMAIL_HERE@example.com'));
