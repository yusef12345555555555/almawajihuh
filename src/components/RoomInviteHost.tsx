// ============================================================
// المواجهة | مستقبل الغرف (ضيف): لينك الغرفة • ضغطة على الإشعار • زر «يلا نلعب» من البانر
// بيفتح FriendRoomModal بوضع الضيف في أي شاشة في التطبيق.
// ============================================================

import React, { useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { FriendRoomModal } from './FriendRoomModal';
import { OPEN_ROOM_EVENT, ROOM_QUERY_PARAM, parseRoomRef } from '../services/friendRoomService';
import { launchGameWithOpponent } from './PostMatchActions';

export const RoomInviteHost: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [roomId, setRoomId] = useState<string | null>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent).detail?.roomId as string | undefined;
      if (id) setRoomId(id);
    };
    window.addEventListener(OPEN_ROOM_EVENT, onOpen);

    // لينك غرفة اتفتح بيه التطبيق (?room=...)
    try {
      const u = new URL(window.location.href);
      const fromLink = parseRoomRef(u.searchParams.get(ROOM_QUERY_PARAM) || '');
      if (fromLink) {
        setRoomId(fromLink);
        u.searchParams.delete(ROOM_QUERY_PARAM);
        window.history.replaceState({}, '', u.pathname + (u.search || '') + u.hash);
      }
    } catch {
      /* ignore */
    }
    return () => window.removeEventListener(OPEN_ROOM_EVENT, onOpen);
  }, []);

  if (!roomId) return null;
  return (
    <FriendRoomModal
      user={user}
      mode={{ kind: 'guest', roomId }}
      onClose={() => setRoomId(null)}
      onStart={(opponent, _settings, gameMode) => {
        setRoomId(null);
        launchGameWithOpponent(gameMode, opponent);
      }}
    />
  );
};
