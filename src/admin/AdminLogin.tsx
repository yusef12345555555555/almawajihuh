import React, { useState } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '../services/supabaseClient';
import { ShieldCheck, Lock, Mail, AlertTriangle } from 'lucide-react';

interface AdminLoginProps {
  onLoggedIn: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoggedIn }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6" dir="rtl">
        <div className="max-w-md w-full bg-zinc-900 border border-amber-500/30 rounded-3xl p-8 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
          <h1 className="text-lg font-black text-white">لوحة الإدارة مش متصلة بقاعدة بيانات</h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            لازم تحط <code className="text-amber-400">VITE_SUPABASE_URL</code> و
            <code className="text-amber-400"> VITE_SUPABASE_ANON_KEY</code> في ملف <code>.env</code>، وتشغّل ملف{' '}
            <code className="text-amber-400">supabase/schema.sql</code> مرة واحدة في مشروع Supabase بتاعك.
          </p>
        </div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const client = getSupabaseClient();
    if (!client) {
      setError('تعذر الاتصال بالخادم.');
      setLoading(false);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    // لو الجهاز كان داخل كلاعب مجهول، نخرج الأول عشان الدخول بالإيميل يمسك صح
    try {
      await client.auth.signOut();
    } catch {
      /* ignore */
    }
    const { data, error: signInError } = await client.auth.signInWithPassword({ email: cleanEmail, password });
    if (signInError || !data.session) {
      const m = (signInError?.message || '').toLowerCase();
      let msg: string;
      if (m.includes('email not confirmed')) {
        msg = 'الإيميل ده لسه متأكدش في Supabase. شغّل supabase/ADMIN_FIX.sql (بيأكد الإيميل ويعمل الأدمن ويضبط الباسورد).';
      } else if (m.includes('invalid login credentials')) {
        msg = 'البريد أو كلمة المرور غلط (أو المستخدم مش موجود في Authentication → Users). لو متأكد منهم شغّل supabase/ADMIN_FIX.sql عشان يضبط الباسورد.';
      } else if (m.includes('rate limit') || m.includes('too many')) {
        msg = 'محاولات كتير — استنى دقيقة وجرّب تاني.';
      } else if (m.includes('failed to fetch') || m.includes('network')) {
        msg = 'مفيش اتصال بـ Supabase — اتأكد من النت ومن VITE_SUPABASE_URL في .env.';
      } else {
        msg = `تعذر الدخول: ${signInError?.message || 'سبب غير معروف'}`;
      }
      setError(msg);
      setLoading(false);
      return;
    }

    // Confirm this email is actually on the admin allow-list (RLS also
    // enforces this server-side — this is just a fast, friendly check).
    const { data: adminRow } = await client
      .from('admin_users')
      .select('email')
      .ilike('email', data.session.user.email || '')
      .maybeSingle();

    if (!adminRow) {
      await client.auth.signOut();
      setError('حسابك مش مسجل كأدمن. كلم مسؤول النظام يضيف إيميلك.');
      setLoading(false);
      return;
    }

    setLoading(false);
    onLoggedIn();
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6" dir="rtl">
      <form
        onSubmit={handleLogin}
        className="max-w-sm w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-5 shadow-2xl"
      >
        <div className="flex flex-col items-center gap-2 mb-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-amber-400" />
          </div>
          <h1 className="text-lg font-black text-white">لوحة إدارة المواجهة</h1>
          <p className="text-xs text-zinc-500">دخول أدمن فقط بالإيميل</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl p-3 text-center">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div className="relative">
            <Mail className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              placeholder="الإيميل"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pr-10 pl-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/60"
            />
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pr-10 pl-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/60"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 text-sm font-black transition-colors cursor-pointer"
        >
          {loading ? 'جاري الدخول...' : 'دخول'}
        </button>
      </form>
    </div>
  );
};
