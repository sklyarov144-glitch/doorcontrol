import { localProvider } from "./localProvider";
import { supabaseProvider } from "./supabaseProvider";
import { isSupabaseConfigured } from "../supabase/client";

const requestedProvider = import.meta.env.VITE_DATA_PROVIDER ?? "local";

export function selectDataProvider(name, configured = isSupabaseConfigured) {
  if (name !== "local" && name !== "supabase") {
    throw new Error(`Unsupported data provider: ${name}. Use local or supabase.`);
  }
  if (name === "supabase" && !configured) {
    throw new Error(
      "VITE_DATA_PROVIDER=supabase requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
    );
  }
  return name === "supabase" ? supabaseProvider : localProvider;
}

export const dataProvider = selectDataProvider(requestedProvider);
export const dataProviderName = requestedProvider;
