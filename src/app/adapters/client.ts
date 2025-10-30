// src/app/adapters/client.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export function createSupabaseBrowserClient(): SupabaseClient {
	if (!supabaseClient) {
		const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
		const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
		supabaseClient = createClient(url, key);
	}
	return supabaseClient;
}
