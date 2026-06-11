const { askJSON } = require('../lib/groq');
const prisma = require('../lib/prisma');

const EMAIL_TYPES = {
  PROPOSAL:       'Envoi de proposition commerciale',
  CONTRACT_SEND:  'Envoi du contrat pour signature',
  PROJECT_START:  'Démarrage officiel du projet',
  PHASE_COMPLETE: 'Validation d\'une phase terminée',
  DELIVERY:       'Livraison finale du projet',
  INVOICE:        'Envoi d\'une facture',
  REMINDER:       'Relance client (délai ou paiement)',
  FOLLOW_UP:      'Suivi de projet',
};

const composeEmail = async (req, res) => {
  try {
    const { emailType, context, tone = 'professional', projectId } = req.body;
    if (!emailType || !context) {
      return res.status(400).json({ message: 'Type et contexte requis' });
    }

    const typeDesc = EMAIL_TYPES[emailType] || emailType;
    const toneDesc = tone === 'professional' ? 'Professionnel et courtois'
      : tone === 'friendly' ? 'Amical et chaleureux'
      : 'Formel et soutenu';

    const prompt = `Tu es l'assistant d'un développeur web freelance français. Rédige un email professionnel.

TYPE D'EMAIL : ${typeDesc}
CONTEXTE : ${typeof context === 'object' ? JSON.stringify(context) : context}
TON : ${toneDesc}

Retourne UNIQUEMENT un JSON valide :
{
  "subject": "<objet de l'email, concis et professionnel>",
  "body": "<corps complet de l'email en texte brut, avec salutation et signature [Votre nom]>",
  "tips": ["<conseil de personnalisation 1>", "<conseil 2>"]
}`;

    const email = await askJSON(prompt);

    if (projectId) {
      await prisma.aiLog.create({
        data: {
          agentType: 'EMAIL_COMPOSER',
          prompt: `${emailType} - ${JSON.stringify(context)}`,
          response: JSON.stringify(email),
          userId: req.userId,
          projectId: Number(projectId),
        },
      });
    }

    res.json(email);
  } catch (error) {
    console.error('emailComposer error:', error);
    res.status(500).json({ message: 'Erreur lors de la composition de l\'email' });
  }
};

module.exports = { composeEmail };
