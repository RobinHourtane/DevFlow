const prisma                  = require('../lib/prisma');
const { generateContractPDF } = require('../lib/pdfGenerator');
const { uploadPDF }           = require('../lib/googleDrive');

// GET /api/contracts
const getContracts = async (req, res) => {
  try {
    const contracts = await prisma.contract.findMany({
      where: { project: { userId: req.userId } },
      include: {
        project: {
          select: {
            id: true, name: true,
            client: { select: { id: true, name: true, company: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(contracts);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET /api/contracts/:id
const getContract = async (req, res) => {
  try {
    const contract = await prisma.contract.findFirst({
      where: { id: Number(req.params.id), project: { userId: req.userId } },
      include: {
        project: {
          select: {
            id: true, name: true,
            client: { select: { id: true, name: true, company: true } },
          },
        },
      },
    });
    if (!contract) return res.status(404).json({ message: 'Contrat non trouvé' });
    res.json(contract);
  } catch (e) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// PUT /api/contracts/:id  (title + status)
const updateContract = async (req, res) => {
  try {
    const contract = await prisma.contract.findFirst({
      where: { id: Number(req.params.id), project: { userId: req.userId } },
    });
    if (!contract) return res.status(404).json({ message: 'Contrat non trouvé' });

    const { status, title } = req.body;
    const updated = await prisma.contract.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(title  !== undefined && { title  }),
        ...(status !== undefined && { status }),
        ...(status === 'SIGNED' && !contract.signedAt && { signedAt: new Date() }),
      },
    });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// DELETE /api/contracts/:id
const deleteContract = async (req, res) => {
  try {
    const contract = await prisma.contract.findFirst({
      where: { id: Number(req.params.id), project: { userId: req.userId } },
    });
    if (!contract) return res.status(404).json({ message: 'Contrat non trouvé' });

    await prisma.contract.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Contrat supprimé' });
  } catch (e) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET /api/contracts/:id/pdf
const downloadContractPDF = async (req, res) => {
  try {
    const contract = await prisma.contract.findFirst({
      where: { id: Number(req.params.id), project: { userId: req.userId } },
      include: {
        project: {
          select: { name: true, driveFolderId: true, client: { select: { name: true } } },
        },
      },
    });
    if (!contract) return res.status(404).json({ message: 'Contrat non trouvé' });

    const pdfBuffer = await generateContractPDF(contract);
    const slug      = contract.title.replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').toLowerCase();
    const filename  = `contrat-${contract.id}-${slug}.pdf`;

    // ── Google Drive — upload du PDF en arrière-plan ──
    if (contract.project.driveFolderId) {
      uploadPDF(`Contrat — ${contract.title}.pdf`, pdfBuffer, contract.project.driveFolderId)
        .catch(err => console.error('[Drive] uploadPDF error:', err.message));
    }

    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (error) {
    console.error('downloadContractPDF error:', error);
    res.status(500).json({ message: 'Erreur lors de la génération du PDF' });
  }
};

module.exports = { getContracts, getContract, updateContract, deleteContract, downloadContractPDF };
