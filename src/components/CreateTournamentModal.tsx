// ============================================================
// العبها صح | EL3BHA SA7 - Smart Tournament Creation Wizard & Team Intelligence
// Supports: Available Real Clubs, Custom Team Creation, AI Auto-Fill,
// Responsive Mobile/Desktop Scrolling, and Intelligent Capacity Verification
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Users,
  Bot,
  Sparkles,
  Lock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Coins,
  Medal,
  HelpCircle,
  Swords,
  Layers,
  Flame,
  Gavel,
  EyeOff,
  BrainCircuit,
  Sliders,
  Plus,
  Trash2,
  Dices,
  Zap,
  Search,
  ShieldAlert,
  ShieldCheck,
  Star
} from 'lucide-react';
import { UserProfile } from '../types';
import { TournamentGameId, TournamentType, TournamentEntity, TournamentParticipant } from '../types/tournamentTypes';
import { TournamentEngineService } from '../services/tournamentEngineService';
import { audioManager } from '../services/audioManager';

interface CreateTournamentModalProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onTournamentCreated: (tournament: TournamentEntity) => void;
}

// Available Real World Football Clubs for Tournament Selection
export interface AvailableClub {
  id: string;
  nameAr: string;
  nameEn: string;
  countryAr: string;
  badgeEmoji: string;
  category: 'EUROPE' | 'ARAB' | 'LATIN';
  primaryColor: string;
  stars: number;
  captainAr: string;
  avatar: string;
}

export const REAL_FOOTBALL_CLUBS: AvailableClub[] = [
  {
    id: 'real_madrid',
    nameAr: 'ريال مدريد',
    nameEn: 'Real Madrid',
    countryAr: 'إسبانيا',
    badgeEmoji: '👑',
    category: 'EUROPE',
    primaryColor: 'from-amber-500/20 to-zinc-900',
    stars: 5,
    captainAr: 'لوكا مودريتش',
    avatar: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'barcelona',
    nameAr: 'برشلونة',
    nameEn: 'FC Barcelona',
    countryAr: 'إسبانيا',
    badgeEmoji: '🔵🔴',
    category: 'EUROPE',
    primaryColor: 'from-blue-600/20 to-red-600/20',
    stars: 5,
    captainAr: 'تير شتيغن',
    avatar: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'man_city',
    nameAr: 'مانشستر سيتي',
    nameEn: 'Manchester City',
    countryAr: 'إنجلترا',
    badgeEmoji: '🩵',
    category: 'EUROPE',
    primaryColor: 'from-sky-500/20 to-zinc-900',
    stars: 5,
    captainAr: 'كيفين دي بروين',
    avatar: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'liverpool',
    nameAr: 'ليفربول',
    nameEn: 'Liverpool FC',
    countryAr: 'إنجلترا',
    badgeEmoji: '🔴',
    category: 'EUROPE',
    primaryColor: 'from-red-600/20 to-zinc-900',
    stars: 5,
    captainAr: 'محمد صلاح',
    avatar: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'bayern',
    nameAr: 'بايرن ميونخ',
    nameEn: 'Bayern Munich',
    countryAr: 'ألمانيا',
    badgeEmoji: '🔴⚪',
    category: 'EUROPE',
    primaryColor: 'from-red-500/20 to-zinc-900',
    stars: 5,
    captainAr: 'مانويل نوير',
    avatar: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'arsenal',
    nameAr: 'أرسنال',
    nameEn: 'Arsenal FC',
    countryAr: 'إنجلترا',
    badgeEmoji: '🔴⚪',
    category: 'EUROPE',
    primaryColor: 'from-red-600/20 to-zinc-900',
    stars: 5,
    captainAr: 'مارتن أوديغارد',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'psg',
    nameAr: 'باريس سان جيرمان',
    nameEn: 'Paris Saint-Germain',
    countryAr: 'فرنسا',
    badgeEmoji: '🔵🔴',
    category: 'EUROPE',
    primaryColor: 'from-blue-600/20 to-zinc-900',
    stars: 4.5,
    captainAr: 'ماركينيوس',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'inter_milan',
    nameAr: 'إنتر ميلان',
    nameEn: 'Inter Milan',
    countryAr: 'إيطاليا',
    badgeEmoji: '🔵⚫',
    category: 'EUROPE',
    primaryColor: 'from-blue-700/20 to-zinc-900',
    stars: 4.5,
    captainAr: 'لاوتارو مارتينيز',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'ac_milan',
    nameAr: 'إيه سي ميلان',
    nameEn: 'AC Milan',
    countryAr: 'إيطاليا',
    badgeEmoji: '🔴⚫',
    category: 'EUROPE',
    primaryColor: 'from-red-700/20 to-zinc-900',
    stars: 4.5,
    captainAr: 'تيو هيرنانديز',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'juventus',
    nameAr: 'يوفنتوس',
    nameEn: 'Juventus',
    countryAr: 'إيطاليا',
    badgeEmoji: '⚪⚫',
    category: 'EUROPE',
    primaryColor: 'from-zinc-500/20 to-zinc-900',
    stars: 4.5,
    captainAr: 'دانيلو',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'al_ahly',
    nameAr: 'الأهلي المصري',
    nameEn: 'Al Ahly SC',
    countryAr: 'مصر',
    badgeEmoji: '🦅',
    category: 'ARAB',
    primaryColor: 'from-red-600/20 to-amber-500/10',
    stars: 5,
    captainAr: 'محمد الشناوي',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'zamalek',
    nameAr: 'الزمالك المصري',
    nameEn: 'Zamalek SC',
    countryAr: 'مصر',
    badgeEmoji: '🏹',
    category: 'ARAB',
    primaryColor: 'from-zinc-100/20 to-red-500/10',
    stars: 4.5,
    captainAr: 'محمود شيكابالا',
    avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'al_hilal',
    nameAr: 'الهلال السعودي',
    nameEn: 'Al Hilal SFC',
    countryAr: 'السعودية',
    badgeEmoji: '💙',
    category: 'ARAB',
    primaryColor: 'from-blue-600/20 to-blue-900/20',
    stars: 5,
    captainAr: 'سالم الدوسري',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'al_nassr',
    nameAr: 'النصر السعودي',
    nameEn: 'Al Nassr FC',
    countryAr: 'السعودية',
    badgeEmoji: '💛',
    category: 'ARAB',
    primaryColor: 'from-yellow-500/20 to-blue-600/10',
    stars: 5,
    captainAr: 'كريستيانو رونالدو',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'al_ittihad',
    nameAr: 'الاتحاد السعودي',
    nameEn: 'Al Ittihad',
    countryAr: 'السعودية',
    badgeEmoji: '🐅',
    category: 'ARAB',
    primaryColor: 'from-yellow-500/20 to-zinc-900',
    stars: 4.5,
    captainAr: 'كريم بنزيما',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'esperance',
    nameAr: 'الترجي التونسي',
    nameEn: 'Esperance ST',
    countryAr: 'تونس',
    badgeEmoji: '🔴🟡',
    category: 'ARAB',
    primaryColor: 'from-red-600/20 to-yellow-500/20',
    stars: 4.5,
    captainAr: 'ياسين مرياح',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'wydad',
    nameAr: 'الوداد البيضاوي',
    nameEn: 'Wydad AC',
    countryAr: 'المغرب',
    badgeEmoji: '🔴⚪',
    category: 'ARAB',
    primaryColor: 'from-red-600/20 to-zinc-900',
    stars: 4.5,
    captainAr: 'يحيى جبران',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'raja',
    nameAr: 'الرجاء الرياضي',
    nameEn: 'Raja CA',
    countryAr: 'المغرب',
    badgeEmoji: '🟢⚪',
    category: 'ARAB',
    primaryColor: 'from-emerald-600/20 to-zinc-900',
    stars: 4.5,
    captainAr: 'أنس الزنيتي',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'
  }
];

const AVAILABLE_GAMES = [
  {
    id: 'AUCTION' as TournamentGameId,
    nameAr: 'المزاد',
    descriptionAr: 'زايد وكوّن فريقك.',
    icon: <Gavel className="w-5 h-5 text-amber-400" />,
    badgeText: 'كلاسيك وبرو ماكس',
    modes: [
      { id: '100M', labelAr: 'كلاسيك (100M)', descAr: 'خماسي تكتيكي سريع بميزانية 100 مليون.' },
      { id: '200M', labelAr: 'برو ماكس (200M)', descAr: '11 لاعب تشكيلة كاملة بميزانية 200 مليون.' }
    ]
  },
  {
    id: 'PLAYER_OR_HIDDEN' as TournamentGameId,
    nameAr: 'تاخد اللاعب ده ولا اللاعب الخفي؟',
    descriptionAr: 'خد ولا تخاطر.',
    icon: <EyeOff className="w-5 h-5 text-purple-400" />,
    badgeText: 'تشكيلة واستاد',
    modes: [
      { id: '5_PLAYERS', labelAr: 'خماسي تكتيكي (5 لاعبين)', descAr: 'بناء تشكيلة خماسية متطابقة المراكز مع مدرب.' },
      { id: '11_PLAYERS', labelAr: 'محترف كامل (11 لاعب)', descAr: 'بناء 11 لاعب واستاد محاكاة للمباراة الحقيقية.' }
    ]
  },
  {
    id: 'HOARTAGY_HUNTER' as TournamentGameId,
    nameAr: 'الحوارتجي والصياد',
    descriptionAr: 'اسأل واعرف بيحور ولا لأ.',
    icon: <Flame className="w-5 h-5 text-rose-400" />,
    badgeText: '5 أسئلة حاسمة',
    modes: [
      { id: 'STANDARD', labelAr: 'المواجهة الكلاسيكية', descAr: '5 جولات استنطاق كروي حاسم.' }
    ]
  },
  {
    id: 'SAFI' as TournamentGameId,
    nameAr: 'صفّي (التصفية التكتيكية)',
    descriptionAr: 'صفّي واكشفه.',
    icon: <Swords className="w-5 h-5 text-emerald-400" />,
    badgeText: 'استبعاد ذكي',
    modes: [
      { id: 'KNOCKOUT_FILTER', labelAr: 'التصفية الإقصائية', descAr: 'استبعاد سريع ضد ساعة التوقيت.' }
    ]
  },
  {
    id: 'DEAL_OR_NO_DEAL' as TournamentGameId,
    nameAr: 'ديل أو نو ديل',
    descriptionAr: 'افتح الصناديق وكوّن تشكيلتك.',
    icon: <Gavel className="w-5 h-5 text-emerald-400" />,
    badgeText: 'مدة تفكير ثابتة لكل الماتشات',
    // هنا "الأوضاع" هي مدة التفكير في كل قرار — بتتحدد مرة واحدة هنا
    // وكل ماتشات البطولة بتبدأ بيها على طول من غير ما تتسأل تاني.
    modes: [
      { id: '10', labelAr: '10 ثواني للقرار', descAr: 'إيقاع سريع جداً.' },
      { id: '15', labelAr: '15 ثانية للقرار', descAr: 'الافتراضي المتوازن.' },
      { id: '20', labelAr: '20 ثانية للقرار', descAr: 'وقت مريح أكتر شوية.' },
      { id: '30', labelAr: '30 ثانية للقرار', descAr: 'تفكير هادئ لكل خطوة.' }
    ]
  }
];

export const CreateTournamentModal: React.FC<CreateTournamentModalProps> = ({
  user,
  isOpen,
  onClose,
  onTournamentCreated
}) => {
  const [step, setStep] = useState<number>(1);
  const [isAiTournament, setIsAiTournament] = useState<boolean>(false);
  const [selectedGameId, setSelectedGameId] = useState<TournamentGameId>('AUCTION');
  const [selectedModeId, setSelectedModeId] = useState<string>('100M');
  const [tournamentType, setTournamentType] = useState<TournamentType>('INDIVIDUAL');
  const [capacity, setCapacity] = useState<4 | 8 | 16 | 32>(8);
  const [tournamentName, setTournamentName] = useState<string>('كأس السوبر الذهبي');
  const [description, setDescription] = useState<string>('أقوى منافسة بنظام خروج المغلوب والمطابقة الصارمة للمراكز.');
  const [prizeCoins, setPrizeCoins] = useState<number>(5000);
  const [aiDifficulty, setAiDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT'>('HARD');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);

  // Smart Team Selection State
  const [selectedTeams, setSelectedTeams] = useState<TournamentParticipant[]>([]);
  const [customTeamName, setCustomTeamName] = useState<string>('');
  const [customCaptainName, setCustomCaptainName] = useState<string>('');
  const [clubCategoryFilter, setClubCategoryFilter] = useState<'ALL' | 'EUROPE' | 'ARAB'>('ALL');
  const [clubSearchQuery, setClubSearchQuery] = useState<string>('');

  // Lock body scroll cleanly on open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Initialize Host Participant as Team 1
  useEffect(() => {
    if (isOpen && selectedTeams.length === 0) {
      const hostParticipant: TournamentParticipant = {
        id: user.id,
        name: user.favoriteClub ? `${user.favoriteClub} (${user.nameAr || user.username})` : (user.nameAr || user.username),
        avatar: user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        isHost: true,
        isTeam: tournamentType === 'TEAM',
        teamCaptain: user.nameAr || user.username,
        badgeEmoji: '👑',
        rating: user.rating || 1500
      };
      setSelectedTeams([hostParticipant]);
    }
  }, [isOpen, user, tournamentType]);

  if (!isOpen) return null;

  const currentGame = AVAILABLE_GAMES.find((g) => g.id === selectedGameId) || AVAILABLE_GAMES[0];
  const currentMode = currentGame.modes.find((m) => m.id === selectedModeId) || currentGame.modes[0];

  const missingTeamsCount = Math.max(0, capacity - selectedTeams.length);

  // Smart Actions: Auto-Fill Missing Slots with Real Clubs (AI)
  const handleSmartAutoFill = () => {
    audioManager.playClick();
    const updated = [...selectedTeams];
    const availablePool = REAL_FOOTBALL_CLUBS.filter(
      (club) => !updated.some((t) => t.clubId === club.id || t.name.includes(club.nameAr))
    );

    let poolIdx = 0;
    while (updated.length < capacity && poolIdx < availablePool.length) {
      const club = availablePool[poolIdx];
      updated.push({
        id: `team_club_${club.id}_${Date.now()}_${poolIdx}`,
        name: club.nameAr,
        avatar: club.avatar,
        isTeam: true,
        clubId: club.id,
        teamCaptain: club.captainAr,
        badgeEmoji: club.badgeEmoji,
        isAi: isAiTournament || true,
        rating: 1500 + Math.floor(club.stars * 35)
      });
      poolIdx++;
    }

    setSelectedTeams(updated);
    setErrorMsg(null);
  };

  // Smart Action: Randomize All Teams
  const handleSmartRandomize = () => {
    audioManager.playClick();
    const hostTeam: TournamentParticipant = {
      id: user.id,
      name: user.favoriteClub || (user.nameAr || user.username),
      avatar: user.avatar,
      isHost: true,
      isTeam: true,
      teamCaptain: user.nameAr || user.username,
      badgeEmoji: '👑',
      rating: user.rating || 1500
    };

    const shuffled = [...REAL_FOOTBALL_CLUBS].sort(() => Math.random() - 0.5);
    const newTeams: TournamentParticipant[] = [hostTeam];

    for (let i = 0; i < capacity - 1 && i < shuffled.length; i++) {
      const club = shuffled[i];
      newTeams.push({
        id: `rand_team_${club.id}_${Date.now()}_${i}`,
        name: club.nameAr,
        avatar: club.avatar,
        isTeam: true,
        clubId: club.id,
        teamCaptain: club.captainAr,
        badgeEmoji: club.badgeEmoji,
        isAi: isAiTournament,
        rating: 1500 + Math.floor(club.stars * 30)
      });
    }

    setSelectedTeams(newTeams);
    setErrorMsg(null);
  };

  // Add Custom Team
  const handleAddCustomTeam = () => {
    if (!customTeamName.trim()) {
      setErrorMsg('اكتب اسم الفريق الأول!');
      return;
    }

    if (selectedTeams.length >= capacity) {
      setErrorMsg(`لقد بلغت السعة القصوى للبطولة (${capacity} فرق)! قم بزيادة السعة أو حذف فريق.`);
      return;
    }

    audioManager.playClick();
    const newCustomTeam: TournamentParticipant = {
      id: `custom_team_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: customTeamName.trim(),
      avatar: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=120&auto=format&fit=crop&q=80',
      isTeam: true,
      teamCaptain: customCaptainName.trim() || 'كابتن الفريق',
      badgeEmoji: '⚽',
      isAi: isAiTournament,
      rating: 1520
    };

    setSelectedTeams([...selectedTeams, newCustomTeam]);
    setCustomTeamName('');
    setCustomCaptainName('');
    setErrorMsg(null);
  };

  // Toggle Selection of an Available Real Club
  const handleToggleClub = (club: AvailableClub) => {
    audioManager.playClick();
    const existingIndex = selectedTeams.findIndex(
      (t) => t.clubId === club.id || t.name === club.nameAr
    );

    if (existingIndex > -1) {
      // Remove
      if (selectedTeams[existingIndex].isHost) {
        setErrorMsg('مش ممكن حذف الفريق الأساسي لمضيف البطولة!');
        return;
      }
      const updated = selectedTeams.filter((_, idx) => idx !== existingIndex);
      setSelectedTeams(updated);
      setErrorMsg(null);
    } else {
      // Add
      if (selectedTeams.length >= capacity) {
        setErrorMsg(`اكتملت سعة الفرق (${capacity} فرق)! اضغط متابعة أو احذف فريقاً.`);
        return;
      }

      const newTeam: TournamentParticipant = {
        id: `club_team_${club.id}_${Date.now()}`,
        name: club.nameAr,
        avatar: club.avatar,
        isTeam: true,
        clubId: club.id,
        teamCaptain: club.captainAr,
        badgeEmoji: club.badgeEmoji,
        isAi: isAiTournament,
        rating: 1500 + Math.floor(club.stars * 35)
      };

      setSelectedTeams([...selectedTeams, newTeam]);
      setErrorMsg(null);
    }
  };

  // Remove a Team
  const handleRemoveTeam = (index: number) => {
    if (selectedTeams[index].isHost) {
      setErrorMsg('مش ممكن حذف الفريق المضيف!');
      return;
    }
    audioManager.playClick();
    setSelectedTeams(selectedTeams.filter((_, idx) => idx !== index));
  };

  const handleNext = () => {
    setErrorMsg(null);
    audioManager.playClick();

    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (!currentGame.modes.some((m) => m.id === selectedModeId)) {
        setSelectedModeId(currentGame.modes[0].id);
      }
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    } else if (step === 4) {
      // Step 4: Validate Capacity and Teams
      if (selectedTeams.length < capacity) {
        // Auto-complete or alert
        handleSmartAutoFill();
      }
      setStep(5);
    } else if (step === 5) {
      if (!tournamentName.trim()) {
        setErrorMsg('اكتب اسم حلو للبطولة!');
        return;
      }
      setStep(6);
    }
  };

  const handleBack = () => {
    setErrorMsg(null);
    audioManager.playClick();
    if (step > 1) {
      setStep(step - 1);
    } else {
      setShowExitConfirm(true);
    }
  };

  const handleSafeClose = () => {
    if (step > 1) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };

  const handleCreateConfirm = () => {
    try {
      audioManager.playWhistle();

      // Ensure full capacity is reached with smart auto-fill if any slot was empty
      let finalParticipants = [...selectedTeams];
      if (finalParticipants.length < capacity) {
        const availablePool = REAL_FOOTBALL_CLUBS.filter(
          (club) => !finalParticipants.some((t) => t.clubId === club.id || t.name.includes(club.nameAr))
        );
        let poolIdx = 0;
        while (finalParticipants.length < capacity && poolIdx < availablePool.length) {
          const club = availablePool[poolIdx];
          finalParticipants.push({
            id: `team_auto_${club.id}_${Date.now()}_${poolIdx}`,
            name: club.nameAr,
            avatar: club.avatar,
            isTeam: true,
            clubId: club.id,
            teamCaptain: club.captainAr,
            badgeEmoji: club.badgeEmoji,
            isAi: true,
            rating: 1500 + Math.floor(club.stars * 35)
          });
          poolIdx++;
        }
      }

      const newTour = TournamentEngineService.createTournament({
        name: tournamentName,
        gameId: selectedGameId,
        gameNameAr: currentGame.nameAr,
        gameMode: selectedModeId,
        gameModeLabelAr: currentMode.labelAr,
        turnSeconds: selectedGameId === 'DEAL_OR_NO_DEAL' ? parseInt(selectedModeId, 10) : undefined,
        type: tournamentType,
        capacity,
        descriptionAr: description,
        prizePoolCoins: prizeCoins,
        prizePoolPoints: 100,
        creator: user,
        customParticipants: finalParticipants,
        isAiTournament,
        aiDifficulty
      });

      onTournamentCreated(newTour);
      onClose();
    } catch (err) {
      setErrorMsg('حصل خطأ وإحنا بننشئ البطولة، جرب تاني.');
    }
  };

  const filteredClubs = REAL_FOOTBALL_CLUBS.filter((club) => {
    const matchesCategory = clubCategoryFilter === 'ALL' || club.category === clubCategoryFilter;
    const matchesQuery =
      !clubSearchQuery.trim() ||
      club.nameAr.includes(clubSearchQuery.trim()) ||
      club.nameEn.toLowerCase().includes(clubSearchQuery.toLowerCase()) ||
      club.countryAr.includes(clubSearchQuery.trim());
    return matchesCategory && matchesQuery;
  });

  const totalSteps = 6;

  return (
    <div
      id="create_tournament_modal_overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden"
      dir="rtl"
    >
      {/* Modal Dialog Card Container with strictly bounded height and guaranteed scrolling */}
      <div
        id="create_tournament_modal_card"
        className="relative w-full max-w-3xl h-[92vh] sm:h-auto sm:max-h-[88vh] bg-gradient-to-b from-zinc-900 via-zinc-950 to-black border border-amber-500/40 rounded-3xl shadow-[0_0_60px_rgba(245,158,11,0.25)] text-white flex flex-col min-h-0 overflow-hidden"
      >
        {/* 1. TOP HEADER (Fixed, Non-Shrinking) */}
        <header className="p-3.5 sm:p-5 border-b border-zinc-800 flex items-center justify-between flex-shrink-0 bg-zinc-950/95 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500 flex items-center justify-center text-amber-400 font-black shadow-md">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-amber-400 flex items-center gap-2">
                <span>إنشاء بطولة كبرى 🏆</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 font-mono">
                  {capacity} فرق
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                الخطوة {step} من {totalSteps}:{' '}
                {step === 1 && 'نوع المنافسة (AI أو لاعبين)'}
                {step === 2 && 'اختيار اللعبة المقفلة'}
                {step === 3 && 'نمط وتكتيك اللعبة'}
                {step === 4 && 'الفرق الذكية وسعة البطولة'}
                {step === 5 && 'اسم البطولة والجوائز'}
                {step === 6 && 'مراجعة وتأكيد القرعة 🏆'}
              </p>
            </div>
          </div>

          <button
            onClick={handleSafeClose}
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
          >
            ✕
          </button>
        </header>

        {/* 2. PROGRESS BAR (Fixed) */}
        <div className="grid grid-cols-6 gap-1 px-4 sm:px-5 py-2 bg-zinc-950 flex-shrink-0 border-b border-zinc-800/60">
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s <= step ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'bg-zinc-800'
              }`}
            />
          ))}
        </div>

        {/* 3. ERROR MSG BANNER (Fixed when visible) */}
        {errorMsg && (
          <div className="mx-4 mt-2.5 p-2.5 bg-rose-500/20 border border-rose-500/50 rounded-xl text-xs text-rose-300 flex items-center gap-2 flex-shrink-0">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 4. SCROLLABLE INTERNAL CONTENT AREA (Guaranteed scroll on any screen size) */}
        <main className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-6 space-y-5 min-h-0">
          
          {/* STEP 1: Method Choice (Players vs AI) */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <span className="inline-block px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-black">
                  اختار طريقة البطولة
                </span>
                <h3 className="text-base sm:text-xl font-black text-white">
                  مع من تريد خوض منافسات الكأس؟
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAiTournament(false);
                    audioManager.playClick();
                  }}
                  className={`p-4 sm:p-5 rounded-2xl border-2 text-right transition-all flex flex-col justify-between space-y-3 cursor-pointer ${
                    !isAiTournament
                      ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/30 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                      : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Users className="w-6 h-6" />
                    </div>
                    {!isAiTournament && <CheckCircle2 className="w-5 h-5 text-amber-400" />}
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-black text-white">👥 مع لاعبين حقيقيين (أونلاين)</h4>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      بطولة مفتوحة ينضم إليها لاعبون ومنافسون حقيقيون للتنافس بنظام خروج المغلوب.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAiTournament(true);
                    audioManager.playClick();
                  }}
                  className={`p-4 sm:p-5 rounded-2xl border-2 text-right transition-all flex flex-col justify-between space-y-3 cursor-pointer ${
                    isAiTournament
                      ? 'bg-purple-500/15 border-purple-400 ring-2 ring-purple-400/30 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                      : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                      <Bot className="w-6 h-6" />
                    </div>
                    {isAiTournament && <CheckCircle2 className="w-5 h-5 text-purple-400" />}
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-black text-white">🤖 مع AI (الذكاء الاصطناعي التكتيكي)</h4>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      بطولة فورية مع كبار المدربين والأندية العالمية الذكية وقرعة فورية مباشرة.
                    </p>
                  </div>
                </button>
              </div>

              {isAiTournament && (
                <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-2xl space-y-2">
                  <span className="text-xs font-bold text-purple-300 block">مستوى صعوبة وتكتيك الذكاء الاصطناعي:</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'EASY', label: 'سهل' },
                      { id: 'MEDIUM', label: 'متوسط' },
                      { id: 'HARD', label: 'صعب' },
                      { id: 'EXPERT', label: 'خبير 🔥' }
                    ].map((diff) => (
                      <button
                        key={diff.id}
                        type="button"
                        onClick={() => {
                          setAiDifficulty(diff.id as any);
                          audioManager.playClick();
                        }}
                        className={`py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                          aiDifficulty === diff.id
                            ? 'bg-purple-500 text-white shadow-md'
                            : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                        }`}
                      >
                        {diff.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Game Selection */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>اختار اللعبة الأساسية المقفلة لكل مواجهات البطولة:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {AVAILABLE_GAMES.map((game) => (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => {
                      setSelectedGameId(game.id);
                      setSelectedModeId(game.modes[0].id);
                      audioManager.playClick();
                    }}
                    className={`p-3.5 rounded-2xl border text-right transition-all flex items-start gap-3 cursor-pointer ${
                      selectedGameId === game.id
                        ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/30'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">
                      {game.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs sm:text-sm font-black text-white truncate">{game.nameAr}</h4>
                        {selectedGameId === game.id && <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">{game.descriptionAr}</p>
                      <span className="inline-block mt-1.5 px-2 py-0.5 rounded bg-zinc-800 text-amber-300 text-[9px] font-bold">
                        {game.badgeText}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Game Mode Selection */}
          {step === 3 && (
            <div className="space-y-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>الأنماط المتوافقة مع ({currentGame.nameAr}):</span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {currentGame.modes.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      setSelectedModeId(mode.id);
                      audioManager.playClick();
                    }}
                    className={`p-4 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                      selectedModeId === mode.id
                        ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/30'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <h4 className="text-sm font-black text-white">{mode.labelAr}</h4>
                      <p className="text-xs text-zinc-400 mt-1">{mode.descAr}</p>
                    </div>
                    {selectedModeId === mode.id && <CheckCircle2 className="w-5 h-5 text-amber-400 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Smart Team Selection & Capacity Intelligence */}
          {step === 4 && (
            <div className="space-y-5">
              {/* 1. Capacity & Type Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Competition Type */}
                <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-2xl space-y-2">
                  <span className="text-xs font-bold text-zinc-400 block">طبيعة المنافسة:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTournamentType('INDIVIDUAL');
                        audioManager.playClick();
                      }}
                      className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all ${
                        tournamentType === 'INDIVIDUAL'
                          ? 'bg-amber-400 text-zinc-950 border-amber-300 shadow-sm'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                      }`}
                    >
                      فردية (لاعب واحد)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTournamentType('TEAM');
                        audioManager.playClick();
                      }}
                      className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all ${
                        tournamentType === 'TEAM'
                          ? 'bg-amber-400 text-zinc-950 border-amber-300 shadow-sm'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                      }`}
                    >
                      أندية وفرق (Teams)
                    </button>
                  </div>
                </div>

                {/* Capacity Selector (4, 8, 16, 32) */}
                <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-2xl space-y-2">
                  <span className="text-xs font-bold text-zinc-400 block">عدد الفرق وسعة البطولة:</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[4, 8, 16, 32].map((cap) => (
                      <button
                        key={cap}
                        type="button"
                        onClick={() => {
                          setCapacity(cap as any);
                          audioManager.playClick();
                        }}
                        className={`py-2 px-1 rounded-xl border text-center transition-all ${
                          capacity === cap
                            ? 'bg-amber-400 text-zinc-950 font-black border-amber-300 shadow-md'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                        }`}
                      >
                        <span className="text-sm font-black block">{cap}</span>
                        <span className="text-[9px] font-bold block">{cap === 4 ? 'نصف نهائي' : 'فرق'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Intelligent Capacity Tracker & Real-Time Intelligence Alert */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border border-amber-500/30 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <h4 className="text-xs sm:text-sm font-black text-white">النظام الذكي لإدارة ومتابعة مقاعد الفرق</h4>
                  </div>
                  
                  {/* Quick Smart Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleSmartAutoFill}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="إكمال المقاعد الناقصة تلقائياً بأقوى الأندية"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>إكمال ذكي تلقائي</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSmartRandomize}
                      className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="توليد قرعة عشوائية متوازنة"
                    >
                      <Dices className="w-3.5 h-3.5" />
                      <span>قرعة ذكية</span>
                    </button>
                  </div>
                </div>

                {/* Status Progress & Intelligence Alert */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block">السعة المطلوبة</span>
                    <span className="text-sm font-black text-white">{capacity} فرق</span>
                  </div>
                  <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block">المحددة حالياً</span>
                    <span className="text-sm font-black text-amber-400">{selectedTeams.length} فرق</span>
                  </div>
                  <div className={`p-2 rounded-xl border ${missingTeamsCount === 0 ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/30 border-rose-500/40 text-rose-300'}`}>
                    <span className="text-[10px] text-zinc-400 block">الفرق الناقصة</span>
                    <span className="text-sm font-black">{missingTeamsCount === 0 ? 'مكتملة ✅' : `${missingTeamsCount} فرق`}</span>
                  </div>
                </div>

                {/* Real-time Assistant Banner */}
                {missingTeamsCount === 0 ? (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                    <span>تم تحديد واكتمال كل مقاعد البطولة ({capacity} فرق) بنجاح! جاهز للقرعة المباشرة.</span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0 text-amber-400" />
                    <span>النظام الذكي: ينقصك <strong>{missingTeamsCount} فرق</strong>. اختار من الأندية المتاحة أدناه أو اكتب فريقاً مخصصاً أو اضغط (إكمال ذكي تلقائي).</span>
                  </div>
                )}
              </div>

              {/* 3. Add Custom Team Option */}
              <div className="p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-2xl space-y-2.5">
                <span className="text-xs font-bold text-zinc-300 flex items-center gap-1">
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>كتابة وإضافة فريق مخصص:</span>
                </span>
                
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <input
                    type="text"
                    value={customTeamName}
                    onChange={(e) => setCustomTeamName(e.target.value)}
                    placeholder="اسم الفريق المخصص (مثال: ملوك التكتيك، فرسان الصعيد)"
                    className="flex-1 w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={customCaptainName}
                    onChange={(e) => setCustomCaptainName(e.target.value)}
                    placeholder="اسم الكابتن أو المدرب (اختياري)"
                    className="w-full sm:w-48 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTeam}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer flex-shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة الفريق</span>
                  </button>
                </div>
              </div>

              {/* 4. Choose From Available Real Clubs Library */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-zinc-300">اختار من الأندية والفرق الرسمية المتاحة:</span>
                  
                  {/* Category Filter */}
                  <div className="flex items-center gap-1">
                    {[
                      { id: 'ALL', label: 'الكل' },
                      { id: 'EUROPE', label: 'أوروبا 🌍' },
                      { id: 'ARAB', label: 'العرب 🦅' }
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setClubCategoryFilter(cat.id as any)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                          clubCategoryFilter === cat.id
                            ? 'bg-amber-400 text-zinc-950'
                            : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search in Clubs */}
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-500 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={clubSearchQuery}
                    onChange={(e) => setClubSearchQuery(e.target.value)}
                    placeholder="ابحث عن نادٍ (ريال مدريد، الأهلي، مانشستر سيتي...)"
                    className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>

                {/* Clubs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-zinc-700">
                  {filteredClubs.map((club) => {
                    const isSelected = selectedTeams.some(
                      (t) => t.clubId === club.id || t.name === club.nameAr
                    );
                    return (
                      <button
                        key={club.id}
                        type="button"
                        onClick={() => handleToggleClub(club)}
                        className={`p-2 rounded-xl border text-right transition-all flex items-center justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 ring-1 ring-amber-400/40 text-white'
                            : 'bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base flex-shrink-0">{club.badgeEmoji}</span>
                          <div className="truncate">
                            <span className="text-xs font-bold block truncate">{club.nameAr}</span>
                            <span className="text-[10px] text-zinc-400 block truncate">{club.countryAr}</span>
                          </div>
                        </div>
                        {isSelected ? (
                          <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        ) : (
                          <Plus className="w-4 h-4 text-zinc-500 flex-shrink-0 hover:text-white" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Confirmed Tournament Teams List */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <span className="text-xs font-bold text-zinc-400 block">
                  قائمة الفرق المعتمدة في البطولة ({selectedTeams.length}/{capacity}):
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedTeams.map((team, idx) => (
                    <div
                      key={team.id}
                      className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-zinc-800 text-[10px] text-amber-400 font-mono font-bold flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <img
                          src={team.avatar}
                          alt={team.name}
                          className="w-7 h-7 rounded-lg object-cover border border-zinc-700 flex-shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="truncate">
                          <span className="text-xs font-bold text-white block truncate">
                            {team.badgeEmoji} {team.name}
                          </span>
                          <span className="text-[10px] text-zinc-400 block truncate">
                            {team.isHost ? '👑 فريقك المضيف' : `الكابتن: ${team.teamCaptain || 'غير محدد'}`}
                          </span>
                        </div>
                      </div>

                      {!team.isHost && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTeam(idx)}
                          className="p-1 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                          title="حذف الفريق"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Name & Settings */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-400 block mb-1">اسم البطولة الرسمي:</label>
                <input
                  type="text"
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  placeholder="مثال: كأس السوبر الذهبي 2026"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-3 text-sm text-white font-bold focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-400 block mb-1">وصف وقوانين البطولة:</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl p-3 text-xs text-white focus:border-amber-400 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-400 block mb-1">جائزة الكوينز للبطل 🪙:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[3000, 5000, 10000].map((coins) => (
                    <button
                      key={coins}
                      type="button"
                      onClick={() => setPrizeCoins(coins)}
                      className={`p-2.5 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                        prizeCoins === coins
                          ? 'bg-amber-400 text-zinc-950 border-amber-300 shadow-md'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                      }`}
                    >
                      {coins.toLocaleString()} كوينز 🪙
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Review & Final Confirmation */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <span className="inline-block px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-black">
                  مراجعة بطاقة البطولة قبل الإنطلاق
                </span>
                <h3 className="text-base sm:text-lg font-black text-white">
                  تأكيد إطلاق القرعة الرسمية 🏆
                </h3>
              </div>

              {/* Tournament Summary Card */}
              <div className="rounded-3xl border-2 border-amber-500/60 bg-gradient-to-b from-amber-950/20 via-zinc-950 to-zinc-950 p-4 sm:p-5 space-y-3 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-black">
                      {tournamentType === 'INDIVIDUAL' ? 'فردية' : 'فرق وأندية'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-black">
                      {isAiTournament ? '🤖 مع AI' : '👥 مع لاعبين'}
                    </span>
                  </div>
                  <span className="text-emerald-400 text-[11px] font-bold">
                    جاهزة للإنطلاق الفوري
                  </span>
                </div>

                <div>
                  <h4 className="text-base sm:text-lg font-black text-white">{tournamentName}</h4>
                  <p className="text-xs text-amber-400 font-bold mt-0.5">
                    {currentGame.nameAr} • {currentMode.labelAr}
                  </p>
                </div>

                <div className="p-3 bg-zinc-900/90 border border-zinc-800 rounded-2xl space-y-1.5 text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span>السعة المقررة:</span>
                    <span className="text-white font-bold">{capacity} فرق (مكتملة ومحددة ✅)</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>الجائزة الإجمالية:</span>
                    <span className="text-amber-400 font-black">{prizeCoins.toLocaleString()} كوينز + 100 نقطة 🏆</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>المضيف:</span>
                    <span className="text-white font-bold">{user.nameAr || user.username}</span>
                  </div>
                </div>

                {/* Teams Mini Grid Preview */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-zinc-400 block">الفرق المشاركة في القرعة:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTeams.slice(0, capacity).map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 font-bold flex items-center gap-1"
                      >
                        <span>{t.badgeEmoji || '⚽'}</span>
                        <span>{t.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* 5. STICKY BOTTOM ACTION BAR (Guaranteed accessible and visible on phones & tablets) */}
        <footer className="p-3.5 sm:p-5 border-t border-zinc-800 bg-zinc-950 flex-shrink-0 flex items-center justify-between gap-3 z-10">
          <button
            type="button"
            onClick={handleBack}
            className="px-4 sm:px-6 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs sm:text-sm cursor-pointer transition-colors"
          >
            {step === 1 ? 'إلغاء' : 'السابق'}
          </button>

          {step < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex-1 sm:flex-none px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:brightness-110 text-zinc-950 font-black text-xs sm:text-sm shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <span>متابعة</span>
              <ChevronLeft className="w-4 h-4 stroke-[3]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreateConfirm}
              className="flex-1 sm:flex-none px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:brightness-110 text-zinc-950 font-black text-xs sm:text-sm shadow-[0_0_30px_rgba(245,158,11,0.6)] flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Trophy className="w-4 h-4 fill-current" />
              <span>تأكيد وإنشاء البطولة 🏆</span>
            </button>
          )}
        </footer>

        {/* UNSAVED CHANGES CONFIRMATION POPUP */}
        {showExitConfirm && (
          <div className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6 text-center space-y-4 max-w-sm w-full shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black text-white">إلغاء إنشاء البطولة؟</h4>
                <p className="text-xs text-zinc-400 mt-1">
                  لم يتم حفظ بيانات البطولة بعد. هل أنت متأكد من رغبتك بالخروج؟
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold hover:bg-zinc-700 cursor-pointer"
                >
                  البقاء والمتابعة
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExitConfirm(false);
                    onClose();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black cursor-pointer"
                >
                  تأكيد الخروج
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
