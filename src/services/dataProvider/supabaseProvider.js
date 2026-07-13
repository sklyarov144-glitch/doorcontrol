import { requireSupabase } from "../supabase/client";
import { fromDatabase, toDatabase } from "./mappers";

function unwrap({ data, error }) {
  if (error) throw error;
  return fromDatabase(data);
}

function makeCrud(table) {
  return {
    async getAll() {
      return unwrap(await requireSupabase().from(table).select("*").order("created_at"));
    },
    async getById(id) {
      return unwrap(
        await requireSupabase().from(table).select("*").eq("id", id).maybeSingle()
      );
    },
    async create(data) {
      return unwrap(
        await requireSupabase().from(table).insert(toDatabase(data)).select().single()
      );
    },
    async update(id, data) {
      return unwrap(
        await requireSupabase()
          .from(table)
          .update(toDatabase(data))
          .eq("id", id)
          .select()
          .single()
      );
    },
    async disable(id) {
      return this.update(id, { status: "disabled" });
    },
  };
}

const usersCrud = makeCrud("profiles");

export const supabaseProvider = {
  auth: {
    async getSession() {
      const { data, error } = await requireSupabase().auth.getSession();
      if (error) throw error;
      return data.session;
    },
    async signIn(email, password) {
      return unwrap(
        await requireSupabase().auth.signInWithPassword({ email, password })
      );
    },
    async signOut() {
      const { error } = await requireSupabase().auth.signOut();
      if (error) throw error;
    },
    async updatePassword(password) {
      const { data, error } = await requireSupabase().auth.updateUser({ password });
      if (error) throw error;
      return data.user;
    },
    async requestPasswordReset(email, redirectTo = window.location.origin) {
      const { error } = await requireSupabase().auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) throw error;
    },
    onAuthStateChange(callback) {
      return requireSupabase().auth.onAuthStateChange(callback);
    },
    async getCurrentProfile() {
      const { data: authData, error: authError } = await requireSupabase().auth.getUser();
      if (authError) throw authError;
      if (!authData.user) return null;
      return unwrap(
        await requireSupabase()
          .from("profiles")
          .select("*")
          .eq("id", authData.user.id)
          .maybeSingle()
      );
    },
  },
  users: {
    ...usersCrud,
    async invite(data) {
      const result = await requireSupabase().functions.invoke("invite-user", {
        body: toDatabase(data),
      });
      return unwrap(result);
    },
  },
  objects: makeCrud("objects"),
  buildings: makeCrud("buildings"),
  floors: makeCrud("floors"),
  doors: makeCrud("doors"),
  tasks: makeCrud("tasks"),
  notifications: makeCrud("notifications"),
  documentItems: makeCrud("document_items"),
  documents: makeCrud("document_items"),
  custodyActs: makeCrud("custody_acts"),
  teams: makeCrud("teams"),
  employees: makeCrud("employees"),
  workers: makeCrud("employees"),
  workStandards: makeCrud("work_standards"),
  objectWorkPlans: makeCrud("object_work_plans"),
  dailyWorkReports: makeCrud("daily_work_reports"),
  manpowerRequests: makeCrud("manpower_requests"),
  activityLogs: makeCrud("activity_logs"),
};
