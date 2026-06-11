import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Receipt, Check, Trash2, ExternalLink, ChevronRight,
  Plus, Search, Download, X, Building2, AlertCircle,
  Calendar as CalendarIcon, FileText, Trash,
} from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import PageHeader from '../components/devflow/PageHeader';
import api from '../lib/api';
import { fmtEUR } from '../lib/format';
import { INVOICE_STATUS_CFG as STATUS_CFG, INVOICE_TYPE_CFG as TYPE_CFG } from '../lib/constants';
import { fieldCls, fieldSty, labelCls } from '../lib/formStyles';

/* ─── Config statuts ──────────────────────────────────────────────────────── */
const STATUS_FLOW = ['DRAFT', 'SENT', 'PAID'];

const isOverdue = (inv) =>
  ['SENT', 'DRAFT'].includes(inv.status) && inv.dueDate && isPast(parseISO(inv.dueDate));

/* ─── Badge statut (avec détection "en retard" dynamique) ─────────────────── */
function StatusBadge({ invoice }) {
  const effective = isOverdue(invoice) ? 'OVERDUE' : invoice.status;
  const cfg = STATUS_CFG[effective] || STATUS_CFG.DRAFT;
  return (
    <span className="label-mono px-2.5 py-1 text-xs whitespace-nowrap"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

/* ─── Panneau de création ─────────────────────────────────────────────────── */
function CreatePanel({ projects, onCreated, onCancel }) {
  const [projectId, setProjectId] = useState('');
  const [type,      setType]      = useState('FULL');
  const [tax,       setTax]       = useState(20);
  const [dueDate,   setDueDate]   = useState('');
  const [notes,     setNotes]     = useState('');
  const [items, setItems] = useState([{ description: '', quantity: 1, unitPrice: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState(null);

  const project = projects.find(p => p.id === Number(projectId));

  const addItem    = () => setItems(prev => [...prev, { description: '', quantity: 1, unitPrice: '' }]);
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const setItem    = (i, key, val) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [key]: val } : it));

  const subtotal = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  const taxAmount = subtotal * (Number(tax) / 100);
  const totalTTC  = subtotal + taxAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!projectId) return setError('Sélectionnez un projet.');
    const cleanItems = items.filter(it => it.description.trim());
    if (cleanItems.length === 0) return setError('Ajoutez au moins une ligne de prestation.');

    setSubmitting(true);
    try {
      const { data } = await api.post('/invoices', {
        projectId: Number(projectId),
        type, tax: Number(tax) || 0,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
        items: cleanItems.map(it => ({
          description: it.description.trim(),
          quantity:  Number(it.quantity)  || 1,
          unitPrice: Number(it.unitPrice) || 0,
        })),
      });
      onCreated(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création de la facture.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--border-1)' }}>
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-lg">
            <Receipt size={14} className="text-[var(--accent)]" />
          </div>
          <div>
            <p className="text-[var(--text-1)] font-semibold text-sm">Nouvelle facture</p>
            <p className="label-mono">Numérotation automatique · PDF exportable</p>
          </div>
        </div>
        <button onClick={onCancel} className="text-[var(--text-4)] hover:text-[var(--text-1)] transition-colors p-1">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">

          {/* Projet & type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Projet *</label>
              <select value={projectId} onChange={e => setProjectId(e.target.value)} className={fieldCls} style={fieldSty}>
                <option value="">— Choisir un projet —</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.client ? ` · ${p.client.name}` : ''}
                  </option>
                ))}
              </select>
              {project?.client && (
                <p className="label-mono mt-1" style={{ fontSize: '10px', color: '#16a34a' }}>
                  ✓ {project.client.name}{project.client.company ? ` — ${project.client.company}` : ''}
                </p>
              )}
            </div>
            <div>
              <label className={labelCls}>Type de document</label>
              <select value={type} onChange={e => setType(e.target.value)} className={fieldCls} style={fieldSty}>
                {Object.entries(TYPE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>

          {/* Lignes de prestation */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="label-mono text-[var(--text-1)] flex items-center gap-2">
                <FileText size={12} className="text-[var(--accent)]" />
                Lignes de prestation
              </p>
              <button type="button" onClick={addItem}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors"
                style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }}>
                <Plus size={11} /> Ajouter une ligne
              </button>
            </div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <input type="text" placeholder="Description de la prestation"
                    value={it.description} onChange={e => setItem(i, 'description', e.target.value)}
                    className={fieldCls} style={{ ...fieldSty, flex: 3 }} />
                  <input type="number" min="0" step="0.5" placeholder="Qté"
                    value={it.quantity} onChange={e => setItem(i, 'quantity', e.target.value)}
                    className={fieldCls} style={{ ...fieldSty, flex: 1 }} />
                  <input type="number" min="0" step="0.01" placeholder="Prix unit. €"
                    value={it.unitPrice} onChange={e => setItem(i, 'unitPrice', e.target.value)}
                    className={fieldCls} style={{ ...fieldSty, flex: 1 }} />
                  <div className="flex items-center justify-end font-mono text-sm text-[var(--text-2)] px-2 py-2.5" style={{ flex: 1 }}>
                    {fmtEUR((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0))}
                  </div>
                  <button type="button" onClick={() => removeItem(i)} disabled={items.length === 1}
                    className="p-2.5 text-[var(--text-4)] hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }}>
                    <Trash size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* TVA, échéance, totaux */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>TVA (%)</label>
              <input type="number" min="0" max="100" step="0.5"
                value={tax} onChange={e => setTax(e.target.value)}
                className={fieldCls} style={fieldSty} />
            </div>
            <div>
              <label className={labelCls}>Date d'échéance</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className={fieldCls} style={fieldSty} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Notes (conditions de paiement, RIB…)</label>
            <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Paiement à réception, par virement bancaire — IBAN FR76…"
              className={`${fieldCls} resize-none`} style={fieldSty} />
          </div>

          {/* Récap totaux */}
          <div className="p-4 space-y-1.5" style={{ border: '1px solid var(--border-2)', background: 'var(--bg-1)', borderRadius: '8px' }}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-3)]">Sous-total HT</span>
              <span className="font-mono text-[var(--text-1)]">{fmtEUR(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-3)]">TVA ({tax || 0}%)</span>
              <span className="font-mono text-[var(--text-1)]">{fmtEUR(taxAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-base pt-1.5 mt-1.5" style={{ borderTop: '1px solid var(--border-2)' }}>
              <span className="text-[var(--text-1)] font-semibold">Total TTC</span>
              <span className="font-mono text-[var(--accent)] font-semibold">{fmtEUR(totalTTC)}</span>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/40 px-4 py-3 text-red-400">
              <AlertCircle size={14} className="shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>
      </form>

      <div className="px-6 py-4 flex items-center justify-between shrink-0" style={{ borderTop: '1px solid var(--border-1)' }}>
        <button type="button" onClick={onCancel}
          className="px-4 py-2.5 text-sm text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors"
          style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }}>
          Annuler
        </button>
        <button onClick={handleSubmit} disabled={submitting}
          className="flex items-center gap-2.5 px-6 py-2.5 text-sm font-medium text-[var(--text-1)] transition-colors disabled:opacity-50"
          style={{ background: 'var(--accent)', borderRadius: '8px' }}
          onMouseEnter={e => !submitting && (e.currentTarget.style.background = 'var(--accent-hover)')}
          onMouseLeave={e => !submitting && (e.currentTarget.style.background = 'var(--accent)')}>
          {submitting
            ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" /> Création…</>
            : <><Receipt size={14} /> Créer la facture</>}
        </button>
      </div>
    </div>
  );
}

/* ─── Panneau détail facture ──────────────────────────────────────────────── */
function InvoiceDetail({ invoice, onStatusChange, onDelete }) {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [updating,    setUpdating]    = useState(false);

  const currentIdx = STATUS_FLOW.indexOf(invoice.status);
  const nextStatus = STATUS_FLOW[currentIdx + 1];
  const nextCfg    = nextStatus ? STATUS_CFG[nextStatus] : null;

  const subtotal  = invoice.amount || 0;
  const taxAmount = subtotal * ((invoice.tax ?? 20) / 100);
  const totalTTC  = subtotal + taxAmount;

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const res  = await api.get(`/invoices/${invoice.id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href          = url;
      link.download      = `${invoice.number}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 1500);
    } catch (err) {
      console.error('PDF download error:', err);
      alert('Erreur lors du téléchargement. Vérifiez que les serveurs sont démarrés.');
    } finally {
      setDownloading(false);
    }
  };

  const handleStatus = async (status) => {
    setUpdating(true);
    try { await onStatusChange(invoice.id, status); }
    finally { setUpdating(false); }
  };

  return (
    <motion.div key={invoice.id}
      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
      className="flex flex-col h-full">

      {/* Header */}
      <div className="px-6 py-5 shrink-0" style={{ borderBottom: '1px solid var(--border-1)' }}>
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg text-[var(--text-1)] font-semibold truncate">{invoice.number}</h2>
              <span className="label-mono px-2 py-0.5" style={{ border: '1px solid var(--border-2)', fontSize: '10px', borderRadius: '8px' }}>
                {TYPE_CFG[invoice.type]?.label || invoice.type}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {invoice.project?.client && (
                <button onClick={() => navigate(`/clients/${invoice.project.client.id}`)}
                  className="label-mono flex items-center gap-1 hover:text-[var(--text-1)] transition-colors">
                  <Building2 size={10} />
                  {invoice.project.client.name}
                  {invoice.project.client.company ? ` — ${invoice.project.client.company}` : ''}
                </button>
              )}
              {invoice.project && (
                <button onClick={() => navigate(`/projects/${invoice.project.id}`)}
                  className="label-mono flex items-center gap-1 hover:text-[var(--text-1)] transition-colors">
                  {invoice.project.name} <ExternalLink size={9} />
                </button>
              )}
              <span className="label-mono">
                {format(parseISO(invoice.createdAt), 'dd MMM yyyy', { locale: fr })}
              </span>
              {invoice.dueDate && (
                <span className="label-mono flex items-center gap-1">
                  <CalendarIcon size={10} />
                  Échéance {format(parseISO(invoice.dueDate), 'dd MMM yyyy', { locale: fr })}
                </span>
              )}
            </div>
          </div>
          <StatusBadge invoice={invoice} />
        </div>

        {/* Actions + workflow */}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleDownloadPDF} disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--text-1)] transition-colors disabled:opacity-40"
            style={{ background: 'var(--accent)', borderRadius: '8px' }}
            onMouseEnter={e => !downloading && (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={e => !downloading && (e.currentTarget.style.background = 'var(--accent)')}>
            {downloading
              ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" /> Génération…</>
              : <><Download size={13} /> Télécharger PDF</>}
          </button>

          {nextCfg && (
            <button onClick={() => handleStatus(nextStatus)} disabled={updating}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              style={{ border: `1px solid color-mix(in srgb, ${nextCfg.color} 38%, transparent)`, color: nextCfg.color, background: `color-mix(in srgb, ${nextCfg.color} 6%, transparent)` }}>
              <ChevronRight size={12} />
              Marquer « {nextCfg.label} »
            </button>
          )}
          {!['CANCELLED'].includes(invoice.status) && invoice.status !== 'DRAFT' && (
            <button onClick={() => handleStatus('DRAFT')} disabled={updating}
              className="px-3 py-2 text-xs text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors disabled:opacity-50"
              style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }}>
              Repasser en brouillon
            </button>
          )}
          {invoice.status !== 'CANCELLED' && invoice.status !== 'PAID' && (
            <button onClick={() => handleStatus('CANCELLED')} disabled={updating}
              className="px-3 py-2 text-xs text-[var(--text-3)] hover:text-red-400 transition-colors disabled:opacity-50"
              style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }}>
              Annuler
            </button>
          )}

          <div className="ml-auto">
            <button onClick={() => onDelete(invoice.id)}
              className="p-2 text-[var(--text-4)] hover:text-red-400 transition-colors"
              style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Corps — détail des lignes */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        <div>
          <p className="label-mono text-[var(--text-1)] mb-3">Lignes de prestation</p>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border-1)', borderRadius: '12px', overflow: 'hidden' }}>
            <div className="grid grid-cols-12 px-4 py-2.5" style={{ background: 'var(--bg-1)', borderBottom: '1px solid var(--border-1)' }}>
              <div className="col-span-6 label-mono">Description</div>
              <div className="col-span-2 label-mono text-right">Qté</div>
              <div className="col-span-2 label-mono text-right">Prix unit.</div>
              <div className="col-span-2 label-mono text-right">Total HT</div>
            </div>
            {(invoice.items || []).map((it, i) => (
              <div key={it.id ?? i} className="grid grid-cols-12 px-4 py-3 text-sm"
                style={{ borderBottom: i < invoice.items.length - 1 ? '1px solid var(--bg-2)' : 'none' }}>
                <div className="col-span-6 text-[var(--text-1)]">{it.description}</div>
                <div className="col-span-2 text-right font-mono text-[var(--text-2)]">{it.quantity}</div>
                <div className="col-span-2 text-right font-mono text-[var(--text-2)]">{fmtEUR(it.unitPrice)}</div>
                <div className="col-span-2 text-right font-mono text-[var(--text-1)]">{fmtEUR(it.total)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Totaux */}
        <div className="flex justify-end">
          <div className="w-72 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-3)]">Sous-total HT</span>
              <span className="font-mono text-[var(--text-1)]">{fmtEUR(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-3)]">TVA ({invoice.tax ?? 20}%)</span>
              <span className="font-mono text-[var(--text-1)]">{fmtEUR(taxAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-base pt-1.5 mt-1.5" style={{ borderTop: '1px solid var(--border-2)' }}>
              <span className="text-[var(--text-1)] font-semibold">Total TTC</span>
              <span className="font-mono text-[var(--accent)] font-semibold">{fmtEUR(totalTTC)}</span>
            </div>
            {invoice.paidAt && (
              <div className="flex items-center gap-1.5 justify-end pt-2 text-xs" style={{ color: '#16a34a' }}>
                <Check size={12} />
                Payée le {format(parseISO(invoice.paidAt), 'dd MMM yyyy', { locale: fr })}
              </div>
            )}
          </div>
        </div>

        {invoice.notes && (
          <div>
            <p className="label-mono text-[var(--text-1)] mb-2">Notes</p>
            <p className="text-sm text-[var(--text-2)] leading-relaxed whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Page principale ─────────────────────────────────────────────────────── */
export default function Invoices() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [invoices, setInvoices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('ALL');
  const [mode,     setMode]     = useState('list'); // 'list' | 'create'

  const selectedId = searchParams.get('id') ? Number(searchParams.get('id')) : null;
  const selected   = invoices.find(i => i.id === selectedId) || null;

  const load = useCallback(() =>
    Promise.all([
      api.get('/invoices'),
      api.get('/projects'),
    ]).then(([i, p]) => {
      setInvoices(i.data);
      setProjects(p.data);
    }).finally(() => setLoading(false))
  , []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!loading && invoices.length > 0 && !selectedId && mode === 'list') {
      setSearchParams({ id: invoices[0].id }, { replace: true });
    }
  }, [loading, invoices, mode]);

  const handleStatusChange = async (id, status) => {
    const { data } = await api.put(`/invoices/${id}`, { status });
    setInvoices(prev => prev.map(i => i.id === id ? data : i));
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette facture définitivement ?')) return;
    await api.delete(`/invoices/${id}`);
    setInvoices(prev => prev.filter(i => i.id !== id));
    if (selectedId === id) setSearchParams({});
  };

  const handleCreated = (invoice) => {
    setInvoices(prev => [invoice, ...prev]);
    setSearchParams({ id: invoice.id });
    setMode('list');
  };

  const filtered = invoices.filter(i => {
    const matchSearch =
      i.number.toLowerCase().includes(search.toLowerCase()) ||
      i.project?.name?.toLowerCase().includes(search.toLowerCase()) ||
      i.project?.client?.name?.toLowerCase().includes(search.toLowerCase());
    const effectiveStatus = isOverdue(i) ? 'OVERDUE' : i.status;
    const matchFilter = filter === 'ALL' || effectiveStatus === filter;
    return matchSearch && matchFilter;
  });

  const kpis = useMemo(() => {
    const totalTTC = (inv) => {
      const sub = inv.amount || 0;
      return sub + sub * ((inv.tax ?? 20) / 100);
    };
    const paid     = invoices.filter(i => i.status === 'PAID');
    const pending  = invoices.filter(i => ['SENT', 'DRAFT'].includes(i.status) && !isOverdue(i));
    const overdue  = invoices.filter(isOverdue);
    return [
      { label: 'Encaissé',    value: fmtEUR(paid.reduce((s, i) => s + totalTTC(i), 0)),    accent: '#16a34a' },
      { label: 'En attente',  value: fmtEUR(pending.reduce((s, i) => s + totalTTC(i), 0)), accent: '#d97706' },
      { label: 'En retard',   value: fmtEUR(overdue.reduce((s, i) => s + totalTTC(i), 0)), accent: '#ef4444' },
      { label: 'Total émis',  value: fmtEUR(invoices.reduce((s, i) => s + totalTTC(i), 0)), accent: 'var(--accent)' },
    ];
  }, [invoices]);

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>
      <PageHeader
        eyebrow="Workspace / Factures"
        title="Factures"
        description="Émettez devis, acomptes et factures, suivez les paiements et exportez vos PDF."
        actions={
          <button
            onClick={() => setMode(mode === 'create' ? 'list' : 'create')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--text-1)] transition-colors"
            style={{ background: mode === 'create' ? 'var(--border-2)' : 'var(--accent)' }}>
            {mode === 'create' ? <><X size={14} /> Annuler</> : <><Plus size={14} /> Nouvelle facture</>}
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 shrink-0 px-8 py-5">
        {kpis.map((k) => (
          <div key={k.label} className="card px-6 py-4">
            <div className="label-mono mb-2">{k.label}</div>
            <div className="font-display text-2xl" style={{ color: k.accent }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Corps — deux panneaux */}
      <div className="flex flex-1 overflow-hidden">

        {/* Liste gauche */}
        <div className="flex flex-col shrink-0" style={{ width: '320px', borderRight: '1px solid var(--border-1)' }}>
          <div className="p-3 space-y-2 shrink-0" style={{ borderBottom: '1px solid var(--border-1)' }}>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-4)]" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="w-full pl-9 pr-3 py-2 bg-[var(--bg-0)] text-[var(--text-1)] text-sm outline-none"
                style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }} />
            </div>
            <div className="flex gap-1 flex-wrap">
              {[['ALL', 'Toutes'], ...Object.entries(STATUS_CFG).map(([k, v]) => [k, v.label])].map(([k, label]) => (
                <button key={k} onClick={() => setFilter(k)}
                  className={`px-2.5 py-1 text-xs transition-colors ${filter === k ? 'text-[var(--text-1)] bg-[var(--bg-3)]' : 'text-[var(--text-3)] hover:text-[var(--text-1)]'}`}
                  style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="label-mono text-center py-10">Chargement…</div>
            ) : filtered.length === 0 ? (
              <div className="label-mono text-center py-10 px-4">
                {search ? 'Aucun résultat' : 'Aucune facture'}
              </div>
            ) : (
              filtered.map(inv => {
                const effective = isOverdue(inv) ? 'OVERDUE' : inv.status;
                const cfg = STATUS_CFG[effective] || STATUS_CFG.DRAFT;
                const isActive = selectedId === inv.id && mode === 'list';
                const subTotal = inv.amount || 0;
                const ttc = subTotal + subTotal * ((inv.tax ?? 20) / 100);
                return (
                  <button key={inv.id}
                    onClick={() => { setSearchParams({ id: inv.id }); setMode('list'); }}
                    className="w-full text-left px-4 py-4 transition-colors hover:bg-[var(--hover-1)]"
                    style={{
                      borderBottom: '1px solid var(--bg-2)',
                      background: isActive ? 'var(--bg-1)' : undefined,
                      borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                    }}>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-sm text-[var(--text-1)] font-medium truncate leading-snug">{inv.number}</p>
                      <span className="shrink-0 w-2 h-2 rounded-full mt-1.5" style={{ background: cfg.color }} />
                    </div>
                    {inv.project?.client && (
                      <p className="label-mono truncate">{inv.project.client.name}</p>
                    )}
                    <p className="label-mono truncate">{inv.project?.name || '—'}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-mono text-xs text-[var(--text-2)]">{fmtEUR(ttc)}</span>
                      <StatusBadge invoice={inv} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Panneau droit */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {mode === 'create' ? (
              <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                <CreatePanel projects={projects} onCreated={handleCreated} onCancel={() => setMode('list')} />
              </motion.div>
            ) : selected ? (
              <motion.div key={selected.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-hidden flex flex-col">
                <InvoiceDetail invoice={selected} onStatusChange={handleStatusChange} onDelete={handleDelete} />
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full gap-5 text-center px-8">
                <div className="p-4 bg-[var(--bg-2)] border border-[var(--border-2)] rounded-lg">
                  <Receipt size={24} className="text-[var(--text-4)]" />
                </div>
                <div>
                  <p className="text-[var(--text-1)] font-medium mb-1">
                    {invoices.length === 0 ? 'Aucune facture' : 'Sélectionnez une facture'}
                  </p>
                  <p className="label-mono">
                    {invoices.length === 0
                      ? 'Créez votre première facture en remplissant le formulaire.'
                      : 'Cliquez sur une facture dans la liste pour la consulter.'}
                  </p>
                </div>
                {invoices.length === 0 && (
                  <button onClick={() => setMode('create')}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[var(--text-1)] mt-1"
                    style={{ background: 'var(--accent)', borderRadius: '8px' }}>
                    <Plus size={13} />
                    Nouvelle facture
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
