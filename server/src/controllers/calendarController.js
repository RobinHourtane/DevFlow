const prisma = require('../lib/prisma');

// GET /api/calendar?month=2026-06
const getCalendarEvents = async (req, res) => {
  try {
    const { month } = req.query;

    // Calcul de la plage : 1er du mois → dernier jour
    let rangeStart, rangeEnd;
    if (month) {
      const [year, m] = month.split('-').map(Number);
      rangeStart = new Date(year, m - 1, 1);
      rangeEnd   = new Date(year, m, 0, 23, 59, 59);
    } else {
      const now = new Date();
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
      rangeEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    const userId = req.userId;

    // ── Projets avec deadline dans la plage ──────────────────────────────────
    const projects = await prisma.project.findMany({
      where: {
        userId,
        OR: [
          { endDate:   { gte: rangeStart, lte: rangeEnd } },
          { startDate: { gte: rangeStart, lte: rangeEnd } },
        ],
      },
      select: {
        id: true, name: true, status: true, type: true,
        startDate: true, endDate: true,
        client: { select: { name: true } },
      },
    });

    // ── Tâches avec dueDate dans la plage ────────────────────────────────────
    const tasks = await prisma.task.findMany({
      where: {
        project: { userId },
        dueDate: { gte: rangeStart, lte: rangeEnd },
      },
      select: {
        id: true, title: true, status: true, priority: true, dueDate: true,
        project: { select: { id: true, name: true } },
        phase:   { select: { name: true } },
      },
    });

    // ── Phases avec dates dans la plage ──────────────────────────────────────
    const phases = await prisma.projectPhase.findMany({
      where: {
        project: { userId },
        OR: [
          { endDate:   { gte: rangeStart, lte: rangeEnd } },
          { startDate: { gte: rangeStart, lte: rangeEnd } },
        ],
      },
      select: {
        id: true, name: true, status: true, startDate: true, endDate: true,
        project: { select: { id: true, name: true } },
      },
    });

    // ── Formater en événements plats ─────────────────────────────────────────
    const events = [];

    for (const p of projects) {
      if (p.startDate) {
        events.push({
          id:        `project-start-${p.id}`,
          type:      'project_start',
          title:     p.name,
          date:      p.startDate,
          status:    p.status,
          projectId: p.id,
          client:    p.client?.name || null,
          color:     'blue',
        });
      }
      if (p.endDate) {
        const isOverdue = p.endDate < new Date() && !['DELIVERED', 'ARCHIVED'].includes(p.status);
        events.push({
          id:        `project-end-${p.id}`,
          type:      'project_deadline',
          title:     p.name,
          date:      p.endDate,
          status:    p.status,
          projectId: p.id,
          client:    p.client?.name || null,
          color:     isOverdue ? 'red' : 'blue',
        });
      }
    }

    for (const t of tasks) {
      const isOverdue = t.dueDate < new Date() && t.status !== 'DONE';
      const priorityColor = t.priority === 'URGENT' ? 'red'
        : t.priority === 'HIGH' ? 'orange'
        : 'yellow';
      events.push({
        id:          `task-${t.id}`,
        type:        'task',
        title:       t.title,
        date:        t.dueDate,
        status:      t.status,
        priority:    t.priority,
        taskId:      t.id,
        projectId:   t.project.id,
        projectName: t.project.name,
        phase:       t.phase?.name || null,
        color:       isOverdue ? 'red' : priorityColor,
      });
    }

    for (const ph of phases) {
      if (ph.endDate) {
        events.push({
          id:          `phase-${ph.id}`,
          type:        'phase',
          title:       `${ph.name}`,
          date:        ph.endDate,
          status:      ph.status,
          projectId:   ph.project.id,
          projectName: ph.project.name,
          color:       'purple',
        });
      }
    }

    // ── Événements à venir (30 prochains jours, tous mois confondus) ─────────
    const now = new Date();
    const upcoming = await prisma.project.findMany({
      where: {
        userId,
        endDate: { gte: now, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
        status: { notIn: ['DELIVERED', 'ARCHIVED'] },
      },
      select: { id: true, name: true, endDate: true, status: true },
      orderBy: { endDate: 'asc' },
      take: 10,
    });

    res.json({ events, upcoming });
  } catch (error) {
    console.error('getCalendarEvents error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = { getCalendarEvents };
