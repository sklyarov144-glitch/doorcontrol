import { describe, expect, it } from "vitest";
import { fromDatabase, toDatabase } from "./mappers";

describe("data provider mappers", () => {
  it("maps nested application fields to PostgreSQL field names", () => {
    expect(
      toDatabase({
        companyId: "company-1",
        floorTemplate: { planImageUrl: "plan.png" },
      })
    ).toEqual({
      company_id: "company-1",
      floor_template: { plan_image_url: "plan.png" },
    });
  });

  it("maps PostgreSQL responses back to application fields", () => {
    expect(fromDatabase([{ custody_act_status: "не передана" }])).toEqual([
      { custodyActStatus: "не передана" },
    ]);
  });
});

