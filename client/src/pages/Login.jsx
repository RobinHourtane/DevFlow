import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function Login() {
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState('');
  const { login, isLoading }  = useAuthStore();
  const navigate              = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try { await login(email, password); navigate('/dashboard'); }
    catch (err) { setError(err.response?.data?.message || 'Identifiants incorrects'); }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-0)] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }} className="w-full max-w-sm">

        <div className="mb-10">
          <div className="label-mono mb-2">Auth / Connexion</div>
          <div className="font-display text-3xl text-[var(--text-1)]">
            DevFlow<span style={{ color: 'var(--accent)' }}>.</span>
          </div>
          <p className="text-sm text-[var(--text-3)] mt-2">Accédez à votre espace de gestion.</p>
        </div>

        {error && (
          <div className="text-sm text-red-400 px-4 py-3 mb-6"
            style={{ border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'Email', type: 'email', value: email, set: setEmail, placeholder: 'vous@exemple.com' },
            { label: 'Mot de passe', type: 'password', value: password, set: setPassword, placeholder: '••••••••' },
          ].map(({ label, type, value, set, placeholder }) => (
            <div key={label}>
              <label className="label-mono block mb-2">{label}</label>
              <input type={type} value={value} onChange={e => set(e.target.value)}
                placeholder={placeholder} required
                className="w-full bg-[var(--bg-0)] text-[var(--text-1)] text-sm px-4 py-3 outline-none focus:border-[var(--accent)] transition-colors placeholder-neutral-700"
                style={{ border: '1px solid var(--border-2)', borderRadius: '8px' }} />
            </div>
          ))}

          <button type="submit" disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-[var(--text-1)] transition-colors mt-2 disabled:opacity-50"
            style={{ background: 'var(--accent)', borderRadius: '8px' }}
            onMouseEnter={e => !isLoading && (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}>
            {isLoading
              ? <div className="w-4 h-4 border border-[var(--border-2)] border-t-white rounded-full animate-spin" />
              : <><span>Se connecter</span><ArrowRight size={14} /></>}
          </button>
        </form>

        <p className="text-sm text-[var(--text-4)] mt-8">
          Pas de compte ?{' '}
          <Link to="/register" className="text-[var(--accent)] hover:underline">S'inscrire</Link>
        </p>
      </motion.div>
    </div>
  );
}
