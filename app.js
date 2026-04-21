const todoInput = document.getElementById('todoInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const filterBtns = document.querySelectorAll('.filter-btn');
const remainingCount = document.getElementById('remainingCount');
const clearCompleted = document.getElementById('clearCompleted');
const footer = document.getElementById('footer');

let todos = JSON.parse(localStorage.getItem('todos')) || [];
let currentFilter = 'all';

function save() {
  localStorage.setItem('todos', JSON.stringify(todos));
}

function formatDate() {
  const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const now = new Date();
  return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

document.getElementById('currentDate').textContent = formatDate();

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
    li.dataset.id = todo.id;

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

function addTodo() {
  const text = todoInput.value.trim();
  if (!text) return;
  todos.unshift({ id: Date.now(), text, completed: false });
  todoInput.value = '';
  save();
  render();
}

function toggle(id) {
  const todo = todos.find(t => t.id === id);
  if (todo) todo.completed = !todo.completed;
  save();
  render();
}

function remove(id) {
  todos = todos.filter(t => t.id !== id);
  save();
  render();
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

clearCompleted.addEventListener('click', () => {
  todos = todos.filter(t => !t.completed);
  save();
  render();
});

render();
