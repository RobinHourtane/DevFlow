const prisma  = require('../lib/prisma');
const { askJSON } = require('../lib/groq');

// GET /api/clients
const getClients = async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      where: { userId: req.userId },
      include: {
        _count: { select: { projects: true } },
        projects: {
          select: {
            id: true, name: true, status: true, budget: true, type: true,
            endDate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET /api/clients/:id
const getClient = async (req, res) => {
  try {
    const client = await prisma.client.findFirst({
      where: { id: Number(req.params.id), userId: req.userId },
      include: {
        projects: {
          include: {
            _count: { select: { tasks: true } },
            phases:    { select: { id: true, status: true } },
          contracts: { select: { id: true, title: true, status: true, createdAt: true }, orderBy: { createdAt: 'desc' } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!client) return res.status(404).json({ message: 'Client non trouvé' });
    res.json(client);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET /api/clients/:id/summary  — résumé IA
const getClientSummary = async (req, res) => {
  try {
    const client = await prisma.client.findFirst({
      where: { id: Number(req.params.id), userId: req.userId },
      include: {
        projects: {
          select: { name: true, type: true, description: true, status: true, budget: true },
        },
      },
    });
    if (!client) return res.status(404).json({ message: 'Client non trouvé' });

    if (client.projects.length === 0) {
      return res.json({ summary: 'Aucun projet associé à ce client pour le moment.' });
    }

    const projectsInfo = client.projects
      .map(p =>
        `- ${p.name} (type: ${p.type}, statut: ${p.status}` +
        `${p.budget ? `, budget: ${p.budget}€` : ''}` +
        `${p.description ? `, note: ${p.description.slice(0, 80)}` : ''})`)
      .join('\n');

    const prompt = `Tu es l'assistant d'un développeur freelance. Génère une description professionnelle très courte (2 phrases maximum, 30 mots max au total) du profil de ce client basée sur ses projets. Sois factuel et percutant. Retourne UNIQUEMENT ce JSON : {"summary": "<description en français>"}

CLIENT : ${client.name}${client.company ? ` — ${client.company}` : ''}${client.sector ? `, secteur ${client.sector}` : ''}
PROJETS :
${projectsInfo}`;

    const result = await askJSON(prompt);
    res.json({ summary: result.summary || 'Analyse non disponible.' });
  } catch (error) {
    console.error('getClientSummary error:', error);
    res.status(500).json({ message: 'Erreur lors de la génération du résumé' });
  }
};

// POST /api/clients
const createClient = async (req, res) => {
  try {
    const { name, email, phone, company, sector, address, notes } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: 'Nom et email sont requis' });
    }
    const client = await prisma.client.create({
      data: { name, email, phone, company, sector, address, notes, userId: req.userId },
    });
    res.status(201).json(client);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// PUT /api/clients/:id
const updateClient = async (req, res) => {
  try {
    const client = await prisma.client.findFirst({
      where: { id: Number(req.params.id), userId: req.userId },
    });
    if (!client) return res.status(404).json({ message: 'Client non trouvé' });

    const { name, email, phone, company, sector, address, notes } = req.body;
    const updated = await prisma.client.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(name    !== undefined && { name }),
        ...(email   !== undefined && { email }),
        ...(phone   !== undefined && { phone }),
        ...(company !== undefined && { company }),
        ...(sector  !== undefined && { sector }),
        ...(address !== undefined && { address }),
        ...(notes   !== undefined && { notes }),
      },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// DELETE /api/clients/:id
const deleteClient = async (req, res) => {
  try {
    const client = await prisma.client.findFirst({
      where: { id: Number(req.params.id), userId: req.userId },
    });
    if (!client) return res.status(404).json({ message: 'Client non trouvé' });

    await prisma.client.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Client supprimé' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = { getClients, getClient, getClientSummary, createClient, updateClient, deleteClient };
