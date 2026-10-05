import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AdminApp } from './admin/AdminApp.tsx';
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import { applyResetEpoch } from './services/resetEpoch.ts';
import './index.css';

// Visiting /admin (e.g. yourdomain.com/admin) loads the isolated admin
// panel instead of the normal game — completely separate from the
// player-facing experience and its navigation.
const isAdminRoute = window.location.pathname.replace(/\/+$/, '') === '/admin';

async function bootstrap() {
  // بعد مسح المستخدمين من السيرفر: الجهاز يمسح بياناته القديمة مرة واحدة قبل ما اللعبة تفتح
  if (!isAdminRoute) {
    try {
      await applyResetEpoch();
    } catch {
      /* ignore */
    }
  }
  createRoot(document.getElementById('root')!).render(
    <ThemeProvider>{isAdminRoute ? <AdminApp /> : <App />}</ThemeProvider>,
  );
}
void bootstrap();
