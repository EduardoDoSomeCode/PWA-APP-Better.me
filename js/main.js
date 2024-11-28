function showToast(message, type = "success") {
  Toastify({
    text: message,
    duration: 3000, // Time in ms (3 seconds)
    gravity: "top", // Top or bottom
    position: "right", // Left, center, or right
    style: {
      background: type === "success" ? "green" : "red", // Color based on message type
      color: "#fff",
      borderRadius: "5px",
    },
  }).showToast();
}
let currentLanguage = "en"; // Default language

// Cache DOM Elements
const mainContent = document.getElementById("main-content");
const userDisplayText = document.getElementById("currentUser");

let currentUser = null;
const db = new Dexie("MyAppDatabase");
db.version(1).stores({
  users: "++id, name, email, password",
  todos: "++id, userId, content",
  notes: "++id, userId, title, content",
  habits: "++id, userId, habitName, streak, maxStreak, lastModified",
  translations: "++id, key, translations", // New translations table
});

function isAuthenticated() {
  return localStorage.getItem("loggedUser") !== null;
}

function requireAuth(path) {
  const protectedRoutes = ["/add-todo", "/add-note", "/habits"];

  if (protectedRoutes.includes(path) && !isAuthenticated()) {
    showToast("Please log in to access this page.", "error");
    return false;
  }
  return true;
}

function updateNavLinks() {
  const navLinks = document.querySelectorAll("nav a[data-auth]");
  const loginLink = document.querySelector("nav a[data-login]");
  const logoutLink = document.querySelector("nav a[data-logout]");
  const hiddeLinks = document.querySelectorAll("nav a[data-hidden]");

  currentUser = localStorage.getItem("loggedUser");
  let userJson = JSON.parse(currentUser);

  if (currentUser) {
    userDisplayText.textContent = ` Hi 😄:${userJson.name}`;
    navLinks.forEach((link) => {
      link.style.display = "inline-block";
    });
    hiddeLinks.forEach((link) => {
      link.style.display = "none";
    });
    loginLink.style.display = "none";
    logoutLink.style.display = "inline-block";
  } else {
    userDisplayText.textContent = `No user logged in`;

    navLinks.forEach((link) => {
      link.style.display = "none";
    });

    loginLink.style.display = "inline-block";
    logoutLink.style.display = "none";
  }
}

function logoutUser() {
  localStorage.removeItem("loggedUser");
  currentUser = null;
  showToast("You have been logged out.");
  updateNavLinks();
  navigateTo("/"); // Redirect to home or login page
}
function setupNavigation() {
  document.querySelectorAll("nav a[data-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      navigateTo(event.target.href);
    });
  });

  const logoutLink = document.querySelector("nav a[data-logout]");
  if (logoutLink) {
    logoutLink.addEventListener("click", (event) => {
      event.preventDefault();
      logoutUser();
    });
  }
}
async function validateStoredUser(user) {
  try {
    const existingUser = await db.users
      .where({
        email: user.email,
        password: user.password,
      })
      .first();

    if (!existingUser) {
      localStorage.removeItem("loggedUser");
      currentUser = null;
      updateNavLinks();
    }
  } catch (error) {
    console.error("User validation error:", error);
  }
}

function initializeApp() {
  const storedUser = localStorage.getItem("loggedUser");
  if (storedUser) {
    try {
      currentUser = JSON.parse(storedUser);
      // Optional: Validate stored user against database
      document.getElementById(
        "currentUser"
      ).textContent = `${currentUser.name}`;

      validateStoredUser(currentUser);
    } catch (error) {
      console.error("Error parsing stored user:", error);
      localStorage.removeItem("loggedUser");
      currentUser = null;
    }
  }
  updateNavLinks();
}

function loadUserSession() {
  const user = localStorage.getItem("loggedUser");
  if (user) {
    currentUser = JSON.parse(user);
    document.getElementById("currentUser").textContent = `${currentUser.name}`;
  }

  return user;
}

// History API Navigation
document.addEventListener("click", async (e) => {
  if (e.target.matches("[data-link]")) {
    e.preventDefault();
    const url = e.target.href;
    navigateTo(url);
  }
});

// Navigate to a new page
let navigationTimeout;
async function navigateTo(url) {
  if (navigationTimeout) {
    clearTimeout(navigationTimeout);
  }

  navigationTimeout = setTimeout(async () => {
    const path = new URL(url, window.location.origin).pathname;

    if (!requireAuth(path)) {
      return navigateTo("/");
    }

    window.history.pushState({}, "", path);
    updateActiveLink(path);
    await loadPage(path);
  }, 50); // 300ms delay to prevent rapid clicks
}
function updateActiveLink(path) {
  document.querySelectorAll("nav a").forEach((link) => {
    link.classList.toggle("active", link.href.endsWith(path));
  });
}
async function loadPage(path) {
  const main = document.querySelector("main");

  if (main.dataset.currentPage === path) return;
  main.innerHTML = "<p>Loading...</p>"; // Show a loading message

  try {
    let pageContent = "";

    switch (path) {
      case "/":
        pageContent = await fetchPageContent("./PWA-APP-Better.me/pages/login.html");
        main.innerHTML = pageContent;
        main.dataset.currentPage = path;
        initializeLoginPage();
        break;

      case "/add-todo":
        pageContent = await fetchPageContent("./PWA-APP-Better.me/pages/add-todo.html");
        main.innerHTML = pageContent;
        main.dataset.currentPage = path;
        initializeTodoPage();
        break;

      case "/add-note":
        pageContent = await fetchPageContent("./PWA-APP-Better.me/pages/add-note.html");
        main.innerHTML = pageContent;
        main.dataset.currentPage = path;
        initializeNotePage();
        break;

      case "/habits":
        pageContent = await fetchPageContent("./PWA-APP-Better.me/pages/habits.html");
        main.innerHTML = pageContent;
        initializeHabitsPage();
        break;

      case "/user-management":
        pageContent = await fetchPageContent("./PWA-APP-Better.me/pages/user-management.html");
        main.innerHTML = pageContent;
        main.dataset.currentPage = path;
        initializeUserManagementPage();
        break;

      case "/profile":
        pageContent = await fetchPageContent("./PWA-APP-Better.me/pages/profile.html");
        main.innerHTML = pageContent;
        main.dataset.currentPage = path;
        break;
      default:
        pageContent = await fetchPageContent("./PWA-APP-Better.me/pages/404.html");
        main.innerHTML = pageContent;
    }
  } catch (error) {
    main.innerHTML = "<p>Error loading page</p>";
    console.error("Page load error:", error);
  }
}

async function fetchPageContent(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
  return await response.text();
}

// Handle Browser Back/Forward Buttons
window.addEventListener("popstate", () => {
  loadPage(window.location.pathname);
});

// Example: Initialize Todo Page
function initializeTodoPage() {
  const user = JSON.parse(localStorage.getItem("loggedUser"));

  const addTodoForm = document.getElementById("addTodoForm");
  const todoList = document.getElementById("todoList");

  // Remove previous listeners first
  const oldAddTodoForm = addTodoForm.cloneNode(true);
  addTodoForm.parentNode.replaceChild(oldAddTodoForm, addTodoForm);

  oldAddTodoForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const content = document.getElementById("todoContent").value;

    if (user) {
      await db.todos.add({ userId: user.id, content });
      showToast("Todo added successfully!");
      event.target.reset();
      await renderTodos(); // Await the rendering
    } else {
      showToast("Please log in to add a todo", "error");
    }
  });

  async function renderTodos() {
    if (!user) return;

    const todos = await db.todos.where({ userId: user.id }).toArray();
    todoList.innerHTML = "";
    todos.forEach((todo) => {
      const li = document.createElement("li");
      li.innerHTML = `  ${todo.content} <button data-id="${todo.id}" class="delete-todo">Delete</button>`;
      li.classList.add("todo-item");

      todoList.appendChild(li);
    });

    document.querySelectorAll(".delete-todo").forEach((button) => {
      button.addEventListener("click", async (event) => {
        const todoId = parseInt(event.target.dataset.id);
        await db.todos.delete(todoId);
        showToast("Todo deleted successfully!");
        renderTodos();
      });
    });
  }

  renderTodos();
}

function initializeNotePage() {
  const user = JSON.parse(localStorage.getItem("loggedUser"));
  document
    .getElementById("addNoteForm")
    .addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!currentUser) {
        showToast("Please log in to add a note", "error");
        return;
      }

      const title = document.getElementById("noteTitle").value;
      const content = document.getElementById("noteContent").value;

      document.getElementById("currentUser").textContent = `${user.name}`;

      const id = await db.notes.add({ userId: user.id, title, content });
      showToast("Note added successfully!");
      renderNotes();
      event.target.reset();
    });

  async function renderNotes() {
    const user = JSON.parse(localStorage.getItem("loggedUser"));
    const notes = await db.notes.where({ userId: user.id }).toArray();
    const noteList = document.getElementById("noteList");
    noteList.innerHTML = "";

    notes.forEach((note) => {
      const noteDiv = document.createElement("div");
      noteDiv.className = "note";
      noteDiv.innerHTML = `
      <div class="note-container">
          <h3>${note.title}</h3>
          <p>${note.content}</p>
          <button data-id="${note.id}" class="delete-note delete-btn">Delete</button>
          </div>
        `;

      noteList.appendChild(noteDiv);
    });

    document.querySelectorAll(".delete-note").forEach((button) => {
      button.addEventListener("click", async (event) => {
        const noteId = parseInt(event.target.dataset.id);
        await db.notes.delete(noteId);
        showToast("Note deleted successfully!");
        renderNotes();
      });
    });
  }

  renderNotes();
}

function initializeHabitsPage() {
  const user = JSON.parse(localStorage.getItem("loggedUser"));

  document
    .getElementById("addHabitForm")
    .addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!currentUser) {
        showToast("Please log in to add a habit", "error");
        return;
      }

      const habitName = document.getElementById("habitName").value;

      console.log("Adding habit:", habitName);
      console.log("user  ==>:", user);

      const habit = {
        userId: user.id,
        habitName,
        streak: [],
        maxStreak: 0,
        lastModified: null,
      };

      await db.habits.add(habit);
      showToast("Habit added successfully!");
      renderHabits(user);
      event.target.reset();
    });


  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      // Remove active class from all buttons and tab contents
      document
        .querySelectorAll(".tab-button")
        .forEach((btn) => btn.classList.remove("active"));
      document
        .querySelectorAll(".tab-content")
        .forEach((content) => content.classList.remove("active"));

      // Add active class to clicked button and corresponding tab content
      button.classList.add("active");
      document.getElementById(button.dataset.tab).classList.add("active");
    });
  });

  // Your existing renderHabits function
  async function renderHabits(userLogged) {
    const habits = await db.habits.where({ userId: userLogged.id }).toArray();
    const habitContainer = document.getElementById("habitContainer");
    const calendarContainer = document.getElementById("calendarContainer");
    habitContainer.innerHTML = "";
    calendarContainer.innerHTML = "";

    habits.forEach((habit) => {
      const habitDiv = document.createElement("div");
      habitDiv.className = "habit";
      habitDiv.innerHTML = `
        <details>
        <summary>${habit.habitName} </summary>

        <button class="update-streak" data-id="${habit.id}" >Update-streak</button>
            <button data-id="${habit.id}" class="delete-habit delete-btn">Delete</button>
            <div class="calendar" id="calendar-${habit.id}"></div>
        </details>
        `;

      habitContainer.appendChild(habitDiv);
      renderCalendar(habit, document.getElementById(`calendar-${habit.id}`));

      // Render habit in calendar view
      const calendarEntry = document.createElement("div");
      calendarEntry.innerHTML = `
            <h3>${habit.habitName}</h3>
            <div class="calendar" id="calendar-view-${habit.id}"></div>
        `;
      calendarContainer.appendChild(calendarEntry);
      renderCalendar(
        habit,
        document.getElementById(`calendar-view-${habit.id}`)
      );

      document.querySelectorAll(".delete-habit").forEach((button) => {
        button.addEventListener("click", async (event) => {
          const habitId = parseInt(event.target.dataset.id);
          await db.habits.delete(habitId);
          showToast("Habit deleted successfully!");
          renderHabits(userLogged);
        });
      });

    });

    // Render analytics chart
    renderHabitChart(habits);
  }

  function renderHabitChart(habits) {
    const ctx = document.getElementById("habitChart").getContext("2d");

    // Prepare data for chart
    const labels = habits.map((habit) => habit.habitName);
    const activeDays = habits.map((habit) => habit.streak.length);
    const inactiveDays = habits.map((habit) => {
      const today = new Date();
      const daysInMonth = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      ).getDate();
      return daysInMonth - habit.streak.length;
    });

    new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Active Days",
            data: activeDays,
            backgroundColor: "rgba(75, 192, 192, 0.6)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 1,
          },
          {
            label: "Inactive Days",
            data: inactiveDays,
            backgroundColor: "rgba(255, 99, 132, 0.6)",
            borderColor: "rgba(255, 99, 132, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: "Habit Activity Overview",
          },
        },
        scales: {
          x: {
            stacked: true,
          },
          y: {
            stacked: true,
          },
        },
      },
    });
  }

  function renderCalendar(habit, calendarDiv) {
    let user = localStorage.getItem("loggedUser");
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    calendarDiv.innerHTML = "";

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateDiv = document.createElement("div");
      const isMarked = habit.streak.some(
        (d) =>
          d.year === currentYear && d.month === currentMonth && d.day === day
      );

      dateDiv.className = isMarked ? "marked" : "";
      dateDiv.textContent = day;

      const currentDate = new Date(currentYear, currentMonth, day);
      if (currentDate > today) {
        dateDiv.classList.add("disabled");
      }

      dateDiv.addEventListener("click", () =>
        handleDayClick(habit, { year: currentYear, month: currentMonth, day })
      );

      calendarDiv.appendChild(dateDiv);
    }
  }

  async function handleDayClick(habit, date) {
    const now = new Date();

    if (habit.lastModified) {
      const lastModified = new Date(habit.lastModified);
      const diffInHours = (now - lastModified) / (1000 * 60 * 60);

      if (diffInHours < 12) {
        showToast("You can only modify the habit every 12 hours", "error");
        return;
      }
    }

    habit.streak.push(date);
    habit.maxStreak = Math.max(habit.maxStreak, habit.streak.length);
    habit.lastModified = now.toISOString();

    await db.habits.update(habit.id, habit);
    showToast("Habit updated successfully!");
    renderHabits(user);
  }

  renderHabits(user);
}
function initializeUserManagementPage() {
  document
    .getElementById("registerForm")
    .addEventListener("submit", async (event) => {
      event.preventDefault();
      const name = document.getElementById("registerName").value;
      const email = document.getElementById("registerEmail").value;
      const password = document.getElementById("registerPassword").value;

      const existingUser = await db.users.where({ email }).first();
      if (existingUser) {
        showToast("Email already registered", "error");
        return;
      }

      await db.users.add({ name, email, password });
      showToast("User registered successfully!");
      localStorage.setItem("user", JSON.stringify({ name, email, id }));
      renderUsers();
      event.target.reset();
    });

  async function renderUsers() {
    const users = await db.users.toArray();
    const userList = document.getElementById("userList");
    userList.innerHTML = "";

    users.forEach((user) => {
      const userDiv = document.createElement("div");
      userDiv.className = "user";
      userDiv.textContent = `${user.name} (${user.email})`;
      userList.appendChild(userDiv);
    });
  }

  renderUsers();
}

function initializeLoginPage() {
  if (currentUser) {
    navigateTo("/");
    return;
  }
  const loginForm = document.getElementById("loginForm");
  currentUser = loadUserSession();
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    // Fetch user from the database
    try {
      const existingUser = await db.users.where({ email, password }).first();

      if (existingUser) {
        // Secure storage of user data
        localStorage.setItem(
          "loggedUser",
          JSON.stringify({
            id: existingUser.id,
            name: existingUser.name,
            email: existingUser.email,
          })
        );

        currentUser = existingUser;
        showToast(`Welcome back, ${existingUser.name}!`);
        updateNavLinks();
        navigateTo("/"); // Redirect to home/dashboard
      } else {
        showToast("Invalid email or password. Try again.", "error");
      }
    } catch (error) {
      console.error("Login error:", error);
      showToast("An error occurred during login. Please try again.", "error");
    } finally {
      loginForm.reset();
    }
  });
}

function setupEventDelegation() {
  document.addEventListener("click", async (e) => {
    // Navigation
    if (e.target.matches("[data-link]")) {
      e.preventDefault();
      const url = e.target.href;
      navigateTo(url);
    }

    // Other delegated events can be added here
  });
}

document
  .getElementById("languageSelector")
  .addEventListener("change", (event) => {
    setLanguage(event.target.value); // Update the app's language
  });
// Initialize the application
document.addEventListener("DOMContentLoaded", async () => {
  initializeApp();
  await initializeTranslations();
  loadPage(window.location.pathname); // Load the initial page
  setupEventDelegation();
  setupNavigation(); // Setup navigation handling
});

async function initializeTranslations() {
  const currentLanguage = localStorage.getItem("language") || "en";
  const existingTranslations = await db.translations.count();
  if (existingTranslations === 0) {
    // Add default translations
    await db.translations.bulkAdd([
      {
        key: "greeting",
        translations: { en: "Hello", es: "Hola", fr: "Bonjour" },
      },
      {
        key: "logout",
        translations: { en: "Logout", es: "Cerrar sesión", fr: "Déconnexion" },
      },
      {
        key: "login",
        translations: { en: "Login", es: "Iniciar sesión", fr: "Connexion" },
      },
      {
        key: "home",
        translations: { en: "Home", es: "Inicio", fr: "Initial" },
      },
      {
        key: "register",
        translations: { en: "Register", es: "Registro", fr: "Registement" },
      },
      {
        key: "profile-name",
        translations: { en: "Profile", es: "Perfil", fr: "Profile" },
      },
      {
        key: "todo-title",
        translations: {
          en: "add a todo",
          es: "Añade una tarea",
          fr: "Ajoute a todo",
        },
      },
      {
        key: "todos",
        translations: { en: "Todos", es: "Tareas", fr: "Todos" },
      },
      {
        key: "notes",
        translations: { en: "Notes", es: "Notas", fr: "Notes" },
      },
      {
        key: "habits",
        translations: { en: "Habits", es: "Hábitos", fr: "Habitud" },
      },
      {
        key: "profile",
        translations: { en: "Profile", es: "Perfil", fr: "Perfil" },
      },
      {
        key: "user",
        translations: { en: "Hi: ", es: "Hola: ", fr: "Bonjour: " },
      },
    ]);
  }
}

async function updatePageTranslations() {
  const elements = document.querySelectorAll("[data-i18n]");
  for (const element of elements) {
    const key = element.getAttribute("data-i18n");
    const translation = await getTranslation(key, currentLanguage);
    element.textContent = translation;
  }
}

function setLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem("language", lang);
  updatePageTranslations();
}
async function getTranslation(key, lang) {
  const entry = await db.translations.where({ key }).first();
  if (entry && entry.translations[lang]) {
    return entry.translations[lang];
  }
  return `Translation missing for "${key}" in "${lang}"`; // Fallback
}

// // Add an event listener to toggle the dropdown menu
// document.querySelector('.selected-item').addEventListener('click', function() {
//   document.querySelector('.dropdown-menu').classList.toggle('show');
// });

// // Optional: Add event listeners to handle selection
// document.querySelectorAll('.dropdown-menu li').forEach(item => {
//   item.addEventListener('click', function() {
//     const selectedValue = this.getAttribute('data-value');
//     const selectedText = this.textContent.trim();
//     document.querySelector('.selected-item').innerHTML = `<img class="icon" src="./img/${selectedValue}.png" alt="${selectedText}"> ${selectedText}`;
//     document.querySelector('.dropdown-menu').classList.remove('show');
//   });
// });

// if ("serviceWorker" in navigator) {
//   // Register a service worker hosted at the root of the
//   // site using the default scope.
//   navigator.serviceWorker
//     .register("/serviceWorker.js")
//     .then(function (registration) {
//       console.log("Service worker registration succeeded:", registration);
//     })
//     .catch(function (error) {
//       console.log("Service worker registration failed:", error);
//     });
// } else {
//   console.log("Service workers are not supported.");
// }
