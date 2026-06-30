function loginWithGitHub() {
  RecipeAuth.login();
}

function logout() {
  RecipeAuth.logout();
  showLogin();
}

function showLogin() {
  document.getElementById('login-section').style.display = '';
  document.getElementById('form-section').style.display = 'none';
}

async function showForm(username) {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('form-section').style.display = '';
  document.getElementById('username-display').textContent = username;
  setStatus('Checking repository access...');

  const token = RecipeAuth.getToken();
  const hasAccess = await RecipeAuth.checkWriteAccess(token, username);

  if (!hasAccess) {
    setStatus('You do not have write access to this repository. Contact the repo owner.');
    document.getElementById('submit-btn').disabled = true;
    return;
  }

  setStatus('');
  await loadCategories();
}

function handleCategoryChange() {
  const select = document.getElementById('category');
  const newCatInput = document.getElementById('new-category');
  newCatInput.style.display = select.value === '__new__' ? '' : 'none';
}

async function submitRecipe(event) {
  event.preventDefault();

  const token = RecipeAuth.getToken();
  if (!token) { showLogin(); return; }

  const url = document.getElementById('url').value.trim();
  const categorySelect = document.getElementById('category');
  const category = categorySelect.value === '__new__'
    ? document.getElementById('new-category').value.trim()
    : categorySelect.value;
  const tags = document.getElementById('tags').value.trim();

  if (!url || !category) {
    setStatus('URL and category are required.');
    return;
  }

  const manualIngredients = document.getElementById('manual-ingredients').value.trim();
  const manualInstructions = document.getElementById('manual-instructions').value.trim();
  const manualSection = document.getElementById('manual-recipe-section').style.display !== 'none'
    && (manualIngredients || manualInstructions)
    ? `\n---ingredients---\n${manualIngredients}\n---instructions---\n${manualInstructions}\n`
    : '';

  const fileContent = `${url}\n[${category}]\n[${tags}]${manualSection}\n`;
  const fileName = `add-new-posts-here/${Date.now()}.txt`;
  const encoded = btoa(unescape(encodeURIComponent(fileContent)));

  setStatus('Adding recipe...');
  document.getElementById('submit-btn').disabled = true;

  const res = await fetch(`https://api.github.com/repos/${RecipeAuth.REPO_OWNER}/${RecipeAuth.REPO_NAME}/contents/${fileName}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `Add recipe: ${url}`,
      content: encoded,
    }),
  });

  document.getElementById('submit-btn').disabled = false;

  if (res.ok) {
    setStatus('Recipe added! It will appear on the site shortly.');
    document.getElementById('recipe-form').reset();
    document.getElementById('new-category').style.display = 'none';
  } else if (res.status === 403 || res.status === 404) {
    setStatus('You do not have write access to this repository.');
  } else {
    setStatus(`Something went wrong (${res.status}). Please try again.`);
  }
}

function setStatus(msg) {
  document.getElementById('status-msg').textContent = msg;
}

function getSelectedTags() {
  return document.getElementById('tags').value
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0);
}

function setSelectedTags(tags) {
  document.getElementById('tags').value = tags.join(', ');
}

function toggleTag(tag) {
  const current = getSelectedTags();
  const idx = current.indexOf(tag);
  if (idx >= 0) {
    current.splice(idx, 1);
  } else {
    current.push(tag);
  }
  setSelectedTags(current);
  renderTagChips();
}

function renderTagChips(suggested = []) {
  const selected = getSelectedTags();
  document.querySelectorAll('#tag-chips .tag-chip').forEach(chip => {
    const tag = chip.dataset.tag;
    const isSelected = selected.includes(tag);
    const isSuggested = suggested.includes(tag);
    chip.classList.toggle('btn-primary', isSelected);
    chip.classList.toggle('btn-success', !isSelected && isSuggested);
    chip.classList.toggle('btn-outline-secondary', !isSelected && !isSuggested);
  });
}

async function suggestTags(recipeUrl, allTags) {
  const token = RecipeAuth.getToken();
  if (!token || !recipeUrl || allTags.length === 0) return [];

  const prompt = `You are helping tag recipes on a personal recipe collection site.
Recipe URL: ${recipeUrl}
Available tags: ${allTags.join(', ')}
Pick 3-5 tags from the available list that best describe this recipe. Only use tags from the list. Return ONLY a JSON array of strings, nothing else. Example: ["quick", "fish", "comfort"]`;

  try {
    const res = await fetch('https://models.inference.ai.azure.com/chat/completions', {
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
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '[]';
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function checkRecipeJsonLd(recipeUrl) {
  try {
    const res = await fetch(`${WORKER_URL}/check-recipe?url=${encodeURIComponent(recipeUrl)}`);
    const data = await res.json();
    document.getElementById('manual-recipe-section').style.display = data.hasRecipe ? 'none' : '';
  } catch {
    // silently ignore — don't block the form
  }
}

async function loadCategories() {
  const token = RecipeAuth.getToken();
  const select = document.getElementById('category');
  select.innerHTML = '<option value="">-- Loading categories... --</option>';
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(
      `https://api.github.com/repos/${RecipeAuth.REPO_OWNER}/${RecipeAuth.REPO_NAME}/git/trees/main?recursive=1`,
      { headers }
    );
    const tree = await res.json();
    const postFiles = tree.tree.filter(f => f.path.startsWith('_posts/') && f.path.endsWith('.md'));

    const categories = new Set();
    const tags = new Set();
    await Promise.all(postFiles.map(async file => {
      const r = await fetch(
        `https://raw.githubusercontent.com/${RecipeAuth.REPO_OWNER}/${RecipeAuth.REPO_NAME}/main/${file.path}`
      );
      const text = await r.text();
      const catMatch = text.match(/^categories:\s*\[([^\]]+)\]/m);
      if (catMatch) catMatch[1].split(',').forEach(c => categories.add(c.trim()));
      const tagMatch = text.match(/^tags:\s*\[([^\]]+)\]/m);
      if (tagMatch) tagMatch[1].split(',').forEach(t => { const v = t.trim(); if (v) tags.add(v); });
    }));

    select.innerHTML = '<option value="">-- Select category --</option>';
    [...categories].sort().forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      select.appendChild(opt);
    });

    const allTags = [...tags].sort();
    const chipsContainer = document.getElementById('tag-chips');
    chipsContainer.innerHTML = '';
    allTags.forEach(tag => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tag-chip btn btn-sm btn-outline-secondary';
      btn.dataset.tag = tag;
      btn.textContent = tag;
      btn.addEventListener('click', () => toggleTag(tag));
      chipsContainer.appendChild(btn);
    });
    document.getElementById('tag-suggestions').style.display = '';
    document.getElementById('tags').addEventListener('input', () => renderTagChips());

    document.getElementById('url').addEventListener('blur', async () => {
      const recipeUrl = document.getElementById('url').value.trim();
      if (!recipeUrl) return;
      document.getElementById('suggest-status').textContent = 'Suggesting tags...';
      const s = await suggestTags(recipeUrl, allTags);
      if (s.length > 0) {
        const current = getSelectedTags();
        const toAdd = s.filter(t => !current.includes(t));
        setSelectedTags([...current, ...toAdd]);
        renderTagChips(s);
      }
      document.getElementById('suggest-status').textContent = '';
    });
  } catch {
    select.innerHTML = '<option value="">-- Could not load categories --</option>';
  }
  const newOpt = document.createElement('option');
  newOpt.value = '__new__';
  newOpt.textContent = '+ New category...';
  select.appendChild(newOpt);
}

function init() {
  document.getElementById('login-btn').addEventListener('click', loginWithGitHub);
  document.getElementById('logout-btn').addEventListener('click', (e) => { e.preventDefault(); logout(); });
  document.getElementById('recipe-form').addEventListener('submit', submitRecipe);
  document.getElementById('category').addEventListener('change', handleCategoryChange);
  document.getElementById('url').addEventListener('blur', async () => {
    const recipeUrl = document.getElementById('url').value.trim();
    if (!recipeUrl) return;
    await checkRecipeJsonLd(recipeUrl);
  });

  RecipeAuth.init().then(result => {
    if (result) {
      showForm(result.username);
    } else if (RecipeAuth.getToken()) {
      showForm(RecipeAuth.getUsername());
    } else {
      showLogin();
    }
  });
}

function tryInit() {
  if (document.getElementById('login-btn')) {
    init();
  } else {
    const observer = new MutationObserver(() => {
      if (document.getElementById('login-btn')) {
        observer.disconnect();
        init();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', tryInit);
} else {
  tryInit();
}
