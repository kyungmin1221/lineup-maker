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
  if (!projectId || !apiKey || !id) {
    console.log('[og-debug] fetchFirestoreField skipped: missing projectId/apiKey/id', { collection, id, hasProjectId: !!projectId, hasApiKey: !!apiKey });
    return null;
  }

  try {
    const idToken = await getFirebaseToken(apiKey);
    const headers = idToken ? { Authorization: `Bearer ${idToken}` } : {};
    const url =
      `https://firestore.googleapis.com/v1/projects/${projectId}` +
      `/databases/(default)/documents/${collection}/${id}?key=${apiKey}`;
    const r = await fetch(url, { headers });
    if (!r.ok) {
      // 실패 원인(권한 문제인지, 문서가 없는지 등)을 그대로 남김
      const body = await r.text().catch(() => '');
      console.log('[og-debug] Firestore fetch failed', { collection, id, field, status: r.status, hadToken: !!idToken, body: body.slice(0, 500) });
      // 토큰 만료 등으로 실패했으면 캐시를 비워서 다음 요청 때 새로 발급
      cachedToken = null;
      return null;
    }
    const data = await r.json();
    const value = data.fields?.[field]?.stringValue ?? null;
    console.log('[og-debug] Firestore fetch ok', { collection, id, field, value });
    return value;
  } catch (err) {
    console.log('[og-debug] fetchFirestoreField threw', { collection, id, field, error: String(err) });
    return null;
  }
}

// 링크 미리보기 크롤러만 og 태그가 필요함 — 실제 사람이 누르고 들어오는
// 요청은 클라이언트 앱이 어차피 데이터를 다시 불러오므로, 서버에서
// Firebase 왕복 없이 정적 파일을 바로 반환
//
// 카카오톡 스크랩 봇: "scrap"을 구분자로 씀. 카카오 개발자센터에서도 이
// 링크 미리보기 기능을 "스크랩 메시지"라고 부르는 걸 확인했고, 인앱
// 브라우저 UA에는 보통 "scrap"이 들어가지 않아서 상대적으로 안전한
// 구분자로 판단해 추가함. 만약 실제 사용자가 여전히 느려진다면(=인앱
// 브라우저가 오탐되고 있다면) logIfKakao 로그로 실제 UA를 확인해서
// 더 좁혀야 함
export const CRAWLER_UA = /facebookexternalhit|Twitterbot|Slackbot|Discordbot|TelegramBot|LinkedInBot|kakaotalk.*scrap|scrap.*kakaotalk/i;

// 카카오 관련 요청의 실제 user-agent를 Vercel 로그에 남김 — 스크랩 봇과
// 인앱 브라우저를 구분할 정확한 문자열을 확인하기 위한 임시 진단용
export function logIfKakao(req) {
  const ua = req.headers['user-agent'] || '';
  if (/kakao/i.test(ua)) {
    console.log('[og-debug] kakao-related user-agent:', ua);
  }
}

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
