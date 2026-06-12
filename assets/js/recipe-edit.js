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

async function fetchRecipeFile(slug) {
  const token = RecipeAuth.getToken();
  const res = await fetch(
    `https://api.github.com/repos/${RECIPE_REPO_OWNER}/${RECIPE_REPO_NAME}/contents/_recipes/${slug}.md`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Could not fetch recipe file (${res.status})`);
  return res.json();
}

function decodeBase64(str) {
  return decodeURIComponent(escape(atob(str.replace(/\n/g, ''))));
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  const lines = match[1].split('\n');
  let currentKey = null;
  let inList = false;
  for (const line of lines) {
    const listItem = line.match(/^\s+- "(.*)"$/);
    const keyVal = line.match(/^(\w+):\s*(.*)?$/);
    if (listItem && inList) {
      fm[currentKey].push(listItem[1]);
    } else if (keyVal) {
      currentKey = keyVal[1];
      const val = keyVal[2]?.trim() ?? '';
      if (val === '' || val === undefined) {
        fm[currentKey] = [];
        inList = true;
      } else {
        fm[currentKey] = val;
        inList = false;
      }
    } else {
      inList = false;
    }
  }
  return fm;
}

function buildFrontmatter(existing, ingredients, instructions, notes) {
  const ingSerialized = ingredients.map(i => `  - "${i.replace(/"/g, '\\"')}"`).join('\n');
  const insSerialized = instructions.map(s => `  - "${s.replace(/"/g, '\\"')}"`).join('\n');

  const servingsLine = existing.servings ? `servings: ${existing.servings}\n` : '';
  const notesVal = notes.replace(/"/g, '\\"');

  return `---
title: ${existing.title}
source_url: ${existing.source_url}
status: manual
${servingsLine}ingredients:
${ingSerialized}
instructions:
${insSerialized}
notes: "${notesVal}"
---
`;
}

async function openEditor() {
  const slug = getSlug();
  setEditStatus('Laster oppskrift...');
  showEditSection(true);

  try {
    const file = await fetchRecipeFile(slug);
    const content = decodeBase64(file.content);
    const fm = parseFrontmatter(content);

    document.getElementById('edit-ingredients').value = (fm.ingredients || []).join('\n');
    document.getElementById('edit-instructions').value = (fm.instructions || []).join('\n');
    document.getElementById('edit-notes').value = fm.notes?.replace(/^"|"$/g, '') || '';
    document.getElementById('recipe-edit-section').dataset.sha = file.sha;
    document.getElementById('recipe-edit-section').dataset.fm = JSON.stringify(fm);
    setEditStatus('');
  } catch (e) {
    setEditStatus(`Feil: ${e.message}`);
  }
}

async function saveRecipe() {
  const slug = getSlug();
  const token = RecipeAuth.getToken();
  const editSection = document.getElementById('recipe-edit-section');
  const sha = editSection.dataset.sha;
  const fm = JSON.parse(editSection.dataset.fm);

  const ingredients = document.getElementById('edit-ingredients').value
    .split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const instructions = document.getElementById('edit-instructions').value
    .split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const notes = document.getElementById('edit-notes').value.trim();

  const newContent = buildFrontmatter(fm, ingredients, instructions, notes);
  const encoded = btoa(unescape(encodeURIComponent(newContent)));

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
    setEditStatus('Lagret!');
    setTimeout(() => {
      showEditSection(false);
      setEditStatus('');
    }, 1500);
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
