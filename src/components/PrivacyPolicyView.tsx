// ============================================================
// العبها صح | EL3BHA SA7 - سياسة الخصوصية (Privacy Policy)
// ============================================================

import React from 'react';
import { ChevronRight, Lock } from 'lucide-react';

interface PrivacyPolicyViewProps {
  onBack: () => void;
}

const SECTIONS = [
  {
    title: 'البيانات اللي بنحتفظ بيها',
    text: 'الاسم واللقب والصورة اللي اخترتها فقط (رفعتها أو من الأفاتارات الجاهزة) — عشان لاعبين تانيين يقدروا يلاقوك ويضيفوك كصديق.'
  },
  {
    title: 'مفيش تسجيل دخول تقليدي',
    text: 'مفيش إيميل ولا رقم تليفون ولا باسورد بيتسجل — هويتك محلية على جهازك ومربوطة بمعرف لاعب (Player ID) بس.'
  },
  {
    title: 'ظهورك في البحث',
    text: 'اسمك ولقبك ومعرفك بيظهروا في نتائج البحث للاعبين التانيين عشان تقدر تضيف أصدقاء — زي أي دليل لاعبين عادي داخل لعبة.'
  },
  {
    title: 'الإشعارات',
    text: 'بنستخدمها بس عشان نبلغك بنتيجة مباراة أو طلب صداقة أو حدث داخل اللعبة — مفيش إعلانات ولا رسائل تسويقية.'
  },
  {
    title: 'التحكم في بياناتك',
    text: 'تقدر تغيّر اسمك أو صورتك في أي وقت من إعداداتك، والبيانات بتتحدث فورًا.'
  }
];

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({ onBack }) => {
  return (
    <div dir="rtl" className="max-w-3xl mx-auto space-y-6 select-none">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-amber-400 transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
        رجوع
      </button>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">سياسة الخصوصية</h1>
            <p className="text-xs text-zinc-500">آخر تحديث: 2026</p>
          </div>
        </div>

        <div className="space-y-5">
          {SECTIONS.map((s) => (
            <div key={s.title} className="border-r-2 border-amber-500/40 pr-4">
              <h3 className="text-sm font-black text-white mb-1">{s.title}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
