import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

let supabaseSingleton: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseSingleton) return supabaseSingleton;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  supabaseSingleton = createClient(url, anonKey);
  return supabaseSingleton;
}

export async function getSupabaseUser(): Promise<User | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  if (error) return null;
  return data.user ?? null;
}
