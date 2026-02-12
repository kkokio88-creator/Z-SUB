// Supabase 클라이언트 초기화
// 환경변수(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)가 설정된 경우 Supabase에 연결합니다.
// 미설정 시 localStorage 폴백 모드로 동작합니다.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = (): boolean => {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
};

let supabaseClient: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) return null;

  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return supabaseClient;
};

export default getSupabase;
