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

// Modal elements
const editModal = document.getElementById("edit-modal");
const editProfileForm = document.getElementById("edit-profile-form");
const closeModalBtn = document.getElementById("close-modal");
const cancelEditBtn = document.getElementById("cancel-edit");

let authToken = null;
let currentRole = null;
let allProfiles = [];
let filteredProfiles = [];
let activeCategory = "all";
let editingProfileId = null;

// Función de login
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = e.target.username.value;
  const password = e.target.password.value;
  loginError.textContent = "";

  console.log("Intentando login con:", { username, password: "***" });

  try {
    const res = await fetch("/.netlify/functions/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    console.log("Response status:", res.status);

    if (res.ok) {
      const data = await res.json();
      console.log("Login exitoso:", data);
      
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
      const errorText = await res.text();
      console.log("Error response:", errorText);
      
      try {
        const error = JSON.parse(errorText);
        loginError.textContent = error.error || "Credenciales inválidas";
      } catch {
        loginError.textContent = `Error ${res.status}: ${errorText}`;
      }
    }
  } catch (err) {
    console.error("Error en login:", err);
    loginError.textContent = "Error de conexión: " + err.message;
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

// Editar perfil (solo admin)
editProfileForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const profileId = document.getElementById("edit-profile-id").value;
  const name = document.getElementById("edit-name").value;
  const photo = document.getElementById("edit-photo").value;
  const links = document.getElementById("edit-links").value.split(",").map(l => l.trim());
  const categories = document.getElementById("edit-categories").value.split(",").map(c => c.trim());

  try {
    const res = await fetch("/.netlify/functions/editProfile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({ profileId, name, photo, links, categories })
    });

    if (res.ok) {
      alert("Perfil actualizado correctamente");
      closeEditModal();
      await loadProfiles();
    } else {
      const error = await res.json();
      alert(error.error || "Error al actualizar perfil");
    }
  } catch (err) {
    console.error("Error al actualizar perfil:", err);
    alert("Error de conexión");
  }
});

// Abrir modal de edición
function openEditModal(profileId) {
  const profile = allProfiles.find(p => p._id === profileId);
  if (!profile) return;

  document.getElementById("edit-profile-id").value = profileId;
  document.getElementById("edit-name").value = profile.name;
  document.getElementById("edit-photo").value = profile.photo;
  document.getElementById("edit-links").value = profile.links.join(", ");
  document.getElementById("edit-categories").value = profile.categories.join(", ");

  editModal.classList.add("active");
  editingProfileId = profileId;
}

// Cerrar modal de edición
function closeEditModal() {
  editModal.classList.remove("active");
  editProfileForm.reset();
  editingProfileId = null;
}

// Event listeners del modal
closeModalBtn.addEventListener("click", closeEditModal);
cancelEditBtn.addEventListener("click", closeEditModal);

// Cerrar modal al hacer clic fuera
editModal.addEventListener("click", (e) => {
  if (e.target === editModal) {
    closeEditModal();
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
      class="px-4 py-2 text-sm font-medium rounded-full transition-colors ${activeCategory === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}"
      onclick="filterByCategory('all')"
    >
      Todos
    </button>
  `;

  categories.forEach(category => {
    filtersHTML += `
      <button 
        class="px-4 py-2 text-sm font-medium rounded-full transition-colors ${activeCategory === category ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}"
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
    <div class="bg-slate-800 rounded-xl shadow-lg card-hover-effect fade-in overflow-hidden border border-slate-700">
      <div class="relative w-full h-96 bg-gradient-to-br from-slate-700 to-slate-900">
        <img src="${profile.photo}" alt="${profile.name}" class="w-full h-full object-cover object-top">
        <div class="absolute inset-0 bg-black bg-opacity-30"></div>
        ${currentRole === 'admin' ? `
          <div class="absolute top-3 right-3 flex space-x-2">
            <button onclick="openEditModal('${profile._id}')" 
                    class="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full transition-colors shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button onclick="deleteProfile('${profile._id}')" 
                    class="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,6 5,6 21,6"></polyline><path d="m19,6v14a2,2 0,0 1,-2,2H7a2,2 0,0 1,-2,-2V6m3,0V4a2,2 0,0 1,2,-2h4a2,2 0,0 1,2,2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
          </div>
        ` : ''}
      </div>
      
      <div class="p-4">
        <h3 class="text-xl font-bold text-white mb-2 text-center">${profile.name}</h3>
        
        <div class="flex flex-wrap gap-1 justify-center mb-3">
          ${profile.categories.map(cat => `
            <span class="inline-block px-3 py-1 text-xs font-medium bg-indigo-900/50 text-indigo-300 rounded-full border border-indigo-700">
              ${cat}
            </span>
          `).join('')}
        </div>
        
        <div class="space-y-2">
          ${profile.links.map(link => `
            <a href="https://${link}" target="_blank" rel="noopener noreferrer" 
               class="block w-full text-center py-2 px-3 text-sm font-medium text-indigo-300 bg-indigo-900/30 rounded-lg hover:bg-indigo-900/50 transition-colors border border-indigo-700/50">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline mr-2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
              ${link}
            </a>
          `).join('')}
        </div>
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
window.openEditModal = openEditModal;