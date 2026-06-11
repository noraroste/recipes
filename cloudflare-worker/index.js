export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    if (url.pathname === '/exchange') {
      const code = url.searchParams.get('code');
      if (!code) {
        return corsResponse(JSON.stringify({ error: 'Missing code' }), 400);
      }

      const res = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      const data = await res.json();
      return corsResponse(JSON.stringify(data), res.status);
    }

    if (url.pathname === '/suggest-tags') {
      const recipeUrl = url.searchParams.get('url');
      const existingTags = url.searchParams.get('tags') || '';
      const token = request.headers.get('Authorization')?.replace('Bearer ', '');

      if (!recipeUrl || !token) {
        return corsResponse(JSON.stringify({ error: 'Missing url or token' }), 400);
      }

      let title = '', description = '';
      try {
        const pageRes = await fetch(recipeUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; recipe-tagger/1.0)' },
        });
        const html = await pageRes.text();
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) title = titleMatch[1].trim();
        const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{0,300})["']/i)
          || html.match(/<meta[^>]+content=["']([^"']{0,300})["'][^>]+name=["']description["']/i);
        if (descMatch) description = descMatch[1].trim();
      } catch {}

      const prompt = `You are helping tag recipes on a personal recipe collection site.

Recipe title: ${title}
Recipe description: ${description}
Recipe URL: ${recipeUrl}

Available tags: ${existingTags}

Pick 3-5 tags from the available list that best describe this recipe. Only use tags from the list. Return ONLY a JSON array of strings, nothing else. Example: ["quick", "fish", "comfort"]`;

      try {
        const modelRes = await fetch('https://models.inference.ai.azure.com/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 100,
          }),
        });

        const modelData = await modelRes.json();
        const content = modelData.choices?.[0]?.message?.content?.trim() || '[]';
        const suggested = JSON.parse(content);
        return corsResponse(JSON.stringify({ suggested }), 200);
      } catch {
        return corsResponse(JSON.stringify({ suggested: [] }), 200);
      }
    }

    return corsResponse(JSON.stringify({ error: 'Not found' }), 404);
  },
};

function corsResponse(body, status) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': 'https://noraroste.github.io',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
