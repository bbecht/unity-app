// Minimal Cloudflare Worker that forwards the app's POSTs to the Notion API with CORS headers.
// Deploy with `wrangler deploy` after setting two secrets:
//   NOTION_TOKEN  - the internal integration token (shared with the three databases)
//   APP_KEY       - any long random string; paste the same value into the app's Token field
// Then put the worker URL into the app's Notion endpoint field.
export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Notion-Version',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return new Response('POST only', { status: 405, headers: cors });
    const auth = request.headers.get('Authorization') || '';
    if (env.APP_KEY && auth !== `Bearer ${env.APP_KEY}`) return new Response('unauthorized', { status: 401, headers: cors });
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/v1/')) return new Response('not found', { status: 404, headers: cors });
    const res = await fetch('https://api.notion.com' + url.pathname, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Notion-Version': '2022-06-28', Authorization: `Bearer ${env.NOTION_TOKEN}` },
      body: await request.text(),
    });
    return new Response(await res.text(), { status: res.status, headers: { ...cors, 'Content-Type': 'application/json' } });
  },
};
