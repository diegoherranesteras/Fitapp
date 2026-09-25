import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { OnboardingAnswers } from './types';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  // null mientras no se sabe (sin sesión o cargando el perfil)
  onboarded: boolean | null;
  onboardingAnswers: OnboardingAnswers | null;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  loading: true,
  onboarded: null,
  onboardingAnswers: null,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [onboardingAnswers, setOnboardingAnswers] = useState<OnboardingAnswers | null>(null);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) {
      setOnboarded(null);
      setOnboardingAnswers(null);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('onboarded_at, onboarding')
      .eq('user_id', s.user.id)
      .maybeSingle();
    setOnboarded(!!data?.onboarded_at);
    setOnboardingAnswers((data?.onboarding as OnboardingAnswers | null) ?? null);
  }, []);

  const userIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      userIdRef.current = data.session?.user.id;
      setSession(data.session);
      await loadProfile(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      // La renovación horaria del token no cambia de usuario: solo se recarga el perfil si cambia.
      if (userIdRef.current !== newSession?.user.id) {
        userIdRef.current = newSession?.user.id;
        if (newSession) setOnboarded(null);
        // Consultar a Supabase dentro de este callback puede bloquearlo: se difiere al siguiente tick.
        setTimeout(() => loadProfile(newSession), 0);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [loadProfile]);

  const refreshProfile = useCallback(() => loadProfile(session), [loadProfile, session]);

  return (
    <AuthContext.Provider value={{ session, loading, onboarded, onboardingAnswers, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
