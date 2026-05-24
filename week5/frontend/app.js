const state = {
  notes: [],
  actions: [],
  actionFilter: 'all',
};

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return null;
  return res.json();
}

function setError(id, message) {
  document.getElementById(id).textContent = message || '';
}

function renderNotes() {
  const list = document.getElementById('notes');
  list.innerHTML = '';

  for (const note of state.notes) {
    const li = document.createElement('li');
    li.dataset.noteId = note.id;

    const title = document.createElement('input');
    title.value = note.title;
    title.setAttribute('aria-label', 'Note title');

    const content = document.createElement('input');
    content.value = note.content;
    content.setAttribute('aria-label', 'Note content');

    const save = document.createElement('button');
    save.type = 'button';
    save.textContent = 'Save';
    save.onclick = () => updateNote(note.id, title.value, content.value);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Delete';
    remove.onclick = () => deleteNote(note.id);

    li.append(title, content, save, remove);
    list.appendChild(li);
  }
}

async function loadNotes() {
  state.notes = await fetchJSON('/notes/');
  renderNotes();
}

async function updateNote(id, title, content) {
  const previous = [...state.notes];
  state.notes = state.notes.map((note) => (note.id === id ? { ...note, title, content } : note));
  renderNotes();
  setError('notes-error', '');

  try {
    const updated = await fetchJSON(`/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    });
    state.notes = state.notes.map((note) => (note.id === id ? updated : note));
    renderNotes();
  } catch (error) {
    state.notes = previous;
    renderNotes();
    setError('notes-error', `Could not save note: ${error.message}`);
  }
}

async function deleteNote(id) {
  const previous = [...state.notes];
  state.notes = state.notes.filter((note) => note.id !== id);
  renderNotes();
  setError('notes-error', '');

  try {
    await fetchJSON(`/notes/${id}`, { method: 'DELETE' });
  } catch (error) {
    state.notes = previous;
    renderNotes();
    setError('notes-error', `Could not delete note: ${error.message}`);
  }
}

function actionFilterParams() {
  if (state.actionFilter === 'open') return '?completed=false';
  if (state.actionFilter === 'done') return '?completed=true';
  return '';
}

function renderActions() {
  const list = document.getElementById('actions');
  list.innerHTML = '';

  for (const action of state.actions) {
    const li = document.createElement('li');
    li.dataset.actionId = action.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'bulk-check';
    checkbox.value = action.id;
    checkbox.disabled = action.completed;
    checkbox.setAttribute('aria-label', `Select ${action.description}`);

    const label = document.createElement('span');
    label.textContent = `${action.description} [${action.completed ? 'done' : 'open'}]`;

    li.append(checkbox, label);

    if (!action.completed) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'Complete';
      btn.onclick = async () => {
        await fetchJSON(`/action-items/${action.id}/complete`, { method: 'PUT' });
        loadActions();
      };
      li.appendChild(btn);
    }

    list.appendChild(li);
  }
}

async function loadActions() {
  state.actions = await fetchJSON(`/action-items/${actionFilterParams()}`);
  renderActions();
}

async function bulkCompleteSelected() {
  const selected = [...document.querySelectorAll('.bulk-check:checked')].map((el) =>
    Number(el.value),
  );
  if (selected.length === 0) return;

  const previous = [...state.actions];
  state.actions = state.actions.map((action) =>
    selected.includes(action.id) ? { ...action, completed: true } : action,
  );
  renderActions();
  setError('actions-error', '');

  try {
    await fetchJSON('/action-items/bulk-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selected),
    });
    loadActions();
  } catch (error) {
    state.actions = previous;
    renderActions();
    setError('actions-error', `Could not complete selected items: ${error.message}`);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('note-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('note-title').value;
    const content = document.getElementById('note-content').value;
    const temporaryId = `tmp-${Date.now()}`;
    const previous = [...state.notes];

    state.notes = [{ id: temporaryId, title, content }, ...state.notes];
    renderNotes();
    setError('notes-error', '');
    e.target.reset();

    try {
      const created = await fetchJSON('/notes/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });
      state.notes = state.notes.map((note) => (note.id === temporaryId ? created : note));
      renderNotes();
    } catch (error) {
      state.notes = previous;
      renderNotes();
      setError('notes-error', `Could not add note: ${error.message}`);
    }
  });

  document.getElementById('action-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const description = document.getElementById('action-desc').value;
    await fetchJSON('/action-items/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    });
    e.target.reset();
    loadActions();
  });

  document.querySelectorAll('.filter').forEach((button) => {
    button.addEventListener('click', () => {
      state.actionFilter = button.dataset.filter;
      document.querySelectorAll('.filter').forEach((item) => {
        item.classList.toggle('active', item === button);
      });
      loadActions();
    });
  });

  document.getElementById('bulk-complete').addEventListener('click', bulkCompleteSelected);

  loadNotes();
  loadActions();
});
