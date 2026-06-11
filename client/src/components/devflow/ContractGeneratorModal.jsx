import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, FileText, Sparkles, Check, Copy, ExternalLink,
  User, Building2, ChevronRight, AlertCircle,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import api from '../../lib/api';

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
          return <h1 key={i} className="font-display text-xl text-[var(--text-1)] font-bold mt-8 mb-3 pt-5 border-t border-[var(--border-2)]">{line.slice(2)}</h1>;
        if (line.startsWith('## '))
          return <h2 key={i} className="text-base text-[var(--text-1)] font-semibold mt-6 mb-2">{line.slice(3)}</h2>;
        if (line.startsWith('### '))
          return <h3 key={i} className="text-sm text-[var(--text-1)] font-semibold mt-4 mb-1">{line.slice(4)}</h3>;
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <div key={i} className="flex gap-2 text-sm text-[var(--text-1)] leading-relaxed pl-2">
              <span className="text-[var(--accent)] shrink-0 mt-0.5">–</span>
              <span>{renderInline(line.slice(2))}</span>
            </div>
          );
        if (line.trim() === '') return <div key={i} className="h-3" />;
        return <p key={i} className="text-sm text-[var(--text-1)] leading-relaxed">{renderInline(line)}</p>;
      })}
    </div>
  );
}

/* ─── Modal principale ───────────────────────────────────────────────────── */
export default function ContractGeneratorModal({ analysis, onClose }) {
  const navigate       = useNavigate();
  const { user }       = useAuthStore();

  const [step, setStep] = useState('form'); // 'form' | 'generating' | 'result'
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Résultat
  const [contractContent, setContractContent] = useState('');
  const [contractId,      setContractId]      = useState(null);

  // Données externes
  const [clients,  setClients]  = useState([]);
  const [projects, setProjects] = useState([]);

  // Freelance (persisté localStorage)
  const [freelancer, setFreelancer] = useState(() => {
    try { return JSON.parse(localStorage.getItem('devflow_freelancer') || '{}'); }
    catch { return {}; }
  });

  // Client
  const [clientMode,   setClientMode]   = useState('select'); // 'select' | 'manual'
  const [selectedClient, setSelectedClient] = useState('');
  const [manualClient, setManualClient] = useState({ name: '', email: '', address: '' });

  // Projet (optionnel — pour sauvegarder en BDD)
  const [selectedProject, setSelectedProject] = useState('');

  // ── Chargement clients + projets ──
  useEffect(() => {
    Promise.all([api.get('/clients'), api.get('/projects')])
      .then(([c, p]) => { setClients(c.data); setProjects(p.data); });
  }, []);

  // ── Pré-remplissage freelance depuis user ──
  useEffect(() => {
    if (!freelancer.name && user?.name) {
      setFreelancer(p => ({ ...p, name: user.name, email: user.email }));
    }
  }, [user]);

  // ── Persist freelance ──
  useEffect(() => {
    localStorage.setItem('devflow_freelancer', JSON.stringify(freelancer));
  }, [freelancer]);

  // ── Génération ──
  const handleGenerate = async () => {
    setError(null);
    if (!freelancer.name || !freelancer.email) {
      setError('Renseignez votre nom et email de prestataire.');
      return;
    }
    const client = clientMode === 'select'
      ? clients.find(c => c.id === Number(selectedClient))
      : null;
    const clientInfo = clientMode === 'select' && client
      ? { name: client.name, email: client.email, address: client.address || '' }
      : manualClient;
    if (!clientInfo.name || !clientInfo.email) {
      setError('Renseignez les informations du client.');
      return;
    }

    setStep('generating');
    try {
      const { data } = await api.post('/agents/contract', {
        projectId: selectedProject ? Number(selectedProject) : undefined,
        freelancerInfo: {
          name:   freelancer.name,
          email:  freelancer.email,
          status: freelancer.status || 'Auto-entrepreneur',
          siret:  freelancer.siret  || '',
        },
        clientInfo,
        projectDetails: {
          name:         analysis.projectName,
          description:  analysis.summary,
          budget:       analysis.budget?.totalHT,
          timeline:     `${analysis.timeline?.totalDays} jours ouvrés (${analysis.timeline?.totalWeeks} semaines)`,
          deliverables: analysis.deliverables?.join(', ') || '',
        },
      });
      setContractContent(data.content);
      setContractId(data.contractId || null);
      setStep('result');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la génération');
      setStep('form');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(contractContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const setF = (key, val) => setFreelancer(p => ({ ...p, [key]: val }));
  const fieldClass = "w-full bg-[var(--bg-0)] text-[var(--text-1)] text-sm px-3 py-2.5 outline-none focus:border-[var(--accent)] transition-colors";
  const fieldStyle = { border: '1px solid var(--border-2)' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="w-full bg-[var(--bg-1)] flex flex-col overflow-hidden"
        style={{
          maxWidth: step === 'result' ? '900px' : '640px',
          maxHeight: '92vh',
          border: '1px solid var(--border-2)',
        }}
        onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border-1)' }}>
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-lg">
              <FileText className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-[var(--text-1)] font-semibold text-sm">Génération du contrat</p>
              <p className="label-mono">{analysis.projectName}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="text-[var(--text-4)] hover:text-[var(--text-1)] transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">

            {/* ─── Formulaire ─────────────────────────────────────────────── */}
            {step === 'form' && (
              <motion.div key="form"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="p-6 space-y-6">

                {/* Prestataire */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <User size={13} className="text-[var(--accent)]" />
                    <span className="label-mono text-[var(--text-1)]">Vos informations (prestataire)</span>
                    <span className="label-mono ml-auto" style={{ fontSize: '10px' }}>Sauvegardé automatiquement</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'name',   label: 'Nom complet *',      placeholder: 'Jean Dupont'          },
                      { key: 'email',  label: 'Email pro *',         placeholder: 'you@domain.fr'        },
                      { key: 'status', label: 'Statut juridique',    placeholder: 'Auto-entrepreneur'    },
                      { key: 'siret',  label: 'SIRET',               placeholder: '123 456 789 00010'    },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <label className="label-mono block mb-1.5">{label}</label>
                        <input
                          type="text"
                          value={freelancer[key] || ''}
                          onChange={e => setF(key, e.target.value)}
                          placeholder={placeholder}
                          className={fieldClass}
                          style={fieldStyle}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Client */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 size={13} className="text-[var(--accent)]" />
                    <span className="label-mono text-[var(--text-1)]">Informations client</span>
                    <div className="ml-auto flex">
                      {['select', 'manual'].map(m => (
                        <button key={m}
                          onClick={() => setClientMode(m)}
                          className={`px-3 py-1 text-xs transition-colors ${clientMode === m ? 'bg-[var(--bg-3)] text-[var(--text-1)]' : 'text-[var(--text-3)] hover:text-[var(--text-1)]'}`}
                          style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }}>
                          {m === 'select' ? 'Choisir' : 'Manuel'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {clientMode === 'select' ? (
                    <div>
                      <label className="label-mono block mb-1.5">Sélectionner un client</label>
                      <select
                        value={selectedClient}
                        onChange={e => setSelectedClient(e.target.value)}
                        className={fieldClass}
                        style={fieldStyle}>
                        <option value="">— Choisir un client —</option>
                        {clients.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name}{c.company ? ` — ${c.company}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'name',    label: 'Nom / Société *', placeholder: 'ACME Corp'          },
                        { key: 'email',   label: 'Email *',         placeholder: 'client@acme.fr'     },
                        { key: 'address', label: 'Adresse',         placeholder: '12 rue de la Paix…' },
                      ].map(({ key, label, placeholder }) => (
                        <div key={key} className={key === 'address' ? 'col-span-2' : ''}>
                          <label className="label-mono block mb-1.5">{label}</label>
                          <input type="text"
                            value={manualClient[key] || ''}
                            onChange={e => setManualClient(p => ({ ...p, [key]: e.target.value }))}
                            placeholder={placeholder}
                            className={fieldClass}
                            style={fieldStyle}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Projet (optionnel) */}
                <div>
                  <label className="label-mono block mb-1.5">
                    Associer à un projet <span className="text-[var(--text-4)]">(optionnel — permet de sauvegarder)</span>
                  </label>
                  <select
                    value={selectedProject}
                    onChange={e => setSelectedProject(e.target.value)}
                    className={fieldClass}
                    style={fieldStyle}>
                    <option value="">— Sans projet (non sauvegardé) —</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {selectedProject && (
                    <p className="label-mono mt-1.5" style={{ fontSize: '11px', color: '#16a34a' }}>
                      ✓ Le contrat sera sauvegardé dans ce projet
                    </p>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/40 px-4 py-3 text-red-400">
                    <AlertCircle size={15} className="shrink-0" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* ─── Génération ─────────────────────────────────────────────── */}
            {step === 'generating' && (
              <motion.div key="gen"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-5 py-16 px-6">
                <div className="w-10 h-10 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
                <p className="font-display text-lg text-[var(--text-1)] font-semibold">Rédaction du contrat…</p>
                <p className="text-[var(--text-3)] text-sm text-center max-w-xs">
                  L'IA génère un contrat professionnel adapté à votre projet. Cela prend 10 à 20 secondes.
                </p>
                <div className="flex items-center gap-2 px-4 py-2 border border-[var(--accent)]/30 bg-[var(--accent)]/8 rounded-lg">
                  <Sparkles size={13} className="text-[var(--accent)]" />
                  <span className="label-mono text-[var(--accent)]">{analysis.projectName}</span>
                </div>
              </motion.div>
            )}

            {/* ─── Résultat ────────────────────────────────────────────────── */}
            {step === 'result' && (
              <motion.div key="result"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="p-6">
                {/* Bandeau succès */}
                <div className="flex items-center justify-between mb-5 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-center gap-2.5">
                    <Check size={15} className="text-emerald-400" />
                    <span className="text-sm text-emerald-400 font-medium">
                      Contrat généré avec succès
                      {contractId ? ' et sauvegardé dans le projet' : ' (non sauvegardé — associez un projet)'}
                    </span>
                  </div>
                  {contractId && (
                    <button
                      onClick={() => navigate(`/contracts?id=${contractId}`)}
                      className="label-mono flex items-center gap-1.5 text-emerald-400 hover:text-[var(--text-1)] transition-colors">
                      Voir dans Contrats <ExternalLink size={11} />
                    </button>
                  )}
                </div>

                {/* Contenu Markdown */}
                <div className="p-6 overflow-auto" style={{ border: '1px solid var(--bg-2)', background: 'var(--bg-0)', maxHeight: '55vh', borderRadius: '8px' }}>
                  <SimpleMarkdown content={contractContent} />
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 flex items-center justify-between gap-3 shrink-0"
          style={{ borderTop: '1px solid var(--border-1)' }}>
          {step === 'form' && (
            <>
              <button onClick={onClose}
                className="px-4 py-2.5 text-sm text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors"
                style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }}>
                Annuler
              </button>
              <button onClick={handleGenerate}
                className="flex items-center gap-2.5 px-6 py-2.5 text-sm font-medium text-[var(--text-1)] transition-colors"
                style={{ background: 'var(--accent)', borderRadius: '8px' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}>
                <Sparkles size={14} />
                Générer le contrat
                <ChevronRight size={14} />
              </button>
            </>
          )}

          {step === 'result' && (
            <>
              <button
                onClick={() => { setStep('form'); setContractContent(''); setContractId(null); }}
                className="px-4 py-2.5 text-sm text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors"
                style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }}>
                Regénérer
              </button>
              <div className="flex items-center gap-2">
                <button onClick={handleCopy}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--text-1)] hover:text-[var(--text-1)] transition-colors"
                  style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }}>
                  {copied ? <><Check size={13} className="text-emerald-400" /> Copié</> : <><Copy size={13} /> Copier</>}
                </button>
                {contractId && (
                  <button
                    onClick={() => navigate('/contracts')}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[var(--text-1)] transition-colors"
                    style={{ background: 'var(--accent)', borderRadius: '8px' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}>
                    <FileText size={13} /> Voir tous les contrats
                  </button>
                )}
                <button onClick={onClose}
                  className="px-4 py-2.5 text-sm text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors"
                  style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }}>
                  Fermer
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
