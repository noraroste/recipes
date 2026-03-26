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
        <option value="">-- Log in to load categories --</option>
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

<script src="{{ '/assets/js/add-recipe.js' | relative_url }}"></script>
