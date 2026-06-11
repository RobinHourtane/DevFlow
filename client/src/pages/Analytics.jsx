import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Users, ListChecks, Receipt } from 'lucide-react';
import PageHeader from '../components/devflow/PageHeader';
import api from '../lib/api';
import { fmtEUR } from '../lib/format';
import {
  PROJECT_STATUS_LABEL, PROJECT_TYPE_LABEL,
  TASK_STATUS_LABEL, TASK_STATUS_CFG,
  INVOICE_STATUS_CFG,
} from '../lib/constants';

const TASK_STATUS_COLOR = Object.fromEntries(Object.entries(TASK_STATUS_CFG).map(([k, v]) => [k, v.color]));
const INVOICE_STATUS_LABEL = Object.fromEntries(Object.entries(INVOICE_STATUS_CFG).map(([k, v]) => [k, v.label]));
const INVOICE_STATUS_COLOR = Object.fromEntries(Object.entries(INVOICE_STATUS_CFG).map(([k, v]) => [k, v.color]));

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--bg-1)] border border-[var(--border-2)] px-4 py-3 text-sm rounded-lg">
      <p className="label-mono mb-1">{label}</p>
      <p className="text-[var(--text-1)] font-mono">{fmtEUR(payload[0].value)}</p>
    </div>
  );
};

function KpiCard({ label, value, hint, i }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.06 }}
      className="card px-6 py-5">
      <div className="label-mono mb-3">{label}</div>
      <div className="font-display text-4xl text-[var(--text-1)]">{value}</div>
      <div className="text-xs text-[var(--text-4)] mt-2 font-mono">{hint}</div>
    </motion.div>
  );
}

function BarRow({ label, count, max, color = 'var(--accent)', formatValue }) {
  const pct = max > 0 ? Math.max((count / max) * 100, count > 0 ? 4 : 0) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="label-mono w-32 shrink-0 truncate">{label}</div>
      <div className="flex-1 h-5 relative overflow-hidden" style={{ background: 'var(--bg-2)', borderRadius: '6px' }}>
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }}
          className="h-full" style={{ background: color }} />
      </div>
      <div className="w-16 text-right text-sm font-mono text-[var(--text-1)] shrink-0">
        {formatValue ? formatValue(count) : count}
      </div>
    </div>
  );
}

export default function Analytics() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics')
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  }, []);

  const maxProjectStatus = useMemo(
    () => Math.max(1, ...(data?.projectsByStatus?.map(p => p.count) || [0])),
    [data]
  );
  const maxProjectType = useMemo(
    () => Math.max(1, ...(data?.projectsByType?.map(p => p.count) || [0])),
    [data]
  );
  const maxInvoiceTotal = useMemo(
    () => Math.max(1, ...Object.values(data?.invoiceStatusTotals || {})),
    [data]
  );
  const maxClientRevenue = useMemo(
    () => Math.max(1, ...(data?.topClients?.map(c => c.total) || [0])),
    [data]
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="label-mono">Chargement...</div>
    </div>
  );

  const kpis = [
    { label: 'CA encaissé',        value: fmtEUR(data?.totalRevenue),   hint: '6 derniers mois (factures payées)' },
    { label: 'CA en attente',      value: fmtEUR(data?.pendingRevenue), hint: 'Devis + factures envoyées' },
    { label: 'Tâches terminées',   value: `${data?.taskStats?.completionRate ?? 0}%`, hint: `${data?.taskStats?.done ?? 0} / ${data?.taskStats?.total ?? 0} tâches` },
    { label: 'Clients',            value: data?.clientCount ?? 0,       hint: `${data?.taskStats?.overdue ?? 0} tâche(s) en retard` },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Statistiques / Vue d'ensemble"
        title="Statistiques"
        description="Suivez votre activité : revenus, projets, tâches et clients en un coup d'œil."
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-10 pt-8">
        {kpis.map((k, i) => <KpiCard key={k.label} {...k} i={i} />)}
      </div>

      {/* Revenu mensuel */}
      <div className="px-10 pt-6">
      <section className="card p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl text-[var(--text-1)] flex items-center gap-2">
            <TrendingUp size={18} style={{ color: 'var(--accent)' }} />
            Chiffre d'affaires encaissé
          </h2>
          <span className="label-mono">6 derniers mois</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data?.revenueByMonth || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-1)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: 'var(--text-4)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-4)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              axisLine={false} tickLine={false} domain={[0, dataMax => Math.max(dataMax, 100)]}
              tickFormatter={v => v >= 1000 ? `${v / 1000}k` : `${v}`} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--hover-1)' }} />
            <Bar dataKey="ca" fill="var(--accent)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>
      </div>

      {/* Projets par statut / type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-10 pt-6">
        <section className="card p-8">
          <h2 className="font-display text-xl text-[var(--text-1)] mb-6">Projets par statut</h2>
          {!data?.projectsByStatus?.length ? (
            <div className="text-sm text-[var(--text-3)] p-6" style={{ border: '1px dashed var(--border-2)', borderRadius: '12px' }}>Aucun projet pour l'instant.</div>
          ) : (
            <div className="space-y-3">
              {data.projectsByStatus.map(p => (
                <BarRow key={p.status} label={PROJECT_STATUS_LABEL[p.status] || p.status}
                  count={p.count} max={maxProjectStatus} color="var(--accent)" />
              ))}
            </div>
          )}
        </section>

        <section className="card p-8">
          <h2 className="font-display text-xl text-[var(--text-1)] mb-6">Projets par type</h2>
          {!data?.projectsByType?.length ? (
            <div className="text-sm text-[var(--text-3)] p-6" style={{ border: '1px dashed var(--border-2)', borderRadius: '12px' }}>Aucun projet pour l'instant.</div>
          ) : (
            <div className="space-y-3">
              {data.projectsByType.map(p => (
                <BarRow key={p.type} label={PROJECT_TYPE_LABEL[p.type] || p.type}
                  count={p.count} max={maxProjectType} color="#7c3aed" />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Tâches + Factures */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-10 pt-6">
        <section className="card p-8">
          <h2 className="font-display text-xl text-[var(--text-1)] mb-6 flex items-center gap-2">
            <ListChecks size={18} style={{ color: '#d97706' }} />
            Tâches par statut
          </h2>
          {!data?.taskStats?.total ? (
            <div className="text-sm text-[var(--text-3)] p-6" style={{ border: '1px dashed var(--border-2)', borderRadius: '12px' }}>Aucune tâche pour l'instant.</div>
          ) : (
            <div className="space-y-3">
              {Object.entries(data.taskStats.byStatus).map(([status, count]) => (
                <BarRow key={status} label={TASK_STATUS_LABEL[status] || status}
                  count={count} max={data.taskStats.total} color={TASK_STATUS_COLOR[status]} />
              ))}
            </div>
          )}
        </section>

        <section className="card p-8">
          <h2 className="font-display text-xl text-[var(--text-1)] mb-6 flex items-center gap-2">
            <Receipt size={18} style={{ color: '#ef4444' }} />
            Factures par statut (TTC)
          </h2>
          {!data?.invoiceStatusCounts || Object.values(data.invoiceStatusCounts).every(c => c === 0) ? (
            <div className="text-sm text-[var(--text-3)] p-6" style={{ border: '1px dashed var(--border-2)', borderRadius: '12px' }}>Aucune facture pour l'instant.</div>
          ) : (
            <div className="space-y-3">
              {Object.entries(data.invoiceStatusTotals)
                .filter(([status]) => data.invoiceStatusCounts[status] > 0)
                .map(([status, total]) => (
                  <BarRow key={status}
                    label={`${INVOICE_STATUS_LABEL[status] || status} (${data.invoiceStatusCounts[status]})`}
                    count={total} max={maxInvoiceTotal} color={INVOICE_STATUS_COLOR[status]}
                    formatValue={fmtEUR} />
                ))}
            </div>
          )}
        </section>
      </div>

      {/* Top clients */}
      <div className="px-10 py-6">
      <section className="card p-8">
        <h2 className="font-display text-xl text-[var(--text-1)] mb-6 flex items-center gap-2">
          <Users size={18} style={{ color: '#16a34a' }} />
          Top clients (CA encaissé)
        </h2>
        {!data?.topClients?.length ? (
          <div className="text-sm text-[var(--text-3)] p-6" style={{ border: '1px dashed var(--border-2)', borderRadius: '12px' }}>
            Aucune facture encaissée pour l'instant.
          </div>
        ) : (
          <div className="space-y-3 max-w-2xl">
            {data.topClients.map(c => (
              <BarRow key={c.name} label={c.name} count={c.total} max={maxClientRevenue}
                color="#16a34a" formatValue={fmtEUR} />
            ))}
          </div>
        )}
      </section>
      </div>
    </div>
  );
}
