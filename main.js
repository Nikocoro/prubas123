const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const loginScreen = document.getElementById("login-screen");
const mainScreen = document.getElementById("main-screen");
const welcomeMessage = document.getElementById("welcome-message");
const adminPanel = document.getElementById("admin-panel");
let authToken = null;
let currentRole = null;

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = e.target.username.value;
  const password = e.target.password.value;

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
  } else {
    loginError.textContent = "Credenciales inválidas";
  }
});

const addUserForm = document.getElementById("add-user-form");
addUserForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("new-username").value;
  const password = document.getElementById("new-password").value;
  const role = document.getElementById("new-role").value;

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
    alert("Error al crear usuario");
  }
});
