const prisma                 = require('../lib/prisma');
const { generateInvoicePDF } = require('../lib/pdfGenerator');
const { uploadPDF }          = require('../lib/googleDrive');

const PROJECT_SELECT = {
  select: {
    id: true, name: true, driveFolderId: true,
    client: { select: { id: true, name: true, company: true, email: true, address: true } },
  },
};

// ── Préfixe de numérotation selon le type ──
const TYPE_PREFIX = { QUOTE: 'DEV', DEPOSIT: 'ACO', BALANCE: 'SOLDE', FULL: 'FACT' };

const generateInvoiceNumber = async (type) => {
  const year   = new Date().getFullYear();
  const prefix = TYPE_PREFIX[type] || 'FACT';
  const base   = `${prefix}-${year}-`;
  const count  = await prisma.invoice.count({ where: { number: { startsWith: base } } });
  return `${base}${String(count + 1).padStart(3, '0')}`;
};

// GET /api/invoices
const getInvoices = async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { project: { userId: req.userId } },
      include: { project: PROJECT_SELECT, items: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(invoices);
  } catch (e) {
    console.error('getInvoices error:', e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET /api/invoices/:id
const getInvoice = async (req, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: Number(req.params.id), project: { userId: req.userId } },
      include: { project: PROJECT_SELECT, items: true },
    });
    if (!invoice) return res.status(404).json({ message: 'Facture introuvable' });
    res.json(invoice);
  } catch (e) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// POST /api/invoices
const createInvoice = async (req, res) => {
  try {
    const { projectId, type, dueDate, notes, tax, items } = req.body;

    if (!projectId || !type) {
      return res.status(400).json({ message: 'projectId et type sont requis' });
    }
    if (!TYPE_PREFIX[type]) {
      return res.status(400).json({ message: 'Type de facture invalide' });
    }

    const project = await prisma.project.findFirst({ where: { id: Number(projectId), userId: req.userId } });
    if (!project) return res.status(404).json({ message: 'Projet introuvable' });

    const cleanItems = (Array.isArray(items) ? items : [])
      .filter(it => it?.description?.trim())
      .map(it => {
        const quantity  = Number(it.quantity)  || 1;
        const unitPrice = Number(it.unitPrice) || 0;
        return { description: it.description.trim(), quantity, unitPrice, total: quantity * unitPrice };
      });

    if (cleanItems.length === 0) {
      return res.status(400).json({ message: 'Au moins une ligne de prestation est requise' });
    }

    const amount = cleanItems.reduce((sum, it) => sum + it.total, 0);
    const number = await generateInvoiceNumber(type);

    const invoice = await prisma.invoice.create({
      data: {
        number,
        type,
        amount,
        tax:     tax !== undefined && tax !== null && tax !== '' ? Number(tax) : 20,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes:   notes?.trim() || null,
        projectId: project.id,
        items: { create: cleanItems },
      },
      include: { project: PROJECT_SELECT, items: true },
    });

    res.status(201).json(invoice);
  } catch (e) {
    console.error('createInvoice error:', e);
    res.status(500).json({ message: 'Erreur lors de la création de la facture' });
  }
};

// PUT /api/invoices/:id  (statut, échéance, notes)
const updateInvoice = async (req, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: Number(req.params.id), project: { userId: req.userId } },
    });
    if (!invoice) return res.status(404).json({ message: 'Facture introuvable' });

    const { status, dueDate, notes } = req.body;

    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        ...(status  !== undefined && { status }),
        ...(status === 'PAID' && !invoice.paidAt ? { paidAt: new Date() } : {}),
        ...(status !== undefined && status !== 'PAID' && invoice.paidAt ? { paidAt: null } : {}),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(notes   !== undefined && { notes: notes?.trim() || null }),
      },
      include: { project: PROJECT_SELECT, items: true },
    });

    res.json(updated);
  } catch (e) {
    console.error('updateInvoice error:', e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// DELETE /api/invoices/:id
const deleteInvoice = async (req, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: Number(req.params.id), project: { userId: req.userId } },
    });
    if (!invoice) return res.status(404).json({ message: 'Facture introuvable' });

    await prisma.invoice.delete({ where: { id: invoice.id } });
    res.json({ message: 'Facture supprimée' });
  } catch (e) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET /api/invoices/:id/pdf
const downloadInvoicePDF = async (req, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: Number(req.params.id), project: { userId: req.userId } },
      include: { project: PROJECT_SELECT, items: true },
    });
    if (!invoice) return res.status(404).json({ message: 'Facture introuvable' });

    const issuer = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { name: true, email: true },
    });

    const pdfBuffer = await generateInvoicePDF({ ...invoice, issuer });
    const slug      = invoice.number.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const filename  = `${slug}.pdf`;

    // ── Google Drive — upload du PDF en arrière-plan ──
    if (invoice.project.driveFolderId) {
      uploadPDF(`${invoice.number}.pdf`, pdfBuffer, invoice.project.driveFolderId)
        .catch(err => console.error('[Drive] uploadPDF error:', err.message));
    }

    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (error) {
    console.error('downloadInvoicePDF error:', error);
    res.status(500).json({ message: 'Erreur lors de la génération du PDF' });
  }
};

module.exports = {
  getInvoices, getInvoice, createInvoice, updateInvoice, deleteInvoice, downloadInvoicePDF,
};
