// ============================================================
// العبها صح | Dedicated Chat View (الدردشة)
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  Users,
  CheckCheck,
  Phone,
  Video,
  MoreVertical,
  Smile,
  Shield,
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { ChatConversation, DirectMessage, FriendUser, UserProfile } from '../types';
import { SocialService } from '../services/socialService';
import { audioManager } from '../services/audioManager';

interface ChatViewProps {
  user: UserProfile;
  selectedFriend?: FriendUser | null;
  onBackToFriends?: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  user,
  selectedFriend,
  onBackToFriends
}) => {
  const [conversations, setConversations] = useState<ChatConversation[]>(() =>
    SocialService.getConversations()
  );
  const [activeConvId, setActiveConvId] = useState<string>(() => {
    if (selectedFriend) {
      const conv = SocialService.getOrCreateConversation(selectedFriend);
      return conv.id;
    }
    const convs = SocialService.getConversations();
    return convs.length > 0 ? convs[0].id : '';
  });

  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileListOpen, setIsMobileListOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Live chat: new messages from friends appear the moment they're sent.
  useEffect(() => {
    SocialService.startRealtime();
    let lastTotal = SocialService.getConversations().reduce((n, c) => n + c.messages.length, 0);
    const refresh = () => {
      const convs = SocialService.getConversations();
      const total = convs.reduce((n, c) => n + c.messages.length, 0);
      if (total > lastTotal) audioManager.playFanfare();
      lastTotal = total;
      setConversations(convs);
    };
    void SocialService.pull();
    return SocialService.subscribe(refresh);
  }, []);

  // If selectedFriend prop changes from outside, switch to their conversation
  useEffect(() => {
    if (selectedFriend) {
      const conv = SocialService.getOrCreateConversation(selectedFriend);
      setConversations(SocialService.getConversations());
      setActiveConvId(conv.id);
      setIsMobileListOpen(false);
    }
  }, [selectedFriend]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConvId, conversations]);

  const currentConversation = conversations.find((c) => c.id === activeConvId);

  const handleSelectConversation = (convId: string) => {
    audioManager.playClick();
    setActiveConvId(convId);
    const updated = SocialService.markConversationRead(convId);
    setConversations(updated);
    setIsMobileListOpen(false);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() || !activeConvId) return;

    audioManager.playClick();
    const sentText = messageInput.trim();
    setMessageInput('');

    const updated = SocialService.sendMessage(activeConvId, sentText);
    setConversations(updated);
  };

  const filteredConversations = conversations.filter(
    (c) =>
      c.friendName.includes(searchQuery) ||
      c.friendPlayerId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.includes(searchQuery)
  );

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] min-h-[580px] bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row select-none" dir="rtl">
      {/* 1. LEFT SIDEBAR: Conversations List */}
      <div
        className={`w-full md:w-80 xl:w-96 border-l border-zinc-800 bg-zinc-950/95 flex flex-col flex-shrink-0 ${
          isMobileListOpen || !activeConvId ? 'block' : 'hidden md:flex'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-400/30 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">صندوق الدردشة</h2>
              <span className="text-[10px] text-zinc-400 font-bold">
                {conversations.length} محادثات نشطة
              </span>
            </div>
          </div>

          {onBackToFriends && (
            <button
              onClick={() => {
                audioManager.playClick();
                onBackToFriends();
              }}
              className="px-2.5 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-[11px] font-bold text-zinc-300 border border-zinc-700 cursor-pointer"
            >
              الأصدقاء
            </button>
          )}
        </div>

        {/* Search */}
        <div className="p-3 border-b border-zinc-850">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في المحادثات..."
              className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white rounded-xl pr-9 pl-3 py-2 focus:border-amber-400 outline-none"
            />
            <Search className="w-4 h-4 text-zinc-500 absolute right-3 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-900">
          {filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-500">
              لا توجد محادثات تطابق بحثك.
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConvId;

              return (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-amber-500/10 border-r-4 border-amber-400'
                      : 'hover:bg-zinc-900/60'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={conv.friendAvatar}
                      alt={conv.friendName}
                      className="w-12 h-12 rounded-xl object-cover border border-zinc-700"
                      referrerPolicy="no-referrer"
                    />
                    <span
                      className={`absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full border-2 border-zinc-950 ${
                        conv.friendStatus === 'ONLINE'
                          ? 'bg-emerald-400'
                          : conv.friendStatus === 'IN_MATCH'
                          ? 'bg-amber-400'
                          : 'bg-zinc-500'
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="text-xs font-black text-white truncate max-w-[130px]">
                        {conv.friendName}
                      </h4>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {conv.lastMessageTime}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-zinc-400 truncate max-w-[160px]">
                        {conv.lastMessage}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-zinc-950 font-black text-[10px]">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. RIGHT PANEL: Active Chat Thread */}
      <div
        className={`flex-1 flex flex-col bg-zinc-950 ${
          !isMobileListOpen && activeConvId ? 'flex' : 'hidden md:flex'
        }`}
      >
        {currentConversation ? (
          <>
            {/* Thread Header */}
            <div className="p-3.5 sm:p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                {/* Mobile Back to List Button */}
                <button
                  onClick={() => setIsMobileListOpen(true)}
                  className="md:hidden p-1.5 rounded-xl bg-zinc-800 text-zinc-300"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="relative">
                  <img
                    src={currentConversation.friendAvatar}
                    alt={currentConversation.friendName}
                    className="w-10 h-10 rounded-xl object-cover border border-amber-400/50"
                    referrerPolicy="no-referrer"
                  />
                  <span
                    className={`absolute bottom-0 left-0 w-2.5 h-2.5 rounded-full border-2 border-zinc-900 ${
                      currentConversation.friendStatus === 'ONLINE'
                        ? 'bg-emerald-400'
                        : currentConversation.friendStatus === 'IN_MATCH'
                        ? 'bg-amber-400'
                        : 'bg-zinc-500'
                    }`}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    {currentConversation.friendName}
                    <span className="text-[10px] font-mono text-amber-400 font-bold px-1.5 py-0.5 bg-amber-500/10 rounded">
                      {currentConversation.friendPlayerId}
                    </span>
                  </h3>
                  <span className="text-[10px] text-zinc-400">
                    {currentConversation.friendStatus === 'ONLINE'
                      ? 'متصل دلوقتي'
                      : currentConversation.friendStatus === 'IN_MATCH'
                      ? 'في مواجهة حالياً ⚽'
                      : 'غير متصل'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-zinc-400">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hidden sm:inline-block">
                  محادثة آمنة ومشفرة
                </span>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-zinc-950 via-zinc-900/30 to-zinc-950">
              <div className="text-center my-2">
                <span className="px-3 py-1 rounded-full bg-zinc-900/90 text-[10px] text-zinc-500 font-bold border border-zinc-800">
                  بداية المحادثة مع {currentConversation.friendName}
                </span>
              </div>

              {currentConversation.messages.map((msg) => {
                const isMe = msg.senderId === 'my_user';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[80%] sm:max-w-[70%] rounded-2xl p-3 text-xs sm:text-sm font-medium leading-relaxed shadow-md ${
                        isMe
                          ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-zinc-950 font-bold rounded-tl-none'
                          : 'bg-zinc-900 border border-zinc-800 text-white rounded-tr-none'
                      }`}
                    >
                      <p>{msg.text}</p>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-zinc-500 mt-1 px-1 font-mono">
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {isMe && <CheckCheck className="w-3 h-3 text-amber-400" />}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 border-t border-zinc-800 bg-zinc-900/80 flex items-center gap-2"
            >
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="اكتب رسالتك التكتيكية هنا..."
                className="flex-1 bg-zinc-950 border border-zinc-700 text-white text-xs sm:text-sm px-4 py-2.5 rounded-2xl focus:border-amber-400 outline-none placeholder:text-zinc-500"
              />
              <button
                type="submit"
                disabled={!messageInput.trim()}
                className="p-2.5 sm:px-4 sm:py-2.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:hover:bg-amber-400 text-zinc-950 font-black rounded-2xl transition-all cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">إرسال</span>
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500 space-y-3">
            <MessageSquare className="w-12 h-12 text-zinc-700" />
            <h3 className="text-base font-bold text-white">اختار صديقاً لبدء المحادثة</h3>
            <p className="text-xs max-w-sm">
              تقدر التحدث مع زملائك المدربين، ومناقشة التكتيكات وتنسيق المباريات والتحديات الودية.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
