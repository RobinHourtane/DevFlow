import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, ArrowRight, RotateCcw, Copy, Check,
  CheckCircle2, AlertTriangle, AlertCircle, ChevronDown, ChevronUp,
  Code2, Server, Database, Cloud, Wrench, Euro, Calendar,
  Layers, FileText, Mail, Plus, Users, ExternalLink
} from 'lucide-react';
import PageHeader from '../components/devflow/PageHeader';
import ContractGeneratorModal from '../components/devflow/ContractGeneratorModal';
import api from '../lib/api';
import { PROJECT_TYPE_LABEL as TYPE_LABEL } from '../lib/constants';

// ─── Config ───────────────────────────────────────────────────────────────────
const COMPLEXITY_CONFIG = {
  LOW:    { label: 'Faible',  color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-500/40' },
  MEDIUM: { label: 'Moyenne', color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-500/40'   },
  HIGH:   { label: 'Élevée',  color: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-500/40'     },
};

const RISK_CONFIG = {
  LOW:    { icon: CheckCircle2,  color: 'text-emerald-400', bg: 'bg-emerald-500/8',  border: 'border-emerald-500/20' },
  MEDIUM: { icon: AlertTriangle, color: 'text-amber-400',   bg: 'bg-amber-500/8',    border: 'border-amber-500/20'   },
  HIGH:   { icon: AlertCircle,   color: 'text-red-400',     bg: 'bg-red-500/8',      border: 'border-red-500/20'     },
};


const LOADING_STEPS = [
  { icon: FileText,      label: 'Lecture du cahier des charges…'       },
  { icon: Code2,         label: 'Recommandation de la stack technique…' },
  { icon: Euro,          label: 'Estimation du budget…'                },
  { icon: Calendar,      label: 'Construction du planning…'            },
  { icon: AlertTriangle, label: 'Identification des risques…'          },
  { icon: Sparkles,      label: "Finalisation de l'analyse…"           },
];

const fmt = (n) => n?.toLocaleString('fr-FR') ?? '—';

// ─── CopyBtn ──────────────────────────────────────────────────────────────────
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <button onClick={copy} title="Copier l'analyse" className="flex items-center gap-1.5 px-3 py-2 border border-[var(--border-3)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:border-[var(--border-3)] transition-colors text-sm rounded-lg">
      {copied ? <><Check className="w-4 h-4 text-emerald-400" /> Copié</> : <><Copy className="w-4 h-4" /> Copier</>}
    </button>
  );
}

// ─── SectionCard ─────────────────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[var(--border-2)] bg-[var(--bg-1)] overflow-hidden rounded-lg">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-[var(--hover-1)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-lg">
            <Icon className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <span className="text-base font-semibold text-[var(--text-1)]">{title}</span>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-[var(--text-3)]" />
          : <ChevronDown className="w-4 h-4 text-[var(--text-3)]" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pt-2 border-t border-[var(--border-2)]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Phase Input ──────────────────────────────────────────────────────────────
function InputPhase({ onSubmit, error }) {
  const [brief,      setBrief]      = useState('');
  const [budgetHint, setBudgetHint] = useState('');
  const [deadline,   setDeadline]   = useState('');
  const [projects,   setProjects]   = useState([]);
  const [projectId,  setProjectId]  = useState('');

  useEffect(() => {
    api.get('/projects').then(({ data }) => setProjects(data)).catch(() => {});
  }, []);

  const submit = (e) => {
    e.preventDefault();
    if (brief.trim().length < 30) return;
    onSubmit({ brief: brief.trim(), budgetHint, deadlineHint: deadline, ...(projectId && { projectId }) });
  };

  return (
    <div className="max-w-3xl mx-auto px-10 py-8 space-y-8">
      {/* Intro */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--accent)]/40 bg-[var(--accent)]/10 rounded-lg">
          <Sparkles className="w-4 h-4 text-[var(--accent)]" />
          <span className="text-sm font-medium text-[var(--accent)]">Analyse complète en 1 clic</span>
        </div>
        <h2 className="font-display text-3xl text-[var(--text-1)] font-semibold leading-tight">
          Colle le cahier des charges de ton client
        </h2>
        <p className="text-[var(--text-2)] text-base leading-relaxed">
          L'IA analyse le projet et te propose une stack adaptée, un budget détaillé par phase et un planning complet.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        {/* Textarea */}
        <div className="border border-[var(--border-3)] focus-within:border-[var(--accent)]/70 transition-colors bg-[var(--bg-1)] rounded-lg">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-2)]">
            <span className="label-mono text-[var(--text-2)]">Cahier des charges *</span>
            <span className="text-sm text-[var(--text-4)] font-mono">{brief.length} car.</span>
          </div>
          <textarea
            value={brief}
            onChange={e => setBrief(e.target.value)}
            placeholder="Ex : Mon client est une boulangerie artisanale qui souhaite un site vitrine moderne avec une boutique en ligne pour commander des pâtisseries. Le site doit avoir une galerie photos, un système de commande avec paiement en ligne, une page de contact et un espace admin pour gérer les commandes. Le client est sous Mac, il n'y connaît rien en technique…"
            rows={13}
            className="w-full bg-transparent text-[var(--text-1)] text-base p-5 resize-none outline-none placeholder:text-[var(--text-4)] leading-relaxed"
            minLength={30}
          />
        </div>

        {/* Lier à un projet */}
        {projects.length > 0 && (
          <div className="border border-[var(--border-2)] bg-[var(--bg-1)] focus-within:border-[var(--accent)]/60 transition-colors rounded-lg">
            <div className="px-4 py-2.5 border-b border-[var(--border-2)] flex items-center justify-between">
              <span className="label-mono text-[var(--text-2)]">Lier à un projet</span>
              <span className="text-xs text-[var(--text-4)]">optionnel — crée les phases &amp; tâches automatiquement</span>
            </div>
            <select value={projectId} onChange={e => setProjectId(e.target.value)}
              className="w-full bg-transparent text-[var(--text-1)] text-sm px-4 py-3 outline-none"
              style={{ appearance: 'auto' }}>
              <option value="">Aucun projet — analyse standalone</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.client?.name ? ` — ${p.client.name}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Hints */}
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-[var(--border-2)] bg-[var(--bg-1)] focus-within:border-[var(--border-3)] transition-colors rounded-lg">
            <div className="px-4 py-2.5 border-b border-[var(--border-2)]">
              <span className="label-mono text-[var(--text-2)]">Budget client souhaité</span>
            </div>
            <div className="flex items-center">
              <input type="text" value={budgetHint} onChange={e => setBudgetHint(e.target.value)}
                placeholder="Ex : 3 000"
                className="flex-1 bg-transparent text-[var(--text-1)] text-base px-4 py-3 outline-none placeholder:text-[var(--text-4)] font-mono" />
              <span className="text-[var(--text-3)] pr-4 font-mono">€</span>
            </div>
          </div>
          <div className="border border-[var(--border-2)] bg-[var(--bg-1)] focus-within:border-[var(--border-3)] transition-colors rounded-lg">
            <div className="px-4 py-2.5 border-b border-[var(--border-2)]">
              <span className="label-mono text-[var(--text-2)]">Délai souhaité</span>
            </div>
            <input type="text" value={deadline} onChange={e => setDeadline(e.target.value)}
              placeholder="Ex : 2 mois, avant Noël…"
              className="w-full bg-transparent text-[var(--text-1)] text-base px-4 py-3 outline-none placeholder:text-[var(--text-4)]" />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/40 px-5 py-4 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <button type="submit" disabled={brief.trim().length < 30}
          className="w-full flex items-center justify-center gap-3 bg-[var(--accent)] text-[var(--text-1)] py-4 text-base
            font-display font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <Sparkles className="w-5 h-5" />
          Analyser le projet
          <ArrowRight className="w-5 h-5" />
        </button>
      </form>

      {/* Outils secondaires */}
      <div className="pt-6 border-t border-[var(--border-2)] space-y-4">
        <p className="text-sm text-[var(--text-3)] font-medium">Autres outils disponibles dans chaque projet</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: FileText, label: 'Générateur de contrat',  note: 'Projet → onglet Contrat'   },
            { icon: Mail,     label: "Compositeur d'emails",   note: 'Projet → onglet Agents IA' },
            { icon: Layers,   label: 'Structure de fichiers',  note: 'Projet → onglet Agents IA' },
          ].map(tool => {
            const Icon = tool.icon;
            return (
              <div key={tool.label} className="border border-[var(--border-2)] bg-[var(--bg-1)] p-5 space-y-3 opacity-60 rounded-lg">
                <div className="p-2 bg-[var(--bg-2)] border border-[var(--border-2)] w-fit rounded-lg">
                  <Icon className="w-4 h-4 text-[var(--text-2)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-1)]">{tool.label}</p>
                  <p className="text-xs text-[var(--text-4)] mt-1">{tool.note}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Phase Loading ────────────────────────────────────────────────────────────
function LoadingPhase() {
  const [step, setStep] = useState(0);

  useState(() => {
    const id = setInterval(() => setStep(s => s < LOADING_STEPS.length - 1 ? s + 1 : s), 950);
    return () => clearInterval(id);
  });

  return (
    <div className="max-w-lg mx-auto px-10 py-20 space-y-10">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin mx-auto" />
        <p className="font-display text-2xl text-[var(--text-1)] font-semibold">Analyse en cours…</p>
        <p className="text-[var(--text-3)] text-base">L'IA traite votre cahier des charges, cela prend 5 à 15 secondes.</p>
      </div>
      <div className="space-y-2.5">
        {LOADING_STEPS.map((s, i) => {
          const Icon  = s.icon;
          const done  = i < step;
          const active = i === step;
          return (
            <motion.div key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: done || active ? 1 : 0.2, x: 0 }}
              transition={{ delay: i * 0.07 }}
              className={`flex items-center gap-4 px-5 py-3.5 border transition-all
                ${done   ? 'border-emerald-500/30 bg-emerald-500/5'   :
                  active ? 'border-[var(--accent)]/50 bg-[var(--accent)]/8'       :
                           'border-[var(--border-2)] bg-transparent'}`}
            >
              {done
                ? <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                : <Icon  className={`w-5 h-5 shrink-0 ${active ? 'text-[var(--accent)]' : 'text-[var(--text-5)]'}`} />}
              <span className={`text-base ${done ? 'text-emerald-400' : active ? 'text-[var(--text-1)] font-medium' : 'text-[var(--text-4)]'}`}>
                {s.label}
              </span>
              {active && (
                <div className="ml-auto flex gap-1">
                  {[0, 1, 2].map(d => (
                    <motion.div key={d} className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full"
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.2 }} />
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Bandeau suggestion client ────────────────────────────────────────────────
function ClientSuggestionBanner({ suggestion, projectId, onCreated }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name:    suggestion.name    || '',
    email:   '',
    company: suggestion.company || '',
    sector:  suggestion.sector  || '',
  });
  const [status, setStatus] = useState('idle'); // idle | saving | done | error
  const [created, setCreated] = useState(null);
  const [error, setError]     = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setStatus('saving');
    setError(null);
    try {
      const { data } = await api.post('/clients', form);
      if (projectId) {
        await api.put(`/projects/${projectId}`, { clientId: data.id }).catch(() => {});
      }
      setCreated(data);
      setStatus('done');
      onCreated?.(data);
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de la création de la fiche client");
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-4 px-6 py-4 border border-emerald-500/40 bg-emerald-500/5">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-400">Fiche client créée</p>
            <p className="text-xs text-[var(--text-2)] mt-0.5">
              "{created.name}" a été ajouté à vos clients{projectId ? ' et lié à ce projet' : ''}.
            </p>
          </div>
        </div>
        <Link to={`/clients/${created.id}`}
          className="shrink-0 flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/10 transition-colors">
          Voir la fiche <ExternalLink className="w-4 h-4" />
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      className="border border-[var(--accent)]/30 bg-[var(--accent)]/5 rounded-lg">
      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 bg-[var(--accent)]/10 border border-[var(--accent)]/20 shrink-0 rounded-lg">
            <Users className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-1)] truncate">Client détecté : {suggestion.name}</p>
            <p className="text-xs text-[var(--text-2)] mt-0.5">Le cahier des charges mentionne ce client — créer sa fiche ?</p>
          </div>
        </div>
        <button onClick={() => setOpen(o => !o)}
          className="shrink-0 flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--accent)] border border-[var(--accent)]/40 hover:bg-[var(--accent)]/10 transition-colors rounded-lg">
          {open ? 'Annuler' : 'Créer la fiche client'}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
            <form onSubmit={submit} className="px-6 pb-5 pt-1 border-t border-[var(--accent)]/15 grid grid-cols-2 gap-3">
              <div>
                <label className="label-mono block mb-1.5 text-[var(--text-3)]">Nom *</label>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-[var(--bg-0)] text-[var(--text-1)] text-sm px-3 py-2 outline-none focus:border-[var(--accent)] transition-colors"
                  style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }} />
              </div>
              <div>
                <label className="label-mono block mb-1.5 text-[var(--text-3)]">Email *</label>
                <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="contact@client.fr"
                  className="w-full bg-[var(--bg-0)] text-[var(--text-1)] text-sm px-3 py-2 outline-none focus:border-[var(--accent)] transition-colors"
                  style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }} />
              </div>
              <div>
                <label className="label-mono block mb-1.5 text-[var(--text-3)]">Entreprise</label>
                <input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })}
                  className="w-full bg-[var(--bg-0)] text-[var(--text-1)] text-sm px-3 py-2 outline-none focus:border-[var(--accent)] transition-colors"
                  style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }} />
              </div>
              <div>
                <label className="label-mono block mb-1.5 text-[var(--text-3)]">Secteur</label>
                <input value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })}
                  className="w-full bg-[var(--bg-0)] text-[var(--text-1)] text-sm px-3 py-2 outline-none focus:border-[var(--accent)] transition-colors"
                  style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }} />
              </div>

              {error && (
                <div className="col-span-2 flex items-center gap-2 text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <div className="col-span-2 flex justify-end">
                <button type="submit" disabled={status === 'saving'}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[var(--text-1)] transition-colors disabled:opacity-50"
                  style={{ background: 'var(--accent)', borderRadius: '8px' }}>
                  <Plus className="w-4 h-4" />
                  {status === 'saving' ? 'Création…' : `Créer${projectId ? ' et lier au projet' : ''}`}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Phase Résultats ──────────────────────────────────────────────────────────
function ResultsPhase({ analysis, onReset, projectId }) {
  const navigate   = useNavigate();
  const complexity = COMPLEXITY_CONFIG[analysis.complexity] || COMPLEXITY_CONFIG.MEDIUM;
  const totalDays  = analysis.timeline?.totalDays || 1;
  const [showContractModal, setShowContractModal] = useState(false);
  const [suggestedClient, setSuggestedClient] = useState(null);
  const planning   = analysis._planning;

  const handleCreateProject = () =>
    navigate('/projects', {
      state: { prefill: {
        name:        analysis.projectName,
        type:        analysis.projectType,
        description: analysis.summary,
        budget:      analysis.budget?.totalHT,
        // Si une fiche client a été créée depuis la suggestion IA juste avant,
        // on la pré-sélectionne directement dans le formulaire de création
        ...(suggestedClient && { clientId: suggestedClient.id }),
        // Analyse complète transportée jusqu'à la création du projet :
        // Projects.jsx l'appliquera automatiquement (stack, planning, risques…)
        // sans relancer l'IA, via /api/agents/apply-analysis
        analysis,
      }},
    });

  return (
    <div className="px-10 py-6 space-y-6">

      {/* ── Bandeau planning créé ───────────────────────────────────────────── */}
      {planning && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-4 px-6 py-4 border border-emerald-500/40 bg-emerald-500/5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-400">Planning créé automatiquement</p>
              <p className="text-xs text-[var(--text-2)] mt-0.5">
                {planning.phasesCreated} phase{planning.phasesCreated > 1 ? 's' : ''} et{' '}
                {planning.tasksCreated} tâche{planning.tasksCreated > 1 ? 's' : ''} ajoutées sur le planning du projet
              </p>
            </div>
          </div>
          {projectId && (
            <button onClick={() => navigate(`/projects/${projectId}`)}
              className="shrink-0 flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/10 transition-colors">
              Voir le planning <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </motion.div>
      )}

      {/* ── Bandeau client détecté ──────────────────────────────────────────── */}
      {analysis.clientSuggestion?.name && (
        <ClientSuggestionBanner suggestion={analysis.clientSuggestion} projectId={projectId}
          onCreated={setSuggestedClient} />
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="border border-[var(--border-2)] bg-[var(--bg-1)] p-8 rounded-lg">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="space-y-3 min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="label-mono text-[var(--text-3)]">
                {TYPE_LABEL[analysis.projectType] || analysis.projectType}
              </span>
              <span className={`px-3 py-1 text-sm font-semibold border ${complexity.color} ${complexity.bg} ${complexity.border}`}>
                Complexité {complexity.label}
              </span>
            </div>
            <h2 className="font-display text-3xl text-[var(--text-1)] font-bold">{analysis.projectName}</h2>
            <p className="text-[var(--text-1)] text-base leading-relaxed max-w-3xl">{analysis.summary}</p>
            {analysis.complexityReason && (
              <p className="text-[var(--text-3)] text-sm italic">{analysis.complexityReason}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <CopyBtn text={JSON.stringify(analysis, null, 2)} />
            <button onClick={onReset}
              className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-2)] border border-[var(--border-3)] hover:border-[var(--border-3)] hover:text-[var(--text-1)] transition-colors rounded-lg">
              <RotateCcw className="w-4 h-4" /> Nouvelle analyse
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-6 mt-8 pt-6 border-t border-[var(--border-2)]">
          {[
            { label: 'Budget HT',  value: `${fmt(analysis.budget?.totalHT)} €`,      sub: `${fmt(analysis.budget?.totalTTC)} € TTC` },
            { label: 'Durée',      value: `${totalDays} jours`,                       sub: `${analysis.timeline?.totalWeeks} semaines` },
            { label: 'TJM',        value: `${fmt(analysis.budget?.dailyRate)} €`,      sub: 'taux journalier' },
            { label: 'Phases',     value: `${analysis.timeline?.phases?.length || 0}`, sub: `${analysis.risks?.length || 0} risques identifiés` },
          ].map(k => (
            <div key={k.label}>
              <p className="label-mono text-[var(--text-3)] mb-2">{k.label}</p>
              <p className="font-display text-4xl font-bold text-[var(--text-1)] leading-none">{k.value}</p>
              <p className="text-sm text-[var(--text-3)] mt-2">{k.sub}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Stack + Budget ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-6">

        <SectionCard title="Stack technique recommandée" icon={Code2}>
          <div className="space-y-3 mt-3">
            {[
              { key: 'frontend', icon: Code2,    label: 'Frontend'        },
              { key: 'backend',  icon: Server,   label: 'Backend'         },
              { key: 'database', icon: Database, label: 'Base de données' },
              { key: 'hosting',  icon: Cloud,    label: 'Hébergement'     },
            ].filter(s => analysis.stack?.[s.key]?.name).map(({ key, icon: Icon, label }) => (
              <div key={key} className="border border-[var(--border-2)] p-4 space-y-2 bg-[var(--bg-1)] rounded-lg">
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-[var(--accent)] shrink-0" />
                  <span className="text-xs label-mono text-[var(--text-3)]">{label}</span>
                  <span className="ml-auto font-mono text-base font-semibold text-[var(--text-1)]">
                    {analysis.stack[key].name}
                  </span>
                </div>
                {analysis.stack[key].justification && (
                  <p className="text-sm text-[var(--text-2)] leading-relaxed pl-7">
                    {analysis.stack[key].justification}
                  </p>
                )}
              </div>
            ))}

            {analysis.stack?.tools?.length > 0 && (
              <div className="border border-[var(--border-2)] p-4 bg-[var(--bg-1)] rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Wrench className="w-4 h-4 text-[var(--accent)]" />
                  <span className="text-sm font-semibold text-[var(--text-1)]">Outils & services</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysis.stack.tools.map((t, i) => (
                    <span key={i} title={t.purpose}
                      className="px-3 py-1.5 text-sm font-mono border border-[var(--border-3)] text-[var(--text-1)] cursor-default hover:border-[var(--border-3)] transition-colors rounded-lg">
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Estimation budgétaire" icon={Euro}>
          <div className="space-y-4 mt-3">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-2)]">
                  <th className="label-mono text-[var(--text-3)] text-left pb-3">Phase</th>
                  <th className="label-mono text-[var(--text-3)] text-right pb-3">Jours</th>
                  <th className="label-mono text-[var(--text-3)] text-right pb-3">Montant HT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {analysis.budget?.breakdown?.map((item, i) => (
                  <tr key={i}>
                    <td className="py-3.5">
                      <p className="text-sm font-medium text-[var(--text-1)]">{item.phase}</p>
                      {item.description && (
                        <p className="text-xs text-[var(--text-3)] mt-1 leading-snug">{item.description}</p>
                      )}
                    </td>
                    <td className="py-3.5 text-right font-mono text-sm text-[var(--text-2)]">{item.days}j</td>
                    <td className="py-3.5 text-right font-mono text-sm font-semibold text-[var(--text-1)]">{fmt(item.amount)} €</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[var(--border-3)]">
                  <td className="pt-4 text-sm font-semibold text-[var(--text-1)]">Total HT</td>
                  <td className="pt-4 text-right font-mono text-sm text-[var(--text-2)]">{totalDays}j</td>
                  <td className="pt-4 text-right font-mono text-lg font-bold text-[var(--accent)]">{fmt(analysis.budget?.totalHT)} €</td>
                </tr>
              </tfoot>
            </table>

            {analysis.budget?.paymentSchedule && (
              <div className="border border-[var(--border-2)] p-4 space-y-3 bg-[var(--bg-1)] rounded-lg">
                <p className="text-sm font-semibold text-[var(--text-1)]">Échéancier recommandé</p>
                {Object.values(analysis.budget.paymentSchedule).map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-1 h-5 bg-[var(--accent)] shrink-0" />
                      <span className="text-sm text-[var(--text-2)]">{p.label}</span>
                    </div>
                    <span className="text-sm font-mono font-semibold text-[var(--text-1)]">{p.percent}% — {fmt(p.amount)} €</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* ── Planning ────────────────────────────────────────────────────────── */}
      <SectionCard title="Planning estimatif" icon={Calendar}>
        <div className="space-y-5 mt-3">
          {analysis.timeline?.phases?.map((phase, i) => {
            const pct = Math.round((phase.duration / totalDays) * 100);
            return (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-mono text-[var(--text-4)] w-6 text-right shrink-0">{phase.order}.</span>
                    <span className="text-base font-semibold text-[var(--text-1)] truncate">{phase.name}</span>
                    {phase.description && (
                      <span className="text-sm text-[var(--text-3)] hidden xl:block truncate">— {phase.description}</span>
                    )}
                  </div>
                  <span className="text-sm font-mono text-[var(--text-2)] shrink-0 font-semibold">{phase.duration} jours</span>
                </div>
                <div className="flex items-center gap-3 pl-9">
                  <div className="flex-1 h-2 bg-[var(--bg-3)]">
                    <motion.div className="h-full bg-[var(--accent)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, delay: i * 0.08 }} />
                  </div>
                  <span className="text-xs font-mono text-[var(--text-3)] w-10 text-right">{pct}%</span>
                </div>
                {phase.deliverables?.length > 0 && (
                  <div className="flex flex-wrap gap-2 pl-9">
                    {phase.deliverables.map((d, j) => (
                      <span key={j} className="text-xs font-mono px-2.5 py-1 bg-[var(--bg-2)] border border-[var(--border-2)] text-[var(--text-2)] rounded-lg">
                        {d}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* ── Risques + Recommandations ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-6">

        <SectionCard title="Risques identifiés" icon={AlertTriangle}>
          <div className="space-y-3 mt-3">
            {analysis.risks?.map((risk, i) => {
              const cfg  = RISK_CONFIG[risk.level] || RISK_CONFIG.MEDIUM;
              const Icon = cfg.icon;
              return (
                <div key={i} className={`p-4 border ${cfg.border} ${cfg.bg} space-y-2`}>
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${cfg.color}`} />
                    <p className={`text-sm font-semibold leading-snug ${cfg.color}`}>{risk.title}</p>
                  </div>
                  {risk.mitigation && (
                    <p className="text-sm text-[var(--text-2)] leading-relaxed pl-8">{risk.mitigation}</p>
                  )}
                </div>
              );
            })}
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Recommandations" icon={Sparkles}>
            <ul className="space-y-3 mt-3">
              {analysis.recommendations?.map((r, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                  <span className="text-sm text-[var(--text-1)] leading-relaxed">{r}</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          {analysis.questions?.length > 0 && (
            <SectionCard title="Questions à poser au client" icon={FileText} defaultOpen={false}>
              <ul className="space-y-3 mt-3">
                {analysis.questions.map((q, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-sm font-mono font-bold text-[var(--accent)] shrink-0">{i + 1}.</span>
                    <span className="text-sm text-[var(--text-2)] leading-relaxed">{q}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </div>
      </div>

      {/* ── Livrables ───────────────────────────────────────────────────────── */}
      {analysis.deliverables?.length > 0 && (
        <SectionCard title="Livrables finaux" icon={Layers} defaultOpen={false}>
          <div className="flex flex-wrap gap-3 mt-3">
            {analysis.deliverables.map((d, i) => (
              <span key={i} className="flex items-center gap-2 px-4 py-2 border border-[var(--border-3)] text-sm text-[var(--text-1)] hover:border-[var(--border-3)] transition-colors rounded-lg">
                <Check className="w-4 h-4 text-emerald-400" />
                {d}
              </span>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="flex items-center justify-center gap-4 py-6 border-t border-[var(--border-2)] flex-wrap">
        <button onClick={handleCreateProject}
          className="flex items-center gap-3 bg-[var(--accent)] text-[var(--text-1)] px-8 py-4 text-base
            font-display font-semibold hover:bg-[var(--accent-hover)] transition-colors">
          <Plus className="w-5 h-5" />
          Créer ce projet
        </button>
        <button onClick={() => setShowContractModal(true)}
          className="flex items-center gap-3 border border-[var(--border-3)] text-[var(--text-1)] px-8 py-4 text-base
            font-medium hover:border-[var(--border-3)] hover:text-[var(--text-1)] transition-colors rounded-lg">
          <FileText className="w-5 h-5" />
          Générer le contrat
        </button>
        <button onClick={onReset}
          className="flex items-center gap-2.5 px-6 py-4 border border-[var(--border-3)] text-[var(--text-2)]
            hover:border-[var(--border-3)] hover:text-[var(--text-1)] transition-colors text-sm font-medium rounded-lg">
          <RotateCcw className="w-4 h-4" />
          Nouvelle analyse
        </button>
      </motion.div>

      {/* ── Modal contrat ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showContractModal && (
          <ContractGeneratorModal
            analysis={analysis}
            onClose={() => setShowContractModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function Agents() {
  const [phase,     setPhase]     = useState('input');
  const [analysis,  setAnalysis]  = useState(null);
  const [error,     setError]     = useState(null);
  const [projectId, setProjectId] = useState(null);

  const handleSubmit = async (formData) => {
    setPhase('loading');
    setError(null);
    setProjectId(formData.projectId ? Number(formData.projectId) : null);
    try {
      const { data } = await api.post('/agents/intake', formData);
      setAnalysis(data);
      setPhase('results');
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'analyse");
      setPhase('input');
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Intelligence artificielle"
        title="Agents IA"
        description={
          phase === 'results'
            ? `"${analysis?.projectName}" — ${fmt(analysis?.budget?.totalHT)} € HT · ${analysis?.timeline?.totalDays} jours`
            : 'Analyse de projet complète à partir du cahier des charges'
        }
      />

      <AnimatePresence mode="wait">
        {phase === 'input' && (
          <motion.div key="input"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <InputPhase onSubmit={handleSubmit} error={error} />
          </motion.div>
        )}

        {phase === 'loading' && (
          <motion.div key="loading"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LoadingPhase />
          </motion.div>
        )}

        {phase === 'results' && analysis && (
          <motion.div key="results"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <ResultsPhase analysis={analysis} projectId={projectId}
              onReset={() => { setPhase('input'); setAnalysis(null); setError(null); setProjectId(null); }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
