import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, X, FolderKanban, Users, ListChecks, FileText, Receipt } from 'lucide-react';
import api from '../../lib/api';

/* ─── Config catégories ─────────────────────────────────────────────────────── */
const CATEGORIES = [
  { key: 'projects',  icon: FolderKanban, label: 'Projet',   color: '#0047FF' },
  { key: 'clients',   icon: Users,        label: 'Client',   color: '#16a34a' },
  { key: 'tasks',     icon: ListChecks,   label: 'Tâche',    color: '#d97706' },
  { key: 'contracts', icon: FileText,     label: 'Contrat',  color: '#7c3aed' },
  { key: 'invoices',  icon: Receipt,      label: 'Facture',  color: '#ef4444' },
];

const CAT = Object.fromEntries(CATEGORIES.map(c => [c.key, c]));

/* ─── Hook : ouvre la modale sur Ctrl+K / Cmd+K ─────────────────────────────── */
export function useGlobalSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return { open, setOpen };
}

/* ─── Modale de recherche ──────────────────────────────────────────────────── */
export default function GlobalSearch({ open, onClose }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [active,  setActive]  = useState(0);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  const search = useCallback(async (q) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const [projects, clients, tasks, contracts, invoices] = await Promise.all([
        api.get('/projects').then(r => r.data),
        api.get('/clients').then(r => r.data),
        api.get('/tasks/my').then(r => r.data),
        api.get('/contracts').then(r => r.data),
        api.get('/invoices').then(r => r.data),
      ]);

      const lower = q.toLowerCase();
      const match = (text) => text?.toLowerCase().includes(lower);

      const hits = [
        ...projects .filter(p => match(p.name) || match(p.description) || match(p.client?.name) || match(p.client?.company))
                    .map(p => ({ key: 'projects',  id: p.id,  label: p.name,    sub: p.client?.name || p.type, url: `/projects/${p.id}` })),
        ...clients  .filter(c => match(c.name) || match(c.company) || match(c.email))
                    .map(c => ({ key: 'clients',   id: c.id,  label: c.name,    sub: c.company || c.email,     url: `/clients/${c.id}` })),
        ...tasks    .filter(t => match(t.title))
                    .map(t => ({ key: 'tasks',     id: t.id,  label: t.title,   sub: t.project?.name || '',    url: `/projects/${t.projectId}?tab=tasks&taskId=${t.id}` })),
        ...contracts.filter(c => match(c.title) || match(c.project?.name) || match(c.project?.client?.name))
                    .map(c => ({ key: 'contracts', id: c.id,  label: c.title,   sub: c.project?.name || '',    url: `/contracts?id=${c.id}` })),
        ...invoices .filter(i => match(i.number) || match(i.project?.name) || match(i.project?.client?.name))
                    .map(i => ({ key: 'invoices',  id: i.id,  label: i.number,  sub: i.project?.name || '',    url: `/invoices?id=${i.id}` })),
      ].slice(0, 12);

      setResults(hits);
      setActive(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 200);
    return () => clearTimeout(t);
  }, [query, search]);

  const go = (url) => {
    navigate(url);
    onClose();
  };

  // Keyboard nav
  const handleKey = (e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    if (e.key === 'Enter' && results[active]) { go(results[active].url); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-xl bg-[var(--bg-1)]"
        style={{ border: '1px solid var(--border-2)', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>

        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: results.length > 0 || loading ? '1px solid var(--border-1)' : 'none' }}>
          <Search size={16} className="text-[var(--text-4)] shrink-0" />
          <input ref={inputRef}
            value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKey}
            placeholder="Rechercher projets, clients, tâches, contrats…"
            className="flex-1 bg-transparent text-[var(--text-1)] text-sm outline-none placeholder-neutral-600" />
          {query && (
            <button onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }}
              className="text-[var(--text-4)] hover:text-[var(--text-1)] transition-colors">
              <X size={14} />
            </button>
          )}
          <kbd className="label-mono px-1.5 py-0.5 text-[var(--text-5)]" style={{ border: '1px solid var(--border-2)', fontSize: '10px' }}>Esc</kbd>
        </div>

        {/* Résultats */}
        {loading && (
          <div className="px-4 py-6 label-mono text-center">Recherche…</div>
        )}
        {!loading && query.length >= 2 && results.length === 0 && (
          <div className="px-4 py-6 label-mono text-center">Aucun résultat pour « {query} »</div>
        )}
        {!loading && results.length > 0 && (
          <div className="py-1 max-h-80 overflow-y-auto">
            {results.map((r, i) => {
              const cat = CAT[r.key];
              const Icon = cat.icon;
              return (
                <button key={`${r.key}-${r.id}`}
                  onClick={() => go(r.url)}
                  onMouseEnter={() => setActive(i)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left"
                  style={{ background: active === i ? 'var(--bg-1)' : 'transparent' }}>
                  <div className="p-1.5 shrink-0"
                    style={{ background: `${cat.color}18`, border: `1px solid ${cat.color}30` }}>
                    <Icon size={12} style={{ color: cat.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[var(--text-1)] truncate">{r.label}</p>
                    {r.sub && <p className="label-mono truncate mt-0.5">{r.sub}</p>}
                  </div>
                  <span className="label-mono shrink-0" style={{ fontSize: '10px', color: cat.color }}>{cat.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-2.5 flex items-center gap-4" style={{ borderTop: '1px solid var(--bg-2)' }}>
          <span className="label-mono flex items-center gap-1.5">
            <kbd style={{ padding: '1px 5px', border: '1px solid var(--border-3)', fontSize: '10px' }}>↑↓</kbd>
            naviguer
          </span>
          <span className="label-mono flex items-center gap-1.5">
            <kbd style={{ padding: '1px 5px', border: '1px solid var(--border-3)', fontSize: '10px' }}>↵</kbd>
            ouvrir
          </span>
          <span className="label-mono flex items-center gap-1.5">
            <kbd style={{ padding: '1px 5px', border: '1px solid var(--border-3)', fontSize: '10px' }}>Esc</kbd>
            fermer
          </span>
        </div>
      </motion.div>
    </div>
  );
}
