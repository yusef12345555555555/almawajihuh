// ============================================================
// أنت المدرب | تقرير كشاف الخصم والتحضير التكتيكي قبل المباراة
// ============================================================

import React from 'react';
import { CoachTeam, CoachSquadPlayer } from '../types/coachGameTypes';
import {
  Shield,
  Target,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  CloudRain,
  Sun,
  Wind,
  Snowflake,
  Play,
  Sliders,
  Users
} from 'lucide-react';

interface PreMatchScoutingModalProps {
  userTeam: CoachTeam;
  opponentTeam: CoachTeam;
  isHomeMatch: boolean;
  matchday: number;
  opponentPositionRank: number;
  onOpenTactics: () => void;
  onKickoff: () => void;
  onClose: () => void;
}

export const PreMatchScoutingModal: React.FC<PreMatchScoutingModalProps> = ({
  userTeam,
  opponentTeam,
  isHomeMatch,
  matchday,
  opponentPositionRank,
  onOpenTactics,
  onKickoff,
  onClose
}) => {
  const opponentStarters = opponentTeam.squad.filter((p) => opponentTeam.startingXI.includes(p.id));
  const oppStar = [...opponentTeam.squad].sort((a, b) => b.rating - a.rating)[0];

  // Dynamic Probabilities based on team ratings & home advantage
  const homeAdv = isHomeMatch ? 4 : -4;
  const ratingDiff = userTeam.overallRating + homeAdv - opponentTeam.overallRating;

  let winProb = Math.min(84, Math.max(12, Math.round(44 + ratingDiff * 3.5)));
  let lossProb = Math.min(80, Math.max(10, Math.round(32 - ratingDiff * 3)));
  let drawProb = 100 - winProb - lossProb;
  if (drawProb < 10) {
    drawProb = 14;
    winProb -= 2;
    lossProb -= 2;
  }

  // Weather simulation
  const weatherTypes = [
    { name: 'أجواء صافية ومثالية للعب', icon: <Sun className="w-4 h-4 text-amber-400" /> },
    { name: 'أمطار خفيفة وسطح مبلل (كرة أسرع)', icon: <CloudRain className="w-4 h-4 text-blue-400" /> },
    { name: 'رياح متوسطة (تؤثر على الكرات العرضية)', icon: <Wind className="w-4 h-4 text-slate-300" /> }
  ];
  const weather = weatherTypes[matchday % weatherTypes.length];

  // Strengths & Weaknesses
  const oppStrengths = [
    opponentTeam.attackRating >= 85
      ? 'خط هجوم ناري يتميز بالسرعة والإنهاء الدقيق للفرص'
      : 'انضباط دفاعي صارم وتضييق للمساحات في الثلث الأخير',
    `إجادة أسلوب (${opponentTeam.playingStyle}) والتحولات المنظمة`
  ];

  const oppWeaknesses = [
    opponentTeam.defenseRating < userTeam.attackRating
      ? 'مساحات شاغرة خلف الأظهرة يمكن استغلالها بالكرات السريعة'
      : 'عرضة لارتكاب الأخطاء تحت الضغط العالي المتقدم',
    'البطء في الارتداد الدفاعي عند فقدان الكرة في منتصف الملعب'
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full p-6 md:p-8 space-y-6 shadow-2xl animate-fadeIn my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">تقرير الاستكشاف والتحضير للمباراة</h2>
              <p className="text-xs text-slate-400">
                الجولة {matchday} • {isHomeMatch ? 'على أرضنا ووسط جماهيرنا' : `خارج الديار في (${opponentTeam.stadiumName})`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-3 py-1 rounded-lg bg-slate-800 text-xs font-semibold"
          >
            إغلاق
          </button>
        </div>

        {/* Head to Head Card */}
        <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700/60 shrink-0">
          <div className="flex items-center justify-between gap-4">
            {/* User Team */}
            <div className="text-center flex-1 space-y-2">
              <div
                className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center font-black text-lg shadow-lg border"
                style={{
                  backgroundColor: userTeam.primaryColor,
                  color: userTeam.secondaryColor,
                  borderColor: `${userTeam.secondaryColor}44`
                }}
              >
                {userTeam.shortName}
              </div>
              <div>
                <div className="text-sm font-black text-white">{userTeam.nameAr}</div>
                <div className="text-xs text-emerald-400 font-semibold">تقييم: {userTeam.overallRating}</div>
              </div>
            </div>

            {/* VS & Weather */}
            <div className="text-center space-y-2 px-2 shrink-0">
              <div className="text-xs font-bold px-3 py-1 rounded-full bg-slate-900 text-amber-400 border border-slate-700">
                VS
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 justify-center">
                {weather.icon}
                <span>{weather.name}</span>
              </div>
            </div>

            {/* Opponent Team */}
            <div className="text-center flex-1 space-y-2">
              <div
                className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center font-black text-lg shadow-lg border"
                style={{
                  backgroundColor: opponentTeam.primaryColor,
                  color: opponentTeam.secondaryColor,
                  borderColor: `${opponentTeam.secondaryColor}44`
                }}
              >
                {opponentTeam.shortName}
              </div>
              <div>
                <div className="text-sm font-black text-white">{opponentTeam.nameAr}</div>
                <div className="text-xs text-blue-400 font-semibold">تقييم: {opponentTeam.overallRating}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tactical Probabilities Bar */}
        <div className="space-y-2 shrink-0">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-emerald-400">احتمال فوزك: {winProb}%</span>
            <span className="text-slate-400">التعادل: {drawProb}%</span>
            <span className="text-red-400">احتمال فوز الخصم: {lossProb}%</span>
          </div>

          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex border border-slate-700/60">
            <div style={{ width: `${winProb}%` }} className="bg-emerald-500 h-full" />
            <div style={{ width: `${drawProb}%` }} className="bg-slate-500 h-full" />
            <div style={{ width: `${lossProb}%` }} className="bg-red-500 h-full" />
          </div>
        </div>

        {/* Opponent Scouting Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto pr-1">
          {/* Tactical Profile */}
          <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/50 space-y-3">
            <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5 border-b border-slate-700/60 pb-2">
              <Target className="w-4 h-4 text-amber-400" />
              <span>الهوية التكتيكية للخصم</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">المدير الفني:</span>
                <span className="font-semibold text-white">{opponentTeam.currentManager.nameAr}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">الرسم التكتيكي:</span>
                <span className="font-semibold text-white">{opponentTeam.formation}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">أسلوب اللعب المعتمد:</span>
                <span className="font-semibold text-amber-300">{opponentTeam.playingStyle}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">مركزهم في الجدول:</span>
                <span className="font-semibold text-blue-400">المركز {opponentPositionRank || 'المتقدم'}</span>
              </div>
              {oppStar && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">أخطر لاعب:</span>
                  <span className="font-bold text-red-400">
                    {oppStar.nameAr} ({oppStar.position} • {oppStar.rating})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/50 space-y-3">
            <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5 border-b border-slate-700/60 pb-2">
              <AlertTriangle className="w-4 h-4 text-blue-400" />
              <span>نقاط القوة والثغرات الدفاعية</span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-emerald-400 font-bold block mb-1">نقاط القوة:</span>
                {oppStrengths.map((s, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-slate-300 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <span className="text-red-400 font-bold block mb-1">ثغرات يمكن استغلالها:</span>
                {oppWeaknesses.map((w, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-slate-300 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800 shrink-0">
          <button
            onClick={onOpenTactics}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition"
          >
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>ضبط التشكيل والتعليمات (Tactics Board)</span>
          </button>

          <button
            onClick={onKickoff}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-sm shadow-xl shadow-emerald-900/30 flex items-center justify-center gap-2.5 hover:scale-[1.02] active:scale-[0.98] transition"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>بدء المباراة وصافرة الانطلاق (KICKOFF)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
