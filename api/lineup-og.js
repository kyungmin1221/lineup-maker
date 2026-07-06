import { readFileSync } from 'fs';
import { join } from 'path';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function getFirebaseToken(apiKey) {
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true }),
    }
  );
  const data = await r.json();
  return data.idToken ?? null;
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
    if (!r.ok) return null;
    const data = await r.json();
    return data.fields?.teamName?.stringValue ?? null;
  } catch (_) {
    return null;
  }
}

export default async function handler(req, res) {
  const { id } = req.query;

  const teamName = await fetchTeamName(id);

  const title = teamName ?? 'lineupmaker';
  const description = teamName
    ? `${teamName}의 라인업을 확인해보세요`
    : '나만의 라인업을 만들고 공유하세요';
  const siteUrl = 'https://lineup-maker-tau.vercel.app';
  const pageUrl = id ? `${siteUrl}/view/${id}` : siteUrl;

  let html;
  try {
    html = readFileSync(join(process.cwd(), 'dist', 'index.html'), 'utf-8');
  } catch (_) {
    // dist/index.html 접근 불가 시 CDN에서 직접 페치
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const r = await fetch(`${proto}://${req.headers.host}/index.html`);
    html = await r.text();
  }

  // <title> 교체
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);

  // 기존 og: 태그를 라인업 정보로 교체 (g 플래그: 중복 제거)
  html = html.replace(/<meta property="og:title"[^>]*>/g, `<meta property="og:title" content="${escapeHtml(title)}" />`);
  html = html.replace(/<meta property="og:description"[^>]*>/g, `<meta property="og:description" content="${escapeHtml(description)}" />`);
  html = html.replace(/<meta property="og:url"[^>]*>/g, `<meta property="og:url" content="${pageUrl}" />`);

  // 기존 twitter: 태그 교체
  html = html.replace(/<meta name="twitter:title"[^>]*>/g, `<meta name="twitter:title" content="${escapeHtml(title)}" />`);
  html = html.replace(/<meta name="twitter:description"[^>]*>/g, `<meta name="twitter:description" content="${escapeHtml(description)}" />`);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  res.end(html);
}
