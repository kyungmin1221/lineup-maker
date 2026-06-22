// gtag.js 래퍼 — gtag이 아직 로드되지 않은 경우에도 안전하게 호출 가능
// (index.html의 인라인 스크립트가 dataLayer를 즉시 준비해두므로 호출이 큐잉됨)

function isReady() {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
}

export function trackPageView(path) {
  if (!isReady()) return;
  window.gtag('event', 'page_view', { page_path: path });
}

export function trackEvent(name, params = {}) {
  if (!isReady()) return;
  window.gtag('event', name, params);
}
