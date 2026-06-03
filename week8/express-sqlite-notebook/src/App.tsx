import {
  ArrowLeft,
  Check,
  LogIn,
  LogOut,
  MoreVertical,
  Palette,
  Plus,
  Save,
  Search,
  Settings,
  Sparkles,
  Trash2,
  UserCircle,
  X,
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { create } from "zustand";

type Mode = "todo" | "notes";
type ModalMode = "profile" | "settings" | null;
type ThemeId = "blue" | "green" | "gold" | "rose";
type AuthMode = "login" | "register";

type Tag = {
  id: string;
  name: string;
  color: string;
};

type Todo = {
  id: string;
  title: string;
  tagId: string | null;
  tagName: string | null;
  tagColor: string | null;
  dueDate: string | null;
  completed: boolean;
};

type Note = {
  id: string;
  title: string;
  content: string;
  summary: string;
  tags: Tag[];
  updatedAt: string;
};

type User = {
  id: string;
  username: string | null;
  name: string;
  role: string;
  avatarColor: string;
};

type Store = {
  currentUser: User | null;
  tags: Tag[];
  todos: Todo[];
  notes: Note[];
  selectedNote: Note | null;
  mode: Mode;
  activeTagId: string;
  search: string;
  themeId: ThemeId;
  setCurrentUser: (user: User | null) => void;
  setMode: (mode: Mode) => void;
  setActiveTagId: (tagId: string) => void;
  setSearch: (search: string) => void;
  setThemeId: (themeId: ThemeId) => void;
  setSelectedNote: (note: Note | null) => void;
  refresh: () => Promise<void>;
};

const themeChoices: { id: ThemeId; label: string; color: string }[] = [
  { id: "blue", label: "湖蓝", color: "#1f6bd8" },
  { id: "green", label: "松绿", color: "#197458" },
  { id: "gold", label: "琥珀", color: "#a86f17" },
  { id: "rose", label: "胭红", color: "#c23f48" },
];

function readStoredUser() {
  try {
    const value = localStorage.getItem("notebook-user");
    return value ? (JSON.parse(value) as User) : null;
  } catch {
    return null;
  }
}

function readStoredTheme(): ThemeId {
  const value = localStorage.getItem("notebook-theme");
  return themeChoices.some((theme) => theme.id === value) ? (value as ThemeId) : "blue";
}

const api = {
  async request<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Request failed" }));
      throw new Error(payload.error || "Request failed");
    }
    if (response.status === 204) return undefined as T;
    return response.json();
  },
};

const useNotebook = create<Store>((set, get) => ({
  currentUser: readStoredUser(),
  tags: [],
  todos: [],
  notes: [],
  selectedNote: null,
  mode: "todo",
  activeTagId: "",
  search: "",
  themeId: readStoredTheme(),
  setCurrentUser: (currentUser) => {
    if (currentUser) localStorage.setItem("notebook-user", JSON.stringify(currentUser));
    else {
      localStorage.removeItem("notebook-user");
      set({ tags: [], todos: [], notes: [], selectedNote: null });
    }
    set({ currentUser });
  },
  setMode: (mode) => set({ mode, selectedNote: null, search: "" }),
  setActiveTagId: (activeTagId) => set({ activeTagId }),
  setSearch: (search) => set({ search }),
  setThemeId: (themeId) => {
    localStorage.setItem("notebook-theme", themeId);
    set({ themeId });
  },
  setSelectedNote: (selectedNote) => set({ selectedNote }),
  refresh: async () => {
    const { search, activeTagId } = get();
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (activeTagId) params.set("tagId", activeTagId);

    const [tags, todos, notes] = await Promise.all([
      api.request<Tag[]>("/api/tags"),
      api.request<Todo[]>(`/api/todos?${params}`),
      api.request<Note[]>(`/api/notes?${params}`),
    ]);
    set({ tags, todos, notes });
  },
}));

function formatDate(value: string | null) {
  if (!value) return "无日期";
  const today = new Date().toISOString().slice(0, 10);
  if (value === today) return "今天";
  return value;
}

function Modal({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-button" onClick={onClose} aria-label="close modal">
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function ProfileModal({ onClose }: { onClose: () => void }) {
  const { currentUser, setCurrentUser, refresh } = useNotebook();
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loginAsGuest() {
    await finishAuth("/api/auth/guest");
  }

  async function finishAuth(url: string, body?: Record<string, string>) {
    setBusy(true);
    setError("");
    try {
      const user = await api.request<User>(url, {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
      });
      setCurrentUser(user);
      await refresh();
      onClose();
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "登录失败");
    } finally {
      setBusy(false);
    }
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authMode === "login") {
      await finishAuth("/api/auth/login", { username, password });
      return;
    }
    await finishAuth("/api/auth/register", { username, password, name });
  }

  function logout() {
    setCurrentUser(null);
  }

  return (
    <Modal
      title={currentUser ? "用户中心" : authMode === "login" ? "登录账户" : "注册账户"}
      subtitle={currentUser ? "当前使用本地会话。" : "可注册新用户，也可一键进入访客演示数据。"}
      onClose={onClose}
    >
      {currentUser ? (
        <div className="profile-card">
          <span className="profile-avatar" style={{ backgroundColor: currentUser.avatarColor }}>
            {currentUser.name.slice(0, 1)}
          </span>
          <div>
            <strong>{currentUser.name}</strong>
            <p>{currentUser.username ? `@${currentUser.username} · ${currentUser.role}` : currentUser.role}</p>
          </div>
          <button className="text-button danger" onClick={logout}>
            <LogOut size={16} />
            退出登录
          </button>
        </div>
      ) : (
        <div className="auth-panel">
          <div className="auth-tabs" role="tablist" aria-label="auth mode">
            <button
              className={authMode === "login" ? "selected" : ""}
              onClick={() => {
                setAuthMode("login");
                setError("");
              }}
            >
              登录
            </button>
            <button
              className={authMode === "register" ? "selected" : ""}
              onClick={() => {
                setAuthMode("register");
                setError("");
              }}
            >
              注册
            </button>
          </div>
          <form className="auth-form" onSubmit={submitAuth}>
            {authMode === "register" && (
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="昵称"
                autoComplete="name"
              />
            )}
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="用户名：唯一，3-8 位数字或字母"
              autoComplete="username"
            />
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="密码：3-16 位数字/字母/@，不能纯数字"
              type="password"
              autoComplete={authMode === "login" ? "current-password" : "new-password"}
            />
            {error && <p className="auth-error">{error}</p>}
            <button className="guest-login-button" type="submit" disabled={busy}>
              <LogIn size={18} />
              {authMode === "login" ? "登录" : "注册并登录"}
            </button>
          </form>
          <button className="guest-link-button" onClick={loginAsGuest} disabled={busy}>
            访客一键登录演示数据
          </button>
        </div>
      )}
    </Modal>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const { themeId, setThemeId } = useNotebook();

  return (
    <Modal title="设置" subtitle="选择适合当前工作状态的主题色。" onClose={onClose}>
      <div className="setting-block">
        <div className="setting-title">
          <Palette size={18} />
          <span>主题颜色</span>
        </div>
        <div className="theme-grid">
          {themeChoices.map((theme) => (
            <button
              key={theme.id}
              className={`theme-swatch ${themeId === theme.id ? "active" : ""}`}
              onClick={() => setThemeId(theme.id)}
              aria-label={`use ${theme.label} theme`}
            >
              <span style={{ backgroundColor: theme.color }} />
              {theme.label}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function Sidebar({ onOpenModal }: { onOpenModal: (modal: Exclude<ModalMode, null>) => void }) {
  const { tags, activeTagId, setActiveTagId, currentUser } = useNotebook();

  return (
    <aside className="sidebar">
      <button className="avatar-button" aria-label="user profile" onClick={() => onOpenModal("profile")}>
        {currentUser ? (
          <span className="avatar-initial" style={{ backgroundColor: currentUser.avatarColor }}>
            {currentUser.name.slice(0, 1)}
          </span>
        ) : (
          <UserCircle className="avatar" size={38} />
        )}
      </button>
      <nav className="tag-rail" aria-label="note tags">
        <button
          className={`tag-filter ${activeTagId === "" ? "active" : ""}`}
          onClick={() => setActiveTagId("")}
        >
          <span className="tag-dot all-dot">全</span>
          <span className="tag-label">全部</span>
        </button>
        {tags.map((tag) => (
          <button
            key={tag.id}
            className={`tag-filter ${activeTagId === tag.id ? "active" : ""}`}
            onClick={() => setActiveTagId(tag.id)}
          >
            <span className="tag-dot" style={{ backgroundColor: tag.color }} />
            <span className="tag-label">{tag.name}</span>
          </button>
        ))}
        <button className="tag-filter muted" onClick={() => setActiveTagId("")}>
          <span className="tag-dot plus-dot">+</span>
          <span className="tag-label">新建标签</span>
        </button>
      </nav>
      <button className="settings-button" aria-label="settings" onClick={() => onOpenModal("settings")}>
        <Settings size={18} />
      </button>
    </aside>
  );
}

function Header() {
  const { mode, setMode, search, setSearch } = useNotebook();

  return (
    <header className="content-header">
      <div className={`mode-switch ${mode === "todo" ? "todo-mode" : "notes-mode"}`}>
        <button className={mode === "todo" ? "selected" : ""} onClick={() => setMode("todo")}>
          TODO
        </button>
        <button className={mode === "notes" ? "selected" : ""} onClick={() => setMode("notes")}>
          文本
        </button>
      </div>
      <label className="search-box">
        <Search size={18} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={mode === "todo" ? "搜索 TODO..." : "搜索文本..."}
        />
      </label>
    </header>
  );
}

function TodoView() {
  const { todos, tags, refresh } = useNotebook();
  const [newTitle, setNewTitle] = useState("");
  const [tagId, setTagId] = useState("work");

  async function addTodo() {
    if (!newTitle.trim()) return;
    await api.request<Todo>("/api/todos", {
      method: "POST",
      body: JSON.stringify({ title: newTitle, tagId }),
    });
    setNewTitle("");
    await refresh();
  }

  async function updateTodo(todo: Todo, completed: boolean) {
    await api.request<Todo>(`/api/todos/${todo.id}`, {
      method: "PATCH",
      body: JSON.stringify({ completed }),
    });
    await refresh();
  }

  async function removeTodo(id: string) {
    await api.request(`/api/todos/${id}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <section className="todo-panel">
      <div className="quick-create">
        <input
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && addTodo()}
          placeholder="添加一个待办..."
        />
        <select value={tagId} onChange={(event) => setTagId(event.target.value)}>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>
      </div>
      <div className="todo-list">
        {todos.map((todo) => (
          <article key={todo.id} className={`todo-row ${todo.completed ? "done" : ""}`}>
            <button className="check-button" onClick={() => updateTodo(todo, !todo.completed)}>
              {todo.completed && <Check size={14} />}
            </button>
            <strong>{todo.title}</strong>
            {todo.tagName && (
              <span className="pill" style={{ backgroundColor: todo.tagColor || "#e5e7eb" }}>
                {todo.tagName}
              </span>
            )}
            <time>{formatDate(todo.dueDate)}</time>
            <button className="icon-button danger" onClick={() => removeTodo(todo.id)}>
              <Trash2 size={16} />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function NotesView() {
  const { notes, setSelectedNote, currentUser } = useNotebook();

  return (
    <section className="notes-panel">
      <div className="note-grid">
        {notes.map((note) => (
          <button key={note.id} className="note-card" onClick={() => { if (currentUser) setSelectedNote(note); }}>
            <span className="note-title">{note.title}</span>
            <span className="note-tags">
              {note.tags.slice(0, 2).map((tag) => (
                <span key={tag.id} className="pill" style={{ backgroundColor: tag.color }}>
                  {tag.name}
                </span>
              ))}
            </span>
            <span className="note-excerpt">{currentUser ? note.content.replace(/[#*_`-]/g, "").slice(0, 80) : "登录后查看内容"}</span>
            <time>{note.updatedAt.slice(0, 10)}</time>
          </button>
        ))}
      </div>
    </section>
  );
}

function Editor() {
  const { selectedNote, setSelectedNote, tags, refresh } = useNotebook();
  const [title, setTitle] = useState(selectedNote?.title || "");
  const [content, setContent] = useState(selectedNote?.content || "");
  const [summary, setSummary] = useState(selectedNote?.summary || "");
  const [tagIds, setTagIds] = useState<string[]>(selectedNote?.tags.map((tag) => tag.id) || []);

  useEffect(() => {
    setTitle(selectedNote?.title || "");
    setContent(selectedNote?.content || "");
    setSummary(selectedNote?.summary || "");
    setTagIds(selectedNote?.tags.map((tag) => tag.id) || []);
  }, [selectedNote]);

  if (!selectedNote) return null;

  async function saveNote() {
    const note = await api.request<Note>(`/api/notes/${selectedNote!.id}`, {
      method: "PATCH",
      body: JSON.stringify({ title, content, summary, tagIds }),
    });
    setSelectedNote(note);
    await refresh();
  }

  async function summarize() {
    const payload = await api.request<{ summary: string }>(`/api/notes/${selectedNote!.id}/summarize`, {
      method: "POST",
    });
    setSummary(payload.summary);
    await refresh();
  }

  async function deleteNote() {
    await api.request(`/api/notes/${selectedNote!.id}`, { method: "DELETE" });
    setSelectedNote(null);
    await refresh();
  }

  return (
    <div className="modal-backdrop editor-backdrop" role="presentation" onMouseDown={() => setSelectedNote(null)}>
      <main className="editor-shell" onMouseDown={(event) => event.stopPropagation()}>
      <header className="editor-header">
        <button className="icon-button" onClick={() => setSelectedNote(null)}>
          <ArrowLeft size={20} />
        </button>
        <input className="title-input" value={title} onChange={(event) => setTitle(event.target.value)} />
        <button className="text-button" onClick={saveNote}>
          <Save size={16} />
          保存
        </button>
        <button className="icon-button danger" onClick={deleteNote}>
          <Trash2 size={18} />
        </button>
        <button className="icon-button" aria-label="更多">
          <MoreVertical size={18} />
        </button>
      </header>
      <div className="editor-tags">
        {tags.map((tag) => (
          <label key={tag.id} className="tag-checkbox">
            <input
              type="checkbox"
              checked={tagIds.includes(tag.id)}
              onChange={(event) => {
                setTagIds((current) =>
                  event.target.checked
                    ? [...current, tag.id]
                    : current.filter((tagId) => tagId !== tag.id)
                );
              }}
            />
            <span style={{ backgroundColor: tag.color }}>{tag.name}</span>
          </label>
        ))}
      </div>
      <section className="summary-box">
        <button onClick={summarize}>
          <Sparkles size={16} />
          AI 总结
        </button>
        <p>{summary || "点击生成这篇笔记的摘要。"}</p>
      </section>
      <textarea
        className="editor"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        spellCheck={false}
      />
      </main>
    </div>
  );
}

export function App() {
  const {
    refresh,
    mode,
    selectedNote,
    activeTagId,
    search,
    tags,
    setSelectedNote,
    currentUser,
    themeId,
  } = useNotebook();
  const [activeModal, setActiveModal] = useState<ModalMode>(currentUser ? null : "profile");

  useEffect(() => {
    if (currentUser) refresh();
  }, [refresh, activeTagId, search, currentUser]);

  useEffect(() => {
    document.documentElement.dataset.theme = themeId;
  }, [themeId]);

  const body = useMemo(() => (mode === "todo" ? <TodoView /> : <NotesView />), [mode]);

  async function createCurrentItem() {
    if (mode === "todo") {
      await api.request<Todo>("/api/todos", {
        method: "POST",
        body: JSON.stringify({
          title: "新的待办",
          tagId: activeTagId || tags[0]?.id || null,
        }),
      });
      await refresh();
      return;
    }

    const note = await api.request<Note>("/api/notes", {
      method: "POST",
      body: JSON.stringify({
        title: "新的文本笔记",
        content: "# 新的文本笔记\n\n在这里记录内容。",
        tagIds: activeTagId ? [activeTagId] : tags[0] ? [tags[0].id] : [],
      }),
    });
    await refresh();
    setSelectedNote(note);
  }

  return (
    <main className="app-shell">
      <Sidebar onOpenModal={setActiveModal} />
      <section className="main-panel">
        <button className="global-add-button" onClick={createCurrentItem} aria-label="new item">
          <Plus size={22} />
        </button>
        <Header />
        {body}
      </section>
      {activeModal === "profile" && <ProfileModal onClose={() => setActiveModal(null)} />}
      {activeModal === "settings" && <SettingsModal onClose={() => setActiveModal(null)} />}
      {selectedNote && <Editor />}
    </main>
  );
}
