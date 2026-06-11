const GITHUB_CLIENT_ID = 'Ov23liH1aZHQ0xm7uZHA';
const WORKER_URL = 'https://recipes-oauth.recipe-oauth-handler.workers.dev';
const REPO_OWNER = 'noraroste';
const REPO_NAME = 'recipies';

function loginWithGitHub() {
  const state = crypto.randomUUID();
  sessionStorage.setItem('oauth_state', state);
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    scope: 'public_repo',
    state,
  });
  window.location.href = `https://github.com/login/oauth/authorize?${params}`;
}

function logout() {
  sessionStorage.removeItem('github_token');
  sessionStorage.removeItem('github_username');
  showLogin();
}

async function handleOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');

  if (!code) return;

  if (state !== sessionStorage.getItem('oauth_state')) {
    setStatus('Invalid OAuth state. Please try again.');
    return;
  }

  setStatus('Logging in...');

  const res = await fetch(`${WORKER_URL}/exchange?code=${code}`);
  const data = await res.json();

  if (!data.access_token) {
    setStatus('Login failed. Please try again.');
    return;
  }

  sessionStorage.setItem('github_token', data.access_token);

  const userRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${data.access_token}` }
  });
  const user = await userRes.json();
  sessionStorage.setItem('github_username', user.login);

  window.history.replaceState({}, '', window.location.pathname);

  await showForm(user.login);
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

  const token = sessionStorage.getItem('github_token');
  const permRes = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/collaborators/${username}/permission`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!permRes.ok) {
    setStatus('You do not have access to this repository. Contact the repo owner.');
    document.getElementById('submit-btn').disabled = true;
    return;
  }

  const permData = await permRes.json();
  const level = permData.permission;
  if (level !== 'write' && level !== 'admin' && level !== 'maintain') {
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

  const token = sessionStorage.getItem('github_token');
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

  const fileContent = `${url}\n[${category}]\n[${tags}]\n`;
  const fileName = `add-new-posts-here/${Date.now()}.txt`;
  const encoded = btoa(unescape(encodeURIComponent(fileContent)));

  setStatus('Adding recipe...');
  document.getElementById('submit-btn').disabled = true;

  const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${fileName}`, {
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
  const token = sessionStorage.getItem('github_token');
  if (!token || !recipeUrl || allTags.length === 0) return [];
  try {
    const params = new URLSearchParams({ url: recipeUrl, tags: allTags.join(',') });
    const res = await fetch(`${WORKER_URL}/suggest-tags?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return data.suggested || [];
  } catch {
    return [];
  }
}

async function loadCategories() {
  const token = sessionStorage.getItem('github_token');
  const select = document.getElementById('category');
  select.innerHTML = '<option value="">-- Loading categories... --</option>';
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/main?recursive=1`,
      { headers }
    );
    const tree = await res.json();
    const postFiles = tree.tree.filter(f => f.path.startsWith('_posts/') && f.path.endsWith('.md'));

    const categories = new Set();
    const tags = new Set();
    await Promise.all(postFiles.map(async file => {
      const r = await fetch(
        `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${file.path}`
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

    const urlInput = document.getElementById('url');
    urlInput.addEventListener('blur', async () => {
      const recipeUrl = urlInput.value.trim();
      if (!recipeUrl) return;
      document.getElementById('suggest-status').textContent = 'Suggesting tags...';
      const suggested = await suggestTags(recipeUrl, allTags);
      document.getElementById('suggest-status').textContent = '';
      if (suggested.length === 0) return;
      const current = getSelectedTags();
      const toAdd = suggested.filter(t => !current.includes(t));
      setSelectedTags([...current, ...toAdd]);
      renderTagChips(suggested);
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

  const savedToken = sessionStorage.getItem('github_token');
  const savedUser = sessionStorage.getItem('github_username');

  if (savedToken && savedUser) {
    showForm(savedUser);
  } else {
    handleOAuthCallback();
  }
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
