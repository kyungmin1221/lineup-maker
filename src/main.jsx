import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

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
