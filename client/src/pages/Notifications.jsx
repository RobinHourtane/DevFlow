import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Check, CheckCheck, Trash2, ExternalLink, Clock,
  ListChecks, Receipt, FileText, Info,
} from 'lucide-react';
import { parseISO, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import PageHeader from '../components/devflow/PageHeader';
import api from '../lib/api';

/* ─── Config par catégorie (préfixe du champ `type`) ──────────────────────── */
const CATEGORY_CFG = {
  task_overdue:     { icon: ListChecks, label: 'Tâche',    color: '#d97706' },
  invoice_overdue:  { icon: Receipt,    label: 'Facture',  color: '#ef4444' },
  contract_stale:   { icon: FileText,   label: 'Contrat',  color: 'var(--accent)' },
};
const DEFAULT_CFG = { icon: Info, label: 'Info', color: 'var(--text-3)' };

const categoryOf = (type) => CATEGORY_CFG[type?.split(':')[0]] || DEFAULT_CFG;

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('ALL'); // ALL | UNREAD

  const load = useCallback(() =>
    api.get('/notifications')
      .then(({ data }) => setNotifications(data.notifications))
      .finally(() => setLoading(false))
  , []);

  useEffect(() => { load(); }, [load]);

  const handleMarkRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try { await api.put(`/notifications/${id}/read`); } catch { /* ignore */ }
  };

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try { await api.put('/notifications/read-all'); } catch { /* ignore */ }
  };

  const handleDelete = async (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    try { await api.delete(`/notifications/${id}`); } catch { /* ignore */ }
  };

  const handleClick = (n) => {
    if (!n.read) handleMarkRead(n.id);
    if (n.project) navigate(`/projects/${n.project.id}`);
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const filtered = filter === 'UNREAD' ? notifications.filter(n => !n.read) : notifications;

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>
      <PageHeader
        eyebrow="Workspace / Notifications"
        title="Notifications"
        description="Alertes automatiques sur les tâches en retard, factures impayées et contrats en attente de signature."
        actions={
          unreadCount > 0 && (
            <button onClick={handleMarkAllRead}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--text-1)] hover:text-[var(--text-1)] transition-colors"
              style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }}>
              <CheckCheck size={14} />
              Tout marquer comme lu
            </button>
          )
        }
      />

      {/* Filtres */}
      <div className="flex items-center gap-2 px-10 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border-1)' }}>
        {[['ALL', 'Toutes'], ['UNREAD', `Non lues${unreadCount > 0 ? ` (${unreadCount})` : ''}`]].map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-3 py-1.5 text-xs transition-colors ${filter === k ? 'text-[var(--text-1)] bg-[var(--bg-3)]' : 'text-[var(--text-3)] hover:text-[var(--text-1)]'}`}
            style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="label-mono text-center py-16">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-8">
            <div className="p-4 bg-[var(--bg-2)] border border-[var(--border-2)]">
              <Bell size={24} className="text-[var(--text-4)]" />
            </div>
            <div>
              <p className="text-[var(--text-1)] font-medium mb-1">
                {filter === 'UNREAD' ? 'Aucune notification non lue' : 'Aucune notification'}
              </p>
              <p className="label-mono">
                Vous serez alerté ici des tâches en retard, factures impayées et contrats en attente.
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto py-4">
            <AnimatePresence initial={false}>
              {filtered.map(n => {
                const cfg = categoryOf(n.type);
                const Icon = cfg.icon;
                return (
                  <motion.div key={n.id}
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20 }}
                    className="mx-6 mb-2 px-5 py-4 flex items-start gap-4 cursor-pointer transition-colors hover:bg-[var(--hover-1)]"
                    style={{
                      border: '1px solid var(--border-1)',
                      background: n.read ? 'transparent' : 'var(--bg-1)',
                      borderLeft: n.read ? '1px solid var(--border-1)' : `2px solid ${cfg.color}`,
                    }}
                    onClick={() => handleClick(n)}>

                    <div className="p-2 shrink-0" style={{ background: `color-mix(in srgb, ${cfg.color} 8%, transparent)`, border: `1px solid color-mix(in srgb, ${cfg.color} 19%, transparent)` }}>
                      <Icon size={14} style={{ color: cfg.color }} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`text-sm ${n.read ? 'text-[var(--text-1)]' : 'text-[var(--text-1)] font-medium'}`}>{n.title}</p>
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.color }} />}
                      </div>
                      <p className="text-sm text-[var(--text-3)] leading-relaxed">{n.message}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="label-mono flex items-center gap-1">
                          <Clock size={10} />
                          {formatDistanceToNow(parseISO(n.createdAt), { addSuffix: true, locale: fr })}
                        </span>
                        {n.project && (
                          <span className="label-mono flex items-center gap-1 text-[var(--text-3)]">
                            {n.project.name} <ExternalLink size={9} />
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      {!n.read && (
                        <button onClick={() => handleMarkRead(n.id)} title="Marquer comme lu"
                          className="p-2 text-[var(--text-4)] hover:text-[var(--text-1)] transition-colors">
                          <Check size={14} />
                        </button>
                      )}
                      <button onClick={() => handleDelete(n.id)} title="Supprimer"
                        className="p-2 text-[var(--text-4)] hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
