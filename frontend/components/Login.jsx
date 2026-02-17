"use client";
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';



export default function Login() {
  const { login, loginWithGithub, signUpWithEmail, signInWithEmail } = useAuth();
  const [mode, setMode] = useState('connexion');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState(null); // 'email', 'password', 'both', or null
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setErrorField(null);

    // Basic Validation
    if (!email.trim()) {
      setError('L\'email est requis.');
      setErrorField('email');
      return;
    }
    if (!password) {
      setError('Le mot de passe est requis.');
      setErrorField('password');
      return;
    }
    if (password.length < 6 && mode === 'inscription') {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      setErrorField('password');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'inscription') {
        await signUpWithEmail(email.trim(), password);
      } else {
        await signInWithEmail(email.trim(), password);
      }
    } catch (err) {
      console.error("Auth Error:", err); // Pour le débogage
      const msg = err?.message || '';
      let userMsg = msg || 'Une erreur est survenue.';
      let field = 'both';

      // Tentative de détection précise (dépend de la config Supabase)
      if (msg.toLowerCase().includes('user not found') || msg.toLowerCase().includes('cet email n\'existe pas')) {
        userMsg = 'Cet email n\'est pas enregistré.';
        field = 'email';
      }
      else if (msg.toLowerCase().includes('wrong password') || msg.toLowerCase().includes('incorrect password')) {
        userMsg = 'Mot de passe incorrect.';
        field = 'password';
      }
      else if (msg.includes('already registered') || msg.includes('already in use')) {
        userMsg = 'Cet email est déjà utilisé.';
        field = 'email';
      } else if (msg.includes('Invalid login')) {
        // Supabase renvoie souvent ceci par sécurité pour ne pas dévoiler si l'email existe
        userMsg = 'Email ou mot de passe incorrect.';
        field = 'both';
      } else if (msg.includes('Email not confirmed')) {
        userMsg = 'Veuillez confirmer votre email.';
        field = 'email';
      } else if (msg.includes('Password')) {
        userMsg = 'Le mot de passe doit contenir au moins 6 caractères.';
        field = 'password';
      } else if (msg.includes('rate limit') || msg.includes('too many')) {
        userMsg = 'Trop de tentatives. Réessayez plus tard.';
        field = 'both';
      }

      setError(userMsg);
      setErrorField(field);
    } finally {
      setLoading(false);
    }
  };

  const getInputClass = (fieldName) => {
    const baseClass = "login-input";
    if (errorField === fieldName || errorField === 'both') {
      return `${baseClass} error`;
    }
    return baseClass;
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Bienvenue sur ChatApp</h1>
        <p>Connectez-vous pour sauvegarder votre historique.</p>

        <form onSubmit={handleEmailAuth} className="login-email-form">
          <div className="form-group">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (errorField === 'email' || errorField === 'both') setErrorField(null); }}
              autoComplete="email"
              className={getInputClass('email')}
            />
          </div>
          <div className="form-group" style={{ position: 'relative' }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Mot de passe (min. 6 caractères)"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (errorField === 'password' || errorField === 'both') setErrorField(null); }}
              autoComplete={mode === 'inscription' ? 'new-password' : 'current-password'}
              className={getInputClass('password')}
              style={{ paddingRight: '40px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
              }}
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07-2.3 2.3" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          {error && <p className="login-error">{error}</p>}
          <div className="login-email-buttons">
            <button type="submit" className="login-btn primary" disabled={loading}>
              {loading ? 'Chargement...' : mode === 'inscription' ? 'Créer un compte' : 'Se connecter'}
            </button>
            <button
              type="button"
              className="login-switch-mode"
              onClick={() => { setMode(mode === 'connexion' ? 'inscription' : 'connexion'); setError(''); setErrorField(null); }}
            >
              {mode === 'connexion' ? 'Créer un compte' : 'Déjà un compte ? Se connecter'}
            </button>
          </div>
        </form>

        <p className="login-divider">ou</p>

        <div className="login-buttons">
          <button onClick={login} className="login-btn google" type="button">
            <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
            Google
          </button>
          <button onClick={loginWithGithub} className="login-btn github" type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
            GitHub
          </button>
        </div>
      </div>
    </div>
  );
}
