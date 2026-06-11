import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Check, Copy, Trash2, ExternalLink, ChevronRight,
  PenLine, Search, Download, Sparkles,
  User, Building2, AlertCircle, X,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import PageHeader from '../components/devflow/PageHeader';
import useAuthStore from '../store/authStore';
import api from '../lib/api';
import { CONTRACT_STATUS_CFG as STATUS_CFG } from '../lib/constants';
import { fieldCls, fieldSty, labelCls } from '../lib/formStyles';

/* ─── Config statuts ──────────────────────────────────────────────────────── */
const STATUS_FLOW = ['DRAFT', 'SENT', 'SIGNED'];

/* ─── SimpleMarkdown ──────────────────────────────────────────────────────── */
function SimpleMarkdown({ content }) {
  if (!content) return null;
  const renderInline = (text) =>
    text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={i} className="text-[var(--text-1)] font-semibold">{part.slice(2, -2)}</strong>
        : part
    );
  return (
    <div className="space-y-1">
      {content.split('\n').map((line, i) => {
        if (line.startsWith('# '))
          return <h1 key={i} className="font-display text-xl text-[var(--text-1)] font-bold mt-8 mb-3 pt-5 border-t border-[var(--border-2)] first:border-0 first:pt-0 first:mt-0">{line.slice(2)}</h1>;
        if (line.startsWith('## '))
          return <h2 key={i} className="text-base text-[var(--text-1)] font-semibold mt-6 mb-2">{line.slice(3)}</h2>;
        if (line.startsWith('### '))
          return <h3 key={i} className="text-sm text-[var(--text-1)] font-semibold mt-4 mb-1">{line.slice(4)}</h3>;
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <div key={i} className="flex gap-2 text-sm text-[var(--text-1)] leading-relaxed pl-2">
              <span className="text-[#0047FF] shrink-0 mt-0.5">–</span>
              <span>{renderInline(line.slice(2))}</span>
            </div>
          );
        if (line.trim() === '') return <div key={i} className="h-3" />;
        return <p key={i} className="text-sm text-[var(--text-1)] leading-relaxed">{renderInline(line)}</p>;
      })}
    </div>
  );
}

/* ─── Badge statut ───────────────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.DRAFT;
  return (
    <span className="label-mono px-2.5 py-1 text-xs whitespace-nowrap"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

/* ─── Formulaire de génération ────────────────────────────────────────────── */
function GeneratePanel({ clients, projects, onGenerated, onCancel }) {
  const { user } = useAuthStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [error,        setError]        = useState(null);

  // Sélection client / projet
  const [clientId,  setClientId]  = useState('');
  const [projectId, setProjectId] = useState('');

  // Freelance (localStorage persisté)
  const [freelancer, setFreelancer] = useState(() => {
    try { return JSON.parse(localStorage.getItem('devflow_freelancer') || '{}'); }
    catch { return {}; }
  });

  // Infos client (auto-remplies)
  const [cInfo, setCInfo] = useState({ name: '', email: '', address: '' });

  // Détails projet (auto-remplis)
  const [pDetails, setPDetails] = useState({
    name: '', description: '', budget: '', timeline: '', deliverables: '',
  });

  // Pré-remplir freelance depuis user
  useEffect(() => {
    if (!freelancer.name && user?.name) {
      const next = { ...freelancer, name: user.name, email: user.email };
      setFreelancer(next);
      localStorage.setItem('devflow_freelancer', JSON.stringify(next));
    }
  }, [user]);

  // Persister freelance
  const setF = (key, val) => {
    const next = { ...freelancer, [key]: val };
    setFreelancer(next);
    localStorage.setItem('devflow_freelancer', JSON.stringify(next));
  };

  // Projets filtrés par client sélectionné
  const clientProjects = clientId
    ? projects.filter(p => (p.clientId || p.client?.id) === Number(clientId))
    : projects;

  // ── Quand client sélectionné → remplir cInfo ──
  const handleClientChange = (id) => {
    setClientId(id);
    setProjectId('');      // réinitialiser le projet
    if (id) {
      const c = clients.find(c => c.id === Number(id));
      if (c) setCInfo({ name: c.name, email: c.email, address: c.address || '' });
    } else {
      setCInfo({ name: '', email: '', address: '' });
    }
  };

  // ── Quand projet sélectionné → remplir pDetails + éventuellement client ──
  const handleProjectChange = (id) => {
    setProjectId(id);
    if (!id) return;
    const p = projects.find(p => p.id === Number(id));
    if (!p) return;

    setPDetails({
      name:         p.name,
      description:  p.description || '',
      budget:       p.budget ? String(p.budget) : '',
      timeline:     p.endDate ? format(parseISO(p.endDate), 'dd MMMM yyyy', { locale: fr }) : '',
      deliverables: '',
    });

    // Auto-remplir le client si pas encore choisi
    const cid = p.clientId ?? p.client?.id;
    if (!clientId && cid) {
      const c = clients.find(c => c.id === cid);
      if (c) {
        setClientId(String(cid));
        setCInfo({ name: c.name, email: c.email, address: c.address || '' });
      }
    }
  };

  // ── Génération ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!freelancer.name?.trim() || !freelancer.email?.trim()) {
      setError('Renseignez votre nom et email de prestataire.');
      return;
    }
    if (!cInfo.name?.trim() || !cInfo.email?.trim()) {
      setError('Renseignez le nom et l\'email du client.');
      return;
    }
    if (!pDetails.name?.trim()) {
      setError('Renseignez le nom du projet.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const { data } = await api.post('/agents/contract', {
        projectId:      projectId ? Number(projectId) : undefined,
        freelancerInfo: {
          name:   freelancer.name,
          email:  freelancer.email,
          status: freelancer.status || 'Auto-entrepreneur',
          siret:  freelancer.siret  || '',
        },
        clientInfo: cInfo,
        projectDetails: {
          name:         pDetails.name,
          description:  pDetails.description,
          budget:       Number(pDetails.budget) || 0,
          timeline:     pDetails.timeline,
          deliverables: pDetails.deliverables,
        },
      });

      if (data.contractId) {
        const { data: full } = await api.get(`/contracts/${data.contractId}`);
        onGenerated(full, false);
      } else {
        // Pas sauvegardé en BDD (pas de projet sélectionné)
        onGenerated({
          id:        null,
          title:     `Contrat — ${pDetails.name}`,
          content:   data.content,
          status:    'DRAFT',
          createdAt: new Date().toISOString(),
          project:   null,
          _unsaved:  true,
        }, true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la génération du contrat.');
      setIsGenerating(false);
    }
  };

  // ── Écran de génération en cours ──
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 px-8">
        <div className="w-10 h-10 border-2 border-[#0047FF] border-t-transparent animate-spin" />
        <div className="text-center space-y-2">
          <p className="font-display text-lg text-[var(--text-1)] font-semibold">Rédaction du contrat…</p>
          <p className="text-[var(--text-3)] text-sm">L'IA génère un contrat juridiquement cohérent.<br />Cela prend 10 à 20 secondes.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 border border-[#0047FF]/30 bg-[#0047FF]/8">
          <Sparkles size={13} className="text-[#0047FF]" />
          <span className="label-mono text-[#0047FF]">{pDetails.name}</span>
        </div>
      </div>
    );
  }

  // ── Formulaire ──
  return (
    <div className="flex flex-col h-full">
      {/* Header du panneau */}
      <div className="px-6 py-4 flex items-center justify-between shrink-0"
        style={{ borderBottom: '1px solid var(--border-1)' }}>
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-[#0047FF]/10 border border-[#0047FF]/20">
            <FileText size={14} className="text-[#0047FF]" />
          </div>
          <div>
            <p className="text-[var(--text-1)] font-semibold text-sm">Nouveau contrat</p>
            <p className="label-mono">Généré par IA · Groq llama-3.3-70b</p>
          </div>
        </div>
        <button onClick={onCancel}
          className="text-[var(--text-4)] hover:text-[var(--text-1)] transition-colors p-1">
          <X size={16} />
        </button>
      </div>

      {/* Corps du formulaire */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">

          {/* ── Sélection client & projet ── */}
          <div>
            <p className="label-mono text-[var(--text-1)] mb-4 flex items-center gap-2">
              <Building2 size={12} className="text-[#0047FF]" />
              Client &amp; projet
              <span className="ml-2 text-[var(--text-4)]" style={{ fontSize: '10px' }}>
                Sélectionnez pour auto-remplir les champs
              </span>
            </p>

            <div className="grid grid-cols-2 gap-3">
              {/* Client */}
              <div>
                <label className={labelCls}>Client</label>
                <div className="relative">
                  <select
                    value={clientId}
                    onChange={e => handleClientChange(e.target.value)}
                    className={fieldCls}
                    style={fieldSty}>
                    <option value="">— Choisir un client —</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.company ? ` · ${c.company}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {clientId && (
                  <p className="label-mono mt-1" style={{ fontSize: '10px', color: '#16a34a' }}>
                    ✓ {cInfo.email}
                  </p>
                )}
              </div>

              {/* Projet */}
              <div>
                <label className={labelCls}>
                  Projet
                  <span className="ml-1 text-[var(--text-4)]">(sauvegarde en BDD)</span>
                </label>
                <select
                  value={projectId}
                  onChange={e => handleProjectChange(e.target.value)}
                  className={fieldCls}
                  style={fieldSty}>
                  <option value="">— Choisir un projet —</option>
                  {clientProjects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.budget ? ` · ${p.budget.toLocaleString('fr-FR')} €` : ''}
                    </option>
                  ))}
                </select>
                {!projectId && (
                  <p className="label-mono mt-1" style={{ fontSize: '10px', color: 'var(--text-4)' }}>
                    Sans projet → contrat non sauvegardé
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Prestataire ── */}
          <div>
            <p className="label-mono text-[var(--text-1)] mb-4 flex items-center gap-2">
              <User size={12} className="text-[#0047FF]" />
              Vos informations
              <span className="ml-2 text-[var(--text-4)]" style={{ fontSize: '10px' }}>Sauvegardé automatiquement</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'name',   label: 'Nom complet *',    placeholder: 'Jean Dupont'           },
                { key: 'email',  label: 'Email pro *',      placeholder: 'vous@domaine.fr'       },
                { key: 'status', label: 'Statut juridique', placeholder: 'Auto-entrepreneur'     },
                { key: 'siret',  label: 'SIRET',            placeholder: '123 456 789 00010'     },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className={labelCls}>{label}</label>
                  <input type="text"
                    value={freelancer[key] || ''}
                    onChange={e => setF(key, e.target.value)}
                    placeholder={placeholder}
                    className={fieldCls} style={fieldSty}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── Informations client ── */}
          <div>
            <p className="label-mono text-[var(--text-1)] mb-4 flex items-center gap-2">
              <Building2 size={12} className="text-[#0047FF]" />
              Informations client
              {clientId && <span className="text-emerald-500" style={{ fontSize: '10px' }}>✓ Auto-rempli</span>}
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'name',  label: 'Nom / Société *', placeholder: 'ACME Corp'      },
                  { key: 'email', label: 'Email *',         placeholder: 'client@acme.fr' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className={labelCls}>{label}</label>
                    <input type="text"
                      value={cInfo[key] || ''}
                      onChange={e => setCInfo(p => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className={fieldCls} style={fieldSty}
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className={labelCls}>Adresse</label>
                <input type="text"
                  value={cInfo.address || ''}
                  onChange={e => setCInfo(p => ({ ...p, address: e.target.value }))}
                  placeholder="12 rue de la Paix, 75001 Paris"
                  className={fieldCls} style={fieldSty}
                />
              </div>
            </div>
          </div>

          {/* ── Détails du projet ── */}
          <div>
            <p className="label-mono text-[var(--text-1)] mb-4 flex items-center gap-2">
              <FileText size={12} className="text-[#0047FF]" />
              Détails de la mission
              {projectId && <span className="text-emerald-500" style={{ fontSize: '10px' }}>✓ Auto-rempli depuis le projet</span>}
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Nom du projet *</label>
                  <input type="text"
                    value={pDetails.name}
                    onChange={e => setPDetails(p => ({ ...p, name: e.target.value }))}
                    placeholder="Mon projet client"
                    className={fieldCls} style={fieldSty}
                  />
                </div>
                <div>
                  <label className={labelCls}>Budget HT (€)</label>
                  <input type="number"
                    value={pDetails.budget}
                    onChange={e => setPDetails(p => ({ ...p, budget: e.target.value }))}
                    placeholder="3500"
                    className={fieldCls} style={fieldSty}
                  />
                </div>
                <div>
                  <label className={labelCls}>Délai / Date livraison</label>
                  <input type="text"
                    value={pDetails.timeline}
                    onChange={e => setPDetails(p => ({ ...p, timeline: e.target.value }))}
                    placeholder="30 jours / 15 mars 2025"
                    className={fieldCls} style={fieldSty}
                  />
                </div>
                <div>
                  <label className={labelCls}>Livrables principaux</label>
                  <input type="text"
                    value={pDetails.deliverables}
                    onChange={e => setPDetails(p => ({ ...p, deliverables: e.target.value }))}
                    placeholder="Site web, espace admin, documentation"
                    className={fieldCls} style={fieldSty}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Description / Contexte</label>
                <textarea
                  value={pDetails.description}
                  onChange={e => setPDetails(p => ({ ...p, description: e.target.value }))}
                  rows={4}
                  placeholder="Décrivez les grandes lignes du projet, les fonctionnalités clés, le contexte…"
                  className={`${fieldCls} resize-none`} style={fieldSty}
                />
              </div>
            </div>
          </div>

          {/* Erreur */}
          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/40 px-4 py-3 text-red-400">
              <AlertCircle size={14} className="shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>
      </form>

      {/* Footer boutons */}
      <div className="px-6 py-4 flex items-center justify-between shrink-0"
        style={{ borderTop: '1px solid var(--border-1)' }}>
        <button type="button" onClick={onCancel}
          className="px-4 py-2.5 text-sm text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors"
          style={{ border: '1px solid var(--border-2)' }}>
          Annuler
        </button>
        <button
          onClick={handleSubmit}
          className="flex items-center gap-2.5 px-6 py-2.5 text-sm font-medium text-[var(--text-1)] transition-colors"
          style={{ background: '#0047FF' }}
          onMouseEnter={e => e.currentTarget.style.background = '#0036CC'}
          onMouseLeave={e => e.currentTarget.style.background = '#0047FF'}>
          <Sparkles size={14} />
          Générer le contrat IA
        </button>
      </div>
    </div>
  );
}

/* ─── Panneau détail contrat ─────────────────────────────────────────────── */
function ContractDetail({ contract, onStatusChange, onDelete }) {
  const navigate = useNavigate();
  const [copied,      setCopied]      = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [updating,    setUpdating]    = useState(false);

  const currentIdx = STATUS_FLOW.indexOf(contract.status);
  const nextStatus = STATUS_FLOW[currentIdx + 1];
  const nextCfg    = nextStatus ? STATUS_CFG[nextStatus] : null;

  const handleCopy = () => {
    navigator.clipboard.writeText(contract.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = async () => {
    if (!contract.id || contract._unsaved) {
      alert('Associez ce contrat à un projet pour pouvoir télécharger le PDF.');
      return;
    }
    setDownloading(true);
    try {
      const res  = await api.get(`/contracts/${contract.id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href          = url;
      link.download      = `contrat-${contract.id}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      // Laisser le temps au navigateur de démarrer le téléchargement avant de révoquer
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 1500);
    } catch (err) {
      console.error('PDF download error:', err);
      alert('Erreur lors du téléchargement. Vérifiez que les serveurs sont démarrés.');
    } finally {
      setDownloading(false);
    }
  };

  const handleStatus = async (status) => {
    setUpdating(true);
    try { await onStatusChange(contract.id, status); }
    finally { setUpdating(false); }
  };

  return (
    <motion.div key={contract.id}
      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
      className="flex flex-col h-full">

      {/* Header */}
      <div className="px-6 py-5 shrink-0" style={{ borderBottom: '1px solid var(--border-1)' }}>
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="min-w-0">
            <h2 className="font-display text-lg text-[var(--text-1)] font-semibold truncate">{contract.title}</h2>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {contract.project?.client && (
                <button onClick={() => navigate(`/clients/${contract.project.client.id}`)}
                  className="label-mono flex items-center gap-1 hover:text-[var(--text-1)] transition-colors">
                  <Building2 size={10} />
                  {contract.project.client.name}
                  {contract.project.client.company ? ` — ${contract.project.client.company}` : ''}
                </button>
              )}
              {contract.project && (
                <button onClick={() => navigate(`/projects/${contract.project.id}`)}
                  className="label-mono flex items-center gap-1 hover:text-[var(--text-1)] transition-colors">
                  {contract.project.name} <ExternalLink size={9} />
                </button>
              )}
              {contract._unsaved && (
                <span className="label-mono text-amber-500" style={{ fontSize: '10px' }}>
                  ⚠ Non sauvegardé — associez un projet
                </span>
              )}
              <span className="label-mono">
                {format(parseISO(contract.createdAt), 'dd MMM yyyy', { locale: fr })}
              </span>
            </div>
          </div>
          <StatusBadge status={contract.status} />
        </div>

        {/* Actions + workflow */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Bouton PDF — CTA principal */}
          <button
            onClick={handleDownloadPDF}
            disabled={downloading || contract._unsaved}
            title={contract._unsaved ? 'Associez un projet pour activer le PDF' : 'Télécharger en PDF'}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--text-1)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#0047FF' }}
            onMouseEnter={e => !downloading && !contract._unsaved && (e.currentTarget.style.background = '#0036CC')}
            onMouseLeave={e => !downloading && !contract._unsaved && (e.currentTarget.style.background = '#0047FF')}>
            {downloading
              ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent animate-spin" /> Génération…</>
              : <><Download size={13} /> Télécharger PDF</>}
          </button>

          {/* Workflow statut */}
          {nextCfg && !contract._unsaved && (
            <button
              onClick={() => handleStatus(nextStatus)}
              disabled={updating}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              style={{ border: `1px solid ${nextCfg.color}60`, color: nextCfg.color, background: `${nextCfg.color}10` }}
              onMouseEnter={e => !updating && (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={e => !updating && (e.currentTarget.style.opacity = '1')}>
              <ChevronRight size={12} />
              {nextCfg.label}
            </button>
          )}
          {contract.status !== 'DRAFT' && !contract._unsaved && (
            <button onClick={() => handleStatus('DRAFT')} disabled={updating}
              className="px-3 py-2 text-xs text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors disabled:opacity-50"
              style={{ border: '1px solid var(--border-2)' }}>
              Brouillon
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors"
              style={{ border: '1px solid var(--border-2)' }}>
              {copied ? <><Check size={12} className="text-emerald-400" /> Copié</> : <><Copy size={12} /> Copier</>}
            </button>
            {!contract._unsaved && (
              <button onClick={() => onDelete(contract.id)}
                className="p-2 text-[var(--text-4)] hover:text-red-400 transition-colors"
                style={{ border: '1px solid var(--border-2)' }}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contenu Markdown */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <SimpleMarkdown content={contract.content} />
      </div>
    </motion.div>
  );
}

/* ─── Page principale ─────────────────────────────────────────────────────── */
export default function Contracts() {
  const [searchParams, setSearchParams]= useSearchParams();

  const [contracts, setContracts] = useState([]);
  const [clients,   setClients]   = useState([]);
  const [projects,  setProjects]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('ALL');
  const [mode,      setMode]      = useState('list'); // 'list' | 'generate'

  // Contrat sélectionné (URL param) ou généré (objet local non sauvegardé)
  const [tempContract, setTempContract] = useState(null);
  const selectedId = searchParams.get('id') ? Number(searchParams.get('id')) : null;
  const selected   = tempContract ?? (contracts.find(c => c.id === selectedId) || null);

  const load = useCallback(() =>
    Promise.all([
      api.get('/contracts'),
      api.get('/clients'),
      api.get('/projects'),
    ]).then(([c, cl, p]) => {
      setContracts(c.data);
      setClients(cl.data);
      setProjects(p.data);
    }).finally(() => setLoading(false))
  , []);

  useEffect(() => { load(); }, [load]);

  // Auto-sélectionner le 1er si aucun sélectionné et en mode liste
  useEffect(() => {
    if (!loading && contracts.length > 0 && !selectedId && mode === 'list' && !tempContract) {
      setSearchParams({ id: contracts[0].id }, { replace: true });
    }
  }, [loading, contracts, mode]);

  const handleStatusChange = async (id, status) => {
    await api.put(`/contracts/${id}`, { status });
    setContracts(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce contrat définitivement ?')) return;
    await api.delete(`/contracts/${id}`);
    setContracts(prev => prev.filter(c => c.id !== id));
    if (selectedId === id) setSearchParams({});
    setTempContract(null);
  };

  const handleGenerated = (newContract, unsaved) => {
    if (!unsaved && newContract.id) {
      setContracts(prev => [newContract, ...prev]);
      setSearchParams({ id: newContract.id });
      setTempContract(null);
    } else {
      setTempContract(newContract);
      setSearchParams({});
    }
    setMode('list');
  };

  const filtered = contracts.filter(c => {
    const matchSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.project?.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.project?.client?.name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'ALL' || c.status === filter;
    return matchSearch && matchFilter;
  });

  const kpis = [
    { label: 'Total',     value: contracts.length },
    { label: 'Brouillon', value: contracts.filter(c => c.status === 'DRAFT').length },
    { label: 'Envoyés',   value: contracts.filter(c => c.status === 'SENT').length  },
    { label: 'Signés',    value: contracts.filter(c => c.status === 'SIGNED').length },
  ];

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>
      <PageHeader
        eyebrow="Workspace / Contrats"
        title="Contrats"
        description="Générez, gérez et exportez vos contrats de prestation en PDF."
        actions={
          <button
            onClick={() => { setMode(mode === 'generate' ? 'list' : 'generate'); setTempContract(null); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--text-1)] transition-colors"
            style={{ background: mode === 'generate' ? 'var(--border-2)' : '#0047FF' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            {mode === 'generate' ? <><X size={14} /> Annuler</> : <><PenLine size={14} /> Nouveau contrat</>}
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-4 shrink-0" style={{ borderBottom: '1px solid var(--border-1)' }}>
        {kpis.map((k, i) => (
          <div key={k.label} className="px-8 py-6"
            style={{ borderRight: i < 3 ? '1px solid var(--border-1)' : 'none' }}>
            <div className="label-mono mb-2">{k.label}</div>
            <div className="font-display text-3xl text-[var(--text-1)]">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Corps — deux panneaux */}
      <div className="flex flex-1 overflow-hidden">

        {/* ─ Liste gauche ─ */}
        <div className="flex flex-col shrink-0"
          style={{ width: '300px', borderRight: '1px solid var(--border-1)' }}>

          {/* Recherche + filtres */}
          <div className="p-3 space-y-2 shrink-0" style={{ borderBottom: '1px solid var(--border-1)' }}>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-4)]" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="w-full pl-9 pr-3 py-2 bg-[var(--bg-0)] text-[var(--text-1)] text-sm outline-none"
                style={{ border: '1px solid var(--border-2)' }} />
            </div>
            <div className="flex gap-1 flex-wrap">
              {[['ALL', 'Tous'], ...Object.entries(STATUS_CFG).map(([k, v]) => [k, v.label])].map(([k, label]) => (
                <button key={k} onClick={() => setFilter(k)}
                  className={`px-2.5 py-1 text-xs transition-colors ${filter === k ? 'text-[var(--text-1)] bg-[var(--bg-3)]' : 'text-[var(--text-3)] hover:text-[var(--text-1)]'}`}
                  style={{ border: '1px solid var(--border-2)' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="label-mono text-center py-10">Chargement…</div>
            ) : filtered.length === 0 ? (
              <div className="label-mono text-center py-10 px-4">
                {search ? 'Aucun résultat' : 'Aucun contrat'}
              </div>
            ) : (
              filtered.map((c) => {
                const cfg     = STATUS_CFG[c.status] || STATUS_CFG.DRAFT;
                const isActive = selectedId === c.id && mode === 'list';
                return (
                  <button key={c.id}
                    onClick={() => { setSearchParams({ id: c.id }); setMode('list'); setTempContract(null); }}
                    className="w-full text-left px-4 py-4 transition-colors hover:bg-[var(--hover-1)]"
                    style={{
                      borderBottom: '1px solid var(--bg-2)',
                      background: isActive ? 'var(--bg-1)' : undefined,
                      borderLeft: isActive ? '2px solid #0047FF' : '2px solid transparent',
                    }}>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-sm text-[var(--text-1)] font-medium truncate leading-snug">{c.title}</p>
                      <span className="shrink-0 w-2 h-2 rounded-full mt-1.5" style={{ background: cfg.color }} />
                    </div>
                    {c.project?.client && (
                      <p className="label-mono truncate">{c.project.client.name}</p>
                    )}
                    <p className="label-mono truncate">{c.project?.name || '—'}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-mono text-xs text-[var(--text-4)]">
                        {format(parseISO(c.createdAt), 'dd/MM/yyyy')}
                      </span>
                      <StatusBadge status={c.status} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ─ Panneau droit ─ */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {mode === 'generate' ? (
              <motion.div key="generate"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="h-full">
                <GeneratePanel
                  clients={clients}
                  projects={projects}
                  onGenerated={handleGenerated}
                  onCancel={() => setMode('list')}
                />
              </motion.div>
            ) : selected ? (
              <motion.div key={selected.id ?? 'temp'}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="h-full overflow-hidden flex flex-col">
                <ContractDetail
                  contract={selected}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                />
              </motion.div>
            ) : (
              <motion.div key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full gap-5 text-center px-8">
                <div className="p-4 bg-[var(--bg-2)] border border-[var(--border-2)]">
                  <FileText size={24} className="text-[var(--text-4)]" />
                </div>
                <div>
                  <p className="text-[var(--text-1)] font-medium mb-1">
                    {contracts.length === 0 ? 'Aucun contrat' : 'Sélectionnez un contrat'}
                  </p>
                  <p className="label-mono">
                    {contracts.length === 0
                      ? 'Générez votre premier contrat en remplissant le formulaire.'
                      : 'Cliquez sur un contrat dans la liste pour le consulter.'}
                  </p>
                </div>
                {contracts.length === 0 && (
                  <button onClick={() => setMode('generate')}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[var(--text-1)] mt-1"
                    style={{ background: '#0047FF' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#0036CC'}
                    onMouseLeave={e => e.currentTarget.style.background = '#0047FF'}>
                    <PenLine size={13} />
                    Nouveau contrat
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
