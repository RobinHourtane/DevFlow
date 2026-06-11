/**
 * google-auth-setup.js — Setup one-time OAuth2 pour Google Drive
 *
 * Usage : node server/src/scripts/google-auth-setup.js
 *
 * Prérequis dans server/.env :
 *   GOOGLE_CLIENT_ID=...
 *   GOOGLE_CLIENT_SECRET=...
 *
 * Ce script :
 * 1. Génère une URL d'autorisation Google → à ouvrir dans le navigateur
 * 2. L'utilisateur approuve → Google donne un code
 * 3. Le script échange le code contre un refresh_token
 * 4. Écrit GOOGLE_REFRESH_TOKEN dans server/.env automatiquement
 */

const { google }   = require('googleapis');
const readline     = require('readline');
const fs           = require('fs');
const path         = require('path');

// Charger .env depuis server/.env
const envPath = path.join(__dirname, '..', '..', '.env');
require('dotenv').config({ path: envPath });

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n❌  Manque GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET dans server/.env');
  console.error('   Ajoute-les avant de lancer ce script.\n');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob',   // code affiché dans le navigateur (pas de redirect server)
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',        // pour obtenir un refresh_token
  prompt:      'consent',        // force le refresh_token même si déjà autorisé
  scope:       ['https://www.googleapis.com/auth/drive'],
});

console.log('\n══════════════════════════════════════════════════════════════');
console.log('  DevFlow — Connexion Google Drive');
console.log('══════════════════════════════════════════════════════════════\n');
console.log('1. Ouvre ce lien dans ton navigateur :\n');
console.log('   ' + authUrl);
console.log('\n2. Connecte-toi avec ton compte Google → Autoriser l\'accès\n');
console.log('3. Google affiche un code → copie-le ici\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('   Code d\'autorisation : ', async (code) => {
  rl.close();
  try {
    const { tokens } = await oauth2Client.getToken(code.trim());

    if (!tokens.refresh_token) {
      console.error('\n❌  Pas de refresh_token reçu.');
      console.error('   Assure-toi que le prompt="consent" est bien présent et que');
      console.error('   tu as révoqué les accès précédents sur https://myaccount.google.com/permissions\n');
      process.exit(1);
    }

    // Écrire GOOGLE_REFRESH_TOKEN dans .env
    let envContent = fs.readFileSync(envPath, 'utf8');

    if (envContent.includes('GOOGLE_REFRESH_TOKEN=')) {
      // Remplacer la valeur existante
      envContent = envContent.replace(
        /GOOGLE_REFRESH_TOKEN=.*/,
        `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`,
      );
    } else {
      // Ajouter à la fin
      envContent += `\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`;
    }

    fs.writeFileSync(envPath, envContent);

    console.log('\n✅  Connecté ! GOOGLE_REFRESH_TOKEN écrit dans server/.env');
    console.log('\n──────────────────────────────────────────────────────────────');
    console.log('  Google Drive est maintenant activé dans DevFlow.');
    console.log('  Les nouveaux projets créeront automatiquement un dossier Drive.');
    console.log('──────────────────────────────────────────────────────────────\n');

    console.log('  (optionnel) Pour définir un dossier parent dans ton Drive,');
    console.log('  ajoute dans server/.env :');
    console.log('  GOOGLE_DRIVE_FOLDER_ID=<l\'ID du dossier depuis l\'URL Drive>\n');

  } catch (err) {
    console.error('\n❌  Erreur lors de l\'échange du code :', err.message);
    process.exit(1);
  }
});
