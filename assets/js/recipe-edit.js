const RECIPE_REPO_OWNER = RecipeAuth.REPO_OWNER;
const RECIPE_REPO_NAME = RecipeAuth.REPO_NAME;

function getSlug() {
  return document.getElementById('recipe-edit-root').dataset.recipeSlug;
}

function showEditSection(show) {
  document.getElementById('recipe-view-section').style.display = show ? 'none' : '';
  document.getElementById('recipe-edit-section').style.display = show ? '' : 'none';
}

function setEditStatus(msg) {
  document.getElementById('edit-status-msg').textContent = msg;
}

function decodeBase64(str) {
  return decodeURIComponent(escape(atob(str.replace(/\n/g, ''))));
}

async function openEditor() {
  const slug = getSlug();
  setEditStatus('Laster oppskrift...');
  showEditSection(true);

  try {
    const token = RecipeAuth.getToken();
    const res = await fetch(
      `https://api.github.com/repos/${RECIPE_REPO_OWNER}/${RECIPE_REPO_NAME}/contents/_recipes/${slug}.md`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error(`Kunne ikke hente fil (${res.status})`);
    const file = await res.json();
    document.getElementById('edit-raw').value = decodeBase64(file.content);
    document.getElementById('recipe-edit-section').dataset.sha = file.sha;
    setEditStatus('');
  } catch (e) {
    setEditStatus(`Feil: ${e.message}`);
  }
}

async function saveRecipe() {
  const slug = getSlug();
  const token = RecipeAuth.getToken();
  const sha = document.getElementById('recipe-edit-section').dataset.sha;
  const content = document.getElementById('edit-raw').value;
  const encoded = btoa(unescape(encodeURIComponent(content)));

  setEditStatus('Lagrer...');
  document.getElementById('save-btn').disabled = true;

  const res = await fetch(
    `https://api.github.com/repos/${RECIPE_REPO_OWNER}/${RECIPE_REPO_NAME}/contents/_recipes/${slug}.md`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Update recipe: ${slug}`,
        content: encoded,
        sha,
      }),
    }
  );

  document.getElementById('save-btn').disabled = false;

  if (res.ok) {
    const rawContent = document.getElementById('edit-raw').value;
    const bodyMatch = rawContent.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
    const markdown = bodyMatch ? bodyMatch[1] : rawContent;
    document.getElementById('recipe-content').innerHTML = marked.parse(markdown);
    showEditSection(false);
    setEditStatus('');
  } else {
    setEditStatus(`Feil ved lagring (${res.status}). Prøv igjen.`);
  }
}

async function initEditMode() {
  const result = await RecipeAuth.init();
  const token = result?.token || RecipeAuth.getToken();
  const username = result?.username || RecipeAuth.getUsername();

  if (!token || !username) {
    document.getElementById('recipe-login-btn').style.display = '';
    return;
  }

  const hasAccess = await RecipeAuth.checkWriteAccess(token, username);
  if (!hasAccess) return;

  document.getElementById('edit-btn').style.display = '';
}

function tryInitEditMode() {
  if (document.getElementById('edit-btn')) {
    document.getElementById('edit-btn').addEventListener('click', openEditor);
    document.getElementById('recipe-login-btn').addEventListener('click', () => RecipeAuth.login());
    document.getElementById('save-btn').addEventListener('click', saveRecipe);
    document.getElementById('cancel-btn').addEventListener('click', () => {
      showEditSection(false);
      setEditStatus('');
    });
    initEditMode();
  } else {
    const observer = new MutationObserver(() => {
      if (document.getElementById('edit-btn')) {
        observer.disconnect();
        tryInitEditMode();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', tryInitEditMode);
} else {
  tryInitEditMode();
}
