// ============================================================
// المواجهة | قناة اللعب اللحظي بين لاعبين حقيقيين (Supabase Realtime Broadcast)
// - بتشتغل من غير جداول: رسائل مباشرة بين الجهازين (~100-200ms).
// - كل زوج لاعبين له قناة ثابتة؛ كل رسالة بتتعلّم بـ sid (جلسة اللعبة) عشان الإعادات ما تتلخبطش.
// ============================================================

import { getSupabaseClient } from './supabaseClient';

type Handler = (payload: any) => void;

export class LiveChannel {
  private ch: any = null;
  private handlers = new Map<string, Set<Handler>>();
  private ready = false;
  /** آخر حالة اتصال (SUBSCRIBED / CHANNEL_ERROR / TIMED_OUT / CLOSED / THROWN) — للتشخيص */
  public lastStatus = '';

  constructor(public readonly topic: string) {}

  static pairTopic(a: string, b: string): string {
    return 'mwlive-' + [a, b].sort().join('-').replace(/[^a-zA-Z0-9_-]/g, '');
  }

  /** يشترك في القناة. يرجّع true لما الاتصال يجهز (أو false بعد المهلة). */
  async join(timeoutMs = 8000): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;
    // قناة قديمة بنفس الاسم (خروج/دخول سريع) لازم تتشال ونستنى لحد ما تتشال فعلاً،
    // وإلا supabase بيرجّع نفس القناة المشتركة وبيرمي خطأ عند إضافة مستمعين جديدة.
    try {
      const stale = (client as any).getChannels?.().filter((c: any) => c.topic === `realtime:${this.topic}`) || [];
      await Promise.all(stale.map((c: any) => Promise.resolve(client.removeChannel(c)).catch(() => undefined)));
    } catch {
      /* ignore */
    }
    return new Promise<boolean>((resolve) => {
      let settled = false;
      const done = (v: boolean) => {
        if (!settled) {
          settled = true;
          resolve(v);
        }
      };
      try {
        this.ch = client.channel(this.topic, { config: { broadcast: { self: false, ack: false } } });
        this.ch.on('broadcast', { event: 'msg' }, ({ payload }: { payload: { ev: string; data: any } }) => {
          const set = this.handlers.get(payload?.ev);
          set?.forEach((h) => {
            try {
              h(payload.data);
            } catch {
              /* ignore */
            }
          });
        });
        this.ch.subscribe((status: string) => {
          this.lastStatus = status;
          if (status === 'SUBSCRIBED') {
            this.ready = true;
            done(true);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            this.ready = false;
            done(false);
          }
        });
      } catch (e) {
        this.lastStatus = 'THROWN:' + String((e as Error)?.message || e);
        done(false);
      }
      setTimeout(() => done(this.ready), timeoutMs);
    });
  }

  on(ev: string, h: Handler): () => void {
    if (!this.handlers.has(ev)) this.handlers.set(ev, new Set());
    this.handlers.get(ev)!.add(h);
    return () => this.handlers.get(ev)?.delete(h);
  }

  send(ev: string, data: any = {}): void {
    if (!this.ch) return;
    try {
      void this.ch.send({ type: 'broadcast', event: 'msg', payload: { ev, data } });
    } catch {
      /* ignore */
    }
  }

  leave(): void {
    try {
      const client = getSupabaseClient();
      const mine = this.ch;
      this.ch = null;
      if (mine && client) void client.removeChannel(mine);
    } catch {
      /* ignore */
    }
    this.ch = null;
    this.handlers.clear();
    this.ready = false;
  }
}
