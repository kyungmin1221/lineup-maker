import { readFileSync } from 'fs';
import { join } from 'path';

function escapeHtml(str) {
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

async function fetchTeamName(id) {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  const apiKey = process.env.VITE_FIREBASE_API_KEY;
  if (!projectId || !apiKey || !id) return null;

  try {
    const idToken = await getFirebaseToken(apiKey);
    const headers = idToken ? { Authorization: `Bearer ${idToken}` } : {};
    const url =
      `https://firestore.googleapis.com/v1/projects/${projectId}` +
      `/databases/(default)/documents/lineups/${id}?key=${apiKey}`;
    const r = await fetch(url, { headers });
    if (!r.ok) {
      // 토큰 만료 등으로 실패했으면 캐시를 비워서 다음 요청 때 새로 발급
      cachedToken = null;
      return null;
    }
    const data = await r.json();
    return data.fields?.teamName?.stringValue ?? null;
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
const CRAWLER_UA = /facebookexternalhit|Twitterbot|Slackbot|Discordbot|TelegramBot|LinkedInBot/i;

async function readIndexHtml(req) {
  try {
    return readFileSync(join(process.cwd(), 'dist', 'index.html'), 'utf-8');
  } catch (_) {
    // dist/index.html 접근 불가 시 CDN에서 직접 페치
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const r = await fetch(`${proto}://${req.headers.host}/index.html`);
    return r.text();
  }
}

function sendHtml(res, html) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  res.end(html);
}

export default async function handler(req, res) {
  const { id } = req.query;

  if (!CRAWLER_UA.test(req.headers['user-agent'] || '')) {
    sendHtml(res, await readIndexHtml(req));
    return;
  }

  const teamName = await fetchTeamName(id);

  const title = teamName ?? 'lineupmaker';
  const description = teamName
    ? `${teamName}의 라인업을 확인해보세요`
    : '나만의 라인업을 만들고 공유하세요';
  const siteUrl = 'https://lineup-maker-tau.vercel.app';
  const pageUrl = id ? `${siteUrl}/view/${id}` : siteUrl;

  let html = await readIndexHtml(req);

  // <title> 교체
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);

  // 기존 og: 태그를 라인업 정보로 교체 (g 플래그: 중복 제거)
  html = html.replace(/<meta property="og:title"[^>]*>/g, `<meta property="og:title" content="${escapeHtml(title)}" />`);
  html = html.replace(/<meta property="og:description"[^>]*>/g, `<meta property="og:description" content="${escapeHtml(description)}" />`);
  html = html.replace(/<meta property="og:url"[^>]*>/g, `<meta property="og:url" content="${pageUrl}" />`);

  // 기존 twitter: 태그 교체
  html = html.replace(/<meta name="twitter:title"[^>]*>/g, `<meta name="twitter:title" content="${escapeHtml(title)}" />`);
  html = html.replace(/<meta name="twitter:description"[^>]*>/g, `<meta name="twitter:description" content="${escapeHtml(description)}" />`);

  sendHtml(res, html);
}
