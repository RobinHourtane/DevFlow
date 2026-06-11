import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Search, LayoutGrid, List, Trash2, GripVertical } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import PageHeader from '../components/devflow/PageHeader';
import api from '../lib/api';
import { PROJECT_STATUS_LABEL as STATUS_LABEL, PROJECT_TYPE_LABEL as TYPE_LABEL } from '../lib/constants';

const STATUSES = [
  { key: 'PROSPECT',    label: 'Prospect'    },
  { key: 'NEGOTIATION', label: 'Négociation' },
  { key: 'SIGNED',      label: 'Signé'       },
  { key: 'IN_PROGRESS', label: 'En cours'    },
  { key: 'REVIEW',      label: 'Révision'    },
  { key: 'DELIVERED',   label: 'Livré'       },
];

const ARCHIVED_STATUS = { key: 'ARCHIVED', label: 'Archivé' };

// ─── Carte Kanban ─────────────────────────────────────────────────────────────
function ProjectCard({ project, onClick, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: project.id });

  return (
    <div ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}>
      <div
        className="bg-[var(--bg-0)] p-4 cursor-pointer hover:bg-[var(--hover-1)] transition-colors group"
        style={{ border: '1px solid var(--border-1)', marginBottom: '1px', borderRadius: '8px' }}
        onClick={onClick}>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-start gap-2 min-w-0">
            <div {...attributes} {...listeners}
              className="mt-0.5 text-[var(--text-5)] hover:text-[var(--text-2)] cursor-grab shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={e => e.stopPropagation()}>
              <GripVertical size={12} />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-[var(--text-1)] font-medium truncate">{project.name}</p>
              <p className="text-xs text-[var(--text-3)] font-mono mt-0.5 truncate">{project.client?.name || '—'}</p>
            </div>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onDelete(project.id); }}
            className="text-[var(--text-5)] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0 p-0.5">
            <Trash2 size={12} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span className="label-mono">{TYPE_LABEL[project.type] || '—'}</span>
          {project.budget && (
            <span className="font-mono text-xs text-[var(--text-2)]">
              {project.budget.toLocaleString('fr-FR')} €
            </span>
          )}
        </div>

        {project.endDate && (
          <div className="mt-2 label-mono">
            ↳ {format(parseISO(project.endDate), 'dd MMM yyyy')}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Colonne Kanban ───────────────────────────────────────────────────────────
function KanbanColumn({ col, projects, onCardClick, onDelete }) {
  return (
    <div className="flex-1 min-w-[200px]">
      <div className="px-1 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-1)' }}>
        <span className="label-mono text-[var(--text-1)]">{col.label}</span>
        <span className="font-mono text-xs text-[var(--text-4)]">{projects.length}</span>
      </div>
      <SortableContext items={projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
        <div className="pt-2 min-h-[120px]">
          {projects.map(p => (
            <ProjectCard key={p.id} project={p}
              onClick={() => onCardClick(p.id)}
              onDelete={onDelete} />
          ))}
          {projects.length === 0 && (
            <div className="p-4 text-center label-mono">vide</div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ─── Modal création ───────────────────────────────────────────────────────────
function CreateModal({ clients, onClose, onCreate, prefill }) {
  const [form, setForm] = useState({
    name:     prefill?.name        || '',
    type:     prefill?.type        || 'SITE_VITRINE',
    clientId: prefill?.clientId    || '',
    budget:   prefill?.budget      || '',
    description: prefill?.description || '',
    status:   'PROSPECT',
  });

  const submit = async (e) => {
    e.preventDefault();
    const navigatedAway = await onCreate(form);
    if (!navigatedAway) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full max-w-md bg-[var(--bg-1)] p-8"
        style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }}
        onClick={e => e.stopPropagation()}>
        <div className="label-mono mb-3">Workspace / Projets</div>
        <h2 className="font-display text-2xl text-[var(--text-1)] mb-6">Nouveau projet</h2>
        <form onSubmit={submit} className="space-y-4">
          {[
            { key: 'name', label: 'Nom du projet', type: 'text', placeholder: 'Mon projet client' },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label className="label-mono block mb-2">{label}</label>
              <input type={type} required value={form[key]}
                onChange={e => setForm({ ...form, [key]: e.target.value })}
                placeholder={placeholder}
                className="w-full bg-[var(--bg-0)] text-[var(--text-1)] text-sm px-4 py-2.5 outline-none focus:border-[var(--accent)] transition-colors"
                style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }} />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-mono block mb-2">Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full bg-[var(--bg-0)] text-[var(--text-1)] text-sm px-4 py-2.5 outline-none"
                style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }}>
                {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label-mono block mb-2">Client</label>
              <select value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}
                className="w-full bg-[var(--bg-0)] text-[var(--text-1)] text-sm px-4 py-2.5 outline-none"
                style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }}>
                <option value="">— Aucun —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label-mono block mb-2">Budget (€)</label>
            <input type="number" value={form.budget}
              onChange={e => setForm({ ...form, budget: e.target.value })}
              placeholder="0"
              className="w-full bg-[var(--bg-0)] text-[var(--text-1)] text-sm px-4 py-2.5 outline-none focus:border-[var(--accent)]"
              style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors"
              style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }}>
              Annuler
            </button>
            <button type="submit"
              className="flex-1 py-2.5 text-sm text-[var(--text-1)] font-medium transition-colors"
              style={{ background: 'var(--accent)', borderRadius: '8px' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}>
              Créer le projet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [clients, setClients]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [view, setView]         = useState('kanban');
  const [modal, setModal]       = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();
  const prefill   = location.state?.prefill || null;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = () =>
    Promise.all([api.get('/projects'), api.get('/clients')])
      .then(([p, c]) => { setProjects(p.data); setClients(c.data); })
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  // Ouvrir la modal pré-remplie si on vient des Agents IA
  useEffect(() => {
    if (prefill) setModal(true);
  }, [prefill]);

  const archivedCount = projects.filter(p => p.status === 'ARCHIVED').length;

  const filtered = projects.filter(p =>
    (showArchived || p.status !== 'ARCHIVED') &&
    (p.name.toLowerCase().includes(search.toLowerCase()) ||
     p.client?.name?.toLowerCase().includes(search.toLowerCase()))
  );

  const visibleStatuses = showArchived ? [...STATUSES, ARCHIVED_STATUS] : STATUSES;
  const byStatus = key => filtered.filter(p => p.status === key);

  const handleDragEnd = async ({ active, over }) => {
    if (!over) return;
    const newStatus = visibleStatuses.find(s => byStatus(s.key).some(p => p.id === over.id))?.key;
    if (!newStatus || newStatus === projects.find(p => p.id === active.id)?.status) return;
    setProjects(prev => prev.map(p => p.id === active.id ? { ...p, status: newStatus } : p));
    await api.put(`/projects/${active.id}`, { status: newStatus }).catch(() => {});
  };

  const handleCreate = async (form) => {
    const { data } = await api.post('/projects', {
      ...form,
      clientId: form.clientId || undefined,
      budget: form.budget ? Number(form.budget) : undefined,
    });
    setProjects(prev => [data, ...prev]);

    // Si le projet vient d'une analyse IA standalone (Agents → "Créer ce projet"),
    // on réapplique l'analyse complète (stack, planning, risques…) sur le nouveau
    // projet sans relancer l'IA, puis on file directement sur sa fiche.
    if (prefill?.analysis) {
      try {
        await api.post('/agents/apply-analysis', { projectId: data.id, analysis: prefill.analysis });
      } catch {
        // Non bloquant : le projet est créé, l'analyse pourra être relancée manuellement
      }
      navigate(`/projects/${data.id}`, { replace: true, state: {} });
      return true; // signale que la navigation a déjà eu lieu (modal ne doit pas re-router)
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce projet ?')) return;
    await api.delete(`/projects/${id}`);
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div>
      <PageHeader
        eyebrow="Workspace / Projets"
        title="Projets"
        description="Suivez vos contrats actifs, budgets et jalons."
        actions={
          <div className="flex items-center gap-2">
            {/* Toggle vue */}
            <div className="flex" style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }}>
              <button onClick={() => setView('kanban')}
                className={`p-2 transition-colors ${view === 'kanban' ? 'bg-[var(--bg-2)] text-[var(--text-1)]' : 'text-[var(--text-3)] hover:text-[var(--text-1)]'}`}>
                <LayoutGrid size={15} />
              </button>
              <button onClick={() => setView('list')}
                className={`p-2 transition-colors ${view === 'list' ? 'bg-[var(--bg-2)] text-[var(--text-1)]' : 'text-[var(--text-3)] hover:text-[var(--text-1)]'}`}
                style={{ borderLeft: '1px solid var(--border-2)' }}>
                <List size={15} />
              </button>
            </div>
            <button onClick={() => setModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--text-1)]"
              style={{ background: 'var(--accent)', borderRadius: '8px' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}>
              <Plus size={14} />
              Nouveau projet
            </button>
          </div>
        }
      />

      <div className="px-10 py-6">
        {/* Search + filtres */}
        <div className="flex items-center gap-4 mb-8 flex-wrap">
          <div className="relative max-w-sm flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-4)]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un projet..."
              className="w-full pl-10 pr-4 py-2 bg-[var(--bg-0)] text-[var(--text-1)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
              style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }} />
          </div>
          {archivedCount > 0 && (
            <button onClick={() => setShowArchived(s => !s)}
              className={`label-mono px-3 py-2 transition-colors ${showArchived ? 'text-[var(--text-1)]' : 'text-[var(--text-3)] hover:text-[var(--text-1)]'}`}
              style={{ border: '1px solid var(--border-2)', background: showArchived ? 'var(--bg-1)' : 'transparent', borderRadius: '8px' }}>
              {showArchived ? 'Masquer' : 'Afficher'} les archivés ({archivedCount})
            </button>
          )}
        </div>

        {loading ? (
          <div className="label-mono py-20 text-center">Chargement...</div>
        ) : view === 'kanban' ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="flex gap-px overflow-x-auto" style={{ background: 'var(--border-1)' }}>
              {visibleStatuses.map(col => (
                <div key={col.key} className="flex-1 min-w-[180px] bg-[var(--bg-0)] px-2 pb-4">
                  <KanbanColumn col={col} projects={byStatus(col.key)}
                    onCardClick={id => navigate(`/projects/${id}`)}
                    onDelete={handleDelete} />
                </div>
              ))}
            </div>
          </DndContext>
        ) : (
          /* Vue Liste */
          <div style={{ background: 'var(--card)', border: '1px solid var(--border-1)', borderRadius: '12px', overflow: 'hidden' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-1)' }}>
                  {['Projet', 'Statut', 'Client', 'Type', 'Budget', 'Échéance', ''].map(h => (
                    <th key={h} className="label-mono px-5 py-3 text-left font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="label-mono text-center py-12">Aucun projet</td></tr>
                )}
                {filtered.map((p, i) => (
                  <tr key={p.id}
                    className="hover:bg-[var(--hover-1)] cursor-pointer transition-colors"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--bg-2)' : 'none' }}
                    onClick={() => navigate(`/projects/${p.id}`)}>
                    <td className="px-5 py-3.5">
                      <div className="text-[var(--text-1)] font-medium">{p.name}</div>
                    </td>
                    <td className="px-5 py-3.5 label-mono">{STATUS_LABEL[p.status] || p.status}</td>
                    <td className="px-5 py-3.5 text-[var(--text-2)]">{p.client?.name || '—'}</td>
                    <td className="px-5 py-3.5 label-mono">{TYPE_LABEL[p.type]}</td>
                    <td className="px-5 py-3.5 font-mono text-[var(--text-2)]">
                      {p.budget ? `${p.budget.toLocaleString('fr-FR')} €` : '—'}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[var(--text-2)]">
                      {p.endDate ? format(parseISO(p.endDate), 'dd/MM/yyyy') : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={e => { e.stopPropagation(); handleDelete(p.id); }}
                        className="text-[var(--text-4)] hover:text-red-400 transition-colors p-1">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <CreateModal
          clients={clients}
          onClose={() => { setModal(false); navigate('/projects', { replace: true, state: {} }); }}
          onCreate={handleCreate}
          prefill={prefill}
        />
      )}
    </div>
  );
}
