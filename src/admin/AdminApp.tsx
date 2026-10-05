import React, { useEffect, useState } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '../services/supabaseClient';
import { AdminLogin } from './AdminLogin';
import { AdminPlayersTab } from './AdminPlayersTab';
import { AdminGameImagesTab } from './AdminGameImagesTab';
import { AdminCoachesTab } from './AdminCoachesTab';
import { AdminMarketTab } from './AdminMarketTab';
import { ShieldCheck, LogOut, Users, ImageIcon, GraduationCap, ShoppingBag } from 'lucide-react';

export const AdminApp: React.FC = () => {
  const [checkingSession, setCheckingSession] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'players' | 'coaches' | 'images' | 'market'>('players');
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setCheckingSession(false);
      return;
    }
    client.auth.getSession().then(({ data }) => {
      if (data.session) {
        setLoggedIn(true);
        setAdminEmail(data.session.user.email || null);
      }
      setCheckingSession(false);
    });
  }, []);

  const handleLogout = async () => {
    const client = getSupabaseClient();
    if (client) await client.auth.signOut();
    setLoggedIn(false);
  };

  if (checkingSession) {
    return <div className="min-h-screen bg-zinc-950" />;
  }

  if (!loggedIn) {
    return (
      <AdminLogin
        onLoggedIn={() => {
          setLoggedIn(true);
          if (isSupabaseConfigured()) {
            const client = getSupabaseClient();
            client?.auth.getSession().then(({ data }) => setAdminEmail(data.session?.user.email || null));
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white relative" dir="rtl">
      <div
        className="fixed top-0 left-0 right-0 h-[2px] opacity-60 z-[60] pointer-events-none"
        style={{ background: 'var(--gradient-aurora)', backgroundSize: '220% 220%', animation: 'auroraDrift 12s ease infinite' }}
      />
      <header className="border-b border-zinc-900 bg-zinc-950/95 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-sm font-black">لوحة إدارة المواجهة</div>
              {adminEmail && <div className="text-[10px] text-zinc-500">{adminEmail}</div>}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-rose-500/40 text-xs font-bold text-zinc-300 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>خروج</span>
          </button>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center gap-2 pb-3">
          <button
            onClick={() => setActiveTab('players')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'players' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>بطاقات اللاعبين</span>
          </button>
          <button
            onClick={() => setActiveTab('coaches')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'coaches' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>صور المدربين</span>
          </button>
          <button
            onClick={() => setActiveTab('images')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'images' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>صور الألعاب</span>
          </button>
          <button
            onClick={() => setActiveTab('market')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'market' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>السوق</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'players' ? <AdminPlayersTab /> : activeTab === 'coaches' ? <AdminCoachesTab /> : activeTab === 'market' ? <AdminMarketTab /> : <AdminGameImagesTab />}
      </main>
    </div>
  );
};
