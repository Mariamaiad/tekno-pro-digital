
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "@/lib/env";

/** Cliente com a sessão do usuário (cookies). */
export async function createSessionClient() {
  if (!isSupabaseConfigured) return null;

  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Em Server Components, o proxy renova a sessão.
        }
      },
    },
  });
}

/** Cliente anônimo, sem cookies. */
export function createPublicClient() {
  if (!isSupabaseConfigured) return null;

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/** Cliente com service role: somente no servidor. */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!isSupabaseConfigured || !key) return null;

  return createClient(SUPABASE_URL, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/** Verifica se o usuário logado é administrador. */
export const getAdmin = cache(async () => {
  const supabase = await createSessionClient();

  if (!supabase) return null;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data, error } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  return { user, supabase };
});
