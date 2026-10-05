// ============================================================
// أنت المدرب | نافذة تأكيد الاستقالة (Resignation Confirmation)
//
// This modal is ONLY triggered by the explicit "استقالة" action.
// It must never be triggered by Back / Home / Exit / Refresh.
// ============================================================

import React from 'react';
import { AlertTriangle, DoorOpen, X } from 'lucide-react';

interface ResignationModalProps {
  teamNameAr: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ResignationModal: React.FC<ResignationModalProps> = ({ teamNameAr, onCancel, onConfirm }) => {
  return (
    <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-rose-500/40 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">متأكد إنك عايز تقدم استقالتك؟</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-zinc-400 leading-relaxed">
          هتستقيل من تدريب <span className="text-white font-bold">{teamNameAr}</span> دلوقتي.
        </p>

        <ul className="space-y-2 text-xs text-zinc-400 bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4 leading-relaxed">
          <li>• هتسيب النادي/المنتخب وتخلص مهمتك الحالية على طول.</li>
          <li>• تقدمك في الوظيفة دي هيقف هنا.</li>
          <li>• نقاط اللعبة الحالية هتتصفر أو تتخصم حسب قواعد اللعبة.</li>
          <li>• هتقدر تبدأ مهمة تدريبية جديدة على طول بعد الاستقالة.</li>
          <li className="text-emerald-400/90">• سيرتك كمدرب (المباريات، الانتصارات، الأهداف، البطولات) مش هتتمسح خالص وهتفضل محفوظة.</li>
        </ul>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-black transition-colors cursor-pointer"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-black transition-colors cursor-pointer shadow-lg shadow-rose-900/40"
          >
            <DoorOpen className="w-4 h-4" />
            <span>تأكيد الاستقالة</span>
          </button>
        </div>
      </div>
    </div>
  );
};
