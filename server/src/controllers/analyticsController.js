const prisma = require('../lib/prisma');

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const ttc = (inv) => inv.amount * (1 + (inv.tax || 0) / 100);

// GET /api/analytics — agrégations pour la page Statistiques
const getAnalytics = async (req, res) => {
  try {
    const userId = req.userId;

    const [projectsByStatus, projectsByType, tasks, invoices, clientCount] = await Promise.all([
      prisma.project.groupBy({ by: ['status'], where: { userId }, _count: { _all: true } }),
      prisma.project.groupBy({ by: ['type'], where: { userId }, _count: { _all: true } }),
      prisma.task.findMany({
        where: { project: { userId } },
        select: { status: true, priority: true, dueDate: true },
      }),
      prisma.invoice.findMany({
        where: { project: { userId } },
        select: {
          status: true, amount: true, tax: true, paidAt: true, createdAt: true, dueDate: true,
          project: { select: { name: true, client: { select: { name: true } } } },
        },
      }),
      prisma.client.count({ where: { userId } }),
    ]);

    // ── Tâches ──────────────────────────────────────────────────────────────
    const now = new Date();
    const taskByStatus = { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 };
    let overdueTasks = 0;
    for (const t of tasks) {
      taskByStatus[t.status] = (taskByStatus[t.status] || 0) + 1;
      if (t.status !== 'DONE' && t.dueDate && new Date(t.dueDate) < now) overdueTasks++;
    }
    const taskStats = {
      total: tasks.length,
      done: taskByStatus.DONE,
      overdue: overdueTasks,
      completionRate: tasks.length ? Math.round((taskByStatus.DONE / tasks.length) * 100) : 0,
      byStatus: taskByStatus,
    };

    // ── Revenu mensuel (6 derniers mois, factures payées) ──────────────────
    const months = [];
    const revenueMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      months.push({ key, label: MONTH_LABELS[d.getMonth()] });
      revenueMap[key] = 0;
    }
    for (const inv of invoices) {
      if (inv.status !== 'PAID' || !inv.paidAt) continue;
      const d = new Date(inv.paidAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (key in revenueMap) revenueMap[key] += ttc(inv);
    }
    const revenueByMonth = months.map(m => ({ month: m.label, ca: Math.round(revenueMap[m.key]) }));

    // ── Factures par statut (TTC) ───────────────────────────────────────────
    const invoiceStatusTotals = { DRAFT: 0, SENT: 0, PAID: 0, OVERDUE: 0, CANCELLED: 0 };
    const invoiceStatusCounts = { DRAFT: 0, SENT: 0, PAID: 0, OVERDUE: 0, CANCELLED: 0 };
    for (const inv of invoices) {
      const isOverdue = ['SENT', 'DRAFT'].includes(inv.status) && inv.dueDate && new Date(inv.dueDate) < now;
      const bucket = isOverdue ? 'OVERDUE' : inv.status;
      invoiceStatusTotals[bucket] = (invoiceStatusTotals[bucket] || 0) + ttc(inv);
      invoiceStatusCounts[bucket] = (invoiceStatusCounts[bucket] || 0) + 1;
    }
    for (const k of Object.keys(invoiceStatusTotals)) {
      invoiceStatusTotals[k] = Math.round(invoiceStatusTotals[k]);
    }

    // ── Top clients par CA encaissé ─────────────────────────────────────────
    const clientRevenue = {};
    for (const inv of invoices) {
      if (inv.status !== 'PAID') continue;
      const name = inv.project?.client?.name || inv.project?.name || 'Sans client';
      clientRevenue[name] = (clientRevenue[name] || 0) + ttc(inv);
    }
    const topClients = Object.entries(clientRevenue)
      .map(([name, total]) => ({ name, total: Math.round(total) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // ── Format projets ───────────────────────────────────────────────────────
    const projectsByStatusFmt = projectsByStatus.map(p => ({ status: p.status, count: p._count._all }));
    const projectsByTypeFmt = projectsByType.map(p => ({ type: p.type, count: p._count._all }));

    res.json({
      projectsByStatus: projectsByStatusFmt,
      projectsByType: projectsByTypeFmt,
      taskStats,
      revenueByMonth,
      invoiceStatusTotals,
      invoiceStatusCounts,
      topClients,
      clientCount,
      totalRevenue: Math.round(invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + ttc(i), 0)),
      pendingRevenue: Math.round(invoices.filter(i => ['SENT', 'DRAFT'].includes(i.status)).reduce((s, i) => s + ttc(i), 0)),
    });
  } catch (error) {
    console.error('getAnalytics error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = { getAnalytics };
