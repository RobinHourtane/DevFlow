import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Mail, Phone, MapPin, Building2, Tag, FileText,
  Sparkles, RefreshCw, Edit2, Check, X, Trash2, ExternalLink,
  Calendar, ChevronRight,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../lib/api';
import { PROJECT_STATUS_LABEL as STATUS_LABEL, PROJECT_TYPE_LABEL as TYPE_LABEL } from '../lib/constants';

const STATUS_COLOR = {
  PROSPECT: 'var(--text-4)', NEGOTIATION: '#d97706', SIGNED: '#16a34a',
  IN_PROGRESS: 'var(--accent)', REVIEW: '#7c3aed', DELIVERED: '#16a34a', ARCHIVED: 'var(--text-4)',
};

// ─── Champ éditable ──────────────────────────────────────────────────────────
function EditableField({ label, value, onChange, editing, textarea, type = 'text', icon: Icon }) {
  return (
    <div>
      <div className="label-mono mb-1.5 flex items-center gap-1.5">
        {Icon && <Icon size={11} />}
        {label}
      </div>
      {editing ? (
        textarea ? (
          <textarea
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            rows={4}
            className="w-full bg-[var(--bg-0)] text-[var(--text-1)] text-sm px-3 py-2 outline-none focus:border-[var(--accent)] transition-colors resize-none"
            style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }}
          />
        ) : (
          <input
            type={type}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            className="w-full bg-[var(--bg-0)] text-[var(--text-1)] text-sm px-3 py-2 outline-none focus:border-[var(--accent)] transition-colors"
            style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }}
          />
        )
      ) : (
        <p className="text-sm text-[var(--text-1)] font-mono">{value || <span className="text-[var(--text-4)]">—</span>}</p>
      )}
    </div>
  );
}

// ─── Carte projet ─────────────────────────────────────────────────────────────
function ProjectRow({ project, onClick }) {
  return (
    <div
      className="px-5 py-4 flex items-center justify-between hover:bg-[var(--hover-1)] cursor-pointer transition-colors group"
      onClick={onClick}>
      <div className="flex items-center gap-4 min-w-0">
        {/* Indicateur statut */}
        <div className="w-1.5 h-8 rounded-full shrink-0"
          style={{ background: STATUS_COLOR[project.status] || 'var(--text-4)' }} />
        <div className="min-w-0">
          <div className="text-sm text-[var(--text-1)] font-medium truncate">{project.name}</div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="label-mono">{TYPE_LABEL[project.type]}</span>
            {project.endDate && (
              <span className="font-mono text-xs text-[var(--text-4)] flex items-center gap-1">
                <Calendar size={10} />
                {format(parseISO(project.endDate), 'dd MMM yyyy', { locale: fr })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 shrink-0">
        {/* Tâches */}
        <div className="text-center hidden sm:block">
          <div className="font-mono text-sm text-[var(--text-1)]">{project._count?.tasks || 0}</div>
          <div className="label-mono" style={{ fontSize: '10px' }}>tâches</div>
        </div>

        {/* Budget */}
        <div className="text-right hidden md:block">
          <div className="font-mono text-sm text-[var(--text-1)]">
            {project.budget ? `${project.budget.toLocaleString('fr-FR')} €` : '—'}
          </div>
          <div className="label-mono" style={{ fontSize: '10px' }}>budget</div>
        </div>

        {/* Statut */}
        <span className="label-mono px-2.5 py-1 text-xs"
          style={{
            background: `color-mix(in srgb, ${STATUS_COLOR[project.status]} 8%, transparent)`,
            border: `1px solid color-mix(in srgb, ${STATUS_COLOR[project.status]} 25%, transparent)`,
            color: STATUS_COLOR[project.status],
          }}>
          {STATUS_LABEL[project.status]}
        </span>

        <ChevronRight size={14} className="text-[var(--text-5)] group-hover:text-[var(--text-2)] transition-colors" />
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ClientDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [client,  setClient]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form,    setForm]    = useState({});
  const [saving,  setSaving]  = useState(false);

  const [summary,        setSummary]        = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // ── Chargement ──
  useEffect(() => {
    api.get(`/clients/${id}`)
      .then(({ data }) => {
        setClient(data);
        setForm({
          name: data.name, email: data.email,
          phone: data.phone || '', company: data.company || '',
          sector: data.sector || '', address: data.address || '',
          notes: data.notes || '',
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  // ── Résumé IA (auto au chargement) ──
  const loadSummary = () => {
    setSummaryLoading(true);
    api.get(`/clients/${id}/summary`)
      .then(({ data }) => setSummary(data.summary))
      .catch(() => setSummary(null))
      .finally(() => setSummaryLoading(false));
  };

  useEffect(() => {
    if (client) loadSummary();
  }, [client?.id]);

  // ── Sauvegarde ──
  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/clients/${id}`, form);
      setClient(prev => ({ ...prev, ...data }));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      name: client.name, email: client.email,
      phone: client.phone || '', company: client.company || '',
      sector: client.sector || '', address: client.address || '',
      notes: client.notes || '',
    });
    setEditing(false);
  };

  // ── Suppression ──
  const handleDelete = async () => {
    if (!confirm(`Supprimer le client "${client.name}" ? Cette action est irréversible.`)) return;
    await api.delete(`/clients/${id}`);
    navigate('/clients');
  };

  // ── KPIs ──
  const totalBudget   = client?.projects.reduce((s, p) => s + (p.budget || 0), 0) || 0;
  const activeProjects = client?.projects.filter(p => ['IN_PROGRESS', 'REVIEW'].includes(p.status)).length || 0;
  const totalTasks    = client?.projects.reduce((s, p) => s + (p._count?.tasks || 0), 0) || 0;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="label-mono">Chargement…</div>
    </div>
  );

  if (!client) return (
    <div className="flex items-center justify-center h-64">
      <div className="label-mono text-red-400">Client introuvable</div>
    </div>
  );

  return (
    <div>
      {/* ── Header ── */}
      <div className="px-10 py-6 flex items-start justify-between gap-4"
        style={{ borderBottom: '1px solid var(--border-1)' }}>
        <div className="flex items-center gap-5">
          {/* Bouton retour */}
          <button onClick={() => navigate('/clients')}
            className="text-[var(--text-4)] hover:text-[var(--text-1)] transition-colors p-1">
            <ArrowLeft size={18} />
          </button>

          {/* Avatar */}
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
            style={{
              background: 'color-mix(in srgb, var(--accent) 9%, transparent)',
              border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
              color: '#4d7fff',
              fontFamily: 'var(--font-display)',
            }}>
            {client.name[0].toUpperCase()}
          </div>

          {/* Nom + infos */}
          <div>
            <div className="label-mono mb-1">Clients / Fiche</div>
            {editing ? (
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="font-display text-2xl text-[var(--text-1)] bg-transparent border-b border-[var(--accent)] outline-none pb-0.5"
              />
            ) : (
              <h1 className="font-display text-2xl text-[var(--text-1)]">{client.name}</h1>
            )}
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {client.company && (
                <span className="text-xs text-[var(--text-2)] font-mono flex items-center gap-1">
                  <Building2 size={11} />{client.company}
                </span>
              )}
              {client.sector && (
                <span className="label-mono flex items-center gap-1">
                  <Tag size={10} />{client.sector}
                </span>
              )}
              <span className="label-mono">
                Client depuis {format(parseISO(client.createdAt), 'MMMM yyyy', { locale: fr })}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {editing ? (
            <>
              <button onClick={handleCancel}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors"
                style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }}>
                <X size={13} /> Annuler
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[var(--text-1)] transition-colors disabled:opacity-50"
                style={{ background: 'var(--accent)', borderRadius: '8px' }}
                onMouseEnter={e => !saving && (e.currentTarget.style.background = 'var(--accent-hover)')}
                onMouseLeave={e => !saving && (e.currentTarget.style.background = 'var(--accent)')}>
                <Check size={13} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors"
                style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }}>
                <Edit2 size={13} /> Modifier
              </button>
              <button onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-[var(--text-4)] hover:text-red-400 transition-colors"
                style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }}>
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-4 gap-4 px-8 py-5">
        {[
          { label: 'Projets total',    value: client.projects.length },
          { label: 'Budget cumulé',    value: totalBudget > 0 ? `${totalBudget.toLocaleString('fr-FR')} €` : '—' },
          { label: 'Projets actifs',   value: activeProjects },
          { label: 'Tâches associées', value: totalTasks },
        ].map((k) => (
          <div key={k.label} className="card px-6 py-4">
            <div className="label-mono mb-2">{k.label}</div>
            <div className="font-display text-3xl text-[var(--text-1)]">{k.value}</div>
          </div>
        ))}
      </div>

      {/* ── Corps ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr]"
        style={{ borderBottom: '1px solid var(--border-1)' }}>

        {/* ─ Colonne gauche : infos ─ */}
        <div style={{ borderRight: '1px solid var(--border-1)' }}>

          {/* Coordonnées */}
          <div className="p-8" style={{ borderBottom: '1px solid var(--border-1)' }}>
            <div className="label-mono mb-5 text-[var(--text-1)]">Coordonnées</div>
            <div className="space-y-5">
              <EditableField label="Email" value={editing ? form.email : client.email}
                onChange={v => setForm({ ...form, email: v })}
                editing={editing} type="email" icon={Mail} />
              <EditableField label="Téléphone" value={editing ? form.phone : client.phone}
                onChange={v => setForm({ ...form, phone: v })}
                editing={editing} icon={Phone} />
              <EditableField label="Entreprise" value={editing ? form.company : client.company}
                onChange={v => setForm({ ...form, company: v })}
                editing={editing} icon={Building2} />
              <EditableField label="Secteur" value={editing ? form.sector : client.sector}
                onChange={v => setForm({ ...form, sector: v })}
                editing={editing} icon={Tag} />
              <EditableField label="Adresse" value={editing ? form.address : client.address}
                onChange={v => setForm({ ...form, address: v })}
                editing={editing} icon={MapPin} />
            </div>
          </div>

          {/* Notes */}
          <div className="p-8">
            <div className="label-mono mb-5 text-[var(--text-1)]">Notes</div>
            <EditableField label="" value={editing ? form.notes : client.notes}
              onChange={v => setForm({ ...form, notes: v })}
              editing={editing} textarea icon={FileText} />
            {!editing && !client.notes && (
              <p className="text-sm text-[var(--text-4)] italic">Aucune note</p>
            )}
          </div>
        </div>

        {/* ─ Colonne droite : projets ─ */}
        <div>
          <div className="px-8 pt-8 pb-4 flex items-center justify-between">
            <div className="label-mono text-[var(--text-1)]">
              Projets ({client.projects.length})
            </div>
            <button
              onClick={() => navigate('/projects')}
              className="label-mono hover:text-[var(--text-1)] transition-colors flex items-center gap-1">
              Voir tous <ExternalLink size={10} />
            </button>
          </div>

          {client.projects.length === 0 ? (
            <div className="px-8 pb-8">
              <div className="p-6 text-center label-mono"
                style={{ border: '1px dashed var(--border-2)', borderRadius: '12px' }}>
                Aucun projet associé
              </div>
            </div>
          ) : (
            <div style={{ border: '1px solid var(--border-1)', margin: '0 2rem 2rem', borderRadius: '8px' }}>
              {client.projects.map((p, i) => (
                <div key={p.id}
                  style={{ borderBottom: i < client.projects.length - 1 ? '1px solid var(--bg-2)' : 'none' }}>
                  <ProjectRow
                    project={p}
                    onClick={() => navigate(`/projects/${p.id}`)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Contrats ── */}
      {(() => {
        const CONTRACT_STATUS = {
          DRAFT:     { label: 'Brouillon', color: 'var(--text-4)' },
          SENT:      { label: 'Envoyé',   color: '#d97706' },
          SIGNED:    { label: 'Signé',    color: '#16a34a' },
          CANCELLED: { label: 'Annulé',  color: '#ef4444' },
        };
        const allContracts = client.projects.flatMap(p =>
          (p.contracts || []).map(c => ({ ...c, projectName: p.name, projectId: p.id }))
        );
        if (allContracts.length === 0) return null;
        return (
          <div className="px-8 pb-6" style={{ borderBottom: '1px solid var(--border-1)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText size={14} style={{ color: 'var(--accent)' }} />
                <span className="label-mono text-[var(--text-1)]">Contrats ({allContracts.length})</span>
              </div>
              <button
                onClick={() => navigate('/contracts')}
                className="label-mono flex items-center gap-1.5 hover:text-[var(--text-1)] transition-colors">
                Voir tous <ExternalLink size={10} />
              </button>
            </div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border-1)', borderRadius: '12px', overflow: 'hidden' }}>
              {allContracts.map((c, i) => {
                const cfg = CONTRACT_STATUS[c.status] || CONTRACT_STATUS.DRAFT;
                return (
                  <button key={c.id}
                    onClick={() => navigate(`/contracts?id=${c.id}`)}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--hover-1)] transition-colors group text-left"
                    style={{ borderBottom: i < allContracts.length - 1 ? '1px solid var(--bg-2)' : 'none' }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText size={13} className="text-[var(--text-4)] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-[var(--text-1)] font-medium truncate">{c.title}</p>
                        <p className="label-mono truncate">{c.projectName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-xs text-[var(--text-4)]">
                        {format(parseISO(c.createdAt), 'dd/MM/yyyy')}
                      </span>
                      <span className="label-mono px-2.5 py-1 text-xs"
                        style={{ background: `color-mix(in srgb, ${cfg.color} 8%, transparent)`, border: `1px solid color-mix(in srgb, ${cfg.color} 19%, transparent)`, color: cfg.color }}>
                        {cfg.label}
                      </span>
                      <ChevronRight size={13} className="text-[var(--text-5)] group-hover:text-[var(--text-2)] transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Résumé IA ── */}
      <div className="p-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={14} style={{ color: 'var(--accent)' }} />
            <span className="label-mono text-[var(--text-1)]">Résumé IA</span>
            <span className="label-mono" style={{ fontSize: '10px' }}>Groq · llama-3.3-70b</span>
          </div>
          <button
            onClick={loadSummary}
            disabled={summaryLoading}
            className="label-mono flex items-center gap-1.5 hover:text-[var(--text-1)] transition-colors disabled:opacity-50"
            title="Regénérer">
            <RefreshCw size={12} className={summaryLoading ? 'animate-spin' : ''} />
            Regénérer
          </button>
        </div>

        <div className="p-5" style={{ border: '1px solid #1a1a2e', background: '#05051a', borderRadius: '8px' }}>
          {summaryLoading ? (
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin shrink-0" />
              <span className="label-mono">Analyse en cours…</span>
            </div>
          ) : summary ? (
            <p className="text-sm text-[var(--text-1)] leading-relaxed font-mono">{summary}</p>
          ) : (
            <p className="label-mono text-[var(--text-4)]">Résumé non disponible</p>
          )}
        </div>
      </div>
    </div>
  );
}
