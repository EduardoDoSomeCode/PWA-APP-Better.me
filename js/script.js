// let currentUser = null;

function showToast(message, type = 'success') {
  Toastify({
    text: message,
    duration: 3000, // Time in ms (3 seconds)
    gravity: 'top', // Top or bottom
    position: 'right', // Left, center, or right
    style: {
      background: type === 'success' ? 'green' : 'red', // Color based on message type
      color: '#fff',
      borderRadius: '5px',
    },
  }).showToast();
}


// Initialize Dexie.js
const db = new Dexie('MyAppDatabase');
db.version(1).stores({
  users: '++id, name, email, password',
  todos: '++id, userId, content',
  notes: '++id, userId, title, content',
  habits: '++id, userId, habitName, streak, maxStreak, lastModified'

});

// Current user object

document.getElementById('addUserForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = document.getElementById('userName').value;
  const email = document.getElementById('userEmail').value;
  const password = document.getElementById('userPassword').value;

  await db.users.add({ name, email, password });
  alert('User added successfully!');
  event.target.reset();
});


// Update UI based on login state
function updateLoginUI() {
  const userDisplay = document.getElementById('currentUser');
  const logoutButton = document.getElementById('logoutButton');
  const addTodoButton = document.getElementById('addTodoButton');
  const addNoteButton = document.getElementById('addNoteButton');
  const todoList = document.getElementById('todoList');


  if (currentUser) {
    userDisplay.textContent = `Logged in as: ${currentUser.name}`;
    logoutButton.style.display = 'inline-block';
    addTodoButton.disabled = false;
    addNoteButton.disabled = false;
      renderHabits();
    
  } else {
    userDisplay.textContent = 'No user logged in';
    logoutButton.style.display = 'none';
    addTodoButton.disabled = true;
    addNoteButton.disabled = true;
    todoList.innerHTML = '';
  }
}

// Login Form
document.getElementById('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  // Check if the user exists in the database
  const user = await db.users.where({ email, password }).first();

  if (user) {
    currentUser = user;
    showToast('Login successful!');
    updateLoginUI();
  } else {
    showToast('Invalid email or password', 'error');
  }
  event.target.reset();
});

// Logout Button
document.getElementById('logoutButton').addEventListener('click', () => {
  currentUser = null;
  updateLoginUI();
});

// Add Todo
document.getElementById('addTodoForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!currentUser) {
    showToast('Please log in to add a todo', 'error');
    return;
  }

  const content = document.getElementById('todoContent').value;

  const id = await db.todos.add({ userId: currentUser.id, content });
  addTodoToList(id, content);
  showToast('Todo added successfully!');


  event.target.reset();
});

// Add Note
document.getElementById('addNoteForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!currentUser) {
    showToast('Please log in to add a note', 'error');

    return;
  }

  const title = document.getElementById('noteTitle').value;
  const content = document.getElementById('noteContent').value;

  const id = await db.notes.add({ userId: currentUser.id, title, content });
  addNoteToList(id, title,content);
  alert('Note added successfully!');

  event.target.reset();
});

// Render Todos
async function addTodoToList(id, content) {
  const todoList = document.getElementById('todoList');
  const li = document.createElement('li');
  li.innerHTML = `${content} <button onclick="deleteTodo(${id})">Delete</button>`;
  todoList.appendChild(li);
}

// Render Notes
async function addNoteToList(id, title,content) {
  const noteList = document.getElementById('noteList');
  const li = document.createElement('li');
  li.innerHTML = `<div>${title}   ${content} <button onclick="deleteNote(${id})">Delete</button></div>`;
  noteList.appendChild(li);
}

// Delete Todo
async function deleteTodo(id) {
  await db.todos.delete(id);
  showToast('Todo deleted successfully!');

  location.reload(); // Reload the page to refresh the list
}

// Delete Note
async function deleteNote(id) {
  await db.notes.delete(id);
  showToast('Note deleted successfully!');
  location.reload(); // Reload the page to refresh the list
}

document.getElementById('addHabitForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!currentUser) {
    showToast('Please log in to add a habit', 'error');
    return;
  }

  const habitName = document.getElementById('habitName').value;
  const habit = {
    userId: currentUser.id,
    habitName,
    streak: [], // Initially empty
    maxStreak: 0,
    lastModified: null
  };

  await db.habits.add(habit);
  showToast('Habit added successfully!');
  renderHabits();
  event.target.reset();
});


async function renderHabits() {
  const habitContainer = document.getElementById('habitContainer');
  habitContainer.innerHTML = '';

  const habits = await db.habits.where({ userId: currentUser.id }).toArray();

  habits.forEach((habit) => {
    const habitDiv = document.createElement('div');
    habitDiv.innerHTML = `
      <h3>${habit.habitName}</h3>
      <div class="calendar" id="calendar-${habit.id}"></div>
    `;

    habitContainer.appendChild(habitDiv);
    renderCalendar(habit, document.getElementById(`calendar-${habit.id}`));
  });
}

function renderCalendar(habit, calendarDiv) {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  calendarDiv.innerHTML = '';

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const dateDiv = document.createElement('div');
    const isMarked = habit.streak.some(
      (d) => d.year === currentYear && d.month === currentMonth && d.day === day
    );

    dateDiv.className = isMarked ? 'marked' : '';
    dateDiv.textContent = day;

    // Disable future dates
    const currentDate = new Date(currentYear, currentMonth, day);
    if (currentDate > today) {
      dateDiv.classList.add('disabled');
    }

    dateDiv.addEventListener('click', () =>
      handleDayClick(habit, { year: currentYear, month: currentMonth, day })
    );

    calendarDiv.appendChild(dateDiv);
  }
}


async function handleDayClick(habit, date) {
  const now = new Date();

  // Validate the 12-hour rule
  if (habit.lastModified) {
    const lastModified = new Date(habit.lastModified);
    const diffInHours = (now - lastModified) / (1000 * 60 * 60);

    if (diffInHours < 12) {
      showToast('You can only modify the habit every 12 hours', 'error');
      return;
    }
  }

  // Add the selected date to the streak
  habit.streak.push(date);

  // Update the max streak
  const streakCount = habit.streak.length;
  if (streakCount > habit.maxStreak) {
    habit.maxStreak = streakCount;
  }

  habit.lastModified = now.toISOString();

  await db.habits.update(habit.id, habit);
  showToast('Habit updated successfully!');
  renderHabits();
}
