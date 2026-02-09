import { useState, useEffect, createContext, useContext } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase = null;
if (typeof window !== 'undefined' && supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { flowType: 'pkce' }
  });
}

function mapSessionUser(session) {
  if (!session?.user) return null;
  const u = session.user;
  return {
    id: u.id,
    uid: u.id,
    email: u.email,
    displayName: u.user_metadata?.full_name || u.user_metadata?.name || null,
    photoURL: u.user_metadata?.avatar_url || u.user_metadata?.picture || null
  };
}

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const setUserFromSession = (session) => {
      setUser(session ? mapSessionUser(session) : null);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserFromSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserFromSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const getRedirectUrl = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/auth/callback`;
  };

  const loginWithGoogle = async () => {
    if (!supabase) {
      alert('Erreur configuration: Supabase non initialisé');
      return;
    }
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: getRedirectUrl() }
      });
    } catch (error) {
      console.error('Google Login failed', error);
      alert('Erreur connexion Google: ' + (error.message || ''));
    }
  };

  const loginWithGithub = async () => {
    if (!supabase) {
      alert('Erreur configuration: Supabase non initialisé');
      return;
    }
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo: getRedirectUrl() }
      });
    } catch (error) {
      console.error('GitHub Login failed', error);
      alert('Erreur connexion GitHub: ' + (error.message || ''));
    }
  };

  const signUpWithEmail = async (email, password) => {
    if (!supabase) {
      alert('Erreur configuration: Supabase non initialisé');
      return;
    }
    try {
      await supabase.auth.signUp({ email, password });
    } catch (error) {
      console.error('Sign up failed', error);
      throw error;
    }
  };

  const signInWithEmail = async (email, password) => {
    if (!supabase) {
      alert('Erreur configuration: Supabase non initialisé');
      return;
    }
    try {
      await supabase.auth.signInWithPassword({ email, password });
    } catch (error) {
      console.error('Sign in failed', error);
      throw error;
    }
  };

  const logout = async () => {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const updateDisplayName = async (displayName) => {
    if (!supabase?.auth?.getUser) return;
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;
      await supabase.auth.updateUser({
        data: { full_name: displayName.trim() || null }
      });
      setUser((prev) => (prev ? { ...prev, displayName: displayName.trim() || null } : null));
    } catch (error) {
      console.error('Update display name failed', error);
      throw error;
    }
  };

  const getToken = async () => {
    if (!supabase) return null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token ?? null;
    } catch {
      return null;
    }
  };

  const login = loginWithGoogle;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginWithGithub,
        logout,
        signUpWithEmail,
        signInWithEmail,
        updateDisplayName,
        getToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
