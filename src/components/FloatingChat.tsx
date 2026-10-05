// ============================================================
// العبها صح | EL3BHA SA7 - Global Draggable Floating Chat
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Users, Shield, Sparkles, Volume2 } from 'lucide-react';
import { audioManager } from '../services/audioManager';

interface FloatingChatProps {
  currentRoomId?: string;
  userName: string;
  is1v1Active?: boolean;
  opponentName?: string;
  visible?: boolean;
}

interface ChatMsg {
  id: string;
  sender: string;
  text: string;
  time: string;
  type: 'global' | 'room' | 'system';
}

export const FloatingChat: React.FC<FloatingChatProps> = ({
  currentRoomId,
  userName,
  is1v1Active = false,
  opponentName = 'الخصم التكتيكي',
  visible = true
}) => {
  if (!visible) return null;

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'room' | 'global'>('room');
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 'msg_0',
      sender: 'نظام المنصة',
      text: 'مرحباً بك في ساحة المواجهة! تحدث مع الخصم أو في القناة العامة.',
      time: 'دلوقتي',
      type: 'system'
    }
  ]);
  const [input, setInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  // Draggable position state
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    const saved = localStorage.getItem('el3bha_floating_chat_pos');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return { x: 24, y: 350 };
  });

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0
  });

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    isDraggingRef.current = false;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      posX: position.x,
      posY: position.y
    };

    const handleMouseMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;

      const deltaX = currentX - dragStartRef.current.startX;
      const deltaY = currentY - dragStartRef.current.startY;

      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        isDraggingRef.current = true;
      }

      const newX = Math.max(12, Math.min(window.innerWidth - 76, dragStartRef.current.posX + deltaX));
      const newY = Math.max(70, Math.min(window.innerHeight - 76, dragStartRef.current.posY + deltaY));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);

      // Snap to nearest side edge
      setPosition((prev) => {
        const snapX = prev.x > window.innerWidth / 2 ? window.innerWidth - 76 : 16;
        const finalPos = { x: snapX, y: prev.y };
        localStorage.setItem('el3bha_floating_chat_pos', JSON.stringify(finalPos));
        return finalPos;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove);
    window.addEventListener('touchend', handleMouseUp);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMsg: ChatMsg = {
      id: `msg_${Date.now()}`,
      sender: userName,
      text: input.trim(),
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      type: activeTab
    };

    setMessages((prev) => [...prev, newMsg]);
    setInput('');
    audioManager.playClick();
  };

  return (
    <>
      {/* Draggable Trigger Button */}
      <div
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
        className="fixed z-50 select-none touch-none"
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
      >
        <button
          onClick={() => {
            if (!isDraggingRef.current) {
              audioManager.playClick();
              setIsOpen(!isOpen);
              setUnreadCount(0);
            }
          }}
          className={`relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 p-0.5 shadow-[0_0_25px_rgba(245,158,11,0.6)] hover:scale-105 active:scale-95 transition-transform flex items-center justify-center`}
        >
          <div className="w-full h-full rounded-[14px] bg-zinc-950 flex items-center justify-center border border-amber-400/40">
            <MessageSquare className="w-6 h-6 text-amber-400" />
          </div>

          {/* Unread badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white font-black text-[10px] flex items-center justify-center animate-bounce shadow-md">
              {unreadCount}
            </span>
          )}

          {/* Online 1v1 Indicator */}
          {is1v1Active && (
            <span className="absolute -bottom-1 -left-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-zinc-950" />
          )}
        </button>
      </div>

      {/* Floating Chat Modal Box */}
      {isOpen && (
        <div className="fixed bottom-20 left-4 sm:left-8 z-50 w-[92vw] sm:w-96 h-[460px] rounded-3xl bg-zinc-950/95 border border-amber-500/40 shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Top Header */}
          <div className="flex items-center justify-between p-3.5 border-b border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 font-bold text-xs">
                💬
              </div>
              <div>
                <h4 className="text-xs font-black text-white">الدردشة الحية للمباراة</h4>
                <p className="text-[10px] text-zinc-400">
                  {is1v1Active ? `أنت ضد: ${opponentName}` : 'القناة التكتيكية العامة'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Channel Tabs */}
          <div className="flex border-b border-zinc-800/80 bg-zinc-900/50 p-1 gap-1 text-xs font-bold">
            <button
              onClick={() => setActiveTab('room')}
              className={`flex-1 py-1.5 rounded-xl transition-all ${
                activeTab === 'room'
                  ? 'bg-amber-500 text-zinc-950 font-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              غرفة المباراة
            </button>
            <button
              onClick={() => setActiveTab('global')}
              className={`flex-1 py-1.5 rounded-xl transition-all ${
                activeTab === 'global'
                  ? 'bg-amber-500 text-zinc-950 font-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              الساحة العامة
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-2.5">
            {messages.map((msg) => {
              const isMe = msg.sender === userName;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : msg.type === 'system' ? 'items-center' : 'items-start'}`}
                >
                  {msg.type === 'system' ? (
                    <div className="text-[10px] bg-amber-400/10 text-amber-300 border border-amber-400/20 px-2.5 py-1 rounded-full text-center my-1">
                      {msg.text}
                    </div>
                  ) : (
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                        isMe
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-zinc-950 font-bold rounded-tr-none shadow-md'
                          : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-none'
                      }`}
                    >
                      {!isMe && <div className="text-[9px] text-amber-400/80 font-black mb-0.5">{msg.sender}</div>}
                      <div>{msg.text}</div>
                      <div className={`text-[8px] mt-1 text-left ${isMe ? 'text-zinc-800' : 'text-zinc-500'}`}>
                        {msg.time}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Input Footer */}
          <form onSubmit={handleSend} className="p-2.5 border-t border-zinc-800 bg-zinc-950 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب رسالتك التكتيكية للخصم..."
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="px-3 py-2 rounded-2xl bg-amber-500 text-zinc-950 font-black hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
