import { describe, expect, it, vi } from "vitest";

vi.mock("@nuru/db", async () => {
  const { makeDbMock } = await import("../helpers/dbMock.js");
  return makeDbMock();
});

import { wishlistReminderSchedule } from "../../src/modules/wishlist/wishlist.service.js";

describe("wishlistReminderSchedule", () => {
  it("schedules reminders two days before and two days after the planned date", () => {
    const now = new Date("2026-08-01T12:00:00.000Z");
    const planned = new Date("2026-08-10T12:00:00.000Z");
    expect(wishlistReminderSchedule(planned, now)).toEqual([
      { phase: "before", scheduledAt: new Date("2026-08-08T12:00:00.000Z") },
      { phase: "followup", scheduledAt: new Date("2026-08-12T12:00:00.000Z") },
    ]);
  });

  it("does not send an immediate pre-reminder when the date is less than two days away", () => {
    const now = new Date("2026-08-09T12:00:00.000Z");
    const planned = new Date("2026-08-10T12:00:00.000Z");
    expect(wishlistReminderSchedule(planned, now)).toEqual([
      { phase: "followup", scheduledAt: new Date("2026-08-12T12:00:00.000Z") },
    ]);
  });

  it("returns no stale reminders after the follow-up window", () => {
    const now = new Date("2026-08-13T12:00:00.000Z");
    const planned = new Date("2026-08-10T12:00:00.000Z");
    expect(wishlistReminderSchedule(planned, now)).toEqual([]);
  });
});
