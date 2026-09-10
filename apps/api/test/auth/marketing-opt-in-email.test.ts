import { describe, expect, it } from "vitest";
import { renderMarketingOptInConfirmation } from "../../src/modules/auth/email.js";

describe("marketing opt-in confirmation email", () => {
  it("thanks the customer and names the exact next delivery day", () => {
    const content = renderMarketingOptInConfirmation("Thursday, 1 October 2026 at 8:00 AM EAT");

    expect(content.subject).toContain("Thank you for subscribing");
    expect(content.html).toContain("Thank you for opting in");
    expect(content.html).toContain("Thursday, 1 October 2026 at 8:00 AM EAT");
    expect(content.text).toContain("at most one product email each month");
    expect(content.text).toContain("opt out at any time");
  });
});
