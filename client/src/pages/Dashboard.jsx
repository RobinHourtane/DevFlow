import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import PageHeader from '../components/devflow/PageHeader';
import api from '../lib/api';
import { PROJECT_STATUS_LABEL as STATUS_LABEL, PROJECT_TYPE_LABEL as TYPE_LABEL } from '../lib/constants';

const revenueData = [
  { month: 'Jan', ca: 2400 }, { month: 'Fév', ca: 3200 }, { month: 'Mar', ca: 2800 },
  { month: 'Avr', ca: 4100 }, { month: 'Mai', ca: 3700 }, { month: 'Jun', ca: 5200 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--bg-1)] border border-[var(--border-2)] px-4 py-3 text-sm">
      <p className="label-mono mb-1">{label}</p>
      <p className="text-[var(--text-1)] font-mono">{payload[0].value.toLocaleString('fr-FR')} €</p>
    </div>
  );
};

export default function Dashboard() {
  const [stats, setStats]       = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.get('/projects/stats'), api.get('/projects')])
      .then(([s, p]) => { setStats(s.data); setProjects(p.data); })
      .finally(() => setLoading(false));
  }, []);

  const kpis = useMemo(() => [
    { label: 'Projets actifs',   value: stats?.inProgress ?? 0,  hint: `${stats?.total ?? 0} au total` },
    { label: 'En négociation',   value: stats?.signed ?? 0,       hint: 'Contrats signés' },
    { label: 'Revenu pipeline',  value: `${((stats?.totalBudget ?? 0) / 1000).toFixed(1)}k €`, hint: 'Actifs + signés' },
    { label: 'En retard',        value: stats?.overdue ?? 0,      hint: stats?.overdue > 0 ? 'Action requise' : 'RAS' },
  ], [stats]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="label-mono">Chargement...</div>
    </div>
  );

  const recentProjects = projects.slice(0, 5);

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard / Vue d'ensemble"
        title="Bienvenue dans DevFlow"
        description="Pilotez vos projets, contrats, jalons et tâches dans un seul flux."
        actions={
          <button onClick={() => navigate('/agents')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--text-1)] transition-colors blue-glow"
            style={{ background: 'var(--accent)', borderRadius: '8px' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}>
            <Sparkles size={14} />
            Lancer un agent
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-10 pt-8">
        {kpis.map((k, i) => (
          <motion.div key={k.label}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="card px-6 py-5">
            <div className="label-mono mb-3">{k.label}</div>
            <div className="font-display text-4xl text-[var(--text-1)]">{k.value}</div>
            <div className="text-xs text-[var(--text-4)] mt-2 font-mono">{k.hint}</div>
          </motion.div>
        ))}
      </div>

      {/* Graphique + Projets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-10 py-6">

        {/* Area chart */}
        <section className="card p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl text-[var(--text-1)]">Chiffre d'affaires</h2>
            <span className="label-mono">6 derniers mois</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-1)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-4)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-4)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="ca" stroke="var(--accent)" strokeWidth={1.5}
                fill="url(#grad)" dot={false} activeDot={{ r: 3, fill: 'var(--accent)' }} />
            </AreaChart>
          </ResponsiveContainer>
        </section>

        {/* Projets récents */}
        <section className="card p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl text-[var(--text-1)]">Projets récents</h2>
            <Link to="/projects" className="label-mono hover:text-[var(--text-1)] transition-colors">
              Voir tout <ArrowUpRight size={11} className="inline ml-0.5" />
            </Link>
          </div>

          {recentProjects.length === 0 ? (
            <div className="text-sm text-[var(--text-3)] p-6"
              style={{ border: '1px dashed var(--border-2)', borderRadius: '12px' }}>
              Aucun projet. <Link to="/projects" state={{ prefill: {} }} className="text-[var(--accent)] hover:underline">Créez-en un →</Link>
            </div>
          ) : (
            <ul style={{ background: 'var(--card)', border: '1px solid var(--border-1)', borderRadius: '12px', overflow: 'hidden' }}>
              {recentProjects.map((p, i) => (
                <li key={p.id}
                  className="px-5 py-3.5 flex items-center justify-between hover:bg-[var(--hover-1)] cursor-pointer transition-colors"
                  style={{ borderBottom: i < recentProjects.length - 1 ? '1px solid var(--border-1)' : 'none' }}
                  onClick={() => navigate(`/projects/${p.id}`)}>
                  <div className="min-w-0">
                    <div className="text-sm text-[var(--text-1)] font-medium truncate">{p.name}</div>
                    <div className="text-xs text-[var(--text-3)] font-mono mt-0.5">
                      {p.client?.name || '—'} · {TYPE_LABEL[p.type]}
                    </div>
                  </div>
                  <span className="label-mono whitespace-nowrap ml-4">
                    {STATUS_LABEL[p.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

    </div>
  );
}
