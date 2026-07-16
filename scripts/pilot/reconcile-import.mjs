import { createClient } from "@supabase/supabase-js";
import { readAndValidate } from "./validate-import.mjs";
import { reconcilePilotImport } from "../../src/services/pilot/importReconciliation.js";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const inputPath = process.argv.find((value) => value.endsWith(".json")) ?? "pilot/import-template.json";
const companyId = required("SUPABASE_COMPANY_ID");
const url = required("SUPABASE_URL");
const serviceKey = required("SUPABASE_SERVICE_ROLE_KEY");
if (!url.startsWith("https://") || !url.endsWith(".supabase.co")) {
  throw new Error("SUPABASE_URL must be a hosted Supabase HTTPS URL");
}

const { payload, result: validation } = await readAndValidate(inputPath);
if (!validation.valid) throw new Error("Import payload must pass validation before reconciliation");

const client = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const expectedObjectIds = payload.objects.map((item) => item.legacyId);

const { data: objectRows, error: objectError } = await client
  .from("objects")
  .select("id,legacy_id,name,address,district,metro,status,responsible_director_id,company_id")
  .eq("company_id", companyId)
  .in("legacy_id", expectedObjectIds);
if (objectError) throw new Error(`objects reconciliation query failed: ${objectError.message}`);

async function selectByParent(table, select, parentColumn, parentIds) {
  if (!parentIds.length) return [];
  const rows = [];
  for (let offset = 0; offset < parentIds.length; offset += 100) {
    const { data, error } = await client.from(table).select(select).in(parentColumn, parentIds.slice(offset, offset + 100));
    if (error) throw new Error(`${table} reconciliation query failed: ${error.message}`);
    rows.push(...data);
  }
  return rows;
}

const buildingRows = await selectByParent(
  "buildings",
  "id,legacy_id,object_id,name,floors_count,has_parking,readiness,responsible_itr_id",
  "object_id",
  objectRows.map((row) => row.id),
);
const floorRows = await selectByParent(
  "floors",
  "id,legacy_id,building_id,floor_number,plan_image_url",
  "building_id",
  buildingRows.map((row) => row.id),
);
const doorRows = await selectByParent(
  "doors",
  "id,legacy_id,floor_id,label,mark,type,opening_number,status,opening_status,issue_status,custody_act_status,tn_status,assigned_user_id,x,y,model,width_fact,height_fact,mounted_at,tn_accepted_at,custody_act_uploaded_at,custody_act_closed_at",
  "floor_id",
  floorRows.map((row) => row.id),
);

const objectsById = new Map(objectRows.map((row) => [row.id, row]));
const buildingsById = new Map(buildingRows.map((row) => [row.id, row]));
const floorsById = new Map(floorRows.map((row) => [row.id, row]));
const actual = {
  objects: objectRows.map((row) => ({
    legacyId: row.legacy_id, name: row.name, address: row.address, district: row.district, metro: row.metro, status: row.status,
    responsibleDirectorId: row.responsible_director_id,
  })),
  buildings: buildingRows.map((row) => ({
    id: row.id, legacyId: row.legacy_id, objectLegacyId: objectsById.get(row.object_id)?.legacy_id,
    name: row.name, floorsCount: row.floors_count, hasParking: row.has_parking, readiness: Number(row.readiness), responsibleItrId: row.responsible_itr_id,
  })),
  floors: floorRows.map((row) => ({
    id: row.id, legacyId: row.legacy_id, buildingLegacyId: buildingsById.get(row.building_id)?.legacy_id,
    number: row.floor_number, planImageUrl: row.plan_image_url,
  })),
  doors: doorRows.map((row) => ({
    id: row.id, legacyId: row.legacy_id, floorLegacyId: floorsById.get(row.floor_id)?.legacy_id,
    label: row.label, mark: row.mark, type: row.type, openingNumber: row.opening_number, status: row.status,
    openingStatus: row.opening_status, issueStatus: row.issue_status, custodyActStatus: row.custody_act_status,
    tnStatus: row.tn_status, assignedUserId: row.assigned_user_id, x: Number(row.x), y: Number(row.y),
    model: row.model, widthFact: row.width_fact == null ? null : Number(row.width_fact),
    heightFact: row.height_fact == null ? null : Number(row.height_fact),
    mountedAt: row.mounted_at, tnAcceptedAt: row.tn_accepted_at,
    custodyActUploadedAt: row.custody_act_uploaded_at, custodyActClosedAt: row.custody_act_closed_at,
  })),
};

const reconciliation = reconcilePilotImport(payload, actual);
if (!reconciliation.valid) {
  reconciliation.errors.forEach((error) => console.error(`MISMATCH ${error}`));
  throw new Error(`Pilot reconciliation failed with ${reconciliation.errors.length} mismatch(es)`);
}
console.log(`Pilot reconciliation passed: ${JSON.stringify(reconciliation.actualCounts)}.`);
