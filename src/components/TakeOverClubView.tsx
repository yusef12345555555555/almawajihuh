// ============================================================
// أنت المدرب | شاشة تولي تدريب النادي (Take Over Club)
// ============================================================

import React, { useState } from 'react';
import { CoachTeam, CoachSquadPlayer, CoachGameplayMode, AIDifficulty } from '../types/coachGameTypes';
import {
  Shield,
  Trophy,
  Users,
  Coins,
  ArrowRight,
  TrendingUp,
  Award,
  Calendar,
  Zap,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Bot,
  UserCheck,
  Sparkles
} from 'lucide-react';

interface TakeOverClubViewProps {
  team: CoachTeam;
  competitionTitleAr: string;
  onConfirmTakeover: (team: CoachTeam, mode?: CoachGameplayMode, difficulty?: AIDifficulty) => void;
  onBack: () => void;
}

export const TakeOverClubView: React.FC<TakeOverClubViewProps> = ({
  team,
  competitionTitleAr,
  onConfirmTakeover,
  onBack
}) => {
  const [opponentChoice, setOpponentChoice] = useState<'AI' | 'REAL'>('AI');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('NORMAL');

  const starters = team.squad.filter((p) => team.startingXI.includes(p.id));
  const starPlayer = [...team.squad].sort((a, b) => b.rating - a.rating)[0];
  const captain = team.squad.find((p) => p.id === team.captainId) || starters[1] || starters[0];

  const avgAge = Math.round(
    team.squad.reduce((sum, p) => sum + p.age, 0) / (team.squad.length || 1)
  );

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-xl border border-slate-700/60 transition"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          <span>العودة لاختيار نادٍ آخر</span>
        </button>

        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Shield className="w-3.5 h-3.5" />
          <span>مرحلة التعاقد الرسمي وتولي الإدارة الفنية</span>
        </div>
      </div>

      {/* Main Club Banner Card */}
      <div
        className="relative overflow-hidden rounded-3xl border border-slate-700/80 p-6 md:p-8 shadow-2xl"
        style={{
          background: `linear-gradient(135deg, ${team.primaryColor}22 0%, #0f172a 60%, ${team.secondaryColor}15 100%)`
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div
              className="w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl border-2"
              style={{
                backgroundColor: team.primaryColor,
                color: team.secondaryColor,
                borderColor: `${team.secondaryColor}66`
              }}
            >
              {team.shortName}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-black text-white">{team.nameAr}</h1>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  {team.name}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  {team.stadiumName}
                </span>
                <span className="flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-blue-400" />
                  {competitionTitleAr}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  {team.squad.length} لاعباً في القائمة
                </span>
              </div>
            </div>
          </div>

          {/* Quick Ratings */}
          <div className="flex items-center gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-700/60 backdrop-blur-sm self-stretch md:self-auto justify-around">
            <div className="text-center px-3">
              <div className="text-xs text-slate-400">القوة العامة</div>
              <div className="text-2xl font-black text-amber-400">{team.overallRating}</div>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-center px-3">
              <div className="text-xs text-slate-400">الهجوم</div>
              <div className="text-xl font-bold text-red-400">{team.attackRating}</div>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-center px-3">
              <div className="text-xs text-slate-400">الوسط</div>
              <div className="text-xl font-bold text-emerald-400">{team.midfieldRating}</div>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-center px-3">
              <div className="text-xs text-slate-400">الدفاع</div>
              <div className="text-xl font-bold text-blue-400">{team.defenseRating}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Key Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. Board Expectations & Objectives */}
        <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Award className="w-4 h-4" />
              <span>أهداف وتطلعات مجلس الإدارة</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-300">
              ثقة الإدارة: {team.boardConfidence || 85}%
            </span>
          </div>

          <div className="space-y-3">
            <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/50">
              <div className="text-xs font-semibold text-slate-400 mb-1">الهدف في الدوري / البطولة</div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{team.boardExpectations?.leagueObjectiveAr || 'المنافسة على اللقب'}</span>
              </div>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/50">
              <div className="text-xs font-semibold text-slate-400 mb-1">الهدف في الكؤوس والمسابقات</div>
              <div className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span>{team.boardExpectations?.cupObjectiveAr || 'الوصول لأدوار متقدمة'}</span>
              </div>
            </div>

            <div className="text-xs text-slate-400 leading-relaxed pt-1">
              * نتائجك وأسلوب لعبك يؤثران مباشرة في مقياس ثقة الإدارة والجماهير. تجنب الهزائم المتتالية لتفادي خطر الإقالة.
            </div>
          </div>
        </div>

        {/* 2. Budget & Financial Power */}
        <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <Coins className="w-4 h-4" />
              <span>الميزانية والقدرة المالية</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-semibold">
              سوق الانتقالات
            </span>
          </div>

          <div className="space-y-3">
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">ميزانية التعاقدات والشراء</div>
                <div className="text-2xl font-black text-emerald-400">
                  {team.budget?.transfer ? `€${team.budget.transfer}M` : 'غير متاح (منتخب)'}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">سقف الرواتب الأسبوعية</div>
                <div className="text-xl font-bold text-slate-200">
                  {team.budget?.wage ? `€${team.budget.wage}K / أسبوع` : 'مكافآت وطنية'}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="text-xs text-slate-400 leading-relaxed pt-1">
              * تقدر استخدام الميزانية للتعاقد مع لاعبين جدد وتدعيم التشكيلة أو بيع اللاعبين لزيادة رصيد النادي.
            </div>
          </div>
        </div>

        {/* 3. Squad & Managerial Foundation */}
        <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
              <Shield className="w-4 h-4" />
              <span>المدرب الحالي وقوام الفريق</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-300">
              خطة {team.formation}
            </span>
          </div>

          <div className="space-y-3">
            <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/50 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-slate-700 flex items-center justify-center font-bold text-amber-300 border border-amber-500/30">
                {team.currentManager.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-xs text-slate-400">المدرب الحالي المستبدَل</div>
                <div className="text-sm font-bold text-white">{team.currentManager.nameAr}</div>
                <div className="text-xs text-slate-400">
                  {team.currentManager.nationalityAr} • أسلوب: {team.playingStyle}
                </div>
              </div>
            </div>

            {starPlayer && (
              <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/50 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">نجم الفريق الأبرز</div>
                  <div className="text-sm font-bold text-amber-300">{starPlayer.nameAr}</div>
                  <div className="text-xs text-slate-400">
                    {starPlayer.position} • {starPlayer.age} سنة • تقييم {starPlayer.rating}
                  </div>
                </div>
                <div className="text-xl font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                  {starPlayer.rating}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-400 px-1 pt-1">
              <span>القائد: {captain?.nameAr || 'غير محدد'}</span>
              <span>متوسط الأعمار: {avgAge} سنة</span>
            </div>
          </div>
        </div>
      </div>

      {/* Starting XI Preview Pitch Strip */}
      <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>التشكيلة الأساسية الافتراضية ({team.startingXI.length} لاعباً)</span>
          </div>
          <span className="text-xs text-slate-400">
            تقدر تعديل التشكيلة والتبديل والتكتيك بحرية كاملة بعد تولي المسؤولية
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-2">
          {starters.slice(0, 11).map((p) => (
            <div
              key={p.id}
              className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700 flex items-center justify-between"
            >
              <div className="truncate pr-1">
                <div className="text-xs font-bold text-white truncate">{p.nameAr}</div>
                <div className="text-[10px] text-slate-400">{p.position}</div>
              </div>
              <span className="text-xs font-extrabold text-amber-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                {p.rating}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* STEP 3 & STEP 4: Choose Opponent Type & AI Difficulty */}
      <div className="bg-slate-900/90 rounded-3xl p-6 md:p-8 border border-slate-800 shadow-xl space-y-6">
        <div className="space-y-1">
          <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>الخطوة 3: تحديد نظام المنافسين</span>
          </div>
          <h3 className="text-xl font-black text-white">
            أنت دلوقتي مدرب {team.nameAr} .. عايز تلعب ضد مين؟
          </h3>
          <p className="text-xs text-slate-400">
            حدد ما إذا كنت ترغب في محاكاة تكتيكية متطورة ضد الذكاء الاصطناعي، أو التنافس الحي ضد لاعبين حقيقيين.
          </p>
        </div>

        {/* 2 Main Choices: AI vs Real Players */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setOpponentChoice('AI')}
            className={`text-right p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 ${
              opponentChoice === 'AI'
                ? 'bg-amber-500/10 border-amber-400 shadow-lg shadow-amber-500/10'
                : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                opponentChoice === 'AI'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-black text-white">الذكاء الاصطناعي (AI)</h4>
                {opponentChoice === 'AI' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                    محدد
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                محاكاة تكتيكية متقدمة تحسب قرارات كل مدرب، إيقاع الضغط، والإرهاق بدقة واقعية.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setOpponentChoice('REAL')}
            className={`text-right p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 ${
              opponentChoice === 'REAL'
                ? 'bg-emerald-500/10 border-emerald-400 shadow-lg shadow-emerald-500/10'
                : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                opponentChoice === 'REAL'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-black text-white">لاعبين حقيقيين (Real Players)</h4>
                {opponentChoice === 'REAL' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950">
                    محدد
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                غرفة متعددة اللاعبين تتنافس فيها ضد أصدقائك ومدربين حقيقيين من المنصة.
              </p>
            </div>
          </button>
        </div>

        {/* STEP 4: If AI -> Select Difficulty */}
        {opponentChoice === 'AI' && (
          <div className="pt-2 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">
                اختار مستوى الذكاء (AI Difficulty):
              </span>
              <span className="text-[11px] text-amber-400 font-bold">
                المستوى الحالي: {
                  aiDifficulty === 'EASY' ? 'سهل' :
                  aiDifficulty === 'NORMAL' ? 'عادي' :
                  aiDifficulty === 'HARD' ? 'صعب' : 'أسطوري'
                }
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'EASY', labelAr: 'سهل', descAr: 'مناسب للتعلم والتجربة' },
                { id: 'NORMAL', labelAr: 'عادي', descAr: 'توازن واقعي وتكتيكات قياسية' },
                { id: 'HARD', labelAr: 'صعب', descAr: 'ضغط عالي وتبديلات شرسة' },
                { id: 'LEGENDARY', labelAr: 'أسطوري', descAr: 'أقصى دقة تكتيكية واستغلال للفرص' }
              ].map((diff) => (
                <button
                  key={diff.id}
                  type="button"
                  onClick={() => setAiDifficulty(diff.id as AIDifficulty)}
                  className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                    aiDifficulty === diff.id
                      ? 'bg-amber-400/15 border-amber-400 text-white shadow'
                      : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                  }`}
                >
                  <div className="text-xs font-black text-white">{diff.labelAr}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{diff.descAr}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Final Action Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 border-2 border-emerald-500/40 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-right">
          <div className="text-lg font-black text-white flex items-center justify-center md:justify-start gap-2">
            <Award className="w-5 h-5 text-emerald-400" />
            <span>هل أنت مستعد لقيادة {team.nameAr} نحو المجد الكروي؟</span>
          </div>
          <p className="text-xs text-slate-400">
            ستتولى كل الصلاحيات: التشكيل، أسلوب اللعب، التدريبات، الصفقات، وقرارات المباريات الحاسمة.
          </p>
        </div>

        <button
          onClick={() => onConfirmTakeover(team, opponentChoice === 'AI' ? 'SOLO' : 'ROOM_ONLINE', aiDifficulty)}
          className="w-full md:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-base shadow-xl shadow-emerald-900/40 hover:scale-[1.02] active:scale-[0.98] transition flex items-center justify-center gap-3 cursor-pointer"
        >
          <span>تولي تدريب الفريق والبدء (BECOME MANAGER)</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
