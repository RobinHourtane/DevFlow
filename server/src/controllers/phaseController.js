const prisma = require('../lib/prisma');

// POST /api/projects/:id/phases
const createPhase = async (req, res) => {
  try {
    const project = await prisma.project.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!project) return res.status(404).json({ message: 'Projet non trouvé' });

    const count = await prisma.projectPhase.count({ where: { projectId: project.id } });

    const phase = await prisma.projectPhase.create({
      data: {
        name: req.body.name,
        description: req.body.description,
        order: count + 1,
        projectId: project.id,
      },
      include: { tasks: true },
    });
    res.status(201).json(phase);
  } catch (e) { res.status(500).json({ message: 'Erreur serveur' }); }
};

// PUT /api/projects/:id/phases/:phaseId
const updatePhase = async (req, res) => {
  try {
    const { name, description, status, order, startDate, endDate } = req.body;
    const phase = await prisma.projectPhase.update({
      where: { id: Number(req.params.phaseId) },
      data: {
        ...(name        !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(status      !== undefined && { status }),
        ...(order       !== undefined && { order: Number(order) }),
        ...(startDate   !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate     !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      },
      include: { tasks: true },
    });
    res.json(phase);
  } catch (e) { res.status(500).json({ message: 'Erreur serveur' }); }
};

// DELETE /api/projects/:id/phases/:phaseId
const deletePhase = async (req, res) => {
  try {
    await prisma.projectPhase.delete({ where: { id: Number(req.params.phaseId) } });
    res.json({ message: 'Phase supprimée' });
  } catch (e) { res.status(500).json({ message: 'Erreur serveur' }); }
};

module.exports = { createPhase, updatePhase, deletePhase };
