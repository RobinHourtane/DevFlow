/**
 * googleDrive.js — Intégration Google Drive pour DevFlow
 *
 * Auth : OAuth2 avec refresh_token stocké dans GOOGLE_REFRESH_TOKEN (.env)
 * Toutes les fonctions retournent null silencieusement si Drive n'est pas configuré,
 * afin de ne pas bloquer l'app si les credentials sont absents.
 */

const { google }    = require('googleapis');
const { Readable }  = require('stream');
const HTMLtoDOCX    = require('html-to-docx');
const prisma        = require('./prisma');

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * Convertit du HTML en buffer .docx (vrai fichier Word, pas un Google Doc).
 * @param {string} html
 * @returns {Promise<Buffer>}
 */
async function htmlToDocxBuffer(html) {
  const buffer = await HTMLtoDOCX(html, null, {
    table: { row: { cantSplit: true } },
    footer: false,
    pageNumber: false,
  });
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}

// ─── Auth OAuth2 ─────────────────────────────────────────────────────────────

function isDriveConfigured() {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  );
}

function getAuth() {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob',
  );
  oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return oauth2;
}

const getDrive = () => google.drive({ version: 'v3', auth: getAuth() });

// ─── Primitives Drive ─────────────────────────────────────────────────────────

/**
 * Crée un dossier dans Drive.
 * @param {string} name
 * @param {string|null} parentId  — ID du dossier parent (GOOGLE_DRIVE_FOLDER_ID ou null = racine)
 * @returns {{ id: string, webViewLink: string }}
 */
async function createFolder(name, parentId) {
  const drive = getDrive();
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : [],
    },
    fields: 'id, webViewLink',
  });
  return res.data;
}

/**
 * Crée un Google Doc à partir de contenu HTML (legacy — conservé pour compat).
 * Google Drive convertit automatiquement le HTML en Google Doc natif.
 * @param {string} title
 * @param {string} html
 * @param {string} folderId
 * @returns {{ id: string, webViewLink: string }}
 */
async function createGoogleDoc(title, html, folderId) {
  const drive = getDrive();
  const res = await drive.files.create({
    requestBody: {
      name:    title,
      mimeType: 'application/vnd.google-apps.document',
      parents: folderId ? [folderId] : [],
    },
    media: {
      mimeType: 'text/html',
      body:     Readable.from([html]),
    },
    fields: 'id, webViewLink',
  });
  return res.data;
}

/**
 * Génère un vrai fichier .docx (Word) à partir de HTML et l'upload dans Drive.
 * Contrairement à createGoogleDoc, ceci produit un binaire .docx natif —
 * pas une conversion en Google Doc.
 * @param {string} title       — nom du fichier SANS extension (.docx ajouté automatiquement)
 * @param {string} html
 * @param {string} folderId
 * @returns {{ id: string, webViewLink: string }}
 */
async function createDocxDoc(title, html, folderId) {
  const buffer = await htmlToDocxBuffer(html);
  const drive  = getDrive();
  const res = await drive.files.create({
    requestBody: {
      name:    title.endsWith('.docx') ? title : `${title}.docx`,
      mimeType: DOCX_MIME,
      parents: folderId ? [folderId] : [],
    },
    media: {
      mimeType: DOCX_MIME,
      body:     Readable.from([buffer]),
    },
    fields: 'id, webViewLink',
  });
  return res.data;
}

/**
 * Supprime un fichier Drive (pour remplacer un doc existant).
 * Ne lève pas d'erreur si le fichier n'existe plus.
 */
async function deleteFile(fileId) {
  try {
    const drive = getDrive();
    await drive.files.delete({ fileId });
  } catch { /* ignoré */ }
}

/**
 * Upload un Buffer PDF dans un dossier Drive.
 * @param {string} filename
 * @param {Buffer} buffer
 * @param {string} folderId
 * @returns {{ id: string, webViewLink: string }}
 */
async function uploadPDF(filename, buffer, folderId) {
  const drive = getDrive();
  const res = await drive.files.create({
    requestBody: {
      name:    filename,
      parents: folderId ? [folderId] : [],
    },
    media: {
      mimeType: 'application/pdf',
      body:     Readable.from([buffer]),
    },
    fields: 'id, webViewLink',
  });
  return res.data;
}

// ─── Génération du HTML récapitulatif ────────────────────────────────────────

const TYPE_LABEL = {
  SITE_VITRINE: 'Site vitrine', E_COMMERCE: 'E-commerce', SAAS: 'SaaS',
  APP_MOBILE: 'App mobile', REFONTE: 'Refonte', LANDING_PAGE: 'Landing page', AUTRE: 'Autre',
};

function row(label, value) {
  if (!value) return '';
  return `<tr><td style="padding:4px 12px 4px 0;color:#555;width:160px;"><b>${label}</b></td><td style="padding:4px 0;">${value}</td></tr>`;
}

function buildSummaryHtml(project, client, analysis) {
  const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  // ── Client ────────────────────────────────────────────────────────────────
  const clientSection = client ? `
<h2 style="color:#1a73e8;border-bottom:2px solid #1a73e8;padding-bottom:4px;">👤 Client</h2>
<table style="border-collapse:collapse;width:100%;margin-bottom:16px;">
  ${row('Nom', client.name)}
  ${row('Email', client.email)}
  ${row('Entreprise', client.company)}
  ${row('Téléphone', client.phone)}
  ${row('Secteur', client.sector)}
  ${row('Adresse', client.address)}
</table>` : '';

  // ── Projet ────────────────────────────────────────────────────────────────
  const budget   = project.budget ? `${project.budget.toLocaleString('fr-FR')} €` : null;
  const deadline = project.endDate ? new Date(project.endDate).toLocaleDateString('fr-FR') : null;

  const projectSection = `
<h2 style="color:#1a73e8;border-bottom:2px solid #1a73e8;padding-bottom:4px;">📁 Projet</h2>
<table style="border-collapse:collapse;width:100%;margin-bottom:16px;">
  ${row('Type', TYPE_LABEL[project.type] || project.type)}
  ${row('Budget saisi', budget)}
  ${row('Deadline', deadline)}
  ${row('Description', project.description)}
</table>`;

  if (!analysis) {
    return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:900px;margin:40px auto;color:#222;">
<h1 style="color:#0047FF;">📋 ${project.name}</h1>
<p style="color:#888;font-size:13px;"><em>Généré par DevFlow — ${date}</em></p>
${clientSection}
${projectSection}
<p style="color:#999;font-style:italic;">Aucune analyse IA associée pour l'instant.</p>
</body></html>`;
  }

  // ── Stack ─────────────────────────────────────────────────────────────────
  const stackRows = ['frontend', 'backend', 'database', 'hosting']
    .filter(k => analysis.stack?.[k]?.name)
    .map(k => {
      const labels = { frontend: 'Frontend', backend: 'Backend', database: 'Base de données', hosting: 'Hébergement' };
      const s = analysis.stack[k];
      return `<tr>
        <td style="padding:5px 12px 5px 0;width:140px;color:#555;"><b>${labels[k]}</b></td>
        <td style="padding:5px 0;"><b>${s.name}</b>${s.justification ? ` — <span style="color:#666;font-size:13px;">${s.justification}</span>` : ''}</td>
      </tr>`;
    }).join('');

  const toolsHtml = analysis.stack?.tools?.length
    ? `<tr><td style="padding:5px 12px 5px 0;color:#555;"><b>Outils</b></td><td style="padding:5px 0;">${analysis.stack.tools.map(t => `<span style="background:#f0f4ff;border:1px solid #ccd;padding:2px 8px;border-radius:4px;font-size:12px;margin-right:4px;">${t.name}</span>`).join('')}</td></tr>`
    : '';

  const stackSection = `
<h2 style="color:#1a73e8;border-bottom:2px solid #1a73e8;padding-bottom:4px;">⚙️ Stack technique recommandée</h2>
<table style="border-collapse:collapse;width:100%;margin-bottom:16px;">
  ${stackRows}${toolsHtml}
</table>`;

  // ── Budget ────────────────────────────────────────────────────────────────
  const budgetRows = (analysis.budget?.breakdown || []).map(item =>
    `<tr style="border-bottom:1px solid #eee;">
      <td style="padding:5px 8px;">${item.phase}</td>
      <td style="padding:5px 8px;text-align:center;color:#555;">${item.days}j</td>
      <td style="padding:5px 8px;text-align:right;font-weight:bold;">${(item.amount || 0).toLocaleString('fr-FR')} €</td>
    </tr>`
  ).join('');

  const ps = analysis.budget?.paymentSchedule;
  const echeancier = ps ? `
<p style="font-size:13px;color:#555;margin-top:8px;"><b>Échéancier :</b>
  Signature ${ps.deposit?.percent}% (${(ps.deposit?.amount||0).toLocaleString('fr-FR')} €) ·
  Mi-projet ${ps.milestone?.percent}% (${(ps.milestone?.amount||0).toLocaleString('fr-FR')} €) ·
  Livraison ${ps.delivery?.percent}% (${(ps.delivery?.amount||0).toLocaleString('fr-FR')} €)
</p>` : '';

  const budgetSection = analysis.budget ? `
<h2 style="color:#1a73e8;border-bottom:2px solid #1a73e8;padding-bottom:4px;">💶 Estimation budgétaire</h2>
<table style="border-collapse:collapse;width:100%;margin-bottom:4px;">
  <thead><tr style="background:#f5f5f5;">
    <th style="padding:6px 8px;text-align:left;">Phase</th>
    <th style="padding:6px 8px;text-align:center;">Jours</th>
    <th style="padding:6px 8px;text-align:right;">HT</th>
  </tr></thead>
  <tbody>${budgetRows}</tbody>
  <tfoot><tr style="background:#e8f0fe;font-weight:bold;">
    <td style="padding:6px 8px;">Total</td>
    <td style="padding:6px 8px;text-align:center;">${analysis.timeline?.totalDays || '—'}j</td>
    <td style="padding:6px 8px;text-align:right;">${(analysis.budget.totalHT||0).toLocaleString('fr-FR')} € HT</td>
  </tr></tfoot>
</table>
${echeancier}` : '';

  // ── Planning ──────────────────────────────────────────────────────────────
  const planningItems = (analysis.timeline?.phases || []).map(p =>
    `<li style="margin-bottom:4px;"><b>${p.name}</b> — ${p.duration}j${p.description ? ` : <span style="color:#555;">${p.description}</span>` : ''}</li>`
  ).join('');

  const planningSection = planningItems ? `
<h2 style="color:#1a73e8;border-bottom:2px solid #1a73e8;padding-bottom:4px;">📅 Planning estimatif (${analysis.timeline?.totalWeeks || '?'} semaines)</h2>
<ul style="margin:0 0 16px;padding-left:20px;">${planningItems}</ul>` : '';

  // ── Risques ───────────────────────────────────────────────────────────────
  const riskColors = { LOW: '#27ae60', MEDIUM: '#f39c12', HIGH: '#e74c3c' };
  const riskItems = (analysis.risks || []).map(r =>
    `<li style="margin-bottom:6px;"><span style="color:${riskColors[r.level]||'#555'};font-weight:bold;">[${r.level}]</span> <b>${r.title}</b>${r.mitigation ? ` — <span style="color:#666;font-size:13px;">${r.mitigation}</span>` : ''}</li>`
  ).join('');

  const risksSection = riskItems ? `
<h2 style="color:#1a73e8;border-bottom:2px solid #1a73e8;padding-bottom:4px;">⚠️ Risques identifiés</h2>
<ul style="margin:0 0 16px;padding-left:20px;">${riskItems}</ul>` : '';

  // ── Recommandations ───────────────────────────────────────────────────────
  const recoItems = (analysis.recommendations || []).map(r =>
    `<li style="margin-bottom:4px;">${r}</li>`
  ).join('');

  const recoSection = recoItems ? `
<h2 style="color:#1a73e8;border-bottom:2px solid #1a73e8;padding-bottom:4px;">✅ Recommandations</h2>
<ul style="margin:0 0 16px;padding-left:20px;">${recoItems}</ul>` : '';

  // ── Questions client ──────────────────────────────────────────────────────
  const questItems = (analysis.questions || []).map((q, i) =>
    `<li style="margin-bottom:4px;">${q}</li>`
  ).join('');

  const questSection = questItems ? `
<h2 style="color:#1a73e8;border-bottom:2px solid #1a73e8;padding-bottom:4px;">❓ Questions à poser au client</h2>
<ol style="margin:0 0 16px;padding-left:20px;">${questItems}</ol>` : '';

  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:900px;margin:40px auto;color:#222;line-height:1.6;">
<h1 style="color:#0047FF;margin-bottom:4px;">📋 ${project.name}</h1>
<p style="color:#888;font-size:13px;margin-top:0;"><em>Généré par DevFlow — ${date}</em></p>
${clientSection}
${projectSection}
${stackSection}
${budgetSection}
${planningSection}
${risksSection}
${recoSection}
${questSection}
</body></html>`;
}

// ─── Actions métier ───────────────────────────────────────────────────────────

/**
 * Crée le dossier Drive pour un projet nouvellement créé.
 * Met à jour le projet en DB avec driveFolderId + driveFolderUrl.
 */
async function createProjectDriveFolder(project) {
  if (!isDriveConfigured()) return;

  const folderName = project.client
    ? `${project.client.name} — ${project.name}`
    : project.name;

  const folder = await createFolder(
    folderName,
    process.env.GOOGLE_DRIVE_FOLDER_ID || null,
  );

  await prisma.project.update({
    where: { id: project.id },
    data: {
      driveFolderId:  folder.id,
      driveFolderUrl: folder.webViewLink,
    },
  });

  console.log(`[Drive] Dossier créé pour "${project.name}" → ${folder.webViewLink}`);
}

/**
 * Crée ou remplace le Google Doc récapitulatif d'un projet après une analyse IA.
 * @param {number} projectId
 * @param {object} analysis — résultat de l'agent projectIntake
 */
async function syncDriveSummary(projectId, analysis) {
  if (!isDriveConfigured()) return;

  const project = await prisma.project.findUnique({
    where:   { id: projectId },
    include: { client: true },
  });
  if (!project?.driveFolderId) return; // pas de dossier Drive → skip

  // Supprimer l'ancien doc s'il existe
  if (project.driveSummaryId) {
    await deleteFile(project.driveSummaryId);
  }

  const html = buildSummaryHtml(project, project.client, analysis);
  const doc  = await createDocxDoc(`📋 Résumé — ${project.name}`, html, project.driveFolderId);

  await prisma.project.update({
    where: { id: projectId },
    data:  { driveSummaryId: doc.id },
  });

  console.log(`[Drive] Récapitulatif mis à jour pour "${project.name}" → ${doc.webViewLink}`);
}

// ─── Builders HTML par type d'agent ──────────────────────────────────────────

function buildTreeText(node, depth = 0) {
  if (!node) return '';
  const indent  = '  '.repeat(depth);
  const suffix  = node.type === 'folder' ? '/' : '';
  const comment = node.description ? `  ← ${node.description}` : '';
  let out = `${indent}${node.name}${suffix}${comment}\n`;
  if (node.children?.length) {
    out += node.children.map(c => buildTreeText(c, depth + 1)).join('');
  }
  return out;
}

/**
 * Génère le HTML du cahier des charges complet (agent 'spec'),
 * en suivant la structure Contexte / Description / Organisation de la réponse.
 */
function buildSpecHtml(spec, project) {
  const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const c = spec.context     || {};
  const d = spec.description || {};
  const r = spec.response    || {};

  const h2 = (txt) => `<h2 style="color:#1a73e8;border-bottom:2px solid #1a73e8;padding-bottom:4px;margin-top:28px;">${txt}</h2>`;
  const h3 = (txt) => `<h3 style="color:#333;margin:16px 0 4px;">${txt}</h3>`;
  const p  = (txt) => txt ? `<p style="margin:0 0 12px;color:#444;">${txt}</p>` : '';
  const ul = (items) => items?.length
    ? `<ul style="margin:0 0 12px;padding-left:20px;">${items.map(i => `<li style="margin-bottom:4px;color:#444;">${i}</li>`).join('')}</ul>`
    : '';

  const competitorsHtml = c.competitors?.length
    ? ul(c.competitors.map(co => `<b>${co.name}</b> — ${co.note || ''}`))
    : '';

  const priorityColors = { HIGH: '#e74c3c', MEDIUM: '#f39c12', LOW: '#27ae60' };
  const featuresHtml = d.features?.length
    ? `<table style="border-collapse:collapse;width:100%;margin-bottom:16px;">
        <thead><tr style="background:#f5f5f5;">
          <th style="padding:6px 8px;text-align:left;">Fonctionnalité</th>
          <th style="padding:6px 8px;">Priorité</th>
          <th style="padding:6px 8px;text-align:left;">Description</th>
        </tr></thead>
        <tbody>${d.features.map(f => `<tr style="border-bottom:1px solid #eee;">
          <td style="padding:5px 8px;font-weight:bold;">${f.name}</td>
          <td style="padding:5px 8px;text-align:center;"><span style="color:${priorityColors[f.priority] || '#555'};font-weight:bold;">${f.priority || ''}</span></td>
          <td style="padding:5px 8px;color:#555;font-size:13px;">${f.description || ''}</td>
        </tr>`).join('')}</tbody>
      </table>`
    : '';

  const planningHtml = r.planning?.length
    ? `<ol style="margin:0 0 16px;padding-left:20px;">${r.planning.map(s => `<li style="margin-bottom:4px;color:#444;"><b>${s.step}</b> — ${s.detail || ''}</li>`).join('')}</ol>`
    : '';

  const criteriaHtml = r.selectionCriteria?.length
    ? `<table style="border-collapse:collapse;width:100%;margin-bottom:16px;">${r.selectionCriteria.map(cr =>
        `<tr style="border-bottom:1px solid #eee;"><td style="padding:5px 8px;color:#444;">${cr.criterion}</td><td style="padding:5px 8px;text-align:right;font-weight:bold;">${cr.weight || ''}</td></tr>`
      ).join('')}</table>`
    : '';

  const methodoLabel = d.methodology === 'AGILE' ? 'Agile' : d.methodology === 'WATERFALL' ? 'Forfait (Waterfall)' : d.methodology;

  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:920px;margin:40px auto;color:#222;line-height:1.6;">
<h1 style="color:#0047FF;margin-bottom:4px;">📋 ${spec.title || 'Cahier des charges'}</h1>
<p style="color:#888;font-size:13px;margin-top:0;"><em>Généré par DevFlow — ${date} — Projet : ${project.name}</em></p>

${h2('1. Contexte')}
${c.company          ? `${h3('Entreprise / Institution')}${p(c.company)}`               : ''}
${c.existing         ? `${h3('Existant')}${p(c.existing)}`                              : ''}
${c.objectives?.length ? `${h3('Objectifs du projet')}${ul(c.objectives)}`              : ''}
${c.targetAudience   ? `${h3('Public / utilisateurs concernés')}${p(c.targetAudience)}` : ''}
${competitorsHtml    ? `${h3('La concurrence')}${competitorsHtml}`                      : ''}
${c.projectOrganization ? `${h3('Organisation du projet')}${p(c.projectOrganization)}`  : ''}

${h2('2. Description du projet')}
${d.deliverables?.length ? `${h3('Prestations à la charge du candidat')}${ul(d.deliverables)}` : ''}
${d.sitemap?.length      ? `${h3('Arborescence du site')}${ul(d.sitemap)}`                     : ''}
${d.workflow             ? `${h3('Workflow fonctionnel')}${p(d.workflow)}`                     : ''}
${featuresHtml           ? `${h3('Fonctionnalités spécifiques')}${featuresHtml}`               : ''}
${d.thirdPartyIntegrations?.length ? `${h3('Interaction avec des systèmes tiers')}${ul(d.thirdPartyIntegrations)}` : ''}
${d.technicalEnvironment ? `${h3('Environnement technique et accessibilité')}${p(d.technicalEnvironment)}` : ''}
${d.backOffice?.length   ? `${h3('Back-office et administration')}${ul(d.backOffice)}`         : ''}
${d.methodology          ? `${h3(`Méthodologie — ${methodoLabel}`)}${p(d.methodologyNote)}`     : ''}
${d.graphics             ? `${h3('Graphisme')}${p(d.graphics)}`                                : ''}
${d.contentMigration     ? `${h3('Contenus et migration des données')}${p(d.contentMigration)}` : ''}
${d.statistics           ? `${h3('Statistiques')}${p(d.statistics)}`                           : ''}
${d.domainName           ? `${h3('Nom de domaine')}${p(d.domainName)}`                         : ''}
${d.hosting              ? `${h3('Hébergement')}${p(d.hosting)}`                               : ''}
${d.rights               ? `${h3('Droits')}${p(d.rights)}`                                     : ''}
${d.maintenance          ? `${h3('Maintenance / évolutions')}${p(d.maintenance)}`              : ''}
${d.promotion            ? `${h3('Promotion du site')}${p(d.promotion)}`                       : ''}
${d.budget               ? `${h3('Budget')}${p(d.budget)}`                                     : ''}

${h2('3. Organisation de la réponse')}
${r.expectations?.length ? `${h3('Ce que vous attendez')}${ul(r.expectations)}` : ''}
${planningHtml           ? `${h3('Planning de la consultation')}${planningHtml}` : ''}
${criteriaHtml           ? `${h3('Critères de sélection')}${criteriaHtml}` : ''}
${r.contacts             ? `${h3('Interlocuteurs')}${p(r.contacts)}` : ''}
</body></html>`;
}

/**
 * Génère le HTML à envoyer dans Drive selon le type d'agent.
 * Pour 'intake' on réutilise buildSummaryHtml (projet + analyse complète).
 * Pour 'spec' on génère le cahier des charges complet structuré.
 */
function buildAgentHtml(agentType, result, project) {
  const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const h2   = (txt) => `<h2 style="color:#1a73e8;border-bottom:2px solid #1a73e8;padding-bottom:4px;margin-top:24px;">${txt}</h2>`;

  if (agentType === 'intake') {
    return buildSummaryHtml(project, project.client, result);
  }

  if (agentType === 'spec') {
    return buildSpecHtml(result, project);
  }

  if (agentType === 'email') {
    const tipsHtml = result.tips?.length
      ? `${h2('Conseils')}<ul style="margin:0 0 16px;padding-left:20px;">${result.tips.map(t => `<li style="margin-bottom:4px;">${t}</li>`).join('')}</ul>`
      : '';
    return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:800px;margin:40px auto;color:#222;line-height:1.6;">
<h1 style="color:#0047FF;margin-bottom:4px;">📧 Email — ${project.name}</h1>
<p style="color:#888;font-size:13px;margin-top:0;"><em>Généré par DevFlow — ${date}</em></p>
${h2('Objet')}
<p style="background:#f0f4ff;padding:10px 16px;border-left:4px solid #1a73e8;font-weight:bold;margin-bottom:16px;">${result.subject || ''}</p>
${h2('Corps du message')}
<div style="white-space:pre-wrap;background:#fafafa;padding:16px;border:1px solid #e0e0e0;border-radius:4px;margin-bottom:16px;">${result.body || ''}</div>
${tipsHtml}
</body></html>`;
  }

  if (agentType === 'structure') {
    const treeText  = buildTreeText(result.structure);
    const readmeHtml = result.readme
      ? `${h2('README.md')}<pre style="background:#1e1e1e;color:#d4d4d4;padding:20px;border-radius:4px;overflow-x:auto;font-size:12px;line-height:1.5;">${result.readme.replace(/</g,'&lt;')}</pre>`
      : '';
    return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:800px;margin:40px auto;color:#222;line-height:1.6;">
<h1 style="color:#0047FF;margin-bottom:4px;">📁 Structure — ${project.name}</h1>
<p style="color:#888;font-size:13px;margin-top:0;"><em>Généré par DevFlow — ${date}</em></p>
${h2('Arborescence')}
<pre style="background:#1e1e1e;color:#d4d4d4;padding:20px;border-radius:4px;overflow-x:auto;font-size:13px;line-height:1.6;">${treeText.replace(/</g,'&lt;')}</pre>
${readmeHtml}
</body></html>`;
  }

  // Fallback générique
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:800px;margin:40px auto;">
<h1 style="color:#0047FF;">${project.name}</h1>
<p style="color:#888;font-size:13px;"><em>Généré par DevFlow — ${date}</em></p>
<pre style="background:#f5f5f5;padding:16px;border-radius:4px;">${JSON.stringify(result, null, 2)}</pre>
</body></html>`;
}

module.exports = {
  isDriveConfigured,
  createFolder,
  createGoogleDoc,
  createDocxDoc,
  htmlToDocxBuffer,
  uploadPDF,
  deleteFile,
  buildSummaryHtml,
  buildAgentHtml,
  createProjectDriveFolder,
  syncDriveSummary,
};
