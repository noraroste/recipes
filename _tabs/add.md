---
icon: fas fa-plus
order: 5
title: Add Recipe
---

<div id="app">
  <div id="login-section">
    <p>You need to log in with GitHub to add a recipe.</p>
    <button id="login-btn">Log in with GitHub</button>
  </div>

  <div id="form-section" style="display:none">
    <p>Logged in as <strong id="username-display"></strong>. <a href="#" id="logout-btn">Log out</a></p>

    <form id="recipe-form">
      <label for="url">Recipe URL</label>
      <input type="url" id="url" required placeholder="https://..." />

      <label for="category">Category</label>
      <select id="category">
        <option value="">-- Loading categories... --</option>
      </select>
      <input type="text" id="new-category" placeholder="New category name" style="display:none; margin-top:0.5rem" />

      <label for="tags">Tags <small>(comma separated, e.g. quick, easy, vegetarian)</small></label>
      <input type="text" id="tags" placeholder="quick, easy, vegetarian" />

      <button type="submit" id="submit-btn">Add recipe</button>
      <p id="status-msg"></p>
    </form>
  </div>
</div>

<style>
  #app label { display: block; margin-top: 1rem; font-weight: bold; }
  #app input[type="url"],
  #app input[type="text"],
  #app select { width: 100%; padding: 0.5rem; margin-top: 0.25rem; box-sizing: border-box; }
  #app button { margin-top: 1.5rem; padding: 0.6rem 1.5rem; cursor: pointer; }
  #status-msg { margin-top: 1rem; font-style: italic; }
</style>

<script>
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

    // Clean up URL
    window.history.replaceState({}, '', window.location.pathname);

    showForm(user.login);
  }

  function showLogin() {
    document.getElementById('login-section').style.display = '';
    document.getElementById('form-section').style.display = 'none';
  }

  function showForm(username) {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('form-section').style.display = '';
    document.getElementById('username-display').textContent = username;
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

  async function loadCategories() {
    const select = document.getElementById('category');
    try {
      const res = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/main?recursive=1`
      );
      const tree = await res.json();
      const postFiles = tree.tree.filter(f => f.path.startsWith('_posts/') && f.path.endsWith('.md'));

      const categories = new Set();
      await Promise.all(postFiles.map(async file => {
        const r = await fetch(
          `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${file.path}`
        );
        const text = await r.text();
        const match = text.match(/^categories:\s*\[([^\]]+)\]/m);
        if (match) match[1].split(',').forEach(c => categories.add(c.trim()));
      }));

      select.innerHTML = '<option value="">-- Select category --</option>';
      [...categories].sort().forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        select.appendChild(opt);
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

    loadCategories();

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
</script>
