// ============================================================
// أنت المدرب | سوق الانتقالات والصفقات (Transfer Market & Contracts)
// ============================================================

import React, { useState } from 'react';
import { CoachTeam, CoachSquadPlayer, CoachPosition } from '../types/coachGameTypes';
import { CoachEcosystemService } from '../services/coachEcosystemService';
import { TransferWindowStatus } from '../services/transferWindowService';
import {
  Coins,
  TrendingUp,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UserPlus,
  UserMinus,
  Sparkles,
  ArrowRightLeft,
  FileText,
  DollarSign,
  Award,
  Lock,
  Clock
} from 'lucide-react';

interface CoachTransferModalProps {
  userTeam: CoachTeam;
  allTeams: CoachTeam[];
  managerPoints?: number;
  windowStatus: TransferWindowStatus;
  onUpdateTeam: (updatedTeam: CoachTeam, messageAr: string) => void;
  onUpdatePoints?: (newPoints: number) => void;
  onClose: () => void;
}

export const CoachTransferModal: React.FC<CoachTransferModalProps> = ({
  userTeam,
  allTeams,
  managerPoints = 500,
  windowStatus,
  onUpdateTeam,
  onUpdatePoints,
  onClose
}) => {
  const isNational = !!userTeam.isNationalTeam;
  const [activeTab, setActiveTab] = useState<'BUY' | 'MY_SQUAD' | 'SCOUT'>('BUY');
  const [positionFilter, setPositionFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isSuccess: boolean } | null>(null);

  const transferBudget = userTeam.budget?.transfer || 0;
  const wageBudget = userTeam.budget?.wage || 0;

  // Gather market players from other clubs
  const otherTeams = allTeams.filter((t) => t.id !== userTeam.id && !t.isNationalTeam);
  const marketPool: { player: CoachSquadPlayer; club: CoachTeam }[] = [];
  otherTeams.forEach((t) => {
    t.squad.forEach((p) => {
      marketPool.push({ player: p, club: t });
    });
  });

  // Filtered market
  const filteredMarket = marketPool.filter(({ player }) => {
    const matchesPos =
      positionFilter === 'ALL'
        ? true
        : positionFilter === 'FWD'
        ? ['ST', 'RW', 'LW'].includes(player.position)
        : positionFilter === 'MID'
        ? ['CM', 'CAM', 'CDM'].includes(player.position)
        : positionFilter === 'DEF'
        ? ['CB', 'LB', 'RB'].includes(player.position)
        : player.position === positionFilter;

    const matchesSearch =
      searchQuery.trim() === '' ||
      player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.nameAr.includes(searchQuery);

    return matchesPos && matchesSearch;
  });

  // Handle Buying a player
  const handleBuyPlayer = (targetPlayer: CoachSquadPlayer, sellingClub: CoachTeam) => {
    if (!windowStatus.isOpen) {
      setFeedbackMsg({ text: 'سوق الانتقالات مغلق دلوقتي. مش ممكن إتمام أي صفقات خارج النافذتين الصيفية والشتوية.', isSuccess: false });
      return;
    }
    const cost = targetPlayer.marketValue || 25;
    const weeklyWage = targetPlayer.wageWeekly || 40;

    if (transferBudget < cost) {
      setFeedbackMsg({
        text: `عفواً! ميزانية التعاقدات الحالية (€${transferBudget}M) لا تكفي لإتمام صفقة ${targetPlayer.nameAr} المقدرة بـ (€${cost}M).`,
        isSuccess: false
      });
      return;
    }

    // Check player willingness based on team reputation
    const repDiff = userTeam.overallRating - sellingClub.overallRating;
    if (repDiff < -6) {
      setFeedbackMsg({
        text: `رفض اللاعب ${targetPlayer.nameAr} العرض مفضلاً البقاء في صفوف ناديه الحالي لأسباب تنافسية!`,
        isSuccess: false
      });
      return;
    }

    // Process Transfer
    const newPlayerId = `${userTeam.id}_${targetPlayer.id}`;
    const acquiredPlayer: CoachSquadPlayer = {
      ...targetPlayer,
      id: newPlayerId,
      fitness: 100,
      morale: 95,
      form: 8,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      matchesPlayed: 0
    };

    const updatedSquad = [...userTeam.squad, acquiredPlayer];
    const updatedBench = [...userTeam.bench, newPlayerId];

    const updatedTeam: CoachTeam = {
      ...userTeam,
      squad: updatedSquad,
      bench: updatedBench,
      budget: {
        transfer: transferBudget - cost,
        wage: wageBudget
      }
    };

    const msg = `تمت الصفقة بنجاح! تعاقد ${userTeam.nameAr} رسمياً مع ${targetPlayer.nameAr} مقابل €${cost}M!`;
    setFeedbackMsg({ text: msg, isSuccess: true });
    onUpdateTeam(updatedTeam, msg);
  };

  // Handle Buying a player using Manager Points (نقاط المدرب)
  const handleBuyPlayerWithPoints = (targetPlayer: CoachSquadPlayer, sellingClub: CoachTeam) => {
    if (!windowStatus.isOpen) {
      setFeedbackMsg({ text: 'سوق الانتقالات مغلق دلوقتي. مش ممكن إتمام أي صفقات خارج النافذتين الصيفية والشتوية.', isSuccess: false });
      return;
    }
    const pointsCost = CoachEcosystemService.calculatePlayerPointPrice(targetPlayer.rating);

    if (managerPoints < pointsCost) {
      setFeedbackMsg({
        text: `عفواً! رصيدك من نقاط المدرب (${managerPoints} نقطة) لا يكفي لإتمام صفقة ${targetPlayer.nameAr} اللي تتطلب (${pointsCost} نقطة). العب مباريات وحقق انتصارات لجمع المزيد من النقاط!`,
        isSuccess: false
      });
      return;
    }

    // Process Points Transfer
    const newPlayerId = `${userTeam.id}_pts_${targetPlayer.id}`;
    const acquiredPlayer: CoachSquadPlayer = {
      ...targetPlayer,
      id: newPlayerId,
      fitness: 100,
      morale: 100,
      form: 8,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      matchesPlayed: 0
    };

    const updatedSquad = [...userTeam.squad, acquiredPlayer];
    const updatedBench = [...userTeam.bench, newPlayerId];

    const updatedTeam: CoachTeam = {
      ...userTeam,
      squad: updatedSquad,
      bench: updatedBench
    };

    const msg = `صفقة استثنائية! استخدمت نقاط المدرب (🌟 ${pointsCost} نقطة) للتعاقد مع النجم ${targetPlayer.nameAr}!`;
    setFeedbackMsg({ text: msg, isSuccess: true });
    onUpdateTeam(updatedTeam, msg);
    onUpdatePoints?.(managerPoints - pointsCost);
  };

  // Handle Selling a player
  const handleSellPlayer = (playerToSell: CoachSquadPlayer) => {
    if (!windowStatus.isOpen) {
      setFeedbackMsg({ text: 'سوق الانتقالات مغلق دلوقتي. مش ممكن بيع اللاعبين خارج النافذتين الصيفية والشتوية.', isSuccess: false });
      return;
    }
    if (userTeam.squad.length <= 15) {
      setFeedbackMsg({
        text: 'مش ممكن بيع اللاعب لأن قوام الفريق سيصبح أقل من الحد الأدنى (15 لاعباً)!',
        isSuccess: false
      });
      return;
    }

    const value = playerToSell.marketValue || 20;
    const saleIncome = Math.round(value * (0.9 + Math.random() * 0.25));

    const updatedSquad = userTeam.squad.filter((p) => p.id !== playerToSell.id);
    const updatedStarters = userTeam.startingXI.filter((id) => id !== playerToSell.id);
    const updatedBench = userTeam.bench.filter((id) => id !== playerToSell.id);

    // If was starter, promote first bench player
    if (updatedStarters.length < 11 && updatedBench.length > 0) {
      const promoted = updatedBench.shift()!;
      updatedStarters.push(promoted);
    }

    const updatedTeam: CoachTeam = {
      ...userTeam,
      squad: updatedSquad,
      startingXI: updatedStarters,
      bench: updatedBench,
      budget: {
        transfer: transferBudget + saleIncome,
        wage: wageBudget
      }
    };

    const msg = `تم بيع ${playerToSell.nameAr} بنجاح مقابل €${saleIncome}M، وتمت إضافة المبلغ إلى خزينة النادي!`;
    setFeedbackMsg({ text: msg, isSuccess: true });
    onUpdateTeam(updatedTeam, msg);
  };

  // Handle Contract Renewal
  const handleRenewContract = (player: CoachSquadPlayer) => {
    const updatedSquad = userTeam.squad.map((p) => {
      if (p.id === player.id) {
        return {
          ...p,
          contractYears: (p.contractYears || 2) + 2,
          morale: 100
        };
      }
      return p;
    });

    const updatedTeam: CoachTeam = {
      ...userTeam,
      squad: updatedSquad
    };

    const msg = `تم تجديد عقد ${player.nameAr} لمدة موسمين إضافيين وسط سعادة غامرة من اللاعب وجماهير النادي!`;
    setFeedbackMsg({ text: msg, isSuccess: true });
    onUpdateTeam(updatedTeam, msg);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full p-6 md:p-8 space-y-6 shadow-2xl animate-fadeIn my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ArrowRightLeft className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">
                {isNational ? 'إدارة الاستدعاءات والقائمة الدولية' : 'سوق الانتقالات وإبرام الصفقات'}
              </h2>
              <p className="text-xs text-slate-400">
                {isNational
                  ? 'اختار القائمة الدولية النهائية الممثلة للوطن في البطولة'
                  : `ميزانية النادي المتاحة: €${transferBudget}M للتعاقدات`}
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

        {/* Transfer Window Status Banner */}
        <div
          className={`shrink-0 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border ${
            windowStatus.isOpen
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2 text-xs sm:text-sm font-black">
            {windowStatus.isOpen ? <Clock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            <span>{windowStatus.labelAr}</span>
          </div>
          {windowStatus.isOpen ? (
            <span className="text-xs font-bold">متبقي: {windowStatus.daysRemaining} يوم</span>
          ) : (
            <span className="text-xs font-bold">مش ممكن إتمام أي صفقات دلوقتي</span>
          )}
        </div>

        {/* Financial Overview & Manager Points (Clubs Only) */}
        {!isNational && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 shrink-0">
            <div>
              <div className="text-xs text-slate-400">ميزانية الصفقات المتاحة</div>
              <div className="text-2xl font-black text-emerald-400">€{transferBudget}M</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">نقاط المدرب (المكافآت)</div>
              <div className="text-2xl font-black text-amber-400 flex items-center gap-1">
                <span>🌟</span>
                <span>{managerPoints}</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">الرواتب الأسبوعية</div>
              <div className="text-xl font-bold text-slate-200">€{wageBudget}K / أسبوع</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">عدد لاعبي الفريق</div>
              <div className="text-xl font-bold text-blue-400">{userTeam.squad.length} لاعباً</div>
            </div>
          </div>
        )}

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-bold animate-fadeIn shrink-0 ${
              feedbackMsg.isSuccess
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            {feedbackMsg.isSuccess ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Tabs Bar */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            {!isNational && (
              <button
                onClick={() => setActiveTab('BUY')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'BUY'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>سوق الشراء المتاح</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('MY_SQUAD')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'MY_SQUAD'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>{isNational ? 'قائمتي الحالية' : 'قائمتي والعقود والبيع'}</span>
            </button>
          </div>

          {/* Filters & Search */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
              <input
                type="text"
                placeholder="بحث عن لاعب..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-800/90 border border-slate-700 rounded-xl pr-8 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-36 sm:w-48"
              />
            </div>

            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">كل المراكز</option>
              <option value="FWD">هجوم (ST, RW, LW)</option>
              <option value="MID">وسط (CM, CAM, CDM)</option>
              <option value="DEF">دفاع (CB, LB, RB)</option>
              <option value="GK">حراسة المرمى</option>
            </select>
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {activeTab === 'BUY' && !isNational && (
            <div className="space-y-2">
              {filteredMarket.slice(0, 35).map(({ player, club }) => (
                <div
                  key={player.id}
                  className="bg-slate-800/60 hover:bg-slate-800 p-3 rounded-2xl border border-slate-700/60 transition flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-xs font-black text-amber-400 shrink-0">
                      {player.rating}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white truncate">{player.nameAr}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700 shrink-0">
                          {player.position}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {club.nameAr} • {player.age} سنة • سرعة {player.pace} • تمرير {player.passing} • هجوم {player.attack}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2.5 shrink-0">
                    <div className="text-left">
                      <div className="text-xs font-black text-emerald-400">€{player.marketValue || 25}M</div>
                      <div className="text-[10px] font-bold text-amber-400">
                        🌟 {CoachEcosystemService.calculatePlayerPointPrice(player.rating)} نقطة
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleBuyPlayer(player, club)}
                        disabled={!windowStatus.isOpen}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/40 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-500/20 disabled:hover:text-emerald-300"
                        title={windowStatus.isOpen ? 'شراء بأموال النادي' : windowStatus.labelAr}
                      >
                        <UserPlus className="w-3 h-3" />
                        <span>شراء بالمال</span>
                      </button>

                      <button
                        onClick={() => handleBuyPlayerWithPoints(player, club)}
                        disabled={!windowStatus.isOpen}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-amber-500/20 disabled:hover:text-amber-300"
                        title={windowStatus.isOpen ? 'ضم اللاعب برصيد نقاط المدرب' : windowStatus.labelAr}
                      >
                        <Award className="w-3 h-3" />
                        <span>ضم بالنقاط</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'MY_SQUAD' && (
            <div className="space-y-2">
              {userTeam.squad.map((player) => (
                <div
                  key={player.id}
                  className="bg-slate-800/60 hover:bg-slate-800 p-3 rounded-2xl border border-slate-700/60 transition flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-xs font-black text-amber-400 shrink-0">
                      {player.rating}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white truncate">{player.nameAr}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700 shrink-0">
                          {player.position}
                        </span>
                        {player.injuryStatus && player.injuryStatus.weeksRemaining > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                            مصاب ({player.injuryStatus.weeksRemaining} أسبوع)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {player.age} سنة • لياقة {player.fitness}% • معنويات {player.morale || 85}% • عقد باقي: {player.contractYears || 2} مواسم
                      </div>
                    </div>
                  </div>

                  {!isNational && (
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-left pl-2 hidden sm:block">
                        <div className="text-xs font-bold text-slate-300">القيمة: €{player.marketValue || 20}M</div>
                      </div>

                      <button
                        onClick={() => handleRenewContract(player)}
                        title="تجديد العقد لموسمين إضافيين"
                        className="px-2.5 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-semibold transition flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        <span className="hidden sm:inline">تجديد</span>
                      </button>

                      <button
                        onClick={() => handleSellPlayer(player)}
                        disabled={!windowStatus.isOpen}
                        title={windowStatus.isOpen ? 'بيع اللاعب إلى نادٍ آخر' : windowStatus.labelAr}
                        className="px-2.5 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/30 text-xs font-semibold transition flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-500/20 disabled:hover:text-red-300"
                      >
                        <UserMinus className="w-3 h-3" />
                        <span className="hidden sm:inline">بيع</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
