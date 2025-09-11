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

// Paginación
const PROFILES_PER_PAGE = 20;
let currentPage = 1;
let totalPages = 1;

let authToken = null;
let currentRole = null;
let allProfiles = [];
let filteredProfiles = [];
let activeCategories = new Set();
let editingProfileId = null;

// Intersection Observer para lazy loading
let imageObserver;

// Inicializar Intersection Observer para lazy loading
function initImageObserver() {
  const options = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1
  };

  imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.getAttribute('data-src');
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
          img.classList.remove('lazy-loading');
          img.classList.add('lazy-loaded');
          imageObserver.unobserve(img);
        }
      }
    });
  }, options);
}

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

      // Inicializar observer y cargar perfiles
      initImageObserver();
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
  activeCategories.clear();
  currentPage = 1;
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
      currentPage = 1; // Reset a la primera página
      calculatePagination();
      renderProfiles();
      renderCategoryFilters();
      renderPagination();
      updateResultsCounter();
    } else {
      console.error("Error al cargar perfiles");
    }
  } catch (err) {
    console.error("Error de conexión:", err);
  }
}

// Calcular paginación
function calculatePagination() {
  totalPages = Math.ceil(filteredProfiles.length / PROFILES_PER_PAGE);
  if (currentPage > totalPages) {
    currentPage = Math.max(1, totalPages);
  }
}

// Obtener perfiles de la página actual
function getCurrentPageProfiles() {
  const startIndex = (currentPage - 1) * PROFILES_PER_PAGE;
  const endIndex = startIndex + PROFILES_PER_PAGE;
  return filteredProfiles.slice(startIndex, endIndex);
}

// Actualizar contador de resultados
function updateResultsCounter() {
  if (resultsCounter) {
    const total = allProfiles.length;
    const filtered = filteredProfiles.length;
    const startIndex = (currentPage - 1) * PROFILES_PER_PAGE + 1;
    const endIndex = Math.min(currentPage * PROFILES_PER_PAGE, filtered);
    const selectedCount = activeCategories.size;
    
    if (selectedCount === 0 && !searchBox.value.trim()) {
      resultsCounter.textContent = `Mostrando ${startIndex}-${endIndex} de ${total} perfiles`;
    } else if (selectedCount > 0) {
      const categoriesText = selectedCount === 1 ? 'categoría' : 'categorías';
      const selectedCategoriesArray = [...activeCategories];
      resultsCounter.textContent = `Mostrando ${startIndex}-${endIndex} de ${filtered} perfiles con ${categoriesText}: ${selectedCategoriesArray.join(', ')}`;
    } else {
      resultsCounter.textContent = `Mostrando ${startIndex}-${endIndex} de ${filtered} perfiles`;
    }
  }
}

// Renderizar filtros de categoría
function renderCategoryFilters() {
  const categories = new Set();
  allProfiles.forEach(profile => {
    profile.categories.forEach(cat => categories.add(cat));
  });

  // Botón "Todos"
  let filtersHTML = `
    <button 
      class="filter-button px-6 py-3 text-sm font-medium rounded-xl transition-all shadow-md min-w-max ${activeCategories.size === 0 ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white' : 'bg-slate-700/80 text-gray-300 hover:bg-slate-600/80'}"
      onclick="selectAllCategories()"
    >
      <span class="flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
          <rect width="7" height="9" x="3" y="3" rx="1"/>
          <rect width="7" height="5" x="14" y="3" rx="1"/>
          <rect width="7" height="9" x="14" y="12" rx="1"/>
          <rect width="7" height="5" x="3" y="16" rx="1"/>
        </svg>
        Todos ${activeCategories.size > 0 ? `(${activeCategories.size} filtros)` : ''}
      </span>
    </button>
  `;

  // Categorías individuales
  categories.forEach(category => {
    const isSelected = activeCategories.has(category);
    
    filtersHTML += `
      <button 
        class="filter-button px-6 py-3 text-sm font-medium rounded-xl transition-all shadow-md min-w-max ${isSelected ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white' : 'bg-slate-700/80 text-gray-300 hover:bg-slate-600/80'}"
        onclick="toggleCategory('${category}')"
      >
        <span class="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6m0 6v6"/>
          </svg>
          ${category}
          ${isSelected ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-2"><polyline points="20,6 9,17 4,12"/></svg>' : ''}
        </span>
      </button>
    `;
  });

  categoryFilters.innerHTML = filtersHTML;
}

// Toggle de categoría individual
function toggleCategory(category) {
  if (activeCategories.has(category)) {
    activeCategories.delete(category);
  } else {
    activeCategories.add(category);
  }
  
  applyFilters();
  renderCategoryFilters();
}

// Seleccionar/Deseleccionar todas las categorías
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

// Aplicar filtros
function applyFilters() {
  const searchTerm = searchBox.value.toLowerCase();
  
  filteredProfiles = allProfiles.filter(profile => {
    // Filtrar por término de búsqueda
    const matchesSearch = profile.name.toLowerCase().includes(searchTerm);
    
    // Si no hay categorías seleccionadas, solo aplicar filtro de búsqueda
    if (activeCategories.size === 0) {
      return matchesSearch;
    }
    
    // Requiere que el perfil tenga TODAS las categorías activas
    const matchesCategory = [...activeCategories].every(selectedCategory => 
      profile.categories.includes(selectedCategory)
    );
    
    return matchesSearch && matchesCategory;
  });

  currentPage = 1; // Reset a la primera página cuando se aplican filtros
  calculatePagination();
  renderProfiles();
  renderPagination();
  updateResultsCounter();
}

// Cambiar página
function changePage(page) {
  if (page < 1 || page > totalPages) return;
  
  currentPage = page;
  renderProfiles();
  renderPagination();
  updateResultsCounter();
  
  // Scroll suave al inicio de la galería
  document.getElementById('gallery').scrollIntoView({ 
    behavior: 'smooth', 
    block: 'start' 
  });
}

// Renderizar paginación
function renderPagination() {
  // Buscar o crear el contenedor de paginación
  let paginationContainer = document.getElementById('pagination-container');
  if (!paginationContainer) {
    paginationContainer = document.createElement('div');
    paginationContainer.id = 'pagination-container';
    paginationContainer.className = 'pagination-container';
    
    // Insertar después de la galería
    const gallery = document.getElementById('gallery');
    gallery.parentNode.insertBefore(paginationContainer, gallery.nextSibling);
  }

  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }

  let paginationHTML = '<div class="flex items-center space-x-2">';
  
  // Botón anterior
  paginationHTML += `
    <button 
      onclick="changePage(${currentPage - 1})" 
      ${currentPage === 1 ? 'disabled' : ''} 
      class="pagination-button inactive px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1">
        <polyline points="15,18 9,12 15,6"/>
      </svg>
      <span class="pagination-text">Anterior</span>
    </button>
  `;

  // Números de página
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  if (startPage > 1) {
    paginationHTML += `
      <button onclick="changePage(1)" class="pagination-button inactive">1</button>
    `;
    if (startPage > 2) {
      paginationHTML += '<span class="px-2 text-gray-400">...</span>';
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `
      <button 
        onclick="changePage(${i})" 
        class="pagination-button ${i === currentPage ? 'active' : 'inactive'}"
      >
        ${i}
      </button>
    `;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationHTML += '<span class="px-2 text-gray-400">...</span>';
    }
    paginationHTML += `
      <button onclick="changePage(${totalPages})" class="pagination-button inactive">${totalPages}</button>
    `;
  }

  // Botón siguiente
  paginationHTML += `
    <button 
      onclick="changePage(${currentPage + 1})" 
      ${currentPage === totalPages ? 'disabled' : ''} 
      class="pagination-button inactive px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center"
    >
      <span class="pagination-text">Siguiente</span>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-1">
        <polyline points="9,18 15,12 9,6"/>
      </svg>
    </button>
  `;

  paginationHTML += '</div>';
  paginationContainer.innerHTML = paginationHTML;
}

// Renderizar perfiles con lazy loading
function renderProfiles() {
  const currentProfiles = getCurrentPageProfiles();
  
  if (currentProfiles.length === 0) {
    gallery.classList.add("hidden");
    noResults.classList.remove("hidden");
    return;
  }

  gallery.classList.remove("hidden");
  noResults.classList.add("hidden");

  gallery.innerHTML = currentProfiles.map(profile => `
    <div class="bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-lg card-hover-effect fade-in overflow-hidden border border-slate-700/50">
      <div class="relative w-full h-96 bg-gradient-to-br from-slate-700 to-slate-900">
        <img 
          data-src="${profile.photo}" 
          alt="${profile.name}" 
          class="w-full h-full object-cover object-top lazy-loading"
          style="background: linear-gradient(135deg, #475569 0%, #1e293b 100%);"
          onload="this.classList.add('lazy-loaded')"
          onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjNDc1NTY5Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk0YTNiOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbiBubyBkaXNwb25pYmxlPC90ZXh0Pjwvc3ZnPg=='"
        >
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

  // Aplicar lazy loading a las nuevas imágenes
  const lazyImages = gallery.querySelectorAll('img[data-src]');
  lazyImages.forEach(img => {
    imageObserver.observe(img);
  });
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
window.changePage = changePage;