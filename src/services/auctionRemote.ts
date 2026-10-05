// ============================================================
// المواجهة | محرك المزاد عن بُعد (جهاز الضيف)
// الجهاز المضيف يشغّل المحرك الحقيقي ويبعت الحالة لحظياً؛ الضيف بيعرضها ويبعت قراراته (مزايدة/تخلي/انسحاب).
// ============================================================

import type { AuctionSessionState } from './auctionEngine';
import { LiveChannel } from './liveChannel';

type Listener = (s: AuctionSessionState) => void;

export class RemoteAuctionEngine {
  private state: AuctionSessionState | null = null;
  private minBid = 1;
  private listeners: Listener[] = [];

  constructor(private ch: LiveChannel, private sid: () => string | null) {}

  apply(state: AuctionSessionState, minBid: number) {
    this.state = state;
    this.minBid = minBid;
    this.listeners.forEach((l) => l(state));
  }

  subscribe(l: Listener) {
    this.listeners.push(l);
    return () => {
      this.listeners = this.listeners.filter((x) => x !== l);
    };
  }

  getState(): AuctionSessionState {
    return this.state as AuctionSessionState;
  }
  getMinimumNextBid(): number {
    return this.minBid;
  }
  startAuction() {}
  destroy() {
    this.listeners = [];
  }

  placeBid(userId: string, customAmount?: number | string) {
    this.ch.send('act', { sid: this.sid(), type: 'bid', from: userId, amount: Number(customAmount) });
    return { success: true, message: '' };
  }
  skipPlayer(userId: string) {
    this.ch.send('act', { sid: this.sid(), type: 'skip', from: userId });
  }
  forfeitGame(userId: string) {
    this.ch.send('act', { sid: this.sid(), type: 'forfeit', from: userId });
  }
  useWildCard() {
    return { success: false, message: 'الكروت الخاصة غير متاحة في اللعب أونلاين' } as {
      success: boolean;
      message: string;
      oldPlayer?: any;
      newPlayer?: any;
    };
  }
  triggerNoRiskSimulation() {
    return { success: false, message: 'غير متاح أونلاين' };
  }
  completeNoRiskPhase() {}
}
