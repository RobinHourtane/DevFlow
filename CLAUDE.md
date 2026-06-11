# DevFlow — Documentation projet pour Claude

## Stack technique
- **Frontend** : React 18 + Vite + TailwindCSS → `client/` → port **5173**
- **Backend** : Node.js + Express → `server/` → port **5000**
- **BDD** : MariaDB 11.4.9 via **WAMP** (`wampmariadb64`) → port **3307**
- **ORM** : Prisma 6 (`server/prisma/schema.prisma`)
- **Auth** : JWT access 15min + refresh 7j, bcryptjs, Zustand
- **IA** : Groq SDK `llama-3.3-70b-versatile`, `askJSON()` pour JSON structuré
- **PDF** : pdfkit (server-side, `server/src/lib/pdfGenerator.js`)

---

## Prérequis

**WAMP doit être lancé** avant de démarrer les serveurs.
Le service `wampmariadb64` (MariaDB 11.4.9, port 3307) doit être actif.

---

## Intégration Google Drive

Quand activée, crée automatiquement à chaque projet :
- Un **dossier Drive** au nom du projet (dans `GOOGLE_DRIVE_FOLDER_ID` si défini, sinon à la racine)
- Un **Google Doc récapitulatif** (infos client, stack IA, budget, planning) après chaque analyse IA
- L'**upload des contrats PDF** dans ce dossier au téléchargement

**Désactivée par défaut** — l'app fonctionne normalement sans configuration Google.

### Setup (une seule fois, ~10 min)

1. Aller sur https://console.cloud.google.com
2. Créer un projet → **API et services** → **Bibliothèque** → chercher **Google Drive API** → Activer
3. **Identifiants** → **Créer des identifiants** → **ID client OAuth 2.0**
   - Type d'application : **Application de bureau**
   - Copier `client_id` et `client_secret`
4. Renseigner dans `server/.env` :
   ```env
   GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
   GOOGLE_DRIVE_FOLDER_ID=1aBcDeF...   # optionnel : ID du dossier parent dans Drive
   ```
5. Lancer le script d'autorisation :
   ```bash
   node server/src/scripts/google-auth-setup.js
   ```
   → Ouvre l'URL dans le navigateur → Autoriser → Coller le code → `GOOGLE_REFRESH_TOKEN` s'écrit tout seul dans `.env`

> **Tip** : Pour trouver l'ID d'un dossier Drive → ouvrir le dossier → copier la partie après `/folders/` dans l'URL

---

## Lancement des serveurs

### Méthode rapide
Double-clic sur **`start-devflow.bat`** à la racine → vérifie WAMP, ouvre les deux terminaux + navigateur.

### Méthode manuelle

**Terminal 1 — Backend :**
```bash
cd "C:\Documents\Cours Benamor\NVProjet_gestion\server"
node src/index.js
# ou en watch mode :
npm run dev
```

**Terminal 2 — Frontend :**
```bash
cd "C:\Documents\Cours Benamor\NVProjet_gestion\client"
npm run dev
```

**URLs :**
- Frontend : http://localhost:5173
- Backend API : http://localhost:5000/api
- Health check : http://localhost:5000/api/health

---

## Variables d'environnement (`server/.env`)

```env
DATABASE_URL="mysql://root:@localhost:3307/devflow?allowPublicKeyRetrieval=true&useSSL=false"
JWT_SECRET="devflow_secret_key_change_in_production"
JWT_REFRESH_SECRET="devflow_refresh_secret_key_change_in_production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=5000
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx   # vraie clé dans server/.env (jamais commitée)
CLIENT_URL="http://localhost:5173"
```

---

## Structure des dossiers clés

```
NVProjet_gestion/
├── client/src/
│   ├── pages/          Dashboard, Projects, ProjectDetail, Clients, ClientDetail,
│   │                   Contracts, Agents, Calendar
│   ├── components/
│   │   ├── layout/     Sidebar, Layout, PageHeader
│   │   └── devflow/    ContractGeneratorModal, PageHeader
│   ├── lib/            api.js (axios + auth interceptor)
│   └── store/          authStore.js (Zustand)
│
├── server/src/
│   ├── agents/         projectIntake, projectStructure, contractGenerator, emailComposer
│   ├── controllers/    auth, project, task, phase, client, contract, calendar
│   ├── routes/         auth, projects, tasks, phases, clients, contracts, agents, calendar
│   ├── lib/            groq.js, prisma.js, pdfGenerator.js
│   └── middleware/     auth.js (JWT verify)
│
├── server/prisma/
│   ├── schema.prisma   Modèles : User, Client, Project, ProjectPhase, Task,
│   │                             Contract, Invoice, FileStructure, AiLog, Notification
│   └── seed.js
│
└── start-devflow.bat   ← Lancement rapide (vérifie WAMP automatiquement)
```

---

## Routes API principales

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/login` | Connexion |
| POST | `/api/auth/register` | Inscription |
| POST | `/api/auth/refresh` | Refresh token |
| GET/POST | `/api/projects` | Liste / création projets |
| GET/PUT/DELETE | `/api/projects/:id` | Détail projet |
| GET/POST | `/api/projects/:id/phases` | Phases d'un projet |
| GET/POST | `/api/tasks` | Tâches |
| GET/POST | `/api/clients` | Clients |
| GET | `/api/clients/:id/summary` | Résumé IA du client (Groq) |
| GET/POST | `/api/contracts` | Contrats |
| GET | `/api/contracts/:id/pdf` | Téléchargement PDF (pdfkit) |
| GET | `/api/calendar` | Événements calendrier |
| POST | `/api/agents/intake` | Analyse complète cahier des charges (crée phases + tâches si projectId fourni) |
| POST | `/api/agents/contract` | Génération contrat IA |
| POST | `/api/agents/structure` | Structure de fichiers |
| POST | `/api/agents/email` | Compositeur d'email |

---

## Commandes Prisma utiles

```bash
cd server

# Appliquer les migrations
npx prisma migrate dev

# Pousser le schéma sans migration (dev rapide)
npx prisma db push

# Remplir la BDD avec les données de test
node prisma/seed.js

# Réinitialiser le mot de passe utilisateur
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
bcrypt.hash('votre_nouveau_mdp', 10).then(hash =>
  prisma.user.update({ where: { email: 'robin.hourtane@gmail.com' }, data: { password: hash } })
).then(() => { console.log('OK'); prisma.\$disconnect(); });
"
```

---

## Compte de test
- **Email** : robin.hourtane@gmail.com  
- **Mot de passe** : (défini lors du seed — voir `server/prisma/seed.js`)
