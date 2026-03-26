---
icon: fas fa-plus
order: 5
title: Add Recipe
---

<div id="app">
  <div id="login-section">
    <p>You need to log in with GitHub to add a recipe.</p>
    <button id="login-btn" class="btn btn-outline-primary">Log in with GitHub</button>
  </div>

  <div id="form-section" style="display:none">
    <p>Logged in as <strong id="username-display"></strong>. <a href="#" id="logout-btn">Log out</a></p>

    <form id="recipe-form">
      <div class="mb-3">
        <label for="url" class="form-label fw-bold">Recipe URL</label>
        <input type="url" id="url" class="form-control" required placeholder="https://..." />
      </div>

      <div class="mb-3">
        <label for="category" class="form-label fw-bold">Category</label>
        <select id="category" class="form-select">
          <option value="">-- Log in to load categories --</option>
        </select>
        <input type="text" id="new-category" class="form-control mt-2" placeholder="New category name" style="display:none" />
      </div>

      <div class="mb-3">
        <label for="tags" class="form-label fw-bold">Tags <small class="text-muted fw-normal">(comma separated, e.g. quick, easy, vegetarian)</small></label>
        <input type="text" id="tags" class="form-control" placeholder="quick, easy, vegetarian" />
      </div>

      <button type="submit" id="submit-btn" class="btn btn-outline-primary">Add recipe</button>
      <p id="status-msg" class="mt-3 fst-italic text-muted"></p>
    </form>
  </div>
</div>

<script src="{{ '/assets/js/add-recipe.js' | relative_url }}"></script>
