// ============================================================
// العبها صح | EL3BHA SA7 - "تحدي المدرب" (Tactical Coach Challenge)
// ============================================================

import React, { useState } from 'react';
import { Coach, FootballPlayer } from '../types';
import { COACHES, FOOTBALL_PLAYERS } from '../data/footballData';
import { audioManager } from '../services/audioManager';
import { StorageService } from '../services/storageService';
import { ActiveGameShell } from './ActiveGameShell';
import { WithdrawResultScreen } from './WithdrawResultScreen';
import { CoachCard } from './CoachCard';
import {
  ShieldAlert,
  BrainCircuit,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap,
  Award
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Scenario {
  id: string;
  titleAr: string;
  descriptionAr: string;
  minute: number;
  scoreHome: number;
  scoreAway: number;
  conditionAr: string;
  correctTactics: {
    coachId: string;
    actionAr: string;
    explanationAr: string;
  };
}

const SCENARIOS: Scenario[] = [
  {
    id: 'sc1',
    titleAr: 'نهائي دوري الأبطال • الدقيقة 82 متأخر بهدف 1-2 وحالة طرد لمدافعك',
    descriptionAr: 'متأخر ووراك 8 دقايق. لحق الماتش!',
    minute: 82,
    scoreHome: 1,
    scoreAway: 2,
    conditionAr: 'طرد قلب دفاع + تأخر بهدف + دفاع منخفض للخصم',
    correctTactics: {
      coachId: 'sir_alex_ferguson',
      actionAr: 'اللعب المباشر الشامل (All-Out Attack) مع إرسال الكرات الطولية والضغط الهجومي المكثف',
      explanationAr: 'أسلوب السير أليكس وفيرجي تايم يعتمد على إرباك دفاع الخصم المتراجع عبر العرضيات المكثفة واستغلال الفوضى في منطقة الجزاء دون الحاجة للبناء الخلفي.'
    }
  },
  {
    id: 'sc2',
    titleAr: 'الدقيقة 70 متقدم 1-0 والخصم يضغط بكل خطوطه في ملعبك',
    descriptionAr: 'الخصم هاجم بكل قوته. ظبّط دفاعك!',
    minute: 70,
    scoreHome: 1,
    scoreAway: 0,
    conditionAr: 'دفاع تحت الضغط العالي + مساحات شاسعة خلف دفاع الخصم',
    correctTactics: {
      coachId: 'jose_mourinho',
      actionAr: 'تأمين العمق الدفاعي المنظم (Low Block) والاعتماد على الكرات المرتدة الخاطفة في المساحات',
      explanationAr: 'أسلوب جوزيه مورينيو يغلق كل ممرات التمرير ويستغل المساحات الفارغة خلف أظهرة الخصم لقتل المباراة بهدف ثانٍ.'
    }
  }
];

export const CoachChallengeGameView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [scenarioIndex, setScenarioIndex] = useState(0);

  const [withdrew, setWithdrew] = useState<boolean>(false);
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [evaluated, setEvaluated] = useState(false);

  const scenario = SCENARIOS[scenarioIndex % SCENARIOS.length];
  const isCorrect = selectedCoachId === scenario.correctTactics.coachId;

  const handleEvaluate = () => {
    if (!selectedCoachId) return;
    setEvaluated(true);
    if (isCorrect) {
      audioManager.playGoal();
      StorageService.addCoinsAndXP(500, 300);
      try {
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      } catch {}
    } else {
      audioManager.playTimerBeep();
    }
  };

  const handleNext = () => {
    setSelectedCoachId(null);
    setEvaluated(false);
    setScenarioIndex((prev) => prev + 1);
    audioManager.playClick();
  };

  if (withdrew) {

    const me = StorageService.getUserProfile();

    return (

      <WithdrawResultScreen

        didWithdraw

        myName={me.nameAr}

        myAvatar={me.avatar}

        opponentName="الخصم"

        opponentAvatar="🤖"

        onBack={onBack}

      />

    );

  }


  return (
    <ActiveGameShell
      user={{ id: 'u1', username: 'player', nameAr: 'المتحدي' } as any}
      gameTitle="تحدي المدرب التكتيكي"
      backgroundUrl="/games/backgrounds/you-are-the-coach-bg.png"
      roundInfo={`السيناريو #${scenarioIndex + 1}`}
      onWithdraw={() => setWithdrew(true)}
    >
      <div className="max-w-4xl mx-auto space-y-6 py-4 px-3 select-none">
        <div className="flex items-center justify-between bg-zinc-950/80 border border-zinc-800 p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-400 flex items-center justify-center text-cyan-400 font-black">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">تحدي المدرب التكتيكي</h2>
              <p className="text-xs text-zinc-400">احسم الأزمة بالقرار الصح</p>
            </div>
          </div>
        </div>

        {/* Scenario Card */}
        <div className="bg-zinc-950/80 rounded-3xl p-6 space-y-5 shadow-2xl surface-aurora">
          <div className="bg-gradient-to-r from-cyan-950/40 via-zinc-900 to-cyan-950/40 border border-cyan-500/40 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-cyan-400 uppercase">الأزمة:</span>
              <h3 className="text-base sm:text-lg font-black text-white mt-1">{scenario.titleAr}</h3>
              <p className="text-xs text-zinc-300 mt-1">{scenario.descriptionAr}</p>
            </div>
            <div className="text-right bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-800 shrink-0">
              <div className="text-[10px] text-zinc-500">النتيجة والوقت</div>
              <div className="text-base sm:text-lg font-black text-amber-400 font-mono">
                {scenario.scoreHome} - {scenario.scoreAway} ({scenario.minute}')
              </div>
            </div>
          </div>

          {/* Coach Selection for this scenario */}
          <div>
            <h4 className="text-xs font-black text-white mb-3">هتحلها إزاي؟</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {COACHES.slice(0, 3).map((coach) => (
                <CoachCard
                  key={coach.id}
                  coach={coach}
                  selected={selectedCoachId === coach.id}
                  onSelect={() => {
                    if (!evaluated) {
                      audioManager.playClick();
                      setSelectedCoachId(coach.id);
                    }
                  }}
                />
              ))}
            </div>
          </div>

          {/* Evaluation Action */}
          {!evaluated ? (
            <div className="pt-2 flex justify-center">
              <button
                disabled={!selectedCoachId}
                onClick={handleEvaluate}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-xs shadow-lg disabled:opacity-40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                تطبيق التكتيك واختبار المحاكاة بالذكاء الاصطناعي 🧠
              </button>
            </div>
          ) : (
            <div className={`p-5 rounded-2xl border space-y-3 ${isCorrect ? 'bg-emerald-950/60 border-emerald-500/60' : 'bg-rose-950/60 border-rose-500/60'}`}>
              <div className="flex items-center gap-2 font-black text-sm text-white">
                {isCorrect ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-rose-400" />}
                <span>{isCorrect ? 'قرار تكتيكي عبقري! قلبت الموازين وحققت الفوز' : 'قرار غير موفق، استغل الخصم الثغرة وحسم اللقاء'}</span>
              </div>

              <p className="text-xs text-zinc-200 leading-relaxed bg-zinc-900/60 p-3 rounded-xl">
                {scenario.correctTactics.explanationAr}
              </p>

              <div className="flex justify-end">
                <button
                  onClick={handleNext}
                  className="px-6 py-2 rounded-xl bg-amber-400 text-zinc-950 font-black text-xs hover:bg-amber-300 cursor-pointer"
                >
                  السيناريو التالي ➡️
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ActiveGameShell>
  );
};
