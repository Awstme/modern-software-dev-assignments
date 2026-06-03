import {
  ArrowLeft,
  Check,
  ClipboardCopy,
  Download,
  FileText,
  LogIn,
  LogOut,
  MoreVertical,
  Palette,
  Pencil,
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
import { useEffect, useMemo, useRef, useState } from "react";
import { create } from "zustand";

type Mode = "todo" | "notes";
type ModalMode = "profile" | "settings" | "newtag" | "template" | null;
type ThemeId = "blue" | "green" | "gold" | "rose";
type AuthMode = "login" | "register";

type NoteTemplate = {
  id: string;
  label: string;
  title: string;
  content: string;
};

const noteTemplates: NoteTemplate[] = [
  {
    id: "blank",
    label: "空白笔记",
    title: "新的文本笔记",
    content: "# 新的文本笔记\n\n在这里记录内容。",
  },
  {
    id: "meeting",
    label: "会议记录",
    title: "会议记录",
    content: "# 会议记录\n\n**日期：**\n\n**参会人：**\n\n## 议题\n\n1. \n\n## 结论\n\n- \n\n## 待办\n\n- [ ] ",
  },
  {
    id: "daily",
    label: "每日总结",
    title: "每日总结",
    content: "# 每日总结\n\n## 今日完成\n\n- \n\n## 遇到的问题\n\n- \n\n## 明日计划\n\n- ",
  },
  {
    id: "study",
    label: "学习笔记",
    title: "学习笔记",
    content: "# 学习笔记\n\n## 核心概念\n\n\n\n## 要点摘录\n\n- \n\n## 个人理解\n\n\n\n## 参考资料\n\n- ",
  },
  {
    id: "todo-list",
    label: "待办清单",
    title: "待办清单",
    content: "# 待办清单\n\n## 紧急\n\n- [ ] \n\n## 重要\n\n- [ ] \n\n## 可选\n\n- [ ] ",
  },
  {
    id: "brainstorm",
    label: "头脑风暴",
    title: "头脑风暴",
    content: "# 头脑风暴\n\n**主题：**\n\n## 想法\n\n- \n\n## 可行性分析\n\n| 想法 | 可行性 | 优先级 |\n| --- | --- | --- |\n|  |  |  |\n\n## 下一步\n\n- ",
  },
];

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
  pendingEditId: string | null;
  setCurrentUser: (user: User | null) => void;
  setMode: (mode: Mode) => void;
  setActiveTagId: (tagId: string) => void;
  setSearch: (search: string) => void;
  setThemeId: (themeId: ThemeId) => void;
  setSelectedNote: (note: Note | null) => void;
  setPendingEditId: (id: string | null) => void;
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
    const userId = useNotebook.getState().currentUser?.id;
    const headers: Record<string, string> = {};
    if (userId) headers["X-User-Id"] = userId;
    if (options?.body) headers["Content-Type"] = "application/json";
    const response = await fetch(url, {
      ...options,
      headers: { ...headers, ...(options?.headers as Record<string, string> || {}) },
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
  pendingEditId: null,
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
  setPendingEditId: (pendingEditId) => set({ pendingEditId }),
  refresh: async () => {
    const { search, activeTagId } = get();
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (activeTagId) params.set("tagId", activeTagId);

    try {
      const [tags, todos, notes] = await Promise.all([
        api.request<Tag[]>("/api/tags"),
        api.request<Todo[]>(`/api/todos?${params}`),
        api.request<Note[]>(`/api/notes?${params}`),
      ]);
      set({ tags, todos, notes });
    } catch {
      set({ tags: [], todos: [], notes: [] });
    }
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

function ConfirmModal({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  onDismiss,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  onDismiss?: () => void;
}) {
  return (
    <Modal title={title} onClose={onDismiss || onCancel}>
      <p className="confirm-message">{message}</p>
      <div className="confirm-actions">
        <button className="text-button danger" onClick={onCancel}>{cancelLabel || "取消"}</button>
        <button className="text-button primary" onClick={onConfirm}>
          {confirmLabel || "确认"}
        </button>
      </div>
    </Modal>
  );
}

function InfoModal({ title, message, onClose }: { title: string; message: string; onClose: () => void }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="confirm-message">{message}</p>
      <div className="confirm-actions">
        <button className="text-button primary" onClick={onClose}>好的</button>
      </div>
    </Modal>
  );
}

function ProfileModal({ onClose }: { onClose: () => void }) {
  const { currentUser, setCurrentUser, refresh } = useNotebook();
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [newAvatarColor, setNewAvatarColor] = useState(currentUser?.avatarColor || "#dbeafe");

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

  async function saveAvatarColor() {
    if (newAvatarColor === currentUser?.avatarColor) {
      setEditingAvatar(false);
      return;
    }
    setBusy(true);
    try {
      const user = await api.request<User>("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({ avatarColor: newAvatarColor }),
      });
      setCurrentUser(user);
      setEditingAvatar(false);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "修改失败");
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
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }
    await finishAuth("/api/auth/register", { username, password, name });
  }

  function switchAuthMode(mode: AuthMode) {
    setAuthMode(mode);
    setError("");
    setConfirmPassword("");
  }

  function logout() {
    setCurrentUser(null);
  }

  async function saveName() {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === currentUser?.name) {
      setEditingName(false);
      return;
    }
    setBusy(true);
    try {
      const user = await api.request<User>("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({ name: trimmed }),
      });
      setCurrentUser(user);
      setEditingName(false);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "修改失败");
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    setError("");
    if (!oldPassword || !newPassword) {
      setError("请填写原密码和新密码");
      return;
    }
    if (newPassword === oldPassword) {
      setError("新密码不能与原密码相同");
      return;
    }
    setBusy(true);
    try {
      await api.request<User>("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      setChangingPassword(false);
      setOldPassword("");
      setNewPassword("");
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "修改失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={currentUser ? "用户中心" : authMode === "login" ? "登录账户" : "注册账户"}
      subtitle={currentUser ? "当前使用本地会话。" : "可注册新用户，也可一键进入访客演示数据。"}
      onClose={onClose}
    >
      {currentUser ? (
        <div className="profile-card">
          <span
            className="profile-avatar"
            style={{ backgroundColor: editingAvatar ? newAvatarColor : currentUser.avatarColor }}
            onClick={() => { setEditingAvatar(true); setNewAvatarColor(currentUser.avatarColor); }}
            title="点击更换头像颜色"
          >
            {(editingName ? newName : currentUser.name).slice(0, 1)}
          </span>
          <div>
            {editingName ? (
              <div className="profile-name-edit">
                <input
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") saveName();
                    if (event.key === "Escape") setEditingName(false);
                  }}
                  autoFocus
                  maxLength={16}
                />
                <button className="icon-button todo-confirm-button" onClick={saveName} disabled={busy}>
                  <Check size={16} />
                </button>
                <button className="icon-button" onClick={() => setEditingName(false)}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <strong>
                {currentUser.name}
                <button
                  className="icon-button"
                  onClick={() => { setEditingName(true); setNewName(currentUser.name); }}
                  aria-label="编辑昵称"
                >
                  <Pencil size={14} />
                </button>
              </strong>
            )}
            <p>{currentUser.username ? `@${currentUser.username}` : ""}</p>
          </div>
          {editingAvatar && (
            <div className="avatar-color-grid">
              {avatarColorChoices.map((c) => (
                <button
                  key={c}
                  className={`avatar-color-swatch${newAvatarColor === c ? " active" : ""}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setNewAvatarColor(c)}
                />
              ))}
              <div className="avatar-color-actions">
                <button className="icon-button todo-confirm-button" onClick={saveAvatarColor} disabled={busy}>
                  <Check size={14} />
                </button>
                <button className="icon-button" onClick={() => setEditingAvatar(false)}>
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
          {currentUser.username && (
            changingPassword ? (
              <div className="profile-password-edit">
                <input
                  type="password"
                  placeholder="原密码"
                  value={oldPassword}
                  onChange={(event) => setOldPassword(event.target.value)}
                  autoComplete="current-password"
                />
                <input
                  type="password"
                  placeholder="新密码"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                />
                <div className="profile-password-actions">
                  <button className="text-button" onClick={changePassword} disabled={busy}>
                    <Check size={14} />
                    确认修改
                  </button>
                  <button className="text-button" onClick={() => { setChangingPassword(false); setError(""); setOldPassword(""); setNewPassword(""); }}>
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <button className="text-button" onClick={() => setChangingPassword(true)}>
                <Settings size={16} />
                修改密码
              </button>
            )
          )}
          {error && <p className="auth-error">{error}</p>}
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
              onClick={() => switchAuthMode("login")}
            >
              登录
            </button>
            <button
              className={authMode === "register" ? "selected" : ""}
              onClick={() => switchAuthMode("register")}
            >
              注册
            </button>
          </div>
          <form key={authMode} className="auth-form" onSubmit={submitAuth}>
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
              placeholder="用户名"
              autoComplete="username"
            />
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="密码"
              type="password"
              autoComplete={authMode === "login" ? "current-password" : "new-password"}
            />
            {authMode === "register" && (
              <input
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="确认密码"
                type="password"
                autoComplete="new-password"
              />
            )}
            {error && <p className="auth-error">{error}</p>}
            <button className="guest-login-button" type="submit" disabled={busy}>
              <LogIn size={18} />
              {authMode === "login" ? "登录" : "注册并登录"}
            </button>
          </form>
          {authMode === "register" && (
            <ul className="auth-requirements">
              <li>用户名：3-8 位数字或字母，注册后不可修改</li>
              <li>密码：3-16 位数字/字母/@，不能纯数字</li>
            </ul>
          )}
          {authMode === "login" && (
            <button className="guest-link-button" onClick={loginAsGuest} disabled={busy}>
              访客一键登录演示数据
            </button>
          )}
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

const tagColorChoices = [
  "#dbeafe", "#dcfce7", "#fef3c7", "#f3e8ff",
  "#ffe4e6", "#e0f2fe", "#fce7f3", "#d1fae5",
];

const avatarColorChoices = [
  "#dbeafe", "#dcfce7", "#fef3c7", "#f3e8ff",
  "#ffe4e6", "#e0f2fe", "#fce7f3", "#d1fae5",
  "#1f6bd8", "#197458", "#a86f17", "#c23f48",
];

function NewTagModal({ onClose }: { onClose: () => void }) {
  const { refresh } = useNotebook();
  const [name, setName] = useState("");
  const [color, setColor] = useState(tagColorChoices[0]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError("请输入标签名称");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.request<Tag>("/api/tags", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), color }),
      });
      await refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="新建标签" subtitle="为笔记和待办创建分类标签。" onClose={onClose}>
      <form className="auth-form" onSubmit={submit}>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="标签名称"
          autoFocus
        />
        <div className="tag-color-grid">
          {tagColorChoices.map((c) => (
            <button
              key={c}
              type="button"
              className={`tag-color-swatch ${color === c ? "active" : ""}`}
              onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              aria-label={`color ${c}`}
            />
          ))}
        </div>
        {error && <p className="auth-error">{error}</p>}
        <button className="guest-login-button" type="submit" disabled={busy}>
          <Plus size={18} />
          创建标签
        </button>
      </form>
    </Modal>
  );
}

function TemplateModal({ onClose, onSelect }: { onClose: () => void; onSelect: (tpl: NoteTemplate) => void }) {
  return (
    <Modal title="选择模板" subtitle="从预设模板新建笔记，或创建空白笔记。" onClose={onClose}>
      <div className="template-grid">
        {noteTemplates.map((tpl) => (
          <button key={tpl.id} className="template-card" onClick={() => onSelect(tpl)}>
            <FileText size={20} />
            <span>{tpl.label}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function Sidebar({ onOpenModal }: { onOpenModal: (modal: Exclude<ModalMode, null>) => void }) {
  const { tags, activeTagId, setActiveTagId, currentUser, refresh } = useNotebook();
  const [deleting, setDeleting] = useState(false);

  async function deleteTag(tagId: string, tagName: string) {
    if (!confirm(`确定删除标签「${tagName}」吗？关联的待办将取消标签，笔记将移除该标签。`)) return;
    try {
      await api.request(`/api/tags/${tagId}`, { method: "DELETE" });
      if (activeTagId === tagId) setActiveTagId("");
      await refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败");
    }
  }

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
          <div key={tag.id} className={`tag-filter-wrap ${deleting ? "can-delete" : ""}`}>
            <button
              className={`tag-filter ${activeTagId === tag.id ? "active" : ""}`}
              onClick={() => setActiveTagId(tag.id)}
              title={deleting ? `点击删除「${tag.name}」` : undefined}
            >
              <span className="tag-dot" style={{ backgroundColor: tag.color }} />
              <span className="tag-label">{tag.name}</span>
            </button>
            {deleting && (
              <button
                className="tag-delete-btn"
                onClick={(event) => {
                  event.stopPropagation();
                  deleteTag(tag.id, tag.name);
                }}
                aria-label={`删除 ${tag.name}`}
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}
        <button className="tag-filter muted" onClick={() => onOpenModal("newtag")}>
          <span className="tag-dot plus-dot">+</span>
          <span className="tag-label">新建标签</span>
        </button>
        {tags.length > 0 && (
          <button
            className={`tag-filter muted${deleting ? " active" : ""}`}
            onClick={() => setDeleting(!deleting)}
          >
            <span className="tag-dot minus-dot">−</span>
            <span className="tag-label">{deleting ? "完成删除" : "删除标签"}</span>
          </button>
        )}
      </nav>
      <button className="settings-button" aria-label="settings" onClick={() => onOpenModal("settings")}>
        <Settings size={18} />
      </button>
    </aside>
  );
}

function Header() {
  const { mode, setMode, search, setSearch, refresh } = useNotebook();

  function doSearch() {
    refresh();
  }

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
      <div className="search-row">
        <label className="search-box">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && doSearch()}
            placeholder={mode === "todo" ? "搜索 TODO..." : "搜索文本..."}
          />
        </label>
        <button className="search-button" onClick={doSearch} aria-label="搜索">
          <Search size={18} />
          搜索
        </button>
      </div>
    </header>
  );
}

function TodoView() {
  const { todos, tags, refresh, pendingEditId, setPendingEditId, search, activeTagId } = useNotebook();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTagId, setEditTagId] = useState("");
  const [editDueDate, setEditDueDate] = useState("");

  useEffect(() => {
    if (!pendingEditId) return;
    const todo = todos.find((t) => t.id === pendingEditId);
    if (todo) {
      startEdit(todo);
      setPendingEditId(null);
    }
  }, [pendingEditId, todos, setPendingEditId]);

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

  function startEdit(todo: Todo) {
    setEditingId(todo.id);
    setEditTitle(todo.title);
    setEditTagId(todo.tagId || "");
    setEditDueDate(todo.dueDate || "");
  }

  async function saveEdit(id: string) {
    if (!editTitle.trim()) return;
    await api.request<Todo>(`/api/todos/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: editTitle,
        tagId: editTagId || null,
        dueDate: editDueDate || null,
      }),
    });
    setEditingId(null);
    await refresh();
  }

  return (
    <section className="todo-panel">
      {todos.length > 0 ? (
        <div className="todo-list">
          <div className="todo-header">
            <span />
            <span>TODO</span>
            <span>标签</span>
            <span>截止日期</span>
            <span>操作</span>
          </div>
          {todos.map((todo) =>
          editingId === todo.id ? (
            <article key={todo.id} className="todo-row editing">
              <input
                className="todo-edit-input"
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && saveEdit(todo.id)}
                autoFocus
              />
              <select
                className="todo-edit-select"
                value={editTagId}
                onChange={(event) => setEditTagId(event.target.value)}
              >
                <option value="">无标签</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
              <input
                className="todo-edit-date"
                type="date"
                value={editDueDate}
                onChange={(event) => setEditDueDate(event.target.value)}
              />
              <div className="todo-edit-actions">
                <button
                  className="icon-button todo-confirm-button"
                  onClick={() => saveEdit(todo.id)}
                  aria-label="保存"
                >
                  <Check size={16} />
                </button>
                <button
                  className="icon-button"
                  onClick={() => setEditingId(null)}
                  aria-label="取消"
                >
                  <X size={16} />
                </button>
              </div>
            </article>
          ) : (
            <article key={todo.id} className={`todo-row ${todo.completed ? "done" : ""}`}>
              <button className="check-button" onClick={() => updateTodo(todo, !todo.completed)}>
                {todo.completed && <Check size={14} />}
              </button>
              <strong onDoubleClick={() => startEdit(todo)}>{todo.title}</strong>
              <span
                className="pill-slot"
                style={todo.tagName ? { backgroundColor: todo.tagColor || "#e5e7eb" } : undefined}
              >
                {todo.tagName || ""}
              </span>
              <time>{formatDate(todo.dueDate)}</time>
              <div className="todo-actions">
                <button className="icon-button" onClick={() => startEdit(todo)}>
                  <Pencil size={14} />
                </button>
                <button className="icon-button danger" onClick={() => removeTodo(todo.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          )
        )}
        </div>
      ) : (
        <div className="empty-state">
          {search ? "没有找到匹配的待办" : activeTagId ? "该标签下没有待办" : "暂无待办，点击 + 创建"}
        </div>
      )}
    </section>
  );
}

function NotesView() {
  const { notes, setSelectedNote, currentUser, search, activeTagId } = useNotebook();

  return (
    <section className="notes-panel">
      {notes.length > 0 ? (
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
      ) : (
        <div className="empty-state">
          {search ? "没有找到匹配的笔记" : activeTagId ? "该标签下没有笔记" : "暂无笔记，点击 + 创建"}
        </div>
      )}
    </section>
  );
}

function Editor() {
  const { selectedNote, setSelectedNote, tags, refresh } = useNotebook();
  const [title, setTitle] = useState(selectedNote?.title || "");
  const [content, setContent] = useState(selectedNote?.content || "");
  const [summary, setSummary] = useState(selectedNote?.summary || "");
  const [tagIds, setTagIds] = useState<string[]>(selectedNote?.tags.map((tag) => tag.id) || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [confirmState, setConfirmState] = useState<"close" | null>(null);
  const [infoState, setInfoState] = useState<string | null>(null);
  const [showNewTag, setShowNewTag] = useState(false);
  const [quickTagName, setQuickTagName] = useState("");
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitle(selectedNote?.title || "");
    setContent(selectedNote?.content || "");
    setSummary(selectedNote?.summary || "");
    setTagIds(selectedNote?.tags.map((tag) => tag.id) || []);
    setError("");
    setToast("");
  }, [selectedNote]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    }
    if (showMoreMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMoreMenu]);

  if (!selectedNote) return null;

  const isDirty =
    title !== (selectedNote.title || "") ||
    content !== (selectedNote.content || "") ||
    tagIds.join(",") !== (selectedNote.tags.map((t) => t.id).join(",") || "");

  async function saveNote() {
    setSaving(true);
    setError("");
    try {
      const note = await api.request<Note>(`/api/notes/${selectedNote!.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title, content, summary, tagIds }),
      });
      setSelectedNote(note);
      await refresh();
      setToast("已保存");
      setTimeout(() => setToast(""), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function tryClose() {
    if (!isDirty) {
      setSelectedNote(null);
      return;
    }
    setConfirmState("close");
  }

  async function handleConfirmClose() {
    setConfirmState(null);
    await saveNote();
    setSelectedNote(null);
  }

  function handleCancelClose() {
    setConfirmState(null);
    setSelectedNote(null);
  }

  async function deleteTag(tagId: string, tagName: string) {
    if (!confirm(`确定删除标签「${tagName}」吗？关联的待办将取消标签，笔记将移除该标签。`)) return;
    try {
      await api.request(`/api/tags/${tagId}`, { method: "DELETE" });
      setTagIds((current) => current.filter((id) => id !== tagId));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  }

  async function quickCreateTag() {
    const trimmed = quickTagName.trim();
    if (!trimmed) return;
    try {
      const tag = await api.request<Tag>("/api/tags", {
        method: "POST",
        body: JSON.stringify({ name: trimmed, color: "#dbeafe" }),
      });
      await refresh();
      setTagIds((current) => [...current, tag.id]);
      setQuickTagName("");
      setShowNewTag(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建标签失败");
    }
  }

  async function summarize() {
    setError("");
    try {
      const payload = await api.request<{ summary: string }>(`/api/notes/${selectedNote!.id}/summarize`, {
        method: "POST",
      });
      setSummary(payload.summary);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "总结失败");
    }
  }

  async function deleteNote() {
    setError("");
    try {
      await api.request(`/api/notes/${selectedNote!.id}`, { method: "DELETE" });
      setSelectedNote(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  }

  function getWordCount() {
    const text = content.replace(/[#>*_`-]/g, "").trim();
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = text.replace(/[\u4e00-\u9fa5]/g, " ").split(/\s+/).filter(Boolean).length;
    return `中文字符：${chineseChars}，英文单词：${englishWords}，总字符数：${content.length}`;
  }

  function exportMarkdown() {
    const blob = new Blob([`# ${title}\n\n${content}`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "未命名笔记"}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setShowMoreMenu(false);
  }

  function copyContent() {
    navigator.clipboard.writeText(content).then(() => {
      alert("内容已复制到剪贴板");
      setShowMoreMenu(false);
    }).catch(() => {
      alert("复制失败");
    });
  }

  return (
    <div className="modal-backdrop editor-backdrop" role="presentation" onMouseDown={tryClose}>
      <main className="editor-shell" onMouseDown={(event) => event.stopPropagation()}>
      <header className="editor-header">
        <button className="icon-button" onClick={tryClose}>
          <ArrowLeft size={20} />
        </button>
        <input className="title-input" value={title} onChange={(event) => setTitle(event.target.value)} />
        <button className={`text-button${isDirty ? " save-dirty" : ""}`} onClick={saveNote} disabled={saving || !isDirty}>
          <Save size={16} />
          {saving ? "保存中…" : isDirty ? "保存" : "已保存"}
        </button>
        <button className="icon-button danger" onClick={deleteNote}>
          <Trash2 size={18} />
        </button>
        <div className="more-menu-wrapper" ref={moreMenuRef}>
          <button className="icon-button" aria-label="更多" onClick={() => setShowMoreMenu(!showMoreMenu)}>
            <MoreVertical size={18} />
          </button>
          {showMoreMenu && (
            <div className="more-menu-dropdown">
              <button onClick={() => { setInfoState(getWordCount()); setShowMoreMenu(false); }}>
                <FileText size={16} />
                字数统计
              </button>
              <button onClick={exportMarkdown}>
                <Download size={16} />
                导出 Markdown
              </button>
              <button onClick={copyContent}>
                <ClipboardCopy size={16} />
                复制内容
              </button>
            </div>
          )}
        </div>
      </header>
      {error && <div className="editor-error">{error}</div>}
      <div className="editor-tags">
        {tags.map((tag) => (
          <label
            key={tag.id}
            className="tag-checkbox"
          >
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
        {showNewTag ? (
          <div className="editor-quick-tag">
            <input
              value={quickTagName}
              onChange={(event) => setQuickTagName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") quickCreateTag();
                if (event.key === "Escape") { setShowNewTag(false); setQuickTagName(""); }
              }}
              placeholder="标签名"
              autoFocus
              maxLength={12}
            />
            <button className="icon-button todo-confirm-button" onClick={quickCreateTag}>
              <Check size={14} />
            </button>
            <button className="icon-button" onClick={() => { setShowNewTag(false); setQuickTagName(""); }}>
              <X size={14} />
            </button>
          </div>
        ) : (
          <button className="editor-add-tag" onClick={() => setShowNewTag(true)}>
            <Plus size={14} />
          </button>
        )}
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
      {toast && <div className="editor-toast">{toast}</div>}
      {confirmState === "close" && (
        <ConfirmModal
          title="未保存的更改"
          message="笔记尚未保存，是否保存后再退出？"
          confirmLabel="保存并退出"
          cancelLabel="不保存并退出"
          onConfirm={handleConfirmClose}
          onCancel={handleCancelClose}
          onDismiss={() => setConfirmState(null)}
        />
      )}
      {infoState !== null && (
        <InfoModal title="字数统计" message={infoState} onClose={() => setInfoState(null)} />
      )}
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
      const todo = await api.request<Todo>("/api/todos", {
        method: "POST",
        body: JSON.stringify({
          title: "新的待办",
          tagId: null,
        }),
      });
      await refresh();
      const store = useNotebook.getState();
      store.setActiveTagId("");
      store.setPendingEditId(todo.id);
      return;
    }
    setActiveModal("template");
  }

  async function createNoteFromTemplate(tpl: NoteTemplate) {
    setActiveModal(null);
    const note = await api.request<Note>("/api/notes", {
      method: "POST",
      body: JSON.stringify({
        title: tpl.title,
        content: tpl.content,
        tagIds: [],
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
      {activeModal === "newtag" && <NewTagModal onClose={() => setActiveModal(null)} />}
      {activeModal === "template" && <TemplateModal onClose={() => setActiveModal(null)} onSelect={createNoteFromTemplate} />}
      {selectedNote && <Editor />}
    </main>
  );
}
