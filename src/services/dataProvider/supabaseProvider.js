import { requireSupabase } from "../supabase/client";
import { fromDatabase, toDatabase } from "./mappers";

function unwrap({ data, error }) {
  if (error) throw error;
  return fromDatabase(data);
}

async function hydratePrivateAvatar(profile) {
  if (!profile?.avatarUrl?.startsWith("storage://avatars/")) return profile;
  const path = profile.avatarUrl.slice("storage://avatars/".length);
  const { data, error } = await requireSupabase().storage.from("avatars").createSignedUrl(path, 3600);
  if (error) return { ...profile, avatarStorageUri: profile.avatarUrl, avatarUrl: "" };
  return { ...profile, avatarStorageUri: profile.avatarUrl, avatarUrl: data.signedUrl };
}

const asUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value ?? "") ? value : null;

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
const objectsCrud = makeCrud("objects");
const tasksCrud = makeCrud("tasks");
const notificationsCrud = makeCrud("notifications");
const custodyActsCrud = makeCrud("custody_acts");

function mapDoorRecord(door) {
  const meta = door.meta ?? {};
  return {
    ...meta,
    ...door,
    number: door.label,
    doorStatus: door.status,
    openingStatus: door.openingStatus,
    issue: door.issueStatus,
    storageAct: door.custodyActStatus,
    history: meta.history ?? [],
    swing: meta.swing,
  };
}

async function hydrateFloorPlanTemplate(template = {}) {
  const uri = template.imageStorageUri ?? template.image;
  if (!uri?.startsWith("storage://floor-plans/")) return template;
  const path = uri.slice("storage://floor-plans/".length);
  const { data, error } = await requireSupabase().storage.from("floor-plans").createSignedUrl(path, 3600);
  if (error) return { ...template, imageStorageUri: uri, image: "" };
  return { ...template, imageStorageUri: uri, image: data.signedUrl };
}

export function toStoredFloorTemplate(template = {}) {
  const { imageStorageUri, ...rest } = template;
  return { ...rest, image: imageStorageUri ?? template.image ?? "" };
}

export function mapProfileAssignments(profile) {
  return {
    ...profile,
    assignedObjectIds: (profile.objectAssignments ?? []).map((item) => item.objectId),
    assignedBuildingIds: (profile.buildingAssignments ?? []).map((item) => item.buildingId),
  };
}

export function toDoorOperationalUpdate(door) {
  return {
    label: door.number ?? door.label,
    mark: door.mark,
    type: door.type,
    openingNumber: door.openingNumber ?? null,
    status: door.doorStatus ?? door.status,
    openingStatus: door.openingStatus,
    issueStatus: door.issue ?? door.issueStatus,
    custodyActStatus: door.storageAct ?? door.custodyActStatus,
    tnStatus: door.tnStatus ?? (door.doorStatus === "принято технадзором" ? "принято ТН" : "не передано"),
    assignedUserId: asUuid(door.assignedUserId),
    x: door.x,
    y: door.y,
    widthFact: door.widthFact || null,
    heightFact: door.heightFact || null,
    model: door.model || null,
    mountedAt: door.mountedAt || null,
    tnAcceptedAt: door.tnAcceptedAt || null,
    custodyActUploadedAt: door.custodyActUploadedAt || null,
    custodyActClosedAt: door.custodyActClosedAt || null,
    meta: {
      ...(door.meta ?? {}),
      history: door.history ?? [],
      swing: door.swing,
      custodyActUrl: door.custodyActUrl ?? "",
    },
  };
}

export function toDoorWorkflowPayload(id, door, issue) {
  return {
    p_door_id: id,
    p_door: toDatabase(toDoorOperationalUpdate(door)),
    p_issue: issue ? toDatabase(issue) : null,
  };
}

export function mapObjectTree(rows) {
  return rows.map((object) => ({
    ...object.meta,
    ...object,
    responsibleDirectorId: object.responsibleDirectorId,
    buildings: (object.buildings ?? []).map((building) => {
      const floors = (building.floors ?? [])
        .sort((left, right) => left.floorNumber - right.floorNumber)
        .map((floor) => ({
          ...floor.templateSnapshot,
          ...floor,
          number: floor.floorNumber,
          label: String(floor.floorNumber),
          type: "floor",
          doors: (floor.doors ?? []).map(mapDoorRecord),
        }));
      return {
        ...building.floorTemplate,
        ...building,
        floorsCount: building.floorsCount,
        floors: [
          ...(building.hasParking ? [{ id: `parking-${building.id}`, label: "Паркинг", type: "service", doors: [] }] : []),
          ...floors,
          { id: `roof-${building.id}`, label: "Кровля", type: "service", doors: [] },
        ],
      };
    }),
  }));
}

async function upsertObjectTree(objects) {
  const client = requireSupabase();
  const profile = await supabaseProvider.auth.getCurrentProfile();
  if (!profile?.companyId) throw new Error("Current profile has no company");

  for (const object of objects) {
    const objectRow = unwrap(await client.from("objects").upsert({
      legacy_id: object.legacyId ?? object.id,
      company_id: profile.companyId,
      name: object.name,
      address: object.address,
      metro: object.metro,
      status: object.status,
      responsible_director_id: asUuid(object.responsibleDirectorId),
      meta: {
        developer: object.developer,
        description: object.description,
        startDate: object.startDate,
        plannedEndDate: object.plannedEndDate,
      },
    }, { onConflict: "legacy_id" }).select().single());

    for (const building of object.buildings ?? []) {
      const floorTemplate = building.floorTemplate ?? {};
      const buildingRow = unwrap(await client.from("buildings").upsert({
        legacy_id: building.legacyId ?? building.id,
        object_id: objectRow.id,
        name: building.name,
        floors_count: building.floorsCount,
        has_parking: (building.floors ?? []).some((floor) => floor.type === "service" && floor.label === "Паркинг"),
        readiness: Number(building.readiness ?? 0),
        responsible_itr_id: asUuid(building.responsibleItrId),
        floor_template: toStoredFloorTemplate(floorTemplate),
      }, { onConflict: "legacy_id" }).select().single());

      for (const floor of (building.floors ?? []).filter((item) => item.type === "floor")) {
        const floorRow = unwrap(await client.from("floors").upsert({
          legacy_id: floor.legacyId ?? floor.id,
          building_id: buildingRow.id,
          floor_number: floor.number,
          plan_image_url: floor.planImageUrl ?? null,
          template_snapshot: floor.templateSnapshot ?? {},
        }, { onConflict: "building_id,floor_number" }).select().single());

        for (const door of floor.doors ?? []) {
          await client.from("doors").upsert({
            legacy_id: door.legacyId ?? door.id,
            floor_id: floorRow.id,
            label: door.number ?? door.label,
            mark: door.mark,
            type: door.type,
            opening_number: door.openingNumber ?? null,
            status: door.doorStatus ?? door.status,
            opening_status: door.openingStatus,
            issue_status: door.issue ?? door.issueStatus,
            custody_act_status: door.storageAct ?? door.custodyActStatus,
            assigned_user_id: asUuid(door.assignedUserId),
            x: door.x,
            y: door.y,
            width_fact: door.widthFact || null,
            height_fact: door.heightFact || null,
            model: door.model || null,
            mounted_at: door.mountedAt || null,
            tn_accepted_at: door.tnAcceptedAt || null,
            custody_act_uploaded_at: door.custodyActUploadedAt || null,
            custody_act_closed_at: door.custodyActClosedAt || null,
            meta: { history: door.history ?? [], swing: door.swing },
          }, { onConflict: "legacy_id" }).throwOnError();
        }
      }
    }
  }
  return objects;
}

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
    async requestPasswordReset(email, redirectTo = `${window.location.origin}/reset-password`) {
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
      return hydratePrivateAvatar(unwrap(
        await requireSupabase()
          .from("profiles")
          .select("*")
          .eq("id", authData.user.id)
          .maybeSingle()
      ));
    },
  },
  users: {
    ...usersCrud,
    async getAll() {
      const rows = unwrap(await requireSupabase()
        .from("profiles")
        .select("*, objectAssignments:object_assignments(object_id), buildingAssignments:building_assignments(building_id)")
        .order("name"));
      return Promise.all(rows.map(async (profile) => hydratePrivateAvatar(mapProfileAssignments(profile))));
    },
    async save(data) {
      const profile = unwrap(await requireSupabase().rpc("save_profile_assignments", {
        p_user_id: data.id,
        p_name: data.name,
        p_role: data.role,
        p_position: data.position || null,
        p_phone: data.phone || null,
        p_avatar_url: data.avatarStorageUri ?? data.avatarUrl ?? null,
        p_status: data.status ?? "active",
        p_object_ids: data.assignedObjectIds ?? [],
        p_building_ids: data.assignedBuildingIds ?? [],
      }));
      return { ...profile, assignedObjectIds: data.assignedObjectIds ?? [], assignedBuildingIds: data.assignedBuildingIds ?? [] };
    },
    async invite(data) {
      const result = await requireSupabase().functions.invoke("invite-user", {
        body: { ...toDatabase(data), action: "invite" },
      });
      const invited = unwrap(result);
      const profile = await this.save({ ...data, id: invited.userId, status: "active" });
      return { ...profile, invitationId: invited.invitationId };
    },
    async setAccountStatus(id, status) {
      return unwrap(await requireSupabase().functions.invoke("invite-user", {
        body: { action: status === "disabled" ? "deactivate" : "reactivate", userId: id },
      }));
    },
    async restoreAccess(id) {
      return unwrap(await requireSupabase().functions.invoke("invite-user", {
        body: { action: "restore_access", userId: id },
      }));
    },
  },
  objects: {
    ...objectsCrud,
    async getTree() {
      const response = await requireSupabase()
        .from("objects")
        .select("*, buildings(*, floors(*, doors(*)))")
        .order("created_at");
      const tree = mapObjectTree(unwrap(response));
      return Promise.all(tree.map(async (object) => ({
        ...object,
        buildings: await Promise.all(object.buildings.map(async (building) => ({
          ...building,
          floorTemplate: await hydrateFloorPlanTemplate(building.floorTemplate),
        }))),
      })));
    },
    upsertTree: upsertObjectTree,
  },
  buildings: makeCrud("buildings"),
  floors: makeCrud("floors"),
  doors: {
    ...makeCrud("doors"),
    async updateOperational(id, door) {
      return unwrap(await requireSupabase()
        .from("doors")
        .update(toDatabase(toDoorOperationalUpdate(door)))
        .eq("id", id)
        .select()
        .single());
    },
    async updateWorkflow(id, door, issue) {
      return unwrap(await requireSupabase().rpc(
        "update_door_workflow",
        toDoorWorkflowPayload(id, door, issue)
      ));
    },
  },
  tasks: {
    ...tasksCrud,
    async getAll() {
      return unwrap(await requireSupabase()
        .from("tasks")
        .select("*, comments:task_comments(*), documentLinks:task_links(*)")
        .order("created_at", { ascending: false }));
    },
    async addComment(taskId, comment) {
      return unwrap(await requireSupabase().from("task_comments").insert(toDatabase({
        taskId,
        userName: comment.userName,
        text: comment.text,
      })).select().single());
    },
    async addLink(taskId, link) {
      return unwrap(await requireSupabase().from("task_links").insert(toDatabase({
        taskId,
        title: link.title,
        url: link.url,
        category: link.category,
        comment: link.comment,
        documentId: link.documentId,
      })).select().single());
    },
  },
  notifications: {
    ...notificationsCrud,
    async getForCurrentUser() {
      return unwrap(await requireSupabase()
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false }));
    },
    async markRead(id) {
      return this.update(id, { status: "read" });
    },
    async markAllRead() {
      return unwrap(await requireSupabase()
        .from("notifications")
        .update({ status: "read" })
        .eq("status", "unread")
        .select());
    },
  },
  documentItems: makeCrud("document_items"),
  documents: makeCrud("document_items"),
  custodyActs: {
    ...custodyActsCrud,
    async getForDoor(doorId) {
      return unwrap(await requireSupabase().from("custody_acts").select("*").eq("door_id", doorId).maybeSingle());
    },
    async upsertForDoor(doorId, data) {
      return unwrap(await requireSupabase().from("custody_acts").upsert({
        door_id: doorId,
        ...toDatabase(data),
      }, { onConflict: "door_id" }).select().single());
    },
  },
  tnIssues: {
    ...makeCrud("tn_issues"),
    async syncForDoor(doorId, data) {
      const client = requireSupabase();
      const { data: activeRows, error: selectError } = await client
        .from("tn_issues")
        .select("*")
        .eq("door_id", doorId)
        .neq("status", "устранено")
        .order("created_at", { ascending: false });
      if (selectError) throw selectError;
      const active = activeRows?.[0];
      if (data.status === "устранено") {
        if (!activeRows?.length) return null;
        return unwrap(await client.from("tn_issues").update(toDatabase({ status: "устранено", resolvedAt: data.resolvedAt ?? new Date().toISOString() })).eq("door_id", doorId).neq("status", "устранено").select());
      }
      const payload = { ...data, doorId, status: data.status ?? "открыто", resolvedAt: null };
      if (active) return unwrap(await client.from("tn_issues").update(toDatabase(payload)).eq("id", active.id).select().single());
      return unwrap(await client.from("tn_issues").insert(toDatabase(payload)).select().single());
    },
  },
  teams: makeCrud("teams"),
  employees: makeCrud("employees"),
  workers: makeCrud("employees"),
  workStandards: makeCrud("work_standards"),
  objectWorkPlans: makeCrud("object_work_plans"),
  dailyWorkReports: makeCrud("daily_work_reports"),
  manpowerRequests: makeCrud("manpower_requests"),
  contracts: makeCrud("contracts"),
  budgetItems: makeCrud("budget_items"),
  financialTransactions: makeCrud("financial_transactions"),
  analytics: {
    async getDeliverySummary() {
      return unwrap(await requireSupabase().from("object_delivery_summary").select("*").order("name"));
    },
    async getFinancialSummary() {
      return unwrap(await requireSupabase().from("object_financial_summary").select("*").order("name"));
    },
  },
  activityLogs: {
    ...makeCrud("activity_logs"),
    async getRecent(limit = 200) {
      const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), 500);
      return unwrap(await requireSupabase()
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(safeLimit));
    },
  },
  operations: {
    async syncOverdueTasks() {
      const { data, error } = await requireSupabase().rpc("sync_overdue_door_tasks");
      if (error) throw error;
      return data;
    },
  },
};
