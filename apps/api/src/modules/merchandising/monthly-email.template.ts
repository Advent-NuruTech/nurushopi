export interface MonthlyEmailProduct {
  id: string;
  name: string;
  slug: string | null;
  imageUrl: string | null;
  price: number;
  originalPrice: number | null;
  rating: number;
  ratingCount: number;
}

interface MonthlyEmailTemplateInput {
  customerName: string | null;
  monthLabel: string;
  products: MonthlyEmailProduct[];
  shopUrl: string;
  unsubscribeUrl: string;
  businessAddress: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(value);
}

function productUrl(shopUrl: string, product: MonthlyEmailProduct): string {
  return `${shopUrl}/products/${encodeURIComponent(product.slug ?? product.id)}`;
}

function productCard(product: MonthlyEmailProduct, shopUrl: string): string {
  const url = escapeHtml(productUrl(shopUrl, product));
  const image = product.imageUrl
    ? `<img src="${escapeHtml(product.imageUrl)}" width="240" alt="${escapeHtml(product.name)}" style="display:block;width:100%;height:176px;object-fit:cover;background:#f1f5f9">`
    : `<div style="height:176px;background:#EFFCF3;text-align:center;line-height:176px;color:#006B2C;font-weight:700">NuruShop pick</div>`;
  const saving =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;
  const rating =
    product.ratingCount > 0
      ? `<div style="font-size:12px;color:#64748b;margin-top:8px"><span style="color:#b45309">★ ${product.rating.toFixed(1)}</span> · ${product.ratingCount} review${product.ratingCount === 1 ? "" : "s"}</div>`
      : "";
  return `<td width="50%" valign="top" style="padding:7px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;background:#fff">
      <tr><td>${image}</td></tr>
      <tr><td style="padding:16px">
        ${saving ? `<div style="display:inline-block;background:#fff1f2;color:#be123c;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:700;margin-bottom:9px">SAVE ${saving}%</div>` : ""}
        <div style="font-size:15px;line-height:1.4;font-weight:700;color:#0f172a;min-height:42px">${escapeHtml(product.name)}</div>
        ${rating}
        <div style="margin-top:10px"><span style="font-size:17px;font-weight:800;color:#006B2C">${money(product.price)}</span>${saving ? ` <span style="font-size:12px;color:#94a3b8;text-decoration:line-through">${money(product.originalPrice!)}</span>` : ""}</div>
        <a href="${url}" style="display:block;text-align:center;margin-top:14px;padding:10px 12px;border-radius:10px;background:#009933;color:#fff;text-decoration:none;font-size:13px;font-weight:700">View product</a>
      </td></tr>
    </table>
  </td>`;
}

export function renderMonthlyPromotionEmail(input: MonthlyEmailTemplateInput) {
  const firstName = input.customerName?.trim().split(/\s+/)[0];
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : "Hi there,";
  const rows: string[] = [];
  for (let index = 0; index < input.products.length; index += 2) {
    const cells = input.products
      .slice(index, index + 2)
      .map((product) => productCard(product, input.shopUrl));
    if (cells.length === 1) cells.push('<td width="50%" style="padding:7px"></td>');
    rows.push(`<tr>${cells.join("")}</tr>`);
  }
  const subject = `${input.monthLabel} picks from NuruShop`;
  const preheader = "A short, useful selection of this month's products and genuine offers.";
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#f8fafc;color:#0f172a;font-family:Arial,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden">${preheader}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:24px 8px">
    <tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden">
      <tr><td style="background:linear-gradient(135deg,#004D20,#006B2C);padding:24px 28px;color:#fff"><div style="font-size:25px;font-weight:800">Nuru<span style="color:#00C83A">Shop</span></div><div style="margin-top:20px;font-size:28px;line-height:1.25;font-weight:800">A few good finds for ${escapeHtml(input.monthLabel)}</div><div style="margin-top:10px;color:#DDFBE5;font-size:15px;line-height:1.5">Useful picks, clear prices, and no inbox overload.</div></td></tr>
      <tr><td style="padding:26px 21px 8px"><p style="margin:0 7px 14px;font-size:16px;line-height:1.6">${greeting}</p><p style="margin:0 7px 18px;color:#475569;font-size:15px;line-height:1.6">Here is this month’s concise edit of in-stock products. Discounts are shown only when a lower promotional price is currently available.</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows.join("")}</table>
      </td></tr>
      <tr><td align="center" style="padding:22px 28px 30px"><a href="${escapeHtml(input.shopUrl)}/shop" style="display:inline-block;padding:13px 24px;border:2px solid #009933;border-radius:12px;color:#006B2C;text-decoration:none;font-weight:700">Browse all products</a></td></tr>
      <tr><td style="border-top:1px solid #e2e8f0;background:#f8fafc;padding:20px 28px;text-align:center;color:#64748b;font-size:12px;line-height:1.6">You receive at most one NuruShop product email each month because you opted in.<br>${escapeHtml(input.businessAddress)} · <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#006B2C">Unsubscribe</a></td></tr>
    </table></td></tr>
  </table>
</body></html>`;
  const lines = input.products.map((product) => {
    const oldPrice =
      product.originalPrice && product.originalPrice > product.price
        ? ` (was ${money(product.originalPrice)})`
        : "";
    return `- ${product.name}: ${money(product.price)}${oldPrice}\n  ${productUrl(input.shopUrl, product)}`;
  });
  const text = `${firstName ? `Hi ${firstName}` : "Hi there"},\n\nHere are NuruShop's ${input.monthLabel} picks. Discounts are shown only when currently available.\n\n${lines.join("\n\n")}\n\nBrowse all products: ${input.shopUrl}/shop\n\nYou receive at most one product email each month because you opted in.\nUnsubscribe: ${input.unsubscribeUrl}\n${input.businessAddress}`;
  return { subject, preheader, html, text };
}
