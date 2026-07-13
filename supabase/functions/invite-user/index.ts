import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const defaultOrigins = "http://localhost:5173,http://127.0.0.1:5173";
const allowedOrigins = new Set((Deno.env.get("APP_ALLOWED_ORIGINS") ?? defaultOrigins).split(",").map((value) => value.trim()).filter(Boolean));

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin") ?? "";
  if (!allowedOrigins.has(origin)) {
    return Response.json({ error: "Origin is not allowed" }, { status: 403 });
  }
  const headers = corsHeaders(origin);
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers });
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
    if (profileError || !["creator", "company_head", "construction_director"].includes(caller.role)) {
      throw new Error("Forbidden");
    }

    const body = await request.json();
    if (typeof body.name !== "string" || body.name.trim().length < 2 || body.name.length > 160) {
      throw new Error("Valid name is required");
    }
    if (typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      throw new Error("Valid email is required");
    }
    if (typeof body.password !== "string" || body.password.length < 10 || !/[a-z]/.test(body.password) || !/[A-Z]/.test(body.password) || !/\d/.test(body.password)) {
      throw new Error("Password must contain at least 10 characters, upper/lowercase letters and a digit");
    }
    const allowedRoles = caller.role === "creator"
      ? ["creator", "company_head", "construction_director", "itr"]
      : caller.role === "company_head" ? ["construction_director", "itr"] : ["itr"];
    if (!allowedRoles.includes(body.role)) throw new Error("Role is not allowed");

    const { data, error } = await adminClient.auth.admin.createUser({
      email: body.email.trim().toLowerCase(),
      password: body.password,
      email_confirm: true,
      user_metadata: {
        company_id: caller.company_id,
        name: body.name.trim(),
        role: body.role,
        position: body.position,
      },
    });
    if (error) throw error;

    return new Response(JSON.stringify({ user_id: data.user.id }), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});
