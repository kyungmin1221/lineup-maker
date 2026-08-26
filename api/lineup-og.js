import { CRAWLER_UA, fetchFirestoreField, readIndexHtml, sendHtml, applyOgTags } from './_og.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!CRAWLER_UA.test(req.headers['user-agent'] || '')) {
    sendHtml(res, await readIndexHtml(req));
    return;
  }

  const teamName = await fetchFirestoreField('lineups', id, 'teamName');
  const title = teamName ?? 'lineupmaker';
  const description = teamName
    ? `${teamName}의 라인업을 확인해보세요`
    : '나만의 라인업을 만들고 공유하세요';
  const siteUrl = 'https://lineup-maker-tau.vercel.app';
  const pageUrl = id ? `${siteUrl}/view/${id}` : siteUrl;

  const html = applyOgTags(await readIndexHtml(req), { title, description, url: pageUrl });
  sendHtml(res, html);
}
