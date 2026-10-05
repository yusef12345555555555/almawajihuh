// ============================================================
// العبها صح | EL3BHA SA7 - Game 3: الحوارتجي والصياد (Hoartagy & Hunter)
// ============================================================

import React, { useState, useEffect } from 'react';
import { audioManager } from '../services/audioManager';
import { StorageService } from '../services/storageService';
import { ActiveGameShell } from './ActiveGameShell';
import { WithdrawResultScreen } from './WithdrawResultScreen';
import {
  Flame,
  Search,
  Eye,
  EyeOff,
  HelpCircle,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Send
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface HoartagyItem {
  id: string;
  secretDirective: 'CAP' | 'FACT'; // بيحور أو مبيحورش
  imageTitleAr: string;
  imageFactDetailsAr: string; // The real historic fact
  imageFakeLieDetailsAr: string; // The fabricated story
  realPlayerName: string;
  year: string;
}

const HOARTAGY_SCENARIOS: HoartagyItem[] = [
  {
    id: 'sc_1',
    secretDirective: 'CAP',
    imageTitleAr: 'هدف يد مارادونا الشهير أمام إنجلترا في مونديال 1986',
    imageFactDetailsAr: 'سجل مارادونا الهدف بيده اليسرى في شباك بيتر شيلتون واحتسبه الحكم علي بن ناصر.',
    imageFakeLieDetailsAr: 'مارادونا سجل الهدف برأسه بعدما اصطدمت الكرة في عارضة الحارس بيتر شيلتون في الدقيقة 94.',
    realPlayerName: 'دييغو مارادونا',
    year: '1986'
  },
  {
    id: 'sc_2',
    secretDirective: 'FACT',
    imageTitleAr: 'زيدان ونطحة ماتيراتزي في نهائي كأس العالم 2006',
    imageFactDetailsAr: 'طرد زين الدين زيدان في الشوط الإضافي الثاني بالبطاقة الحمراء المباشرة من الحكم هوراسيو إليزوندو.',
    imageFakeLieDetailsAr: 'زيدان طُرد بعد حصوله على إنذارين متتاليين بسبب الاحتجاج في الدقيقة 118.',
    realPlayerName: 'زين الدين زيدان',
    year: '2006'
  },
  {
    id: 'sc_3',
    secretDirective: 'CAP',
    imageTitleAr: 'ريمونتادا برشلونة التاريخية 6-1 أمام باريس سان جيرمان',
    imageFactDetailsAr: 'سيرجي روبيرتو سجل الهدف السادس الحاسم في الدقيقة 90+5 بعد تمريرة نيمار الساحرة.',
    imageFakeLieDetailsAr: 'ميسي هو من سجل الهدف السادس من ركلة حرة مباشرة في الدقيقة 98 بعد طرد كافاني.',
    realPlayerName: 'سيرجي روبيرتو ونيمار',
    year: '2017'
  },
  {
    id: 'sc_4',
    secretDirective: 'FACT',
    imageTitleAr: 'هدف ميسي التاريخي المنفرد ضد خيتافي في كأس الملك 2007',
    imageFactDetailsAr: 'قطع ميسي مسافة 55 متراً ورواغ 5 لاعبين وحارس المرمى ليسجل هدفاً شبيهاً بهدف مارادونا 1986.',
    imageFakeLieDetailsAr: 'ميسي سجل الهدف بتسديدة ساقطة من منتصف الملعب بعد خطأ من حارس خيتافي.',
    realPlayerName: 'ليونيل ميسي',
    year: '2007'
  }
];

interface HoartagyHunterGameViewProps {
  /** result is passed when there's a real outcome to report (e.g. a forced withdrawal = loss). */
  onBack: (result?: 'WIN' | 'LOSE') => void;
}

export const HoartagyHunterGameView: React.FC<HoartagyHunterGameViewProps> = ({ onBack }) => {
  const [scenarioIndex, setScenarioIndex] = useState<number>(0);

  const [withdrew, setWithdrew] = useState<boolean>(false);
  const [questionsLeft, setQuestionsLeft] = useState<number>(5);
  const [hunterQuestions, setHunterQuestions] = useState<{ q: string; a: string }[]>([]);
  const [currentInputQ, setCurrentInputQ] = useState<string>('');
  const [hunterDecision, setHunterDecision] = useState<'CAP' | 'FACT' | null>(null);
  const [isRoundOver, setIsRoundOver] = useState<boolean>(false);
  const [scoreHunter, setScoreHunter] = useState<number>(0);
  const [scoreHoartagy, setScoreHoartagy] = useState<number>(0);

  const scenario = HOARTAGY_SCENARIOS[scenarioIndex % HOARTAGY_SCENARIOS.length];

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInputQ.trim() || questionsLeft <= 0 || isRoundOver) return;
    audioManager.playClick();

    // Hoartagy responds automatically aligned with directive
    const qText = currentInputQ.trim();
    let autoAns = '';
    if (scenario.secretDirective === 'CAP') {
      autoAns = `[إجابة الحوارتجي المحورة]: بالتأكيد، ${scenario.imageFakeLieDetailsAr.substring(0, 45)}...`;
    } else {
      autoAns = `[إجابة الحوارتجي الحقيقية]: نعم، ${scenario.imageFactDetailsAr.substring(0, 45)}...`;
    }

    setHunterQuestions((prev) => [...prev, { q: qText, a: autoAns }]);
    setQuestionsLeft((prev) => prev - 1);
    setCurrentInputQ('');
  };

  const handleHunterFinalVerdict = (verdict: 'CAP' | 'FACT') => {
    if (isRoundOver) return;
    audioManager.playWhistle();
    setHunterDecision(verdict);
    setIsRoundOver(true);

    StorageService.awardUniversal10Points('hoartagy_hunter', `scenario_${scenarioIndex}_${scenario.id}`);

    const isHunterCorrect = verdict === scenario.secretDirective;
    if (isHunterCorrect) {
      audioManager.playGoal();
      setScoreHunter((prev) => prev + 100);
      try {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      } catch {}
    } else {
      audioManager.playTimerBeep();
      setScoreHoartagy((prev) => prev + 100);
    }
  };

  const TOTAL_ROUNDS = 5;
  const [matchOver, setMatchOver] = useState<boolean>(false);

  const handleNextScenario = () => {
    audioManager.playClick();
    const nextIndex = scenarioIndex + 1;
    if (nextIndex >= TOTAL_ROUNDS) {
      setMatchOver(true);
      return;
    }
    setScenarioIndex(nextIndex);
    setQuestionsLeft(5);
    setHunterQuestions([]);
    setCurrentInputQ('');
    setHunterDecision(null);
    setIsRoundOver(false);
  };

  if (matchOver) {
    const won = scoreHunter > scoreHoartagy;
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center bg-black text-white px-5">
        <div className="w-full max-w-sm rounded-3xl border border-amber-500/30 bg-zinc-950 p-6 text-center space-y-4">
          <div className="text-4xl">{won ? '🏆' : '❌'}</div>
          <div className="text-lg font-black">{won ? 'فوز! كشفت الحوارتجي أكتر مما خدعك' : 'خسارة! الحوارتجي خدعك أكتر من مرة'}</div>
          <div className="text-xs text-zinc-400">
            نقاط الصياد: <strong className="text-white">{scoreHunter}</strong> — نقاط الحوارتجي: <strong className="text-white">{scoreHoartagy}</strong>
          </div>
          <button
            type="button"
            onClick={() => onBack(won ? 'WIN' : 'LOSE')}
            className="w-full rounded-2xl bg-amber-400 py-3 font-black text-black"
          >
            العودة للألعاب
          </button>
        </div>
      </div>
    );
  }

  if (withdrew) {

    const me = StorageService.getUserProfile();

    return (

      <WithdrawResultScreen

        didWithdraw

        myName={me.nameAr}

        myAvatar={me.avatar}

        opponentName="الخصم"

        opponentAvatar="🤖"

        onBack={() => onBack('LOSE')}

      />

    );

  }


  return (
    <ActiveGameShell
      user={{ id: 'u1', username: 'player', nameAr: 'الصياد vs الحوارتجي' } as any}
      gameTitle="الحوارتجي والصياد"
      backgroundUrl="/games/backgrounds/hoartagy-hunter-bg.png"
      roundInfo={`الجولة ${scenarioIndex + 1}`}
      onWithdraw={() => setWithdrew(true)}
    >
      <div className="max-w-4xl mx-auto space-y-6 py-4 px-3">
        {/* Header HUD */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/90 border border-zinc-800 p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400 flex items-center justify-center text-rose-400 font-black">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">الحوارتجي والصياد (2 لاعبين)</h2>
              <p className="text-xs text-zinc-400">5 أسئلة بس عشان تعرف بيحور ولا لأ</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30">
              نقاط الصياد: <strong className="text-white">{scoreHunter}</strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-400/30">
              نقاط الحوارتجي: <strong className="text-white">{scoreHoartagy}</strong>
            </div>
          </div>
        </div>

        {/* The Mystery Scene & Secret Directive */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Secret Directive Box (Visible to Hoartagy) */}
          <div className="bg-zinc-950/80 border border-rose-500/40 rounded-3xl p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                <span>أمر النظام السري للحوارتجي</span>
              </span>
              <span className="text-xs text-zinc-400 font-mono">{scenario.year}</span>
            </div>

            <h3 className="text-base sm:text-lg font-black text-white">{scenario.imageTitleAr}</h3>

            <div className={`p-4 rounded-2xl border ${scenario.secretDirective === 'CAP' ? 'bg-rose-950/30 border-rose-400 text-rose-200' : 'bg-emerald-950/30 border-emerald-400 text-emerald-200'}`}>
              <div className="text-xs font-black uppercase mb-1">
                {scenario.secretDirective === 'CAP' ? '⚠️ الأمر: حَوّر واكذب في التفاصيل!' : '✅ الأمر: احكِ الحقيقة كاملة بدون تحوير!'}
              </div>
              <p className="text-xs leading-relaxed">
                {scenario.secretDirective === 'CAP' ? scenario.imageFakeLieDetailsAr : scenario.imageFactDetailsAr}
              </p>
            </div>
          </div>

          {/* Hunter Interrogation Desk */}
          <div className="bg-zinc-950/80 border border-blue-500/40 rounded-3xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1">
                  <Search className="w-3.5 h-3.5" />
                  <span>طاولة استجواب الصياد</span>
                </span>
                <span className="text-xs font-black text-amber-400">
                  الأسئلة المتبقية: {questionsLeft} من 5
                </span>
              </div>

              {/* Questions Log */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
                {hunterQuestions.length === 0 ? (
                  <div className="text-center py-6 text-zinc-500">
                    لم يطرح الصياد أي سؤال بعد. اكتب سؤالك بالأسفل لاستدراج الحوارتجي!
                  </div>
                ) : (
                  hunterQuestions.map((item, idx) => (
                    <div key={idx} className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800 space-y-1">
                      <div className="font-bold text-blue-400">❓ س{idx + 1}: {item.q}</div>
                      <div className="text-zinc-300 pr-2 border-r-2 border-amber-400">{item.a}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Input for question */}
            {!isRoundOver && questionsLeft > 0 && (
              <form onSubmit={handleAskQuestion} className="flex gap-2">
                <input
                  type="text"
                  value={currentInputQ}
                  onChange={(e) => setCurrentInputQ(e.target.value)}
                  placeholder="اسأل الحوارتجي عن تفاصيل الواقعة..."
                  className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 focus:border-blue-400 rounded-xl text-xs text-white outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>اسأل</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Hunter's Final Verdict & Verdict Buttons */}
        {!isRoundOver ? (
          <div className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-3xl text-center space-y-4">
            <h3 className="text-base font-black text-white">قرارك الأخير: بيحور ولا لأ؟</h3>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => handleHunterFinalVerdict('CAP')}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                <span>بيحور (كذاب!) 🎭</span>
              </button>

              <button
                onClick={() => handleHunterFinalVerdict('FACT')}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>مبيحورش (صادق) ✅</span>
              </button>
            </div>
          </div>
        ) : (
          /* Round Results */
          <div className="bg-zinc-950 p-6 rounded-3xl text-center space-y-4 shadow-2xl surface-aurora">
            <div className="text-xl font-black text-white">
              {hunterDecision === scenario.secretDirective ? (
                <span className="text-emerald-400">🎯 كشفته!</span>
              ) : (
                <span className="text-rose-400">❌ خدعك الحوارتجي ببراعة وفاز بالجولة!</span>
              )}
            </div>

            <div className="text-xs text-zinc-300 bg-zinc-900/90 p-3 rounded-2xl border border-zinc-800 max-w-xl mx-auto">
              <strong>الحقيقة الكاملة:</strong> {scenario.imageFactDetailsAr}
            </div>

            <div className="pt-2">
              <button
                onClick={handleNextScenario}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-zinc-950 font-black text-xs shadow-lg hover:scale-105 transition-all"
              >
                الجولة التالية
              </button>
            </div>
          </div>
        )}
      </div>
    </ActiveGameShell>
  );
};
