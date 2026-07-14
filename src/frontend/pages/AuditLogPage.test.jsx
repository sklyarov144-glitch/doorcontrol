import { describe, expect, it } from "vitest";
import { changedFields } from "./AuditLogPage";

describe("AuditLogPage", () => {
  it("shows field names that actually changed without timestamp noise", () => {
    expect(changedFields({
      payload: {
        before: { status: "новая", title: "Задача", updated_at: "old" },
        after: { status: "в работе", title: "Задача", updated_at: "new" },
      },
    })).toEqual(["status"]);
  });
});
