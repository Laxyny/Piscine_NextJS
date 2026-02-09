"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) {
      router.replace('/');
      return;
    }

    const code = searchParams.get('code');
    const next = searchParams.get('next') || '/';

    if (!code) {
      router.replace(next);
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { flowType: 'pkce' }
    });

    supabase.auth
      .exchangeCodeForSession(code)
      .then(() => {
        router.replace(next);
      })
      .catch((err) => {
        console.error('Auth callback error:', err);
        setError(err.message || 'Erreur de connexion');
        setTimeout(() => router.replace('/'), 3000);
      });
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="loading" style={{ padding: '2rem', textAlign: 'center' }}>
        <p>{error}</p>
        <p>Redirection...</p>
      </div>
    );
  }

  return (
    <div className="loading">
      <p>Connexion en cours...</p>
    </div>
  );
}
