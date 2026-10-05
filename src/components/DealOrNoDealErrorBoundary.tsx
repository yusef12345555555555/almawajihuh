import React from 'react';

interface Props { children: React.ReactNode; onBack: () => void; }
interface State { failed: boolean; }

export class DealOrNoDealErrorBoundary extends React.Component<Props, State> {
  state: State = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.error('DealOrNoDeal runtime error:', error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center bg-black text-white px-5">
        <div className="w-full max-w-sm rounded-3xl border border-rose-500/30 bg-zinc-950 p-6 text-center space-y-4">
          <div className="text-3xl">⚠️</div>
          <div className="text-lg font-black">حصلت مشكلة في شاشة ديل أور نو ديل</div>
          <div className="text-xs text-zinc-400">رجّع للعبة وحاول تاني — اللعبة لن تفضل شاشة سودا.</div>
          <button type="button" onClick={this.props.onBack} className="w-full rounded-2xl bg-amber-400 py-3 font-black text-black">العودة للألعاب</button>
        </div>
      </div>
    );
  }
}
