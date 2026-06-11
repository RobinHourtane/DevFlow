import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Circle, ChevronDown, ChevronUp, ListChecks } from 'lucide-react';
import { format, isToday, isPast, startOfDay, differenceInCalendarDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import PageHeader from '../components/devflow/PageHeader';
import api from '../lib/api';
import {
  TASK_PRIORITY_LABEL, TASK_PRIORITY_COLOR,
  TASK_STATUS_CFG as STATUS_CFG,
} from '../lib/constants';

// ─── Constantes ──────────────────────────────────────────────────────────────
const PRIORITY_CFG = Object.fromEntries(
  Object.keys(TASK_PRIORITY_LABEL).map(k => [k, { label: TASK_PRIORITY_LABEL[k], color: TASK_PRIORITY_COLOR[k] }])
);
const PROJECT_DOT_COLORS = ['var(--accent)', '#22c55e', '#eab308', '#ef4444', '#a855f7', '#06b6d4', '#f97316', '#ec4899'];
const dotColor = (id) => PROJECT_DOT_COLORS[id % PROJECT_DOT_COLORS.length];

// ─── Regroupement façon "Mes tâches" Asana ───────────────────────────────────
function groupTasks(tasks) {
  const groups = {
    late:  { title: 'En retard',              items: [] },
    today: { title: "À faire aujourd'hui",    items: [] },
    week:  { title: 'À faire cette semaine',  items: [] },
    later: { title: 'À faire plus tard',      items: [] },
    done:  { title: 'Terminées',              items: [] },
  };

  for (const t of tasks) {
    if (t.status === 'DONE') { groups.done.items.push(t); continue; }
    if (!t.dueDate)          { groups.later.items.push(t); continue; }

    const due = startOfDay(new Date(t.dueDate));
    if (isPast(due) && !isToday(due))      groups.late.items.push(t);
    else if (isToday(due))                  groups.today.items.push(t);
    else if (differenceInCalendarDays(due, new Date()) <= 7) groups.week.items.push(t);
    else                                     groups.later.items.push(t);
  }
  return groups;
}

const fmtDue = (d) => {
  const date = startOfDay(new Date(d));
  const diff = differenceInCalendarDays(date, startOfDay(new Date()));
  if (diff === 0)  return "Aujourd'hui";
  if (diff === -1) return 'Hier';
  if (diff === 1)  return 'Demain';
  return format(date, 'dd MMM', { locale: fr });
};

// ─── Ligne de tâche ──────────────────────────────────────────────────────────
function TaskRow({ task, onToggle, onNavigate }) {
  const isDone   = task.status === 'DONE';
  const priority = PRIORITY_CFG[task.priority] || PRIORITY_CFG.MEDIUM;
  const status   = STATUS_CFG[task.status]     || STATUS_CFG.TODO;
  const overdue  = !isDone && task.dueDate && isPast(startOfDay(new Date(task.dueDate))) && !isToday(new Date(task.dueDate));

  return (
    <div className="group grid items-center gap-4 px-5 py-3 hover:bg-[var(--hover-1)] transition-colors cursor-pointer"
      style={{ gridTemplateColumns: '1fr 130px 200px 110px 110px', borderBottom: '1px solid var(--bg-1)' }}
      onClick={() => onNavigate(task.project.id)}>

      {/* Nom */}
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={(e) => { e.stopPropagation(); onToggle(task); }}
          className="shrink-0 transition-colors" style={{ color: isDone ? '#22c55e' : 'var(--border-3)' }}>
          {isDone ? <Check size={15} /> : <Circle size={15} />}
        </button>
        <div className="min-w-0">
          <p className={`text-sm truncate ${isDone ? 'line-through text-[var(--text-4)]' : 'text-[var(--text-1)]'}`}>
            {task.title}
          </p>
          {task.phase?.name && (
            <p className="text-xs text-[var(--text-4)] font-mono mt-0.5 truncate">↳ {task.phase.name}</p>
          )}
        </div>
      </div>

      {/* Échéance */}
      <div>
        {task.dueDate ? (
          <span className={`text-xs font-mono ${overdue ? 'text-red-400' : 'text-[var(--text-2)]'}`}>
            {fmtDue(task.dueDate)}
          </span>
        ) : <span className="text-xs text-[var(--text-5)]">—</span>}
      </div>

      {/* Projet */}
      <div className="min-w-0">
        <span className="inline-flex items-center gap-1.5 max-w-full px-2 py-1 text-xs"
          style={{ border: '1px solid var(--border-2)', background: 'var(--bg-1)' }}>
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dotColor(task.project.id) }} />
          <span className="text-[var(--text-1)] truncate">{task.project.name}</span>
        </span>
      </div>

      {/* Priorité */}
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: priority.color }} />
        <span className="text-xs text-[var(--text-2)]">{priority.label}</span>
      </div>

      {/* Statut */}
      <div>
        <span className="label-mono" style={{ color: status.color }}>{status.label}</span>
      </div>
    </div>
  );
}

// ─── Section repliable ───────────────────────────────────────────────────────
function Section({ title, count, items, onToggle, onNavigate, defaultOpen = true, accent }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!items.length) return null;

  return (
    <div style={{ borderBottom: '1px solid var(--border-1)' }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--hover-1)] transition-colors">
        {open ? <ChevronUp size={14} className="text-[var(--text-4)]" /> : <ChevronDown size={14} className="text-[var(--text-4)]" />}
        <span className="text-sm font-semibold" style={{ color: accent || 'var(--text-1)' }}>{title}</span>
        <span className="label-mono">{count}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
            {/* Header de colonnes */}
            <div className="grid items-center gap-4 px-5 py-2"
              style={{ gridTemplateColumns: '1fr 130px 200px 110px 110px', borderTop: '1px solid var(--bg-1)', borderBottom: '1px solid var(--border-1)' }}>
              <span className="label-mono">Nom</span>
              <span className="label-mono">Échéance</span>
              <span className="label-mono">Projet</span>
              <span className="label-mono">Priorité</span>
              <span className="label-mono">Statut</span>
            </div>
            {items.map(task => (
              <TaskRow key={task.id} task={task} onToggle={onToggle} onNavigate={onNavigate} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function MyTasks() {
  const [tasks, setTasks]     = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = () => api.get('/tasks/my').then(({ data }) => setTasks(data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const groups = useMemo(() => groupTasks(tasks), [tasks]);
  const pending = tasks.filter(t => t.status !== 'DONE').length;

  const handleToggle = async (task) => {
    const nextStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));
    try { await api.put(`/tasks/${task.id}`, { status: nextStatus }); }
    catch { load(); }
  };

  const goToProject = (projectId) => navigate(`/projects/${projectId}`);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="label-mono">Chargement...</div>
    </div>
  );

  return (
    <div>
      <PageHeader
        eyebrow="Gestion de projets / Vue personnelle"
        title="Mes tâches"
        description="Toutes les tâches de tous vos projets, regroupées par échéance — comme dans Asana."
        actions={
          <div className="label-mono flex items-center gap-2 px-4 py-2" style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }}>
            <ListChecks size={13} />
            {pending} en cours
          </div>
        }
      />

      {tasks.length === 0 ? (
        <div className="p-10">
          <div className="text-sm text-[var(--text-3)] p-8 text-center" style={{ border: '1px dashed var(--border-2)', borderRadius: '12px' }}>
            Aucune tâche pour l'instant. Crée des tâches depuis la fiche d'un projet — elles apparaîtront ici, triées par échéance.
          </div>
        </div>
      ) : (
        <div>
          <Section title="En retard"             count={groups.late.items.length}  items={groups.late.items}  accent="#ef4444" onToggle={handleToggle} onNavigate={goToProject} />
          <Section title="À faire aujourd'hui"   count={groups.today.items.length} items={groups.today.items} accent="var(--accent)" onToggle={handleToggle} onNavigate={goToProject} />
          <Section title="À faire cette semaine" count={groups.week.items.length}  items={groups.week.items}  onToggle={handleToggle} onNavigate={goToProject} />
          <Section title="À faire plus tard"     count={groups.later.items.length} items={groups.later.items} onToggle={handleToggle} onNavigate={goToProject} />
          <Section title="Terminées"             count={groups.done.items.length}  items={groups.done.items}  defaultOpen={false} accent="#22c55e" onToggle={handleToggle} onNavigate={goToProject} />
        </div>
      )}
    </div>
  );
}
