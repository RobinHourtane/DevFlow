const prisma = require('../lib/prisma');
const {
  createProjectDriveFolder,
  createDocxDoc,
  buildAgentHtml,
  isDriveConfigured,
} = require('../lib/googleDrive');

// GET /api/projects — tous les projets de l'utilisateur
const getProjects = async (req, res) => {
  try {
    const { status, type } = req.query;

    const projects = await prisma.project.findMany({
      where: {
        userId: req.userId,
        ...(status && { status }),
        ...(type && { type }),
      },
      include: {
        client: { select: { id: true, name: true, company: true } },
        phases: { select: { id: true, name: true, status: true } },
        tasks: { select: { id: true, status: true } },
        _count: { select: { tasks: true, invoices: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json(projects);
  } catch (error) {
    console.error('getProjects error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET /api/projects/:id
const getProject = async (req, res) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: Number(req.params.id), userId: req.userId },
      include: {
        client: true,
        phases: {
          include: { tasks: true },
          orderBy: { order: 'asc' },
        },
        tasks: { orderBy: { createdAt: 'desc' } },
        contracts: { select: { id: true, title: true, status: true, createdAt: true }, orderBy: { createdAt: 'desc' } },
        invoices: { include: { items: true } },
        fileStructures: true,
        aiLogs: {
          where:   { agentType: 'PROJECT_INTAKE' },
          orderBy: { createdAt: 'desc' },
          take:    1,
          select:  { id: true, response: true, createdAt: true },
        },
      },
    });

    if (!project) return res.status(404).json({ message: 'Projet non trouvé' });

    res.json(project);
  } catch (error) {
    console.error('getProject error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// POST /api/projects
const createProject = async (req, res) => {
  try {
    const { name, description, type, status, clientId, budget, startDate, endDate } = req.body;

    if (!name || !type) {
      return res.status(400).json({ message: 'Nom et type sont requis' });
    }

    // Vérifier le client seulement s'il est fourni
    if (clientId) {
      const client = await prisma.client.findFirst({
        where: { id: Number(clientId), userId: req.userId },
      });
      if (!client) return res.status(404).json({ message: 'Client non trouvé' });
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        type,
        ...(status !== undefined && { status }),
        clientId: clientId ? Number(clientId) : null,
        userId: req.userId,
        budget: budget ? Number(budget) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
      include: { client: true },
    });

    // ── Google Drive — création du dossier en arrière-plan (non bloquant) ──
    createProjectDriveFolder(project).catch(err =>
      console.error('[Drive] createFolder error:', err.message)
    );

    res.status(201).json(project);
  } catch (error) {
    console.error('createProject error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// PUT /api/projects/:id
const updateProject = async (req, res) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: Number(req.params.id), userId: req.userId },
    });
    if (!project) return res.status(404).json({ message: 'Projet non trouvé' });

    const { name, description, type, status, clientId, budget, startDate, endDate } = req.body;

    const updated = await prisma.project.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(name        !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(type        !== undefined && { type }),
        ...(status      !== undefined && { status }),
        ...(clientId    !== undefined && { clientId: clientId ? Number(clientId) : null }),
        ...(budget      !== undefined && { budget: budget ? Number(budget) : null }),
        ...(startDate   !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate     !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      },
      include: { client: true },
    });

    res.json(updated);
  } catch (error) {
    console.error('updateProject error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// DELETE /api/projects/:id
const deleteProject = async (req, res) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: Number(req.params.id), userId: req.userId },
    });
    if (!project) return res.status(404).json({ message: 'Projet non trouvé' });

    await prisma.project.delete({ where: { id: Number(req.params.id) } });

    res.json({ message: 'Projet supprimé' });
  } catch (error) {
    console.error('deleteProject error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET /api/projects/stats — KPIs pour le dashboard
const getStats = async (req, res) => {
  try {
    const [total, inProgress, signed, delivered, totalBudget, overdueCount] = await Promise.all([
      prisma.project.count({ where: { userId: req.userId } }),
      prisma.project.count({ where: { userId: req.userId, status: 'IN_PROGRESS' } }),
      prisma.project.count({ where: { userId: req.userId, status: 'SIGNED' } }),
      prisma.project.count({ where: { userId: req.userId, status: 'DELIVERED' } }),
      prisma.project.aggregate({
        where: { userId: req.userId, status: { in: ['SIGNED', 'IN_PROGRESS'] } },
        _sum: { budget: true },
      }),
      prisma.project.count({
        where: {
          userId: req.userId,
          endDate: { lt: new Date() },
          status: { notIn: ['DELIVERED', 'ARCHIVED'] },
        },
      }),
    ]);

    res.json({
      total,
      inProgress,
      signed,
      delivered,
      totalBudget: totalBudget._sum.budget || 0,
      overdue: overdueCount,
    });
  } catch (error) {
    console.error('getStats error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// POST /api/projects/:id/drive-folder — crée le dossier Drive pour un projet existant
const createDriveFolder = async (req, res) => {
  try {
    const project = await prisma.project.findFirst({
      where:   { id: Number(req.params.id), userId: req.userId },
      include: { client: true },
    });
    if (!project) return res.status(404).json({ message: 'Projet non trouvé' });

    // Déjà créé → renvoyer l'URL existante
    if (project.driveFolderId) {
      return res.json({ driveFolderId: project.driveFolderId, driveFolderUrl: project.driveFolderUrl });
    }

    await createProjectDriveFolder(project); // crée le dossier et met à jour la BDD

    const updated = await prisma.project.findUnique({
      where:  { id: project.id },
      select: { driveFolderId: true, driveFolderUrl: true },
    });
    res.json(updated);
  } catch (error) {
    console.error('createDriveFolder error:', error);
    res.status(500).json({ message: 'Erreur lors de la création du dossier Drive' });
  }
};

// POST /api/projects/:id/agents/save-to-drive — exporte un résultat agent en Google Doc
const saveAgentToDrive = async (req, res) => {
  try {
    const { agentType, result } = req.body;
    if (!agentType || !result) {
      return res.status(400).json({ message: 'agentType et result sont requis' });
    }

    const project = await prisma.project.findFirst({
      where:   { id: Number(req.params.id), userId: req.userId },
      include: { client: true },
    });
    if (!project) return res.status(404).json({ message: 'Projet non trouvé' });

    if (!isDriveConfigured()) {
      return res.status(400).json({ message: 'Google Drive non configuré' });
    }
    if (!project.driveFolderId) {
      return res.status(400).json({ message: 'Aucun dossier Drive pour ce projet — crée-le d\'abord.' });
    }

    const TITLES = {
      intake:    `📋 Analyse IA — ${project.name}`,
      email:     `📧 Email — ${project.name}`,
      structure: `📁 Structure — ${project.name}`,
      spec:      `📑 Cahier des charges — ${project.name}`,
    };
    const title = TITLES[agentType] || `Document — ${project.name}`;
    const html  = buildAgentHtml(agentType, result, project);
    const doc   = await createDocxDoc(title, html, project.driveFolderId);

    res.json({ url: doc.webViewLink, id: doc.id, title });
  } catch (error) {
    console.error('saveAgentToDrive error:', error);
    res.status(500).json({ message: 'Erreur lors de l\'envoi vers Drive' });
  }
};

module.exports = { getProjects, getProject, createProject, updateProject, deleteProject, getStats, createDriveFolder, saveAgentToDrive };
