import { ChevronLeft, Plus } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CredentialRow } from '../components/project/CredentialRow';
import { JournalEntryRow } from '../components/project/JournalEntryRow';
import { StackTag } from '../components/project/StackTag';
import { StatusBadge } from '../components/project/StatusBadge';
import { TodoItem } from '../components/project/TodoItem';
import { FilterChip } from '../components/ui/FilterChip';
import { useCredentials } from '../hooks/useCredentials';
import { useJournal } from '../hooks/useJournal';
import { useProject } from '../hooks/useProject';
import { useTodos } from '../hooks/useTodos';
import type { ProjectStatus } from '../lib/types';
import styles from './ProjectDetail.module.css';

type Tab = 'overview' | 'stack' | 'credentials' | 'journal' | 'todos' | 'ideas';

const TABS: { value: Tab; label: string }[] = [
  { value: 'overview', label: 'Aperçu' },
  { value: 'stack', label: 'Stack' },
  { value: 'todos', label: 'Tâches' },
  { value: 'credentials', label: 'Identifiants' },
  { value: 'journal', label: 'Journal' },
  { value: 'ideas', label: 'Idées' },
];

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'idea', label: 'Idea' },
  { value: 'abandoned', label: 'Abandoned' },
];

export default function ProjectDetail() {
  const { id } = useParams();
  const { project, loading, error, save } = useProject(id);
  const journal = useJournal(id);
  const todos = useTodos(id);
  const [tab, setTab] = useState<Tab>('overview');
  const [mountTime] = useState(() => Date.now());
  const pendingTodos = todos.todos.filter((t) => !t.completed).length;

  if (loading) return <p className={styles.state}>Chargement…</p>;
  if (error) return <p className={styles.state}>Erreur : {error}</p>;
  if (!project) return <p className={styles.state}>Projet introuvable.</p>;

  const daysActive = Math.max(
    1,
    Math.floor(
      (mountTime - new Date(project.created_at).getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link to="/" className={styles.back}>
          <ChevronLeft size={18} strokeWidth={1.5} /> Projets
        </Link>
      </div>

      <div className={styles.hero}>
        <div className={styles.headerBlock}>
          <StatusBadge status={project.status} />
          <h1 className={styles.title}>{project.name}</h1>
          {project.description && (
            <p className={styles.description}>{project.description}</p>
          )}
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Entrées</span>
            <span className={styles.statValue}>{journal.entries.length}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Actif depuis</span>
            <span className={styles.statValue}>{daysActive}j</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>MRR</span>
            <span className={styles.statValue}>—</span>
          </div>
        </div>
      </div>

      <div className={styles.tabBarWrap}>
        <div className={styles.tabBar}>
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`${styles.tab} ${tab === t.value ? styles.tabActive : ''}`}
              onClick={() => setTab(t.value)}
            >
              {t.label}
              {t.value === 'todos' && pendingTodos > 0 && (
                <span className={styles.tabBadge}>{pendingTodos}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.content}>
      {tab === 'overview' && (
        <OverviewPanel
          initial={{
            name: project.name,
            description: project.description ?? '',
            status: project.status,
          }}
          onSave={async ({ name, description, status }) => {
            await save({
              name,
              description: description.trim() ? description : null,
              status,
            });
          }}
        />
      )}
      {tab === 'stack' && (
        <StackPanel
          stack={project.stack}
          onChange={async (stack) => {
            await save({ stack });
          }}
        />
      )}
      {tab === 'credentials' && <CredentialsPanel projectId={project.id} />}
      {tab === 'todos' && (
        <TodosPanel
          todos={todos.todos}
          loading={todos.loading}
          onAdd={todos.insertTodo}
          onToggle={todos.toggleTodo}
          onDelete={todos.deleteTodo}
          onUpdate={todos.updateTodo}
        />
      )}
      {tab === 'journal' && (
        <JournalPanel
          projectId={project.id}
          entries={journal.entries}
          loading={journal.loading}
          onDelete={journal.deleteEntry}
          onUpdate={journal.updateEntry}
        />
      )}
      {tab === 'ideas' && (
        <IdeasPanel
          projectId={project.id}
          entries={journal.entries}
          loading={journal.loading}
          onCreate={journal.insertEntry}
          onDelete={journal.deleteEntry}
          onUpdate={journal.updateEntry}
        />
      )}
      </div>
    </div>
  );
}

function TodosPanel({
  todos,
  loading,
  onAdd,
  onToggle,
  onDelete,
  onUpdate,
}: {
  todos: ReturnType<typeof useTodos>['todos'];
  loading: boolean;
  onAdd: (text: string) => Promise<unknown>;
  onToggle: (id: string, completed: boolean) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onUpdate: (id: string, text: string) => Promise<boolean>;
}) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const v = value.trim();
    if (!v || busy) return;
    setBusy(true);
    try {
      const created = await onAdd(v);
      if (created) setValue('');
    } finally {
      setBusy(false);
    }
  }

  const pending = todos.filter((t) => !t.completed);
  const done = todos.filter((t) => t.completed);

  return (
    <div className={styles.panel}>
      <form onSubmit={onSubmit}>
        <input
          className={styles.todoInput}
          placeholder="Ajouter une tâche…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={busy}
        />
      </form>

      {loading && <p className={styles.state}>Chargement…</p>}
      {!loading && todos.length === 0 && (
        <p className={styles.state}>Aucune tâche.</p>
      )}

      {pending.length > 0 && (
        <div className={styles.list}>
          {pending.map((t) => (
            <TodoItem
              key={t.id}
              todo={t}
              onToggle={onToggle}
              onDelete={onDelete}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}

      {done.length > 0 && (
        <>
          <span className={styles.label}>Terminées ({done.length})</span>
          <div className={styles.list}>
            {done.map((t) => (
              <TodoItem
              key={t.id}
              todo={t}
              onToggle={onToggle}
              onDelete={onDelete}
              onUpdate={onUpdate}
            />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface OverviewInitial {
  name: string;
  description: string;
  status: ProjectStatus;
}

function OverviewPanel({
  initial,
  onSave,
}: {
  initial: OverviewInitial;
  onSave: (values: OverviewInitial) => Promise<void>;
}) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [status, setStatus] = useState<ProjectStatus>(initial.status);
  const [busy, setBusy] = useState(false);

  const dirty = useMemo(
    () =>
      name !== initial.name ||
      description !== initial.description ||
      status !== initial.status,
    [name, description, status, initial]
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!dirty || !name.trim()) return;
    setBusy(true);
    try {
      await onSave({ name: name.trim(), description, status });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.panel} onSubmit={onSubmit}>
      <label className={styles.label}>Nom</label>
      <input
        className={styles.input}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <label className={styles.label}>Description</label>
      <textarea
        className={styles.textarea}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <label className={styles.label}>Statut</label>
      <div className={styles.statusGroup}>
        {STATUS_OPTIONS.map((opt) => (
          <FilterChip
            key={opt.value}
            active={status === opt.value}
            onClick={() => setStatus(opt.value)}
          >
            {opt.label}
          </FilterChip>
        ))}
      </div>

      <div className={styles.saveBar}>
        <button
          type="submit"
          className={styles.saveBtn}
          disabled={!dirty || !name.trim() || busy}
        >
          {busy ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
      </div>
    </form>
  );
}

function StackPanel({
  stack,
  onChange,
}: {
  stack: string[];
  onChange: (next: string[]) => Promise<void>;
}) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  async function add(e: FormEvent) {
    e.preventDefault();
    const v = value.trim();
    if (!v || stack.includes(v)) {
      setValue('');
      return;
    }
    setBusy(true);
    try {
      await onChange([...stack, v]);
      setValue('');
    } finally {
      setBusy(false);
    }
  }

  async function remove(label: string) {
    setBusy(true);
    try {
      await onChange(stack.filter((s) => s !== label));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.panel}>
      <label className={styles.label}>Stack</label>
      <div className={styles.stackRow}>
        {stack.map((s) => (
          <StackTag key={s} label={s} onRemove={() => void remove(s)} />
        ))}
        <form onSubmit={add}>
          <input
            className={styles.stackAdd}
            placeholder="ajouter (entrée)"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={busy}
          />
        </form>
      </div>
    </div>
  );
}

function CredentialsPanel({ projectId }: { projectId: string }) {
  const { credentials, loading, insertCredential, updateCredential, deleteCredential } =
    useCredentials(projectId);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className={styles.panel}>
      <div className={styles.tabHead}>
        <span className={styles.tabHeadLabel}>Identifiants</span>
        <button type="button" className={styles.addBtn} onClick={() => setModalOpen(true)}>
          <Plus size={14} strokeWidth={1.8} /> Ajouter
        </button>
      </div>

      {loading && <p className={styles.state}>Chargement…</p>}
      {!loading && credentials.length === 0 && (
        <p className={styles.state}>Aucun identifiant.</p>
      )}

      <div className={styles.list}>
        {credentials.map((c) => (
          <CredentialRow
            key={c.id}
            credential={c}
            onDelete={deleteCredential}
            onUpdate={updateCredential}
          />
        ))}
      </div>

      {modalOpen && (
        <CredentialModal
          onClose={() => setModalOpen(false)}
          onCreate={async (input) => {
            const cred = await insertCredential({ project_id: projectId, ...input });
            if (cred) setModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

interface CredentialFormValues {
  service: string;
  login: string;
  url: string;
  notes: string;
}

function CredentialModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (values: {
    service: string;
    login: string | null;
    url: string | null;
    notes: string | null;
  }) => Promise<void>;
}) {
  const [values, setValues] = useState<CredentialFormValues>({
    service: '',
    login: '',
    url: '',
    notes: '',
  });
  const [busy, setBusy] = useState(false);

  function patch<K extends keyof CredentialFormValues>(
    key: K,
    value: CredentialFormValues[K]
  ) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!values.service.trim()) return;
    setBusy(true);
    try {
      await onCreate({
        service: values.service.trim(),
        login: values.login.trim() || null,
        url: values.url.trim() || null,
        notes: values.notes.trim() || null,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <form
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
      >
        <h2 className={styles.modalTitle}>Nouvel identifiant</h2>
        <input
          className={styles.modalInput}
          placeholder="Service (ex: GitHub)"
          value={values.service}
          onChange={(e) => patch('service', e.target.value)}
          autoFocus
          required
        />
        <input
          className={styles.modalInput}
          placeholder="Login"
          value={values.login}
          onChange={(e) => patch('login', e.target.value)}
        />
        <input
          className={styles.modalInput}
          placeholder="URL"
          value={values.url}
          onChange={(e) => patch('url', e.target.value)}
          type="url"
        />
        <textarea
          className={styles.modalTextarea}
          placeholder="Notes"
          value={values.notes}
          onChange={(e) => patch('notes', e.target.value)}
        />
        <div className={styles.modalActions}>
          <button type="button" className={styles.modalSecondary} onClick={onClose}>
            Annuler
          </button>
          <button
            type="submit"
            className={styles.modalPrimary}
            disabled={busy || !values.service.trim()}
          >
            Créer
          </button>
        </div>
      </form>
    </div>
  );
}

function JournalPanel({
  projectId,
  entries,
  loading,
  onDelete,
  onUpdate,
}: {
  projectId: string;
  entries: ReturnType<typeof useJournal>['entries'];
  loading: boolean;
  onDelete: (id: string) => Promise<boolean>;
  onUpdate: ReturnType<typeof useJournal>['updateEntry'];
}) {
  const navigate = useNavigate();
  const filtered = entries.filter((e) => e.type !== 'idea');

  return (
    <div className={styles.panel}>
      <div className={styles.tabHead}>
        <span className={styles.tabHeadLabel}>Journal</span>
        <button
          type="button"
          className={styles.addBtn}
          onClick={() => navigate(`/journal/new?projectId=${projectId}`)}
        >
          <Plus size={14} strokeWidth={1.8} /> Nouvelle
        </button>
      </div>

      {loading && <p className={styles.state}>Chargement…</p>}
      {!loading && filtered.length === 0 && (
        <p className={styles.state}>Aucune entrée.</p>
      )}

      <div className={styles.list}>
        {filtered.map((e) => (
          <JournalEntryRow
            key={e.id}
            entry={e}
            onDelete={onDelete}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </div>
  );
}

function IdeasPanel({
  projectId,
  entries,
  loading,
  onCreate,
  onDelete,
  onUpdate,
}: {
  projectId: string;
  entries: ReturnType<typeof useJournal>['entries'];
  loading: boolean;
  onCreate: ReturnType<typeof useJournal>['insertEntry'];
  onDelete: (id: string) => Promise<boolean>;
  onUpdate: ReturnType<typeof useJournal>['updateEntry'];
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const ideas = entries.filter((e) => e.type === 'idea');

  return (
    <div className={styles.panel}>
      <div className={styles.tabHead}>
        <span className={styles.tabHeadLabel}>Idées</span>
        <button
          type="button"
          className={styles.addBtn}
          onClick={() => setModalOpen(true)}
        >
          <Plus size={14} strokeWidth={1.8} /> Ajouter
        </button>
      </div>

      {loading && <p className={styles.state}>Chargement…</p>}
      {!loading && ideas.length === 0 && (
        <p className={styles.state}>Aucune idée pour ce projet.</p>
      )}

      <div className={styles.list}>
        {ideas.map((e) => (
          <JournalEntryRow
            key={e.id}
            entry={e}
            onDelete={onDelete}
            onUpdate={onUpdate}
          />
        ))}
      </div>

      {modalOpen && (
        <QuickIdeaModal
          onClose={() => setModalOpen(false)}
          onSubmit={async (body) => {
            const created = await onCreate({
              project_id: projectId,
              type: 'idea',
              body,
              title: null,
              tags: [],
            });
            if (created) setModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function QuickIdeaModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (body: string) => Promise<void>;
}) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const v = body.trim();
    if (!v) return;
    setBusy(true);
    try {
      await onSubmit(v);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <form
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2 className={styles.modalTitle}>Nouvelle idée</h2>
        <textarea
          className={styles.modalTextarea}
          placeholder="Ton idée…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          autoFocus
          required
        />
        <div className={styles.modalActions}>
          <button type="button" className={styles.modalSecondary} onClick={onClose}>
            Annuler
          </button>
          <button
            type="submit"
            className={styles.modalPrimary}
            disabled={busy || !body.trim()}
          >
            {busy ? '…' : 'Créer'}
          </button>
        </div>
      </form>
    </div>
  );
}
