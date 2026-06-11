const prisma = require('../lib/prisma');

// GET /api/tasks/my — toutes les tâches de l'utilisateur (vue "Mes tâches", façon Asana)
const getMyTasks = async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { project: { userId: req.userId } },
      include: {
        project: { select: { id: true, name: true, type: true, status: true } },
        phase:   { select: { id: true, name: true } },
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(tasks);
  } catch (e) {
    console.error('getMyTasks error:', e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// POST /api/projects/:id/tasks
const createTask = async (req, res) => {
  try {
    const { title, description, status, phaseId, priority, dueDate, estimatedH } = req.body;
    const task = await prisma.task.create({
      data: {
        title,
        description,
        ...(status !== undefined && { status }),
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedH: estimatedH ? Number(estimatedH) : null,
        projectId: Number(req.params.id),
        phaseId: phaseId ? Number(phaseId) : null,
      },
    });
    res.status(201).json(task);
  } catch (e) { res.status(500).json({ message: 'Erreur serveur' }); }
};

// PUT /api/tasks/:taskId
const updateTask = async (req, res) => {
  try {
    const { title, description, status, priority, dueDate, estimatedH, phaseId } = req.body;
    const task = await prisma.task.update({
      where: { id: Number(req.params.taskId) },
      data: {
        ...(title       !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status      !== undefined && { status }),
        ...(priority    !== undefined && { priority }),
        ...(dueDate     !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(estimatedH  !== undefined && { estimatedH: estimatedH ? Number(estimatedH) : null }),
        ...(phaseId     !== undefined && { phaseId: phaseId ? Number(phaseId) : null }),
      },
    });
    res.json(task);
  } catch (e) { res.status(500).json({ message: 'Erreur serveur' }); }
};

// DELETE /api/tasks/:taskId
const deleteTask = async (req, res) => {
  try {
    await prisma.task.delete({ where: { id: Number(req.params.taskId) } });
    res.json({ message: 'Tâche supprimée' });
  } catch (e) { res.status(500).json({ message: 'Erreur serveur' }); }
};

module.exports = { getMyTasks, createTask, updateTask, deleteTask };
