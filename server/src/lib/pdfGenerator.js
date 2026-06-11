const PDFDocument = require('pdfkit');

/** Supprime le markdown inline (**bold**, *italic*) */
const strip = (t) => t.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');

/**
 * Génère un Buffer PDF professionnel à partir d'un contrat.
 * @param {{ title: string, content: string, project?: object }} contract
 * @returns {Promise<Buffer>}
 */
function generateContractPDF(contract) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 75, bottom: 65, left: 65, right: 65 },
      bufferPages: true,       // nécessaire pour footer multi-page
      info: {
        Title:   contract.title,
        Author:  'DevFlow',
        Creator: 'DevFlow — Gestion de projets freelance',
      },
    });

    const chunks = [];
    doc.on('data',  c  => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', e  => reject(e));

    const W  = doc.page.width  - 130;  // largeur utile
    const L  = 65;                     // marge gauche
    const now = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

    // ── BANDE SUPÉRIEURE ──────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 50).fill('#050505');

    doc.fontSize(8.5).fillColor('#FFFFFF').font('Helvetica-Bold')
       .text('DEVFLOW', L, 16, { continued: true })
       .font('Helvetica').fillColor('#666666')
       .text('  ·  Contrat de prestation de services');

    doc.fontSize(8.5).fillColor('#555555').font('Helvetica')
       .text(now, L, 16, { align: 'right', width: W });

    // ── TITRE DU CONTRAT ──────────────────────────────────────────────────────
    doc.y = 78;
    doc.fontSize(19).fillColor('#000000').font('Helvetica-Bold')
       .text(contract.title, L, doc.y, { width: W });
    doc.moveDown(0.35);

    // Ligne d'accentuation bleue + grise
    const lineY = doc.y;
    doc.moveTo(L,      lineY).lineTo(L + 55, lineY).lineWidth(3).stroke('#0047FF');
    doc.moveTo(L + 58, lineY).lineTo(L + W,  lineY).lineWidth(0.5).stroke('#DDDDDD');

    doc.moveDown(1.8);

    // ── CONTENU MARKDOWN ─────────────────────────────────────────────────────
    const lines = (contract.content || '').split('\n');

    for (const raw of lines) {
      const line = raw.trimEnd();

      // Éviter orphelins en bas de page
      const remaining = doc.page.height - doc.y - 65;

      if (line.startsWith('# ')) {
        if (remaining < 140) doc.addPage();
        doc.moveDown(1.3);
        doc.fontSize(13).fillColor('#000000').font('Helvetica-Bold')
           .text(strip(line.slice(2)), L, doc.y, { width: W });
        doc.moveDown(0.2);
        doc.moveTo(L, doc.y).lineTo(L + W, doc.y).lineWidth(0.5).stroke('#CCCCCC');
        doc.moveDown(0.65);

      } else if (line.startsWith('## ')) {
        if (remaining < 100) doc.addPage();
        doc.moveDown(0.9);
        doc.fontSize(11.5).fillColor('#111111').font('Helvetica-Bold')
           .text(strip(line.slice(3)), L, doc.y, { width: W });
        doc.moveDown(0.4);

      } else if (line.startsWith('### ')) {
        doc.moveDown(0.55);
        doc.fontSize(10.5).fillColor('#222222').font('Helvetica-Bold')
           .text(strip(line.slice(4)), L, doc.y, { width: W });
        doc.moveDown(0.3);

      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        const txt = strip(line.slice(2));
        const y   = doc.y;
        doc.fontSize(10).fillColor('#333333').font('Helvetica')
           .text('•', L + 4, y, { width: 14, lineBreak: false });
        doc.text(txt, L + 20, y, { width: W - 20, lineGap: 2.5 });
        doc.moveDown(0.15);

      } else if (/^\d+\.\s/.test(line)) {
        const num = line.match(/^(\d+)\./)[1];
        const txt = strip(line.replace(/^\d+\.\s*/, ''));
        const y   = doc.y;
        doc.fontSize(10).fillColor('#0047FF').font('Helvetica-Bold')
           .text(`${num}.`, L + 4, y, { width: 20, lineBreak: false });
        doc.fillColor('#333333').font('Helvetica')
           .text(txt, L + 26, y, { width: W - 26, lineGap: 2.5 });
        doc.moveDown(0.2);

      } else if (line.trim() === '') {
        doc.moveDown(0.45);

      } else {
        doc.fontSize(10).fillColor('#333333').font('Helvetica')
           .text(strip(line), L, doc.y, { width: W, align: 'justify', lineGap: 2.5 });
        doc.moveDown(0.25);
      }
    }

    // ── ZONE SIGNATURE (si dernier paragraphe ne l'a pas) ─────────────────────
    const sigRemaining = doc.page.height - doc.y - 65;
    if (sigRemaining < 90) doc.addPage();
    doc.moveDown(2);
    doc.moveTo(L, doc.y).lineTo(L + W, doc.y).lineWidth(0.5).stroke('#EEEEEE');
    doc.moveDown(0.8);
    doc.fontSize(8.5).fillColor('#AAAAAA').font('Helvetica-Oblique')
       .text('Document généré automatiquement par DevFlow — À faire signer en deux exemplaires originaux.', L, doc.y, { width: W, align: 'center' });

    // ── FOOTER SUR CHAQUE PAGE ────────────────────────────────────────────────
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      const fy = doc.page.height - 42;
      doc.moveTo(L, fy).lineTo(L + W, fy).lineWidth(0.4).stroke('#EEEEEE');
      doc.fontSize(7.5).fillColor('#AAAAAA').font('Helvetica')
         .text(
           `${contract.title}  ·  DevFlow  ·  Page ${i + 1} / ${range.count}`,
           L, fy + 8, { width: W, align: 'center' },
         );
    }

    doc.end();
  });
}

/* ─── Libellés facture ────────────────────────────────────────────────────── */
const INVOICE_TYPE_LABEL = {
  QUOTE:   'Devis',
  DEPOSIT: 'Facture d\'acompte',
  BALANCE: 'Facture de solde',
  FULL:    'Facture',
};

const fmtEUR = (n) => `${(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

/**
 * Génère un Buffer PDF professionnel pour une facture/devis.
 * @param {{ number, type, status, amount, tax, dueDate, paidAt, notes, items, project, issuer }} invoice
 * @returns {Promise<Buffer>}
 */
function generateInvoicePDF(invoice) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 75, bottom: 65, left: 65, right: 65 },
      bufferPages: true,
      info: {
        Title:   invoice.number,
        Author:  'DevFlow',
        Creator: 'DevFlow — Gestion de projets freelance',
      },
    });

    const chunks = [];
    doc.on('data',  c  => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', e  => reject(e));

    const W   = doc.page.width - 130;
    const L   = 65;
    const typeLabel = INVOICE_TYPE_LABEL[invoice.type] || 'Facture';
    const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const client  = invoice.project?.client || {};
    const issuer  = invoice.issuer || {};

    // ── BANDE SUPÉRIEURE ──────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 50).fill('#050505');
    doc.fontSize(8.5).fillColor('#FFFFFF').font('Helvetica-Bold')
       .text('DEVFLOW', L, 16, { continued: true })
       .font('Helvetica').fillColor('#666666')
       .text(`  ·  ${typeLabel}`);
    doc.fontSize(8.5).fillColor('#555555').font('Helvetica')
       .text(now, L, 16, { align: 'right', width: W });

    // ── TITRE ─────────────────────────────────────────────────────────────────
    doc.y = 78;
    doc.fontSize(19).fillColor('#000000').font('Helvetica-Bold')
       .text(`${typeLabel} ${invoice.number}`, L, doc.y, { width: W });
    doc.moveDown(0.35);
    const lineY = doc.y;
    doc.moveTo(L,      lineY).lineTo(L + 55, lineY).lineWidth(3).stroke('#0047FF');
    doc.moveTo(L + 58, lineY).lineTo(L + W,  lineY).lineWidth(0.5).stroke('#DDDDDD');
    doc.moveDown(1.6);

    // ── BLOCS ÉMETTEUR / CLIENT ───────────────────────────────────────────────
    const blockTop = doc.y;
    const colW = (W - 30) / 2;

    doc.fontSize(8).fillColor('#999999').font('Helvetica-Bold').text('ÉMETTEUR', L, blockTop);
    doc.fontSize(10).fillColor('#111111').font('Helvetica-Bold')
       .text(issuer.name || 'Freelance', L, blockTop + 14, { width: colW });
    doc.fontSize(9).fillColor('#555555').font('Helvetica')
       .text([issuer.email, issuer.siret ? `SIRET ${issuer.siret}` : null].filter(Boolean).join('\n'), L, doc.y + 2, { width: colW, lineGap: 2 });

    const rightX = L + colW + 30;
    doc.fontSize(8).fillColor('#999999').font('Helvetica-Bold').text('FACTURÉ À', rightX, blockTop);
    doc.fontSize(10).fillColor('#111111').font('Helvetica-Bold')
       .text(client.company || client.name || 'Client', rightX, blockTop + 14, { width: colW });
    doc.fontSize(9).fillColor('#555555').font('Helvetica')
       .text([client.company ? client.name : null, client.email, client.address].filter(Boolean).join('\n'), rightX, doc.y + 2, { width: colW, lineGap: 2 });

    doc.y = Math.max(doc.y, blockTop + 80);
    doc.moveDown(0.6);
    doc.moveTo(L, doc.y).lineTo(L + W, doc.y).lineWidth(0.5).stroke('#EEEEEE');
    doc.moveDown(1);

    // ── INFOS FACTURE (projet, échéance, statut) ─────────────────────────────
    const infoY = doc.y;
    const infos = [
      ['Projet',    invoice.project?.name || '—'],
      ['Échéance',  invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('fr-FR') : '—'],
      ['Statut',    INVOICE_STATUS_LABEL[invoice.status] || invoice.status],
    ];
    const infoColW = W / 3;
    infos.forEach(([label, val], i) => {
      const x = L + i * infoColW;
      doc.fontSize(7.5).fillColor('#999999').font('Helvetica-Bold').text(label.toUpperCase(), x, infoY, { width: infoColW - 10 });
      doc.fontSize(10).fillColor('#111111').font('Helvetica').text(val, x, infoY + 12, { width: infoColW - 10 });
    });
    doc.y = infoY + 38;
    doc.moveDown(0.8);

    // ── TABLEAU DES LIGNES ────────────────────────────────────────────────────
    const items = invoice.items?.length ? invoice.items : [{ description: typeLabel, quantity: 1, unitPrice: invoice.amount, total: invoice.amount }];

    const colDesc = W * 0.5;
    const colQty  = W * 0.13;
    const colPU   = W * 0.17;
    const colTot  = W - colDesc - colQty - colPU;

    const tableX = L;
    let ty = doc.y;

    // En-tête
    doc.rect(tableX, ty, W, 24).fill('#F5F5F5');
    doc.fontSize(8).fillColor('#666666').font('Helvetica-Bold');
    doc.text('DESCRIPTION', tableX + 10, ty + 8, { width: colDesc - 10 });
    doc.text('QTÉ',         tableX + colDesc, ty + 8, { width: colQty, align: 'right' });
    doc.text('PRIX UNIT.',  tableX + colDesc + colQty, ty + 8, { width: colPU, align: 'right' });
    doc.text('TOTAL HT',    tableX + colDesc + colQty + colPU, ty + 8, { width: colTot - 10, align: 'right' });
    ty += 24;

    doc.font('Helvetica').fillColor('#333333');
    for (const item of items) {
      const rowH = 26;
      if (doc.page.height - ty - 140 < rowH) { doc.addPage(); ty = 75; }
      doc.fontSize(9.5);
      doc.text(item.description, tableX + 10, ty + 8, { width: colDesc - 16, lineGap: 1 });
      doc.text(String(item.quantity), tableX + colDesc, ty + 8, { width: colQty, align: 'right' });
      doc.text(fmtEUR(item.unitPrice), tableX + colDesc + colQty, ty + 8, { width: colPU, align: 'right' });
      doc.text(fmtEUR(item.total), tableX + colDesc + colQty + colPU, ty + 8, { width: colTot - 10, align: 'right' });
      doc.moveTo(tableX, ty + rowH).lineTo(tableX + W, ty + rowH).lineWidth(0.4).stroke('#EEEEEE');
      ty += rowH;
    }

    // ── TOTAUX ────────────────────────────────────────────────────────────────
    const subtotal = invoice.amount || 0;
    const taxAmount = subtotal * ((invoice.tax ?? 20) / 100);
    const totalTTC  = subtotal + taxAmount;

    ty += 14;
    const totW = 220;
    const totX = tableX + W - totW;
    const totals = [
      ['Total HT', fmtEUR(subtotal)],
      [`TVA (${invoice.tax ?? 20}%)`, fmtEUR(taxAmount)],
    ];
    totals.forEach(([label, val], i) => {
      doc.fontSize(9.5).fillColor('#666666').font('Helvetica').text(label, totX, ty + i * 18, { width: totW - 90 });
      doc.fillColor('#333333').text(val, totX + totW - 90, ty + i * 18, { width: 90, align: 'right' });
    });
    ty += totals.length * 18 + 6;
    doc.moveTo(totX, ty).lineTo(totX + totW, ty).lineWidth(0.5).stroke('#CCCCCC');
    ty += 8;
    doc.fontSize(11.5).fillColor('#000000').font('Helvetica-Bold').text('Total TTC', totX, ty, { width: totW - 90 });
    doc.fillColor('#0047FF').text(fmtEUR(totalTTC), totX + totW - 90, ty, { width: 90, align: 'right' });
    doc.y = ty + 30;

    // ── NOTES ─────────────────────────────────────────────────────────────────
    if (invoice.notes) {
      const remaining = doc.page.height - doc.y - 100;
      if (remaining < 60) doc.addPage();
      doc.moveDown(1);
      doc.moveTo(L, doc.y).lineTo(L + W, doc.y).lineWidth(0.5).stroke('#EEEEEE');
      doc.moveDown(0.6);
      doc.fontSize(8).fillColor('#999999').font('Helvetica-Bold').text('NOTES', L, doc.y);
      doc.moveDown(0.3);
      doc.fontSize(9.5).fillColor('#555555').font('Helvetica').text(invoice.notes, L, doc.y, { width: W, lineGap: 2.5 });
    }

    // ── FOOTER ────────────────────────────────────────────────────────────────
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      const fy = doc.page.height - 42;
      doc.moveTo(L, fy).lineTo(L + W, fy).lineWidth(0.4).stroke('#EEEEEE');
      doc.fontSize(7.5).fillColor('#AAAAAA').font('Helvetica')
         .text(`${invoice.number}  ·  DevFlow  ·  Page ${i + 1} / ${range.count}`, L, fy + 8, { width: W, align: 'center' });
    }

    doc.end();
  });
}

const INVOICE_STATUS_LABEL = {
  DRAFT: 'Brouillon', SENT: 'Envoyée', PAID: 'Payée', OVERDUE: 'En retard', CANCELLED: 'Annulée',
};

module.exports = { generateContractPDF, generateInvoicePDF };
