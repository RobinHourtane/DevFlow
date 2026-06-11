import { useState, useEffect } from 'react';
import { User, Lock, HardDrive, Check, AlertCircle, ShieldCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import PageHeader from '../components/devflow/PageHeader';
import useAuthStore from '../store/authStore';
import api from '../lib/api';
import { fieldCls, fieldSty, labelCls } from '../lib/formStyles';

const ROLE_LABEL = {
  FREELANCE: 'Freelance',
  AGENCY_OWNER: "Dirigeant d'agence",
  AGENCY_MEMBER: "Membre d'agence",
};

function Section({ icon: Icon, title, description, children }) {
  return (
    <section className="p-10" style={{ borderBottom: '1px solid var(--border-1)' }}>
      <div className="flex items-start gap-4 mb-6 max-w-2xl">
        <div className="p-2 shrink-0" style={{ background: 'color-mix(in srgb, var(--accent) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 19%, transparent)', borderRadius: '8px' }}>
          <Icon size={16} style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <h2 className="font-display text-xl text-[var(--text-1)]">{title}</h2>
          {description && <p className="text-sm text-[var(--text-3)] mt-1 leading-relaxed">{description}</p>}
        </div>
      </div>
      <div className="max-w-md">{children}</div>
    </section>
  );
}

function Banner({ kind, message }) {
  if (!message) return null;
  const isError = kind === 'error';
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 mb-4 text-sm"
      style={{
        background: isError ? '#ef444415' : '#16a34a15',
        border: `1px solid ${isError ? '#ef444430' : '#16a34a30'}`,
        color: isError ? '#ef4444' : '#16a34a',
      }}>
      {isError ? <AlertCircle size={14} /> : <Check size={14} />}
      {message}
    </div>
  );
}

export default function Settings() {
  const { user, setUser } = useAuthStore();

  // ── Profil ────────────────────────────────────────────────────────────────
  const [name, setName]   = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const { data } = await api.put('/auth/profile', { name, email });
      setUser(data);
      setProfileMsg({ kind: 'success', text: 'Profil mis à jour' });
    } catch (err) {
      setProfileMsg({ kind: 'error', text: err.response?.data?.message || 'Erreur lors de la mise à jour' });
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Mot de passe ─────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg]       = useState(null);

  const savePassword = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (newPassword !== confirmPassword) {
      setPwMsg({ kind: 'error', text: 'Les nouveaux mots de passe ne correspondent pas' });
      return;
    }
    if (newPassword.length < 6) {
      setPwMsg({ kind: 'error', text: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
      return;
    }
    setPwSaving(true);
    try {
      await api.put('/auth/password', { currentPassword, newPassword });
      setPwMsg({ kind: 'success', text: 'Mot de passe mis à jour' });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      setPwMsg({ kind: 'error', text: err.response?.data?.message || 'Erreur lors de la mise à jour' });
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Paramètres / Compte"
        title="Paramètres"
        description="Gérez vos informations de profil, votre sécurité et vos intégrations."
      />

      {/* Profil */}
      <Section icon={User} title="Profil" description="Ces informations apparaissent sur vos contrats et factures générés.">
        <form onSubmit={saveProfile}>
          <Banner kind={profileMsg?.kind} message={profileMsg?.text} />
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Nom complet</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className={fieldCls} style={fieldSty} required />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className={fieldCls} style={fieldSty} required />
            </div>
            <div>
              <label className={labelCls}>Rôle</label>
              <div className="px-3 py-2.5 text-sm text-[var(--text-3)] font-mono" style={{ border: '1px solid var(--border-1)', background: 'var(--bg-1)', borderRadius: '8px' }}>
                {ROLE_LABEL[user?.role] || user?.role}
              </div>
            </div>
            {user?.createdAt && (
              <p className="text-xs text-[var(--text-4)] font-mono">
                Membre depuis le {format(parseISO(user.createdAt), 'd MMMM yyyy', { locale: fr })}
              </p>
            )}
          </div>
          <button type="submit" disabled={profileSaving}
            className="mt-6 px-5 py-2.5 text-sm font-medium text-[var(--text-1)] transition-colors disabled:opacity-50"
            style={{ background: 'var(--accent)', borderRadius: '8px' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}>
            {profileSaving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      </Section>

      {/* Mot de passe */}
      <Section icon={Lock} title="Sécurité" description="Modifiez votre mot de passe. Vous resterez connecté sur cet appareil.">
        <form onSubmit={savePassword}>
          <Banner kind={pwMsg?.kind} message={pwMsg?.text} />
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Mot de passe actuel</label>
              <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                className={fieldCls} style={fieldSty} required />
            </div>
            <div>
              <label className={labelCls}>Nouveau mot de passe</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                className={fieldCls} style={fieldSty} required minLength={6} />
            </div>
            <div>
              <label className={labelCls}>Confirmer le nouveau mot de passe</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                className={fieldCls} style={fieldSty} required minLength={6} />
            </div>
          </div>
          <button type="submit" disabled={pwSaving}
            className="mt-6 px-5 py-2.5 text-sm font-medium text-[var(--text-1)] transition-colors disabled:opacity-50"
            style={{ background: 'var(--accent)', borderRadius: '8px' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}>
            {pwSaving ? 'Enregistrement…' : 'Changer le mot de passe'}
          </button>
        </form>
      </Section>

      {/* Intégrations */}
      <Section icon={HardDrive} title="Intégrations" description="État des services tiers connectés à DevFlow.">
        <div className="flex items-center justify-between px-4 py-3" style={{ border: '1px solid var(--border-1)', background: 'var(--bg-1)', borderRadius: '8px' }}>
          <div className="flex items-center gap-3">
            <HardDrive size={16} className="text-[var(--text-2)]" />
            <div>
              <div className="text-sm text-[var(--text-1)]">Google Drive</div>
              <div className="text-xs text-[var(--text-3)] font-mono mt-0.5">
                Dossiers projets, récapitulatifs et PDF automatiques
              </div>
            </div>
          </div>
          <span className="label-mono px-2.5 py-1 text-xs flex items-center gap-1.5"
            style={{ background: '#16a34a15', border: '1px solid #16a34a30', color: '#16a34a', borderRadius: '8px' }}>
            <ShieldCheck size={12} />
            Connecté
          </span>
        </div>
        <p className="text-xs text-[var(--text-4)] mt-3 leading-relaxed">
          Configuré via les variables d'environnement <code className="text-[var(--text-2)]">GOOGLE_*</code> du serveur.
          Voir <code className="text-[var(--text-2)]">CLAUDE.md</code> pour la procédure de configuration.
        </p>
      </Section>
    </div>
  );
}
