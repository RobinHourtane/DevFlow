/**
 * constants.js — Libellés et configurations partagés (statuts, types, priorités).
 *
 * Centralise les enums Prisma → libellés FR + couleurs, pour éviter la
 * duplication entre les pages (Dashboard, Projects, ProjectDetail, Contracts,
 * Invoices, Calendar, MyTasks, Analytics, Agents, ClientDetail...).
 */

// ─── Projets ──────────────────────────────────────────────────────────────────
export const PROJECT_TYPE_LABEL = {
  SITE_VITRINE: 'Site vitrine',
  E_COMMERCE:   'E-commerce',
  SAAS:         'SaaS',
  APP_MOBILE:   'App mobile',
  REFONTE:      'Refonte',
  LANDING_PAGE: 'Landing page',
  AUTRE:        'Autre',
};

export const PROJECT_STATUS_LABEL = {
  PROSPECT:    'Prospect',
  NEGOTIATION: 'Négociation',
  SIGNED:      'Signé',
  IN_PROGRESS: 'En cours',
  REVIEW:      'Révision',
  DELIVERED:   'Livré',
  ARCHIVED:    'Archivé',
};

// ─── Tâches ───────────────────────────────────────────────────────────────────
export const TASK_STATUS_LABEL = {
  TODO: 'À faire', IN_PROGRESS: 'En cours', REVIEW: 'En révision', DONE: 'Terminé',
};

export const TASK_STATUS_CFG = {
  TODO:        { label: 'À faire',  color: 'var(--text-3)' },
  IN_PROGRESS: { label: 'En cours', color: '#0047FF' },
  REVIEW:      { label: 'Révision', color: '#eab308' },
  DONE:        { label: 'Terminée', color: '#22c55e' },
};

export const TASK_PRIORITY_LABEL = {
  LOW: 'Faible', MEDIUM: 'Moyenne', HIGH: 'Haute', URGENT: 'Urgente',
};

export const TASK_PRIORITY_COLOR = {
  LOW: 'var(--text-4)', MEDIUM: '#eab308', HIGH: '#f97316', URGENT: '#ef4444',
};

// ─── Contrats ─────────────────────────────────────────────────────────────────
export const CONTRACT_STATUS_CFG = {
  DRAFT:     { label: 'Brouillon', color: 'var(--text-4)', bg: 'color-mix(in srgb, var(--text-4) 8%, transparent)', border: 'color-mix(in srgb, var(--text-4) 19%, transparent)' },
  SENT:      { label: 'Envoyé',    color: '#d97706', bg: '#d9780615', border: '#d9780630' },
  SIGNED:    { label: 'Signé',     color: '#16a34a', bg: '#16a34a15', border: '#16a34a30' },
  CANCELLED: { label: 'Annulé',    color: '#ef4444', bg: '#ef444415', border: '#ef444430' },
};

// ─── Factures ─────────────────────────────────────────────────────────────────
export const INVOICE_STATUS_CFG = {
  DRAFT:     { label: 'Brouillon', color: 'var(--text-4)', bg: 'color-mix(in srgb, var(--text-4) 8%, transparent)', border: 'color-mix(in srgb, var(--text-4) 19%, transparent)' },
  SENT:      { label: 'Envoyée',   color: '#d97706', bg: '#d9780615', border: '#d9780630' },
  PAID:      { label: 'Payée',     color: '#16a34a', bg: '#16a34a15', border: '#16a34a30' },
  OVERDUE:   { label: 'En retard', color: '#ef4444', bg: '#ef444415', border: '#ef444430' },
  CANCELLED: { label: 'Annulée',   color: 'var(--text-3)', bg: 'color-mix(in srgb, var(--text-3) 8%, transparent)', border: 'color-mix(in srgb, var(--text-3) 19%, transparent)' },
};

export const INVOICE_TYPE_CFG = {
  QUOTE:   { label: 'Devis',             short: 'DEV'   },
  DEPOSIT: { label: "Facture d'acompte", short: 'ACO'   },
  BALANCE: { label: 'Facture de solde',  short: 'SOLDE' },
  FULL:    { label: 'Facture',           short: 'FACT'  },
};
