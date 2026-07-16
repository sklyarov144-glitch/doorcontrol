import LZString from "lz-string";

const COMPRESSED_PREFIX = "gross-lz:";

const keys = {
  companies: "gross-lean-montage.companies.v1",
  users: "gross-lean-montage.users.v1",
  objects: "gross-lean-montage.visual.mvp.v7",
  tasks: "gross-lean-montage.manual-tasks.v1",
  notifications: "gross-lean-montage.notifications.v1",
  documentItems: "gross-lean-montage.matrix-documents.v1",
  teams: "gross-lean-montage.teams.v1",
  workers: "gross-lean-montage.employees.v1",
  employees: "gross-lean-montage.employees.v1",
  workStandards: "gross-lean-montage.work-standards.v1",
  objectWorkPlans: "gross-lean-montage.object-work-plans.v1",
  dailyWorkReports: "gross-lean-montage.daily-work-reports.v1",
  manpowerRequests: "gross-lean-montage.manpower-requests.v1",
  activityLogs: "gross-lean-montage.activity-logs.v1",
  custodyActs: "gross-lean-montage.custody-acts.v1",
  session: "gross-lean-montage.auth-session.v1",
};

function readCollection(key) {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    const json = stored.startsWith(COMPRESSED_PREFIX)
      ? LZString.decompressFromUTF16(stored.slice(COMPRESSED_PREFIX.length))
      : stored;
    return JSON.parse(json) ?? [];
  } catch {
    return [];
  }
}

function writeCollection(key, rows) {
  const json = JSON.stringify(rows);
  const compressed = `${COMPRESSED_PREFIX}${LZString.compressToUTF16(json)}`;
  localStorage.setItem(key, compressed);
  return rows;
}

function makeCrud(key, idPrefix) {
  return {
    getAll: () => readCollection(key),
    getById: (id) => readCollection(key).find((item) => item.id === id) ?? null,
    replaceAll: (rows) => writeCollection(key, rows),
    create: (data) => {
      const now = new Date().toISOString();
      const item = {
        id: data.id ?? `${idPrefix}-${Date.now()}`,
        ...data,
        createdAt: data.createdAt ?? now,
        updatedAt: now,
      };
      writeCollection(key, [item, ...readCollection(key)]);
      return item;
    },
    update: (id, data) => {
      const now = new Date().toISOString();
      const next = readCollection(key).map((item) =>
        item.id === id ? { ...item, ...data, updatedAt: now } : item
      );
      writeCollection(key, next);
      return next.find((item) => item.id === id) ?? null;
    },
    disable: (id) => {
      const now = new Date().toISOString();
      const next = readCollection(key).map((item) =>
        item.id === id ? { ...item, status: "disabled", isActive: false, updatedAt: now } : item
      );
      writeCollection(key, next);
      return next.find((item) => item.id === id) ?? null;
    },
  };
}

export const localProvider = {
  auth: {
    getSession: () => {
      try {
        return JSON.parse(localStorage.getItem(keys.session));
      } catch {
        return null;
      }
    },
    saveSession: (session) => {
      localStorage.setItem(keys.session, JSON.stringify(session));
      return session;
    },
    clearSession: () => localStorage.removeItem(keys.session),
    getMfaStatus: async () => ({ currentLevel: "aal1", nextLevel: "aal1", factors: [], verifiedFactors: [], verifiedFactorId: null }),
    startMfaEnrollment: async () => {
      throw new Error("MFA is available only with Supabase authentication");
    },
    verifyMfa: async () => {
      throw new Error("MFA is available only with Supabase authentication");
    },
    disableMfa: async () => {
      throw new Error("MFA is available only with Supabase authentication");
    },
  },
  companies: makeCrud(keys.companies, "company"),
  users: makeCrud(keys.users, "user"),
  objects: makeCrud(keys.objects, "object"),
  buildings: {
    getAll: () => readCollection(keys.objects).flatMap((object) => object.buildings ?? []),
    getById: (id) => readCollection(keys.objects).flatMap((object) => object.buildings ?? []).find((building) => building.id === id) ?? null,
  },
  floors: {
    getAll: () => readCollection(keys.objects).flatMap((object) => (object.buildings ?? []).flatMap((building) => building.floors ?? [])),
    getById: (id) => localProvider.floors.getAll().find((floor) => floor.id === id) ?? null,
  },
  doors: {
    getAll: () => readCollection(keys.objects).flatMap((object) => (object.buildings ?? []).flatMap((building) => (building.floors ?? []).flatMap((floor) => floor.doors ?? []))),
    getById: (id) => localProvider.doors.getAll().find((door) => door.id === id) ?? null,
  },
  tasks: makeCrud(keys.tasks, "task"),
  notifications: makeCrud(keys.notifications, "notification"),
  documentItems: makeCrud(keys.documentItems, "document"),
  documents: makeCrud(keys.documentItems, "document"),
  custodyActs: makeCrud(keys.custodyActs, "custody-act"),
  teams: makeCrud(keys.teams, "team"),
  workers: makeCrud(keys.workers, "worker"),
  employees: makeCrud(keys.employees, "employee"),
  workStandards: makeCrud(keys.workStandards, "standard"),
  objectWorkPlans: makeCrud(keys.objectWorkPlans, "work-plan"),
  dailyWorkReports: makeCrud(keys.dailyWorkReports, "daily-report"),
  manpowerRequests: makeCrud(keys.manpowerRequests, "manpower"),
  activityLogs: {
    ...makeCrud(keys.activityLogs, "activity"),
    getRecent(limit = 200) {
      const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), 500);
      return readCollection(keys.activityLogs)
        .sort((left, right) => String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? "")))
        .slice(0, safeLimit);
    },
  },
  contracts: makeCrud("gross-lean-montage.contracts.v1", "contract"),
  budgetItems: makeCrud("gross-lean-montage.budget-items.v1", "budget"),
  financialTransactions: makeCrud("gross-lean-montage.financial-transactions.v1", "transaction"),
  analytics: {
    getDeliverySummary: () => [],
    getFinancialSummary: () => [],
  },
  operations: {
    syncOverdueTasks: () => 0,
  },
};
