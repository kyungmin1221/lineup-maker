import { readFileSync } from 'fs';
import { join } from 'path';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default async function handler(req, res) {
  const { id } = req.query;

  let teamName = null;

  if (id) {
    try {
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
      const apiKey = process.env.VITE_FIREBASE_API_KEY;
      const firestoreUrl =
        `https://firestore.googleapis.com/v1/projects/${projectId}` +
        `/databases/(default)/documents/lineups/${id}?key=${apiKey}`;

      const r = await fetch(firestoreUrl);
      if (r.ok) {
        const data = await r.json();
        teamName = data.fields?.teamName?.stringValue ?? null;
      }
    } catch (_) {}
  }

  const title = teamName ?? 'lineupmaker';
  const description = teamName
    ? `${teamName}의 라인업을 확인해보세요`
    : '나만의 라인업을 만들고 공유하세요';
  const siteUrl = 'https://lineup-maker-tau.vercel.app';
  const pageUrl = id ? `${siteUrl}/view/${id}` : siteUrl;
  const ogImage = `${siteUrl}/og-image.png`;

  let html = readFileSync(join(process.cwd(), 'dist', 'index.html'), 'utf-8');

  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(title)}</title>`
  );

  // og:url 앞에 og:title·og:description 삽입하고, og:url 값도 교체
  html = html.replace(
    /<meta property="og:url"[^>]*>/,
    `<meta property="og:title" content="${escapeHtml(title)}" />\n    <meta property="og:description" content="${escapeHtml(description)}" />\n    <meta property="og:url" content="${pageUrl}" />`
  );

  // twitter:image 뒤에 twitter:title·twitter:description 추가
  html = html.replace(
    /(<meta name="twitter:image"[^>]*>)/,
    `$1\n    <meta name="twitter:title" content="${escapeHtml(title)}" />\n    <meta name="twitter:description" content="${escapeHtml(description)}" />`
  );

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  res.end(html);
}
