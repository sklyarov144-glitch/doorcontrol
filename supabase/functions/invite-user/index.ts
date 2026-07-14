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
    const action = body.action ?? "invite";
    if (!["invite", "deactivate", "reactivate", "restore_access"].includes(action)) {
      throw new Error("Unsupported action");
    }

    if (action !== "invite") {
      if (typeof body.userId !== "string") throw new Error("User id is required");
      const { data: target, error: targetError } = await adminClient
        .from("profiles")
        .select("id, company_id, role, status, email")
        .eq("id", body.userId)
        .single();
      if (targetError || target.company_id !== caller.company_id) throw new Error("User is unavailable");
      const manageableRoles = caller.role === "creator"
        ? ["creator", "company_head", "construction_director", "itr"]
        : caller.role === "company_head" ? ["company_head", "construction_director", "itr"] : ["itr"];
      if (!manageableRoles.includes(target.role) || target.id === callerAuth.user.id) throw new Error("Role is not allowed");

      const nextStatus = action === "deactivate" ? "disabled" : "active";
      const previousStatus = target.status;
      const { error: profileUpdateError } = await callerClient.from("profiles").update({ status: nextStatus }).eq("id", target.id);
      if (profileUpdateError) throw profileUpdateError;
      const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(target.id, {
        ban_duration: action === "deactivate" ? "876000h" : "none",
      });
      if (authUpdateError) {
        await callerClient.from("profiles").update({ status: previousStatus }).eq("id", target.id);
        throw authUpdateError;
      }
      if (action === "restore_access") {
        const redirectTo = `${Deno.env.get("APP_PUBLIC_URL") ?? origin}/reset-password`;
        const { error: resetError } = await adminClient.auth.resetPasswordForEmail(target.email, { redirectTo });
        if (resetError) {
          await adminClient.auth.admin.updateUserById(target.id, {
            ban_duration: previousStatus === "disabled" ? "876000h" : "none",
          });
          await callerClient.from("profiles").update({ status: previousStatus }).eq("id", target.id);
          throw resetError;
        }
      }
      return new Response(JSON.stringify({ user_id: target.id, status: nextStatus }), {
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    if (typeof body.name !== "string" || body.name.trim().length < 2 || body.name.length > 160) {
      throw new Error("Valid name is required");
    }
    if (typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      throw new Error("Valid email is required");
    }
    const allowedRoles = caller.role === "creator"
      ? ["creator", "company_head", "construction_director", "itr"]
      : caller.role === "company_head" ? ["construction_director", "itr"] : ["itr"];
    if (!allowedRoles.includes(body.role)) throw new Error("Role is not allowed");

    const email = body.email.trim().toLowerCase();
    await adminClient.from("user_invitations").update({ status: "revoked" })
      .eq("company_id", caller.company_id).eq("email", email).eq("status", "pending");
    const { data: invitation, error: invitationError } = await adminClient.from("user_invitations").insert({
      company_id: caller.company_id,
      email,
      name: body.name.trim(),
      role: body.role,
      position: typeof body.position === "string" ? body.position.trim() : null,
      invited_by: callerAuth.user.id,
    }).select("id").single();
    if (invitationError) throw invitationError;

    const redirectTo = `${Deno.env.get("APP_PUBLIC_URL") ?? origin}/reset-password`;
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { invitation_id: invitation.id },
    });
    if (error) {
      await adminClient.from("user_invitations").update({ status: "revoked" }).eq("id", invitation.id);
      throw error;
    }

    return new Response(JSON.stringify({ user_id: data.user.id, invitation_id: invitation.id }), {
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
