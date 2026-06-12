const GITHUB_CLIENT_ID = 'Ov23liH1aZHQ0xm7uZHA';
const WORKER_URL = 'https://recipes-oauth.recipe-oauth-handler.workers.dev';
const REPO_OWNER = 'noraroste';
const REPO_NAME = 'recipies';

function getToken() {
  return sessionStorage.getItem('github_token');
}

function getUsername() {
  return sessionStorage.getItem('github_username');
}

function login() {
  const state = crypto.randomUUID();
  sessionStorage.setItem('oauth_state', state);
  sessionStorage.setItem('oauth_return_url', location.href);
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
}

async function checkWriteAccess(token, username) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/collaborators/${username}/permission`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return false;
  const data = await res.json();
  return ['write', 'admin', 'maintain'].includes(data.permission);
}

async function handleOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');

  if (!code) return null;

  if (state !== sessionStorage.getItem('oauth_state')) return null;

  const res = await fetch(`${WORKER_URL}/exchange?code=${code}`);
  const data = await res.json();
  if (!data.access_token) return null;

  sessionStorage.setItem('github_token', data.access_token);

  const userRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${data.access_token}` }
  });
  const user = await userRes.json();
  sessionStorage.setItem('github_username', user.login);

  window.history.replaceState({}, '', window.location.pathname);

  const returnUrl = sessionStorage.getItem('oauth_return_url');
  if (returnUrl && returnUrl !== location.href) {
    sessionStorage.removeItem('oauth_return_url');
    window.location.href = returnUrl;
    return null;
  }

  return { token: data.access_token, username: user.login };
}

async function init() {
  const token = getToken();
  const username = getUsername();

  if (token && username) {
    return { token, username };
  }

  return await handleOAuthCallback();
}

window.RecipeAuth = { init, login, logout, getToken, getUsername, checkWriteAccess, REPO_OWNER, REPO_NAME };
