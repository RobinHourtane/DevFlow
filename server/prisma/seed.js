require('dotenv').config();
const prisma = require('../src/lib/prisma');

const USER_ID = 1; // Robin

async function main() {
  console.log('🌱 Seeding DevFlow...\n');

  // ─── Nettoyage ──────────────────────────────────────────────────────────────
  await prisma.aiLog.deleteMany({ where: { userId: USER_ID } });
  await prisma.notification.deleteMany({ where: { userId: USER_ID } });
  await prisma.invoice.deleteMany({ where: { project: { userId: USER_ID } } });
  await prisma.contract.deleteMany({ where: { project: { userId: USER_ID } } });
  await prisma.task.deleteMany({ where: { project: { userId: USER_ID } } });
  await prisma.projectPhase.deleteMany({ where: { project: { userId: USER_ID } } });
  await prisma.fileStructure.deleteMany({ where: { project: { userId: USER_ID } } });
  await prisma.project.deleteMany({ where: { userId: USER_ID } });
  await prisma.client.deleteMany({ where: { userId: USER_ID } });
  console.log('✅ Base nettoyée');

  // ─── Clients ────────────────────────────────────────────────────────────────
  const clients = await Promise.all([
    prisma.client.create({ data: {
      name: 'Sophie Martin', email: 'sophie@boulangerie-martin.fr',
      phone: '06 12 34 56 78', company: 'Boulangerie Martin',
      sector: 'Artisanat / Alimentaire',
      address: '12 rue du Four, 75011 Paris',
      notes: 'Cliente fidèle, très réactive. Préfère les échanges par email.',
      userId: USER_ID,
    }}),
    prisma.client.create({ data: {
      name: 'Thomas Leroy', email: 'thomas@techstart.io',
      phone: '07 98 76 54 32', company: 'TechStart SAS',
      sector: 'Tech / SaaS',
      address: '45 avenue de la République, 69003 Lyon',
      notes: 'Startup en croissance. Budget serré mais bon potentiel long terme.',
      userId: USER_ID,
    }}),
    prisma.client.create({ data: {
      name: 'Marie Dubois', email: 'marie.dubois@cabinet-juridique.fr',
      phone: '06 55 44 33 22', company: 'Cabinet Dubois & Associés',
      sector: 'Juridique',
      address: '8 place du Palais, 33000 Bordeaux',
      notes: 'Exigeante sur les délais et la confidentialité.',
      userId: USER_ID,
    }}),
    prisma.client.create({ data: {
      name: 'Antoine Petit', email: 'antoine@mode-vintage.com',
      company: 'Mode Vintage', sector: 'E-commerce / Mode',
      address: '23 rue du Commerce, 75015 Paris',
      userId: USER_ID,
    }}),
  ]);
  console.log(`✅ ${clients.length} clients créés`);

  // ─── Projet 1 — Site vitrine boulangerie (LIVRÉ) ─────────────────────────
  const p1 = await prisma.project.create({ data: {
    name: 'Site vitrine Boulangerie Martin',
    description: 'Site vitrine 5 pages avec galerie photos, formulaire de contact, horaires et présentation des produits. Mobile-first, SEO optimisé.',
    type: 'SITE_VITRINE', status: 'DELIVERED',
    budget: 2200, budgetSpent: 2200,
    startDate: new Date('2026-02-10'),
    endDate: new Date('2026-03-25'),
    signedAt: new Date('2026-02-08'),
    userId: USER_ID, clientId: clients[0].id,
  }});

  const p1phases = await Promise.all([
    prisma.projectPhase.create({ data: { name: 'Design & Maquettes', order: 1, status: 'DONE', projectId: p1.id, startDate: new Date('2026-02-10'), endDate: new Date('2026-02-17') }}),
    prisma.projectPhase.create({ data: { name: 'Développement', order: 2, status: 'DONE', projectId: p1.id, startDate: new Date('2026-02-18'), endDate: new Date('2026-03-10') }}),
    prisma.projectPhase.create({ data: { name: 'Tests & Livraison', order: 3, status: 'DONE', projectId: p1.id, startDate: new Date('2026-03-11'), endDate: new Date('2026-03-25') }}),
  ]);

  await Promise.all([
    prisma.task.create({ data: { title: 'Maquette Figma page accueil', status: 'DONE', priority: 'HIGH', projectId: p1.id, phaseId: p1phases[0].id }}),
    prisma.task.create({ data: { title: 'Maquette pages secondaires', status: 'DONE', priority: 'MEDIUM', projectId: p1.id, phaseId: p1phases[0].id }}),
    prisma.task.create({ data: { title: 'Validation maquettes client', status: 'DONE', priority: 'HIGH', projectId: p1.id, phaseId: p1phases[0].id }}),
    prisma.task.create({ data: { title: 'Intégration HTML/CSS', status: 'DONE', priority: 'HIGH', projectId: p1.id, phaseId: p1phases[1].id }}),
    prisma.task.create({ data: { title: 'Galerie photos', status: 'DONE', priority: 'MEDIUM', projectId: p1.id, phaseId: p1phases[1].id }}),
    prisma.task.create({ data: { title: 'Formulaire de contact', status: 'DONE', priority: 'MEDIUM', projectId: p1.id, phaseId: p1phases[1].id }}),
    prisma.task.create({ data: { title: 'Optimisation SEO', status: 'DONE', priority: 'HIGH', projectId: p1.id, phaseId: p1phases[1].id }}),
    prisma.task.create({ data: { title: 'Tests multi-navigateurs', status: 'DONE', priority: 'HIGH', projectId: p1.id, phaseId: p1phases[2].id }}),
    prisma.task.create({ data: { title: 'Mise en ligne & DNS', status: 'DONE', priority: 'URGENT', projectId: p1.id, phaseId: p1phases[2].id }}),
  ]);

  await prisma.contract.create({ data: {
    title: 'Contrat — Site vitrine Boulangerie Martin',
    content: '# Contrat de prestation\n\nEntre Robin Hourtané (prestataire) et Sophie Martin (client).\n\n## Objet\nCréation d\'un site vitrine pour la Boulangerie Martin.\n\n## Prix\n2 200 € HT\n\n## Statut\nSigné le 8 février 2026.',
    status: 'SIGNED', signedAt: new Date('2026-02-08'), projectId: p1.id,
  }});

  // ─── Projet 2 — SaaS TechStart (EN COURS) ────────────────────────────────
  const p2 = await prisma.project.create({ data: {
    name: 'Plateforme SaaS TechStart',
    description: 'Application SaaS de gestion de projets pour équipes tech. Auth JWT, dashboard analytics, API REST, notifications temps réel.',
    type: 'SAAS', status: 'IN_PROGRESS',
    budget: 12000, budgetSpent: 4800,
    startDate: new Date('2026-04-01'),
    endDate: new Date('2026-07-15'),
    signedAt: new Date('2026-03-28'),
    userId: USER_ID, clientId: clients[1].id,
  }});

  const p2phases = await Promise.all([
    prisma.projectPhase.create({ data: { name: 'Architecture & Setup', order: 1, status: 'DONE', projectId: p2.id, startDate: new Date('2026-04-01'), endDate: new Date('2026-04-10') }}),
    prisma.projectPhase.create({ data: { name: 'Auth & Core API', order: 2, status: 'DONE', projectId: p2.id, startDate: new Date('2026-04-11'), endDate: new Date('2026-04-30') }}),
    prisma.projectPhase.create({ data: { name: 'Dashboard & UI', order: 3, status: 'IN_PROGRESS', projectId: p2.id, startDate: new Date('2026-05-01'), endDate: new Date('2026-05-31') }}),
    prisma.projectPhase.create({ data: { name: 'Tests & Deploy', order: 4, status: 'TODO', projectId: p2.id, startDate: new Date('2026-06-01'), endDate: new Date('2026-07-15') }}),
  ]);

  await Promise.all([
    prisma.task.create({ data: { title: 'Setup monorepo Next.js + Node', status: 'DONE', priority: 'HIGH', projectId: p2.id, phaseId: p2phases[0].id }}),
    prisma.task.create({ data: { title: 'Schema DB PostgreSQL', status: 'DONE', priority: 'HIGH', projectId: p2.id, phaseId: p2phases[0].id }}),
    prisma.task.create({ data: { title: 'CI/CD GitHub Actions', status: 'DONE', priority: 'MEDIUM', projectId: p2.id, phaseId: p2phases[0].id }}),
    prisma.task.create({ data: { title: 'Système d\'authentification JWT', status: 'DONE', priority: 'URGENT', projectId: p2.id, phaseId: p2phases[1].id }}),
    prisma.task.create({ data: { title: 'API projets (CRUD)', status: 'DONE', priority: 'HIGH', projectId: p2.id, phaseId: p2phases[1].id }}),
    prisma.task.create({ data: { title: 'API users & permissions', status: 'DONE', priority: 'HIGH', projectId: p2.id, phaseId: p2phases[1].id }}),
    prisma.task.create({ data: { title: 'Dashboard principal', status: 'IN_PROGRESS', priority: 'HIGH', projectId: p2.id, phaseId: p2phases[2].id, dueDate: new Date('2026-06-10') }}),
    prisma.task.create({ data: { title: 'Composants graphiques (Recharts)', status: 'IN_PROGRESS', priority: 'MEDIUM', projectId: p2.id, phaseId: p2phases[2].id }}),
    prisma.task.create({ data: { title: 'Vue Kanban projets', status: 'TODO', priority: 'HIGH', projectId: p2.id, phaseId: p2phases[2].id, dueDate: new Date('2026-06-20') }}),
    prisma.task.create({ data: { title: 'Notifications temps réel (WebSocket)', status: 'TODO', priority: 'MEDIUM', projectId: p2.id, phaseId: p2phases[2].id }}),
    prisma.task.create({ data: { title: 'Tests unitaires backend', status: 'TODO', priority: 'HIGH', projectId: p2.id, phaseId: p2phases[3].id }}),
    prisma.task.create({ data: { title: 'Tests E2E Playwright', status: 'TODO', priority: 'MEDIUM', projectId: p2.id, phaseId: p2phases[3].id }}),
    prisma.task.create({ data: { title: 'Deploy sur Railway', status: 'TODO', priority: 'HIGH', projectId: p2.id, phaseId: p2phases[3].id }}),
  ]);

  // ─── Projet 3 — Site cabinet juridique (SIGNÉ) ───────────────────────────
  const p3 = await prisma.project.create({ data: {
    name: 'Refonte Cabinet Dubois',
    description: 'Refonte complète du site du cabinet juridique. Design moderne, blog, espace client sécurisé, formulaire de prise de RDV.',
    type: 'REFONTE', status: 'SIGNED',
    budget: 5500, budgetSpent: 0,
    startDate: new Date('2026-06-05'),
    endDate: new Date('2026-08-20'),
    signedAt: new Date('2026-05-30'),
    userId: USER_ID, clientId: clients[2].id,
  }});

  const p3phases = await Promise.all([
    prisma.projectPhase.create({ data: { name: 'Audit & Stratégie', order: 1, status: 'TODO', projectId: p3.id, startDate: new Date('2026-06-05'), endDate: new Date('2026-06-12') }}),
    prisma.projectPhase.create({ data: { name: 'Design', order: 2, status: 'TODO', projectId: p3.id, startDate: new Date('2026-06-13'), endDate: new Date('2026-06-30') }}),
    prisma.projectPhase.create({ data: { name: 'Développement', order: 3, status: 'TODO', projectId: p3.id, startDate: new Date('2026-07-01'), endDate: new Date('2026-08-10') }}),
    prisma.projectPhase.create({ data: { name: 'Formation & Livraison', order: 4, status: 'TODO', projectId: p3.id, startDate: new Date('2026-08-11'), endDate: new Date('2026-08-20') }}),
  ]);

  await Promise.all([
    prisma.task.create({ data: { title: 'Audit site existant', status: 'TODO', priority: 'HIGH', projectId: p3.id, phaseId: p3phases[0].id, dueDate: new Date('2026-06-07') }}),
    prisma.task.create({ data: { title: 'Benchmark concurrents', status: 'TODO', priority: 'MEDIUM', projectId: p3.id, phaseId: p3phases[0].id }}),
    prisma.task.create({ data: { title: 'Maquettes Figma', status: 'TODO', priority: 'HIGH', projectId: p3.id, phaseId: p3phases[1].id }}),
    prisma.task.create({ data: { title: 'Développement WordPress + ACF', status: 'TODO', priority: 'HIGH', projectId: p3.id, phaseId: p3phases[2].id }}),
    prisma.task.create({ data: { title: 'Espace client sécurisé', status: 'TODO', priority: 'URGENT', projectId: p3.id, phaseId: p3phases[2].id }}),
  ]);

  // ─── Projet 4 — E-commerce mode vintage (EN COURS) ───────────────────────
  const p4 = await prisma.project.create({ data: {
    name: 'E-commerce Mode Vintage',
    description: 'Boutique en ligne Shopify custom pour vente de vêtements vintage. Catalogue 500+ produits, filtres avancés, paiement CB + PayPal.',
    type: 'E_COMMERCE', status: 'IN_PROGRESS',
    budget: 7800, budgetSpent: 3200,
    startDate: new Date('2026-03-15'),
    endDate: new Date('2026-06-30'),
    signedAt: new Date('2026-03-10'),
    userId: USER_ID, clientId: clients[3].id,
  }});

  const p4phases = await Promise.all([
    prisma.projectPhase.create({ data: { name: 'Config Shopify & Thème', order: 1, status: 'DONE', projectId: p4.id }}),
    prisma.projectPhase.create({ data: { name: 'Catalogue & Fiches produits', order: 2, status: 'IN_PROGRESS', projectId: p4.id }}),
    prisma.projectPhase.create({ data: { name: 'Paiement & Checkout', order: 3, status: 'TODO', projectId: p4.id }}),
    prisma.projectPhase.create({ data: { name: 'SEO & Lancement', order: 4, status: 'TODO', projectId: p4.id }}),
  ]);

  await Promise.all([
    prisma.task.create({ data: { title: 'Setup Shopify Plus', status: 'DONE', priority: 'HIGH', projectId: p4.id, phaseId: p4phases[0].id }}),
    prisma.task.create({ data: { title: 'Thème custom Liquid', status: 'DONE', priority: 'HIGH', projectId: p4.id, phaseId: p4phases[0].id }}),
    prisma.task.create({ data: { title: 'Import catalogue CSV', status: 'IN_PROGRESS', priority: 'HIGH', projectId: p4.id, phaseId: p4phases[1].id, dueDate: new Date('2026-06-15') }}),
    prisma.task.create({ data: { title: 'Filtres taille / couleur / prix', status: 'IN_PROGRESS', priority: 'MEDIUM', projectId: p4.id, phaseId: p4phases[1].id }}),
    prisma.task.create({ data: { title: 'Photos & descriptions IA', status: 'TODO', priority: 'MEDIUM', projectId: p4.id, phaseId: p4phases[1].id }}),
    prisma.task.create({ data: { title: 'Stripe + PayPal', status: 'TODO', priority: 'URGENT', projectId: p4.id, phaseId: p4phases[2].id, dueDate: new Date('2026-06-25') }}),
    prisma.task.create({ data: { title: 'SEO on-page + sitemap', status: 'TODO', priority: 'HIGH', projectId: p4.id, phaseId: p4phases[3].id }}),
  ]);

  // ─── Projet 5 — Prospect landing page ────────────────────────────────────
  await prisma.project.create({ data: {
    name: 'Landing Page Coach Fitness',
    description: 'Landing page conversion pour coach sportif. Tunnel de vente, témoignages, formulaire inscription programme.',
    type: 'LANDING_PAGE', status: 'PROSPECT',
    budget: 1800,
    userId: USER_ID,
  }});

  // ─── Notifications ────────────────────────────────────────────────────────
  await Promise.all([
    prisma.notification.create({ data: { title: 'Deadline proche', message: 'Le projet "E-commerce Mode Vintage" arrive à échéance dans 29 jours.', type: 'deadline', userId: USER_ID, projectId: p4.id }}),
    prisma.notification.create({ data: { title: 'Nouveau projet signé', message: 'Le contrat pour "Refonte Cabinet Dubois" a été signé.', type: 'info', userId: USER_ID, projectId: p3.id }}),
    prisma.notification.create({ data: { title: 'Tâche en retard', message: 'La tâche "Dashboard principal" est en retard sur TechStart.', type: 'task', userId: USER_ID, projectId: p2.id }}),
  ]);

  console.log('✅ 5 projets créés avec phases et tâches');
  console.log('✅ 4 clients créés');
  console.log('✅ 3 notifications créées');
  console.log('\n🎉 Seed terminé ! Lance le frontend et explore DevFlow.\n');
}

main()
  .catch(e => { console.error('❌ Erreur seed :', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
