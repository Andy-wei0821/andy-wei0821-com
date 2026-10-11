// Cloudflare Worker · Reverse proxy for /api/* -> Supabase REST
// Static assets pass through unchanged. Avoids browser CORS preflight failures.

const SUPABASE_URL = 'https://sqoodnphzbzuqwhlgtoos.supabase.co';
const SUPABASE_KEY = 'sb_publishable_-pHlNCAl_EUdfxWHHQGW_A_h9iJXGs7';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      const restPath = url.pathname.replace(/^\/api/, '/rest/v1');
      const target = `${SUPABASE_URL}${restPath}${url.search}`;
      const headers = new Headers(request.headers);
      headers.set('apikey', SUPABASE_KEY);
      headers.set('Authorization', `Bearer ${SUPABASE_KEY}`);
      headers.set('Host', new URL(SUPABASE_URL).host);
      headers.delete('Origin');
      headers.delete('Referer');
      const newReq = new Request(target, {
        method: request.method,
        headers,
        body: (request.method === 'GET' || request.method === 'HEAD') ? undefined : request.body,
      });
      try {
        const resp = await fetch(newReq);
        const newHeaders = new Headers(resp.headers);
        newHeaders.set('Access-Control-Allow-Origin', '*');
        newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
        newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, Prefer');
        return new Response(resp.body, { status: resp.status, headers: newHeaders });
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Proxy error', message: e.message }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, Prefer',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
