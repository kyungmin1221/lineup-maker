import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// 배포 직후 구버전 index.html을 캐시로 들고 있으면, 그 안에 적힌 옛 해시의
// 페이지 청크가 서버에 더 이상 없어 로드가 실패할 수 있음 — 이때 한 번만
// 새로고침해서 최신 index.html(과 올바른 청크 경로)을 다시 받아오게 함.
// sessionStorage로 재시도 1회 제한 → 오프라인 등 다른 이유의 실패는 무한루프 방지
window.addEventListener('vite:preloadError', () => {
  const RELOAD_KEY = 'lineup-maker:reloaded-after-preload-error';
  if (sessionStorage.getItem(RELOAD_KEY)) return;
  sessionStorage.setItem(RELOAD_KEY, '1');
  window.location.reload();
});

// Firebase SDK(555KB) 다운로드를 React 렌더 전에 즉시 시작 + 인증 상태 pre-warm
// → 페이지 lazy-load 때는 이미 다운로드/인증이 진행 중이어서 대기 시간 단축
import('./firebase/auth').then(({ ensureSignedIn }) => {
  ensureSignedIn().catch(() => {});
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
