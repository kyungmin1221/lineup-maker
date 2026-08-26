// 라인업/라커룸 og 태그 생성 API가 공통으로 쓰는 헬퍼.
// 파일명이 _로 시작하면 Vercel이 별도 라우트로 노출하지 않음.
import { readFileSync } from 'fs';
import { join } from 'path';

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 함수 인스턴스가 재사용되는 동안(warm) 토큰을 캐싱해서, 매 요청마다
// 익명 계정을 새로 만드는 걸 피함
let cachedToken = null;

async function getFirebaseToken(apiKey) {
  if (cachedToken) return cachedToken;
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true }),
    }
  );
  const data = await r.json();
  cachedToken = data.idToken ?? null;
  return cachedToken;
}

// Firestore 문서 하나에서 문자열 필드 하나만 가져옴 (og 태그용, 최소한만 조회)
export async function fetchFirestoreField(collection, id, field) {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  const apiKey = process.env.VITE_FIREBASE_API_KEY;
  if (!projectId || !apiKey || !id) return null;

  try {
    const idToken = await getFirebaseToken(apiKey);
    const headers = idToken ? { Authorization: `Bearer ${idToken}` } : {};
    const url =
      `https://firestore.googleapis.com/v1/projects/${projectId}` +
      `/databases/(default)/documents/${collection}/${id}?key=${apiKey}`;
    const r = await fetch(url, { headers });
    if (!r.ok) {
      // 토큰 만료 등으로 실패했으면 캐시를 비워서 다음 요청 때 새로 발급
      cachedToken = null;
      return null;
    }
    const data = await r.json();
    return data.fields?.[field]?.stringValue ?? null;
  } catch (_) {
    return null;
  }
}

// 링크 미리보기 크롤러만 og 태그가 필요함 — 실제 사람이 누르고 들어오는
// 요청은 클라이언트 앱이 어차피 데이터를 다시 불러오므로, 서버에서
// Firebase 왕복 없이 정적 파일을 바로 반환
//
// 주의: 카카오톡은 일부러 빼뒀음. "KakaoTalk"만으로 매칭하면 실제
// 카카오톡 인앱 브라우저로 링크를 연 사용자의 UA에도 걸릴 위험이 큼
// (미리보기 스크랩 봇과 인앱 브라우저 UA가 비슷해서 정확한 구분 문자열을
// 확신할 수 없었음). 아래 목록은 스크랩 봇 전용 UA임을 확신할 수 있는
// 것만 남겼고, 나머지 플랫폼(카카오톡 포함)은 프로덕션 로그에서 실제
// user-agent를 확인한 뒤 정확한 패턴으로 추가하는 걸 권장
export const CRAWLER_UA = /facebookexternalhit|Twitterbot|Slackbot|Discordbot|TelegramBot|LinkedInBot/i;

export async function readIndexHtml(req) {
  try {
    return readFileSync(join(process.cwd(), 'dist', 'index.html'), 'utf-8');
  } catch (_) {
    // dist/index.html 접근 불가 시 CDN에서 직접 페치
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const r = await fetch(`${proto}://${req.headers.host}/index.html`);
    return r.text();
  }
}

export function sendHtml(res, html) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  res.end(html);
}

// title/description/url만 바꾸고 og:image 등은 그대로 둠(항상 기존 OG 화면 재사용)
export function applyOgTags(html, { title, description, url }) {
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
  html = html.replace(/<meta property="og:title"[^>]*>/g, `<meta property="og:title" content="${escapeHtml(title)}" />`);
  html = html.replace(/<meta property="og:description"[^>]*>/g, `<meta property="og:description" content="${escapeHtml(description)}" />`);
  html = html.replace(/<meta property="og:url"[^>]*>/g, `<meta property="og:url" content="${url}" />`);
  html = html.replace(/<meta name="twitter:title"[^>]*>/g, `<meta name="twitter:title" content="${escapeHtml(title)}" />`);
  html = html.replace(/<meta name="twitter:description"[^>]*>/g, `<meta name="twitter:description" content="${escapeHtml(description)}" />`);
  return html;
}
