const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const loginScreen = document.getElementById("login-screen");
const mainScreen = document.getElementById("main-screen");
const welcomeMessage = document.getElementById("welcome-message");
const adminPanel = document.getElementById("admin-panel");
const logoutButton = document.getElementById("logout-button");
const addProfileForm = document.getElementById("add-profile-form");
const addUserForm = document.getElementById("add-user-form");
const searchBox = document.getElementById("search-box");
const categoryFilters = document.getElementById("category-filters");
const gallery = document.getElementById("gallery");
const noResults = document.getElementById("no-results");

let authToken = null;
let currentRole = null;
let allProfiles = [];
let filteredProfiles = [];
let activeCategory = "all";

// Función de login
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = e.target.username.value;
  const password = e.target.password.value;
  loginError.textContent = "";

  try {
    const res = await fetch("/.netlify/functions/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    if (res.ok) {
      const data = await res.json();
      authToken = data.token;
      currentRole = data.role;

      loginScreen.classList.add("hidden");
      mainScreen.classList.remove("hidden");
      welcomeMessage.textContent = `Hola, ${username}`;

      if (currentRole === "admin") {
        adminPanel.classList.remove("hidden");
      }

      // Cargar perfiles
      await loadProfiles();
    } else {
      const error = await res.json();
      loginError.textContent = error.error || "Credenciales inválidas";
    }
  } catch (err) {
    console.error("Error en login:", err);
    loginError.textContent = "Error de conexión";
  }
});

// Función de logout
logoutButton.addEventListener("click", () => {
  authToken = null;
  currentRole = null;
  loginScreen.classList.remove("hidden");
  mainScreen.classList.add("hidden");
  adminPanel.classList.add("hidden");
  loginForm.reset();
  loginError.textContent = "";
});

// Agregar nuevo usuario (solo admin)
addUserForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("new-username").value;
  const password = document.getElementById("new-password").value;
  const role = document.getElementById("new-role").value;

  try {
    const res = await fetch("/.netlify/functions/addUser", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({ username, password, role })
    });

    if (res.ok) {
      alert("Usuario creado correctamente");
      addUserForm.reset();
    } else {
      const error = await res.json();
      alert(error.error || "Error al crear usuario");
    }
  } catch (err) {
    console.error("Error al crear usuario:", err);
    alert("Error de conexión");
  }
});

// Agregar perfil (solo admin)
addProfileForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value;
  const photo = document.getElementById("photo").value;
  const links = document.getElementById("links").value.split(",").map(l => l.trim());
  const categories = document.getElementById("categories").value.split(",").map(c => c.trim());

  try {
    const res = await fetch("/.netlify/functions/addProfile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({ name, photo, links, categories })
    });

    if (res.ok) {
      alert("Perfil agregado correctamente");
      addProfileForm.reset();
      await loadProfiles();
    } else {
      const error = await res.json();
      alert(error.error || "Error al agregar perfil");
    }
  } catch (err) {
    console.error("Error al agregar perfil:", err);
    alert("Error de conexión");
  }
});

// Cargar perfiles
async function loadProfiles() {
  try {
    const res = await fetch("/.netlify/functions/getProfiles", {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });

    if (res.ok) {
      allProfiles = await res.json();
      filteredProfiles = [...allProfiles];
      renderProfiles();
      renderCategoryFilters();
    } else {
      console.error("Error al cargar perfiles");
    }
  } catch (err) {
    console.error("Error de conexión:", err);
  }
}

// Renderizar filtros de categoría
function renderCategoryFilters() {
  const categories = new Set();
  allProfiles.forEach(profile => {
    profile.categories.forEach(cat => categories.add(cat));
  });

  let filtersHTML = `
    <button 
      class="px-4 py-2 text-sm font-medium rounded-full transition-colors ${activeCategory === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
      onclick="filterByCategory('all')"
    >
      Todos
    </button>
  `;

  categories.forEach(category => {
    filtersHTML += `
      <button 
        class="px-4 py-2 text-sm font-medium rounded-full transition-colors ${activeCategory === category ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
        onclick="filterByCategory('${category}')"
      >
        ${category}
      </button>
    `;
  });

  categoryFilters.innerHTML = filtersHTML;
}

// Filtrar por categoría
function filterByCategory(category) {
  activeCategory = category;
  applyFilters();
  renderCategoryFilters();
}

// Aplicar filtros
function applyFilters() {
  const searchTerm = searchBox.value.toLowerCase();
  
  filteredProfiles = allProfiles.filter(profile => {
    const matchesSearch = profile.name.toLowerCase().includes(searchTerm);
    const matchesCategory = activeCategory === "all" || profile.categories.includes(activeCategory);
    return matchesSearch && matchesCategory;
  });

  renderProfiles();
}

// Renderizar perfiles
function renderProfiles() {
  if (filteredProfiles.length === 0) {
    gallery.classList.add("hidden");
    noResults.classList.remove("hidden");
    return;
  }

  gallery.classList.remove("hidden");
  noResults.classList.add("hidden");

  gallery.innerHTML = filteredProfiles.map(profile => `
    <div class="bg-white rounded-xl shadow-lg card-hover-effect fade-in">
      <div class="p-6">
        <div class="flex items-center space-x-4 mb-4">
          <img src="${profile.photo}" alt="${profile.name}" class="w-16 h-16 rounded-full object-cover">
          <div>
            <h3 class="text-lg font-semibold text-gray-800">${profile.name}</h3>
            <div class="flex flex-wrap gap-1 mt-1">
              ${profile.categories.map(cat => `
                <span class="inline-block px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">
                  ${cat}
                </span>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          ${profile.links.map(link => `
            <a href="https://${link}" target="_blank" rel="noopener noreferrer" 
               class="inline-flex items-center px-3 py-1 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-full hover:bg-indigo-100 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
              ${link}
            </a>
          `).join('')}
        </div>
        ${currentRole === 'admin' ? `
          <div class="mt-4 pt-4 border-t border-gray-200">
            <button onclick="deleteProfile('${profile._id}')" 
                    class="text-red-600 hover:text-red-800 text-sm font-medium">
              Eliminar
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}

// Eliminar perfil (solo admin)
async function deleteProfile(profileId) {
  if (!confirm("¿Estás seguro de que quieres eliminar este perfil?")) {
    return;
  }

  try {
    const res = await fetch(`/.netlify/functions/deleteProfile`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({ profileId })
    });

    if (res.ok) {
      await loadProfiles();
    } else {
      const error = await res.json();
      alert(error.error || "Error al eliminar perfil");
    }
  } catch (err) {
    console.error("Error al eliminar perfil:", err);
    alert("Error de conexión");
  }
}

// Event listeners
searchBox.addEventListener("input", applyFilters);

// Hacer funciones globales para onclick
window.filterByCategory = filterByCategory;
window.deleteProfile = deleteProfile;