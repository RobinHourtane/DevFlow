const prisma = require('../lib/prisma');

const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

// ── Synchronise les notifications d'une catégorie avec la réalité actuelle ──
// Crée les notifications manquantes pour les éléments problématiques détectés,
// et supprime celles dont le problème est résolu (tâche terminée, facture payée…).
const syncCategory = async (userId, prefix, items, buildData) => {
  const currentIds = new Set(items.map(i => `${prefix}:${i.id}`));

  const existing = await prisma.notification.findMany({
    where: { userId, type: { startsWith: `${prefix}:` } },
  });

  // Purger les notifications dont le problème n'existe plus
  const toDelete = existing.filter(n => !currentIds.has(n.type));
  if (toDelete.length > 0) {
    await prisma.notification.deleteMany({ where: { id: { in: toDelete.map(n => n.id) } } });
  }

  // Créer les notifications manquantes
  const existingTypes = new Set(existing.map(n => n.type));
  for (const item of items) {
    const type = `${prefix}:${item.id}`;
    if (!existingTypes.has(type)) {
      const { title, message, projectId } = buildData(item);
      await prisma.notification.create({ data: { title, message, type, userId, projectId } });
    }
  }
};

// ── Détecte les situations à signaler et synchronise les notifications ──
const generateNotifications = async (userId) => {
  const now = new Date();

  // 1. Tâches en retard (échéance dépassée, non terminées)
  const overdueTasks = await prisma.task.findMany({
    where: { project: { userId }, status: { not: 'DONE' }, dueDate: { lt: now } },
    include: { project: { select: { id: true, name: true } } },
  });
  await syncCategory(userId, 'task_overdue', overdueTasks, (t) => ({
    title:   'Tâche en retard',
    message: `« ${t.title} » devait être terminée le ${fmtDate(t.dueDate)} — projet ${t.project.name}`,
    projectId: t.projectId,
  }));

  // 2. Factures impayées en retard (échéance dépassée, non payées/annulées)
  const overdueInvoices = await prisma.invoice.findMany({
    where: { project: { userId }, status: { in: ['DRAFT', 'SENT', 'OVERDUE'] }, dueDate: { lt: now } },
    include: { project: { select: { id: true, name: true, client: { select: { name: true, company: true } } } } },
  });
  await syncCategory(userId, 'invoice_overdue', overdueInvoices, (inv) => ({
    title:   'Facture en retard de paiement',
    message: `${inv.number} — ${inv.project.client?.company || inv.project.client?.name || inv.project.name} — échéance dépassée le ${fmtDate(inv.dueDate)}`,
    projectId: inv.projectId,
  }));

  // 3. Contrats envoyés depuis longtemps sans signature (> 14 jours)
  const staleCutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const staleContracts = await prisma.contract.findMany({
    where: { project: { userId }, status: 'SENT', updatedAt: { lt: staleCutoff } },
    include: { project: { select: { id: true, name: true } } },
  });
  await syncCategory(userId, 'contract_stale', staleContracts, (c) => ({
    title:   'Contrat en attente de signature',
    message: `« ${c.title} » envoyé depuis plus de 14 jours sans retour — projet ${c.project.name}`,
    projectId: c.projectId,
  }));
};

// GET /api/notifications
const getNotifications = async (req, res) => {
  try {
    await generateNotifications(req.userId);

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.userId },
        include: { project: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.notification.count({ where: { userId: req.userId, read: false } }),
    ]);

    res.json({ notifications, unreadCount });
  } catch (e) {
    console.error('getNotifications error:', e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// PUT /api/notifications/:id/read
const markAsRead = async (req, res) => {
  try {
    const notif = await prisma.notification.findFirst({
      where: { id: Number(req.params.id), userId: req.userId },
    });
    if (!notif) return res.status(404).json({ message: 'Notification introuvable' });

    const updated = await prisma.notification.update({
      where: { id: notif.id },
      data: { read: true },
    });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// PUT /api/notifications/read-all
const markAllAsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId, read: false },
      data: { read: true },
    });
    res.json({ message: 'Toutes les notifications ont été marquées comme lues' });
  } catch (e) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// DELETE /api/notifications/:id
const deleteNotification = async (req, res) => {
  try {
    const notif = await prisma.notification.findFirst({
      where: { id: Number(req.params.id), userId: req.userId },
    });
    if (!notif) return res.status(404).json({ message: 'Notification introuvable' });

    await prisma.notification.delete({ where: { id: notif.id } });
    res.json({ message: 'Notification supprimée' });
  } catch (e) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead, deleteNotification };
