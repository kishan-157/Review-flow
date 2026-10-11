/**
 * Supabase Client Initialization & Configuration Helper
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getEnv = (key: string): string => {
  if (typeof window !== 'undefined') {
    const localOverride = localStorage.getItem(`override_${key}`);
    if (localOverride) return localOverride;
  }
  // Check import.meta.env
  try {
    const metaEnv = (import.meta as any).env;
    if (metaEnv) {
      if (metaEnv[key]) return metaEnv[key];
      if (key.startsWith('VITE_')) {
        const nextKey = key.replace('VITE_', 'NEXT_PUBLIC_');
        if (metaEnv[nextKey]) return metaEnv[nextKey];
      }
    }
  } catch (e) {
    // Ignore
  }
  return '';
};

export const SUPABASE_URL = getEnv('VITE_SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL') || '';
export const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') || '';

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(SUPABASE_URL) &&
    Boolean(SUPABASE_ANON_KEY) &&
    !SUPABASE_URL.includes('your-project-id') &&
    !SUPABASE_URL.includes('example') &&
    SUPABASE_ANON_KEY !== 'your-anon-public-key' &&
    SUPABASE_ANON_KEY.length > 20 &&
    SUPABASE_URL.startsWith('https://')
  );
};

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
};

export const saveSupabaseCredentials = (url: string, anonKey: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('override_VITE_SUPABASE_URL', url.trim());
    localStorage.setItem('override_VITE_SUPABASE_ANON_KEY', anonKey.trim());
  }
};

export const clearSupabaseCredentials = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('override_VITE_SUPABASE_URL');
    localStorage.removeItem('override_VITE_SUPABASE_ANON_KEY');
  }
};

export const testSupabaseConnection = async (
  testUrl?: string,
  testKey?: string
): Promise<{ success: boolean; message: string }> => {
  const url = testUrl || SUPABASE_URL;
  const key = testKey || SUPABASE_ANON_KEY;

  if (!url || !key || !url.startsWith('https://')) {
    return { success: false, message: 'Invalid Supabase URL or Anon Key.' };
  }

  try {
    const client = createClient(url, key, {
      auth: { persistSession: false },
    });
    const { error } = await client.from('profiles').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      return { success: false, message: `Connected to Supabase, but schema query returned: ${error.message}` };
    }
    return { success: true, message: 'Successfully connected to Supabase Cloud Database!' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Connection failed. Please check URL and Key.' };
  }
};
