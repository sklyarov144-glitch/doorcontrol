import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const responseHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};

Deno.serve(async () => {
  const startedAt = Date.now();
  try {
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { error } = await client.from("companies").select("id").limit(1);
    if (error) throw error;
    return Response.json(
      { status: "ok", database: "ok", latencyMs: Date.now() - startedAt },
      { headers: responseHeaders },
    );
  } catch {
    return Response.json(
      { status: "degraded", database: "unavailable" },
      { status: 503, headers: responseHeaders },
    );
  }
});
