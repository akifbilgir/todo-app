const SUPABASE_URL = 'https://kdefjzcrruabjcevhgmr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkZWZqemNycnVhYmpjZXZoZ21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3ODUwMjYsImV4cCI6MjA5MjM2MTAyNn0.7WMUaZ1bYTQMjTAMpW0jol5BzUmEHk38xkOe3-RvG1o';
const API = `${SUPABASE_URL}/rest/v1/todos`;
const HEADERS = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Prefer': 'return=representation'
};

const todoInput = document.getElementById('todoInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const filterBtns = document.querySelectorAll('.filter-btn');
const remainingCount = document.getElementById('remainingCount');
const clearCompleted = document.getElementById('clearCompleted');
const footer = document.getElementById('footer');

let todos = [];
let currentFilter = 'all';

function formatDate() {
  const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const now = new Date();
  return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

document.getElementById('currentDate').textContent = formatDate();

async function fetchTodos() {
  setLoading(true);
  const res = await fetch(`${API}?order=created_at.desc`, { headers: HEADERS });
  todos = await res.json();
  render();
  setLoading(false);
}

async function addTodo() {
  const text = todoInput.value.trim();
  if (!text) return;
  todoInput.value = '';
  const res = await fetch(API, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ text, completed: false })
  });
  const [newTodo] = await res.json();
  todos.unshift(newTodo);
  render();
}

async function toggle(id) {
  const todo = todos.find(t => t.id === id);
  const res = await fetch(`${API}?id=eq.${id}`, {
    method: 'PATCH',
    headers: HEADERS,
    body: JSON.stringify({ completed: !todo.completed })
  });
  const [updated] = await res.json();
  todos = todos.map(t => t.id === id ? updated : t);
  render();
}

async function remove(id) {
  await fetch(`${API}?id=eq.${id}`, { method: 'DELETE', headers: HEADERS });
  todos = todos.filter(t => t.id !== id);
  render();
}

async function removeCompleted() {
  const ids = todos.filter(t => t.completed).map(t => t.id);
  if (!ids.length) return;
  await fetch(`${API}?id=in.(${ids.join(',')})`, { method: 'DELETE', headers: HEADERS });
  todos = todos.filter(t => !t.completed);
  render();
}

function setLoading(on) {
  todoList.style.opacity = on ? '0.5' : '1';
}

function render() {
  const filtered = todos.filter(t => {
    if (currentFilter === 'active') return !t.completed;
    if (currentFilter === 'completed') return t.completed;
    return true;
  });

  todoList.innerHTML = '';

  filtered.forEach(todo => {
    const li = document.createElement('li');
    li.className = `todo-item${todo.completed ? ' completed' : ''}`;

    li.innerHTML = `
      <div class="todo-check"></div>
      <span class="todo-text">${escapeHtml(todo.text)}</span>
      <button class="todo-delete" title="Sil">&#10005;</button>
    `;

    li.querySelector('.todo-check').addEventListener('click', () => toggle(todo.id));
    li.querySelector('.todo-delete').addEventListener('click', () => remove(todo.id));

    todoList.appendChild(li);
  });

  const active = todos.filter(t => !t.completed).length;
  remainingCount.textContent = `${active} görev kaldı`;
  footer.classList.toggle('hidden', todos.length === 0);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

addBtn.addEventListener('click', addTodo);
todoInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});

clearCompleted.addEventListener('click', removeCompleted);

fetchTodos();
