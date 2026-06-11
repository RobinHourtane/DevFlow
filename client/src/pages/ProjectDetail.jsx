import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowLeft, Plus, Trash2, GripVertical, Check, Circle,
  AlertTriangle, Bot, Loader2, Copy,
  FileText, Layers, Zap, Edit2, X, ExternalLink, HardDrive,
  Code2, Server, Database, Cloud, Euro,
  CheckCircle2, AlertCircle, Sparkles, ChevronDown, ChevronUp, Mail,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../lib/api';
import { PROJECT_TYPE_LABEL as TYPE_LABEL, PROJECT_STATUS_LABEL, TASK_PRIORITY_COLOR as PRIORITY_COLOR } from '../lib/constants';

// ─── Constantes ──────────────────────────────────────────────────────────────
const STATUS_OPTIONS = Object.entries(PROJECT_STATUS_LABEL).map(([value, label]) => ({ value, label }));

const COMPLEXITY_CFG = {
  LOW:    { label: 'Faible',  color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-500/40' },
  MEDIUM: { label: 'Moyenne', color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-500/40'   },
  HIGH:   { label: 'Élevée',  color: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-500/40'     },
};
const RISK_CFG = {
  LOW:    { icon: CheckCircle2,  color: 'text-emerald-400', bg: 'bg-emerald-500/5',  border: 'border-emerald-500/20' },
  MEDIUM: { icon: AlertTriangle, color: 'text-amber-400',   bg: 'bg-amber-500/5',    border: 'border-amber-500/20'   },
  HIGH:   { icon: AlertCircle,   color: 'text-red-400',     bg: 'bg-red-500/5',      border: 'border-red-500/20'     },
};
const fmt = (n) => n?.toLocaleString('fr-FR') ?? '—';

// Convertit un cahier des charges structuré (JSON) en texte brut lisible (pour "Copier")
function specToText(s) {
  const c = s.context || {}, d = s.description || {}, r = s.response || {};
  const L = [];
  const add = (...lines) => L.push(...lines);

  add(s.title || 'Cahier des charges', '');
  add('1. CONTEXTE', '');
  if (c.company)            add('Entreprise / Institution :', c.company, '');
  if (c.existing)           add('Existant :', c.existing, '');
  if (c.objectives?.length) add('Objectifs du projet :', ...c.objectives.map(o => `- ${o}`), '');
  if (c.targetAudience)     add('Public / utilisateurs concernés :', c.targetAudience, '');
  if (c.competitors?.length) add('Concurrence :', ...c.competitors.map(co => `- ${co.name}${co.note ? ` — ${co.note}` : ''}`), '');
  if (c.projectOrganization) add('Organisation du projet :', c.projectOrganization, '');

  add('2. DESCRIPTION DU PROJET', '');
  if (d.deliverables?.length) add('Prestations à la charge du candidat :', ...d.deliverables.map(x => `- ${x}`), '');
  if (d.sitemap?.length)      add('Arborescence :', ...d.sitemap.map(x => `- ${x}`), '');
  if (d.workflow)             add('Workflow fonctionnel :', d.workflow, '');
  if (d.features?.length)     add('Fonctionnalités :', ...d.features.map(f => `- [${f.priority}] ${f.name}${f.description ? ` — ${f.description}` : ''}`), '');
  if (d.thirdPartyIntegrations?.length) add('Interaction avec des systèmes tiers :', ...d.thirdPartyIntegrations.map(x => `- ${x}`), '');
  if (d.technicalEnvironment) add('Environnement technique et accessibilité :', d.technicalEnvironment, '');
  if (d.backOffice?.length)   add('Back-office et administration :', ...d.backOffice.map(x => `- ${x}`), '');
  if (d.methodology)          add(`Méthodologie : ${d.methodology}`, d.methodologyNote || '', '');
  if (d.graphics)             add('Graphisme :', d.graphics, '');
  if (d.contentMigration)     add('Contenus et migration des données :', d.contentMigration, '');
  if (d.statistics)           add('Statistiques :', d.statistics, '');
  if (d.domainName)           add('Nom de domaine :', d.domainName, '');
  if (d.hosting)              add('Hébergement :', d.hosting, '');
  if (d.rights)               add('Droits :', d.rights, '');
  if (d.maintenance)          add('Maintenance / évolutions :', d.maintenance, '');
  if (d.promotion)            add('Promotion du site :', d.promotion, '');
  if (d.budget)               add('Budget :', d.budget, '');

  add('3. ORGANISATION DE LA RÉPONSE', '');
  if (r.expectations?.length) add('Ce que vous attendez :', ...r.expectations.map(x => `- ${x}`), '');
  if (r.planning?.length)     add('Planning de la consultation :', ...r.planning.map((p, i) => `${i + 1}. ${p.step}${p.detail ? ` — ${p.detail}` : ''}`), '');
  if (r.selectionCriteria?.length) add('Critères de sélection :', ...r.selectionCriteria.map(cr => `- ${cr.criterion} (${cr.weight})`), '');
  if (r.contacts)             add('Interlocuteurs :', r.contacts, '');

  return L.join('\n');
}

// Petits blocs d'affichage réutilisés dans le rendu du cahier des charges
const SpecBlock = ({ label, text }) => !text ? null : (
  <div>
    <p className="label-mono mb-1">{label}</p>
    <p className="text-sm text-[var(--text-1)] leading-relaxed">{text}</p>
  </div>
);
const SpecBlockList = ({ label, items, mono }) => !items?.length ? null : (
  <div>
    <p className="label-mono mb-1.5">{label}</p>
    <ul className="space-y-1">
      {items.map((it, i) => (
        <li key={i} className={`text-xs text-[var(--text-2)] flex items-start gap-2 ${mono ? 'font-mono' : ''}`}>
          <span style={{ color: 'var(--accent)' }}>→</span>{it}
        </li>
      ))}
    </ul>
  </div>
);


// ─── SectionCard (collapsible) ───────────────────────────────────────────────
function SectionCard({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[var(--border-2)] bg-[var(--bg-1)] overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[var(--hover-1)] transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-[var(--accent)]/10 border border-[var(--accent)]/20">
            <Icon className="w-3.5 h-3.5 text-[var(--accent)]" />
          </div>
          <span className="text-sm font-semibold text-[var(--text-1)]">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-[var(--text-4)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-4)]" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
            <div className="px-5 pb-5 pt-2 border-t border-[var(--border-2)]">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Composants UI de base ────────────────────────────────────────────────────
const Input = ({ label, ...props }) => (
  <div>
    {label && <label className="label-mono block mb-2">{label}</label>}
    <input {...props}
      className="w-full bg-[var(--bg-0)] text-[var(--text-1)] text-sm px-3 py-2 outline-none focus:border-[var(--accent)] transition-colors placeholder-neutral-700"
      style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }} />
  </div>
);


// ─── Carte tâche draggable ────────────────────────────────────────────────────
function TaskCard({ task, onUpdate, onDelete, highlighted }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });
  const isDone = task.status === 'DONE';
  const [isHighlighted, setIsHighlighted] = useState(!!highlighted);
  useEffect(() => {
    if (!highlighted) return;
    const t = setTimeout(() => setIsHighlighted(false), 2500);
    return () => clearTimeout(t);
  }, [highlighted]);
  return (
    <div ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}>
      <div className="group flex items-start gap-2 px-3 py-2.5 hover:bg-[var(--hover-1)] transition-colors"
        style={{ borderBottom: '1px solid var(--bg-2)', ...(isHighlighted ? { background: 'rgba(0,71,255,0.08)', borderLeft: '2px solid var(--accent)' } : {}) }}>
        <div {...attributes} {...listeners}
          className="mt-0.5 text-[var(--text-5)] cursor-grab opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={e => e.stopPropagation()}>
          <GripVertical size={12} />
        </div>
        <button onClick={() => onUpdate(task.id, { status: isDone ? 'TODO' : 'DONE' })}
          className="mt-0.5 shrink-0 transition-colors"
          style={{ color: isDone ? 'var(--accent)' : 'var(--border-3)' }}>
          {isDone ? <Check size={14} /> : <Circle size={14} />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${isDone ? 'line-through text-[var(--text-4)]' : 'text-[var(--text-1)]'}`}>{task.title}</p>
          {task.dueDate && (
            <p className="font-mono text-xs text-[var(--text-4)] mt-0.5">
              ↳ {format(new Date(task.dueDate), 'dd MMM', { locale: fr })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: PRIORITY_COLOR[task.priority] }} />
          <button onClick={() => onDelete(task.id)} className="text-[var(--text-4)] hover:text-red-400 transition-colors">
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Colonne de phase ─────────────────────────────────────────────────────────
function PhaseColumn({ phase, onAddTask, onUpdateTask, onDeleteTask, onUpdatePhase, onDeletePhase, highlightTaskId }) {
  const [newTask,    setNewTask]    = useState('');
  const [adding,     setAdding]     = useState(false);
  const [editName,   setEditName]   = useState(false);
  const [phaseName,  setPhaseName]  = useState(phase.name);

  const tasks = phase.tasks || [];
  const done  = tasks.filter(t => t.status === 'DONE').length;
  const pct   = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    await onAddTask(phase.id, newTask.trim());
    setNewTask(''); setAdding(false);
  };
  const handleRename = async () => {
    if (phaseName.trim() && phaseName !== phase.name)
      await onUpdatePhase(phase.id, { name: phaseName.trim() });
    setEditName(false);
  };

  return (
    <div className="flex-1 min-w-[200px] max-w-[260px]">
      <div className="px-2 py-3" style={{ borderBottom: '1px solid var(--border-1)' }}>
        <div className="flex items-center justify-between gap-2 mb-2">
          {editName ? (
            <input autoFocus value={phaseName} onChange={e => setPhaseName(e.target.value)}
              onBlur={handleRename} onKeyDown={e => e.key === 'Enter' && handleRename()}
              className="flex-1 bg-transparent text-[var(--text-1)] text-xs outline-none border-b border-[var(--accent)]" />
          ) : (
            <span className="label-mono text-[var(--text-1)] cursor-pointer hover:text-[var(--text-1)] transition-colors truncate"
              onClick={() => setEditName(true)}>{phase.name}</span>
          )}
          <div className="flex items-center gap-1 shrink-0">
            <span className="font-mono text-xs text-[var(--text-4)]">{tasks.length}</span>
            <button onClick={() => onDeletePhase(phase.id)} className="text-[var(--text-5)] hover:text-red-400 transition-colors ml-1">
              <X size={11} />
            </button>
          </div>
        </div>
        {tasks.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-0.5 rounded-full" style={{ background: 'var(--bg-2)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
            </div>
            <span className="font-mono text-xs text-[var(--text-4)]">{pct}%</span>
          </div>
        )}
      </div>
      <div className="overflow-hidden" style={{ background: 'rgba(255,255,255,0.01)' }}>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 && !adding && <div className="px-3 py-4 label-mono text-center">vide</div>}
          {tasks.map(t => (
            <TaskCard key={t.id} task={t} onUpdate={onUpdateTask} onDelete={onDeleteTask} highlighted={t.id === highlightTaskId} />
          ))}
        </SortableContext>
        {adding ? (
          <form onSubmit={handleAddTask} className="px-3 py-2">
            <input autoFocus value={newTask} onChange={e => setNewTask(e.target.value)}
              placeholder="Titre de la tâche..."
              className="w-full bg-[var(--bg-0)] text-[var(--text-1)] text-xs px-3 py-2 outline-none placeholder-neutral-700 mb-1.5"
              style={{ border: '1px solid var(--accent)' }} />
            <div className="flex gap-1.5">
              <button type="submit" className="label-mono px-2 py-1 text-[var(--text-1)]" style={{ background: 'var(--accent)', borderRadius: '8px' }}>Ajouter</button>
              <button type="button" onClick={() => setAdding(false)} className="label-mono px-2 py-1 text-[var(--text-4)] hover:text-[var(--text-1)]">Annuler</button>
            </div>
          </form>
        ) : (
          <button onClick={() => setAdding(true)}
            className="w-full flex items-center gap-2 px-3 py-2.5 label-mono text-[var(--text-5)] hover:text-[var(--text-2)] hover:bg-[var(--hover-1)] transition-colors">
            <Plus size={11} />Ajouter une tâche
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Onglet Aperçu ────────────────────────────────────────────────────────────
function TabOverview({ project, onUpdate, onSwitchToAgents }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: project.name, description: project.description || '',
    budget: project.budget || '',
    startDate: project.startDate ? project.startDate.slice(0, 10) : '',
    endDate:   project.endDate   ? project.endDate.slice(0, 10)   : '',
    status: project.status,
  });

  const totalTasks = project.tasks?.length || 0;
  const doneTasks  = project.tasks?.filter(t => t.status === 'DONE').length || 0;
  const pct        = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const handleSave = async () => { await onUpdate(form); setEditing(false); };

  return (
    <>
    <div className="grid grid-cols-3 gap-px" style={{ background: 'var(--border-1)' }}>
      {/* Infos principales */}
      <div className="col-span-2 bg-[var(--bg-0)] p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl text-[var(--text-1)]">Informations</h2>
          <button onClick={() => setEditing(!editing)}
            className="label-mono hover:text-[var(--text-1)] transition-colors flex items-center gap-1.5">
            <Edit2 size={11} />{editing ? 'Annuler' : 'Modifier'}
          </button>
        </div>

        {editing ? (
          <div className="space-y-4">
            <Input label="Nom du projet" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <div>
              <label className="label-mono block mb-2">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                rows={3} className="w-full bg-[var(--bg-0)] text-[var(--text-1)] text-sm px-3 py-2 outline-none resize-none placeholder-neutral-700"
                style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }} placeholder="Description du projet..." />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Budget (€)" type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} />
              <Input label="Date début"  type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
              <Input label="Date fin"    type="date" value={form.endDate}   onChange={e => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <div>
              <label className="label-mono block mb-2">Statut</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                className="bg-[var(--bg-0)] text-[var(--text-1)] text-sm px-3 py-2 outline-none" style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }}>
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <button onClick={handleSave} className="px-5 py-2 text-sm font-medium text-[var(--text-1)]" style={{ background: 'var(--accent)', borderRadius: '8px' }}>
              Enregistrer
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {project.description && <p className="text-sm text-[var(--text-2)] leading-relaxed">{project.description}</p>}
            <div className="grid grid-cols-2 gap-6">
              {[
                { label: 'Client',    value: project.client?.name || '—' },
                { label: 'Type',      value: TYPE_LABEL[project.type] || '—' },
                { label: 'Budget',    value: project.budget ? `${project.budget.toLocaleString('fr-FR')} €` : '—' },
                { label: 'Début',     value: project.startDate ? format(new Date(project.startDate), 'dd MMM yyyy', { locale: fr }) : '—' },
                { label: 'Livraison', value: project.endDate   ? format(new Date(project.endDate),   'dd MMM yyyy', { locale: fr }) : '—' },
                { label: 'Signé le',  value: project.signedAt  ? format(new Date(project.signedAt),  'dd MMM yyyy', { locale: fr }) : '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="label-mono mb-1">{label}</div>
                  <div className="text-sm text-[var(--text-1)]">{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="bg-[var(--bg-0)] p-8 space-y-6">
        <div>
          <div className="label-mono mb-3">Progression</div>
          <div className="font-display text-4xl text-[var(--text-1)] mb-3">{pct}%</div>
          <div className="h-1 rounded-full" style={{ background: 'var(--bg-2)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
          </div>
          <div className="label-mono mt-2">{doneTasks}/{totalTasks} tâches</div>
        </div>
        <div style={{ borderTop: '1px solid var(--border-1)', paddingTop: '24px' }}>
          <div className="label-mono mb-3">Phases</div>
          <div className="font-display text-4xl text-[var(--text-1)]">{project.phases?.length || 0}</div>
        </div>
        {project.endDate && (
          <div style={{ borderTop: '1px solid var(--border-1)', paddingTop: '24px' }}>
            <div className="label-mono mb-2">Deadline</div>
            <div className="text-sm text-[var(--text-1)]">{format(new Date(project.endDate), 'dd MMMM yyyy', { locale: fr })}</div>
            {new Date(project.endDate) < new Date() && (
              <div className="flex items-center gap-1.5 mt-2">
                <AlertTriangle size={12} className="text-red-400" />
                <span className="label-mono text-red-600">En retard</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {/* ── Données de l'analyse IA ─────────────────────────────────────── */}
    <AiAnalysisSections project={project} onSwitchToAgents={onSwitchToAgents} />
    </>
  );
}

// ─── Sections IA dans l'Aperçu ────────────────────────────────────────────────
function AiAnalysisSections({ project, onSwitchToAgents }) {
  const rawLog  = project.aiLogs?.[0];
  let analysis  = null;
  if (rawLog?.response) { try { analysis = JSON.parse(rawLog.response); } catch { /* réponse IA non-JSON, ignorée */ } }

  if (!analysis) {
    return (
      <div className="mx-8 mb-8 border border-[var(--border-2)] bg-[var(--bg-1)] p-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--bg-2)] border border-[var(--border-2)]">
            <Sparkles size={16} className="text-[var(--text-4)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-1)]">Aucune analyse IA liée à ce projet</p>
            <p className="label-mono mt-0.5">Lance l'analyse dans l'onglet Agents IA pour voir la stack, le budget et les risques ici.</p>
          </div>
        </div>
        <button onClick={onSwitchToAgents}
          className="shrink-0 flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--text-1)]"
          style={{ background: 'var(--accent)', borderRadius: '8px' }}>
          <Sparkles size={14} />Analyser
        </button>
      </div>
    );
  }

  const complexity = COMPLEXITY_CFG[analysis.complexity] || COMPLEXITY_CFG.MEDIUM;
  const totalDays  = analysis.timeline?.totalDays || 1;

  return (
    <div className="px-8 pb-8 space-y-3">
      {/* Bandeau résumé */}
      <div className="border border-[var(--border-2)] bg-[var(--bg-1)] p-5">
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <span className={`px-3 py-1 text-xs font-semibold border ${complexity.color} ${complexity.bg} ${complexity.border}`}>
            Complexité {complexity.label}
          </span>
          <span className="label-mono text-[var(--text-3)]">
            Analysé le {format(new Date(rawLog.createdAt), 'dd MMM yyyy', { locale: fr })}
          </span>
        </div>
        <p className="text-sm text-[var(--text-1)] leading-relaxed mb-4">{analysis.summary}</p>
        <div className="grid grid-cols-4 gap-5 pt-4 border-t border-[var(--border-2)]">
          {[
            { label: 'Budget HT', value: `${fmt(analysis.budget?.totalHT)} €`, sub: `${fmt(analysis.budget?.totalTTC)} € TTC` },
            { label: 'Durée',     value: `${totalDays}j`,                       sub: `${analysis.timeline?.totalWeeks} sem.`   },
            { label: 'TJM',       value: `${fmt(analysis.budget?.dailyRate)} €`, sub: 'taux journalier'                         },
            { label: 'Phases',    value: `${analysis.timeline?.phases?.length || 0}`, sub: `${analysis.risks?.length || 0} risques` },
          ].map(k => (
            <div key={k.label}>
              <p className="label-mono text-[var(--text-3)] mb-0.5">{k.label}</p>
              <p className="font-display text-2xl font-bold text-[var(--text-1)]">{k.value}</p>
              <p className="text-xs text-[var(--text-4)] mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stack + Budget */}
      <div className="grid grid-cols-2 gap-3">
        <SectionCard title="Stack technique" icon={Code2}>
          <div className="space-y-2 mt-2">
            {[
              { key: 'frontend', icon: Code2,    label: 'Frontend'   },
              { key: 'backend',  icon: Server,   label: 'Backend'    },
              { key: 'database', icon: Database, label: 'BDD'        },
              { key: 'hosting',  icon: Cloud,    label: 'Hébergement'},
            ].filter(s => analysis.stack?.[s.key]?.name).map(({ key, icon: Icon, label }) => (
              <div key={key} className="flex items-center gap-2.5 border border-[var(--border-2)] px-3 py-2.5 bg-[var(--bg-1)]">
                <Icon className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                <span className="label-mono text-[var(--text-3)] text-xs w-20 shrink-0">{label}</span>
                <span className="font-mono text-sm font-semibold text-[var(--text-1)]">{analysis.stack[key].name}</span>
                {analysis.stack[key].justification && (
                  <span className="text-xs text-[var(--text-4)] truncate hidden xl:block">— {analysis.stack[key].justification}</span>
                )}
              </div>
            ))}
            {analysis.stack?.tools?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {analysis.stack.tools.map((t, i) => (
                  <span key={i} title={t.purpose}
                    className="px-2 py-0.5 text-xs font-mono border border-[var(--border-3)] text-[var(--text-3)]">
                    {t.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Budget par phase" icon={Euro}>
          <table className="w-full mt-2">
            <tbody className="divide-y divide-neutral-800/60">
              {analysis.budget?.breakdown?.map((item, i) => (
                <tr key={i}>
                  <td className="py-2 text-sm text-[var(--text-1)]">{item.phase}</td>
                  <td className="py-2 text-right font-mono text-xs text-[var(--text-3)]">{item.days}j</td>
                  <td className="py-2 text-right font-mono text-sm font-semibold text-[var(--text-1)]">{fmt(item.amount)} €</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--border-3)]">
                <td className="pt-2 text-sm font-semibold text-[var(--text-2)]">Total HT</td>
                <td className="pt-2 text-right font-mono text-xs text-[var(--text-3)]">{totalDays}j</td>
                <td className="pt-2 text-right font-mono text-base font-bold text-[var(--accent)]">{fmt(analysis.budget?.totalHT)} €</td>
              </tr>
            </tfoot>
          </table>
        </SectionCard>
      </div>

      {/* Risques + Recommandations */}
      <div className="grid grid-cols-2 gap-3">
        <SectionCard title="Risques" icon={AlertTriangle}>
          <div className="space-y-2 mt-2">
            {analysis.risks?.map((risk, i) => {
              const cfg = RISK_CFG[risk.level] || RISK_CFG.MEDIUM;
              const Icon = cfg.icon;
              return (
                <div key={i} className={`p-3 border ${cfg.border} ${cfg.bg}`}>
                  <div className="flex items-start gap-2">
                    <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${cfg.color}`} />
                    <div>
                      <p className={`text-sm font-semibold ${cfg.color}`}>{risk.title}</p>
                      {risk.mitigation && <p className="text-xs text-[var(--text-3)] mt-0.5">{risk.mitigation}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Recommandations" icon={Sparkles}>
          <ul className="space-y-2 mt-2">
            {analysis.recommendations?.map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-[var(--accent)] shrink-0 mt-0.5" />
                <span className="text-sm text-[var(--text-1)]">{r}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}

// ─── Onglet Tâches ────────────────────────────────────────────────────────────
function TabTasks({ project, highlightTaskId }) {
  const [phases,   setPhases]   = useState(project.phases || []);
  const [newPhase, setNewPhase] = useState('');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const addPhase = async (e) => {
    e.preventDefault();
    if (!newPhase.trim()) return;
    const { data } = await api.post(`/projects/${project.id}/phases`, { name: newPhase.trim() });
    setPhases(p => [...p, { ...data, tasks: [] }]);
    setNewPhase('');
  };
  const updatePhase = async (phaseId, body) => {
    const { data } = await api.put(`/projects/${project.id}/phases/${phaseId}`, body);
    setPhases(p => p.map(ph => ph.id === phaseId ? { ...ph, ...data } : ph));
  };
  const deletePhase = async (phaseId) => {
    if (!confirm('Supprimer cette phase et ses tâches ?')) return;
    await api.delete(`/projects/${project.id}/phases/${phaseId}`);
    setPhases(p => p.filter(ph => ph.id !== phaseId));
  };
  const addTask = async (phaseId, title) => {
    const { data } = await api.post(`/projects/${project.id}/phases/${phaseId}/tasks`, { title, phaseId });
    setPhases(p => p.map(ph => ph.id === phaseId ? { ...ph, tasks: [...(ph.tasks || []), data] } : ph));
  };
  const updateTask = async (taskId, body) => {
    const { data } = await api.put(`/tasks/${taskId}`, body);
    setPhases(p => p.map(ph => ({ ...ph, tasks: ph.tasks?.map(t => t.id === taskId ? { ...t, ...data } : t) })));
  };
  const deleteTask = async (taskId) => {
    await api.delete(`/tasks/${taskId}`);
    setPhases(p => p.map(ph => ({ ...ph, tasks: ph.tasks?.filter(t => t.id !== taskId) })));
  };
  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const targetPhase = phases.find(ph => ph.tasks?.some(t => t.id === over.id));
    if (!targetPhase) return;
    await updateTask(active.id, { phaseId: targetPhase.id });
    setPhases(prev => {
      const task = prev.flatMap(ph => ph.tasks || []).find(t => t.id === active.id);
      if (!task) return prev;
      return prev.map(ph => ({
        ...ph,
        tasks: ph.id === targetPhase.id
          ? [...(ph.tasks?.filter(t => t.id !== active.id) || []), { ...task, phaseId: targetPhase.id }]
          : ph.tasks?.filter(t => t.id !== active.id),
      }));
    });
  };

  return (
    <div className="p-8">
      <form onSubmit={addPhase} className="flex items-center gap-3 mb-8">
        <input value={newPhase} onChange={e => setNewPhase(e.target.value)}
          placeholder="Nom de la nouvelle phase..."
          className="bg-[var(--bg-0)] text-[var(--text-1)] text-sm px-4 py-2 outline-none placeholder-neutral-700"
          style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }} />
        <button type="submit" className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--text-1)]" style={{ background: 'var(--accent)', borderRadius: '8px' }}>
          <Plus size={14} />Ajouter une phase
        </button>
      </form>
      {phases.length === 0 ? (
        <div className="text-center py-16">
          <div className="label-mono mb-3">Aucune phase</div>
          <p className="text-sm text-[var(--text-3)]">Créez votre première phase ci-dessus.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="flex gap-px overflow-x-auto pb-4" style={{ background: 'var(--border-1)' }}>
            {phases.map(phase => (
              <div key={phase.id} className="flex-1 min-w-[200px] max-w-[260px] bg-[var(--bg-0)]">
                <PhaseColumn phase={phase}
                  onAddTask={addTask} onUpdateTask={updateTask} onDeleteTask={deleteTask}
                  onUpdatePhase={updatePhase} onDeletePhase={deletePhase}
                  highlightTaskId={highlightTaskId} />
              </div>
            ))}
          </div>
        </DndContext>
      )}
    </div>
  );
}


// ─── Onglet Agents ────────────────────────────────────────────────────────────
function TabAgents({ project, onReload }) {
  const [activeAgent,  setActiveAgent]  = useState('intake');
  const [loading,      setLoading]      = useState(false);
  const [copied,       setCopied]       = useState(false);
  const [driveLoading, setDriveLoading] = useState(false);
  // driveLinks : { intake: url, email: url, structure: url }
  const [driveLinks,   setDriveLinks]   = useState({});

  // ── Résultats persistés par projet + agent ──────────────────────────────
  const skey = (id) => `devflow_agent_${project.id}_${id}`;

  const [results, setResults] = useState(() => {
    const loaded = {};
    ['intake', 'email', 'structure', 'spec'].forEach(id => {
      try {
        const s = localStorage.getItem(`devflow_agent_${project.id}_${id}`);
        if (s) loaded[id] = JSON.parse(s);
      } catch { /* ignore */ }
    });
    return loaded;
  });

  const result = results[activeAgent] || null;

  const saveResult = (agentId, data) => {
    const r = { type: agentId, data };
    setResults(prev => ({ ...prev, [agentId]: r }));
    try { localStorage.setItem(skey(agentId), JSON.stringify(r)); } catch { /* ignore */ }
  };

  const clearResult = () => {
    setResults(prev => ({ ...prev, [activeAgent]: null }));
    setDriveLinks(prev => ({ ...prev, [activeAgent]: null }));
    try { localStorage.removeItem(skey(activeAgent)); } catch { /* ignore */ }
  };

  // ── Agents ──────────────────────────────────────────────────────────────
  const AGENTS = [
    { id: 'intake',    label: 'Analyser le projet',    icon: Sparkles, desc: 'Stack, budget, planning IA'    },
    { id: 'spec',      label: 'Cahier des charges',    icon: FileText, desc: 'Document de cadrage complet'   },
    { id: 'email',     label: 'Rédiger un email',      icon: Zap,      desc: 'Email professionnel au client' },
    { id: 'structure', label: 'Structure de fichiers', icon: Layers,   desc: 'Arborescence du projet'        },
  ];

  const runIntake = async (brief) => {
    setLoading(true);
    try {
      const { data } = await api.post('/agents/intake', { brief, projectId: project.id });
      saveResult('intake', data);
      onReload?.();
    } finally { setLoading(false); }
  };

  const runEmail = async (emailType, context) => {
    setLoading(true);
    try {
      const { data } = await api.post('/agents/email', { emailType, context, projectId: project.id });
      saveResult('email', data);
    } finally { setLoading(false); }
  };

  const runStructure = async (techStack) => {
    setLoading(true);
    try {
      const { data } = await api.post('/agents/structure', { projectType: project.type, projectName: project.name, techStack, projectId: project.id });
      saveResult('structure', data);
    } finally { setLoading(false); }
  };

  const runSpec = async (brief) => {
    setLoading(true);
    try {
      const { data } = await api.post('/agents/spec', { brief, projectId: project.id });
      saveResult('spec', data);
    } finally { setLoading(false); }
  };

  const copyResult = () => {
    if (!result) return;
    const text = result.type === 'email'
      ? `Objet : ${result.data.subject}\n\n${result.data.body}`
      : result.type === 'structure'
        ? JSON.stringify(result.data.structure, null, 2)
        : result.type === 'spec'
          ? specToText(result.data)
          : JSON.stringify(result.data, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendToDrive = async () => {
    if (!result || !project.driveFolderId) return;
    setDriveLoading(true);
    try {
      const { data } = await api.post(`/projects/${project.id}/agents/save-to-drive`, {
        agentType: result.type,
        result: result.data,
      });
      setDriveLinks(prev => ({ ...prev, [activeAgent]: data.url }));
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de l\'envoi vers Drive');
    } finally { setDriveLoading(false); }
  };

  return (
    <div className="grid grid-cols-2 gap-px" style={{ background: 'var(--border-1)' }}>
      {/* ── Colonne gauche : liste agents + formulaire ── */}
      <div className="bg-[var(--bg-0)] p-8 space-y-6">
        <div>
          <div className="label-mono mb-4">Agents disponibles</div>
          <div className="space-y-1">
            {AGENTS.map(({ id, label, desc, icon: Icon }) => (
              <button key={id} onClick={() => setActiveAgent(id)}
                className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors border-l-2 ${
                  activeAgent === id
                    ? 'bg-[var(--hover-1)] border-[var(--accent)] text-[var(--text-1)]'
                    : 'border-transparent text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--hover-1)]'
                }`}>
                <Icon size={15} strokeWidth={1.6} className="shrink-0 mt-0.5"
                  style={{ color: activeAgent === id ? 'var(--accent)' : undefined }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs text-[var(--text-4)] mt-0.5">{desc}</div>
                </div>
                {/* point vert si un résultat existe pour cet agent */}
                {results[id] && (
                  <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-1)', paddingTop: '24px' }}>
          {loading ? (
            <div className="flex items-center gap-3 text-sm text-[var(--text-3)]">
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent)' }} />
              Agent en cours d'exécution…
            </div>
          ) : activeAgent === 'intake' ? (
            <IntakeQuick project={project} onRun={runIntake} />
          ) : activeAgent === 'spec' ? (
            <SpecQuick project={project} onRun={runSpec} />
          ) : activeAgent === 'email' ? (
            <EmailQuick project={project} onRun={runEmail} />
          ) : (
            <StructureQuick project={project} onRun={runStructure} />
          )}
        </div>
      </div>

      {/* ── Colonne droite : résultat ── */}
      <div className="bg-[var(--bg-0)] p-8 overflow-auto">
        {result ? (
          <div className="space-y-4">
            {/* Header résultat */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="label-mono text-[var(--text-1)]">Résultat</div>
              <div className="flex items-center gap-3">
                <button onClick={clearResult}
                  className="flex items-center gap-1.5 label-mono hover:text-[var(--text-1)] transition-colors">
                  <X size={11} />Effacer
                </button>
                <button onClick={copyResult}
                  className="flex items-center gap-1.5 label-mono hover:text-[var(--text-1)] transition-colors">
                  {copied
                    ? <><Check size={11} className="text-emerald-400" />Copié</>
                    : <><Copy size={11} />Copier</>}
                </button>
                {/* Bouton Drive */}
                {project.driveFolderId ? (
                  driveLinks[activeAgent] ? (
                    <a href={driveLinks[activeAgent]} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 label-mono text-emerald-400 hover:text-emerald-300 transition-colors">
                      <HardDrive size={11} />Drive
                      <ExternalLink size={10} />
                    </a>
                  ) : (
                    <button onClick={sendToDrive} disabled={driveLoading}
                      className="flex items-center gap-1.5 label-mono hover:text-[var(--text-1)] transition-colors disabled:opacity-40">
                      {driveLoading
                        ? <Loader2 size={11} className="animate-spin text-[var(--accent)]" />
                        : <HardDrive size={11} />}
                      {driveLoading ? 'Envoi…' : 'Drive'}
                    </button>
                  )
                ) : null}
              </div>
            </div>

            {/* Contenu selon le type d'agent */}
            {result.type === 'intake' && (() => {
              const a  = result.data;
              const cx = COMPLEXITY_CFG[a.complexity] || COMPLEXITY_CFG.MEDIUM;
              return (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`px-2.5 py-1 text-xs font-semibold border ${cx.color} ${cx.bg} ${cx.border}`}>
                      Complexité {cx.label}
                    </span>
                    {a._planning && (
                      <span className="text-xs text-emerald-400">
                        ✓ {a._planning.phasesCreated} phases · {a._planning.tasksCreated} tâches créées
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--text-1)] leading-relaxed">{a.summary}</p>
                  {a.stack && (
                    <div className="space-y-1 pt-1">
                      {['frontend','backend','database','hosting'].filter(k => a.stack[k]?.name).map(k => (
                        <div key={k} className="flex items-center gap-2 text-xs">
                          <span className="label-mono text-[var(--text-4)] w-20 shrink-0">{k}</span>
                          <span className="font-mono text-[var(--text-1)]">{a.stack[k].name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {a.budget && (
                    <div className="flex gap-4 pt-1">
                      <div><p className="label-mono">Budget HT</p><p className="font-mono text-[var(--text-1)] font-bold">{fmt(a.budget.totalHT)} €</p></div>
                      <div><p className="label-mono">TJM</p><p className="font-mono text-[var(--text-1)] font-bold">{fmt(a.budget.dailyRate)} €</p></div>
                      <div><p className="label-mono">Durée</p><p className="font-mono text-[var(--text-1)] font-bold">{a.timeline?.totalDays}j</p></div>
                    </div>
                  )}
                  <p className="text-xs text-[var(--text-4)] pt-1">→ Aperçu pour l'analyse complète · Drive pour exporter.</p>
                </div>
              );
            })()}

            {result.type === 'spec' && (() => {
              const s = result.data;
              const c = s.context     || {};
              const d = s.description || {};
              const r = s.response    || {};
              const PCFG = { HIGH: '#ef4444', MEDIUM: '#eab308', LOW: '#22c55e' };

              // Synthétise un brief riche à partir du cahier des charges déjà généré,
              // pour alimenter l'agent d'analyse (planning) sans redemander au client
              const buildBriefFromSpec = () => [
                s.title,
                c.company              && `Entreprise / contexte : ${c.company}`,
                c.objectives?.length   && `Objectifs : ${c.objectives.join(' ; ')}`,
                c.targetAudience       && `Public cible : ${c.targetAudience}`,
                d.workflow             && `Parcours principal : ${d.workflow}`,
                d.features?.length     && `Fonctionnalités attendues : ${d.features.map(f => `${f.name} (priorité ${f.priority})${f.description ? ' — ' + f.description : ''}`).join(' ; ')}`,
                d.deliverables?.length && `Prestations attendues : ${d.deliverables.join(', ')}`,
                d.sitemap?.length      && `Arborescence du site : ${d.sitemap.join(' / ')}`,
                d.backOffice?.length   && `Back-office : ${d.backOffice.join(', ')}`,
                d.technicalEnvironment && `Environnement technique : ${d.technicalEnvironment}`,
              ].filter(Boolean).join('\n');

              return (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-[var(--text-1)]">{s.title}</p>

                  {!project.phases?.length && (
                    <div className="flex items-center justify-between gap-4 px-5 py-4 border border-[var(--accent)]/30 bg-[var(--accent)]/5 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <Sparkles size={15} className="text-[var(--accent)] shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--text-1)]">Aucun planning sur ce projet</p>
                          <p className="text-xs text-[var(--text-2)] mt-0.5">
                            Génère les phases et tâches du projet directement à partir de ce cahier des charges
                          </p>
                        </div>
                      </div>
                      <button onClick={() => runIntake(buildBriefFromSpec())}
                        className="shrink-0 flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--text-1)] transition-colors"
                        style={{ background: 'var(--accent)', borderRadius: '8px' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}>
                        <Sparkles size={13} />
                        Générer le planning
                      </button>
                    </div>
                  )}

                  <SectionCard title="1. Contexte" icon={Bot} defaultOpen>
                    <div className="space-y-3">
                      <SpecBlock label="Entreprise / Institution" text={c.company} />
                      <SpecBlock label="Existant" text={c.existing} />
                      <SpecBlockList label="Objectifs du projet" items={c.objectives} />
                      <SpecBlock label="Public / utilisateurs concernés" text={c.targetAudience} />
                      {c.competitors?.length > 0 && (
                        <div>
                          <p className="label-mono mb-1.5">Concurrence</p>
                          <div className="space-y-1">
                            {c.competitors.map((co, i) => (
                              <div key={i} className="text-xs text-[var(--text-2)]">
                                <span className="text-[var(--text-1)] font-medium">{co.name}</span>
                                {co.note && <> — {co.note}</>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <SpecBlock label="Organisation du projet" text={c.projectOrganization} />
                    </div>
                  </SectionCard>

                  <SectionCard title="2. Description du projet" icon={Layers} defaultOpen={false}>
                    <div className="space-y-3">
                      <SpecBlockList label="Prestations à la charge du candidat" items={d.deliverables} />
                      <SpecBlockList label="Arborescence du site" items={d.sitemap} mono />
                      <SpecBlock label="Workflow fonctionnel" text={d.workflow} />
                      {d.features?.length > 0 && (
                        <div>
                          <p className="label-mono mb-1.5">Fonctionnalités spécifiques</p>
                          <div className="space-y-1.5">
                            {d.features.map((f, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs">
                                <span className="px-1.5 py-0.5 font-mono shrink-0 border"
                                  style={{ color: PCFG[f.priority] || 'var(--text-2)', borderColor: `color-mix(in srgb, ${PCFG[f.priority] || 'var(--text-4)'} 25%, transparent)`, background: `color-mix(in srgb, ${PCFG[f.priority] || 'var(--text-4)'} 6%, transparent)` }}>
                                  {f.priority}
                                </span>
                                <div><span className="text-[var(--text-1)] font-medium">{f.name}</span>
                                  {f.description && <span className="text-[var(--text-3)]"> — {f.description}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <SpecBlockList label="Interaction avec des systèmes tiers" items={d.thirdPartyIntegrations} />
                      <SpecBlock label="Environnement technique et accessibilité" text={d.technicalEnvironment} />
                      <SpecBlockList label="Back-office et administration" items={d.backOffice} />
                      {d.methodology && (
                        <SpecBlock label={`Méthodologie — ${d.methodology === 'AGILE' ? 'Agile' : 'Forfait (Waterfall)'}`} text={d.methodologyNote} />
                      )}
                      <SpecBlock label="Graphisme" text={d.graphics} />
                      <SpecBlock label="Contenus et migration des données" text={d.contentMigration} />
                      <SpecBlock label="Statistiques" text={d.statistics} />
                      <SpecBlock label="Nom de domaine" text={d.domainName} />
                      <SpecBlock label="Hébergement" text={d.hosting} />
                      <SpecBlock label="Droits" text={d.rights} />
                      <SpecBlock label="Maintenance / évolutions" text={d.maintenance} />
                      <SpecBlock label="Promotion du site" text={d.promotion} />
                      <SpecBlock label="Budget" text={d.budget} />
                    </div>
                  </SectionCard>

                  <SectionCard title="3. Organisation de la réponse" icon={CheckCircle2} defaultOpen={false}>
                    <div className="space-y-3">
                      <SpecBlockList label="Ce que vous attendez" items={r.expectations} />
                      {r.planning?.length > 0 && (
                        <div>
                          <p className="label-mono mb-1.5">Planning de la consultation</p>
                          <div className="space-y-1">
                            {r.planning.map((p, i) => (
                              <div key={i} className="text-xs text-[var(--text-2)]">
                                <span className="text-[var(--text-1)] font-medium">{i + 1}. {p.step}</span>
                                {p.detail && <> — {p.detail}</>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {r.selectionCriteria?.length > 0 && (
                        <div>
                          <p className="label-mono mb-1.5">Critères de sélection</p>
                          <div className="space-y-1">
                            {r.selectionCriteria.map((cr, i) => (
                              <div key={i} className="text-xs text-[var(--text-2)] flex items-center justify-between">
                                <span>{cr.criterion}</span>
                                <span className="text-[var(--text-1)] font-mono">{cr.weight}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <SpecBlock label="Interlocuteurs" text={r.contacts} />
                    </div>
                  </SectionCard>

                  <p className="text-xs text-[var(--text-4)] pt-1">→ Copie le texte complet ou envoie le document vers Drive.</p>
                </div>
              );
            })()}

            {result.type === 'email' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex-1 px-4 py-3 text-sm" style={{ border: '1px solid var(--border-2)', background: 'rgba(0,71,255,0.05)' }}>
                    <span className="label-mono mr-3">Objet</span>
                    <span className="text-[var(--text-1)] font-medium">{result.data.subject}</span>
                  </div>
                  <a href={`mailto:${project.client?.email || ''}?subject=${encodeURIComponent(result.data.subject || '')}&body=${encodeURIComponent(result.data.body || '')}`}
                    className="shrink-0 flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[var(--text-1)] transition-colors"
                    style={{ background: 'var(--accent)', borderRadius: '8px' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}>
                    <Mail size={13} />
                    Ouvrir dans la messagerie
                  </a>
                </div>
                <pre className="text-sm text-[var(--text-1)] leading-relaxed whitespace-pre-wrap font-sans p-4 overflow-auto max-h-80"
                  style={{ border: '1px solid var(--border-1)', background: 'var(--bg-0)' }}>
                  {result.data.body}
                </pre>
                {result.data.tips?.length > 0 && (
                  <div className="space-y-1.5 pt-2" style={{ borderTop: '1px solid var(--border-1)' }}>
                    <div className="label-mono mb-2">Conseils</div>
                    {result.data.tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-[var(--text-3)]">
                        <span style={{ color: 'var(--accent)' }}>→</span>{tip}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {result.type === 'structure' && (
              <div className="space-y-3">
                <FileTree node={result.data.structure} depth={0} />
                {result.data.readme && (
                  <div style={{ borderTop: '1px solid var(--border-1)', paddingTop: '12px' }}>
                    <div className="label-mono mb-2">README.md</div>
                    <pre className="text-xs text-[var(--text-2)] leading-relaxed whitespace-pre-wrap font-mono p-3 max-h-48 overflow-auto"
                      style={{ border: '1px solid var(--border-1)', background: 'var(--bg-0)' }}>
                      {result.data.readme}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-[var(--text-5)] py-20 space-y-3">
            <Bot size={32} strokeWidth={1} />
            <div className="label-mono">En attente d'un résultat</div>
            <div className="text-xs text-[var(--text-5)] text-center max-w-[200px]">
              Les résultats sont sauvegardés automatiquement par session
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Arbre de fichiers ────────────────────────────────────────────────────────
function FileTree({ node, depth }) {
  const [open, setOpen] = useState(depth < 2);
  if (!node) return null;
  const isFolder = node.type === 'folder';
  return (
    <div>
      <div className={`flex items-center gap-1.5 py-0.5 text-xs font-mono transition-colors ${isFolder ? 'cursor-pointer hover:text-[var(--text-1)]' : ''}`}
        style={{ paddingLeft: `${depth * 14}px`, color: isFolder ? 'var(--text-2)' : 'var(--text-4)' }}
        onClick={() => isFolder && setOpen(o => !o)}
        title={node.description}>
        {isFolder
          ? <span style={{ color: 'var(--accent)' }}>{open ? '▾' : '▸'}</span>
          : <span className="w-3 inline-block" />}
        <span className={isFolder ? 'text-[var(--text-1)] font-medium' : 'text-[var(--text-3)]'}>
          {node.name}{isFolder ? '/' : ''}
        </span>
      </div>
      {isFolder && open && node.children?.map((child, i) => (
        <FileTree key={i} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

function IntakeQuick({ project, onRun }) {
  const [brief, setBrief] = useState('');
  return (
    <div className="space-y-4">
      <div>
        <label className="label-mono block mb-2">Brief / cahier des charges du client</label>
        <textarea value={brief} onChange={e => setBrief(e.target.value)} rows={7}
          className="w-full bg-[var(--bg-0)] text-[var(--text-1)] text-sm px-3 py-2 outline-none resize-none placeholder-neutral-700"
          style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }}
          placeholder={`Décris le projet de ${project.client?.name || 'ton client'} en détail : objectifs, fonctionnalités, contraintes techniques…`} />
      </div>
      <button onClick={() => onRun(brief)} disabled={brief.trim().length < 30}
        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[var(--text-1)] disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: 'var(--accent)', borderRadius: '8px' }}>
        <Sparkles size={14} />Analyser le projet
      </button>
    </div>
  );
}

function SpecQuick({ project, onRun }) {
  const [brief, setBrief] = useState('');
  return (
    <div className="space-y-4">
      <div>
        <label className="label-mono block mb-2">Brief du projet</label>
        <textarea value={brief} onChange={e => setBrief(e.target.value)} rows={7}
          className="w-full bg-[var(--bg-0)] text-[var(--text-1)] text-sm px-3 py-2 outline-none resize-none placeholder-neutral-700"
          style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }}
          placeholder={`Décris le contexte, les objectifs et les attentes de ${project.client?.name || 'ton client'} : l'IA structure tout en cahier des charges complet (contexte, fonctionnalités, technique, budget, planning de consultation…)`} />
      </div>
      <p className="text-xs text-[var(--text-4)] leading-relaxed">
        Génère un document complet structuré selon le guide de référence "Plateforme Web" :
        contexte, description du projet, organisation de la réponse — exportable vers Drive.
      </p>
      <button onClick={() => onRun(brief)} disabled={brief.trim().length < 30}
        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[var(--text-1)] disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: 'var(--accent)', borderRadius: '8px' }}>
        <FileText size={14} />Générer le cahier des charges
      </button>
    </div>
  );
}

function EmailQuick({ project, onRun }) {
  const [type,    setType]    = useState('PROJECT_START');
  const [context, setContext] = useState(`Projet : ${project.name}\nClient : ${project.client?.name || ''}`);
  const EMAIL_TYPES = [
    { value: 'PROJECT_START',  label: 'Démarrage du projet' },
    { value: 'PHASE_COMPLETE', label: 'Fin de phase'        },
    { value: 'DELIVERY',       label: 'Livraison finale'    },
    { value: 'INVOICE',        label: 'Envoi de facture'    },
    { value: 'REMINDER',       label: 'Relance client'      },
    { value: 'FOLLOW_UP',      label: 'Suivi de projet'     },
  ];
  return (
    <div className="space-y-4">
      <div>
        <label className="label-mono block mb-2">Type d'email</label>
        <select value={type} onChange={e => setType(e.target.value)}
          className="w-full bg-[var(--bg-0)] text-[var(--text-1)] text-sm px-3 py-2.5 outline-none" style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }}>
          {EMAIL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label-mono block mb-2">Contexte</label>
        <textarea value={context} onChange={e => setContext(e.target.value)} rows={4}
          className="w-full bg-[var(--bg-0)] text-[var(--text-1)] text-sm px-3 py-2 outline-none resize-none"
          style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }} placeholder="Détails à inclure dans l'email..." />
      </div>
      <button onClick={() => onRun(type, { details: context, project: project.name, client: project.client?.name })}
        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[var(--text-1)] transition-opacity hover:opacity-90"
        style={{ background: 'var(--accent)', borderRadius: '8px' }}>
        <Zap size={14} />Rédiger l'email
      </button>
    </div>
  );
}

function StructureQuick({ project, onRun }) {
  const [stack, setStack] = useState('React + Node.js + MySQL');
  return (
    <div className="space-y-4">
      <div>
        <label className="label-mono block mb-2">Stack technique</label>
        <input value={stack} onChange={e => setStack(e.target.value)}
          className="w-full bg-[var(--bg-0)] text-[var(--text-1)] text-sm px-3 py-2.5 outline-none"
          style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }} placeholder="Ex : React + Node.js + PostgreSQL" />
      </div>
      <div className="px-3 py-2.5 text-xs text-[var(--text-3)]" style={{ border: '1px solid var(--border-1)', background: 'var(--bg-0)' }}>
        <div className="label-mono mb-1">Projet détecté</div>
        <div className="text-[var(--text-2)]">{project.name} · {TYPE_LABEL[project.type]}</div>
      </div>
      <button onClick={() => onRun(stack)}
        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[var(--text-1)] transition-opacity hover:opacity-90"
        style={{ background: 'var(--accent)', borderRadius: '8px' }}>
        <Layers size={14} />Générer la structure
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  PAGE PRINCIPALE
// ═══════════════════════════════════════════════════════════════
export default function ProjectDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [searchParams]                  = useSearchParams();
  const [project,      setProject]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState(() => {
    const t = searchParams.get('tab');
    return ['overview', 'tasks', 'agents'].includes(t) ? t : 'overview';
  });
  const [highlightTaskId] = useState(() => {
    const tid = searchParams.get('taskId');
    return tid ? Number(tid) : null;
  });
  const [driveLoading, setDriveLoading] = useState(false);

  const TABS = [
    { id: 'overview', label: 'Aperçu',    icon: Layers },
    { id: 'tasks',    label: 'Tâches',    icon: Check  },
    { id: 'agents',   label: 'Agents IA', icon: Bot    },
  ];

  const load = async () => {
    const { data } = await api.get(`/projects/${id}`);
    setProject(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleUpdate = async (body) => {
    const { data } = await api.put(`/projects/${id}`, body);
    setProject(p => ({ ...p, ...data }));
  };

  const handleCreateDriveFolder = async () => {
    setDriveLoading(true);
    try {
      const { data } = await api.post(`/projects/${id}/drive-folder`);
      setProject(p => ({ ...p, ...data }));
    } catch (e) {
      alert(e.response?.data?.message || 'Erreur lors de la création du dossier Drive');
    } finally {
      setDriveLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="label-mono">Chargement...</div>
    </div>
  );
  if (!project) return (
    <div className="flex items-center justify-center h-64 text-[var(--text-4)]">
      <div className="label-mono">Projet introuvable</div>
    </div>
  );

  const statusCfg = STATUS_OPTIONS.find(s => s.value === project.status) || STATUS_OPTIONS[0];

  return (
    <div>
      {/* Header */}
      <div className="px-10 py-6 flex items-start justify-between gap-4"
        style={{ borderBottom: '1px solid var(--border-1)' }}>
        <div className="flex items-start gap-4">
          <button onClick={() => navigate('/projects')}
            className="text-[var(--text-4)] hover:text-[var(--text-1)] transition-colors mt-1">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="label-mono mb-1">{project.client?.name || '—'} / {TYPE_LABEL[project.type]}</div>
            <h1 className="font-display text-3xl text-[var(--text-1)]">{project.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {project.budget && (
            <span className="font-mono text-sm text-[var(--text-2)]">
              {project.budget.toLocaleString('fr-FR')} €
            </span>
          )}
          {/* Google Drive — lien si dossier existe, bouton sinon */}
          {project.driveFolderUrl ? (
            <a href={project.driveFolderUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 label-mono hover:text-[var(--text-1)] transition-colors"
              style={{ border: '1px solid var(--border-2)', padding: '6px 12px', color: 'inherit', textDecoration: 'none' }}>
              <HardDrive size={12} style={{ color: '#4ade80' }} />
              <span style={{ color: '#4ade80' }}>Drive</span>
              <ExternalLink size={10} />
            </a>
          ) : (
            <button onClick={handleCreateDriveFolder} disabled={driveLoading}
              className="flex items-center gap-1.5 label-mono transition-colors hover:text-[var(--text-1)] disabled:opacity-50"
              style={{ border: '1px solid var(--border-2)', padding: '6px 12px' }}>
              {driveLoading
                ? <Loader2 size={12} className="animate-spin" />
                : <HardDrive size={12} />}
              {driveLoading ? 'Création…' : 'Créer dossier Drive'}
            </button>
          )}
          {/* Lien vers les contrats du projet */}
          {project.contracts?.length > 0 && (
            <button
              onClick={() => navigate(`/contracts?id=${project.contracts[0].id}`)}
              className="flex items-center gap-1.5 label-mono hover:text-[var(--text-1)] transition-colors"
              style={{ border: '1px solid var(--border-2)', padding: '6px 12px' }}>
              <FileText size={12} />
              {project.contracts.length} contrat{project.contracts.length > 1 ? 's' : ''}
              <ExternalLink size={10} />
            </button>
          )}
          <span className="label-mono px-3 py-1.5" style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }}>
            {statusCfg.label}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex" style={{ borderBottom: '1px solid var(--border-1)' }}>
        {TABS.map(({ id: tabId, label, icon: Icon }) => (
          <button key={tabId} onClick={() => setTab(tabId)}
            className={`flex items-center gap-2 px-6 py-3.5 text-sm transition-colors border-b-2 ${
              tab === tabId
                ? 'border-[var(--accent)] text-[var(--text-1)]'
                : 'border-transparent text-[var(--text-3)] hover:text-[var(--text-1)]'
            }`}>
            <Icon size={14} strokeWidth={1.6} style={{ color: tab === tabId ? 'var(--accent)' : undefined }} />
            {label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
          {tab === 'overview' && <TabOverview project={project} onUpdate={handleUpdate} onSwitchToAgents={() => setTab('agents')} />}
          {tab === 'tasks'    && <TabTasks    project={project} highlightTaskId={highlightTaskId} />}
          {tab === 'agents'   && <TabAgents   project={project} onReload={load} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
