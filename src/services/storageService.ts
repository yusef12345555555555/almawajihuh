// ============================================================
// العبها صح | EL3BHA SA7 - Storage & State Persistence Service
// ============================================================

import { UserProfile, Achievement, DailyChallenge, Room, ChatMessage } from '../types';

const USER_STORAGE_KEY = 'el3bha_sa7_user_profile_v1';
const ONBOARDING_KEY = 'el3bha_sa7_onboarded_v1';
const ROOMS_STORAGE_KEY = 'el3bha_sa7_rooms_v1';
const ACHIEVEMENTS_STORAGE_KEY = 'el3bha_sa7_achievements_v1';
const CHALLENGES_STORAGE_KEY = 'el3bha_sa7_challenges_v1';

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ach_first_win',
    titleAr: 'أول فوز 🥇',
    descriptionAr: 'حقق انتصارك الأول في أي مباراة أو طور لعب',
    icon: 'Trophy',
    rewardCoins: 500,
    rewardXP: 250,
    unlocked: false,
    progress: 0,
    maxProgress: 1
  },
  {
    id: 'ach_auction_king',
    titleAr: 'ملك المزاد 👑',
    descriptionAr: 'اربح 5 مزادات للاعبين في مباراة واحدة',
    icon: 'Gavel',
    rewardCoins: 1000,
    rewardXP: 600,
    unlocked: false,
    progress: 0,
    maxProgress: 5
  },
  {
    id: 'ach_legend_hunter',
    titleAr: 'صائد الأساطير ⭐',
    descriptionAr: 'اشترِ بطاقتين من فئة الأيقونة (Icon) في تشكيلتك',
    icon: 'Sparkles',
    rewardCoins: 1500,
    rewardXP: 800,
    unlocked: false,
    progress: 0,
    maxProgress: 2
  },
  {
    id: 'ach_tactical_genius',
    titleAr: 'مدرب عبقري 🧠',
    descriptionAr: 'فز بمباراة بفارق هدفين أو أكثر مع تطبيق خطة مدرب متناغمة',
    icon: 'BrainCircuit',
    rewardCoins: 800,
    rewardXP: 450,
    unlocked: false,
    progress: 0,
    maxProgress: 1
  },
  {
    id: 'ach_10_wins',
    titleAr: '10 انتصارات كاسحة 🔥',
    descriptionAr: 'حقق 10 انتصارات رسمية ضد لاعبين أو ذكاء اصطناعي',
    icon: 'Flame',
    rewardCoins: 2000,
    rewardXP: 1200,
    unlocked: false,
    progress: 0,
    maxProgress: 10
  }
];

export const INITIAL_CHALLENGES: DailyChallenge[] = [
  {
    id: 'dc_1',
    titleAr: 'ربح مزاد لاعب أسطوري',
    descriptionAr: 'اشترِ أي لاعب بتقييم 90+ في طور المزاد اليومي',
    rewardCoins: 300,
    rewardXP: 150,
    completed: false,
    progress: 0,
    total: 1
  },
  {
    id: 'dc_2',
    titleAr: 'تخمين 3 لاعبين باللاعب الخفي',
    descriptionAr: 'احرز المركز الأول في طور اللاعب الخفي',
    rewardCoins: 400,
    rewardXP: 200,
    completed: false,
    progress: 0,
    total: 3
  },
  {
    id: 'dc_3',
    titleAr: 'سلسلة 5 إجابات صحيحة في بيحور ولا ميحورش',
    descriptionAr: 'أجب 5 معلومات متتالية بدون خطأ',
    rewardCoins: 350,
    rewardXP: 180,
    completed: false,
    progress: 0,
    total: 5
  }
];

const REWARDED_MATCHES_KEY = 'el3bha_sa7_rewarded_matches_v1';

export const DEFAULT_USER: UserProfile = {
  id: 'user_player_01',
  username: 'الكابتن الذهبي',
  nameAr: 'يوسف العشري',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  level: 8,
  xp: 3450,
  nextLevelXp: 5000,
  coins: 14500,
  tickets: 12,
  points: 410,
  rating: 1580,
  rankTier: 'ذهبي',
  wins: 28,
  losses: 9,
  draws: 4,
  gamesPlayed: 41,
  auctionsWon: 54,
  favoritePlayer: 'Lionel Messi',
  favoriteClub: 'Real Madrid',
  soundEnabled: true,
  fastBiddingEnabled: true,
  achievements: INITIAL_ACHIEVEMENTS,
  currentStreak: 3
};

export class StorageService {
  public static getUser(): UserProfile {
    try {
      const data = localStorage.getItem(USER_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (!parsed.achievements) parsed.achievements = INITIAL_ACHIEVEMENTS;
        if (typeof parsed.points !== 'number') parsed.points = 410;
        // رقم لاعب بشكل قديم (EL3B-1234 ...) → نحوله للشكل الجديد ELM# (السيرفر هيصححه لرقمه الرسمي عند المزامنة).
        if (parsed.playerId && !/^ELM[0-9]{1,7}$/.test(parsed.playerId)) {
          parsed.playerId = this.generatePlayerId();
          try {
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(parsed));
          } catch {}
        }
        return parsed;
      }
    } catch {}
    return DEFAULT_USER;
  }

  public static awardUniversal10Points(gameId: string, matchSessionId: string): { awarded: boolean; pointsAdded: number; totalPoints: number } {
    try {
      const rewardedList: string[] = JSON.parse(localStorage.getItem(REWARDED_MATCHES_KEY) || '[]');
      const uniqueKey = `${gameId}_${matchSessionId}`;
      if (rewardedList.includes(uniqueKey)) {
        const user = this.getUser();
        return { awarded: false, pointsAdded: 0, totalPoints: user.points };
      }
      rewardedList.push(uniqueKey);
      localStorage.setItem(REWARDED_MATCHES_KEY, JSON.stringify(rewardedList.slice(-100))); // keep last 100
      
      const user = this.getUser();
      user.points = (user.points || 0) + 10;
      user.coins += 200;
      user.xp += 150;
      this.saveUser(user);
      return { awarded: true, pointsAdded: 10, totalPoints: user.points };
    } catch {
      const user = this.getUser();
      user.points = (user.points || 0) + 10;
      this.saveUser(user);
      return { awarded: true, pointsAdded: 10, totalPoints: user.points };
    }
  }

  public static getUserProfile(): UserProfile {
    return this.getUser();
  }

  /**
   * Whether the player has actually completed identity onboarding
   * (name + nickname + avatar), as opposed to just getting the
   * built-in placeholder profile back from getUser(). Used to decide
   * whether to show the onboarding screen on launch.
   */
  public static hasProfile(): boolean {
    try {
      return localStorage.getItem(ONBOARDING_KEY) === '1' && !!localStorage.getItem(USER_STORAGE_KEY);
    } catch {
      return false;
    }
  }

  /**
   * Wipes every local trace of this account (profile, onboarding flag,
   * rooms, achievements, challenges) so the app returns to a clean
   * first-launch state.
   */
  public static deleteAccount(): void {
    try {
      [
        USER_STORAGE_KEY,
        ONBOARDING_KEY,
        ROOMS_STORAGE_KEY,
        ACHIEVEMENTS_STORAGE_KEY,
        CHALLENGES_STORAGE_KEY
      ].forEach((key) => localStorage.removeItem(key));
    } catch {
      /* storage unavailable — nothing to clean */
    }
  }

  public static generatePlayerId(): string {
    // احتياطي محلي متسلسل — الرقم الحقيقي بيجي من السيرفر (ELM1, ELM2...).
    try {
      const n = (parseInt(localStorage.getItem('mw_local_player_seq') || '0', 10) || 0) + 1;
      localStorage.setItem('mw_local_player_seq', String(n));
      return `ELM${n}`;
    } catch {
      return 'ELM1';
    }
  }

  /**
   * Creates and persists a brand-new player profile from onboarding
   * input, with a freshly generated, permanent Player ID. This is the
   * only place a profile is "born" — no login, no password, no email.
   */
  public static createPlayerProfile(input: { username: string; nameAr: string; avatar: string; id?: string; playerId?: string }): UserProfile {
    const profile: UserProfile = {
      id: input.id || `user_${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`,
      playerId: input.playerId || this.generatePlayerId(),
      username: input.username.trim(),
      nameAr: input.nameAr.trim(),
      avatar: input.avatar,
      level: 1,
      xp: 0,
      nextLevelXp: 1000,
      coins: 2000,
      tickets: 3,
      points: 0,
      rating: 1000,
      rankTier: 'برونزي',
      wins: 0,
      losses: 0,
      draws: 0,
      gamesPlayed: 0,
      auctionsWon: 0,
      favoritePlayer: '',
      favoriteClub: '',
      soundEnabled: true,
      fastBiddingEnabled: true,
      achievements: INITIAL_ACHIEVEMENTS,
      currentStreak: 0
    };
    this.saveUser(profile);
    try {
      localStorage.setItem(ONBOARDING_KEY, '1');
    } catch {
      // ignore storage errors
    }
    return profile;
  }

  public static saveUser(user: UserProfile) {
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } catch {}
  }

  public static saveUserProfile(user: UserProfile) {
    this.saveUser(user);
  }

  public static claimAchievementReward(achievementId: string): Achievement[] {
    const list = this.getAchievements();
    const target = list.find((a) => a.id === achievementId);
    if (target && !target.claimed) {
      target.claimed = true;
      this.addCoinsAndXP(target.rewardCoins, target.rewardXP);
      try {
        localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(list));
      } catch {}
    }
    return list;
  }

  public static addCoinsAndXP(coins: number, xp: number): UserProfile {
    const user = this.getUser();
    user.coins += coins;
    user.xp += xp;

    // Check level up
    while (user.xp >= user.nextLevelXp) {
      user.level += 1;
      user.xp -= user.nextLevelXp;
      user.nextLevelXp = Math.round(user.nextLevelXp * 1.35);
      user.tickets += 2;
    }

    this.saveUser(user);
    return user;
  }

  public static recordMatchResult(isWin: boolean, isDraw: boolean = false) {
    const user = this.getUser();
    user.gamesPlayed += 1;
    if (isWin) {
      user.wins += 1;
      user.rating += 25;
      user.currentStreak = (user.currentStreak || 0) + 1;
    } else if (isDraw) {
      user.draws += 1;
      user.rating += 5;
      user.currentStreak = 0;
    } else {
      user.losses += 1;
      user.rating = Math.max(1000, user.rating - 15);
      user.currentStreak = 0;
    }

    if (user.rating >= 2000) user.rankTier = 'أساطير النخبة';
    else if (user.rating >= 1700) user.rankTier = 'بلاتيني';
    else if (user.rating >= 1400) user.rankTier = 'ذهبي';
    else if (user.rating >= 1200) user.rankTier = 'فضي';
    else user.rankTier = 'برونزي';

    this.saveUser(user);
  }

  public static getAchievements(): Achievement[] {
    try {
      const data = localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
      if (data) return JSON.parse(data);
    } catch {}
    return INITIAL_ACHIEVEMENTS;
  }

  public static saveAchievements(list: Achievement[]) {
    try {
      localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(list));
    } catch {}
  }

  public static getChallenges(): DailyChallenge[] {
    try {
      const data = localStorage.getItem(CHALLENGES_STORAGE_KEY);
      if (data) return JSON.parse(data);
    } catch {}
    return INITIAL_CHALLENGES;
  }
}
