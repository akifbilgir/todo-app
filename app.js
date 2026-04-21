const SUPABASE_URL = 'https://kdefjzcrruabjcevhgmr.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkZWZqemNycnVhYmpjZXZoZ21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3ODUwMjYsImV4cCI6MjA5MjM2MTAyNn0.7WMUaZ1bYTQMjTAMpW0jol5BzUmEHk38xkOe3-RvG1o';
const AUTH = `${SUPABASE_URL}/auth/v1`;
const API  = `${SUPABASE_URL}/rest/v1/todos`;

let session = null;
let todos   = [];
let filter  = 'all';
let authMode = 'login';

// ── HELPERS ──────────────────────────────────────────────────────────
function apiHeaders() {
  const token = session ? session.access_token : ANON_KEY;
  return {
    'Content-Type': 'application/json',
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${token}`,
    'Prefer': 'return=representation'
  };
}

function saveSession() {
  if (session) localStorage.setItem('sb_session', JSON.stringify(session));
  else         localStorage.removeItem('sb_session');
}

function formatDate() {
  const d = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
  const m = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const n = new Date();
  return `${d[n.getDay()]}, ${n.getDate()} ${m[n.getMonth()]} ${n.getFullYear()}`;
}

function escapeHtml(t) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(t));
  return d.innerHTML;
}

function showScreen(id) {
  ['authScreen','confirmScreen','appScreen'].forEach(s => {
    document.getElementById(s).classList.toggle('hidden', s !== id);
  });
}

function showAuthError(msg) {
  const el = document.getElementById('authError');
  el.textContent = msg;
  el.className = 'auth-message error';
}

function clearAuthError() {
  const el = document.getElementById('authError');
  el.className = 'auth-message error hidden';
}

// ── INIT ─────────────────────────────────────────────────────────────
async function init() {
  // Supabase email onayı sonrası URL hash'ini kontrol et
  const hash = window.location.hash.substring(1);
  if (hash.includes('access_token')) {
    const p = new URLSearchParams(hash);
    const accessToken  = p.get('access_token');
    const refreshToken = p.get('refresh_token');
    history.replaceState(null, '', window.location.pathname);

    const res  = await fetch(`${AUTH}/user`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${accessToken}` }
    });
    const user = await res.json();
    session = { access_token: accessToken, refresh_token: refreshToken, user };
    saveSession();
    bootApp();
    return;
  }

  const saved = localStorage.getItem('sb_session');
  if (saved) {
    session = JSON.parse(saved);
    bootApp();
  } else {
    showScreen('authScreen');
  }
}

function bootApp() {
  const email = session?.user?.email || '';
  document.getElementById('userBadge').textContent = email;
  document.getElementById('currentDate').textContent = formatDate();
  showScreen('appScreen');
  fetchTodos();
}

// ── AUTH ─────────────────────────────────────────────────────────────
async function register(email, password) {
  const res = await fetch(`${AUTH}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || data.message || 'Kayıt başarısız');
  return data;
}

async function login(email, password) {
  const res = await fetch(`${AUTH}/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) {
    const code = data.error_code || '';
    if (code === 'email_not_confirmed') throw new Error('E-posta henüz doğrulanmamış. Gelen kutunuzu kontrol edin.');
    if (code === 'invalid_credentials')  throw new Error('E-posta veya şifre hatalı.');
    throw new Error(data.msg || data.message || 'Giriş başarısız');
  }
  return data;
}

async function logout() {
  await fetch(`${AUTH}/logout`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${session.access_token}` }
  });
  session = null;
  todos   = [];
  saveSession();
  showScreen('authScreen');
  clearAuthError();
}

// ── TODOS ─────────────────────────────────────────────────────────────
async function fetchTodos() {
  document.getElementById('todoList').style.opacity = '0.5';
  const res = await fetch(`${API}?order=created_at.desc`, { headers: apiHeaders() });
  todos = await res.json();
  render();
  document.getElementById('todoList').style.opacity = '1';
}

async function addTodo() {
  const input = document.getElementById('todoInput');
  const text  = input.value.trim();
  if (!text) return;
  input.value = '';
  const res = await fetch(API, {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify({ text, completed: false })
  });
  const [todo] = await res.json();
  todos.unshift(todo);
  render();
}

async function toggle(id) {
  const todo = todos.find(t => t.id === id);
  const res  = await fetch(`${API}?id=eq.${id}`, {
    method: 'PATCH',
    headers: apiHeaders(),
    body: JSON.stringify({ completed: !todo.completed })
  });
  const [updated] = await res.json();
  todos = todos.map(t => t.id === id ? updated : t);
  render();
}

async function remove(id) {
  await fetch(`${API}?id=eq.${id}`, { method: 'DELETE', headers: apiHeaders() });
  todos = todos.filter(t => t.id !== id);
  render();
}

async function removeCompleted() {
  const ids = todos.filter(t => t.completed).map(t => t.id);
  if (!ids.length) return;
  await fetch(`${API}?id=in.(${ids.join(',')})`, { method: 'DELETE', headers: apiHeaders() });
  todos = todos.filter(t => !t.completed);
  render();
}

// ── RENDER ───────────────────────────────────────────────────────────
function render() {
  const list = document.getElementById('todoList');
  const filtered = todos.filter(t => {
    if (filter === 'active')    return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  list.innerHTML = '';
  filtered.forEach(todo => {
    const li = document.createElement('li');
    li.className = `todo-item${todo.completed ? ' completed' : ''}`;
    li.innerHTML = `
      <div class="todo-check"></div>
      <span class="todo-text">${escapeHtml(todo.text)}</span>
      <button class="todo-delete" title="Sil">&#10005;</button>`;
    li.querySelector('.todo-check').addEventListener('click', () => toggle(todo.id));
    li.querySelector('.todo-delete').addEventListener('click', () => remove(todo.id));
    list.appendChild(li);
  });

  const active = todos.filter(t => !t.completed).length;
  document.getElementById('remainingCount').textContent = `${active} görev kaldı`;
  document.getElementById('footer').classList.toggle('hidden', todos.length === 0);
}

// ── EVENT LISTENERS ──────────────────────────────────────────────────

// Auth tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    authMode = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    clearAuthError();
    document.getElementById('authSubmit').textContent =
      authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol';
  });
});

// Auth form submit
document.getElementById('authForm').addEventListener('submit', async e => {
  e.preventDefault();
  clearAuthError();
  const email    = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const btn      = document.getElementById('authSubmit');

  btn.disabled    = true;
  btn.textContent = authMode === 'login' ? 'Giriş yapılıyor...' : 'Kayıt olunuyor...';

  try {
    if (authMode === 'register') {
      await register(email, password);
      document.getElementById('confirmSubtitle').textContent = `${email} adresine gönderildi`;
      showScreen('confirmScreen');
    } else {
      const data = await login(email, password);
      session = {
        access_token:  data.access_token,
        refresh_token: data.refresh_token,
        user:          data.user
      };
      saveSession();
      bootApp();
    }
  } catch (err) {
    showAuthError(err.message);
  } finally {
    btn.disabled    = false;
    btn.textContent = authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol';
  }
});

// Şifre göster/gizle
document.getElementById('togglePw').addEventListener('click', () => {
  const inp = document.getElementById('authPassword');
  inp.type  = inp.type === 'password' ? 'text' : 'password';
});

// Geri dön
document.getElementById('backToLogin').addEventListener('click', () => {
  showScreen('authScreen');
});

// Çıkış
document.getElementById('logoutBtn').addEventListener('click', logout);

// Todo ekle
document.getElementById('addBtn').addEventListener('click', addTodo);
document.getElementById('todoInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addTodo();
});

// Filtreler
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filter = btn.dataset.filter;
    render();
  });
});

// Tamamlananları sil
document.getElementById('clearCompleted').addEventListener('click', removeCompleted);

// Başlat
init();
