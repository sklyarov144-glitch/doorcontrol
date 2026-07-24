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
const PAGE_SIZE = 1000;
let recoverySession = null;

export function normalizeMfaStatus(assurance = {}, factorData = {}) {
  const factors = factorData.all ?? [
    ...(factorData.totp ?? []),
    ...(factorData.phone ?? []),
  ];
  const verifiedFactors = factors.filter((factor) => factor.status === "verified");
  return {
    currentLevel: assurance.currentLevel ?? "aal1",
    nextLevel: assurance.nextLevel ?? "aal1",
    factors,
    verifiedFactors,
    verifiedFactorId: verifiedFactors.find((factor) => (factor.factor_type ?? factor.factorType) === "totp")?.id
      ?? verifiedFactors[0]?.id
      ?? null,
  };
}

async function fetchAllRows(table, select = "*", order = "created_at") {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const response = await requireSupabase()
      .from(table)
      .select(select)
      .order(order)
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    const page = unwrap(response) ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

function makeCrud(table) {
  return {
    async getAll() {
      return fetchAllRows(table);
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
      documentLinks: door.documentLinks ?? [],
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

export function assembleObjectTreeRows(objects, buildings, floors, doors) {
  const groupBy = (rows, getKey) => rows.reduce((groups, row) => {
    const key = getKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
    return groups;
  }, new Map());
  const doorsByFloor = groupBy(doors, (door) => door.floorId);
  const floorsByBuilding = groupBy(floors, (floor) => floor.buildingId);
  const buildingsByObject = groupBy(buildings, (building) => building.objectId);

  return objects.map((object) => ({
    ...object,
    buildings: (buildingsByObject.get(object.id) ?? []).map((building) => ({
      ...building,
      floors: (floorsByBuilding.get(building.id) ?? []).map((floor) => ({
        ...floor,
        doors: doorsByFloor.get(floor.id) ?? [],
      })),
    })),
  }));
}

export function assembleTaskRows(tasks, comments, links) {
  const groupByTask = (rows) => rows.reduce((groups, row) => {
    if (!groups.has(row.taskId)) groups.set(row.taskId, []);
    groups.get(row.taskId).push(row);
    return groups;
  }, new Map());
  const commentsByTask = groupByTask(comments);
  const linksByTask = groupByTask(links);
  return tasks.map((task) => ({
    ...task,
    comments: commentsByTask.get(task.id) ?? [],
    documentLinks: linksByTask.get(task.id) ?? [],
  }));
}

export function toHierarchyPayload(objects = []) {
  return {
    objects: objects.map((object) => ({
      legacyId: object.legacyId ?? object.id,
      name: object.name,
      address: object.address ?? "",
      district: object.district ?? "",
      metro: object.metro ?? "",
      status: object.status ?? "В работе",
      responsibleDirectorId: asUuid(object.responsibleDirectorId ?? object.responsibleId),
      meta: {
        ...(object.meta ?? {}),
        developer: object.developer,
        description: object.description,
        startDate: object.startDate,
        plannedEndDate: object.plannedEndDate,
      },
      buildings: (object.buildings ?? []).map((building) => {
        const floors = (building.floors ?? []).filter((floor) => floor.type === "floor");
        return {
          legacyId: building.legacyId ?? building.id,
          name: building.name,
          floorsCount: Number(building.floorsCount ?? floors.length),
          hasParking: (building.floors ?? []).some((floor) => floor.label === "Паркинг"),
          readiness: Number(building.readiness ?? building.readinessOffset ?? 0),
          responsibleItrId: asUuid(building.responsibleItrId),
          floorTemplate: toStoredFloorTemplate(building.floorTemplate ?? {}),
          floors: floors.map((floor) => ({
            legacyId: floor.legacyId ?? floor.id,
            number: Number(floor.number ?? floor.label),
            planImageUrl: floor.planImageUrl ?? "",
            templateSnapshot: floor.templateSnapshot ?? {},
            doors: (floor.doors ?? []).map((door) => ({
              legacyId: door.legacyId ?? door.id,
              label: door.number ?? door.label,
              mark: door.mark,
              type: door.type,
              openingNumber: door.openingNumber ?? null,
              status: door.doorStatus ?? door.status ?? "не начато",
              openingStatus: door.openingStatus ?? "готов",
              issueStatus: door.issue ?? door.issueStatus ?? "нет",
              custodyActStatus: door.storageAct ?? door.custodyActStatus ?? "не передана",
              tnStatus: door.tnStatus ?? (door.doorStatus === "принято технадзором" ? "принято ТН" : "не передано"),
              assignedUserId: asUuid(door.assignedUserId),
              x: Number(door.x ?? 50),
              y: Number(door.y ?? 50),
              model: door.model ?? "",
              widthFact: door.widthFact ?? "",
              heightFact: door.heightFact ?? "",
              meta: {
                ...(door.meta ?? {}),
                history: door.history ?? [],
                swing: door.swing,
                custodyActUrl: door.custodyActUrl ?? "",
                documentLinks: door.documentLinks ?? [],
              },
            })),
          })),
        };
      }),
    })),
  };
}

async function upsertObjectTree(objects) {
  unwrap(await requireSupabase().rpc("save_object_hierarchy", {
    p_payload: toHierarchyPayload(objects),
  }));
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
      recoverySession = null;
    },
    async updatePassword(password) {
      const { data, error } = await requireSupabase().auth.updateUser({ password });
      if (error) throw error;
      return data.user;
    },
    async ensureRecoverySession(search = window.location.search, hash = window.location.hash) {
      const client = requireSupabase();
      const searchParams = new URLSearchParams(search);
      const hashParams = new URLSearchParams(hash.replace(/^#/, "").replace(/^\?/, ""));
      const code = searchParams.get("code");
      const current = await client.auth.getSession();
      if (recoverySession) return recoverySession;
      if (code) {
        const { data, error } = await client.auth.exchangeCodeForSession(code);
        if (!error && data.session) {
          recoverySession = data.session;
          return recoverySession;
        }
        if (current.data.session) return current.data.session;
        throw error ?? new Error("Recovery session is missing or expired");
      }

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      if (accessToken && refreshToken) {
        const { data, error } = await client.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) throw error;
        recoverySession = data.session;
        return recoverySession;
      }

      if (current.data.session) return current.data.session;

      throw new Error("Recovery session is missing or expired");
    },
    async requestPasswordReset(email, redirectTo = `${window.location.origin}/reset-password`) {
      const { error } = await requireSupabase().auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) throw error;
    },
    async getMfaStatus() {
      const client = requireSupabase();
      const [assuranceResponse, factorsResponse] = await Promise.all([
        client.auth.mfa.getAuthenticatorAssuranceLevel(),
        client.auth.mfa.listFactors(),
      ]);
      if (assuranceResponse.error) throw assuranceResponse.error;
      if (factorsResponse.error) throw factorsResponse.error;
      return normalizeMfaStatus(assuranceResponse.data, factorsResponse.data);
    },
    async startMfaEnrollment(friendlyName = "ГРОСС Бережливый Монтаж") {
      const client = requireSupabase();
      const { data: existing, error: listError } = await client.auth.mfa.listFactors();
      if (listError) throw listError;
      const factors = existing?.all ?? existing?.totp ?? [];
      for (const factor of factors.filter((item) => item.status === "unverified")) {
        const { error } = await client.auth.mfa.unenroll({ factorId: factor.id });
        if (error) throw error;
      }
      const { data, error } = await client.auth.mfa.enroll({
        factorType: "totp",
        friendlyName,
      });
      if (error) throw error;
      return {
        factorId: data.id,
        type: data.type,
        qrCode: data.totp?.qr_code ?? "",
        secret: data.totp?.secret ?? "",
        uri: data.totp?.uri ?? "",
      };
    },
    async verifyMfa(factorId, code) {
      const client = requireSupabase();
      const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;
      const { data, error } = await client.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: String(code).replace(/\s/g, ""),
      });
      if (error) throw error;
      return data;
    },
    async disableMfa(factorId) {
      const { data, error } = await requireSupabase().auth.mfa.unenroll({ factorId });
      if (error) throw error;
      return data;
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
  companies: makeCrud("companies"),
  users: {
    ...usersCrud,
    async getAll() {
      const rows = await fetchAllRows(
        "profiles",
        "*, objectAssignments:object_assignments(object_id), buildingAssignments:building_assignments(building_id)",
        "name"
      );
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
      const [objects, buildings, floors, doors] = await Promise.all([
        fetchAllRows("objects"),
        fetchAllRows("buildings"),
        fetchAllRows("floors"),
        fetchAllRows("doors"),
      ]);
      const tree = mapObjectTree(assembleObjectTreeRows(objects, buildings, floors, doors));
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
    async updateStatus(taskId, status) {
      return unwrap(await requireSupabase().rpc("update_task_status_workflow", {
        p_task_id: taskId,
        p_status: status,
      }));
    },
    async getAll() {
      const [tasks, comments, links] = await Promise.all([
        fetchAllRows("tasks"),
        fetchAllRows("task_comments"),
        fetchAllRows("task_links"),
      ]);
      return assembleTaskRows(tasks, comments, links).reverse();
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
    async addDocumentWorkflow(taskId, document, link, door = null, act = null) {
      return unwrap(await requireSupabase().rpc("add_task_document_workflow", {
        p_task_id: taskId,
        p_document: toDatabase(document),
        p_link: toDatabase(link),
        p_door: door ? toDatabase(toDoorOperationalUpdate(door)) : null,
        p_act: act ? toDatabase(act) : null,
      }));
    },
  },
  notifications: {
    ...notificationsCrud,
    async getForCurrentUser() {
      return (await fetchAllRows("notifications")).reverse();
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
    async saveWorkflow(doorId, door, act, document = null) {
      return unwrap(await requireSupabase().rpc("save_custody_act_workflow", {
        p_door_id: doorId,
        p_door: toDatabase(toDoorOperationalUpdate(door)),
        p_act: toDatabase(act),
        p_document: document ? toDatabase(document) : null,
      }));
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
