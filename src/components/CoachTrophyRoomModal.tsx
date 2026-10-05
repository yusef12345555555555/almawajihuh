// ============================================================
// أنت المدرب | خزانة الكؤوس وتاريخ مسيرة المدرب (Trophy Room & Career History)
// ============================================================

import React, { useState } from 'react';
import { CoachTeam, TrophyCabinetItem, ManagerCareerRecord } from '../types/coachGameTypes';
import {
  Trophy,
  Award,
  Calendar,
  CheckCircle2,
  Flame,
  Star,
  Shield,
  TrendingUp,
  Percent,
  Layers
} from 'lucide-react';

interface CoachTrophyRoomModalProps {
  userTeam: CoachTeam;
  managerName: string;
  trophiesWon: TrophyCabinetItem[];
  careerRecord: ManagerCareerRecord;
  onClose: () => void;
}

export const CoachTrophyRoomModal: React.FC<CoachTrophyRoomModalProps> = ({
  userTeam,
  managerName,
  trophiesWon,
  careerRecord,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'CABINET' | 'STATS' | 'HISTORY'>('CABINET');

  const winRate =
    careerRecord.matches > 0
      ? Math.round((careerRecord.wins / careerRecord.matches) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full p-6 md:p-8 space-y-6 shadow-2xl animate-fadeIn my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">خزانة الألقاب ومسيرة المدرب الفني</h2>
              <p className="text-xs text-slate-400">
                المدير الفني: <span className="text-amber-300 font-bold">{managerName}</span> • النادي الحالي: {userTeam.nameAr}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 text-sm font-semibold"
          >
            إغلاق
          </button>
        </div>

        {/* Top Key Career Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 shrink-0">
          <div>
            <div className="text-xs text-slate-400">إجمالي الألقاب المحققة</div>
            <div className="text-2xl font-black text-amber-400 flex items-center gap-1.5">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>{trophiesWon.length} كؤوس</span>
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400">نسبة الانتصارات</div>
            <div className="text-2xl font-black text-emerald-400 flex items-center gap-1">
              <span>{winRate}%</span>
              <span className="text-xs font-normal text-slate-400">({careerRecord.wins} فوز)</span>
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400">إجمالي المباريات الملعوبة</div>
            <div className="text-2xl font-black text-blue-400">{careerRecord.matches} مباراة</div>
          </div>

          <div>
            <div className="text-xs text-slate-400">سمعة المدرب التدريبية</div>
            <div className="text-2xl font-black text-purple-400 flex items-center gap-1">
              <span>{careerRecord.reputation || 88}</span>
              <span className="text-xs text-slate-400">/ 100</span>
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 shrink-0">
          <button
            onClick={() => setActiveTab('CABINET')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'CABINET'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>خزانة الكؤوس الذهبية ({trophiesWon.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('STATS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'STATS'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>إحصائيات وسجل المباريات</span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'HISTORY'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>سجل المواسم السابقة</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {activeTab === 'CABINET' && (
            <div>
              {trophiesWon.length === 0 ? (
                <div className="text-center py-12 space-y-3 bg-slate-800/30 rounded-3xl border border-dashed border-slate-700">
                  <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                    <Trophy className="w-8 h-8" />
                  </div>
                  <div className="text-sm font-bold text-slate-300">خزانة الألقاب بانتظار أول تتويج لك!</div>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    قد فريقك للظفر بالدوري أو دوري أبطال أوروبا أو كأس العالم أو أمم إفريقيا لتزين دي الخزانة بالكؤوس التاريخية.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {trophiesWon.map((t, idx) => (
                    <div
                      key={t.id || idx}
                      className="bg-gradient-to-b from-slate-800/90 to-slate-900 p-5 rounded-2xl border border-amber-500/30 text-center space-y-3 shadow-xl hover:border-amber-400/60 transition group"
                    >
                      <div className="text-4xl filter drop-shadow-[0_0_12px_rgba(251,191,36,0.3)]">
                        {t.trophyIcon || '🏆'}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white group-hover:text-amber-300 transition">
                          {t.competitionNameAr}
                        </h4>
                        <div className="text-xs text-amber-400 font-semibold mt-0.5">{t.season}</div>
                        <div className="text-[11px] text-slate-400 mt-1">مع: {t.teamNameAr}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'STATS' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/60 space-y-3">
                <h4 className="text-sm font-bold text-white border-b border-slate-700 pb-2">نتائج المباريات</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">إجمالي الانتصارات (Wins):</span>
                    <span className="font-bold text-emerald-400">{careerRecord.wins}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">إجمالي التعادلات (Draws):</span>
                    <span className="font-bold text-slate-300">{careerRecord.draws}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">إجمالي الهزائم (Losses):</span>
                    <span className="font-bold text-red-400">{careerRecord.losses}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-400">نسبة الفوز الإجمالية:</span>
                    <span className="font-bold text-amber-300">{winRate}%</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/60 space-y-3">
                <h4 className="text-sm font-bold text-white border-b border-slate-700 pb-2">السجل التهديفي</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">الأهداف المسجلة (Scored):</span>
                    <span className="font-bold text-emerald-400">{careerRecord.goalsScored || 0}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">الأهداف المستقبلة (Conceded):</span>
                    <span className="font-bold text-red-400">{careerRecord.goalsConceded || 0}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-400">فارق الأهداف (Goal Difference):</span>
                    <span className="font-bold text-blue-400">
                      {(careerRecord.goalsScored || 0) - (careerRecord.goalsConceded || 0) > 0 ? '+' : ''}
                      {(careerRecord.goalsScored || 0) - (careerRecord.goalsConceded || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'HISTORY' && (
            <div className="space-y-3">
              {careerRecord.history && careerRecord.history.length > 0 ? (
                careerRecord.history.map((h, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm font-bold text-white">{h.teamNameAr}</div>
                      <div className="text-xs text-slate-400">{h.years}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-amber-400">{h.trophiesCount} ألقاب</div>
                      <div className="text-[10px] text-slate-400">{h.matches} مباراة</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-slate-800/40 p-6 rounded-2xl text-center text-xs text-slate-400 border border-slate-700/50">
                  أنت تدير موسمك الأول حالياً مع {userTeam.nameAr}. ستسجل إنجازات ده الموسم هنا فور نهايته.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
