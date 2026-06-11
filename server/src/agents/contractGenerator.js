const { ask } = require('../lib/groq');
const prisma = require('../lib/prisma');

const generateContract = async (req, res) => {
  try {
    const { projectId, freelancerInfo, clientInfo, projectDetails } = req.body;
    if (!freelancerInfo || !clientInfo || !projectDetails) {
      return res.status(400).json({ message: 'Informations manquantes' });
    }

    const prompt = `Tu es un juriste spécialisé en contrats de prestation web freelance français. Génère un contrat professionnel complet en Markdown.

PRESTATAIRE :
- Nom : ${freelancerInfo.name}
- Statut : ${freelancerInfo.status || 'Auto-entrepreneur'}
- Email : ${freelancerInfo.email}
- SIRET : ${freelancerInfo.siret || 'À renseigner'}

CLIENT :
- Nom/Société : ${clientInfo.name}
- Email : ${clientInfo.email}
- Adresse : ${clientInfo.address || 'À renseigner'}

PROJET :
- Nom : ${projectDetails.name}
- Description : ${projectDetails.description || 'Non spécifié'}
- Budget HT : ${projectDetails.budget}€
- Délai : ${projectDetails.timeline}
- Livrables : ${projectDetails.deliverables || 'Non spécifié'}

Génère le contrat complet en Markdown avec ces sections numérotées :
1. Identification des parties
2. Objet du contrat
3. Description des prestations
4. Délais et planning
5. Prix et modalités de paiement (acompte 30% à la signature, solde 70% à la livraison)
6. Propriété intellectuelle
7. Confidentialité
8. Garanties et responsabilités
9. Résiliation
10. Dispositions générales et signature

Le contrat doit être juridiquement cohérent, professionnel, et adapté au droit français.`;

    const contractContent = await ask(prompt);

    let contract = null;
    if (projectId) {
      contract = await prisma.contract.create({
        data: {
          title: `Contrat — ${projectDetails.name}`,
          content: contractContent,
          status: 'DRAFT',
          projectId: Number(projectId),
        },
      });
      await prisma.aiLog.create({
        data: {
          agentType: 'CONTRACT_GENERATOR',
          prompt: JSON.stringify({ freelancerInfo, clientInfo, projectDetails }),
          response: contractContent,
          userId: req.userId,
          projectId: Number(projectId),
        },
      });
    }

    res.json({ content: contractContent, contractId: contract?.id });
  } catch (error) {
    console.error('contractGenerator error:', error);
    res.status(500).json({ message: 'Erreur lors de la génération du contrat' });
  }
};

module.exports = { generateContract };
