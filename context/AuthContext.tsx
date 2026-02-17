import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { isSupabaseConfigured, getSupabase } from '../services/supabaseClient';

export type UserRole = 'manager' | 'nutritionist' | 'operator';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOfflineMode: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEFAULT_USER: UserProfile = {
  id: 'local-dev-user',
  email: 'admin@z-sub.com',
  displayName: '강지예',
  role: 'manager',
};

const fetchRoleFromProfiles = async (supabase: ReturnType<typeof getSupabase>, userId: string): Promise<UserRole> => {
  if (!supabase) return 'operator';
  const { data } = await (supabase as NonNullable<typeof supabase>)
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  return (data?.role as UserRole) || 'operator';
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isOfflineMode = !isSupabaseConfigured() && import.meta.env.DEV;

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      if (import.meta.env.DEV) {
        setUser(DEFAULT_USER);
      }
      setIsLoading(false);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      if (import.meta.env.DEV) {
        setUser(DEFAULT_USER);
      }
      setIsLoading(false);
      return;
    }

    // 현재 세션 확인
    supabase.auth.getSession().then(
      async ({
        data: { session },
      }: {
        data: {
          session: {
            user: {
              id: string;
              email?: string;
              user_metadata?: { display_name?: string; avatar_url?: string };
            };
          } | null;
        };
      }) => {
        if (session?.user) {
          const role = await fetchRoleFromProfiles(supabase, session.user.id);
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            displayName: session.user.user_metadata?.display_name || session.user.email || '',
            role,
            avatarUrl: session.user.user_metadata?.avatar_url,
          });
        }
        setIsLoading(false);
      }
    );

    // 인증 상태 변경 리스너
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (
        _event: string,
        session: {
          user: {
            id: string;
            email?: string;
            user_metadata?: { display_name?: string; avatar_url?: string };
          };
        } | null
      ) => {
        if (session?.user) {
          const role = await fetchRoleFromProfiles(supabase, session.user.id);
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            displayName: session.user.user_metadata?.display_name || session.user.email || '',
            role,
            avatarUrl: session.user.user_metadata?.avatar_url,
          });
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [isOfflineMode]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (isOfflineMode) {
        setUser(DEFAULT_USER);
        return { success: true };
      }

      const supabase = getSupabase();
      if (!supabase) {
        if (import.meta.env.DEV) {
          setUser(DEFAULT_USER);
          return { success: true };
        }
        return { success: false, error: 'Service unavailable' };
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    },
    [isOfflineMode]
  );

  const logout = useCallback(async () => {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, isOfflineMode, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
