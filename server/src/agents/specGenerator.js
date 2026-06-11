/**
 * specGenerator.js — Génère un cahier des charges complet pour une plateforme web,
 * en suivant la structure du guide de référence "Plateforme Web — Guide et modèle
 * de Cahier des Charges" (Web^ID) :
 *   1. Contexte (entreprise, existant, objectifs, public, concurrence, organisation)
 *   2. Description du projet (prestations, arborescence, fonctionnalités, technique...)
 *   3. Organisation de la réponse (attentes, planning, critères, interlocuteurs)
 */

const { askJSON } = require('../lib/groq');
const prisma      = require('../lib/prisma');

const generateSpec = async (req, res) => {
  try {
    const { projectId, brief, clientInfo } = req.body;

    if (!brief || brief.trim().length < 30) {
      return res.status(400).json({ message: 'Brief trop court (30 caractères minimum)' });
    }

    let project = null;
    if (projectId) {
      project = await prisma.project.findFirst({
        where:   { id: Number(projectId), userId: req.userId },
        include: { client: true },
      });
    }

    const clientName    = project?.client?.name    || clientInfo?.name    || 'le client';
    const clientCompany = project?.client?.company || clientInfo?.company || '';
    const projectName   = project?.name             || 'Nouveau projet web';
    const projectType   = project?.type             || 'AUTRE';

    const prompt = `Tu es un consultant senior spécialisé dans le cadrage de projets de plateformes web. Tu dois rédiger un CAHIER DES CHARGES complet, concret et professionnel, en suivant EXACTEMENT la structure d'un guide de référence reconnu dans le secteur (livre blanc "Plateforme Web — Guide et modèle de Cahier des Charges").

BRIEF FOURNI PAR LE CLIENT / LE CHEF DE PROJET :
"""
${brief.trim()}
"""

INFOS CONNUES :
- Client : ${clientName}${clientCompany ? ` (${clientCompany})` : ''}
- Nom du projet : ${projectName}
- Type de projet : ${projectType}

Réponds UNIQUEMENT avec un objet JSON respectant EXACTEMENT ce schéma. Rédige un contenu concret, détaillé et exploitable directement par une agence digitale — n'écris jamais de placeholders génériques, déduis et invente des détails plausibles et cohérents à partir du brief :

{
  "title": "Cahier des charges — ${projectName}",
  "context": {
    "company": "Présentation rédigée de l'entreprise/institution : activité, valeurs, métiers, positionnement (3-5 phrases)",
    "existing": "Analyse de l'existant si refonte/reprise (technologies utilisées, points forts/faibles) sinon null si création pure",
    "objectives": ["objectif business concret 1", "objectif business concret 2", "..."],
    "targetAudience": "Description précise du public principal et des publics secondaires",
    "competitors": [{ "name": "Nom du concurrent plausible", "note": "comparaison rapide en une phrase" }],
    "projectOrganization": "Comment le pilotage du projet est organisé côté client (qui décide, qui suit)"
  },
  "description": {
    "deliverables": ["prestation attendue du prestataire 1 (UX/UI, dev, hébergement, formation, conseil SEO...)", "..."],
    "sitemap": ["Rubrique principale > Sous-rubrique", "Autre rubrique principale", "..."],
    "workflow": "Description textuelle, étape par étape, du parcours utilisateur ou métier principal (ex: visite > simulation > devis > contact)",
    "features": [{ "name": "Nom de la fonctionnalité", "priority": "HIGH", "description": "Description concrète de ce qu'elle doit faire" }],
    "thirdPartyIntegrations": ["Système / API tiers à intégrer + raison concrète", "..."],
    "technicalEnvironment": "Supports visés (desktop/mobile/app), navigateurs, contraintes d'accès et d'accessibilité",
    "backOffice": ["Fonction back-office attendue 1 (ex: gestion du catalogue)", "..."],
    "methodology": "AGILE ou WATERFALL — celle la plus adaptée au projet décrit",
    "methodologyNote": "Justification concrète du choix de méthodologie pour CE projet précis",
    "graphics": "Attentes graphiques : existence d'une charte, inspirations probables, ton visuel souhaité",
    "contentMigration": "Contenus à créer ou migrer, estimation de volumétrie",
    "statistics": "Outils de mesure d'audience recommandés (Google Analytics, Matomo...)",
    "domainName": "Recommandation concrète sur le nom de domaine",
    "hosting": "Recommandations d'hébergement : environnements (prod/préprod), contraintes de perf et de disponibilité",
    "rights": "Clause de cession des droits d'exploitation recommandée (sources, créations graphiques)",
    "maintenance": "Type de maintenance recommandé (corrective / évolutive / TMA) et fréquence",
    "promotion": "Stratégie de visibilité / promotion recommandée (SEO, SEA, réseaux sociaux...)",
    "budget": "Fourchette budgétaire réaliste en euros et logique de répartition (ex: 60% dev, 20% design, 20% conduite)"
  },
  "response": {
    "expectations": ["Élément attendu dans la réponse du prestataire 1 (ex: compréhension du contexte)", "..."],
    "planning": [{ "step": "Nom de l'étape (ex: Réunion de brief)", "detail": "Description / délai indicatif concret" }],
    "selectionCriteria": [{ "criterion": "Critère de sélection (ex: Adéquation budgétaire)", "weight": "Pondération indicative ex: 25%" }],
    "contacts": "Recommandation sur les interlocuteurs et décideurs à désigner côté client"
  }
}

Règles impératives :
- "objectives" : 3 à 6 entrées concrètes et actionnables
- "competitors" : 2 à 4 entrées plausibles pour ce secteur d'activité
- "deliverables" : 5 à 9 entrées
- "sitemap" : 6 à 14 entrées hiérarchisées avec " > " pour la profondeur
- "features" : 6 à 12 entrées, "priority" UNIQUEMENT "HIGH", "MEDIUM" ou "LOW"
- "backOffice" : 4 à 8 entrées
- "planning" : 5 à 6 étapes (brief, proposition, soutenance, sélection, livraison, mise en ligne)
- "selectionCriteria" : 4 à 6 entrées dont la somme des pondérations avoisine 100%
- Adapte précisément le contenu au type de projet (${projectType}) et au brief — reste cohérent, ne contredis jamais le brief fourni.`;

    const spec = await askJSON(prompt, { maxTokens: 6500 });

    if (projectId) {
      await prisma.aiLog.create({
        data: {
          agentType: 'SPEC_GENERATOR',
          prompt:    JSON.stringify({ brief, clientInfo }),
          response:  JSON.stringify(spec),
          userId:    req.userId,
          projectId: Number(projectId),
        },
      });
    }

    res.json(spec);
  } catch (error) {
    console.error('specGenerator error:', error);
    res.status(500).json({ message: 'Erreur lors de la génération du cahier des charges' });
  }
};

module.exports = { generateSpec };
