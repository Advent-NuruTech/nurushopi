import { describe, expect, it } from "vitest";
import { renderMonthlyPromotionEmail } from "../../src/modules/merchandising/monthly-email.template.js";

describe("monthly promotion email", () => {
  it("renders honest pricing, responsive content and unsubscribe controls", () => {
    const email = renderMonthlyPromotionEmail({
      customerName: "Amina Wanjiku",
      monthLabel: "September 2026",
      shopUrl: "https://www.nurushop.co.ke",
      unsubscribeUrl: "https://api.nurushop.co.ke/api/v1/email/unsubscribe?token=signed",
      businessAddress: "NuruShop, Kenya",
      products: [
        {
          id: "product-1",
          name: "Kitchen & Home Set",
          slug: "kitchen-home-set",
          imageUrl: "https://images.example.test/product.jpg",
          price: 2400,
          originalPrice: 3000,
          rating: 4.6,
          ratingCount: 24,
        },
      ],
    });

    expect(email.subject).toBe("September 2026 picks from NuruShop");
    expect(email.html).toContain("Hi Amina,");
    expect(email.html).toContain("SAVE 20%");
    expect(email.html).toContain("Ksh");
    expect(email.html).toContain("kitchen-home-set");
    expect(email.text).toContain("one product email each month");
    expect(email.text).toContain("Unsubscribe:");
  });

  it("escapes customer and product content in HTML", () => {
    const email = renderMonthlyPromotionEmail({
      customerName: "<script>alert(1)</script>",
      monthLabel: "September 2026",
      shopUrl: "https://www.nurushop.co.ke",
      unsubscribeUrl: "https://api.nurushop.co.ke/unsubscribe",
      businessAddress: "NuruShop, Kenya",
      products: [
        {
          id: "p1",
          name: '<img src=x onerror="alert(1)">',
          slug: null,
          imageUrl: null,
          price: 100,
          originalPrice: null,
          rating: 0,
          ratingCount: 0,
        },
      ],
    });

    expect(email.html).not.toContain("<script>alert(1)</script>");
    expect(email.html).not.toContain('<img src=x onerror="alert(1)">');
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).toContain("&lt;img");
  });
});
