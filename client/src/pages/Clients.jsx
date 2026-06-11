import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, Mail, Phone, Building2, Trash2 } from 'lucide-react';
import PageHeader from '../components/devflow/PageHeader';
import api from '../lib/api';

// ─── Modal création ───────────────────────────────────────────────────────────
function CreateModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', company: '', sector: '', address: '', notes: '',
  });
  const [saving, setSaving] = useState(false);

  const field = (key, label, opts = {}) => (
    <div key={key}>
      <label className="label-mono block mb-2">{label}</label>
      {opts.textarea ? (
        <textarea
          value={form[key]}
          onChange={e => setForm({ ...form, [key]: e.target.value })}
          rows={3}
          placeholder={opts.placeholder || ''}
          className="w-full bg-[var(--bg-0)] text-[var(--text-1)] text-sm px-4 py-2.5 outline-none focus:border-[#0047FF] transition-colors resize-none"
          style={{ border: '1px solid var(--border-2)' }}
        />
      ) : (
        <input
          type={opts.type || 'text'}
          required={opts.required}
          value={form[key]}
          onChange={e => setForm({ ...form, [key]: e.target.value })}
          placeholder={opts.placeholder || ''}
          className="w-full bg-[var(--bg-0)] text-[var(--text-1)] text-sm px-4 py-2.5 outline-none focus:border-[#0047FF] transition-colors"
          style={{ border: '1px solid var(--border-2)' }}
        />
      )}
    </div>
  );

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await onCreate(form); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <div className="w-full max-w-lg bg-[var(--bg-1)] p-8 max-h-[90vh] overflow-y-auto"
        style={{ border: '1px solid var(--border-2)' }}
        onClick={e => e.stopPropagation()}>
        <div className="label-mono mb-2">Workspace / Clients</div>
        <h2 className="font-display text-2xl text-[var(--text-1)] mb-6">Nouveau client</h2>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {field('name',    'Nom *',       { required: true, placeholder: 'Jean Dupont' })}
            {field('email',   'Email *',     { required: true, type: 'email', placeholder: 'client@exemple.com' })}
            {field('phone',   'Téléphone',   { placeholder: '+33 6 00 00 00 00' })}
            {field('company', 'Entreprise',  { placeholder: 'ACME Corp' })}
            {field('sector',  'Secteur',     { placeholder: 'E-commerce, SaaS, restauration…' })}
            {field('address', 'Adresse',     { placeholder: 'Paris, France' })}
          </div>
          {field('notes', 'Notes', { textarea: true, placeholder: 'Informations complémentaires…' })}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors"
              style={{ border: '1px solid var(--border-2)' }}>
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 text-sm text-[var(--text-1)] font-medium transition-colors disabled:opacity-50"
              style={{ background: '#0047FF' }}
              onMouseEnter={e => !saving && (e.currentTarget.style.background = '#0036CC')}
              onMouseLeave={e => !saving && (e.currentTarget.style.background = '#0047FF')}>
              {saving ? 'Création…' : 'Créer le client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [modal,   setModal]   = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/clients')
      .then(({ data }) => setClients(data))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (form) => {
    const { data } = await api.post('/clients', form);
    setClients(prev => [data, ...prev]);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Supprimer ce client ?')) return;
    await api.delete(`/clients/${id}`);
    setClients(prev => prev.filter(c => c.id !== id));
  };

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalBudget = clients.reduce(
    (sum, c) => sum + c.projects.reduce((s, p) => s + (p.budget || 0), 0), 0
  );

  return (
    <div>
      <PageHeader
        eyebrow="Workspace / Clients"
        title="Clients"
        description="Gérez vos contacts, entreprises et l'historique de vos collaborations."
        actions={
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--text-1)]"
            style={{ background: '#0047FF' }}
            onMouseEnter={e => e.currentTarget.style.background = '#0036CC'}
            onMouseLeave={e => e.currentTarget.style.background = '#0047FF'}>
            <Plus size={14} />
            Nouveau client
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-3" style={{ borderBottom: '1px solid var(--border-1)' }}>
        {[
          { label: 'Clients total',     value: clients.length },
          { label: 'Budget cumulé',     value: `${(totalBudget / 1000).toFixed(1)}k €` },
          { label: 'Projets associés',  value: clients.reduce((s, c) => s + (c._count?.projects || 0), 0) },
        ].map((k, i) => (
          <div key={k.label} className="px-10 py-7"
            style={{ borderRight: i < 2 ? '1px solid var(--border-1)' : 'none' }}>
            <div className="label-mono mb-2">{k.label}</div>
            <div className="font-display text-3xl text-[var(--text-1)]">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="px-10 py-6">
        {/* Recherche */}
        <div className="relative max-w-sm mb-8">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-4)]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un client, entreprise…"
            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-0)] text-[var(--text-1)] text-sm outline-none focus:border-[#0047FF] transition-colors"
            style={{ border: '1px solid var(--border-2)' }} />
        </div>

        {loading ? (
          <div className="label-mono py-20 text-center">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="label-mono py-20 text-center">
            {search ? 'Aucun résultat' : 'Aucun client — créez-en un'}
          </div>
        ) : (
          <div style={{ border: '1px solid var(--border-1)' }}>
            {/* En-tête tableau */}
            <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_40px] px-5 py-3"
              style={{ borderBottom: '1px solid var(--border-1)', background: 'var(--bg-1)' }}>
              {['Client', 'Contact', 'Secteur', 'Projets', 'Budget', ''].map(h => (
                <span key={h} className="label-mono">{h}</span>
              ))}
            </div>

            {filtered.map((c, i) => {
              const budget = c.projects.reduce((s, p) => s + (p.budget || 0), 0);
              return (
                <motion.div key={c.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_40px] px-5 py-4 items-center
                             hover:bg-[var(--hover-1)] cursor-pointer transition-colors group"
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--bg-2)' : 'none' }}
                  onClick={() => navigate(`/clients/${c.id}`)}>

                  {/* Client */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-[var(--text-1)] shrink-0"
                      style={{ background: '#0047FF22', border: '1px solid #0047FF44', color: '#4d7fff' }}>
                      {c.name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm text-[var(--text-1)] font-medium truncate">{c.name}</div>
                      {c.company && (
                        <div className="text-xs text-[var(--text-3)] font-mono flex items-center gap-1 mt-0.5">
                          <Building2 size={10} />{c.company}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="text-xs text-[var(--text-2)] font-mono space-y-0.5 min-w-0">
                    {c.email && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail size={11} className="shrink-0" />{c.email}
                      </div>
                    )}
                    {c.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone size={11} className="shrink-0" />{c.phone}
                      </div>
                    )}
                  </div>

                  {/* Secteur */}
                  <div className="label-mono truncate">{c.sector || '—'}</div>

                  {/* Projets */}
                  <div className="label-mono">{c._count?.projects || 0}</div>

                  {/* Budget */}
                  <div className="font-mono text-sm text-[var(--text-2)]">
                    {budget > 0 ? `${budget.toLocaleString('fr-FR')} €` : '—'}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={e => handleDelete(e, c.id)}
                      className="p-1.5 text-[var(--text-5)] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {modal && (
        <CreateModal
          onClose={() => setModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
