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

    if (url.pathname === '/check-recipe') {
      const recipeUrl = url.searchParams.get('url');
      if (!recipeUrl) {
        return corsResponse(JSON.stringify({ error: 'Missing url' }), 400);
      }

      try {
        const res = await fetch(recipeUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });
        const html = await res.text();
        const hasRecipe = hasJsonLdRecipe(html);
        return corsResponse(JSON.stringify({ hasRecipe }), 200);
      } catch {
        return corsResponse(JSON.stringify({ hasRecipe: false }), 200);
      }
    }

    return corsResponse(JSON.stringify({ error: 'Not found' }), 404);
  },
};

function hasJsonLdRecipe(html) {
  const matches = html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of matches) {
    try {
      const data = JSON.parse(match[1]);
      let recipe = null;
      if (Array.isArray(data)) recipe = data.find(d => d['@type'] === 'Recipe');
      else if (data['@type'] === 'Recipe') recipe = data;
      else if (data['@graph']) recipe = data['@graph'].find(d => d['@type'] === 'Recipe');

      if (!recipe) continue;

      const ingredients = recipe.recipeIngredient;
      if (Array.isArray(ingredients) && ingredients.length > 1) return true;
    } catch {
      continue;
    }
  }
  return false;
}

function corsResponse(body, status) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': 'https://recipes-8bb.pages.dev',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
