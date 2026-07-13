import { createClient } from "@supabase/supabase-js";
import { readAndValidate } from "./validate-import.mjs";

const inputPath = process.argv.find((value) => value.endsWith(".json")) ?? "pilot/import-template.json";
const apply = process.argv.includes("--apply");
const companyId = process.env.SUPABASE_COMPANY_ID;
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const { payload, result } = await readAndValidate(inputPath);
if (!result.valid) {
  result.errors.forEach((error) => console.error(`ERROR ${error}`));
  process.exit(1);
}

console.log(`Validated ${result.counts.objects} objects, ${result.counts.buildings} buildings, ${result.counts.floors} floors and ${result.counts.doors} doors.`);
if (!apply) {
  console.log("Dry run only. Add --apply with staging credentials to write data.");
  process.exit(0);
}
if (!url || !serviceKey || !companyId) {
  console.error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_COMPANY_ID are required for --apply.");
  process.exit(1);
}

const client = createClient(url, serviceKey, { auth: { persistSession: false } });
const upsertOne = async (table, row, onConflict) => {
  const { data, error } = await client.from(table).upsert(row, { onConflict }).select().single();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
};

for (const object of payload.objects) {
  const objectRow = await upsertOne("objects", {
    legacy_id: object.legacyId, company_id: companyId, name: object.name, address: object.address ?? null,
    district: object.district ?? null, metro: object.metro ?? null, status: object.status ?? "В работе",
  }, "legacy_id");
  for (const building of object.buildings) {
    const buildingRow = await upsertOne("buildings", {
      legacy_id: building.legacyId, object_id: objectRow.id, name: building.name,
      floors_count: building.floorsCount, has_parking: Boolean(building.hasParking), readiness: building.readiness ?? 0,
    }, "legacy_id");
    for (const floor of building.floors) {
      const floorRow = await upsertOne("floors", {
        legacy_id: floor.legacyId, building_id: buildingRow.id, floor_number: floor.number,
        plan_image_url: floor.planImageUrl ?? null, template_snapshot: floor.templateSnapshot ?? {},
      }, "building_id,floor_number");
      for (const door of floor.doors) {
        await upsertOne("doors", {
          legacy_id: door.legacyId, floor_id: floorRow.id, label: door.label, mark: door.mark,
          type: door.type, opening_number: door.openingNumber ?? null, status: door.status ?? "не начато",
          opening_status: door.openingStatus ?? "готов", issue_status: door.issueStatus ?? "нет",
          custody_act_status: door.custodyActStatus ?? "не передана", assigned_user_id: door.assignedUserId ?? null,
          x: door.x, y: door.y, model: door.model ?? null, width_fact: door.widthFact ?? null, height_fact: door.heightFact ?? null,
        }, "legacy_id");
      }
    }
  }
}

console.log("Pilot import applied successfully. Run role-based acceptance checks before production use.");
