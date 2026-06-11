const { askJSON } = require('../lib/groq');
const prisma = require('../lib/prisma');

const PROJECT_TEMPLATES = {
  SITE_VITRINE:  'Site vitrine avec HTML/CSS/JS ou React statique',
  E_COMMERCE:    'Site e-commerce avec panier, paiement, gestion produits',
  SAAS:          'Application SaaS avec authentification, dashboard, API REST',
  APP_MOBILE:    'Application mobile React Native',
  REFONTE:       'Refonte d\'un site existant',
  LANDING_PAGE:  'Landing page optimisée conversion',
  AUTRE:         'Projet web custom',
};

const generateStructure = async (req, res) => {
  try {
    const { projectType, projectName, techStack, projectId } = req.body;
    if (!projectType || !projectName) {
      return res.status(400).json({ message: 'Type et nom du projet requis' });
    }

    const typeDesc = PROJECT_TEMPLATES[projectType] || PROJECT_TEMPLATES.AUTRE;
    const slug = projectName.toLowerCase().replace(/\s+/g, '-');

    const prompt = `Tu es un expert développeur web. Génère une arborescence de fichiers/dossiers professionnelle.

NOM DU PROJET : ${projectName}
TYPE : ${typeDesc}
STACK TECHNIQUE : ${techStack || 'React + Node.js'}

Retourne UNIQUEMENT un JSON valide avec cette structure :
{
  "structure": {
    "type": "folder",
    "name": "${slug}",
    "children": [
      {
        "type": "folder" ou "file",
        "name": "<nom>",
        "description": "<description courte>",
        "children": []
      }
    ]
  },
  "readme": "<contenu README.md en markdown, 10-15 lignes>"
}

Inclure obligatoirement : README.md, .gitignore, .env.example, et une structure professionnelle complète adaptée au stack.`;

    const result = await askJSON(prompt);

    let fileStructureRecord = null;
    if (projectId) {
      fileStructureRecord = await prisma.fileStructure.create({
        data: {
          name: projectName,
          structure: JSON.stringify(result.structure),
          projectId: Number(projectId),
        },
      });
      await prisma.aiLog.create({
        data: {
          agentType: 'PROJECT_STRUCTURE',
          prompt: `${projectType} - ${projectName}`,
          response: JSON.stringify(result),
          userId: req.userId,
          projectId: Number(projectId),
        },
      });
    }

    res.json({ ...result, id: fileStructureRecord?.id });
  } catch (error) {
    console.error('projectStructure error:', error);
    res.status(500).json({ message: 'Erreur lors de la génération de la structure' });
  }
};

module.exports = { generateStructure };
