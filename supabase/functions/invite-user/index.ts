import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const callerClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(url, serviceKey);

    const { data: callerAuth, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerAuth.user) throw new Error("Unauthorized");
    const { data: caller, error: profileError } = await callerClient
      .from("profiles")
      .select("company_id, role")
      .eq("id", callerAuth.user.id)
      .single();
    if (profileError || !["creator", "company_head"].includes(caller.role)) {
      throw new Error("Forbidden");
    }

    const body = await request.json();
    const allowedRoles = caller.role === "creator"
      ? ["creator", "company_head", "construction_director", "itr"]
      : ["construction_director", "itr"];
    if (!allowedRoles.includes(body.role)) throw new Error("Role is not allowed");

    const { data, error } = await adminClient.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        company_id: caller.company_id,
        name: body.name,
        role: body.role,
        position: body.position,
      },
    });
    if (error) throw error;

    return new Response(JSON.stringify({ user_id: data.user.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

