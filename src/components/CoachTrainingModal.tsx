// ============================================================
// أنت المدرب | نظام إدارة وتدريب الفريق (Training System)
// ============================================================

import React, { useState } from 'react';
import {
  CoachTeam,
  TrainingFocusType,
  TrainingIntensity,
  CoachTrainingSchedule
} from '../types/coachGameTypes';
import {
  Activity,
  Zap,
  Shield,
  Target,
  Sparkles,
  HeartPulse,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Play
} from 'lucide-react';

interface CoachTrainingModalProps {
  team: CoachTeam;
  currentMatchday: number;
  existingSchedule?: CoachTrainingSchedule;
  onApplyTraining: (updatedTeam: CoachTeam, schedule: CoachTrainingSchedule, feedbackMessageAr: string) => void;
  onClose: () => void;
}

interface FocusOption {
  id: TrainingFocusType;
  titleAr: string;
  descriptionAr: string;
  icon: React.ReactNode;
  statBoost: string;
  fitnessDrain: number; // percentage
  injuryRiskModifier: number; // multiplier
}

export const CoachTrainingModal: React.FC<CoachTrainingModalProps> = ({
  team,
  currentMatchday,
  existingSchedule,
  onApplyTraining,
  onClose
}) => {
  const [selectedFocus, setSelectedFocus] = useState<TrainingFocusType>(
    existingSchedule?.focus || 'TACTICAL'
  );
  const [selectedIntensity, setSelectedIntensity] = useState<TrainingIntensity>(
    existingSchedule?.intensity || 'NORMAL'
  );
  const [executedFeedback, setExecutedFeedback] = useState<string | null>(null);

  const FOCUS_OPTIONS: FocusOption[] = [
    {
      id: 'TACTICAL',
      titleAr: 'تكتيك وانسجام الفريق',
      descriptionAr: 'زود انسجام الفريق.',
      icon: <Sparkles className="w-5 h-5 text-indigo-400" />,
      statBoost: '+ الانسجام والتمرير والحفاظ على تمركز الخطوط',
      fitnessDrain: 3,
      injuryRiskModifier: 1.0
    },
    {
      id: 'ATTACKING',
      titleAr: 'تمارين الهجوم وصناعة اللعب',
      descriptionAr: 'سرّع هجومك.',
      icon: <Target className="w-5 h-5 text-red-400" />,
      statBoost: '+ قدرات الهجوم والتمرير الحاسم لخط الهجوم',
      fitnessDrain: 4,
      injuryRiskModifier: 1.1
    },
    {
      id: 'DEFENDING',
      titleAr: 'التنظيم الدفاعي والضغط',
      descriptionAr: 'قوّي دفاعك.',
      icon: <Shield className="w-5 h-5 text-blue-400" />,
      statBoost: '+ استخلاص الكرة، قطع التمريرات، والصلابة الدفاعية',
      fitnessDrain: 4,
      injuryRiskModifier: 1.1
    },
    {
      id: 'FINISHING',
      titleAr: 'إنهاء الهجمات والتسديد',
      descriptionAr: 'حسّن التسديد.',
      icon: <Flame className="w-5 h-5 text-amber-400" />,
      statBoost: '+ دقة التسديد للمهاجمين والأجنحة والفعالية أمام الشباك',
      fitnessDrain: 3,
      injuryRiskModifier: 1.0
    },
    {
      id: 'PRESSING',
      titleAr: 'الضغط العالي والحدة البدنية',
      descriptionAr: 'اضغط واسترجع الكورة.',
      icon: <Zap className="w-5 h-5 text-yellow-400" />,
      statBoost: '+ سرعة استرجاع الكرة ورفع شراسة خط الوسط',
      fitnessDrain: 6,
      injuryRiskModifier: 1.3
    },
    {
      id: 'PASSING',
      titleAr: 'التمرير القصير وبناء اللعب',
      descriptionAr: 'حافظ على الكورة.',
      icon: <Activity className="w-5 h-5 text-emerald-400" />,
      statBoost: '+ دقة التمرير ونسبة الاستحواذ في المباريات',
      fitnessDrain: 3,
      injuryRiskModifier: 0.9
    },
    {
      id: 'SET_PIECES',
      titleAr: 'الكرات الثابتة والركنيات',
      descriptionAr: 'اتقن الكرات الثابتة.',
      icon: <Target className="w-5 h-5 text-purple-400" />,
      statBoost: '+ خطورة الركلات الثابتة وركلات الزاوية',
      fitnessDrain: 2,
      injuryRiskModifier: 0.8
    },
    {
      id: 'RECOVERY',
      titleAr: 'الاستشفاء والاسترجاع البدني',
      descriptionAr: 'قلل الإجهاد والإصابات.',
      icon: <HeartPulse className="w-5 h-5 text-teal-400" />,
      statBoost: '+ استعادة طاقة اللاعبين وتقليل احتمالية الإصابات بنسبة 50%',
      fitnessDrain: -8, // Actually restores fitness!
      injuryRiskModifier: 0.4
    }
  ];

  const currentOption = FOCUS_OPTIONS.find((f) => f.id === selectedFocus) || FOCUS_OPTIONS[0];

  // Calculate average squad fitness
  const avgFitness = Math.round(
    team.squad.reduce((sum, p) => sum + p.fitness, 0) / (team.squad.length || 1)
  );

  const fatiguedPlayers = team.squad.filter((p) => p.fitness < 82);
  const injuredPlayers = team.squad.filter((p) => p.injuryStatus && p.injuryStatus.weeksRemaining > 0);

  const handleExecuteSession = () => {
    let fitnessDelta = 0;
    let moraleDelta = 0;
    let formDelta = 0;

    if (selectedFocus === 'RECOVERY') {
      fitnessDelta = selectedIntensity === 'INTENSE' ? 10 : selectedIntensity === 'NORMAL' ? 8 : 6;
      moraleDelta = 2;
    } else {
      const drainBase = currentOption.fitnessDrain;
      const intensityMult = selectedIntensity === 'INTENSE' ? 1.5 : selectedIntensity === 'NORMAL' ? 1.0 : 0.6;
      fitnessDelta = -Math.round(drainBase * intensityMult);
      moraleDelta = selectedIntensity === 'INTENSE' ? 3 : 2;
      formDelta = selectedIntensity === 'INTENSE' ? 1 : 0;
    }

    // Apply to squad
    const updatedSquad = team.squad.map((player) => {
      // If player is injured, they don't do regular intense training
      if (player.injuryStatus && player.injuryStatus.weeksRemaining > 0) {
        return player;
      }

      const newFitness = Math.min(100, Math.max(50, player.fitness + fitnessDelta));
      const newMorale = Math.min(100, Math.max(50, (player.morale || 85) + moraleDelta));
      const newForm = Math.min(10, Math.max(4, (player.form || 7) + (Math.random() > 0.6 ? formDelta : 0)));

      return {
        ...player,
        fitness: newFitness,
        morale: newMorale,
        form: newForm
      };
    });

    const updatedTeam: CoachTeam = {
      ...team,
      squad: updatedSquad
    };

    const newSchedule: CoachTrainingSchedule = {
      focus: selectedFocus,
      intensity: selectedIntensity,
      lastCompletedMatchday: currentMatchday
    };

    const msg =
      selectedFocus === 'RECOVERY'
        ? `اكتملت حصة الاستشفاء بنجاح! استعاد اللاعبون +${Math.abs(fitnessDelta)}% من اللياقة والراحة.`
        : `أتم الفريق حصة تدريبية ناجحة على (${currentOption.titleAr}) بحدة (${selectedIntensity === 'INTENSE' ? 'عالية' : selectedIntensity === 'NORMAL' ? 'متوسطة' : 'خفيفة'}). ارتفع التناغم والجاهزية!`;

    setExecutedFeedback(msg);
    onApplyTraining(updatedTeam, newSchedule, msg);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full p-6 md:p-8 space-y-6 shadow-2xl animate-fadeIn my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">غرفة التدريبات والمعسكر التدريبي</h2>
              <p className="text-xs text-slate-400">
                حدد برنامج التدريب للجولة {currentMatchday} لموازنة اللياقة، التكتيك، وتفادي الإصابات
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

        {/* Squad Physical Status Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
          <div>
            <div className="text-xs text-slate-400">متوسط اللياقة البدنية</div>
            <div className="text-2xl font-black text-emerald-400 flex items-center gap-2">
              <span>{avgFitness}%</span>
              <span className="text-xs font-normal text-slate-400">
                {avgFitness >= 90 ? '(ممتاز)' : avgFitness >= 80 ? '(جيد)' : '(إجهاد)'}
              </span>
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400">لاعبون يعانون من الإجهاد (&lt;82%)</div>
            <div className="text-lg font-bold text-amber-400">
              {fatiguePlayersCount(fatiguedPlayers.length)}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400">الإصابات في العيادة</div>
            <div className="text-lg font-bold text-red-400">
              {injuredPlayers.length === 0 ? 'العيادة فارغة (جاهزية تامة)' : `${injuredPlayers.length} لاعبين مصابين`}
            </div>
          </div>
        </div>

        {/* Focus Selector Grid */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-white block">1. اختار التركيز التكتيكي والبدني للحصة:</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FOCUS_OPTIONS.map((opt) => {
              const isSelected = selectedFocus === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setSelectedFocus(opt.id)}
                  className={`p-3.5 rounded-2xl border text-right transition flex items-start gap-3 ${
                    isSelected
                      ? 'bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10'
                      : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 shrink-0 mt-0.5">
                    {opt.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{opt.titleAr}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{opt.descriptionAr}</p>
                    <div className="text-[11px] font-semibold text-emerald-400/90 mt-1">
                      {opt.statBoost}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Intensity Selector */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-white block">2. حدة التمارين ومستوى الضغط البدني:</label>
          <div className="grid grid-cols-3 gap-3">
            {(['LIGHT', 'NORMAL', 'INTENSE'] as TrainingIntensity[]).map((lvl) => {
              const isSelected = selectedIntensity === lvl;
              const labels = {
                LIGHT: { title: 'خفيفة (استشفاء وتجنب إصابات)', desc: 'استهلاك قليل للطاقة وخطر إصابات شبه معدوم' },
                NORMAL: { title: 'متوسطة (متوازنة)', desc: 'توازن مثالي بين التطور التكتيكي والمخزون البدني' },
                INTENSE: { title: 'عالية (مكثفة وشاقة)', desc: 'تطور أسرع، لكنها تستهلك اللياقة وترفع خطر الإصابة' }
              }[lvl];

              return (
                <button
                  key={lvl}
                  onClick={() => setSelectedIntensity(lvl)}
                  className={`p-3 rounded-2xl border text-center transition ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500 text-amber-300'
                      : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="text-xs font-bold">{labels.title}</div>
                  <div className="text-[10px] text-slate-400 mt-1 hidden sm:block">{labels.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Feedback alert if just executed */}
        {executedFeedback && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3 text-emerald-300 text-sm animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{executedFeedback}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition"
          >
            إغلاق
          </button>

          <button
            onClick={handleExecuteSession}
            className="px-7 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-900/30 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>تنفيذ الحصة التدريبية دلوقتي</span>
          </button>
        </div>
      </div>
    </div>
  );
};

function fatiguePlayersCount(count: number): string {
  if (count === 0) return 'لا يوجد (الكل لائق)';
  if (count === 1) return 'لاعب واحد مجهد';
  if (count === 2) return 'لاعبان مجهدان';
  return `${count} لاعبين مجهدين`;
}
