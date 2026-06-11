const { askJSON }          = require('../lib/groq');
const prisma               = require('../lib/prisma');
const { syncDriveSummary } = require('../lib/googleDrive');

// ── Applique une analyse (déjà générée) à un projet : crée phases + tâches ──
// Réutilisable depuis projectIntake (analyse + lien direct) et depuis
// applyAnalysis (ré-application d'une analyse standalone après création du projet,
// pour éviter un appel LLM redondant).
const applyAnalysisToProject = async (pid, analysis) => {
  if (!analysis?.timeline?.phases?.length) return null;

  // Supprimer les anciennes phases IA (et leurs tâches liées via phaseId)
  const oldPhases = await prisma.projectPhase.findMany({
    where: { projectId: pid },
    select: { id: true },
  });
  if (oldPhases.length > 0) {
    const phaseIds = oldPhases.map(p => p.id);
    await prisma.task.updateMany({
      where: { phaseId: { in: phaseIds } },
      data: { phaseId: null },
    });
    await prisma.projectPhase.deleteMany({ where: { projectId: pid } });
  }

  let phasesCreated = 0;
  let tasksCreated  = 0;

  for (const [i, phase] of analysis.timeline.phases.entries()) {
    const createdPhase = await prisma.projectPhase.create({
      data: {
        name:        phase.name,
        description: phase.description || null,
        order:       phase.order ?? (i + 1),
        projectId:   pid,
      },
    });
    phasesCreated++;

    const deliverables = phase.deliverables || [];
    if (deliverables.length > 0) {
      await prisma.task.createMany({
        data: deliverables.map(title => ({
          title,
          projectId: pid,
          phaseId:   createdPhase.id,
          status:    'TODO',
          priority:  'MEDIUM',
        })),
      });
      tasksCreated += deliverables.length;
    }
  }

  const planning = { phasesCreated, tasksCreated };

  syncDriveSummary(pid, { ...analysis, _planning: planning }).catch(err =>
    console.error('[Drive] syncSummary error:', err.message)
  );

  return planning;
};

// ── Ré-applique une analyse déjà générée (standalone) à un projet nouvellement
// créé : log AiLog + création phases/tâches, sans relancer le LLM ──
const applyAnalysis = async (req, res) => {
  try {
    const { projectId, analysis } = req.body;

    if (!projectId || !analysis) {
      return res.status(400).json({ message: 'projectId et analysis sont requis' });
    }

    const pid = Number(projectId);
    const project = await prisma.project.findFirst({ where: { id: pid, userId: req.userId } });
    if (!project) {
      return res.status(404).json({ message: 'Projet introuvable' });
    }

    await prisma.aiLog.create({
      data: {
        agentType: 'PROJECT_INTAKE',
        prompt:    (analysis.summary || analysis.projectName || '').slice(0, 500),
        response:  JSON.stringify(analysis),
        userId:    req.userId,
        projectId: pid,
      },
    });

    const planning = await applyAnalysisToProject(pid, analysis);

    res.json({ ...analysis, _planning: planning });
  } catch (error) {
    console.error('applyAnalysis error:', error);
    res.status(500).json({ message: "Erreur lors de l'application de l'analyse au projet" });
  }
};

const projectIntake = async (req, res) => {
  try {
    const { brief, budgetHint, deadlineHint, projectId } = req.body;

    if (!brief || brief.trim().length < 30) {
      return res.status(400).json({ message: 'Le cahier des charges est trop court (minimum 30 caractères)' });
    }

    const extras = [
      budgetHint  ? `BUDGET CLIENT SOUHAITÉ : ${budgetHint}€` : null,
      deadlineHint ? `DÉLAI SOUHAITÉ PAR LE CLIENT : ${deadlineHint}` : null,
    ].filter(Boolean).join('\n');

    const prompt = `Tu es un expert en développement web freelance français avec 10 ans d'expérience. Ton rôle est d'analyser un cahier des charges client et de fournir une analyse professionnelle complète pour aider un développeur freelance à chiffrer et planifier le projet.

CAHIER DES CHARGES :
${brief}
${extras ? '\n' + extras : ''}

Analyse ce projet en profondeur et retourne UNIQUEMENT un JSON valide avec cette structure exacte :

{
  "projectName": "<nom court et professionnel suggéré pour ce projet>",
  "projectType": "<exactement l'un de : SITE_VITRINE, E_COMMERCE, SAAS, APP_MOBILE, REFONTE, LANDING_PAGE, AUTRE>",
  "summary": "<résumé du projet en 3-4 phrases claires, ce que le client veut vraiment>",
  "complexity": "<exactement LOW, MEDIUM ou HIGH>",
  "complexityReason": "<explication en 1 phrase pourquoi cette complexité>",

  "clientSuggestion": <
    Si le cahier des charges mentionne EXPLICITEMENT un nom de client, d'entreprise ou de
    contact (personne, boutique, société...), retourne un objet :
    { "name": "<nom de la personne ou de l'entreprise tel que mentionné>", "company": "<nom d'entreprise si distinct, sinon null>", "sector": "<secteur d'activité déduit ou null>" }
    Sinon (aucun nom identifiable dans le brief), retourne EXACTEMENT null.
    Ne jamais inventer un nom — uniquement extraire ce qui est écrit ou clairement déductible.
  >,

  "stack": {
    "frontend": { "name": "<framework/techno>", "justification": "<pourquoi ce choix pour CE projet spécifique>" },
    "backend":  { "name": "<techno ou null si statique>", "justification": "<pourquoi>" },
    "database": { "name": "<BDD ou null>", "justification": "<pourquoi>" },
    "hosting":  { "name": "<hébergement recommandé>", "justification": "<pourquoi, coût estimé/mois>" },
    "tools": [
      { "name": "<outil/service tiers>", "purpose": "<rôle dans le projet>" }
    ]
  },

  "budget": {
    "dailyRate": <taux journalier recommandé entre 350 et 650, adapter selon complexité>,
    "totalHT": <montant total HT arrondi à la centaine>,
    "totalTTC": <totalHT * 1.2 arrondi>,
    "breakdown": [
      {
        "phase": "<nom de la phase>",
        "days": <nombre de jours>,
        "amount": <days * dailyRate>,
        "description": "<ce qui est inclus dans cette phase>"
      }
    ],
    "paymentSchedule": {
      "deposit":   { "percent": 30, "label": "À la signature", "amount": <30% du total HT> },
      "milestone": { "percent": 40, "label": "Mi-projet / recette", "amount": <40% du total HT> },
      "delivery":  { "percent": 30, "label": "À la livraison", "amount": <30% du total HT> }
    }
  },

  "timeline": {
    "totalDays": <total jours ouvrés>,
    "totalWeeks": <arrondi au supérieur>,
    "phases": [
      {
        "name": "<nom>",
        "order": <numéro>,
        "duration": <jours>,
        "description": "<ce qui est fait dans cette phase>",
        "deliverables": ["<livrable concret 1>", "<livrable 2>"]
      }
    ]
  },

  "risks": [
    {
      "title": "<risque identifié>",
      "level": "<LOW, MEDIUM ou HIGH>",
      "mitigation": "<comment le prévenir ou le gérer>"
    }
  ],

  "recommendations": [
    "<conseil professionnel concret 1>",
    "<conseil 2>",
    "<conseil 3>"
  ],

  "deliverables": [
    "<livrable final 1>",
    "<livrable 2>"
  ],

  "questions": [
    "<question importante à poser au client avant de démarrer 1>",
    "<question 2>"
  ]
}

Adapte le niveau de détail, la stack et le budget à la réalité du marché français du freelance web. Sois précis sur les jours et montants.`;

    const analysis = await askJSON(prompt);

    // Log en BDD
    await prisma.aiLog.create({
      data: {
        agentType: 'PROJECT_INTAKE',
        prompt: brief.slice(0, 500),
        response: JSON.stringify(analysis),
        userId: req.userId,
        projectId: projectId ? Number(projectId) : null,
      },
    });

    // ── Création automatique des phases et tâches sur le planning ──
    if (projectId && analysis.timeline?.phases?.length > 0) {
      const pid = Number(projectId);
      const planning = await applyAnalysisToProject(pid, analysis);
      if (planning) analysis._planning = planning;
    }

    res.json(analysis);
  } catch (error) {
    console.error('projectIntake error:', error);
    res.status(500).json({ message: "Erreur lors de l'analyse du projet" });
  }
};

module.exports = { projectIntake, applyAnalysis };
