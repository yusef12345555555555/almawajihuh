// ============================================================
// العبها صح | Friends & Social View (الأصدقاء)
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  UserPlus,
  MessageSquare,
  UserMinus,
  Check,
  X,
  Shield,
  Trophy,
  Flame,
  Clock,
  Sparkles,
  Award,
  AlertCircle
} from 'lucide-react';
import { FriendUser, FriendRequest, UserProfile } from '../types';
import { SocialService } from '../services/socialService';
import { audioManager } from '../services/audioManager';
import { PlayerAvatarBadge } from './PlayerAvatarBadge';

interface FriendsViewProps {
  user: UserProfile;
  onOpenChatWithFriend: (friend: FriendUser) => void;
  onNavigateToChat: () => void;
}

export const FriendsView: React.FC<FriendsViewProps> = ({
  user,
  onOpenChatWithFriend,
  onNavigateToChat
}) => {
  const [friends, setFriends] = useState<FriendUser[]>(() => SocialService.getFriends());
  const [requests, setRequests] = useState<FriendRequest[]>(() => SocialService.getRequests());
  const [activeTab, setActiveTab] = useState<'LIST' | 'SEARCH' | 'REQUESTS'>('LIST');

  // Search by ID / name / nickname state
  const [searchIdInput, setSearchIdInput] = useState('');
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [requestFeedback, setRequestFeedback] = useState<string | null>(null);

  // Filter list state
  const [filterQuery, setFilterQuery] = useState('');

  // Live sync: friends / requests refresh the instant something changes on the server.
  useEffect(() => {
    SocialService.startRealtime();
    const refresh = () => {
      setFriends(SocialService.getFriends());
      setRequests(SocialService.getRequests());
    };
    refresh();
    void SocialService.pull();
    return SocialService.subscribe(refresh);
  }, []);

  // Instant search-as-you-type (name, nickname or Player ID) — no button press needed.
  useEffect(() => {
    const q = searchIdInput.trim();
    if (!q) {
      setSearchResults([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }
    let cancelled = false;
    setIsSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const found = await SocialService.searchPlayers(q, user.id);
        if (!cancelled) setSearchResults(found);
      } finally {
        if (!cancelled) {
          setIsSearching(false);
          setHasSearched(true);
        }
      }
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchIdInput, user.id]);

  // Search by ID / name / nickname handler — queries every real
  // published player, not just a hardcoded demo list.
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchIdInput.trim()) return;

    audioManager.playClick();
    setIsSearching(true);
    setRequestFeedback(null);
    try {
      const found = await SocialService.searchPlayers(searchIdInput, user.id);
      setSearchResults(found);
    } finally {
      setIsSearching(false);
      setHasSearched(true);
    }
  };

  // Send friend request
  const handleSendRequest = (target: FriendUser) => {
    audioManager.playClick();
    const res = SocialService.sendFriendRequest(target);
    setRequestFeedback(res.message);
    setRequests(SocialService.getRequests());
  };

  // Accept incoming request
  const handleAcceptRequest = (requestId: string) => {
    audioManager.playFanfare();
    const updated = SocialService.acceptFriendRequest(requestId);
    setFriends(updated.friends);
    setRequests(updated.requests);
  };

  // Reject incoming request
  const handleRejectRequest = (requestId: string) => {
    audioManager.playClick();
    const updated = SocialService.rejectFriendRequest(requestId);
    setRequests(updated);
  };

  // Remove friend
  const handleRemoveFriend = (friendId: string) => {
    if (window.confirm('هل أنت متأكد من حذف ده الصديق من قائمتك؟')) {
      audioManager.playClick();
      const updated = SocialService.removeFriend(friendId);
      setFriends(updated);
    }
  };

  // Filtered friends
  const filteredFriends = friends.filter(
    (f) =>
      f.nameAr.includes(filterQuery) ||
      f.username.toLowerCase().includes(filterQuery.toLowerCase()) ||
      f.playerId.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const pendingIncoming = requests.filter((r) => r.direction === 'INCOMING' && r.status === 'PENDING');

  return (
    <div className="space-y-6 max-w-5xl mx-auto select-none" dir="rtl">
      {/* 1. Page Header & ID Banner */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                الأصدقاء والمجتمع الكروي
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                  {friends.length} أصدقاء
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                تواصل مع مدربي ولاعبي المنصة، تابع نشاطهم المباشر وتحدّهم في مواجهات تكتيكية.
              </p>
            </div>
          </div>

          {/* User's Own Player ID Pill */}
          <div className="flex items-center gap-3 bg-zinc-900/90 border border-zinc-700/80 px-4 py-2.5 rounded-2xl shadow-inner">
            <div>
              <span className="text-[10px] text-zinc-400 font-bold block">معرّف حسابك (Player ID):</span>
              <span className="text-sm font-mono font-black text-amber-400 tracking-wider">
                {user.playerId || 'ELM1'}
              </span>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(user.playerId || 'ELM1');
                audioManager.playClick();
                alert('تم نسخ الـ Player ID الخاص بك إلى الحافظة!');
              }}
              className="px-2.5 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 border border-zinc-700 cursor-pointer"
            >
              نسخ
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-zinc-800">
          <button
            onClick={() => {
              audioManager.playClick();
              setActiveTab('LIST');
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'LIST'
                ? 'bg-amber-400 text-zinc-950 font-black shadow-md shadow-amber-400/20'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>قائمة الأصدقاء ({friends.length})</span>
          </button>

          <button
            onClick={() => {
              audioManager.playClick();
              setActiveTab('SEARCH');
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'SEARCH'
                ? 'bg-amber-400 text-zinc-950 font-black shadow-md shadow-amber-400/20'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>ابحث عن لاعب بالـ ID</span>
          </button>

          <button
            onClick={() => {
              audioManager.playClick();
              setActiveTab('REQUESTS');
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 relative ${
              activeTab === 'REQUESTS'
                ? 'bg-amber-400 text-zinc-950 font-black shadow-md shadow-amber-400/20'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>طلبات الصداقة</span>
            {pendingIncoming.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                {pendingIncoming.length}
              </span>
            )}
          </button>

          {/* Quick Chat Jump */}
          <button
            onClick={() => {
              audioManager.playClick();
              onNavigateToChat();
            }}
            className="mr-auto px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-amber-400" />
            <span>فتح الدردشة</span>
          </button>
        </div>
      </div>

      {/* 2. TAB: SEARCH BY PLAYER ID */}
      {activeTab === 'SEARCH' && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="max-w-xl mx-auto text-center space-y-2">
            <h3 className="text-lg font-black text-white flex items-center justify-center gap-2">
              <Search className="w-5 h-5 text-amber-400" />
              ابحث بالـ Player ID أو الاسم أو اللقب
            </h3>
            <p className="text-xs text-zinc-400">
              اكتب المعرف (<code className="text-amber-400 font-mono">ELM12</code>) أو اسم اللاعب أو لقبه — النتائج بتظهر من كل اللاعبين الحقيقيين المسجلين.
            </p>

            <form onSubmit={handleSearch} className="flex gap-2 pt-3">
              <input
                type="text"
                value={searchIdInput}
                onChange={(e) => setSearchIdInput(e.target.value)}
                placeholder="اكتب الـ ID أو الاسم أو اللقب..."
                className="flex-1 bg-zinc-900 border border-zinc-700 text-white font-mono font-bold text-sm px-4 py-3 rounded-2xl focus:border-amber-400 outline-none placeholder:normal-case placeholder:font-sans"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="px-6 py-3 bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-zinc-950 font-black text-sm rounded-2xl transition-all cursor-pointer shadow-lg shadow-amber-400/20 flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                <span>{isSearching ? 'بيدور...' : 'بحث'}</span>
              </button>
            </form>
          </div>

          {/* Search Results List */}
          {hasSearched && (
            <div className="max-w-xl mx-auto pt-4 space-y-3">
              {searchResults.length > 0 ? (
                searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="bg-zinc-900/90 border border-zinc-700/80 rounded-2xl p-5 space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3.5">
                        <div className="relative">
                          <PlayerAvatarBadge avatar={result.avatar} size="lg" ring={false} className="!w-14 !h-14 border-2 border-amber-400/60 shadow-md" />
                          <span
                            className={`absolute bottom-0 left-0 w-3.5 h-3.5 rounded-full border-2 border-zinc-900 ${
                              result.status === 'ONLINE'
                                ? 'bg-emerald-400'
                                : result.status === 'IN_MATCH'
                                ? 'bg-amber-400'
                                : 'bg-zinc-500'
                            }`}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-black text-white">{result.nameAr}</h4>
                            <span className="text-xs text-zinc-400 font-mono font-bold">@{result.username}</span>
                          </div>
                          <div className="text-xs text-amber-400 font-bold mt-0.5">
                            Player ID: <span className="font-mono">{result.playerId}</span>
                          </div>
                          <div className="text-[11px] text-zinc-400 mt-1">
                            {result.rankTier} • {result.rating} ELO
                            {result.favoriteClub ? ` • النادي المفضل: ${result.favoriteClub}` : ''}
                          </div>
                        </div>
                      </div>
                    </div>

                    {result.bio && (
                      <p className="text-xs text-zinc-300 bg-zinc-950/70 p-3 rounded-xl border border-zinc-800 leading-relaxed">
                        "{result.bio}"
                      </p>
                    )}

                    {/* Feedback Message */}
                    {requestFeedback && (
                      <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>{requestFeedback}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                      {SocialService.isFriend(result.id) ? (
                        <button
                          onClick={() => onOpenChatWithFriend(result)}
                          className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>فتح محادثة (صديق بالفعل)</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(result)}
                          className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>إضافة صديق</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 bg-zinc-900/40 rounded-2xl border border-zinc-800 text-zinc-400 space-y-2">
                  <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                  <p className="text-sm font-bold text-white">مفيش لاعب متطابق مع البحث ده!</p>
                  <p className="text-xs text-zinc-500">جرب تكتب جزء من الاسم أو اللقب أو الـ Player ID كامل.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. TAB: FRIEND REQUESTS */}
      {activeTab === 'REQUESTS' && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-amber-400" />
            طلبات الصداقة الواردة ({pendingIncoming.length})
          </h3>

          {pendingIncoming.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-sm">
              لا توجد طلبات صداقة واردة حالياً. شارك معرّفك <span className="font-mono text-amber-400 font-bold">{user.playerId || 'ELM1'}</span> مع أصدقائك!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pendingIncoming.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={req.senderAvatar}
                      alt={req.senderName}
                      className="w-12 h-12 rounded-xl object-cover border border-amber-400/50"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h4 className="text-sm font-black text-white">{req.senderName}</h4>
                      <span className="text-xs text-amber-400 font-mono font-bold block">{req.senderPlayerId}</span>
                      <span className="text-[10px] text-zinc-400">{req.senderRating} ELO</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAcceptRequest(req.id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs flex items-center gap-1 cursor-pointer shadow-md"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>قبول</span>
                    </button>
                    <button
                      onClick={() => handleRejectRequest(req.id)}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs flex items-center gap-1 cursor-pointer border border-zinc-700"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>رفض</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. TAB: FRIENDS LIST */}
      {activeTab === 'LIST' && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
          {/* Quick Filter Search */}
          <div className="flex items-center justify-between gap-3 pb-2">
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="تصفية الأصدقاء بالاسم أو الـ ID..."
                className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white rounded-xl pr-9 pl-3 py-2 focus:border-amber-400 outline-none"
              />
              <Search className="w-4 h-4 text-zinc-500 absolute right-3 top-2.5 pointer-events-none" />
            </div>

            <span className="text-xs text-zinc-500 font-bold">
              إجمالي: {filteredFriends.length} لاعب
            </span>
          </div>

          {filteredFriends.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-sm">
              لم يتم العثور على أصدقاء مطابقين. استخدم تبويب "ابحث عن لاعب بالـ ID" لإضافة أصدقاء جدد!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <PlayerAvatarBadge avatar={friend.avatar} size="md" ring={false} className="!w-12 !h-12 border border-amber-400/50 shadow-md" />
                        <span
                          className={`absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 rounded-full border-2 border-zinc-900 ${
                            friend.status === 'ONLINE'
                              ? 'bg-emerald-400'
                              : friend.status === 'IN_MATCH'
                              ? 'bg-amber-400'
                              : 'bg-zinc-500'
                          }`}
                          title={
                            friend.status === 'ONLINE'
                              ? 'متصل دلوقتي'
                              : friend.status === 'IN_MATCH'
                              ? 'في مباراة'
                              : 'غير متصل'
                          }
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors">
                          {friend.nameAr}
                        </h4>
                        <div className="text-[11px] font-mono text-amber-400 font-bold">
                          {friend.playerId}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {friend.status === 'ONLINE' ? (
                            <span className="text-emerald-400 font-bold">متصل دلوقتي</span>
                          ) : friend.status === 'IN_MATCH' ? (
                            <span className="text-amber-400 font-bold">في مباراة</span>
                          ) : (
                            <span>{friend.lastActive}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-[10px] font-mono text-zinc-300 border border-zinc-700">
                      {friend.rating} ELO
                    </span>
                  </div>

                  {friend.favoriteClub && (
                    <div className="text-[11px] text-zinc-400 flex items-center justify-between px-2 py-1 bg-zinc-950/60 rounded-lg">
                      <span>النادي المفضل:</span>
                      <span className="text-white font-bold">{friend.favoriteClub}</span>
                    </div>
                  )}

                  {/* Actions: Message & Remove Friend */}
                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/80">
                    <button
                      onClick={() => onOpenChatWithFriend(friend)}
                      className="flex-1 py-2 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 text-amber-300 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                      <span>محادثة</span>
                    </button>

                    <button
                      onClick={() => handleRemoveFriend(friend.id)}
                      className="p-2 rounded-xl bg-zinc-800 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/40 text-zinc-400 border border-zinc-700/60 transition-colors cursor-pointer"
                      title="حذف الصديق"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
