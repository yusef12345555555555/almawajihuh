// ============================================================
// العبها صح | EL3BHA SA7 - من نحن (About)
// ============================================================

import React from 'react';
import { ChevronRight, Swords, Users, Trophy, ShieldCheck } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface AboutViewProps {
  onBack: () => void;
}

const PILLARS = [
  { icon: Swords, title: 'منافسة حقيقية', text: 'كل مباراة نتيجتها مش متوقعة — التكتيك والتشكيل بيغيّروا اللعبة.' },
  { icon: Trophy, title: 'مسار احترافي', text: 'من المزاد لـ"أنت المدرب" للبطولات — تجربة لاعب كاملة.' },
  { icon: Users, title: 'مجتمع كروي', text: 'ابحث عن أصدقائك بالاسم أو اللقب أو الـ Player ID والعبوا سوا.' },
  { icon: ShieldCheck, title: 'من غير تعقيد', text: 'مفيش إيميل ولا باسورد — هويتك جاهزة في ثواني.' }
];

export const AboutView: React.FC<AboutViewProps> = ({ onBack }) => {
  return (
    <div dir="rtl" className="max-w-3xl mx-auto space-y-6 select-none">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-amber-400 transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
        رجوع
      </button>

      <div className="relative rounded-3xl border border-amber-500/20 bg-gradient-to-b from-zinc-900 to-zinc-950 p-8 text-center overflow-hidden">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="relative flex justify-center mb-4">
          <BrandLogo variant="icon" size="lg" />
        </div>
        <h1 className="relative text-2xl font-black text-white mb-2">من نحن</h1>
        <p className="relative text-sm text-zinc-400 leading-relaxed max-w-xl mx-auto">
          مزادات، محاكاة مباريات، وتجربة "أنت المدرب" — عشان تحس إنك بتلعب مش بتستخدم تطبيق.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PILLARS.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.title} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400 mb-3">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-white mb-1">{p.title}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">{p.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
