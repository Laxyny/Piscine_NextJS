"use client";
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { googleSignIn } = useAuth();

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Bienvenue sur ChatApp</h1>
        <p>Connectez-vous pour sauvegarder votre historique.</p>
        <button onClick={googleSignIn} className="google-btn">
          Se connecter avec Google
        </button>
      </div>
      
      <style jsx>{`
        .login-container {
          display: flex;
          height: 100vh;
          align-items: center;
          justify-content: center;
          background: var(--bg-color);
        }
        .login-card {
          padding: 2rem;
          background: var(--chat-bg);
          border-radius: 1rem;
          box-shadow: var(--shadow-md);
          text-align: center;
        }
        .google-btn {
          margin-top: 1rem;
          padding: 0.8rem 1.5rem;
          background: #4285F4;
          color: white;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 1rem;
        }
        .google-btn:hover {
          background: #357ae8;
        }
      `}</style>
    </div>
  );
}
