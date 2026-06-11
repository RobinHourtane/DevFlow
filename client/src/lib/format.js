/**
 * format.js — Helpers de formatage partagés.
 */

// Formate un montant en euros (fr-FR), max 2 décimales.
export const fmtEUR = (n) =>
  `${(Number(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;
