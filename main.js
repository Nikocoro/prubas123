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
const resultsCounter = document.getElementById("results-counter");

// Modal elements
const editModal = document.getElementById("edit-modal");
const editProfileForm = document.getElementById("edit-profile-form");
const closeModalBtn = document.getElementById("close-modal");
const cancelEditBtn = document.getElementById("cancel-edit");

let authToken = null;
let currentRole = null;
let allProfiles = [];
let filteredProfiles = [];
let activeCategories = new Set(); // Cambiado: ahora es un Set para múltiples categorías
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
  activeCategories.clear(); // Limpiar categorías seleccionadas
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
      updateResultsCounter();
    } else {
      console.error("Error al cargar perfiles");
    }
  } catch (err) {
    console.error("Error de conexión:", err);
  }
}

// Actualizar contador de resultados
function updateResultsCounter() {
  if (resultsCounter) {
    const total = allProfiles.length;
    const showing = filteredProfiles.length;
    const selectedCount = activeCategories.size;
    
    if (selectedCount === 0 && !searchBox.value.trim()) {
      resultsCounter.textContent = `Mostrando ${total} perfiles`;
    } else if (selectedCount > 0) {
      const categoriesText = selectedCount === 1 ? 'categoría' : 'categorías';
      resultsCounter.textContent = `Mostrando ${showing} de ${total} perfiles • ${selectedCount} ${categoriesText} seleccionadas`;
    } else {
      resultsCounter.textContent = `Mostrando ${showing} de ${total} perfiles`;
    }
  }
}

// Renderizar filtros de categoría con multi-selección
function renderCategoryFilters() {
  const categories = new Set();
  allProfiles.forEach(profile => {
    profile.categories.forEach(cat => categories.add(cat));
  });

  // Botón "Todos" - funciona como toggle para limpiar selecciones
  let filtersHTML = `
    <button 
      class="filter-button px-6 py-3 text-sm font-medium rounded-xl transition-all shadow-md min-w-max ${activeCategories.size === 0 ? 'active text-white' : 'bg-slate-700/80 text-gray-300 hover:bg-slate-600/80'}"
      onclick="selectAllCategories()"
    >
      <span class="flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
        Todos ${activeCategories.size === 0 ? '' : `(${activeCategories.size})`}
      </span>
    </button>
  `;

  // Iconos específicos para categorías
  const categoryIcons = {
    'Modelo': '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    'Influencer': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/>',
    'Streamer': '<polygon points="23,7 16,12 23,17 23,7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>',
    'Gamer': '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/><path d="M12 6h.01"/><path d="m8 10-2-2v8l2-2"/>',
    'Músico': '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    'Artista': '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
    'Fotógrafo': '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    'Escritora': '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/>',
    'Coach': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m22 2-1 10 3-3-3-3z"/>',
    'Bailarina': '<circle cx="12" cy="4" r="2"/><path d="m15.5 8.5-1-1V21h-5V7.5l-1 1"/>',
    'Productor': '<circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6"/><path d="m21 12-6-3v6l6-3"/><path d="m3 12 6-3v6l-6-3"/>'
  };

  categories.forEach(category => {
    const isSelected = activeCategories.has(category);
    const icon = categoryIcons[category] || '<circle cx="12" cy="12" r="10"/><line x1="8" y1="15" x2="16" y2="15"/>';
    
    filtersHTML += `
      <button 
        class="filter-button px-6 py-3 text-sm font-medium rounded-xl transition-all shadow-md min-w-max relative ${isSelected ? 'active text-white' : 'bg-slate-700/80 text-gray-300 hover:bg-slate-600/80'}"
        onclick="toggleCategory('${category}')"
      >
        <span class="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">${icon}</svg>
          ${category}
          ${isSelected ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-2"><polyline points="20,6 9,17 4,12"/></svg>' : ''}
        </span>
      </button>
    `;
  });

  categoryFilters.innerHTML = filtersHTML;
}

// Nueva función: Toggle de categoría individual
function toggleCategory(category) {
  if (activeCategories.has(category)) {
    activeCategories.delete(category);
  } else {
    activeCategories.add(category);
  }
  
  applyFilters();
  renderCategoryFilters();
}

// Nueva función: Seleccionar/Deseleccionar todas las categorías
function selectAllCategories() {
  activeCategories.clear();
  applyFilters();
  renderCategoryFilters();
}

// Limpiar todos los filtros
function clearAllFilters() {
  activeCategories.clear();
  searchBox.value = "";
  applyFilters();
  renderCategoryFilters();
}

// Aplicar filtros con lógica de múltiples categorías
function applyFilters() {
  const searchTerm = searchBox.value.toLowerCase();
  
  filteredProfiles = allProfiles.filter(profile => {
    const matchesSearch = profile.name.toLowerCase().includes(searchTerm);
    
    // Si no hay categorías seleccionadas, mostrar todos
    if (activeCategories.size === 0) {
      return matchesSearch;
    }
    
    // Si hay categorías seleccionadas, el perfil debe tener al menos una de ellas
    const matchesCategory = profile.categories.some(cat => activeCategories.has(cat));
    
    return matchesSearch && matchesCategory;
  });

  renderProfiles();
  updateResultsCounter();
}

// Renderizar perfiles (sin cambios)
function renderProfiles() {
  if (filteredProfiles.length === 0) {
    gallery.classList.add("hidden");
    noResults.classList.remove("hidden");
    return;
  }

  gallery.classList.remove("hidden");
  noResults.classList.add("hidden");

  gallery.innerHTML = filteredProfiles.map(profile => `
    <div class="bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-lg card-hover-effect fade-in overflow-hidden border border-slate-700/50">
      <div class="relative w-full h-96 bg-gradient-to-br from-slate-700 to-slate-900">
        <img src="${profile.photo}" alt="${profile.name}" class="w-full h-full object-cover object-top" loading="lazy">
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
        ${currentRole === 'admin' ? `
          <div class="absolute top-3 right-3 flex space-x-2">
            <button onclick="openEditModal('${profile._id}')" 
                    class="bg-blue-500/90 backdrop-blur-sm hover:bg-blue-600 text-white p-2.5 rounded-full transition-all shadow-lg transform hover:scale-110">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button onclick="deleteProfile('${profile._id}')" 
                    class="bg-red-500/90 backdrop-blur-sm hover:bg-red-600 text-white p-2.5 rounded-full transition-all shadow-lg transform hover:scale-110">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,6 5,6 21,6"></polyline><path d="m19,6v14a2,2 0,0 1,-2,2H7a2,2 0,0 1,-2,-2V6m3,0V4a2,2 0,0 1,2,-2h4a2,2 0,0 1,2,2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
          </div>
        ` : ''}
      </div>
      
      <div class="p-5">
        <h3 class="text-xl font-bold text-white mb-3 text-center">${profile.name}</h3>
        
        <div class="flex flex-wrap gap-2 justify-center mb-4">
          ${profile.categories.map(cat => {
            const isSelected = activeCategories.has(cat);
            return `
              <span class="inline-flex items-center px-3 py-1.5 text-xs font-medium ${isSelected ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white ring-2 ring-indigo-400/50' : 'bg-gradient-to-r from-indigo-900/50 to-purple-900/50 text-indigo-300 border border-indigo-700/50'} rounded-full backdrop-blur-sm transition-all">
                ${cat}
                ${isSelected ? '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-1"><polyline points="20,6 9,17 4,12"/></svg>' : ''}
              </span>
            `;
          }).join('')}
        </div>
        
        <div class="space-y-2">
          ${profile.links.map(link => `
            <a href="https://${link}" target="_blank" rel="noopener noreferrer" 
               class="block w-full text-center py-2.5 px-4 text-sm font-medium text-indigo-300 bg-indigo-900/20 rounded-lg hover:bg-indigo-900/40 transition-all border border-indigo-700/30 group">
              <span class="flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2 group-hover:translate-x-1 transition-transform"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                ${link}
              </span>
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
window.toggleCategory = toggleCategory;
window.selectAllCategories = selectAllCategories;
window.deleteProfile = deleteProfile;
window.openEditModal = openEditModal;
window.clearAllFilters = clearAllFilters;