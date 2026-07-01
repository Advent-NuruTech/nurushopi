import type { Request, Response } from "express";
import {
  bannerCreateSchema,
  bannerUpdateSchema,
  categoryCreateSchema,
  categoryUpdateSchema,
  heroCreateSchema,
  heroUpdateSchema,
  productCreateSchema,
  productQuerySchema,
  productUpdateSchema,
  productViewSchema,
} from "@nuru/types";
import { sendOk } from "../../lib/response.js";
import { Errors } from "../../lib/errors.js";
import * as categories from "./category.service.js";
import * as products from "./product.service.js";
import * as banners from "./banner.service.js";
import * as hero from "./hero.service.js";

/** Read a required route param (guaranteed present by the route pattern). */
function idParam(req: Request): string {
  const id = req.params.id;
  if (!id) throw Errors.badRequest("Missing resource id.");
  return id;
}

// ---- Categories ----

export async function listCategories(req: Request, res: Response): Promise<void> {
  const includeCounts = req.query.withCounts === "true";
  sendOk(res, { categories: await categories.list(includeCounts) });
}

export async function getCategory(req: Request, res: Response): Promise<void> {
  sendOk(res, { category: await categories.getByIdOrSlug(idParam(req)) });
}

export async function createCategory(req: Request, res: Response): Promise<void> {
  const input = categoryCreateSchema.parse(req.body);
  sendOk(res, { category: await categories.create(input) }, 201);
}

export async function updateCategory(req: Request, res: Response): Promise<void> {
  const input = categoryUpdateSchema.parse(req.body);
  sendOk(res, { category: await categories.update(idParam(req), input) });
}

export async function deleteCategory(req: Request, res: Response): Promise<void> {
  await categories.remove(idParam(req));
  sendOk(res, { success: true });
}

// ---- Products ----

export async function listProducts(req: Request, res: Response): Promise<void> {
  const query = productQuerySchema.parse(req.query);
  sendOk(res, await products.list(query, { enforceActive: true }));
}

export async function getProduct(req: Request, res: Response): Promise<void> {
  sendOk(res, { product: await products.getByIdOrSlug(idParam(req), { activeOnly: true }) });
}

export async function recordProductView(req: Request, res: Response): Promise<void> {
  const input = productViewSchema.parse(req.body ?? {});
  await products.recordView(idParam(req), req.user?.sub, input.sessionId);
  sendOk(res, { success: true }, 201);
}

export async function recommendProducts(req: Request, res: Response): Promise<void> {
  const productId =
    typeof req.query.productId === "string" && req.query.productId.trim()
      ? req.query.productId.trim()
      : undefined;
  const limit =
    typeof req.query.limit === "string" ? Number.parseInt(req.query.limit, 10) : undefined;
  sendOk(res, {
    products: await products.recommendations({
      userId: req.user?.sub,
      productIdOrSlug: productId,
      limit: Number.isFinite(limit) ? limit : undefined,
    }),
  });
}

export async function adminListProducts(req: Request, res: Response): Promise<void> {
  const query = productQuerySchema.parse(req.query);
  sendOk(res, await products.list(query, { enforceActive: false }));
}

export async function adminGetProduct(req: Request, res: Response): Promise<void> {
  sendOk(res, { product: await products.getByIdOrSlug(idParam(req), { activeOnly: false }) });
}

export async function createProduct(req: Request, res: Response): Promise<void> {
  const input = productCreateSchema.parse(req.body);
  sendOk(res, { product: await products.create(input, req.admin?.sub) }, 201);
}

export async function updateProduct(req: Request, res: Response): Promise<void> {
  const input = productUpdateSchema.parse(req.body);
  sendOk(res, { product: await products.update(idParam(req), input) });
}

export async function deleteProduct(req: Request, res: Response): Promise<void> {
  await products.remove(idParam(req));
  sendOk(res, { success: true });
}

// ---- Banners ----

export async function listBanners(_req: Request, res: Response): Promise<void> {
  sendOk(res, { banners: await banners.list({ activeOnly: true }) });
}

export async function adminListBanners(_req: Request, res: Response): Promise<void> {
  sendOk(res, { banners: await banners.list({ activeOnly: false }) });
}

export async function createBanner(req: Request, res: Response): Promise<void> {
  const input = bannerCreateSchema.parse(req.body);
  sendOk(res, { banner: await banners.create(input) }, 201);
}

export async function updateBanner(req: Request, res: Response): Promise<void> {
  const input = bannerUpdateSchema.parse(req.body);
  sendOk(res, { banner: await banners.update(idParam(req), input) });
}

export async function deleteBanner(req: Request, res: Response): Promise<void> {
  await banners.remove(idParam(req));
  sendOk(res, { success: true });
}

// ---- Hero announcements ----

export async function listHero(_req: Request, res: Response): Promise<void> {
  sendOk(res, { announcements: await hero.listActive() });
}

export async function adminListHero(_req: Request, res: Response): Promise<void> {
  sendOk(res, { announcements: await hero.listAll() });
}

export async function createHero(req: Request, res: Response): Promise<void> {
  const input = heroCreateSchema.parse(req.body);
  sendOk(res, { announcement: await hero.create(input) }, 201);
}

export async function updateHero(req: Request, res: Response): Promise<void> {
  const input = heroUpdateSchema.parse(req.body);
  sendOk(res, { announcement: await hero.update(idParam(req), input) });
}

export async function deleteHero(req: Request, res: Response): Promise<void> {
  await hero.remove(idParam(req));
  sendOk(res, { success: true });
}
